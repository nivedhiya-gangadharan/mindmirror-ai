import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import ProviderSuggestions from "../components/ProviderSuggestions";

// ---------------------------------------------------------------------------
// COMPLIANCE: The crisis modal presents safety resources ONLY. Nothing in this
// UI reads as a diagnosis. All copy follows the "support routing" framing.
// ---------------------------------------------------------------------------

function CrisisModal({ resources, onDismiss }) {
  // Trap focus / close on escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onDismiss();
    };
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
          <h2 id="crisis-title">You're not alone in this</h2>
          <p className="crisis-modal-body">
            If things feel heavy or overwhelming right now, please know you don't have to carry it by yourself.
            Confidential, compassionate support is free and available 24/7.
          </p>
        </div>

        <div className="crisis-resources-list">
          {resources && resources.length > 0 ? (
            resources.map((r, i) => (
              <div key={i} className="crisis-resource-card">
                <strong>{r.name}</strong>
                {r.number && (
                  <a href={`tel:${r.number}`} className="crisis-resource-number">
                    Call: {r.number}
                  </a>
                )}
                {r.sms && <span className="crisis-resource-sms">Text: {r.sms}</span>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="crisis-resource-link">
                    Visit website
                  </a>
                )}
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

        <button
          type="button"
          className="btn btn-primary btn-block crisis-continue-btn"
          onClick={onDismiss}
        >
          I've reviewed these resources — continue
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
            {" "}Connecting with a <strong>{specialization}</strong> specialist might be a helpful step whenever you're ready.
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
  const [crisisData, setCrisisData] = useState(null);   // { resources: [] }
  const [concernData, setConcernData] = useState(null); // { specialization }

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

      // Handle risk_assessment from backend
      const risk = res.data?.risk_assessment;
      if (risk) {
        if (risk.severity === "crisis") {
          setCrisisData({ resources: risk.resources || [] });
        } else if (risk.severity === "concern") {
          setConcernData({ specialization: risk.matched_specialization });
        }
      }
    } catch {
      setError("That didn't save — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const sentimentInfo = (sentiment) => {
    if (sentiment === "POSITIVE") return { label: "Positive", color: "var(--growth-green-text)", bg: "var(--growth-green-bg)" };
    if (sentiment === "NEGATIVE") return { label: "Needs Care", color: "var(--cat-trauma-text)", bg: "var(--cat-trauma-bg)" };
    if (!sentiment) return { label: "Reflecting...", color: "var(--cat-neutral-text)", bg: "var(--cat-neutral-bg)" };
    return { label: "Neutral", color: "var(--cat-neutral-text)", bg: "var(--cat-neutral-bg)" };
  };

  return (
    <>
      {/* Crisis modal — rendered outside layout flow, highest z-index */}
      {crisisData && (
        <CrisisModal
          resources={crisisData.resources}
          onDismiss={() => setCrisisData(null)}
        />
      )}

      <div className="page-container">
        {/* Matched Specialist Suggestions for Unresolved Alerts */}
        <ProviderSuggestions refreshTrigger={refreshSuggestions} />

        {/* Concern banner sits above main content */}
        {concernData && (
          <ConcernBanner
            specialization={concernData.specialization}
            onDismiss={() => setConcernData(null)}
          />
        )}

        <div className="journal-layout">
          {/* New Entry Form */}
          <div className="card">
            <h2>Write a reflection</h2>
            <form onSubmit={handleSubmit}>
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
                  placeholder="Write what's on your mind... Take all the time you need."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  required
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Entry"}
              </button>
            </form>
          </div>

          {/* Past Entries */}
          <div className="card">
            <h3>Past reflections</h3>
            {loading ? (
              <p className="placeholder-text">Loading your reflections...</p>
            ) : entries.length === 0 ? (
              <p className="placeholder-text">Nothing here yet. Whenever you're ready, write about your day.</p>
            ) : (
              entries.map((entry) => {
                const info = sentimentInfo(entry.sentiment);
                return (
                  <div
                    key={entry.id}
                    className="entry-item"
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