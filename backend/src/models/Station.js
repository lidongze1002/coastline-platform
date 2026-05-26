import mongoose from "mongoose";

const StationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    regionName: { type: String, required: true, index: true },
    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }, // [lon, lat]
    },
  },
  { timestamps: true },
);

StationSchema.index({ location: "2dsphere" });

export const Station = mongoose.model("Station", StationSchema);

