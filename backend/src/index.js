import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { connectDb } from "./lib/db.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { authRouter } from "./routes/auth.js";
import { commentsRouter } from "./routes/comments.js";
import { datasetsRouter } from "./routes/datasets.js";
import { externalRouter } from "./routes/external.js";
import feedbackRouter from "./routes/feedback.js";
import { foldersRouter } from "./routes/folders.js";
import { stationsRouter } from "./routes/stations.js";
import { usersRouter } from "./routes/users.js";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));

// Serve original data files (RAR) for download
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/datasets", datasetsRouter);
app.use("/api/folders", foldersRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/external", externalRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/stations", stationsRouter);

app.use(errorMiddleware);

const port = Number(process.env.PORT ?? 3001);
await connectDb(process.env.MONGODB_URI);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${port}`);
});

