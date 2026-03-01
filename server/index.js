import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import sprintRoutes from "./routes/sprints.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS — configurable via env, defaults to localhost for dev
const allowedOrigins = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Body parser with size limit
app.use(express.json({ limit: "2mb" }));

// Rate limiting on auth routes to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 attempts per window
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/sprints", sprintRoutes);

// Serve static client build in production
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

// Global error handler — never leak stack traces
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
