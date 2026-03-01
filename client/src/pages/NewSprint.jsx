import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { parseJiraCsv } from "../utils/csvParser";

const ROLES = ["Frontend", "Backend", "Full Stack", "QA", "DevOps", "Design", "PM"];

const EMPTY_MEMBER = { name: "", role: "Frontend", capacity: 8 };

const SAMPLE_CSV = `Issue Key,Summary,Status,Story Points,Assignee,Epic Link,Epic Name,Issue Type,Priority
PROJ-101,Set up authentication flow,To Do,5,Alice Johnson,PROJ-10,User Management,Story,High
PROJ-102,Design landing page mockup,In Progress,3,Bob Smith,PROJ-11,Marketing Site,Story,Medium
PROJ-103,Write unit tests for API,To Do,3,Alice Johnson,PROJ-10,User Management,Task,Medium
PROJ-104,Fix login redirect bug,Done,2,Charlie Lee,PROJ-10,User Management,Bug,High
PROJ-105,Implement search filters,To Do,8,Bob Smith,PROJ-12,Search & Discovery,Story,Low
PROJ-106,Database migration script,In Progress,5,Charlie Lee,PROJ-13,Infrastructure,Task,High
PROJ-107,Update user profile page,To Do,3,Alice Johnson,PROJ-11,Marketing Site,Story,Medium
PROJ-108,Code review automation setup,To Do,2,Charlie Lee,PROJ-13,Infrastructure,Task,Low`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sprinthq-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function NewSprint({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Sprint info
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [projectUrl, setProjectUrl] = useState("");

  // Step 2: Team
  const [members, setMembers] = useState([{ ...EMPTY_MEMBER }]);

  // Step 3: CSV
  const [csvFile, setCsvFile] = useState(null);
  const [parsedTasks, setParsedTasks] = useState([]);
  const [csvRows, setCsvRows] = useState(0);
  const [dragover, setDragover] = useState(false);
  const [parseError, setParseError] = useState("");

  if (!user) return <Navigate to="/login" />;

  const totalCapacity = members.reduce((sum, m) => sum + (Number(m.capacity) || 0), 0);

  function updateMember(index, field, value) {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  function removeMember(index) {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  function addMember() {
    setMembers((prev) => [...prev, { ...EMPTY_MEMBER }]);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function processFile(file) {
    setCsvFile(file);
    setParseError("");
    try {
      const tasks = await parseJiraCsv(file);
      setParsedTasks(tasks);
      setCsvRows(tasks.length);
    } catch (err) {
      setParseError(err.message || "Failed to parse CSV");
      setCsvFile(null);
      setParsedTasks([]);
      setCsvRows(0);
    }
  }

  function clearFile() {
    setCsvFile(null);
    setParsedTasks([]);
    setCsvRows(0);
    setParseError("");
  }

  async function handleCreate() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          goal,
          start_date: startDate,
          end_date: endDate,
          project_url: projectUrl,
          team: members.filter((m) => m.name.trim()),
          tasks: parsedTasks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create sprint");
        return;
      }

      navigate(`/sprints/${data.id}`);
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setSubmitting(false);
    }
  }

  const canProceedStep0 = name.trim() && startDate && endDate;
  const canProceedStep1 = members.every((m) => m.name.trim()) && members.length > 0;

  const steps = [
    { label: "Sprint Info", num: "1" },
    { label: "Team", num: "2" },
    { label: "Upload CSV", num: "3" },
  ];

  return (
    <div className="new-sprint-page fade-in">
      <h2>Create New Sprint</h2>

      {/* Stepper */}
      <div className="stepper">
        {steps.map((s, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div
              className={`stepper-step ${i === step ? "active" : ""} ${i < step ? "completed" : ""}`}
            >
              <span className="stepper-num">
                {i < step ? "\u2713" : s.num}
              </span>
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`stepper-line ${i < step ? "completed" : ""}`} />
            )}
          </div>
        ))}
      </div>

      {error && <p className="error" style={{ marginBottom: "1rem" }}>{error}</p>}

      {/* Step 0: Sprint Info */}
      {step === 0 && (
        <div className="step-content">
          <div className="step-section card">
            <div className="form-group">
              <label className="form-label">Sprint Name</label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sprint 24 — Q1 Launch"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sprint Goal</label>
              <textarea
                className="form-textarea"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What should this sprint accomplish?"
                rows={2}
              />
            </div>
            <div className="step-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Jira Project URL</label>
              <input
                className="form-input"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="e.g. https://pinknotebook.atlassian.net/browse/"
              />
              <span className="form-hint">Story keys will be linked to this URL. Leave blank to disable links.</span>
            </div>
          </div>
          <div className="step-actions">
            <div />
            <button
              className="btn btn-primary"
              disabled={!canProceedStep0}
              onClick={() => setStep(1)}
            >
              Next: Team &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Team */}
      {step === 1 && (
        <div className="step-content">
          <div className="step-section card">
            <div className="team-list">
              <div className="team-row-header">
                <span>Name</span>
                <span>Role</span>
                <span>Capacity</span>
                <span></span>
              </div>
              {members.map((member, i) => (
                <div key={i} className="team-row">
                  <input
                    className="form-input"
                    value={member.name}
                    onChange={(e) => updateMember(i, "name", e.target.value)}
                    placeholder="Member name"
                  />
                  <select
                    className="form-select"
                    value={member.role}
                    onChange={(e) => updateMember(i, "role", e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="form-input"
                    value={member.capacity}
                    onChange={(e) => updateMember(i, "capacity", e.target.value)}
                    min={0}
                    style={{ textAlign: "center" }}
                  />
                  <button
                    className="btn-remove"
                    onClick={() => removeMember(i)}
                    title="Remove member"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button className="btn-add-member" onClick={addMember}>
                + Add Team Member
              </button>
            </div>
            <div className="team-capacity-total">
              <span>Total Team Capacity</span>
              <span>{totalCapacity} pts</span>
            </div>
          </div>
          <div className="step-actions">
            <button className="btn btn-secondary" onClick={() => setStep(0)}>
              &larr; Back
            </button>
            <button
              className="btn btn-primary"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
            >
              Next: Upload CSV &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 2: CSV Upload */}
      {step === 2 && (
        <div className="step-content">
          <div className="step-section">
            {parseError && <p className="error">{parseError}</p>}
            {!csvFile ? (
              <div
                className={`csv-upload-zone ${dragover ? "dragover" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
                <div className="csv-upload-icon">&#128196;</div>
                <h4>Drop your Jira CSV here</h4>
                <p>or click to browse &middot; .csv files only</p>
                <button
                  type="button"
                  className="btn-download-template"
                  onClick={(e) => { e.stopPropagation(); downloadSampleCsv(); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: "middle", marginRight: "0.35rem"}}><path d="M12 3v12M12 15l-5-5M12 15l5-5" /><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                  Download Sample CSV Template
                </button>
              </div>
            ) : (
              <div className="csv-file-info">
                <span className="csv-file-icon">&#9989;</span>
                <div className="csv-file-details">
                  <div className="csv-file-name">{csvFile.name}</div>
                  <div className="csv-file-rows">{csvRows} tasks parsed</div>
                </div>
                <button className="btn btn-ghost" onClick={clearFile}>
                  Remove
                </button>
              </div>
            )}
          </div>
          <div className="step-actions">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              &larr; Back
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleCreate}
              disabled={submitting || !csvFile}
            >
              {submitting ? "Creating..." : "Create Sprint & View Dashboard"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
