import { useState, useEffect, useMemo } from "react";
import api from "../services/api";

const DEFAULT_RESOURCES = [
  // Anxiety & Stress
  {
    id: "anxiety-science",
    title: "The Science of Anxiety",
    topic: "Anxiety & Stress",
    category: "Anxiety & Stress",
    format: "video",
    resource_type: "video",
    videoId: "Z_jkNmj5S0s",
    url: "https://www.youtube.com/watch?v=Z_jkNmj5S0s",
    description: "A short breakdown of what happens in your brain and body during anxiety.",
  },
  {
    id: "anxiety-stress-mgmt",
    title: "Managing Stress",
    topic: "Anxiety & Stress",
    category: "Anxiety & Stress",
    format: "video",
    resource_type: "video",
    videoId: "hnpQrMqDoqE",
    url: "https://www.youtube.com/watch?v=hnpQrMqDoqE",
    description: "Practical techniques for managing everyday stress.",
  },
  {
    id: "anxiety-reframing",
    title: "Identifying and Reframing Negative Thoughts",
    topic: "Anxiety & Stress",
    category: "Anxiety & Stress",
    format: "video",
    resource_type: "video",
    videoId: "DmxAIrr1LZc",
    url: "https://www.youtube.com/watch?v=DmxAIrr1LZc",
    description: "How to spot unhelpful thought patterns and reframe them.",
  },

  // Depression
  {
    id: "depression-ted",
    title: "Depression, the Secret We Share | Andrew Solomon | TED",
    topic: "Depression",
    category: "Depression",
    format: "video",
    resource_type: "video",
    videoId: "-eBUcBfkVCo",
    url: "https://www.youtube.com/watch?v=-eBUcBfkVCo",
    description: "A widely watched TED talk on understanding and living with depression.",
  },

  // Relationships
  {
    id: "relationships-awkward",
    title: "Seize the Awkward — Friendship & Mental Health",
    topic: "Relationships",
    category: "Relationships",
    format: "video",
    resource_type: "video",
    videoId: "V-IWdg-PfeM",
    url: "https://www.youtube.com/watch?v=V-IWdg-PfeM",
    description: "How to check in on a friend who might be struggling.",
  },

  // Trauma Recovery / General
  {
    id: "trauma-tinyshifts-1",
    title: "TinyShifts — Tiny Shifts, Not Easy Fixes",
    topic: "Trauma Recovery / General",
    category: "Trauma Recovery / General",
    format: "video",
    resource_type: "video",
    videoId: "8-ke08jjI5g",
    url: "https://www.youtube.com/watch?v=8-ke08jjI5g",
    description: "Small, manageable steps for coping day to day.",
  },
  {
    id: "trauma-tinyshifts-2",
    title: "TinyShifts — Change the Conversation",
    topic: "Trauma Recovery / General",
    category: "Trauma Recovery / General",
    format: "video",
    resource_type: "video",
    videoId: "l3DR5qf76tU",
    url: "https://www.youtube.com/watch?v=l3DR5qf76tU",
    description: "Reframing how we talk about mental health.",
  },
];

const TOPIC_FILTERS = [
  { id: "all", label: "All topics" },
  { id: "Anxiety & Stress", label: "Anxiety & Stress" },
  { id: "Depression", label: "Depression" },
  { id: "Relationships", label: "Relationships" },
  { id: "Trauma Recovery / General", label: "Trauma Recovery / General" },
];

const FORMAT_FILTERS = [
  { id: "all", label: "All formats" },
  { id: "video", label: "Videos" },
  { id: "article", label: "Articles" },
  { id: "audio", label: "Audio & Meditations" },
  { id: "exercise", label: "Exercises" },
];

function getCategoryClass(topic) {
  if (!topic) return "general";
  const t = topic.toLowerCase();
  if (t.includes("anxiety") || t.includes("stress")) return "anxiety";
  if (t.includes("trauma")) return "trauma";
  if (t.includes("depression")) return "depression";
  if (t.includes("relationship")) return "relationships";
  return "general";
}

