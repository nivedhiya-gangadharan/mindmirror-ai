import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminRoute({ children }) {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <p>Verifying administrative credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // If not admin, redirect to normal user view
    const fallbackPath = user?.profile?.role === "provider" ? "/provider" : "/journal";
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

export default AdminRoute;
