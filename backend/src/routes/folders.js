import express from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Folder } from "../models/Folder.js";
import { Dataset } from "../models/Dataset.js";

export const foldersRouter = express.Router();

// 获取用户自己的文件夹列表
foldersRouter.get("/", requireAuth, async (req, res) => {
  const folders = await Folder.find({ 
    $or: [
      { owner: req.user.id },
      { isPublic: true }
    ]
  }).sort({ createdAt: -1 });
  
  res.json({
    folders: folders.map((f) => ({
      id: String(f._id),
      name: f.name,
      description: f.description,
      isPublic: f.isPublic,
      createdAt: f.createdAt,
    }))
  });
});

// 创建文件夹
foldersRouter.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(80),
    description: z.string().max(500).optional().default(""),
    isPublic: z.boolean().optional().default(false),
  });
  
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
  
  const folder = await Folder.create({
    name: parsed.data.name,
    description: parsed.data.description,
    isPublic: parsed.data.isPublic,
    owner: req.user.id,
  });
  
  res.status(201).json({ id: String(folder._id), name: folder.name });
});

// 更新文件夹
foldersRouter.patch("/:id", requireAuth, async (req, res) => {
  const folder = await Folder.findById(req.params.id);
  if (!folder) return res.status(404).json({ message: "Folder not found" });
  if (String(folder.owner) !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }
  
  const schema = z.object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().optional(),
  });
  
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
  
  if (parsed.data.name) folder.name = parsed.data.name;
  if (parsed.data.description !== undefined) folder.description = parsed.data.description;
  if (parsed.data.isPublic !== undefined) folder.isPublic = parsed.data.isPublic;
  
  await folder.save();
  res.json({ ok: true });
});

// 删除文件夹
foldersRouter.delete("/:id", requireAuth, async (req, res) => {
  const folder = await Folder.findById(req.params.id);
  if (!folder) return res.status(404).json({ message: "Folder not found" });
  if (String(folder.owner) !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }
  
  // 删除文件夹下面的数据集
  await Dataset.deleteMany({ folderId: folder._id });
  await folder.deleteOne();
  
  res.json({ ok: true });
});

// 获取文件夹下的数据集
foldersRouter.get("/:id/datasets", requireAuth, async (req, res) => {
  const folder = await Folder.findById(req.params.id);
  if (!folder) return res.status(404).json({ message: "Folder not found" });
  
  // 检查权限
  const isOwner = String(folder.owner) === req.user.id;
  if (!isOwner && !folder.isPublic) {
    return res.status(403).json({ message: "Not authorized" });
  }
  
  const datasets = await Dataset.find({ folderId: folder._id })
    .select("_id name groupName sensor date regionName status coastlineType coastlineSubtype createdAt")
    .sort({ date: -1 });
  
  res.json({
    datasets: datasets.map((d) => ({
      id: String(d._id),
      name: d.name,
      groupName: d.groupName,
      sensor: d.sensor,
      date: d.date,
      regionName: d.regionName,
      status: d.status,
      coastlineType: d.coastlineType,
      coastlineSubtype: d.coastlineSubtype,
    }))
  });
});