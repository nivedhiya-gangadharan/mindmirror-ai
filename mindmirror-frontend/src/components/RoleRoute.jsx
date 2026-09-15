import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleRoute({ children, allowedRole = "provider" }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <p>Verifying access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const currentRole = user?.profile?.role || "patient";

  if (currentRole !== allowedRole) {
    // If not matching, redirect to the user's primary home
    const fallbackPath = currentRole === "provider" ? "/provider" : "/journal";
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

export default RoleRoute;
