import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import chatRoutes from "./routes/chats.js";
import messageRoutes from "./routes/messages.js";
import scheduledRoutes from "./routes/scheduled.js";
import { setupSocket } from "./socket.js";
import { startScheduler } from "./scheduler.js";
import { startCleanup } from "./cleanup.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const server = http.createServer(app);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true }
});

app.set("io", io);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/scheduled", scheduledRoutes);

app.get("/api/health", (_, res) => res.json({ ok: true }));

setupSocket(io);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    startScheduler(io);
    startCleanup(io);
    server.listen(PORT, () => {
      console.log("");
      console.log("===========================================");
      console.log("  Server running on http://localhost:" + PORT);
      console.log("===========================================");
      console.log("");
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
