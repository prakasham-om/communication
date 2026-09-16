import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  isGroup: { type: Boolean, default: false },
  name: { type: String, default: "" },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  lastClearedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);
