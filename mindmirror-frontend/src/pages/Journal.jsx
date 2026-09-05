import { useState, useEffect } from "react";
import api from "../services/api";

function Journal() {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchEntries = async () => {
    try {
      const res = await api.get("/journals/");
      setEntries(res.data);
    } catch (err) {
      setError("Could not load journal entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      await api.post("/journals/", { title, content });
      setTitle("");
      setContent("");
      fetchEntries();
    } catch (err) {
      setError("Could not save entry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const sentimentLabel = (sentiment) => {
    if (sentiment === "POSITIVE") return "😊 Positive";
    if (sentiment === "NEGATIVE") return "😞 Negative";
    if (!sentiment) return "⏳ Analyzing...";
    return "😐 Neutral";
  };

  return (
    <div className="page-container">
      <div className="card">
        <h2>📖 New Journal Entry</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <textarea
              placeholder="Write what's on your mind..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Entry"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Past Entries</h3>
        {loading ? (
          <p>Loading...</p>
        ) : entries.length === 0 ? (
          <p className="placeholder-text">No entries yet. Write your first one above!</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="entry-item">
              <div className="entry-header">
                <strong>{entry.title}</strong>
                <span>{sentimentLabel(entry.sentiment)}</span>
              </div>
              <p>{entry.content}</p>
              <small>{new Date(entry.created_at).toLocaleString()}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Journal;