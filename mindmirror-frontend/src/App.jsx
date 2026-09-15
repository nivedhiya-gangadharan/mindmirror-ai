import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import AdminRoute from "./components/AdminRoute";
import MarketingHome from "./pages/MarketingHome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Journal from "./pages/Journal";
import Analytics from "./pages/Analytics";
import Book from "./pages/Book";
import ProviderDashboard from "./pages/ProviderDashboard";
import Resources from "./pages/Resources";
import AdminDashboard from "./pages/AdminDashboard";
import "./App.css";

// Public Route Guard (redirects already authenticated users away from login/register)
function PublicRoute({ children }) {
  const { isAuthenticated, isProvider, isAdmin, loading } = useAuth();
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  if (isAuthenticated) {
    if (isAdmin) {
      return <Navigate to="/admin-dashboard" replace />;
    }
    return <Navigate to={isProvider ? "/provider" : "/journal"} replace />;
  }
  return children;
}

// Root route handler: renders MarketingHome for unauthenticated visitors,
// or redirects authenticated users to their corresponding dashboard.
function RootRedirect() {
  const { isAuthenticated, isProvider, isAdmin, loading } = useAuth();
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  if (!isAuthenticated) {
    return <MarketingHome />;
  }
  if (isAdmin) {
    return <Navigate to="/admin-dashboard" replace />;
  }
  return <Navigate to={isProvider ? "/provider" : "/journal"} replace />;
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isMarketingMode = !isAuthenticated && location.pathname === "/";

  return (
    <div className={`app-layout ${isMarketingMode ? "marketing-layout" : ""}`}>
      {/* Global full-bleed background decorative blobs */}
      <div className="global-blob-bg" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
      </div>
      <Navbar />
      <main className={`main-content ${isMarketingMode ? "marketing-mode" : ""}`}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          <Route
            path="/journal"
            element={
              <ProtectedRoute>
                <Journal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/book"
            element={
              <ProtectedRoute>
                <Book />
              </ProtectedRoute>
            }
          />

          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <Resources />
              </ProtectedRoute>
            }
          />

          <Route
            path="/resource"
            element={<Navigate to="/resources" replace />}
          />

          <Route
            path="/provider"
            element={
              <RoleRoute allowedRole="provider">
                <ProviderDashboard />
              </RoleRoute>
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;