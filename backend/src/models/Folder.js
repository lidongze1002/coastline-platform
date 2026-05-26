import mongoose from "mongoose";

const FolderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 500 },
    // 文件夹归属用户
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // 是否公开（公开则所有用户可见）
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FolderSchema.index({ owner: 1 });
FolderSchema.index({ isPublic: 1 });

export const Folder = mongoose.model("Folder", FolderSchema);