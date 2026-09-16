import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, f, cb) => cb(null, Date.now() + "-" + f.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"))
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get("/", protect, async (req, res) => {
  const q = (req.query.q || "").trim();
  const filter = { _id: { $ne: req.user._id } };
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } }
    ];
  }
  const users = await User.find(filter)
    .select("name email avatar about online lastSeen")
    .limit(100);
  res.json({ users });
});

router.put("/me", protect, async (req, res) => {
  const { name, about, avatar } = req.body;
  if (name) req.user.name = name;
  if (about !== undefined) req.user.about = about;
  if (avatar !== undefined) req.user.avatar = avatar;
  await req.user.save();
  res.json({ user: req.user });
});

router.post("/me/avatar", protect, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  req.user.avatar = "/uploads/" + req.file.filename;
  await req.user.save();
  res.json({ avatar: req.user.avatar });
});

export default router;
