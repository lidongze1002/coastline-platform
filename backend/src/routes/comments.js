import express from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Comment } from "../models/Comment.js";
import { Dataset } from "../models/Dataset.js";

export const commentsRouter = express.Router();

commentsRouter.get("/dataset/:datasetId", requireAuth, async (req, res) => {
  const dataset = await Dataset.findById(req.params.datasetId).select("_id status");
  if (!dataset) return res.status(404).json({ message: "Dataset not found" });
  if (req.user.role !== "admin" && dataset.status !== "published") {
    return res.status(403).json({ message: "Forbidden" });
  }

  // 获取所有评论（包含回复）
  const allComments = await Comment.find({ datasetId: dataset._id })
    .select("_id userId username text createdAt parentId replyToUsername")
    .sort({ createdAt: -1 })
    .limit(500);

  // 分离主评论和回复
  const mainComments = allComments.filter(c => !c.parentId);
  const replies = allComments.filter(c => c.parentId);

  // 将回复附加到对应的主评论
  const result = mainComments.map(c => {
    const commentReplies = replies
      .filter(r => String(r.parentId) === String(c._id))
      .map(r => ({
        id: String(r._id),
        userId: String(r.userId),
        username: r.username,
        text: r.text,
        replyTo: r.replyToUsername,
        createdAt: r.createdAt,
      }));
    
    return {
      id: String(c._id),
      username: c.username,
      text: c.text,
      createdAt: c.createdAt,
      userId: c.userId,
      replies: commentReplies,
    };
  });

  res.json({ comments: result });
});

const createSchema = z.object({
  datasetId: z.string().min(1),
  text: z.string().min(1).max(500),
  replyToId: z.string().optional(),
});

commentsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const dataset = await Dataset.findById(parsed.data.datasetId).select("_id status");
  if (!dataset) return res.status(404).json({ message: "Dataset not found" });
  if (req.user.role !== "admin" && dataset.status !== "published") {
    return res.status(403).json({ message: "Forbidden" });
  }

  let parentId = null;
  let replyToUsername = null;

  // 如果是回复
  if (parsed.data.replyToId) {
    const parentComment = await Comment.findById(parsed.data.replyToId);
    if (parentComment) {
      parentId = parentComment._id;
      replyToUsername = parentComment.username;
    }
  }

  const c = await Comment.create({
    datasetId: dataset._id,
    userId: req.user.id,
    username: req.user.username,
    text: parsed.data.text,
    parentId,
    replyToUsername,
  });
  res.status(201).json({
    comment: { id: String(c._id), username: c.username, text: c.text, createdAt: c.createdAt },
  });
});

// 删除评论
commentsRouter.delete("/:id", requireAuth, async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  // 检查权限：评论作者或管理员可以删除
  const isOwner = String(comment.userId) === String(req.user.id);
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "无权限删除此评论" });
  }

  // 删除评论及其所有回复
  await Comment.deleteMany({
    $or: [
      { _id: comment._id },
      { parentId: comment._id }
    ]
  });

  res.json({ success: true });
});

