import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SPECIALIZATIONS = [
  "Anxiety & Stress",
  "Relationships",
  "Depression",
  "Trauma Recovery",
  "General",
];

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [role, setRole] = useState("patient"); // "patient" or "provider"
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    title: "",
    specialization: "Anxiety & Stress",
    license_or_credential_info: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const extraData =
        role === "provider"
          ? {
              title: formData.title,
              specialization: formData.specialization,
              license_or_credential_info: formData.license_or_credential_info,
            }
          : {};

      await register(formData.username, formData.email, formData.password, role, extraData);

      const successMessage =
        role === "provider"
          ? "Application submitted! Your credentials will be reviewed by our admin team before full activation. Please sign in to monitor your application status."
          : "Registration successful! Please sign in with your new account.";

      navigate("/login", {
        state: {
          message: successMessage,
        },
      });
    } catch (err) {
      console.error("Registration error:", err);
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === "string") {
          setError(data);
        } else if (data.detail) {
          setError(data.detail);
        } else {
          const errorMessages = Object.entries(data).map(([field, messages]) => {
            const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
            const msgText = Array.isArray(messages) ? messages.join(" ") : messages;
            return `${fieldLabel}: ${msgText}`;
          });
          setError(errorMessages.join(" | "));
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Registration failed. Please check your information.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: role === "provider" ? "560px" : "440px" }}>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join MindMirror AI to reflect and connect</p>

        {/* Role Toggle */}
        <div className="role-selector-container" style={{ margin: "1.2rem 0", display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className={`btn ${role === "patient" ? "btn-primary" : "btn-outline"}`}
            style={{ flex: 1, padding: "0.6rem 0.8rem", fontSize: "0.9rem" }}
            onClick={() => setRole("patient")}
          >
            🌱 Looking for Support
          </button>
          <button
            type="button"
            className={`btn ${role === "provider" ? "btn-primary" : "btn-outline"}`}
            style={{ flex: 1, padding: "0.6rem 0.8rem", fontSize: "0.9rem" }}
            onClick={() => setRole("provider")}
          >
            🩺 Mental Health Professional
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password (min 6 characters)</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a secure password"
              minLength={6}
              required
            />
          </div>

          {/* Provider specific fields */}
          {role === "provider" && (
            <div className="provider-application-fields" style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "1rem" }}>
              <div className="alert alert-info" style={{ fontSize: "0.85rem", marginBottom: "1rem", padding: "0.75rem", background: "var(--cat-anxiety-bg)", borderRadius: "8px" }}>
                ℹ️ <strong>Provider Application:</strong> Your profile will be reviewed by an administrator before appearing in the client directory.
              </div>

              <div className="form-group">
                <label htmlFor="title">Professional Title</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Licensed Clinical Psychologist, MD Psychiatrist, LMFT"
                  required={role === "provider"}
                />
              </div>

              <div className="form-group">
                <label htmlFor="specialization">Primary Specialization</label>
                <select
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  required={role === "provider"}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)" }}
                >
                  {SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="license_or_credential_info">License & Credential Information</label>
                <textarea
                  id="license_or_credential_info"
                  name="license_or_credential_info"
                  value={formData.license_or_credential_info}
                  onChange={handleChange}
                  placeholder="Provide your state/national license numbers, clinical certifications, issuing board, and years in practice..."
                  rows={3}
                  required={role === "provider"}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)" }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : role === "provider"
              ? "Submit Application"
              : "Register"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
