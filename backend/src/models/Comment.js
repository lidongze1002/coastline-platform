import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    datasetId: { type: mongoose.Schema.Types.ObjectId, ref: "Dataset", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
    // 回复相关
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    replyToUsername: { type: String, default: null },
  },
  { timestamps: true },
);

CommentSchema.index({ datasetId: 1, createdAt: -1 });

export const Comment = mongoose.model("Comment", CommentSchema);

