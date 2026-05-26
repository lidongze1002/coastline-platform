import jwt from "jsonwebtoken";

export function signJwt(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET env var");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyJwt(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET env var");
  return jwt.verify(token, secret);
}

