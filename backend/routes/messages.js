import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, f, cb) => cb(null, Date.now() + "-" + f.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"))
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.get("/:chatId", protect, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) {
    return res.status(400).json({ message: "Invalid chat id" });
  }

  const chat = await Chat.findById(req.params.chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  const isMember = chat.users.some(
    (u) => u.toString() === req.user._id.toString()
  );
  if (!isMember) return res.status(403).json({ message: "Not a member" });

  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "name email avatar")
    .sort({ createdAt: 1 })
    .limit(500);

  const unreadIds = messages
    .filter((m) => !m.readBy.some((r) => r.toString() === req.user._id.toString()))
    .map((m) => m._id);

  if (unreadIds.length > 0) {
    await Message.updateMany(
      { _id: { $in: unreadIds } },
      { $addToSet: { readBy: req.user._id } }
    );
    req.app.get("io")
      .to("chat:" + req.params.chatId)
      .emit("messages:read", { chatId: req.params.chatId, userId: req.user._id.toString() });
  }

  res.json({ messages });
});

router.post("/:chatId/upload", protect, upload.single("file"), async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const isMember = chat.users.some(
      (u) => u.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: "Not a member" });
    if (!req.file) return res.status(400).json({ message: "No file" });

    const url = "/uploads/" + req.file.filename;
    const isImage = req.file.mimetype.startsWith("image/");

    const msg = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      content: req.body.caption || "",
      type: isImage ? "image" : "file",
      fileUrl: url,
      fileName: req.file.originalname
    });

    chat.lastMessage = msg._id;
    await chat.save();

    const populated = await msg.populate("sender", "name email avatar");

    req.app.get("io")
      .to("chat:" + chat._id.toString())
      .emit("message:new", populated);

    res.json({ message: populated });
  } catch (err) {
    console.error("upload error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
