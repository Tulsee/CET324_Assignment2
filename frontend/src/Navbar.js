import { Link, useNavigate } from "react-router-dom";

function Navbar({ isLoggedIn, user, theme, onToggleTheme, onLogout }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <svg className="brand-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
          </svg>
          VaultEntry
        </Link>

        <div className="navbar-actions">
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="nav-username">
                <span className="nav-avatar">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </span>
                <span className="nav-username-text">{user?.username}</span>
              </Link>
              <button
                type="button"
                className="btn-nav-logout"
                onClick={onLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-nav-ghost"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
              <button
                type="button"
                className="btn-nav-primary"
                onClick={() => navigate("/register")}
              >
                Sign Up
              </button>
            </>
          )}

          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label="Toggle dark mode"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <span className="toggle-track">
              <span className="toggle-thumb">
                {theme === "light" ? "☀️" : "🌙"}
              </span>
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
