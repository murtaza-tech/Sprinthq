import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { computeDashboardMetrics } from "../utils/mockData";
import { parseJiraCsv } from "../utils/csvParser";

function fmtDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SprintDashboard({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Update CSV modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [parsedTasks, setParsedTasks] = useState([]);
  const [parseError, setParseError] = useState("");
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editProjectUrl, setEditProjectUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Epic rename state
  const [renamingEpic, setRenamingEpic] = useState(null);
  const [epicNameInput, setEpicNameInput] = useState("");

  const fetchSprint = useCallback(() => {
    fetch(`/api/sprints/${id}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Sprint not found");
        return res.json();
      })
      .then((data) => {
        setSprint(data.sprint);
        setTeam(data.team);
        setTasks(data.tasks);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchSprint();
  }, [fetchSprint]);

  // CSV modal handlers
  function openModal() {
    setCsvFile(null);
    setParsedTasks([]);
    setParseError("");
    setShowUpdateModal(true);
  }

  function closeModal() {
    setShowUpdateModal(false);
    setCsvFile(null);
    setParsedTasks([]);
    setParseError("");
  }

  async function handleFile(file) {
    setCsvFile(file);
    setParseError("");
    try {
      const result = await parseJiraCsv(file);
      setParsedTasks(result);
    } catch (err) {
      setParseError(err.message || "Failed to parse CSV");
      setCsvFile(null);
      setParsedTasks([]);
    }
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleConfirmUpdate() {
    setUploading(true);
    try {
      const res = await fetch(`/api/sprints/${id}/tasks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tasks: parsedTasks }),
      });
      if (!res.ok) {
        const data = await res.json();
        setParseError(data.error || "Failed to update");
        return;
      }
      closeModal();
      fetchSprint();
    } catch {
      setParseError("Network error — is the server running?");
    } finally {
      setUploading(false);
    }
  }

  // Edit modal handlers
  function openEditModal() {
    setEditName(sprint.name);
    setEditGoal(sprint.goal || "");
    setEditStartDate(sprint.start_date);
    setEditEndDate(sprint.end_date);
    setEditProjectUrl(sprint.project_url || "");
    setEditError("");
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editName.trim() || !editStartDate || !editEndDate) {
      setEditError("Name, start date, and end date are required.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/sprints/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editName,
          goal: editGoal,
          start_date: editStartDate,
          end_date: editEndDate,
          project_url: editProjectUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Failed to update sprint");
        return;
      }
      closeEditModal();
      fetchSprint();
    } catch {
      setEditError("Network error — is the server running?");
    } finally {
      setEditSaving(false);
    }
  }

  // Delete handlers
  async function handleDeleteSprint() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sprints/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setDeleting(false);
        return;
      }
      navigate("/");
    } catch {
      setDeleting(false);
    }
  }

  // Epic rename handlers
  function startRenameEpic(e, epicKey, currentName) {
    e.preventDefault();
    e.stopPropagation();
    setRenamingEpic(epicKey);
    setEpicNameInput(currentName === "No Epic" ? "" : currentName);
  }

  async function handleRenameEpic(epicKey) {
    if (!epicNameInput.trim()) {
      setRenamingEpic(null);
      return;
    }
    try {
      const res = await fetch(`/api/sprints/${id}/epics/${epicKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ epic_name: epicNameInput.trim() }),
      });
      if (res.ok) {
        setRenamingEpic(null);
        fetchSprint();
      }
    } catch {
      // silently fail
    }
  }

  // Per-member and per-role capacity breakdown (must be before early returns — hooks rule)
  const { memberStats, roleStats } = useMemo(() => {
    const members = team.map((member) => {
      const assigned = tasks
        .filter((t) => t.assignee === member.name)
        .reduce((sum, t) => sum + (t.story_points || 0), 0);
      const cap = Number(member.capacity) || 0;
      const pct = cap > 0 ? Math.round((assigned / cap) * 100) : assigned > 0 ? 999 : 0;
      return { name: member.name, role: member.role, capacity: cap, assigned, pct };
    });

    const roleMap = {};
    for (const mb of members) {
      if (!roleMap[mb.role]) roleMap[mb.role] = { role: mb.role, capacity: 0, assigned: 0 };
      roleMap[mb.role].capacity += mb.capacity;
      roleMap[mb.role].assigned += mb.assigned;
    }
    const roles = Object.values(roleMap).map((r) => ({
      ...r,
      pct: r.capacity > 0 ? Math.round((r.assigned / r.capacity) * 100) : r.assigned > 0 ? 999 : 0,
    }));

    return { memberStats: members, roleStats: roles };
  }, [tasks, team]);

  if (loading) {
    return (
      <div className="dashboard-page fade-in">
        <p className="loading-text">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !sprint) return <Navigate to="/" />;

  const m = computeDashboardMetrics(tasks, team);
  const totalStatuses = Object.values(m.statusBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard-page fade-in">
      {/* Header */}
      <div className="dash-header slide-up">
        <div className="dash-header-left">
          <h1>{sprint.name}</h1>
          {sprint.goal && <div className="dash-goal">{sprint.goal}</div>}
        </div>
        <div className="dash-header-right">
          <button className="btn-update-csv" onClick={openModal}>
            <span className="upload-icon">&#8635;</span>
            Update CSV
          </button>
          <button className="btn btn-ghost btn-icon" onClick={openEditModal} title="Edit Sprint">
            <span className="edit-icon">&#9998;</span>
          </button>
          <button className="btn btn-danger btn-icon" onClick={() => setShowDeleteModal(true)} title="Delete Sprint">
            <span className="delete-icon">&#128465;</span>
          </button>
          <div className="dash-date-badge">
            <span className="date-icon">&#128197;</span>
            {fmtDate(sprint.start_date)}
            <span className="date-arrow">&rarr;</span>
            {fmtDate(sprint.end_date)}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="card kpi-card slide-up stagger-1">
          <div className="kpi-label">Total Stories</div>
          <div className="kpi-value-row">
            <div className="kpi-icon stories">&#128203;</div>
            <span className="kpi-value">{m.totalStories}</span>
          </div>
        </div>
        <div className="card kpi-card slide-up stagger-2">
          <div className="kpi-label">Story Points</div>
          <div className="kpi-value-row">
            <div className="kpi-icon points">&#9776;</div>
            <span className="kpi-value">{m.totalPoints}</span>
          </div>
        </div>
        <div className="card kpi-card slide-up stagger-3">
          <div className="kpi-label">Completed</div>
          <div className="kpi-value-row">
            <div className="kpi-icon completed">&#10003;</div>
            <span className="kpi-value">
              {m.completedPoints}
              <span className="kpi-unit">pts</span>
            </span>
          </div>
        </div>
        <div className="card kpi-card slide-up stagger-4">
          <div className="kpi-label">Unestimated</div>
          <div className="kpi-value-row">
            <div className="kpi-icon unestimated">&#9888;</div>
            <span className="kpi-value">{m.unestimated}</span>
          </div>
        </div>
      </div>

      {/* Insights Row — capacity + status + risk */}
      <div className="insights-row">
        {/* Capacity */}
        <div className="card capacity-plan slide-up stagger-3">
          <div className="widget-title">Capacity</div>
          <div className="capacity-plan-layout">
            <div className="capacity-plan-left">
              <div className="capacity-big">
                <span className="capacity-committed">{m.totalPoints}</span>
                <span className="capacity-separator">/</span>
                <span className="capacity-total">{m.teamCapacity}</span>
              </div>
              <div className="capacity-sub">pts planned / available</div>
              {m.overCapacity > 0 ? (
                <div className="capacity-warning">&#9650; Over by {m.overCapacity} pts</div>
              ) : (
                <div className="capacity-ok">&#10003; {m.teamCapacity - m.totalPoints} pts remaining</div>
              )}
            </div>
            {roleStats.length > 0 && (
              <div className="capacity-plan-right">
                {roleStats.map((r) => (
                  <div key={r.role} className="role-compact">
                    <span className="role-compact-name">{r.role}</span>
                    <span className={`role-compact-pts ${r.pct > 100 ? "over" : r.pct >= 80 ? "warn" : ""}`}>
                      {r.assigned}/{r.capacity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card status-widget slide-up stagger-4">
          <div className="widget-title">Status Breakdown</div>
          <div className="status-bar-container">
            <div className="status-bar">
              {totalStatuses > 0 && (
                <>
                  <div
                    className="status-bar-segment todo"
                    style={{ width: `${(m.statusBreakdown["To Do"] / totalStatuses) * 100}%` }}
                  />
                  <div
                    className="status-bar-segment inprogress"
                    style={{ width: `${(m.statusBreakdown["In Progress"] / totalStatuses) * 100}%` }}
                  />
                  <div
                    className="status-bar-segment inreview"
                    style={{ width: `${(m.statusBreakdown["In Review"] / totalStatuses) * 100}%` }}
                  />
                  <div
                    className="status-bar-segment done"
                    style={{ width: `${(m.statusBreakdown["Done"] / totalStatuses) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>
          <div className="status-legend">
            {[
              { key: "To Do", cls: "todo" },
              { key: "In Progress", cls: "inprogress" },
              { key: "In Review", cls: "inreview" },
              { key: "Done", cls: "done" },
            ].map(({ key, cls }) => (
              <div key={key} className="status-legend-item">
                <span className={`status-dot ${cls}`} />
                <span className="status-legend-label">{key}</span>
                <span className="status-legend-count">{m.statusBreakdown[key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Signals */}
        <div className="card risk-widget slide-up stagger-5">
          <div className="widget-title">Risk Signals</div>
          <div className="risk-list">
            <div className="risk-item">
              <div className="risk-item-left">
                <span className="risk-icon">&#9888;</span>
                <span className="risk-label">Unestimated</span>
              </div>
              <span className={`risk-count ${m.unestimated > 0 ? "warn" : "ok"}`}>
                {m.unestimated}
              </span>
            </div>
            <div className="risk-item">
              <div className="risk-item-left">
                <span className="risk-icon">&#128100;</span>
                <span className="risk-label">Unassigned</span>
              </div>
              <span className={`risk-count ${m.unassigned > 0 ? "danger" : "ok"}`}>
                {m.unassigned}
              </span>
            </div>
            <div className="risk-item">
              <div className="risk-item-left">
                <span className="risk-icon">&#128200;</span>
                <span className="risk-label">Over capacity</span>
              </div>
              <span className={`risk-count ${m.overCapacity > 0 ? "danger" : "ok"}`}>
                {m.overCapacity > 0 ? `+${m.overCapacity}` : "0"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Epics Section */}
      <div className="epics-section slide-up stagger-6">
        <div className="section-title">Epics in Sprint</div>
        <div className="epics-grid">
          {m.epics.map((epic) => (
            <div
              key={epic.key}
              className="card card-hover epic-card"
              style={{ "--epic-color": epic.color }}
            >
              <div className="epic-card-header">
                <div className="epic-key">
                  <span className="epic-key-dot" style={{ background: epic.color }} />
                  {epic.key}
                </div>
                <Link to={`/sprints/${id}/epics/${epic.key}`} className="epic-card-arrow">&rsaquo;</Link>
              </div>
              {renamingEpic === epic.key ? (
                <div className="epic-rename-row">
                  <input
                    className="form-input epic-rename-input"
                    value={epicNameInput}
                    onChange={(e) => setEpicNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameEpic(epic.key);
                      if (e.key === "Escape") setRenamingEpic(null);
                    }}
                    placeholder="Enter epic name"
                    autoFocus
                  />
                  <button
                    className="btn btn-primary epic-rename-save"
                    onClick={() => handleRenameEpic(epic.key)}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-ghost epic-rename-cancel"
                    onClick={() => setRenamingEpic(null)}
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div className="epic-card-name-row">
                  <Link to={`/sprints/${id}/epics/${epic.key}`} className="epic-card-name">
                    {epic.name}
                  </Link>
                  <button
                    className="epic-rename-btn"
                    onClick={(e) => startRenameEpic(e, epic.key, epic.name)}
                    title="Rename epic"
                  >
                    &#9998;
                  </button>
                </div>
              )}
              <Link to={`/sprints/${id}/epics/${epic.key}`} className="epic-card-body-link">
                <div className="epic-card-stats">
                  {epic.storyCount} stories &middot; {epic.totalPoints} pts
                </div>
                <div className="epic-progress-bar">
                  <div
                    className="epic-progress-fill"
                    style={{
                      width: `${epic.completionPct}%`,
                      background: epic.color,
                    }}
                  />
                </div>
                <div className="epic-progress-label">{epic.completionPct}% complete</div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Update CSV Modal */}
      {showUpdateModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-panel">
            <div className="modal-header">
              <h3>Update Sprint Data</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <p className="modal-desc">
              Upload a new Jira CSV to replace all existing tasks. This will overwrite the current data with fresh values from your export.
            </p>

            <div className="modal-body">
              {parseError && <p className="error">{parseError}</p>}

              {!csvFile ? (
                <div
                  className={`csv-upload-zone ${dragover ? "dragover" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                  onDragLeave={() => setDragover(false)}
                  onDrop={handleDrop}
                >
                  <input type="file" accept=".csv" onChange={handleFileInput} />
                  <div className="csv-upload-icon">&#128196;</div>
                  <h4>Drop your updated CSV here</h4>
                  <p>or click to browse &middot; .csv files only</p>
                </div>
              ) : (
                <>
                  <div className="csv-file-info">
                    <span className="csv-file-icon">&#9989;</span>
                    <div className="csv-file-details">
                      <div className="csv-file-name">{csvFile.name}</div>
                      <div className="csv-file-rows">{parsedTasks.length} tasks parsed</div>
                    </div>
                    <button
                      className="btn btn-ghost"
                      onClick={() => { setCsvFile(null); setParsedTasks([]); setParseError(""); }}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="csv-diff">
                    <div className="csv-diff-card old">
                      <div className="csv-diff-label">Current</div>
                      <div className="csv-diff-value">{tasks.length}</div>
                      <div className="csv-diff-sub">tasks</div>
                    </div>
                    <div className="csv-diff-card new">
                      <div className="csv-diff-label">New Upload</div>
                      <div className="csv-diff-value">{parsedTasks.length}</div>
                      <div className="csv-diff-sub">tasks</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {csvFile && parsedTasks.length > 0 && (
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmUpdate}
                  disabled={uploading}
                >
                  {uploading ? "Updating..." : "Replace Tasks"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Sprint Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeEditModal(); }}>
          <div className="modal-panel">
            <div className="modal-header">
              <h3>Edit Sprint</h3>
              <button className="modal-close" onClick={closeEditModal}>&times;</button>
            </div>
            <div className="modal-body">
              {editError && <p className="error">{editError}</p>}
              <div className="form-group">
                <label className="form-label">Sprint Name</label>
                <input
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Sprint name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sprint Goal</label>
                <textarea
                  className="form-textarea"
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                  placeholder="What should this sprint accomplish?"
                  rows={2}
                />
              </div>
              <div className="edit-date-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Jira Project URL</label>
                <input
                  className="form-input"
                  value={editProjectUrl}
                  onChange={(e) => setEditProjectUrl(e.target.value)}
                  placeholder="e.g. https://pinknotebook.atlassian.net/browse/"
                />
                <span className="form-hint">Story keys will be linked to this URL. Leave blank to disable links.</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sprint Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
          <div className="modal-panel delete-confirm-panel">
            <div className="modal-header">
              <h3>Delete Sprint</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="delete-confirm-content">
                <div className="delete-confirm-icon">&#128465;</div>
                <p className="delete-confirm-text">
                  Are you sure you want to delete <strong>{sprint.name}</strong>? This will permanently remove this sprint and all its data, including team members and tasks.
                </p>
                <p className="delete-confirm-warning">This action cannot be undone.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteSprint}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Sprint"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