function getActionLabel(type) {
  switch (type) {
    case "video":
      return "Watch video";
    case "article":
      return "Read article";
    case "audio":
      return "Listen now";
    case "exercise":
      return "Begin exercise";
    default:
      return "Open resource";
  }
}

function getYouTubeVideoId(url, explicitId) {
  if (explicitId && /^[\w-]{11}$/.test(String(explicitId).trim())) {
    return String(explicitId).trim();
  }
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\n\r]+[?&]v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regExp);
  if (match && match[1]) {
    return match[1];
  }
  if (url.includes("v=")) {
    const afterV = url.split("v=")[1];
    if (afterV) {
      const cleanId = afterV.split("&")[0].split("#")[0];
      if (/^[\w-]{11}$/.test(cleanId)) return cleanId;
    }
  }
  if (/^[\w-]{11}$/.test(url.trim())) {
    return url.trim();
  }
  return null;
}

function normalizeTopic(rawTopic) {
  if (!rawTopic) return "General";
  const t = rawTopic.trim();
  if (t === "Trauma Recovery" || t === "General" || t === "Trauma Recovery / General") {
    return "Trauma Recovery / General";
  }
  return t;
}

function deduplicateResources(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const vid = getYouTubeVideoId(item.url, item.videoId || item.video_id);
    const key = vid || item.url || item.title;
    if (!seen.has(key)) {
      seen.add(key);
      const canonical = DEFAULT_RESOURCES.find(
        (def) => def.videoId === vid || (vid && def.url && def.url.includes(vid))
      );
      result.push({
        ...item,
        ...(canonical || {}),
        id: item.id || (canonical && canonical.id),
        videoId: vid,
        topic: normalizeTopic(canonical ? canonical.topic : item.topic || item.category),
        format: item.format || item.resource_type || "video",
      });
    }
  }
  return result;
}

