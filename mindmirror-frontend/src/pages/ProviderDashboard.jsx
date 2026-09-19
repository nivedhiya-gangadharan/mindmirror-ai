import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Clock, AlertCircle } from "lucide-react";
import Time12Picker from "../components/Time12Picker";
import { formatTime } from "../utils/formatTime";

const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year.slice(2)}`;
};

// formatTime imported from ../utils/formatTime

function ProviderDashboard() {
  const { user, profile } = useAuth();

  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [scheduleError, setScheduleError] = useState("");

  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);


  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const todayIso = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("12:00");
  const [savingSlot, setSavingSlot] = useState(false);
  const [slotError, setSlotError] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch appointments (today and upcoming)
  const fetchAppointments = async () => {
    setLoadingSchedule(true);
    setScheduleError("");
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await api.get("/appointments/");
      const all = res.data;

      const today = all.filter((a) => a.date === todayStr);
      const upcoming = all.filter((a) => a.date > todayStr && a.status !== "cancelled");

      setTodayAppointments(today);
      setUpcomingAppointments(upcoming);
    } catch (err) {
      console.error("Failed to fetch provider appointments:", err);
      setScheduleError("Could not load your session schedule.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Fetch outreach alerts
  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const res = await api.get("/analysis/alerts/");
      setAlerts(res.data);
    } catch {
      // If Phase 5 alerts endpoint is not yet hit or empty, keep empty array
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  // Fetch availability slots
  const fetchSlots = async () => {
    setLoadingSlots(true);
    try {
      const res = await api.get("/appointments/my-availability/");
      const data = Array.isArray(res.data) ? res.data : [];
      // Deduplicate by signature so identical entries never appear multiple times
      const seen = new Set();
      const uniqueSlots = [];
      for (const slot of data) {
        const sig = `${slot.from_date}_${slot.to_date}_${slot.start_time}_${slot.end_time}`;
        if (!seen.has(sig)) {
          seen.add(sig);
          uniqueSlots.push(slot);
        }
      }
      setSlots(uniqueSlots);
    } catch (err) {
      console.error("Failed to load availability slots:", err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchAlerts();
    fetchSlots();
  }, []);

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    setActionLoadingId(appointmentId);
    try {
      await api.patch(`/appointments/${appointmentId}/`, { status: newStatus });
      fetchAppointments();
    } catch (err) {
      console.error(`Failed to update appointment to ${newStatus}:`, err);
      alert(`Could not update appointment status. Please try again.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      setSlotError("Please select both a start date (From) and an end date (To).");
      return;
    }
    if (fromDate > toDate) {
      setSlotError("'From' date cannot be after 'To' date.");
      return;
    }
    if (slotStart >= slotEnd) {
      setSlotError("Start time must be earlier than end time.");
      return;
    }

    setSavingSlot(true);
    setSlotError("");
    try {
      await api.post("/appointments/my-availability/", {
        from_date: fromDate,
        to_date: toDate,
        start_time: slotStart.length === 5 ? `${slotStart}:00` : slotStart,
        end_time: slotEnd.length === 5 ? `${slotEnd}:00` : slotEnd,
      });
      await fetchSlots();
    } catch (err) {
      console.error("Failed to add slot:", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        (err.response?.data && typeof err.response.data === "object"
          ? Object.values(err.response.data)[0]
          : null) ||
        "Could not save availability slot.";
      setSlotError(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Remove this recurring availability block?")) return;
    try {
      await api.delete(`/appointments/my-availability/${slotId}/`);
      fetchSlots();
    } catch (err) {
      console.error("Failed to delete slot:", err);
      alert("Could not delete slot.");
    }
  };

  const verificationStatus = profile?.verification_status || user?.profile?.verification_status || "approved";

    if (verificationStatus === "pending") {
    return (
      <div className="provider-dashboard-container" style={{ maxWidth: "680px", margin: "48px auto", padding: "0 20px" }}>
        <div className="card" style={{ padding: "3.2rem 2.4rem", textAlign: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "72px", height: "72px", borderRadius: "50%", background: "var(--accent-bg)", color: "var(--accent)", marginBottom: "1.2rem" }}>
            <Clock size={36} />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--text-h)", fontSize: "28px", marginBottom: "0.6rem" }}>
            Application Under Review
          </h2>
          <p style={{ color: "var(--text)", fontSize: "1.02rem", lineHeight: "1.6", maxWidth: "520px", margin: "0 auto 1.8rem auto" }}>
            Thank you for stepping forward to support our community. Our clinical administration team is currently reviewing your licensing and credentials to ensure thoughtful, verified care for all patients.
          </p>
          <div style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1.4rem", maxWidth: "480px", margin: "0 auto 1.8rem auto", textAlign: "left" }}>
            <div style={{ marginBottom: "0.6rem", fontSize: "14px", color: "var(--text)" }}>
              <span style={{ color: "var(--text-muted)", display: "inline-block", width: "120px" }}>Claimed Title:</span>
              <strong>{profile?.title || "Specialist"}</strong>
            </div>
            <div style={{ marginBottom: "0.6rem", fontSize: "14px", color: "var(--text)" }}>
              <span style={{ color: "var(--text-muted)", display: "inline-block", width: "120px" }}>Specialization:</span>
              <strong style={{ color: "var(--accent-text)" }}>{profile?.specialization || "General"}</strong>
            </div>
            <div style={{ fontSize: "14px", color: "var(--text)" }}>
              <span style={{ color: "var(--text-muted)", display: "inline-block", width: "120px" }}>Status:</span>
              <span style={{ background: "var(--crisis-amber-bg)", color: "var(--crisis-amber-text)", border: "1px solid var(--crisis-amber-border)", padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.03em" }}>
                AWAITING CREDENTIAL VERIFICATION
              </span>
            </div>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
            You will receive access to your specialist schedule, patient matching, and consultation space as soon as review is complete.
          </p>
        </div>
      </div>
    );
  }

    if (verificationStatus === "rejected") {
    return (
      <div className="provider-dashboard-container" style={{ maxWidth: "680px", margin: "48px auto", padding: "0 20px" }}>
        <div className="card" style={{ padding: "3.2rem 2.4rem", textAlign: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "72px", height: "72px", borderRadius: "50%", background: "var(--cat-trauma-bg)", color: "var(--cat-trauma-text)", marginBottom: "1.2rem" }}>
            <AlertCircle size={36} />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--text-h)", fontSize: "28px", marginBottom: "0.6rem" }}>
            Application Status Update
          </h2>
          <p style={{ color: "var(--text)", fontSize: "1.02rem", lineHeight: "1.6", maxWidth: "520px", margin: "0 auto 1.6rem auto" }}>
            After carefully reviewing your submitted credentials, our administrative team was unable to verify and activate your provider profile at this time.
          </p>
          {profile?.rejection_reason && (
            <div style={{ background: "var(--cat-trauma-bg)", border: "1px solid var(--cat-trauma-border)", borderRadius: "var(--radius-md)", padding: "1.2rem", maxWidth: "480px", margin: "0 auto 1.8rem auto", textAlign: "left" }}>
              <strong style={{ color: "var(--cat-trauma-text)", display: "block", marginBottom: "0.4rem", fontSize: "13px" }}>Review Notes:</strong>
              <span style={{ color: "var(--text-h)", fontSize: "14px", lineHeight: "1.5" }}>{profile.rejection_reason}</span>
            </div>
          )}
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.6rem" }}>
            If you have questions or would like to submit updated board certification documents, our clinical team is here to assist.
          </p>
          <a href="mailto:support@mindmirror.ai" className="btn btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
            Contact Support Team
          </a>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const map = {
      confirmed: "badge-confirmed",
      completed: "badge-completed",
      cancelled: "badge-cancelled",
      pending: "badge-pending",
    };
    return map[status] || "badge-pending";
  };

  return (
    <div className="provider-dashboard-container">
      {/* 1. Header with Name & Specialization Badge */}
      <header className="provider-header card">
        <div className="provider-header-left">
          <div className="provider-badge-avatar">
            {(user?.first_name?.[0] || user?.username?.[0] || "D").toUpperCase()}
          </div>
          <div>
            <h2>
              {user?.first_name ? `Dr. ${user.first_name} ${user.last_name}` : `Dr. ${user?.username}`}
            </h2>
            <div className="provider-title-row">
              <span className="spec-tag">{profile?.specialization || "Mental Health Specialist"}</span>
              <span className="title-text">{profile?.title || "Clinical Practitioner"}</span>
            </div>
            <div className="script-accent-caption" style={{ marginTop: "6px" }}>
              "Supporting healing, one thoughtful conversation at a time"
            </div>
          </div>
        </div>
        <div className="provider-header-stats">
          <div className="stat-pill">
            <span className="stat-label">Today's Sessions</span>
            <span className="stat-value">{todayAppointments.length}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Pending Outreach</span>
            <span className="stat-value">{alerts.filter((a) => a.status === "new").length}</span>
          </div>
        </div>
      </header>

      {/* Grid: Main Schedule + Alerts Sidebar */}
      <div className="provider-grid">
        <div className="provider-main-column">
          {/* 2. Today's Schedule */}
          <section className="card schedule-section">
            <div className="section-title-row">
              <h3>🗓️ Today's Consultations</h3>
              <span className="date-indicator">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {loadingSchedule ? (
              <div className="loading-state">
                <p>Loading schedule...</p>
              </div>
            ) : scheduleError ? (
              <div className="alert alert-error">{scheduleError}</div>
            ) : todayAppointments.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">☕</span>
                <p>No appointments scheduled for today.</p>
              </div>
            ) : (
              <div className="appointments-list">
                {todayAppointments.map((appt) => (
                  <div key={appt.id} className="appointment-item provider-appt-row">
                    <div className="appointment-main-info">
                      <div className="provider-header-line">
                        <strong>Patient: {appt.patient_full_name || appt.patient_username}</strong>
                        <span className={`status-badge ${getStatusBadge(appt.status)}`}>
                          {appt.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="appointment-meta-details">
                        <span>⏰ {appt.start_time} - {appt.end_time}</span>
                        <span>Format: <strong>In Person</strong></span>
                      </div>
                      {appt.notes && <div className="appointment-notes"><em>Notes: {appt.notes}</em></div>}
                    </div>

                    <div className="provider-quick-actions">
                      {appt.status === "pending" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleUpdateStatus(appt.id, "confirmed")}
                          disabled={actionLoadingId === appt.id}
                        >
                          Confirm
                        </button>
                      )}
                      {appt.status === "confirmed" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleUpdateStatus(appt.id, "completed")}
                          disabled={actionLoadingId === appt.id}
                        >
                          Complete
                        </button>
                      )}
                      {appt.status !== "cancelled" && appt.status !== "completed" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => handleUpdateStatus(appt.id, "cancelled")}
                          disabled={actionLoadingId === appt.id}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Upcoming Schedule */}
          <section className="card schedule-section">
            <h3>📆 Upcoming Sessions</h3>
            {loadingSchedule ? (
              <div className="loading-state"><p>Loading upcoming sessions...</p></div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="empty-state">
                <p>No upcoming sessions scheduled for future dates.</p>
              </div>
            ) : (
              <div className="appointments-list">
                {upcomingAppointments.map((appt) => (
                  <div key={appt.id} className="appointment-item provider-appt-row">
                    <div className="appointment-main-info">
                      <div className="provider-header-line">
                        <strong>{appt.patient_full_name || appt.patient_username}</strong>
                        <span className={`status-badge ${getStatusBadge(appt.status)}`}>
                          {appt.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="appointment-meta-details">
                        <span>📅 {appt.date}</span>
                        <span>⏰ {appt.start_time} - {appt.end_time}</span>
                        <span>Format: In Person</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. Recurring Availability Slot Editor */}
          <section className="card availability-editor-section">
            <h3>Weekly Availability Settings</h3>
            <p className="subtitle-text">Define your consultation date range and hours for booking availability.</p>

            <form onSubmit={handleAddSlot} className="add-slot-form">
              <div className="form-group-inline">
                <label htmlFor="avail-from-date">From:</label>
                <input
                  id="avail-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-inline">
                <label htmlFor="avail-to-date">To:</label>
                <input
                  id="avail-to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-inline">
                <label htmlFor="avail-start-time">Start:</label>
                <Time12Picker id="avail-start-time" value={slotStart} onChange={setSlotStart} />
              </div>

              <div className="form-group-inline">
                <label htmlFor="avail-end-time">End:</label>
                <Time12Picker id="avail-end-time" value={slotEnd} onChange={setSlotEnd} />
              </div>

              <button type="submit" className="btn btn-primary btn-sm" disabled={savingSlot}>
                {savingSlot ? "Adding..." : "+ Add Hours"}
              </button>
            </form>

            {slotError && <p className="error-text">{slotError}</p>}

            {loadingSlots ? (
              <p>Loading slots...</p>
            ) : slots.length === 0 ? (
              <p className="placeholder-text">No custom slots configured. Add a date range above.</p>
            ) : (
              <div className="configured-slots-grid">
                {slots.map((slot) => (
                  <div key={slot.id} className="slot-pill-item">
                    <span>
                      {formatDate(slot.from_date)} to {formatDate(slot.to_date)}: {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </span>
                    <button
                      type="button"
                      className="delete-slot-btn"
                      onClick={() => handleDeleteSlot(slot.id)}
                      title="Remove availability window"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 4. Patients Who May Need Outreach (Phase 5 Alerts Feed) */}
        <aside className="provider-sidebar-column">
          <div className="card alerts-panel">
            <div className="alerts-header">
              <h3>🔔 Patient Outreach Signals</h3>
            </div>
            <p className="subtitle-text">
              Algorithmic support flags for patients exhibiting elevated stress, crisis markers, or persistent negative trends.
            </p>

            {loadingAlerts ? (
              <div className="loading-state"><p>Checking outreach flags...</p></div>
            ) : alerts.length === 0 ? (
              <div className="empty-state alerts-empty">
                <span className="empty-icon">🛡️</span>
                <strong>All clear</strong>
                <p>No patient outreach flags at this time.</p>
              </div>
            ) : (
              <div className="alerts-feed-list">
                {alerts.map((alertItem) => {
                  const isCrisis = alertItem.severity === "crisis";

                  return (
                    <div
                      key={alertItem.id}
                      className={`alert-card-item ${isCrisis ? "crisis-item" : "concern-item"}`}
                    >
                      <div className="alert-card-top">
                        <span className={`severity-tag ${isCrisis ? "tag-crisis" : "tag-concern"}`}>
                          {isCrisis ? "CRISIS SIGNAL" : "CONCERN SIGNAL"}
                        </span>
                        <small>{new Date(alertItem.created_at).toLocaleDateString()}</small>
                      </div>

                      <div className="alert-patient-name">
                        Patient: <strong>{alertItem.patient_username}</strong>
                      </div>

                      <div className="alert-reason">
                        Area: <strong>{alertItem.matched_specialization || "General"}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ProviderDashboard;
