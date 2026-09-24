import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import ProviderSuggestions from "../components/ProviderSuggestions";

// ---------------------------------------------------------------------------
// COMPLIANCE: The crisis modal presents safety resources ONLY. Nothing in this
// UI reads as a diagnosis. All copy follows the "support routing" framing.
// ---------------------------------------------------------------------------

function CrisisModal({ resources, onDismiss }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onDismiss(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="crisis-title">
      <div className="modal-box crisis-modal">
        <div className="crisis-modal-header">
          <div className="crisis-modal-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 id="crisis-title">You are not alone in this</h2>
          <p className="crisis-modal-body">
            If things feel heavy or overwhelming right now, please know you do not have to carry it by yourself.
            Confidential, compassionate support is free and available 24/7.
          </p>
        </div>

        <div className="crisis-resources-list">
          {resources && resources.length > 0 ? (
            resources.map((r, i) => (
              <div key={i} className="crisis-resource-card">
                <strong>{r.name}</strong>
                {r.number && <a href={`tel:${r.number}`} className="crisis-resource-number">Call: {r.number}</a>}
                {r.sms && <span className="crisis-resource-sms">Text: {r.sms}</span>}
                {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="crisis-resource-link">Visit website</a>}
              </div>
            ))
          ) : (
            <>
              <div className="crisis-resource-card">
                <strong>988 Suicide &amp; Crisis Lifeline</strong>
                <a href="tel:988" className="crisis-resource-number">Call or Text: 988</a>
                <span className="crisis-resource-sms">Free, confidential support available 24 hours a day, 7 days a week.</span>
              </div>
              <div className="crisis-resource-card">
                <strong>Crisis Text Line</strong>
                <span className="crisis-resource-sms">Text HOME to 741741</span>
                <span>Connect with a volunteer crisis counselor 24/7.</span>
              </div>
            </>
          )}
        </div>

        <button type="button" className="btn btn-primary btn-block crisis-continue-btn" onClick={onDismiss}>
          I have reviewed these resources — continue
        </button>
      </div>
    </div>
  );
}

