import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "../server/routes/auth.js";
import sprintRoutes from "../server/routes/sprints.js";

const app = express();

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Body parser
app.use(express.json({ limit: "2mb" }));

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/sprints", sprintRoutes);

// Global error handler
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
