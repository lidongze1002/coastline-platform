import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["user", "admin"], default: "user" },
    
    // 个人信息
    avatar: { type: String, default: "" },  // 头像URL
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    school: { type: String, default: "" },  // 学校/单位
    bio: { type: String, default: "" },  // 个人简介
    
    // 浏览历史（仅保存最近50条，每个包含数据集ID和浏览时间）
    browseHistory: { 
      type: [{
        datasetId: { type: mongoose.Schema.Types.ObjectId, ref: "Dataset" },
        viewedAt: { type: Date, default: Date.now }
      }], 
      default: [] 
    },
  },
  { timestamps: true },
);

// 索引
UserSchema.index({ username: 1 });
UserSchema.index({ createdAt: -1 });

export const User = mongoose.model("User", UserSchema);