function Resources() {
  const [resources, setResources] = useState(DEFAULT_RESOURCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("all");
  const [format, setFormat] = useState("all");

  const fetchResources = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/resources/");
      if (Array.isArray(response.data) && response.data.length > 0) {
        const uniqueApiItems = deduplicateResources(response.data);
        const combined = deduplicateResources([...uniqueApiItems, ...DEFAULT_RESOURCES]);
        setResources(combined);
      } else {
        setResources(DEFAULT_RESOURCES);
      }
    } catch (err) {
      console.info("Using curated wellness resources library:", err);
      setResources(DEFAULT_RESOURCES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      // Filter by Topic
      if (topic !== "all") {
        const itemTopic = item.topic || item.category || "";
        if (topic === "Trauma Recovery / General") {
          const isMatch =
            itemTopic === "Trauma Recovery / General" ||
            itemTopic.includes("Trauma") ||
            itemTopic.includes("General");
          if (!isMatch) return false;
        } else if (itemTopic.toLowerCase() !== topic.toLowerCase()) {
          return false;
        }
      }

      // Filter by Format
      if (format !== "all") {
        const itemFormat = item.format || item.resource_type || "video";
        if (itemFormat.toLowerCase() !== format.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [resources, topic, format]);

  const isComingSoonFormat = format !== "all" && format !== "video" && filteredResources.length === 0;

  return (
    <div className="resources-page page-container">
      {/* Header */}
      <header className="page-header" style={{ marginBottom: "20px" }}>
        <h1>Wellness Resource Library</h1>
        <p className="subtitle-text">
          Vetted video guides, expert strategies, and grounding techniques to support your mental well-being.
        </p>
      </header>

      {/* Filter Section */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ marginBottom: "8px", fontSize: "13px", fontWeight: 600, color: "var(--text-h)" }}>
          Topic
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          {TOPIC_FILTERS.map((cat) => {
            const isActive = topic === cat.id;
            return (
              <button
                key={cat.id}
                id={`filter-topic-${cat.id.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                type="button"
                className={`filter-pill-btn ${isActive ? "active" : ""}`}
                onClick={() => setTopic(cat.id)}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: "8px", fontSize: "13px", fontWeight: 600, color: "var(--text-h)" }}>
          Format
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {FORMAT_FILTERS.map((f) => {
            const isActive = format === f.id;
            return (
              <button
                key={f.id}
                id={`filter-format-${f.id.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                type="button"
                className={`filter-pill-btn ${isActive ? "active" : ""}`}
                onClick={() => setFormat(f.id)}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button
            onClick={fetchResources}
            className="btn btn-sm btn-outline"
            style={{ marginLeft: "12px" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Resource Grid / States */}
      {loading ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <p className="placeholder-text">Loading wellness resources...</p>
        </div>
      ) : isComingSoonFormat ? (
        <div
          id="format-coming-soon-card"
          className="card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            maxWidth: "560px",
            margin: "24px auto",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>
            {format === "article" ? "📰" : format === "audio" ? "🎧" : "🧘"}
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
            {format === "article"
              ? "Articles Coming Soon"
              : format === "audio"
              ? "Audio & Meditations Coming Soon"
              : "Exercises Coming Soon"}
          </h3>
          <p className="subtitle-text" style={{ margin: "0 auto 20px", fontSize: "14px", lineHeight: 1.6 }}>
            We are actively curating evidence-based{" "}
            {format === "article"
              ? "reading guides and clinical notes"
              : format === "audio"
              ? "mindfulness and audio sessions"
              : "interactive grounding exercises"}{" "}
            with our specialist network. In the meantime, explore our video library below.
          </p>
          <button
            id="btn-return-videos"
            type="button"
            className="btn btn-primary"
            onClick={() => setFormat("video")}
          >
            Browse Video Resources
          </button>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <h3>No resources match these filters</h3>
          <p className="subtitle-text" style={{ maxWidth: "440px", margin: "8px auto 16px" }}>
            Try selecting "All topics" or "All formats" to view all available resources.
          </p>
          <button
            className="btn btn-outline"
            onClick={() => {
              setTopic("all");
              setFormat("all");
            }}
          >
            Show all resources
          </button>
        </div>
      ) : (
        <div
          id="resources-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredResources.map((item) => {
            const catClass = getCategoryClass(item.topic || item.category);
            const videoId = item.videoId || getYouTubeVideoId(item.url);

            return (
              <div
                key={item.id || item.videoId || item.title}
                id={`resource-card-${item.videoId || item.id}`}
                className="resource-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "8px",
                    }}
                  >
                    <span className="resource-type-tag">
                      {item.format || item.resource_type || "video"}
                    </span>
                    <span className={`resource-category-chip ${catClass}`}>
                      {item.topic || item.category}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      lineHeight: 1.35,
                    }}
                  >
                    {item.title}
                  </h3>

                  <p
                    style={{
                      color: "var(--text)",
                      fontSize: "13.5px",
                      lineHeight: "1.5",
                      marginBottom: "16px",
                    }}
                  >
                    {item.description || "Self-guided wellness content curated for your mental well-being."}
                  </p>
                </div>

                {videoId ? (
                  <div
                    className="resource-video-wrapper"
                    style={{
                      position: "relative",
                      width: "100%",
                      paddingBottom: "56.25%",
                      height: 0,
                      borderRadius: "8px",
                      overflow: "hidden",
                      backgroundColor: "#0f172a",
                      marginTop: "auto",
                    }}
                  >
                    <iframe
                      id={`youtube-player-${videoId}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        border: 0,
                      }}
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={item.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-block"
                    style={{ textDecoration: "none", textAlign: "center", marginTop: "auto" }}
                  >
                    {getActionLabel(item.format || item.resource_type)}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Resources;
