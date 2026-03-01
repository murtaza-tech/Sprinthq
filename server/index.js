import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import sprintRoutes from "./routes/sprints.js";

const app = express();
const PORT = 3001;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/sprints", sprintRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
