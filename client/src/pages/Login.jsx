import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login({ setUser }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }

    setUser(data);
    navigate("/");
  }

  return (
    <div className="auth-page fade-in">
      <h2>{isSignup ? "Create account" : "Welcome back"}</h2>
      <p className="auth-subtitle">
        {isSignup
          ? "Sign up to start planning your sprints"
          : "Sign in to access your sprint dashboards"}
      </p>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <p className="error">{error}</p>}
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "0.5rem" }}>
          {isSignup ? "Create Account" : "Sign In"}
        </button>
      </form>
      <p className="auth-toggle">
        {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          onClick={() => {
            setIsSignup(!isSignup);
            setError("");
          }}
          className="link-btn"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}
