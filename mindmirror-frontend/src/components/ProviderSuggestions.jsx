import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

function getCategoryClass(category) {
  switch (category) {
    case "Anxiety & Stress":
      return "anxiety";
    case "Trauma Recovery":
      return "trauma";
    case "Depression":
      return "depression";
    case "Relationships":
      return "relationships";
    default:
      return "general";
  }
}

function getAvatarColor(name) {
  const palette = [
    "#3B82C4",
    "#B2584C",
    "#AA3BFF",
    "#4C9A6B",
    "#BD5B78",
    "#6C1EB3",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

function getInitials(provider) {
  if (provider.first_name && provider.last_name) {
    return `${provider.first_name[0]}${provider.last_name[0]}`.toUpperCase();
  }
  return (provider.username || "DR").slice(0, 2).toUpperCase();
}

export default function ProviderSuggestions({ refreshTrigger = 0 }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedCategories, setDismissedCategories] = useState(() => {
    try {
      const stored = sessionStorage.getItem("dismissed_suggestions");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAlertsAndProviders() {
      try {
        setLoading(true);
        // 1. Fetch patient active alerts
        const alertsRes = await api.get("/analysis/my-alerts/");
        const alerts = alertsRes.data || [];

        if (!alerts.length) {
          if (isMounted) {
            setCategories([]);
            setLoading(false);
          }
          return;
        }

        // 2. Group by matched_specialization and note crisis severity
        const specMap = new Map();
        alerts.forEach((alert) => {
          const spec = alert.matched_specialization || "General";
          if (!specMap.has(spec)) {
            specMap.set(spec, {
              category: spec,
              isCrisis: alert.severity === "crisis",
              count: 1,
            });
          } else {
            const current = specMap.get(spec);
            if (alert.severity === "crisis") current.isCrisis = true;
            current.count += 1;
          }
        });

        // 3. For each distinct category, fetch 1-3 approved providers
        const categoryData = [];
        for (const [spec, meta] of specMap.entries()) {
          try {
            const query = spec !== "General" ? `?specialization=${encodeURIComponent(spec)}` : "";
            const provRes = await api.get(`/accounts/providers/${query}`);
            const providers = (provRes.data || []).slice(0, 3);
            categoryData.push({
              category: spec,
              isCrisis: meta.isCrisis,
              providers,
            });
          } catch (err) {
            console.error(`Error loading providers for ${spec}:`, err);
          }
        }

        if (isMounted) {
          setCategories(categoryData);
        }
      } catch (err) {
        console.error("Failed to load suggestions:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAlertsAndProviders();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const handleDismiss = (category) => {
    const updated = [...dismissedCategories, category];
    setDismissedCategories(updated);
    try {
      sessionStorage.setItem("dismissed_suggestions", JSON.stringify(updated));
    } catch (e) {
      console.error("Could not persist session dismissal:", e);
    }
  };

  const handleBookWithProvider = (providerId) => {
    navigate(`/book?provider=${providerId}`);
  };

  const activeCategories = categories.filter(
    (c) => !dismissedCategories.includes(c.category)
  );

  if (loading || !activeCategories.length) {
    return null;
  }

  return (
    <div className="provider-suggestions-wrapper">
      {activeCategories.map((group) => {
        const { category, providers, isCrisis } = group;
        const catClass = getCategoryClass(category);

        return (
          <section
            key={category}
            className={`card provider-suggestion-card-section ${
              isCrisis ? "suggestion-crisis-accent" : ""
            }`}
            aria-label={`Support suggestions for ${category}`}
          >
            <div className="suggestion-header">
              <div className="suggestion-badge-and-title">
                <span className="suggestion-badge">
                  {isCrisis ? "Immediate Support & Care" : "Specialist Suggestions"}
                </span>
                <h3 className="suggestion-headline">
                  We noticed some recent reflections touch on{" "}
                  <span className={`category-chip ${catClass}`} style={{ fontSize: "13px", verticalAlign: "middle" }}>
                    {category}
                  </span>
                  {" "}— here are specialists who focus on this area:
                </h3>
              </div>

              <button
                type="button"
                className="suggestion-dismiss-btn"
                onClick={() => handleDismiss(category)}
                title="Dismiss for this session"
              >
                Not now
              </button>
            </div>

            {/* Crisis guidance in warm Crisis Amber */}
            {isCrisis && (
              <div className="suggestion-crisis-subtext">
                <strong>Need immediate assistance?</strong> Free, confidential 24/7 support is
                always available: Call or text <a href="tel:988">988</a> or text HOME to{" "}
                <a href="sms:741741">741741</a>.
              </div>
            )}

            {providers.length === 0 ? (
              <p className="placeholder-text">
                No specialists are currently listed for this area, but you can explore our full{" "}
                <Link
                  to={`/book?specialization=${encodeURIComponent(category.toLowerCase())}`}
                  className="link-button"
                  style={{ textDecoration: "underline", cursor: "pointer", background: "none", border: "none", padding: 0 }}
                >
                  specialist directory
                </Link>
                .
              </p>
            ) : (
              <div className="suggestion-providers-grid">
                {providers.map((p) => {
                  const name = p.full_name || p.username;
                  const initials = getInitials(p);
                  const avatarColor = getAvatarColor(name);
                  const title = p.profile?.title || "Specialist";
                  const spec = p.profile?.specialization || category;
                  const specClass = getCategoryClass(spec);
                  const bio =
                    p.profile?.bio ||
                    "Compassionate mental health professional ready to support your journey.";

                  return (
                    <div key={p.id} className="suggestion-provider-card">
                      <div className="specialist-card-top">
                        <div
                          className="specialist-avatar"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initials}
                        </div>
                        <div className="specialist-meta">
                          <h4 className="specialist-name">{name}</h4>
                          <span className={`specialist-spec-badge ${specClass}`}>{spec}</span>
                          <div className="specialist-title">{title}</div>
                        </div>
                      </div>

                      <p className="specialist-bio">{bio}</p>

                      <button
                        type="button"
                        className="btn btn-outline btn-block suggestion-book-btn"
                        onClick={() => handleBookWithProvider(p.id)}
                      >
                        Book with {p.first_name || name}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}