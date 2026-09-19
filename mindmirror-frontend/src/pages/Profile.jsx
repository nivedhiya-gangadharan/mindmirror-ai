import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { getMediaUrl, getInitials, getAvatarColor } from "../utils/avatar";

function Profile() {
  const { user, profile, isAdmin, isProvider, refreshUser } = useAuth();

  // Basic Info Form State
  const [basicInfo, setBasicInfo] = useState({
    first_name: "",
    last_name: "",
    place: "",
  });
  const [basicLoading, setBasicLoading] = useState(false);
  const [basicSuccess, setBasicSuccess] = useState("");
  const [basicError, setBasicError] = useState("");

  // Photo State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);

  // Password State
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Populate basic info from current auth user
  useEffect(() => {
    if (user) {
      setBasicInfo({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        place: user.profile?.place || "",
      });
    }
  }, [user]);

  // Clean up object URL when previewUrl changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Helper for DRF error parsing
  const parseDrfError = (err, defaultMsg = "An error occurred. Please try again.") => {
    if (err.response?.data) {
      const data = err.response.data;
      if (data.detail) return data.detail;
      if (data.non_field_errors) {
        return Array.isArray(data.non_field_errors)
          ? data.non_field_errors.join(" ")
          : data.non_field_errors;
      }
      if (typeof data === "string") return data;
      const firstKey = Object.keys(data)[0];
      const firstVal = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
      return `${firstKey}: ${firstVal}`;
    }
    return err.message || defaultMsg;
  };

  // --- Photo Handlers ---
  const handleFileChange = (e) => {
    setPhotoError("");
    setPhotoSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setPhotoError("Photo file size exceeds 5MB limit. Please choose a smaller image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file (e.g. JPG, PNG, WebP).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleCancelPreview = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setPhotoError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSavePhoto = async () => {
    if (!selectedFile) return;
    setPhotoLoading(true);
    setPhotoError("");
    setPhotoSuccess("");

    try {
      const formData = new FormData();
      formData.append("photo", selectedFile);

      await api.post("/accounts/me/photo/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setPhotoSuccess("Profile photo updated successfully!");
      handleCancelPreview();
      await refreshUser();
    } catch (err) {
      console.error("Photo upload error:", err);
      setPhotoError(parseDrfError(err, "Failed to upload photo."));
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) {
      return;
    }

    setPhotoLoading(true);
    setPhotoError("");
    setPhotoSuccess("");

    try {
      await api.delete("/accounts/me/photo/");
      setPhotoSuccess("Profile photo removed.");
      handleCancelPreview();
      await refreshUser();
    } catch (err) {
      console.error("Photo delete error:", err);
      setPhotoError(parseDrfError(err, "Failed to remove photo."));
    } finally {
      setPhotoLoading(false);
    }
  };

  // --- Basic Info Handlers ---
  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    setBasicInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBasicSubmit = async (e) => {
    e.preventDefault();
    setBasicLoading(true);
    setBasicError("");
    setBasicSuccess("");

    try {
      await api.patch("/accounts/me/", {
        first_name: basicInfo.first_name.trim(),
        last_name: basicInfo.last_name.trim(),
        place: basicInfo.place.trim(),
      });

      setBasicSuccess("Profile details saved successfully!");
      await refreshUser();
    } catch (err) {
      console.error("Save profile error:", err);
      setBasicError(parseDrfError(err, "Failed to update profile details."));
    } finally {
      setBasicLoading(false);
    }
  };

  // --- Password Handlers ---
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordData.current_password) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!passwordData.new_password) {
      setPasswordError("Please enter a new password.");
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError("New passwords do not match. Please re-enter.");
      return;
    }

    setPasswordLoading(true);

    try {
      await api.post("/accounts/change-password/", {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      setPasswordSuccess("Password changed successfully!");
      // Clear all fields immediately after success as required
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      console.error("Password change error:", err);
      setPasswordError(parseDrfError(err, "Failed to change password."));
    } finally {
      setPasswordLoading(false);
    }
  };

  const currentPhotoUrl = profile?.photo ? getMediaUrl(profile.photo) : null;
  const displayedPhoto = previewUrl || currentPhotoUrl;
  const initials = getInitials(user);
  const avatarBg = getAvatarColor(user?.username || "user");

  return (
    <div className="settings-page-container">
      {/* Page Header */}
      <div className="settings-header">
        <div>
          <h1 className="settings-title">Profile</h1>
          <p className="settings-subtitle">
            Manage your personal profile, photo, location, and account security
          </p>
        </div>
        <div className="settings-role-tag">
          {isAdmin && <span className="nav-role-badge badge-admin">Administrator</span>}
          {!isAdmin && isProvider && (
            <span className="nav-role-badge badge-specialist">Care Specialist</span>
          )}
          {!isAdmin && !isProvider && (
            <span className="nav-role-badge badge-patient">Patient</span>
          )}
        </div>
      </div>

      <div className="settings-grid">
        {/* Section 1: Profile Photo */}
        <section className="card settings-card" aria-labelledby="photo-heading">
          <div className="card-header">
            <h2 id="photo-heading" className="card-title">
              Profile Photo
            </h2>
            <p className="card-subtitle">
              Upload a clear photo to personalize your MindMirror experience
            </p>
          </div>

          {photoSuccess && <div className="alert alert-success">{photoSuccess}</div>}
          {photoError && <div className="alert alert-error">{photoError}</div>}

          <div className="photo-section-body">
            <div className="photo-avatar-container">
              {displayedPhoto ? (
                <img
                  src={displayedPhoto}
                  alt={user?.username || "User avatar"}
                  className="settings-avatar-img"
                />
              ) : (
                <div
                  className="settings-avatar-initials"
                  style={{ background: avatarBg }}
                  aria-label={`Initials avatar: ${initials}`}
                >
                  {initials}
                </div>
              )}
              {previewUrl && (
                <span className="preview-badge" title="Previewing unsaved photo">
                  Unsaved Preview
                </span>
              )}
            </div>

            <div className="photo-controls">
              <input
                ref={fileInputRef}
                type="file"
                id="profile-photo-input"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {!previewUrl ? (
                <div className="photo-action-buttons">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoLoading}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: "6px" }}
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {currentPhotoUrl ? "Change Photo" : "Upload Photo"}
                  </button>

                  {currentPhotoUrl && (
                    <button
                      type="button"
                      className="btn btn-text-danger"
                      onClick={handleRemovePhoto}
                      disabled={photoLoading}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              ) : (
                <div className="photo-action-buttons">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSavePhoto}
                    disabled={photoLoading}
                  >
                    {photoLoading ? "Saving..." : "Save Photo"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCancelPreview}
                    disabled={photoLoading}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <span className="input-hint">JPG, PNG, GIF, or WebP. Max 5MB.</span>
            </div>
          </div>
        </section>

        {/* Section 2: Basic Info */}
        <section className="card settings-card" aria-labelledby="basic-info-heading">
          <div className="card-header">
            <h2 id="basic-info-heading" className="card-title">
              Basic Information
            </h2>
            <p className="card-subtitle">
              Update your name and location details
            </p>
          </div>

          {basicSuccess && <div className="alert alert-success">{basicSuccess}</div>}
          {basicError && <div className="alert alert-error">{basicError}</div>}

          <form onSubmit={handleBasicSubmit} className="auth-form settings-form">
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="settings-first-name">First Name</label>
                <input
                  id="settings-first-name"
                  type="text"
                  name="first_name"
                  value={basicInfo.first_name}
                  onChange={handleBasicChange}
                  placeholder="e.g. Jane"
                  maxLength={150}
                />
              </div>

              <div className="form-group">
                <label htmlFor="settings-last-name">Last Name</label>
                <input
                  id="settings-last-name"
                  type="text"
                  name="last_name"
                  value={basicInfo.last_name}
                  onChange={handleBasicChange}
                  placeholder="e.g. Doe"
                  maxLength={150}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="settings-place">Location / Place</label>
              <input
                id="settings-place"
                type="text"
                name="place"
                value={basicInfo.place}
                onChange={handleBasicChange}
                placeholder="e.g. Seattle, WA or London, UK"
                maxLength={120}
              />
              <span className="input-hint">
                Your city, state, or region
              </span>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={user?.username || ""}
                  disabled
                  readOnly
                  className="input-disabled"
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={user?.email || "Not specified"}
                  disabled
                  readOnly
                  className="input-disabled"
                />
              </div>
            </div>

            <div className="settings-submit-container">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={basicLoading}
              >
                {basicLoading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* Section 3: Change Password */}
        <section className="card settings-card" aria-labelledby="password-heading">
          <div className="card-header">
            <h2 id="password-heading" className="card-title">
              Change Password
            </h2>
            <p className="card-subtitle">
              Ensure your account stays secure with a strong password
            </p>
          </div>

          {passwordSuccess && (
            <div className="alert alert-success">{passwordSuccess}</div>
          )}
          {passwordError && (
            <div className="alert alert-error">{passwordError}</div>
          )}

          <form onSubmit={handlePasswordSubmit} className="auth-form settings-form">
            <div className="form-group">
              <label htmlFor="settings-current-password">Current Password</label>
              <input
                id="settings-current-password"
                type="password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                placeholder="Enter your current password"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="settings-new-password">New Password</label>
                <input
                  id="settings-new-password"
                  type="password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="settings-confirm-password">Confirm New Password</label>
                <input
                  id="settings-confirm-password"
                  type="password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  placeholder="Re-enter new password"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="settings-submit-container">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordLoading}
              >
                {passwordLoading ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Profile;
