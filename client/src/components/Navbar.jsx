import { Link, useNavigate } from "react-router-dom";

function SprintHQLogo() {
  return (
    <svg
      className="brand-logo-svg"
      width="32"
      height="28"
      viewBox="0 0 36 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="checkGrad" x1="12" y1="28" x2="30" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="50%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="linesGrad" x1="0" y1="16" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      {/* Speed lines */}
      <rect x="0" y="12" width="10" height="2" rx="1" fill="url(#linesGrad)" opacity="0.7" />
      <rect x="2" y="16" width="8" height="2" rx="1" fill="url(#linesGrad)" opacity="0.55" />
      <rect x="1" y="20" width="9" height="2" rx="1" fill="url(#linesGrad)" opacity="0.4" />
      <rect x="3" y="24" width="6" height="2" rx="1" fill="url(#linesGrad)" opacity="0.25" />
      {/* Checkmark */}
      <path
        d="M10 18L18 26L34 4"
        stroke="url(#checkGrad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function Navbar({ user, setUser, theme, toggleTheme }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <SprintHQLogo />
        <span className="brand-text">Sprint<span className="brand-hq">HQ</span></span>
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/">Sprints</Link>
            <Link to="/sprints/new">New Sprint</Link>
            <button
              onClick={toggleTheme}
              className="btn-theme-toggle"
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "\u2600" : "\u263D"}
            </button>
            <span className="navbar-user">{user.username}</span>
            <button onClick={handleLogout} className="btn btn-ghost">Logout</button>
          </>
        ) : (
          <>
            <button
              onClick={toggleTheme}
              className="btn-theme-toggle"
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "\u2600" : "\u263D"}
            </button>
            <Link to="/login" className="btn btn-primary">Sign In</Link>
          </>
        )}
      </div>
    </nav>
  );
}
