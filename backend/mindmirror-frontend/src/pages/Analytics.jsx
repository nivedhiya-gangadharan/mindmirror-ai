import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api from "../services/api";

const COLORS = {
  positive: "#4C9A6B", // Growth Green
  mixed: "#8B93A6",    // Quiet Neutral
  negative: "#B2584C", // Clay Red
};

const PIE_LABEL = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.08) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function InsightTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d.has_entry) return null;

  return (
    <div className="chart-tooltip">
      <strong>{d.date}</strong>
      <div className="tooltip-tag-line">
        Tone: <span className={`tooltip-tag ${d.label.toLowerCase()}`}>{d.label}</span>
      </div>
      <div className="tooltip-sub">
        {d.entry_count} {d.entry_count === 1 ? "reflection" : "reflections"}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchInsights = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/analysis/insights/?range=${rangeDays}`);
        if (isMounted) {
          setData(res.data);
        }
      } catch {
        if (isMounted) {
          setError("Could not load your reflection insights. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInsights();
    return () => {
      isMounted = false;
    };
  }, [rangeDays]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="card analytics-loading">
          <div className="analytics-spinner" />
          <p className="placeholder-text">Gathering your reflection trends...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card">
          <p className="error-text">{error}</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            onClick={() => setRangeDays((prev) => prev)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    total_entries,
    previous_period_entries,
    percent_change,
    streak_days,
    mood_summary_text,
    distribution,
    headlines,
    trend_series,
  } = data || {};

  const activeTrendPoints = (trend_series || []).filter((d) => d.has_entry);

  const pieData = distribution
    ? [
        { name: "Positive Tone", value: distribution.positive, color: COLORS.positive },
        { name: "Balanced / Mixed", value: distribution.mixed_neutral, color: COLORS.mixed },
        { name: "Heavy / Challenging", value: distribution.negative, color: COLORS.negative },
      ].filter((d) => d.value > 0)
    : [];

  const isStreakActive = streak_days > 0;
  const isTrendingUp = percent_change > 0 && previous_period_entries > 0;

  return (
    <div className="page-container">
      <div className="analytics-page">
        {/* Header with Title & Date-Range Controls */}
        <div className="card analytics-header-card">
          <div className="analytics-header-top">
            <div>
              <h2>Your emotional rhythm</h2>
              <p className="subtitle-text">
                Everyday patterns and personal growth over time — gentle observations, not clinical scores.
              </p>
            </div>

            {/* Date-Range Toggle */}
            <div className="range-toggle-group" role="group" aria-label="Select insight timeframe">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  className={`range-toggle-btn ${rangeDays === days ? "active" : ""}`}
                  onClick={() => setRangeDays(days)}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Emotional Headline Stats */}
          <div className="analytics-stats-row">
            {/* 1. Habit Streak */}
            <div className={`analytics-stat-pill ${isStreakActive ? "streak-pill-active" : ""}`}>
              <span className="analytics-stat-value stat-emotional-num">
                {streak_days > 0 ? `${streak_days}d` : "Ready"}
              </span>
              <span className="analytics-stat-label">
                {streak_days > 0 ? "Consecutive streak" : "Start today"}
              </span>
            </div>

            {/* 2. Volume */}
            <div className="analytics-stat-pill">
              <span className="analytics-stat-value stat-emotional-num">{total_entries}</span>
              <span className="analytics-stat-label">
                {total_entries === 1 ? "Reflection" : "Reflections"} ({rangeDays}d)
              </span>
            </div>

            {/* 3. Overall Rhythm */}
            <div className="analytics-stat-pill">
              <span className="analytics-stat-value font-compact">{mood_summary_text || "Settling"}</span>
              <span className="analytics-stat-label">Overall rhythm</span>
            </div>

            {/* 4. Momentum vs Prior Period */}
            <div className={`analytics-stat-pill ${isTrendingUp ? "momentum-pill trending-up" : ""}`}>
              <span className="analytics-stat-value stat-emotional-num">
                {previous_period_entries > 0
                  ? `${percent_change >= 0 ? "+" : ""}${percent_change.toFixed(0)}%`
                  : total_entries > 0
                  ? "Fresh start"
                  : "0%"}
              </span>
              <span className="analytics-stat-label">
                {previous_period_entries > 0 ? `vs prior ${rangeDays}d` : "Rhythm change"}
              </span>
            </div>
          </div>
        </div>

        {/* Plain-Language Observations */}
        {headlines && headlines.length > 0 && (
          <div className="card insights-feed-card">
            <h3>Key observations</h3>
            <p className="subtitle-text">
              Gentle patterns noticed across your recent reflections.
            </p>
            <div className="insights-headline-list">
              {headlines.map((text, idx) => (
                <div key={idx} className="insight-headline-item">
                  <span className="insight-bullet" aria-hidden="true">&bull;</span>
                  <span className="insight-text">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State when no reflections in this range */}
        {total_entries === 0 ? (
          <div className="card analytics-empty-state">
            <h3 style={{ marginTop: "12px" }}>No reflections recorded yet</h3>
            <p className="subtitle-text" style={{ maxWidth: "460px", margin: "8px auto 20px" }}>
              Whenever you're ready, writing about your day will start bringing your patterns and emotional rhythm to light.
            </p>
            <Link to="/journal" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Write a reflection
            </Link>
          </div>
        ) : (
          <>
            {/* Encouraging note if few entries */}
            {total_entries > 0 && total_entries < 3 && (
              <div className="card notice-banner">
                <div>
                  <strong>You're off to a gentle start!</strong> Adding entries across a few different days will reveal richer emotional curves over time.
                </div>
              </div>
            )}

            {/* Trend Chart */}
            <div className="card analytics-chart-card">
              <div className="chart-header">
                <div>
                  <h3>Emotional trend</h3>
                  <p className="subtitle-text">
                    The emotional arc of your journal entries across the past {rangeDays} days.
                  </p>
                </div>
              </div>

              {activeTrendPoints.length === 0 ? (
                <p className="placeholder-text">No data points to plot for this timeframe.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={activeTrendPoints}
                    margin={{ top: 12, right: 24, bottom: 8, left: -10 }}
                  >
                    <defs>
                      <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "var(--text)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      domain={[-1.2, 1.2]}
                      ticks={[-1, 0, 1]}
                      tickFormatter={(v) =>
                        v === 1 ? "Positive" : v === 0 ? "Balanced" : "Challenging"
                      }
                      tick={{ fontSize: 11, fill: "var(--text)" }}
                      tickLine={false}
                      axisLine={false}
                      width={85}
                    />
                    <Tooltip content={<InsightTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="sentiment_score"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#moodGradient)"
                      dot={{ r: 4, fill: "var(--accent)", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Distribution Donut Chart */}
            {pieData.length > 0 && (
              <div className="card analytics-chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Theme distribution</h3>
                    <p className="subtitle-text">
                      Balance of positive, mixed, and challenging reflections.
                    </p>
                  </div>
                </div>

                <div className="donut-chart-container">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={96}
                        paddingAngle={4}
                        dataKey="value"
                        labelLine={false}
                        label={PIE_LABEL}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={10}
                        formatter={(val) => (
                          <span style={{ fontSize: 13, color: "var(--text)", marginRight: 8 }}>
                            {val}
                          </span>
                        )}
                      />
                      <Tooltip
                        formatter={(val, name) => [`${val} reflections`, name]}
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="model-limitation-box">
                  <p className="limitation-copy">
                    <strong>About MindMirror's reflection analysis:</strong> Our sentiment analysis recognizes reflections that need extra care or celebrate progress. Nuanced or balanced entries are categorized as Balanced/Mixed to preserve the subtlety of your thoughts.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}