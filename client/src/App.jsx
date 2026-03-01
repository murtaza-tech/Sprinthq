import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NewSprint from "./pages/NewSprint";
import SprintDashboard from "./pages/SprintDashboard";
import EpicDetail from "./pages/EpicDetail";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("sp-theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sp-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <>
      <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} />
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/sprints/new" element={<NewSprint user={user} />} />
          <Route path="/sprints/:id" element={<SprintDashboard user={user} />} />
          <Route path="/sprints/:id/epics/:epicKey" element={<EpicDetail />} />
        </Routes>
      </div>
    </>
  );
}
