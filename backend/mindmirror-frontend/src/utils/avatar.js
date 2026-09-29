/**
 * Resolves a media file path or relative URL to a fully qualified URL pointing to backend.
 *
 * @param {string} path - Image or file URL/path
 * @returns {string} Full URL
 */
export const getMediaUrl = (path) => {
  if (!path) return "";
  if (typeof path !== "string") return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `http://127.0.0.1:8000${cleanPath}`;
};

/**
 * Derives 1-2 letter initials from a user or provider object.
 * Consistent with booking directory and specialist cards.
 *
 * @param {object} userOrProvider
 * @returns {string} Initials (e.g. "JD", "DR")
 */
export const getInitials = (userOrProvider) => {
  if (!userOrProvider) return "U";

  const first = userOrProvider.first_name ? userOrProvider.first_name.trim() : "";
  const last = userOrProvider.last_name ? userOrProvider.last_name.trim() : "";

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }
  if (first) {
    return first.slice(0, 2).toUpperCase();
  }

  const username = userOrProvider.username || userOrProvider.name || "";
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }

  return "U";
};

const AVATAR_PALETTE = [
  "linear-gradient(135deg, #ec4899, #db2777)",
  "linear-gradient(135deg, #8b5cf6, #6366f1)",
  "linear-gradient(135deg, #3b82f6, #06b6d4)",
  "linear-gradient(135deg, #10b981, #059669)",
  "linear-gradient(135deg, #f59e0b, #d97706)",
  "linear-gradient(135deg, #f43f5e, #e11d48)",
];

/**
 * Returns a consistent gradient or color based on the identifier string.
 *
 * @param {string} seed
 * @returns {string} CSS background value
 */
export const getAvatarColor = (seed = "") => {
  if (!seed) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
};
