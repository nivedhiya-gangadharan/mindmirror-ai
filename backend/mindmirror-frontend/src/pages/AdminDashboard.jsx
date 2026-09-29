import { useState, useEffect } from "react";
import api from "../services/api";

const SPECIALIZATIONS = [
  "Anxiety & Stress",
  "Relationships",
  "Depression",
  "Trauma Recovery",
  "General",
];

const RESOURCE_TYPES = [
  { id: "video", label: "Video (YouTube, Vimeo, etc.)" },
  { id: "article", label: "Article / Guide" },
  { id: "audio", label: "Audio Meditation / Podcast" },
  { id: "exercise", label: "Interactive Exercise / Worksheet" },
];

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("pending"); // "pending", "providers", "resources"

  // Stats
  const [stats, setStats] = useState({
    pending_applications: 0,
    approved_providers: 0,
    published_resources: 0,
    total_patients: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Pending Providers
  const [pendingProviders, setPendingProviders] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // All Providers
  const [allProviders, setAllProviders] = useState([]);
  const [loadingAllProviders, setLoadingAllProviders] = useState(false);

  // Resources
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    title: "",
    description: "",
    resource_type: "article",
    url: "",
    category: "Anxiety & Stress",
    is_published: true,
  });
  const [savingResource, setSavingResource] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [alertSuccess, setAlertSuccess] = useState("");

  const showSuccess = (msg) => {
    setAlertSuccess(msg);
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // Fetch Stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get("/accounts/admin/stats/");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Pending Providers
  const fetchPending = async () => {
    setLoadingPending(true);
    try {
      const res = await api.get("/accounts/providers/pending/");
      setPendingProviders(res.data || []);
    } catch (err) {
      console.error("Failed to load pending providers:", err);
    } finally {
      setLoadingPending(false);
    }
  };

  // Fetch All Providers
  const fetchAllProviders = async () => {
    setLoadingAllProviders(true);
    try {
      const res = await api.get("/accounts/providers/all/");
      setAllProviders(res.data || []);
    } catch (err) {
      console.error("Failed to load all providers:", err);
    } finally {
      setLoadingAllProviders(false);
    }
  };

  // Fetch Resources (including drafts with all=true)
  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const res = await api.get("/resources/?all=true");
      setResources(res.data || []);
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchPending();
  }, []);

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPending();
    } else if (activeTab === "providers") {
      fetchAllProviders();
    } else if (activeTab === "resources") {
      fetchResources();
    }
  }, [activeTab]);

  // Provider Verification Action (Approve / Reject)
  const handleVerify = async (userId, action, reason = "") => {
    setActionLoadingId(userId);
    try {
      await api.patch(`/accounts/providers/${userId}/verify/`, {
        action,
        reason,
      });

      showSuccess(`Provider application successfully ${action === "approve" ? "approved" : "rejected"}.`);
      setRejectingId(null);
      setRejectReason("");
      await fetchPending();
      await fetchStats();
      if (activeTab === "providers") {
        await fetchAllProviders();
      }
    } catch (err) {
      console.error("Error updating provider status:", err);
      alert("Failed to process provider application. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resource Form Handlers
  const handleResourceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setResourceForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetResourceForm = () => {
    setResourceForm({
      title: "",
      description: "",
      resource_type: "article",
      url: "",
      category: "Anxiety & Stress",
      is_published: true,
    });
    setEditingResourceId(null);
    setShowAddForm(false);
    setResourceError("");
  };

  const handleStartEdit = (item) => {
    setResourceForm({
      title: item.title,
      description: item.description,
      resource_type: item.resource_type,
      url: item.url,
      category: item.category,
      is_published: item.is_published,
    });
    setEditingResourceId(item.id);
    setShowAddForm(true);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    setSavingResource(true);
    setResourceError("");

    try {
      if (editingResourceId) {
        await api.patch(`/resources/${editingResourceId}/`, resourceForm);
        showSuccess("Wellness resource updated successfully.");
      } else {
        await api.post("/resources/", resourceForm);
        showSuccess("New wellness resource published successfully.");
      }
      resetResourceForm();
      await fetchResources();
      await fetchStats();
    } catch (err) {
      console.error("Failed to save resource:", err);
      setResourceError("Failed to save resource. Please verify all inputs.");
    } finally {
      setSavingResource(false);
    }
  };

  const handleTogglePublish = async (item) => {
    try {
      await api.patch(`/resources/${item.id}/`, {
        is_published: !item.is_published,
      });
      showSuccess(`Resource "${item.title}" is now ${!item.is_published ? "Published" : "Draft"}.`);
      await fetchResources();
      await fetchStats();
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
      alert("Failed to change resource status.");
    }
  };

  const handleDeleteResource = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      return;
    }
    try {
      await api.delete(`/resources/${id}/`);
      showSuccess("Resource deleted successfully.");
      await fetchResources();
      await fetchStats();
    } catch (err) {
      console.error("Failed to delete resource:", err);
      alert("Could not delete resource.");
    }
  };

  return (
    <div className="admin-dashboard-container" style={{ maxWidth: "1150px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <header className="page-header" style={{ marginBottom: "1.8rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
              🛡️ Clinical Administration Portal
            </h1>
            <p style={{ color: "var(--text)", marginTop: "0.4rem", fontSize: "1rem" }}>
              Verify clinician applicants, oversee provider listings, and curate patient wellness resources.
            </p>
            <div className="script-accent-caption" style={{ marginTop: "4px" }}>
              "Ensuring compassionate, verified mental health care for every member"
            </div>
          </div>
          <span className="status-badge" style={{ background: "var(--legacy-purple-bg)", color: "var(--legacy-purple-text)", border: "1px solid var(--legacy-purple-border)", padding: "6px 14px", borderRadius: "var(--radius-pill)", fontWeight: 700, fontSize: "12px", letterSpacing: "0.04em" }}>
            ADMIN ACCESS ACTIVE
          </span>
        </div>
      </header>

      {alertSuccess && (
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          ✅ {alertSuccess}
        </div>
      )}

      {/* 1. Quick Stats Strip */}
      <section
        className="admin-stats-strip"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="card stat-card" style={{ padding: "1.2rem", borderLeft: "4px solid var(--crisis-amber)" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary, #64748b)", fontWeight: 600, textTransform: "uppercase" }}>
            Pending Applications
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "0.3rem", color: "var(--crisis-amber-text)" }}>
            {loadingStats ? "..." : stats.pending_applications}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #64748b)" }}>Awaiting credential review</div>
        </div>

        <div className="card stat-card" style={{ padding: "1.2rem", borderLeft: "4px solid var(--growth-green)" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary, #64748b)", fontWeight: 600, textTransform: "uppercase" }}>
            Approved Providers
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "0.3rem", color: "var(--growth-green-text)" }}>
            {loadingStats ? "..." : stats.approved_providers}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #64748b)" }}>Bookable by patients</div>
        </div>

        <div className="card stat-card" style={{ padding: "1.2rem", borderLeft: "4px solid var(--cat-anxiety)" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary, #64748b)", fontWeight: 600, textTransform: "uppercase" }}>
            Published Resources
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "0.3rem", color: "var(--cat-anxiety-text)" }}>
            {loadingStats ? "..." : stats.published_resources}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #64748b)" }}>Available in library</div>
        </div>

        <div className="card stat-card" style={{ padding: "1.2rem", borderLeft: "4px solid var(--legacy-purple)" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary, #64748b)", fontWeight: 600, textTransform: "uppercase" }}>
            Total Patients
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "0.3rem", color: "var(--legacy-purple-text)" }}>
            {loadingStats ? "..." : stats.total_patients}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #64748b)" }}>Registered users</div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="card" style={{ padding: "0.5rem", marginBottom: "1.5rem", display: "flex", gap: "0.5rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
        <button
          type="button"
          className={`btn ${activeTab === "pending" ? "btn-primary" : "btn-outline"}`}
          style={{ flex: 1, padding: "0.75rem 1rem", fontSize: "0.95rem" }}
          onClick={() => setActiveTab("pending")}
        >
          ⏳ Pending Applications ({stats.pending_applications})
        </button>

        <button
          type="button"
          className={`btn ${activeTab === "providers" ? "btn-primary" : "btn-outline"}`}
          style={{ flex: 1, padding: "0.75rem 1rem", fontSize: "0.95rem" }}
          onClick={() => setActiveTab("providers")}
        >
          🩺 All Providers ({stats.approved_providers})
        </button>

        <button
          type="button"
          className={`btn ${activeTab === "resources" ? "btn-primary" : "btn-outline"}`}
          style={{ flex: 1, padding: "0.75rem 1rem", fontSize: "0.95rem" }}
          onClick={() => setActiveTab("resources")}
        >
          📚 Resource Library Management
        </button>
      </div>

      {/* TAB 1: PENDING PROVIDER APPLICATIONS */}
      {activeTab === "pending" && (
        <section className="pending-section">
          {loadingPending ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <p>Loading pending applications...</p>
            </div>
          ) : pendingProviders.length === 0 ? (
            <div className="card" style={{ padding: "3.5rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.8rem" }}>🎉</div>
              <h3>No Pending Provider Applications</h3>
              <p style={{ color: "var(--text-secondary, #64748b)", marginTop: "0.5rem" }}>
                All mental health professional submissions have been reviewed and resolved.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {pendingProviders.map((applicant) => (
                <div key={applicant.id} className="card" style={{ padding: "1.5rem", borderRadius: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                        {applicant.full_name || applicant.username}
                      </h3>
                      <div style={{ color: "var(--text-secondary, #64748b)", fontSize: "0.88rem", marginTop: "0.2rem" }}>
                        Username: <strong>{applicant.username}</strong> • Email: <a href={`mailto:${applicant.email}`}>{applicant.email || "N/A"}</a>
                      </div>
                    </div>
                    <span style={{ background: "#fef3c7", color: "var(--crisis-amber-text)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>
                      PENDING REVIEW
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px" }}>
                    <div>
                      <span style={{ fontSize: "0.78rem", color: "#64748b", textTransform: "uppercase", display: "block" }}>Claimed Title</span>
                      <strong style={{ fontSize: "0.95rem" }}>{applicant.profile?.title || "Not specified"}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.78rem", color: "#64748b", textTransform: "uppercase", display: "block" }}>Specialization</span>
                      <strong style={{ fontSize: "0.95rem" }}>{applicant.profile?.specialization || "General"}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.78rem", color: "#64748b", textTransform: "uppercase", display: "block" }}>Applied On</span>
                      <strong style={{ fontSize: "0.95rem" }}>
                        {applicant.profile?.created_at ? new Date(applicant.profile.created_at).toLocaleDateString() : "Recent"}
                      </strong>
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "0.4rem" }}>
                      Submitted License & Credential Information:
                    </span>
                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "0.85rem", borderRadius: "6px", fontSize: "0.92rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {applicant.profile?.license_or_credential_info || "No credential details submitted."}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
                    {rejectingId === applicant.id ? (
                      <div style={{ width: "100%", background: "#fff1f2", border: "1px solid #fecdd3", padding: "1rem", borderRadius: "8px" }}>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#9f1239", marginBottom: "0.4rem" }}>
                          Reason for rejection (will be shown to applicant upon login):
                        </label>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g. Unverifiable license number, requires active state board certification..."
                          style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #fda4af", marginBottom: "0.8rem" }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            className="btn btn-sm btn-reject"
                            disabled={actionLoadingId === applicant.id}
                            onClick={() => handleVerify(applicant.id, "reject", rejectReason)}
                          >
                            {actionLoadingId === applicant.id ? "Rejecting..." : "Confirm Rejection"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          disabled={actionLoadingId === applicant.id}
                          onClick={() => handleVerify(applicant.id, "approve")}
                        >
                          {actionLoadingId === applicant.id ? "Approving..." : "✅ Approve Application"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ color: "var(--cat-trauma-text)", borderColor: "var(--cat-trauma-border)" }}
                          disabled={actionLoadingId === applicant.id}
                          onClick={() => {
                            setRejectingId(applicant.id);
                            setRejectReason("");
                          }}
                        >
                          ❌ Reject...
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: ALL PROVIDERS */}
      {activeTab === "providers" && (
        <section className="all-providers-section">
          {loadingAllProviders ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <p>Loading provider directory...</p>
            </div>
          ) : allProviders.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <p>No providers registered in the system yet.</p>
            </div>
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                    <th style={{ padding: "0.8rem 1rem" }}>Provider Name</th>
                    <th style={{ padding: "0.8rem 1rem" }}>Specialization & Title</th>
                    <th style={{ padding: "0.8rem 1rem" }}>Status</th>
                    <th style={{ padding: "0.8rem 1rem" }}>Email</th>
                    <th style={{ padding: "0.8rem 1rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allProviders.map((prov) => {
                    const status = prov.profile?.verification_status || "approved";
                    const isApproved = status === "approved";
                    return (
                      <tr key={prov.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <strong>{prov.full_name || prov.username}</strong>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>@{prov.username}</div>
                        </td>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <div>{prov.profile?.title || "Specialist"}</div>
                          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{prov.profile?.specialization || "General"}</span>
                        </td>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              background: isApproved ? "#dcfce7" : status === "pending" ? "#fef3c7" : "#fee2e2",
                              color: isApproved ? "#166534" : status === "pending" ? "#b45309" : "#991b1b",
                            }}
                          >
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: "0.8rem 1rem", fontSize: "0.9rem" }}>{prov.email || "—"}</td>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          {isApproved ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              style={{ color: "#d97706", borderColor: "#fcd34d", fontSize: "0.8rem" }}
                              onClick={() => handleVerify(prov.id, "reject", "Suspended by administrative action")}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              style={{ fontSize: "0.8rem" }}
                              onClick={() => handleVerify(prov.id, "approve")}
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: RESOURCE LIBRARY MANAGEMENT */}
      {activeTab === "resources" && (
        <section className="resources-management-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
            <div>
              <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Curated Wellness Resources</h2>
              <p style={{ color: "var(--text-secondary, #64748b)", margin: "0.2rem 0 0 0", fontSize: "0.9rem" }}>
                Add external videos, articles, meditations, and worksheets for patients.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                resetResourceForm();
                setShowAddForm(!showAddForm);
              }}
            >
              {showAddForm ? "Close Form" : "➕ Add New Resource"}
            </button>
          </div>

          {/* Add / Edit Resource Form */}
          {showAddForm && (
            <div className="card" style={{ padding: "1.8rem", marginBottom: "2rem", border: "2px solid #3b82f6", borderRadius: "12px" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
                {editingResourceId ? "✏️ Edit Wellness Resource" : "➕ Add New Wellness Resource"}
              </h3>

              {resourceError && <div className="alert alert-error">{resourceError}</div>}

              <form onSubmit={handleSaveResource}>
                <div className="form-group">
                  <label htmlFor="resource-title">Resource Title *</label>
                  <input
                    id="resource-title"
                    type="text"
                    name="title"
                    value={resourceForm.title}
                    onChange={handleResourceChange}
                    placeholder="e.g. 5-Minute Box Breathing for Panic and Anxiety"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="form-group">
                    <label htmlFor="resource-type">Resource Format *</label>
                    <select
                      id="resource-type"
                      name="resource_type"
                      value={resourceForm.resource_type}
                      onChange={handleResourceChange}
                      required
                      style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    >
                      {RESOURCE_TYPES.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="resource-category">Category *</label>
                    <select
                      id="resource-category"
                      name="category"
                      value={resourceForm.category}
                      onChange={handleResourceChange}
                      required
                      style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    >
                      {SPECIALIZATIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="resource-url">External Content URL *</label>
                  <input
                    id="resource-url"
                    type="url"
                    name="url"
                    value={resourceForm.url}
                    onChange={handleResourceChange}
                    placeholder="https://www.youtube.com/watch?v=... or https://..."
                    required
                  />
                  <small style={{ color: "#64748b", display: "block", marginTop: "0.3rem" }}>
                    Direct link to externally hosted content (YouTube/Vimeo video, podcast, scientific article, etc.).
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="resource-desc">Description</label>
                  <textarea
                    id="resource-desc"
                    name="description"
                    value={resourceForm.description}
                    onChange={handleResourceChange}
                    rows={3}
                    placeholder="Provide a clear, calming overview explaining what patients will gain from this resource..."
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "1rem 0" }}>
                  <input
                    id="resource-published"
                    type="checkbox"
                    name="is_published"
                    checked={resourceForm.is_published}
                    onChange={handleResourceChange}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <label htmlFor="resource-published" style={{ margin: 0, cursor: "pointer", fontWeight: 500 }}>
                    Publish immediately (visible to patients on <code>/resources</code>)
                  </label>
                </div>

                <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.2rem" }}>
                  <button type="submit" className="btn btn-primary" disabled={savingResource}>
                    {savingResource ? "Saving..." : editingResourceId ? "Save Changes" : "Publish Resource"}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={resetResourceForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Resources Table */}
          {loadingResources ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <p>Loading resource list...</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <p>No wellness resources created yet. Click "Add New Resource" to publish the first one!</p>
            </div>
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                    <th style={{ padding: "0.8rem 1rem" }}>Type</th>
                    <th style={{ padding: "0.8rem 1rem" }}>Title & Description</th>
                    <th style={{ padding: "0.8rem 1rem" }}>Category</th>
                    <th style={{ padding: "0.8rem 1rem" }}>Status</th>
                    <th style={{ padding: "0.8rem 1rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.8rem 1rem" }}>
                        <span style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 600, background: "#f1f5f9", padding: "3px 8px", borderRadius: "4px" }}>
                          {item.resource_type}
                        </span>
                      </td>
                      <td style={{ padding: "0.8rem 1rem", maxWidth: "340px" }}>
                        <strong>{item.title}</strong>
                        <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.description || "—"}
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.78rem", color: "#2563eb", textDecoration: "none" }}
                        >
                          🔗 Open Content Link
                        </a>
                      </td>
                      <td style={{ padding: "0.8rem 1rem", fontSize: "0.88rem" }}>{item.category}</td>
                      <td style={{ padding: "0.8rem 1rem" }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(item)}
                          style={{
                            cursor: "pointer",
                            border: "none",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: item.is_published ? "#dcfce7" : "#f1f5f9",
                            color: item.is_published ? "#166534" : "#64748b",
                          }}
                          title="Click to toggle publish status"
                        >
                          {item.is_published ? "● PUBLISHED" : "○ DRAFT"}
                        </button>
                      </td>
                      <td style={{ padding: "0.8rem 1rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => handleStartEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ color: "var(--cat-trauma-text)", borderColor: "var(--cat-trauma-border)" }}
                            onClick={() => handleDeleteResource(item.id, item.title)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default AdminDashboard;
