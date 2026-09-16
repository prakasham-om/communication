import express from "express";
import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const populateChat = (query) =>
  query
    .populate("users", "name email avatar about online lastSeen")
    .populate("admin", "name email avatar")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "name email avatar" }
    });

router.get("/", protect, async (req, res) => {
  const chats = await populateChat(
    Chat.find({ users: req.user._id }).sort({ updatedAt: -1 })
  );
  res.json({ chats });
});

router.post("/direct/:userId", protect, async (req, res) => {
  try {
    const otherId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (otherId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    const other = await User.findById(otherId);
    if (!other) return res.status(404).json({ message: "User not found" });

    let chat = await Chat.findOne({
      isGroup: false,
      users: { $all: [req.user._id, otherId], $size: 2 }
    });

    let created = false;

    if (!chat) {
      chat = await Chat.create({
        isGroup: false,
        users: [req.user._id, otherId]
      });
      created = true;
    }

    const populated = await populateChat(Chat.findById(chat._id));
    const io = req.app.get("io");

    [req.user._id.toString(), otherId].forEach((uid) => {
      const room = io.sockets.adapter.rooms.get("user:" + uid);
      if (room) {
        for (const socketId of room) {
          const s = io.sockets.sockets.get(socketId);
          if (s) s.join("chat:" + chat._id.toString());
        }
      }
    });

    io.to("user:" + req.user._id.toString()).emit("chat:new", populated);
    io.to("user:" + otherId).emit("chat:new", populated);

    res.json({ chat: populated, created });
  } catch (err) {
    console.error("direct chat error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { name, userIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Select at least one member" });
    }

    const validIds = userIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const uniqueIds = Array.from(new Set([req.user._id.toString(), ...validIds]));

    const chat = await Chat.create({
      isGroup: true,
      name: name.trim(),
      users: uniqueIds,
      admin: req.user._id
    });

    await Message.create({
      chat: chat._id,
      sender: req.user._id,
      content: req.user.name + " created the group " + name,
      type: "system"
    });

    const populated = await populateChat(Chat.findById(chat._id));
    const io = req.app.get("io");

    uniqueIds.forEach((uid) => {
      const room = io.sockets.adapter.rooms.get("user:" + uid);
      if (room) {
        for (const socketId of room) {
          const s = io.sockets.sockets.get(socketId);
          if (s) s.join("chat:" + chat._id.toString());
        }
      }
      io.to("user:" + uid).emit("chat:new", populated);
    });

    res.json({ chat: populated });
  } catch (err) {
    console.error("create group error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid chat id" });
  }

  const chat = await populateChat(Chat.findById(req.params.id));
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  const isMember = chat.users.some(
    (u) => u._id.toString() === req.user._id.toString()
  );
  if (!isMember) return res.status(403).json({ message: "Not a member" });

  res.json({ chat });
});

export default router;
