import mongoose from "mongoose";

const ObservationSchema = new mongoose.Schema(
  {
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true, index: true },
    at: { type: Date, required: true, index: true },
    sst: { type: Number, required: true }, // sea surface temperature
    salinity: { type: Number, required: true },
    turbidity: { type: Number, required: true },
    chlorophyll: { type: Number, required: true },
    dissolvedOxygen: { type: Number, required: true },
  },
  { timestamps: true },
);

ObservationSchema.index({ stationId: 1, at: -1 });

export const Observation = mongoose.model("Observation", ObservationSchema);

