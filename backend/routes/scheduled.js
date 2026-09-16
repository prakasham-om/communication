import express from "express";
import mongoose from "mongoose";
import ScheduledMessage from "../models/ScheduledMessage.js";
import Chat from "../models/Chat.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  const items = await ScheduledMessage.find({
    sender: req.user._id,
    status: "pending"
  })
    .populate({
      path: "chat",
      populate: { path: "users", select: "name email avatar" }
    })
    .sort({ scheduledFor: 1 });
  res.json({ scheduled: items });
});

router.post("/", protect, async (req, res) => {
  try {
    const { chatId, content, scheduledFor } = req.body;

    if (!chatId || !content || !scheduledFor) {
      return res.status(400).json({ message: "chatId, content, scheduledFor are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat id" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const isMember = chat.users.some(
      (u) => u.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this chat" });
    }

    const when = new Date(scheduledFor);
    if (isNaN(when.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }
    if (when <= new Date()) {
      return res.status(400).json({ message: "Time must be in the future" });
    }

    const item = await ScheduledMessage.create({
      chat: chatId,
      sender: req.user._id,
      content: content.trim(),
      scheduledFor: when
    });

    res.json({ scheduled: item });
  } catch (err) {
    console.error("schedule error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  const item = await ScheduledMessage.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });
  if (item.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not allowed" });
  }
  await ScheduledMessage.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
