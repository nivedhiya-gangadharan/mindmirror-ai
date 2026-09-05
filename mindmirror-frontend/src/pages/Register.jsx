import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
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
      await register(formData.username, formData.email, formData.password);
      // Redirect to login page on success with a friendly message
      navigate("/login", {
        state: {
          message: "Registration successful! Please sign in with your new account.",
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
          // Format serializer field validation errors
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
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join MindMirror AI to reflect and gain insights</p>

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

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? "Creating Account..." : "Register"}
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