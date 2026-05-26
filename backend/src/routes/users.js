import express from "express";
import { z } from "zod";

import { requireAuth, requireRole } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

export const usersRouter = express.Router();

// 获取用户列表（仅管理员）
usersRouter.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  const users = await User.find().select("_id username role createdAt").sort({ createdAt: -1 });
  res.json({
    users: users.map((u) => ({
      id: String(u._id),
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    })),
  });
});

// 获取自己的个人信息
usersRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({
    user: {
      id: String(user._id),
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      gender: user.gender,
      school: user.school,
      bio: user.bio,
      createdAt: user.createdAt,
    }
  });
});

// 更新个人信息
usersRouter.patch("/me", requireAuth, async (req, res) => {
  // 接受任何字段
  const user = await User.findByIdAndUpdate(
    req.user.id,
    req.body,
    { new: true },
  ).select("-passwordHash");
  
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({
    user: {
      id: String(user._id),
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      gender: user.gender,
      school: user.school,
      bio: user.bio,
    }
  });
});

// 添加浏览记录
usersRouter.post("/me/browse-history", requireAuth, async (req, res) => {
  const schema = z.object({
    datasetId: z.string(),
  });
  
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
  
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  
  // 检查是否已存在，如果存在则更新浏览时间
  const existingIndex = user.browseHistory.findIndex(
    h => h.datasetId.toString() === parsed.data.datasetId
  );
  
  if (existingIndex >= 0) {
    user.browseHistory[existingIndex].viewedAt = new Date();
  } else {
    user.browseHistory.push({
      datasetId: parsed.data.datasetId,
      viewedAt: new Date()
    });
  }
  
  // 只保留最近50条
  if (user.browseHistory.length > 50) {
    user.browseHistory = user.browseHistory.slice(-50);
  }
  
  await user.save();
  
  res.json({ ok: true });
});

// 获取浏览记录
usersRouter.get("/me/browse-history", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("browseHistory.datasetId", "_id name date regionName sensor status");
  
  if (!user) return res.status(404).json({ message: "User not found" });
  
  const historyList = user.browseHistory || [];
  
  // 转换数据格式，兼容旧数据
  const history = [];
  for (const h of historyList) {
    // 新格式：对象 { datasetId: ObjectId, viewedAt: Date }
    if (h.datasetId && typeof h.datasetId === 'object' && h.datasetId._id) {
      history.push({
        datasetId: String(h.datasetId._id),
        datasetName: h.datasetId.name,
        date: h.datasetId.date,
        regionName: h.datasetId.regionName,
        sensor: h.datasetId.sensor,
        status: h.datasetId.status,
        year: h.datasetId.date ? new Date(h.datasetId.date).getFullYear() : '',
        viewedAt: h.viewedAt || h.datasetId.createdAt,
      });
    }
    // 旧格式：直接是 Dataset 对象（populate后的结果）
    else if (h && h._id) {
      history.push({
        datasetId: String(h._id),
        datasetName: h.name,
        date: h.date,
        regionName: h.regionName,
        sensor: h.sensor,
        status: h.status,
        year: h.date ? new Date(h.date).getFullYear() : '',
        viewedAt: h.createdAt,
      });
    }
  }
  
  // 按浏览时间倒序排列
  history.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
  
  res.json({ history });
});

// 清空浏览记录
usersRouter.delete("/me/browse-history", requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { browseHistory: [] });
  res.json({ ok: true });
});

const roleSchema = z.object({ role: z.enum(["user", "admin"]) });

usersRouter.patch("/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid role" });

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: parsed.data.role },
    { new: true },
  ).select("_id username role");

  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: { id: String(user._id), username: user.username, role: user.role } });
});

// 删除用户（管理员操作，需提供管理员密码进行验证）
usersRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    // 防止自删
    if (id === req.user.id) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password is required" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

    await User.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Deletion failed" });
  }
});
