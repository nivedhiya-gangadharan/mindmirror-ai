import { useState, useEffect } from "react";
import api from "../services/api";

function Analytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get("/analysis/mood-summary/");
        setSummary(res.data);
      } catch (err) {
        setError("Could not load mood analytics.");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="card"><p>Loading...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card"><p className="error-text">{error}</p></div>
      </div>
    );
  }

  const { total_entries, positive_entries, negative_entries, average_confidence } = summary;
  const neutral_entries = total_entries - positive_entries - negative_entries;

  return (
    <div className="page-container">
      <div className="card">
        <h2>📊 Mood Analytics Dashboard</h2>

        {total_entries === 0 ? (
          <p className="placeholder-text">
            No journal entries yet. Write a few entries to see your mood analytics here!
          </p>
        ) : (
          <div className="stats-grid">
            <div className="stat-box">
              <h3>{total_entries}</h3>
              <p>Total Entries</p>
            </div>
            <div className="stat-box">
              <h3>😊 {positive_entries}</h3>
              <p>Positive</p>
            </div>
            <div className="stat-box">
              <h3>😞 {negative_entries}</h3>
              <p>Negative</p>
            </div>
            {neutral_entries > 0 && (
              <div className="stat-box">
                <h3>😐 {neutral_entries}</h3>
                <p>Neutral</p>
              </div>
            )}
            <div className="stat-box">
              <h3>{average_confidence}%</h3>
              <p>Avg. Confidence</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;