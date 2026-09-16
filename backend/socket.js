import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";

const onlineUsers = new Map();

const getTokenFromCookie = (cookieHeader) => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const tokenCookie = cookies.find((c) => c.startsWith("token="));
  return tokenCookie ? tokenCookie.substring("token=".length) : null;
};

export const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = getTokenFromCookie(socket.handshake.headers.cookie);
      if (!token) {
        return next(new Error("No auth token"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      console.error("Socket auth error:", err.message);
      next(new Error("Auth failed"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log("Connected:", socket.user.name, "(" + userId + ")");

    socket.join("user:" + userId);

    try {
      const chats = await Chat.find({ users: socket.user._id }).select("_id");
      chats.forEach((c) => socket.join("chat:" + c._id.toString()));
    } catch (err) {
      console.error("Error joining chats:", err.message);
    }

    onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
    if (onlineUsers.get(userId) === 1) {
      await User.findByIdAndUpdate(userId, { online: true, lastSeen: new Date() });
      io.emit("user:online", { userId, online: true });
    }

    socket.on("chat:join", (chatId) => {
      if (!chatId) return;
      socket.join("chat:" + chatId);
    });

    socket.on("message:send", async ({ chatId, content, tempId }) => {
      try {
        if (!chatId || !content || !content.trim()) return;

        const chat = await Chat.findById(chatId);
        if (!chat) {
          console.error("Chat not found:", chatId);
          return;
        }

        const isMember = chat.users.some(
          (u) => u.toString() === userId
        );
        if (!isMember) {
          console.error("User not a member of chat:", chatId);
          return;
        }

        const msg = await Message.create({
          chat: chatId,
          sender: socket.user._id,
          content: content.trim(),
          type: "text",
          readBy: [socket.user._id]
        });

        chat.lastMessage = msg._id;
        await chat.save();

        const populated = await msg.populate("sender", "name email avatar");

        io.to("chat:" + chatId).emit("message:new", {
          ...populated.toObject(),
          tempId
        });

        io.to("chat:" + chatId).emit("chat:updated", {
          chatId,
          lastMessage: populated
        });
      } catch (err) {
        console.error("message:send error:", err);
      }
    });

    socket.on("typing:start", ({ chatId }) => {
      if (!chatId) return;
      socket.to("chat:" + chatId).emit("typing:start", {
        chatId,
        user: { _id: userId, name: socket.user.name }
      });
    });

    socket.on("typing:stop", ({ chatId }) => {
      if (!chatId) return;
      socket.to("chat:" + chatId).emit("typing:stop", {
        chatId,
        userId
      });
    });

    socket.on("messages:read", async ({ chatId }) => {
      try {
        if (!chatId) return;
        await Message.updateMany(
          { chat: chatId, readBy: { $ne: socket.user._id } },
          { $addToSet: { readBy: socket.user._id } }
        );
        io.to("chat:" + chatId).emit("messages:read", { chatId, userId });
      } catch (err) {
        console.error("messages:read error:", err);
      }
    });

    socket.on("disconnect", async () => {
      const count = (onlineUsers.get(userId) || 1) - 1;
      if (count <= 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { online: false, lastSeen });
        io.emit("user:online", { userId, online: false, lastSeen });
      } else {
        onlineUsers.set(userId, count);
      }
      console.log("Disconnected:", socket.user.name);
    });
  });
};
