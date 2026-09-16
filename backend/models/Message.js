import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  type: { type: String, enum: ["text", "image", "file", "system"], default: "text" },
  fileUrl: String,
  fileName: String,
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

// TTL index - MongoDB auto-deletes documents after the expiry time.
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 3 });

messageSchema.index({ chat: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