function ConcernBanner({ specialization, onDismiss }) {
  const specQuery = specialization && specialization !== "General"
    ? `?specialization=${encodeURIComponent(specialization.toLowerCase())}`
    : "";

  return (
    <div className="concern-banner" role="status">
      <span className="concern-banner-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      <div className="concern-banner-text">
        <strong>We noticed some themes in your entry.</strong>
        {specialization && specialization !== "General" && (
          <span>
            {" "}Connecting with a <strong>{specialization}</strong> specialist might be a helpful step whenever you are ready.
          </span>
        )}
        {" "}Visit the <Link to={`/book${specQuery}`} style={{ textDecoration: "underline", fontWeight: "600", color: "inherit" }}>Specialists</Link> directory to find support.
      </div>
      <button type="button" className="concern-banner-close" onClick={onDismiss} aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}

function Journal() {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [refreshSuggestions, setRefreshSuggestions] = useState(0);

  // Risk state
  const [crisisData, setCrisisData] = useState(null);
  const [concernData, setConcernData] = useState(null);

  // Edit state — null means "new entry" mode
  const [editingEntry, setEditingEntry] = useState(null); // { id, title, content }

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const fetchEntries = useCallback(async () => {
    try {
      const res = await api.get("/journals/");
      setEntries(res.data);
    } catch {
      setError("Could not load journal entries. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    setRefreshSuggestions((prev) => prev + 1);
  }, [fetchEntries]);

  // --- New entry submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError("");
    setCrisisData(null);
    setConcernData(null);

    try {
      const res = await api.post("/journals/", { title, content });
      setTitle("");
      setContent("");
      fetchEntries();
      setRefreshSuggestions((prev) => prev + 1);

      const risk = res.data?.risk_assessment;
      if (risk) {
        if (risk.severity === "crisis") {
          setCrisisData({ resources: risk.resources || [] });
        } else if (risk.severity === "concern") {
          setConcernData({ specialization: risk.matched_specialization });
        }
      }
    } catch {
      setError("That did not save — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Edit mode: populate form with existing entry ---
  const startEdit = (entry) => {
    setEditingEntry({ id: entry.id });
    setTitle(entry.title);
    setContent(entry.content);
    setError("");
    setCrisisData(null);
    setConcernData(null);
    // Scroll form into view
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setTitle("");
    setContent("");
    setError("");
  };

  // --- Edit entry submit (PATCH) ---
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError("");
    setCrisisData(null);
    setConcernData(null);

    try {
      const res = await api.patch(`/journals/${editingEntry.id}/`, { title, content });
      setEditingEntry(null);
      setTitle("");
      setContent("");
      fetchEntries();
      setRefreshSuggestions((prev) => prev + 1);

      const risk = res.data?.risk_assessment;
      if (risk) {
        if (risk.severity === "crisis") {
          setCrisisData({ resources: risk.resources || [] });
        } else if (risk.severity === "concern") {
          setConcernData({ specialization: risk.matched_specialization });
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not save changes. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Delete with confirmation ---
  const handleDeleteClick = (id) => {
    setDeletingId(id);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/journals/${deletingId}/`);
      setDeletingId(null);
      setDeleteError("");
      // If we were editing this entry, cancel the edit
      if (editingEntry?.id === deletingId) cancelEdit();
      fetchEntries();
      setRefreshSuggestions((prev) => prev + 1);
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not delete entry. Please try again.";
      setDeleteError(msg);
    }
  };

  const cancelDelete = () => {
    setDeletingId(null);
    setDeleteError("");
  };

  const sentimentInfo = (sentiment) => {
    if (sentiment === "POSITIVE") return { label: "Positive", color: "var(--growth-green-text)", bg: "var(--growth-green-bg)" };
    if (sentiment === "NEGATIVE") return { label: "Needs Care", color: "var(--cat-trauma-text)", bg: "var(--cat-trauma-bg)" };
    if (!sentiment) return { label: "Reflecting...", color: "var(--cat-neutral-text)", bg: "var(--cat-neutral-bg)" };
    return { label: "Neutral", color: "var(--cat-neutral-text)", bg: "var(--cat-neutral-bg)" };
  };

  const isEditing = editingEntry !== null;

  return (
    <>
      {/* Crisis modal */}
      {crisisData && (
        <CrisisModal resources={crisisData.resources} onDismiss={() => setCrisisData(null)} />
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
          <div className="modal-box" style={{ maxWidth: "420px" }}>
            <h2 id="delete-confirm-title" style={{ marginBottom: "10px", fontSize: "18px" }}>Delete this entry?</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 }}>
              This action cannot be undone. Any support signals it triggered will remain on file for your care team.
            </p>
            {deleteError && <p className="error-text" style={{ marginBottom: "12px" }}>{deleteError}</p>}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={cancelDelete}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ background: "#dc2626", borderColor: "#dc2626" }} onClick={confirmDelete}>
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-container">
        {/* Matched Specialist Suggestions */}
        <ProviderSuggestions refreshTrigger={refreshSuggestions} />

        {/* Concern banner */}
        {concernData && (
          <ConcernBanner specialization={concernData.specialization} onDismiss={() => setConcernData(null)} />
        )}

        <div className="journal-layout">
          {/* New Entry / Edit Entry Form */}
          <div className={`card ${isEditing ? "journal-form-editing" : ""}`}>
            {isEditing ? (
              <div style={{ marginBottom: "12px" }}>
                <div className="entry-editing-label">Editing entry</div>
                <h2 style={{ margin: 0 }}>Edit this reflection</h2>
              </div>
            ) : (
              <h2>Write a reflection</h2>
            )}

            <form onSubmit={isEditing ? handleEditSubmit : handleSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Give your entry a title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  placeholder="Write what is on your mind... Take all the time you need."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  required
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ flex: 1 }}>
                  {submitting
                    ? isEditing ? "Saving..." : "Saving..."
                    : isEditing ? "Save Changes" : "Save Entry"}
                </button>
                {isEditing && (
                  <button type="button" className="btn btn-outline" onClick={cancelEdit} disabled={submitting}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Past Entries */}
          <div className="card">
            <h3>Past reflections</h3>
            {loading ? (
              <p className="placeholder-text">Loading your reflections...</p>
            ) : entries.length === 0 ? (
              <p className="placeholder-text">Nothing here yet. Whenever you are ready, write about your day.</p>
            ) : (
              entries.map((entry) => {
                const info = sentimentInfo(entry.sentiment);
                const isCurrentlyEditing = editingEntry?.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    className={`entry-item${isCurrentlyEditing ? " editing" : ""}`}
                    style={{ borderLeftColor: info.color }}
                  >
                    <div className="entry-header">
                      <strong>{entry.title}</strong>
                      <span className="entry-sentiment" style={{ color: info.color, background: info.bg }}>
                        {info.label}
                      </span>
                    </div>
                    <p>{entry.content}</p>
                    <small>{new Date(entry.created_at).toLocaleString()}</small>
                    {entry.updated_at && entry.updated_at !== entry.created_at && (
                      <small style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
                        (edited {new Date(entry.updated_at).toLocaleString()})
                      </small>
                    )}

                    <div className="entry-actions">
                      <button
                        type="button"
                        className="btn-entry-action"
                        onClick={() => isCurrentlyEditing ? cancelEdit() : startEdit(entry)}
                        aria-label={isCurrentlyEditing ? "Cancel editing" : `Edit: ${entry.title}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {isCurrentlyEditing ? "Cancel edit" : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="btn-entry-action btn-entry-delete"
                        onClick={() => handleDeleteClick(entry.id)}
                        aria-label={`Delete: ${entry.title}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Journal;
