import mongoose from "mongoose";

export async function connectDb(mongoUri) {
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI env var");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
  // eslint-disable-next-line no-console
  console.log("[backend] connected to MongoDB");
}

