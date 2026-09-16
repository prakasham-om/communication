import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  googleId: String,
  provider: { type: String, default: "local" },
  avatar: { type: String, default: "" },
  about: { type: String, default: "Hey there! I am using ChatWave." },
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
