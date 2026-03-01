import { Router } from "express";
import db from "../db.js";
import { getSession } from "../session.js";

const router = Router();

// Auth middleware
async function requireAuth(req, res, next) {
  const session = await getSession(req, res);
  if (!session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.userId = session.userId;
  next();
}

router.use(requireAuth);

// ─── LIST SPRINTS ───────────────────────────────────
// GET /api/sprints
router.get("/", (req, res) => {
  const sprints = db
    .prepare("SELECT * FROM sprints WHERE created_by = ? ORDER BY created_at DESC")
    .all(req.userId);
  res.json(sprints);
});

// ─── CREATE SPRINT ──────────────────────────────────
// POST /api/sprints
// Body: { name, goal, start_date, end_date, team: [...], tasks: [...] }
router.post("/", (req, res) => {
  const { name, goal, start_date, end_date, project_url, team, tasks } = req.body;

  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: "Name, start_date, and end_date are required" });
  }

  const insertSprint = db.prepare(
    "INSERT INTO sprints (name, goal, start_date, end_date, project_url, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const insertMember = db.prepare(
    "INSERT INTO team_members (sprint_id, name, role, capacity) VALUES (?, ?, ?, ?)"
  );

  const insertTask = db.prepare(
    `INSERT INTO tasks (sprint_id, issue_key, summary, status, story_points, assignee, epic_key, epic_name, issue_type, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const createSprint = db.transaction(() => {
    const result = insertSprint.run(name, goal || "", start_date, end_date, project_url || "", req.userId);
    const sprintId = result.lastInsertRowid;

    if (team && Array.isArray(team)) {
      for (const m of team) {
        insertMember.run(sprintId, m.name, m.role, Number(m.capacity) || 0);
      }
    }

    if (tasks && Array.isArray(tasks)) {
      for (const t of tasks) {
        insertTask.run(
          sprintId,
          t.issue_key || "",
          t.summary || "",
          t.status || "To Do",
          t.story_points != null && t.story_points !== "" ? Number(t.story_points) : null,
          t.assignee || null,
          t.epic_key || null,
          t.epic_name || null,
          t.issue_type || null,
          t.priority || null
        );
      }
    }

    return sprintId;
  });

  try {
    const sprintId = createSprint();
    res.json({ id: sprintId });
  } catch (err) {
    console.error("Create sprint error:", err);
    res.status(500).json({ error: "Failed to create sprint" });
  }
});

// ─── GET SPRINT DETAIL ──────────────────────────────
// GET /api/sprints/:id
router.get("/:id", (req, res) => {
  const sprint = db
    .prepare("SELECT * FROM sprints WHERE id = ? AND created_by = ?")
    .get(req.params.id, req.userId);

  if (!sprint) {
    return res.status(404).json({ error: "Sprint not found" });
  }

  const team = db
    .prepare("SELECT * FROM team_members WHERE sprint_id = ?")
    .all(sprint.id);

  const tasks = db
    .prepare("SELECT * FROM tasks WHERE sprint_id = ?")
    .all(sprint.id);

  res.json({ sprint, team, tasks });
});

// ─── UPDATE SPRINT METADATA ─────────────────────────
// PUT /api/sprints/:id
// Body: { name, goal, start_date, end_date }
router.put("/:id", (req, res) => {
  const { name, goal, start_date, end_date, project_url } = req.body;

  const sprint = db
    .prepare("SELECT id FROM sprints WHERE id = ? AND created_by = ?")
    .get(req.params.id, req.userId);

  if (!sprint) {
    return res.status(404).json({ error: "Sprint not found" });
  }

  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: "Name, start_date, and end_date are required" });
  }

  db.prepare("UPDATE sprints SET name = ?, goal = ?, start_date = ?, end_date = ?, project_url = ? WHERE id = ?")
    .run(name, goal || "", start_date, end_date, project_url || "", sprint.id);

  res.json({ ok: true });
});

// ─── UPDATE SPRINT TASKS ────────────────────────────
// PUT /api/sprints/:id/tasks
// Body: { tasks: [...] }
router.put("/:id/tasks", (req, res) => {
  const { tasks } = req.body;

  const sprint = db
    .prepare("SELECT id FROM sprints WHERE id = ? AND created_by = ?")
    .get(req.params.id, req.userId);

  if (!sprint) {
    return res.status(404).json({ error: "Sprint not found" });
  }

  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Tasks array is required" });
  }

  const deleteTasks = db.prepare("DELETE FROM tasks WHERE sprint_id = ?");
  const insertTask = db.prepare(
    `INSERT INTO tasks (sprint_id, issue_key, summary, status, story_points, assignee, epic_key, epic_name, issue_type, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const replaceTasks = db.transaction(() => {
    deleteTasks.run(sprint.id);
    for (const t of tasks) {
      insertTask.run(
        sprint.id,
        t.issue_key || "",
        t.summary || "",
        t.status || "To Do",
        t.story_points != null && t.story_points !== "" ? Number(t.story_points) : null,
        t.assignee || null,
        t.epic_key || null,
        t.epic_name || null,
        t.issue_type || null,
        t.priority || null
      );
    }
    return tasks.length;
  });

  try {
    const count = replaceTasks();
    res.json({ ok: true, count });
  } catch (err) {
    console.error("Update tasks error:", err);
    res.status(500).json({ error: "Failed to update tasks" });
  }
});

// ─── RENAME EPIC ───────────────────────────────────
// PUT /api/sprints/:id/epics/:epicKey
// Body: { epic_name }
router.put("/:id/epics/:epicKey", (req, res) => {
  const { epic_name } = req.body;

  const sprint = db
    .prepare("SELECT id FROM sprints WHERE id = ? AND created_by = ?")
    .get(req.params.id, req.userId);

  if (!sprint) {
    return res.status(404).json({ error: "Sprint not found" });
  }

  if (!epic_name || !epic_name.trim()) {
    return res.status(400).json({ error: "Epic name is required" });
  }

  const result = db
    .prepare("UPDATE tasks SET epic_name = ? WHERE sprint_id = ? AND epic_key = ?")
    .run(epic_name.trim(), sprint.id, req.params.epicKey);

  res.json({ ok: true, updated: result.changes });
});

// ─── DELETE SPRINT ──────────────────────────────────
// DELETE /api/sprints/:id
router.delete("/:id", (req, res) => {
  const sprint = db
    .prepare("SELECT id FROM sprints WHERE id = ? AND created_by = ?")
    .get(req.params.id, req.userId);

  if (!sprint) {
    return res.status(404).json({ error: "Sprint not found" });
  }

  db.prepare("DELETE FROM sprints WHERE id = ?").run(sprint.id);
  res.json({ ok: true });
});

export default router;
