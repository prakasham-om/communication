import mongoose from "mongoose";

const schema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  scheduledFor: { type: Date, required: true, index: true },
  status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
  sentAt: Date
}, { timestamps: true });

export default mongoose.model("ScheduledMessage", schema);
