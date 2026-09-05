import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to={isAuthenticated ? "/journal" : "/"} className="brand-logo">
          <span className="brand-icon">🪞</span> MindMirror AI
        </Link>
      </div>

      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            <NavLink
              to="/journal"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Journal
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Mood Analytics
            </NavLink>
            <div className="navbar-user">
              <span className="user-greeting">
                Hello, <strong>{user?.username}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="btn-logout"
                type="button"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Register
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
