import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  title: { type: String, required: true, maxlength: 100 },
  content: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  adminReply: { type: String, default: "" },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const Feedback = mongoose.model("Feedback", feedbackSchema);