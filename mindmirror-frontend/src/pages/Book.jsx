import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import { formatTime, formatSlotLabel } from "../utils/formatTime";
import { getMediaUrl } from "../utils/avatar";

const SPECIALIZATION_FILTERS = [
  { id: "all", label: "All Specialists" },
  { id: "Anxiety & Stress", label: "Anxiety & Stress", catClass: "anxiety" },
  { id: "Trauma Recovery", label: "Trauma Recovery", catClass: "trauma" },
  { id: "Depression", label: "Depression", catClass: "depression" },
  { id: "Relationships", label: "Relationships", catClass: "relationships" },
  { id: "General", label: "General", catClass: "general" },
];

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

function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Book() {
  const [searchParams, setSearchParams] = useSearchParams();

  const resolveSpecialization = (param) => {
    if (!param || param.toLowerCase() === "all") return "all";
    const match = SPECIALIZATION_FILTERS.find(
      (f) => f.id.toLowerCase() === param.toLowerCase()
    );
    return match ? match.id : param;
  };

  const [specialization, setSpecialization] = useState(() =>
    resolveSpecialization(searchParams.get("specialization"))
  );

  useEffect(() => {
    const param = searchParams.get("specialization");
    const resolved = resolveSpecialization(param);
    if (resolved !== specialization) {
      setSpecialization(resolved);
    }
  }, [searchParams]);
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providersError, setProvidersError] = useState("");

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getLocalDateString(tomorrow);
  });
  const [notes, setNotes] = useState("");

  const [availableSlots, setAvailableSlots] = useState([]);
  const [hasConfiguredAvailability, setHasConfiguredAvailability] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState("");

  // Fetch providers list
  useEffect(() => {
    let isCurrent = true;
    const fetchProviders = async () => {
      setLoadingProviders(true);
      setProvidersError("");
      try {
        const query =
          specialization !== "all"
            ? `?specialization=${encodeURIComponent(specialization)}`
            : "";
        const res = await api.get(`/accounts/providers/${query}`);
        if (isCurrent) {
          setProviders(res.data);

          const urlProviderId = searchParams.get("provider");
          if (
            selectedProvider &&
            !res.data.some((p) => p.id === selectedProvider.id)
          ) {
            if (!urlProviderId || Number(urlProviderId) !== selectedProvider.id) {
              setSelectedProvider(null);
              setSelectedSlot(null);
            }
          }
        }
      } catch (err) {
        if (isCurrent) {
          console.error("Failed to load specialists:", err);
          setProvidersError("Could not load specialist directory. Please refresh.");
        }
      } finally {
        if (isCurrent) {
          setLoadingProviders(false);
        }
      }
    };

    fetchProviders();
    return () => {
      isCurrent = false;
    };
  }, [specialization, searchParams, selectedProvider]);

  // Sync with URL query parameter
  useEffect(() => {
    const urlSpec = searchParams.get("specialization");
    if (urlSpec && urlSpec !== specialization) {
      setSpecialization(urlSpec);
    }
  }, [searchParams, specialization]);

  // Pre-select provider if provided via URL
  useEffect(() => {
    const urlProviderId = searchParams.get("provider");
    if (urlProviderId && providers.length > 0) {
      const match = providers.find((p) => p.id === Number(urlProviderId));
      if (match && selectedProvider?.id !== match.id) {
        setSelectedProvider(match);
      }
    }
  }, [searchParams, providers, selectedProvider]);

  // Fetch available slots whenever doctor and date change
  // Request is only triggered when both a doctor and a date are selected
  useEffect(() => {
    if (!selectedProvider || !selectedDate) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }

    const doctorId = selectedProvider.id;
    const formattedDate = String(selectedDate).slice(0, 10);

    let isCurrent = true;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setSlotsError("");
      try {
        const res = await api.get(
          `/appointments/available-slots/?doctor=${doctorId}&date=${formattedDate}`
        );
        if (isCurrent) {
          const slots = res.data.available_slots || res.data.slots || [];
          setAvailableSlots(slots);
          setHasConfiguredAvailability(res.data.has_configured_availability !== false);
        }
      } catch (err) {
        if (isCurrent) {
          console.error("Failed to load available slots:", err);
          setAvailableSlots([]);
          setSlotsError("Unable to load available time slots. Please try again or check your connection.");
        }
      } finally {
        if (isCurrent) {
          setLoadingSlots(false);
        }
      }
    };

    fetchSlots();
    return () => {
      isCurrent = false;
    };
  }, [selectedProvider, selectedDate]);

  const handleFilterClick = (specId) => {
    setSpecialization(specId);
    const newParams = new URLSearchParams(searchParams);
    if (specId === "all") {
      newParams.delete("specialization");
    } else {
      newParams.set("specialization", specId.toLowerCase());
    }
    setSearchParams(newParams);
  };

  const handleSelectProvider = (provider) => {
    setSelectedProvider(provider);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("provider", provider.id);
    setSearchParams(newParams);
    setBookingSuccess(null);
    setBookingError("");
    setSlotsError("");
    setHasConfiguredAvailability(true);
  };

  // Direct booking flow: booking goes straight from selecting a time slot
  // to submitting the appointment immediately, without an extra confirmation step.
  const handleBookSlot = async (slot) => {
    if (!selectedProvider || !selectedDate || !slot || bookingLoading) return;

    setSelectedSlot(slot);
    setBookingLoading(true);
    setBookingError("");

    const formattedDate = String(selectedDate).slice(0, 10);
    const startTime =
      slot.start_time || (typeof slot === "string" ? slot.split(" - ")[0] : "");
    const endTime =
      slot.end_time || (typeof slot === "string" ? slot.split(" - ")[1] : "");

    try {
      const payload = {
        doctor: selectedProvider.id,
        provider: selectedProvider.id,
        provider_id: selectedProvider.id,
        date: formattedDate,
        start_time: startTime,
        end_time: endTime,
        counseling_type: "in_person",
        notes: notes.trim(),
      };

      const res = await api.post("/appointments/", payload);
      setBookingSuccess(res.data);
      setNotes("");

      // Re-fetch remaining open slots for this date
      try {
        const slotsRes = await api.get(
          `/appointments/available-slots/?doctor=${selectedProvider.id}&date=${formattedDate}`
        );
        setAvailableSlots(slotsRes.data.available_slots || slotsRes.data.slots || []);
      } catch {
        // Fallback
      }
    } catch (err) {
      console.error("Booking error:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        (typeof err.response?.data === "object"
          ? Object.values(err.response.data)[0]
          : null) ||
        "That time slot is no longer available. Please choose another.";
      setBookingError(Array.isArray(errorMsg) ? errorMsg[0] : String(errorMsg));
    } finally {
      setBookingLoading(false);
    }
  };

  const todayStr = getLocalDateString(new Date());

  return (
    <div className="book-page page-container">
      {/* Page Header */}
      <header className="book-header">
        <h1>Book Your Consultation</h1>
        <p className="subtitle-text">
          Browse vetted therapists and psychiatrists. Filter by care area and choose a session format that feels comfortable for you.
        </p>
      </header>

      {/* Specialization Filter Pills */}
      <div className="specialist-filter-bar">
        {SPECIALIZATION_FILTERS.map((f) => {
          const isActive = specialization === f.id;
          return (
            <button
              key={f.id}
              type="button"
              className={`filter-pill-btn ${isActive ? "active" : ""}`}
              onClick={() => handleFilterClick(f.id)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div
        className="book-main-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Specialist Directory Cards */}
        <div className="specialists-list-col">
          {providersError && <div className="alert alert-error">{providersError}</div>}

          {loadingProviders ? (
            <div className="card">
              <p className="placeholder-text">Finding available specialists...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <h3>No specialists listed in this area yet</h3>
              <p className="placeholder-text">
                Try selecting "All Specialists" to see providers in other areas of focus.
              </p>
              <button
                type="button"
                className="btn btn-outline"
                style={{ marginTop: "16px" }}
                onClick={() => handleFilterClick("all")}
              >
                Show all specialists
              </button>
            </div>
          ) : (
            <div className="specialist-grid" style={{ gridTemplateColumns: "1fr", gap: "14px" }}>
              {providers.map((p) => {
                const isSelected = selectedProvider?.id === p.id;
                const name = p.full_name || p.username;
                const initials = getInitials(p);
                const avatarColor = getAvatarColor(name);
                const title = p.profile?.title || "Specialist";
                const spec = p.profile?.specialization || "General";
                const specClass = getCategoryClass(spec);
                const bio =
                  p.profile?.bio ||
                  "Compassionate mental health professional ready to support your journey.";

                return (
                  <div
                    key={p.id}
                    className={`specialist-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectProvider(p)}
                  >
                    <div
                      className="specialist-card-top"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "8px",
                      }}
                    >
                      {p.profile?.photo ? (
                        <img
                          src={getMediaUrl(p.profile.photo)}
                          alt={name}
                          className="specialist-avatar"
                          style={{
                            width: "42px",
                            height: "42px",
                            objectFit: "cover",
                            borderRadius: "50%",
                            marginBottom: 0,
                          }}
                        />
                      ) : (
                        <div
                          className="specialist-avatar"
                          style={{
                            backgroundColor: avatarColor,
                            width: "42px",
                            height: "42px",
                            fontSize: "15px",
                            marginBottom: 0,
                          }}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="specialist-meta">
                        <h4 className="specialist-name">{name}</h4>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "2px",
                          }}
                        >
                          <span className={`specialist-spec-badge ${specClass}`}>{spec}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{title}</span>
                        </div>
                      </div>
                    </div>

                    <p className="specialist-bio">{bio}</p>

                    <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                      <span className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-outline"}`}>
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Booking Session Card */}
        <aside
          className="card sticky-panel booking-form-panel"
          style={{ position: "sticky", top: "80px", margin: 0 }}
        >
          <h3 style={{ marginBottom: "6px" }}>Book session</h3>
          <p className="subtitle-text" style={{ fontSize: "13px" }}>
            {selectedProvider ? (
              <span>
                With <strong>{selectedProvider.full_name || selectedProvider.username}</strong>
              </span>
            ) : (
              <em>Select a specialist from the list</em>
            )}
          </p>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "14px 0" }} />

          {bookingSuccess ? (
            <div className="booked-success-card">
              <h3>Booked</h3>
              <p style={{ fontSize: "14px", color: "var(--text)" }}>
                Your session with{" "}
                <strong>{bookingSuccess.provider_full_name || bookingSuccess.provider_username}</strong> has been
                confirmed.
              </p>
              <div className="booked-details-card">
                <div><strong>Date:</strong> {bookingSuccess.date}</div>
                <div><strong>Time:</strong> {formatTime(bookingSuccess.start_time)} - {formatTime(bookingSuccess.end_time)}</div>
                <div><strong>Format:</strong> In Person</div>
                <div><strong>Status:</strong> <span className="badge-confirmed">Confirmed</span></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  onClick={() => {
                    setBookingSuccess(null);
                    setSelectedSlot(null);
                  }}
                >
                  Book another session
                </button>
                <Link
                  to="/journal"
                  className="btn btn-primary btn-block"
                  style={{ textAlign: "center", textDecoration: "none" }}
                >
                  Return to journal
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Date Input */}
              <div className="form-group">
                <label htmlFor="appointment-date">Date</label>
                <input
                  id="appointment-date"
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>

              {/* Notes Field (Optional) */}
              <div className="form-group">
                <label htmlFor="appointment-notes">Session focus (optional)</label>
                <textarea
                  id="appointment-notes"
                  rows={2}
                  placeholder="Anything you would like your specialist to know beforehand..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Available Time Slots Section */}
              <div className="form-group">
                <label>Available Time Slots</label>
                {!selectedProvider || !selectedDate ? (
                  <p className="placeholder-text" style={{ fontSize: "13px" }}>
                    Select a specialist and date to view available time slots.
                  </p>
                ) : loadingSlots ? (
                  <p className="placeholder-text" style={{ fontSize: "13px" }}>
                    Checking available time slots...
                  </p>
                ) : slotsError ? (
                  <div className="alert alert-error" style={{ fontSize: "13px", padding: "8px 12px" }}>
                    {slotsError}
                  </div>
                ) : !hasConfiguredAvailability ? (
                  <p className="placeholder-text" style={{ fontSize: "13px" }}>
                    This specialist hasn't set their availability yet.
                  </p>
                ) : availableSlots.length === 0 ? (
                  <p className="placeholder-text" style={{ fontSize: "13px" }}>
                    No available slots for this date — try another date
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 6px 0" }}>
                      Select a time slot to book your session directly:
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px",
                        marginTop: "4px",
                      }}
                    >
                      {availableSlots.map((slot, index) => {
                        const isPicked =
                          selectedSlot?.start_time === slot.start_time &&
                          selectedSlot?.end_time === slot.end_time;
                        const label = formatSlotLabel(slot);
                        return (
                          <button
                            key={index}
                            type="button"
                            className={`btn btn-sm ${isPicked ? "btn-primary" : "btn-outline"}`}
                            style={{ fontSize: "12px", padding: "6px 8px" }}
                            disabled={bookingLoading}
                            onClick={() => handleBookSlot(slot)}
                          >
                            {isPicked && bookingLoading ? "Booking..." : label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {bookingLoading && (
                <p className="placeholder-text" style={{ fontSize: "13px", color: "var(--accent-text)" }}>
                  Booking your consultation...
                </p>
              )}

              {bookingError && <div className="alert alert-error">{bookingError}</div>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default Book;
