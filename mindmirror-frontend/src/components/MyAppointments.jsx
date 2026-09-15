import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { formatTime } from "../utils/formatTime";

function MyAppointments({ refreshTrigger }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");

  const fetchAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/appointments/");
      setAppointments(res.data);
    } catch (err) {
      console.error("Failed to load appointments:", err);
      setError("Could not load your appointments. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [refreshTrigger]);

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this session?")) {
      return;
    }

    setCancellingId(id);
    try {
      await api.patch(`/appointments/${id}/`, { status: "cancelled" });
      fetchAppointments();
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
      alert("Could not cancel this session. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "confirmed":
        return "badge-confirmed";
      case "completed":
        return "badge-completed";
      case "cancelled":
        return "badge-cancelled";
      default:
        return "badge-pending";
    }
  };

  return (
    <div className="card my-appointments-card">
      <div className="appointments-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h3 style={{ margin: 0 }}>My scheduled sessions</h3>
          <p className="subtitle-text" style={{ margin: "4px 0 0" }}>Upcoming and past consultations with specialists</p>
        </div>
        <Link to="/book" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
          Book session
        </Link>
      </div>

      {loading ? (
        <div className="loading-state">
          <p className="placeholder-text">Loading your sessions...</p>
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : appointments.length === 0 ? (
        <div className="empty-state" style={{ textAlign: "center", padding: "24px 12px" }}>
          <p className="placeholder-text">You have no scheduled sessions yet.</p>
          <Link to="/book" className="btn btn-outline btn-sm" style={{ marginTop: "10px", textDecoration: "none" }}>
            Find a specialist
          </Link>
        </div>
      ) : (
        <div className="appointments-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {appointments.map((appt) => {
            const isCancelled = appt.status === "cancelled";
            const isCompleted = appt.status === "completed";
            const canCancel = !isCancelled && !isCompleted;

            return (
              <div
                key={appt.id}
                className={`appointment-item ${isCancelled ? "item-cancelled" : ""}`}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: isCancelled ? "var(--surface-subtle)" : "var(--surface)",
                }}
              >
                <div className="appointment-main-info">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <strong>{appt.provider_full_name || appt.provider_username}</strong>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      ({appt.provider_specialization || "Specialist"})
                    </span>
                    <span className={`status-badge ${getStatusBadgeClass(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>

                  <div style={{ fontSize: "13px", color: "var(--text)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <span>{appt.date}</span>
                    <span>{formatTime(appt.start_time)} - {formatTime(appt.end_time)}</span>
                    <span>Format: <strong>In Person</strong></span>
                  </div>

                  {appt.notes && (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      <em>Note: {appt.notes}</em>
                    </div>
                  )}
                </div>

                <div className="appointment-actions">
                  {canCancel && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleCancel(appt.id)}
                      disabled={cancellingId === appt.id}
                    >
                      {cancellingId === appt.id ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyAppointments;