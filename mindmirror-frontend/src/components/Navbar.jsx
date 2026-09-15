import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, isProvider, isAdmin, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide in-app navbar on the public marketing homepage for unauthenticated users
  // because MarketingHome includes its own dedicated marketing header with anchor nav & taglines.
  if (!isAuthenticated && location.pathname === "/") {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getHomePath = () => {
    if (isAdmin) return "/admin-dashboard";
    if (isProvider) return "/provider";
    return "/journal";
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to={isAuthenticated ? getHomePath() : "/"} className="brand-logo">
          <svg className="brand-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9 4.97 0 9-4.03 9-9" />
            <path d="M12 7v5l3 3" />
          </svg>
          <span>MindMirror</span>
        </Link>
      </div>

      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            {isAdmin ? (
              <>
                <NavLink
                  to="/admin-dashboard"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Admin Dashboard
                </NavLink>
                <NavLink
                  to="/resources"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Resources Preview
                </NavLink>
              </>
            ) : isProvider ? (
              <>
                <NavLink
                  to="/provider"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Provider Dashboard
                </NavLink>
                <NavLink
                  to="/resources"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Resources
                </NavLink>
              </>
            ) : (
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
                  Insights
                </NavLink>

                <NavLink
                  to="/book"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Specialists
                </NavLink>

                <NavLink
                  to="/resources"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Resources
                </NavLink>
              </>
            )}

            <div className="navbar-user">
              <span className="user-greeting">
                Hello, <strong>{user?.username}</strong>
                {isAdmin && <span className="nav-role-badge badge-admin">Admin</span>}
                {!isAdmin && isProvider && <span className="nav-role-badge badge-specialist">Specialist</span>}
              </span>
              <button
                onClick={handleLogout}
                className="btn-logout"
                type="button"
              >
                Log out
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
              Log in
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
