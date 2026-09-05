import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./App.css";

// Placeholder for Journal page (to be implemented in Task 1.3)
function JournalPlaceholder() {
  const { user } = useAuth();
  return (
    <div className="page-container">
      <div className="card">
        <h2>📖 Journal & Reflections</h2>
        <p>Welcome back, <strong>{user?.username}</strong>!</p>
        <p className="placeholder-text">
          Journal entry creation and AI sentiment analysis interface will be built in Task 1.3.
        </p>
      </div>
    </div>
  );
}

// Placeholder for Mood Analytics & Dashboard page (to be implemented in Task 2.1)
function AnalyticsPlaceholder() {
  const { user } = useAuth();
  return (
    <div className="page-container">
      <div className="card">
        <h2>📊 Mood Analytics Dashboard</h2>
        <p>Insights for <strong>{user?.username}</strong></p>
        <p className="placeholder-text">
          Mood analytics summary, trend charts, and sentiment breakdown will be built in Task 2.1.
        </p>
      </div>
    </div>
  );
}

// Public Route Guard (redirects already authenticated users away from login/register)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  if (isAuthenticated) {
    return <Navigate to="/journal" replace />;
  }
  return children;
}

// Root route handler
function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  return <Navigate to={isAuthenticated ? "/journal" : "/login"} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
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
                    <JournalPlaceholder />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AnalyticsPlaceholder />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPlaceholder />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;