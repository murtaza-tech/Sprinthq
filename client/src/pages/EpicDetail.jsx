import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

function statusClass(status) {
  switch (status) {
    case "To Do": return "todo";
    case "In Progress": return "inprogress";
    case "In Review": return "inreview";
    case "Done": return "done";
    default: return "todo";
  }
}

const STATUS_ORDER = { "To Do": 0, "In Progress": 1, "In Review": 2, "Done": 3 };
const PRIORITY_ORDER = { "Highest": 0, "High": 1, "Medium": 2, "Low": 3, "Lowest": 4 };

const COLUMNS = [
  { key: "issue_key", label: "Key" },
  { key: "summary", label: "Summary" },
  { key: "assignee", label: "Assignee" },
  { key: "status", label: "Status" },
  { key: "story_points", label: "Points", center: true },
  { key: "priority", label: "Priority" },
];

function compareTasks(a, b, sortKey, sortDir) {
  let valA, valB;

  if (sortKey === "status") {
    valA = STATUS_ORDER[a.status] ?? 99;
    valB = STATUS_ORDER[b.status] ?? 99;
  } else if (sortKey === "priority") {
    valA = PRIORITY_ORDER[a.priority] ?? 99;
    valB = PRIORITY_ORDER[b.priority] ?? 99;
  } else if (sortKey === "story_points") {
    valA = a.story_points ?? -1;
    valB = b.story_points ?? -1;
  } else {
    valA = (a[sortKey] || "").toLowerCase();
    valB = (b[sortKey] || "").toLowerCase();
  }

  if (valA < valB) return sortDir === "asc" ? -1 : 1;
  if (valA > valB) return sortDir === "asc" ? 1 : -1;
  return 0;
}

export default function EpicDetail() {
  const { id, epicKey } = useParams();
  const [epicTasks, setEpicTasks] = useState([]);
  const [sprintName, setSprintName] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    fetch(`/api/sprints/${id}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSprintName(data.sprint.name);
          setProjectUrl(data.sprint.project_url || "");
          setEpicTasks(data.tasks.filter((t) => t.epic_key === epicKey));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, epicKey]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedTasks = useMemo(() => {
    if (!sortKey) return epicTasks;
    return [...epicTasks].sort((a, b) => compareTasks(a, b, sortKey, sortDir));
  }, [epicTasks, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="epic-detail-page fade-in">
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (epicTasks.length === 0) {
    return (
      <div className="epic-detail-page fade-in">
        <Link to={`/sprints/${id}`} className="back-link">
          &larr; Back to dashboard
        </Link>
        <p style={{ color: "var(--text-muted)" }}>Epic not found.</p>
      </div>
    );
  }

  const epicName = epicTasks[0].epic_name || epicKey;
  const totalPoints = epicTasks.reduce((s, t) => s + (t.story_points || 0), 0);
  const completedPoints = epicTasks
    .filter((t) => t.status === "Done")
    .reduce((s, t) => s + (t.story_points || 0), 0);
  const completionPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  return (
    <div className="epic-detail-page fade-in">
      <Link to={`/sprints/${id}`} className="back-link">
        &larr; Back to {sprintName || "dashboard"}
      </Link>

      <div className="epic-detail-header">
        <div className="epic-detail-key">{epicKey}</div>
        <h1>{epicName}</h1>
        <div className="epic-detail-stats">
          <span className="epic-stat">
            <strong>{epicTasks.length}</strong> stories
          </span>
          <span className="epic-stat">
            <strong>{totalPoints}</strong> points
          </span>
          <span className="epic-stat">
            <strong>{completionPct}%</strong> complete
          </span>
        </div>
      </div>

      <div className="tasks-table-wrap slide-up">
        <table className="tasks-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`sortable-th ${sortKey === col.key ? "active" : ""}`}
                  style={col.center ? { textAlign: "center" } : undefined}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="th-inner">
                    {col.label}
                    <span className="sort-indicator">
                      {sortKey === col.key ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : "\u25B8"}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr key={task.id}>
                <td>
                  {projectUrl ? (
                    <a
                      href={`${projectUrl}${task.issue_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="task-key task-key-link"
                    >
                      {task.issue_key}
                    </a>
                  ) : (
                    <span className="task-key">{task.issue_key}</span>
                  )}
                </td>
                <td>
                  <span className="task-summary">{task.summary}</span>
                </td>
                <td>
                  <span className={`task-assignee ${!task.assignee ? "unassigned" : ""}`}>
                    {task.assignee || "Unassigned"}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${statusClass(task.status)}`}>
                    {task.status}
                  </span>
                </td>
                <td>
                  <span className={`task-points ${!task.story_points ? "none" : ""}`} style={{ display: "block", textAlign: "center" }}>
                    {task.story_points || "—"}
                  </span>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  {task.priority}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
