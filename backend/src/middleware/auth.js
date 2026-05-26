import { verifyJwt } from "../lib/jwt.js";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing token" });

    const decoded = verifyJwt(token);
    const user = await User.findById(decoded.sub).select("_id username role avatar gender school bio");
    if (!user) return res.status(401).json({ message: "Invalid token" });

    req.user = { 
      id: String(user._id), 
      username: user.username, 
      role: user.role,
      avatar: user.avatar,
      gender: user.gender,
      school: user.school,
      bio: user.bio,
    };
    next();
  } catch (_e) {
    res.status(401).json({ message: "Invalid token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

