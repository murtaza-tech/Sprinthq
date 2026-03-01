import { Router } from "express";
import bcrypt from "bcrypt";
import db from "../db.js";
import { getSession } from "../session.js";

const router = Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid input" });
  }

  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: "Username must be 3-30 characters" });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: "Username can only contain letters, numbers, hyphens, and underscores" });
  }

  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ error: "Password must be 6-128 characters" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, passwordHash);

  const session = await getSession(req, res);
  session.userId = result.lastInsertRowid;
  session.username = username;
  await session.save();

  res.json({ id: result.lastInsertRowid, username });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const session = await getSession(req, res);
  session.userId = user.id;
  session.username = user.username;
  await session.save();

  res.json({ id: user.id, username: user.username });
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const session = await getSession(req, res);
  session.destroy();
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json({ id: session.userId, username: session.username });
});

export default router;
