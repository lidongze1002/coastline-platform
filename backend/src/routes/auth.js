import bcrypt from "bcrypt";
import express from "express";
import { z } from "zod";

import { signJwt } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const authRouter = express.Router();

const registerSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(72),
});

authRouter.post("/register", async (req, res) => {
  if (process.env.DISABLE_PUBLIC_REGISTER === "true") {
    return res.status(403).json({ message: "Public register disabled" });
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const { username, password } = parsed.data;
  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ message: "Username already exists" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ 
    username, 
    passwordHash, 
    role: "user",
  });
  res.status(201).json({ id: String(user._id), username: user.username, role: user.role });
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("[login] validation failed:", parsed.error);
    return res.status(400).json({ message: "Invalid input" });
  }

  const { username, password } = parsed.data;
  console.log("[login] attempt:", username);
  
  const user = await User.findOne({ username });
  if (!user) {
    console.log("[login] user not found:", username);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    console.log("[login] password mismatch for:", username);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  console.log("[login] success:", username, "role:", user.role);
  const token = signJwt({ sub: String(user._id), role: user.role });
  res.json({ 
    token, 
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

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

