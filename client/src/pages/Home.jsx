import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

function fmtDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const SAMPLE_CSV = `Issue Key,Summary,Status,Story Points,Assignee,Epic Link,Epic Name,Issue Type,Priority
PROJ-101,Set up authentication flow,To Do,5,Alice Johnson,PROJ-10,User Management,Story,High
PROJ-102,Design landing page mockup,In Progress,3,Bob Smith,PROJ-11,Marketing Site,Story,Medium
PROJ-103,Write unit tests for API,To Do,3,Alice Johnson,PROJ-10,User Management,Task,Medium
PROJ-104,Fix login redirect bug,Done,2,Charlie Lee,PROJ-10,User Management,Bug,High
PROJ-105,Implement search filters,To Do,8,Bob Smith,PROJ-12,Search & Discovery,Story,Low`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sprinthq-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home({ user }) {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/sprints", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSprints(data))
      .catch(() => setSprints([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="landing fade-in">
        <h1>
          Sprint planning,
          <br />
          <span>made visible.</span>
        </h1>
        <div className="landing-brand-tag">Powered by <strong>SprintHQ</strong></div>
        <p>
          Upload your Jira CSV, set your team's capacity, and get a dashboard
          that tells the story of your sprint in under 5 minutes.
        </p>
        <Link to="/login" className="btn btn-primary btn-lg">
          Get Started
        </Link>
      </div>
    );
  }

  return (
    <div className="home-page fade-in">
      <div className="home-header">
        <div>
          <h1>
            Your <span>Sprints</span>
          </h1>
          <p className="home-subtitle">Manage and track all your sprint plans</p>
        </div>
        <Link to="/sprints/new" className="btn btn-primary btn-lg">
          + New Sprint
        </Link>
      </div>

      {loading ? (
        <div className="empty-state card">
          <p className="loading-text">Loading sprints...</p>
        </div>
      ) : sprints.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">&#9776;</div>
          <h3>No sprints yet</h3>
          <p>Create your first sprint to get started</p>
          <Link to="/sprints/new" className="btn btn-primary">
            Create Sprint
          </Link>
        </div>
      ) : (
        <div className="sprint-list">
          {sprints.map((sprint, i) => (
            <Link
              key={sprint.id}
              to={`/sprints/${sprint.id}`}
              className={`card card-hover sprint-card slide-up stagger-${Math.min(i + 1, 6)}`}
            >
              <div className="sprint-card-left">
                <div className="sprint-card-name">{sprint.name}</div>
                <div className="sprint-card-goal">{sprint.goal}</div>
              </div>
              <div className="sprint-card-meta">
                <span className="sprint-card-date">
                  {fmtDate(sprint.start_date)} &rarr; {fmtDate(sprint.end_date)}
                </span>
                <span className="sprint-card-arrow">&rsaquo;</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="walkthrough-section">
        <h2>How to use <span>SprintHQ</span></h2>
        <p className="walkthrough-subtitle">A quick guide for PMs to get started with sprint planning</p>
        <div className="walkthrough-steps">
          <div className="walkthrough-step">
            <div className="walkthrough-step-num">1</div>
            <div className="walkthrough-step-content">
              <h4>Create a New Sprint</h4>
              <p>Click "+ New Sprint" and enter the sprint name, goal, start date, and end date to set up your planning session.</p>
            </div>
          </div>
          <div className="walkthrough-step">
            <div className="walkthrough-step-num">2</div>
            <div className="walkthrough-step-content">
              <h4>Add Your Team</h4>
              <p>Define team members with their roles (Frontend, Backend, QA, etc.) and individual capacity in story points for the sprint.</p>
            </div>
          </div>
          <div className="walkthrough-step" style={{ position: "relative" }}>
            <div className="walkthrough-step-num">3</div>
            <div className="walkthrough-step-content">
              <h4>Upload Jira CSV</h4>
              <p>Export your backlog from Jira as a CSV and upload it. SprintHQ maps tasks, assignees, story points, and priorities automatically.</p>
            </div>
            <button
              type="button"
              className="btn-download-template-inline"
              onClick={downloadSampleCsv}
              title="Download sample CSV template"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M12 15l-5-5M12 15l5-5" /><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
              {" "}Template
            </button>
          </div>
          <div className="walkthrough-step">
            <div className="walkthrough-step-num">4</div>
            <div className="walkthrough-step-content">
              <h4>Review the Dashboard</h4>
              <p>Check capacity utilization, task status breakdown, and risk indicators to ensure your sprint is balanced before committing.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
