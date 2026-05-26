import Router from "express";
import { Feedback } from "../models/Feedback.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// 用户提交反馈
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, content, email } = req.body;
    if (!title || !content || !email) {
      return res.status(400).json({ message: "请填写标题、内容和邮箱" });
    }

    const feedback = await Feedback.create({
      userId: req.user.id,
      username: req.user.username,
      email,
      title,
      content,
    });

    res.status(201).json({ message: "反馈已提交", feedback });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 用户获取自己的反馈列表
router.get("/my", requireAuth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ feedbacks });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 管理员获取所有反馈（待办列表）
router.get("/admin", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json({ feedbacks });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 管理员完成反馈
router.patch("/:id/complete", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { adminReply } = req.body;
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: "completed", adminReply: adminReply || "", completedAt: new Date() },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ message: "反馈不存在" });
    res.json({ message: "已完成", feedback });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 删除反馈
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: "已删除" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;