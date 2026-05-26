import express from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Observation } from "../models/Observation.js";
import { Station } from "../models/Station.js";

export const stationsRouter = express.Router();

stationsRouter.get("/", requireAuth, async (req, res) => {
  const schema = z.object({
    regionName: z.string().optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

  const q = {};
  if (parsed.data.regionName) q.regionName = parsed.data.regionName;

  const stations = await Station.find(q).select("_id name regionName location").sort({ createdAt: -1 });
  res.json({
    stations: stations.map((s) => ({
      id: String(s._id),
      name: s.name,
      regionName: s.regionName,
      location: s.location,
    })),
  });
});

stationsRouter.get("/:id/observations", requireAuth, async (req, res) => {
  const schema = z.object({
    limit: z.coerce.number().int().min(10).max(365).optional().default(60),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

  const station = await Station.findById(req.params.id).select("_id name regionName");
  if (!station) return res.status(404).json({ message: "Station not found" });

  const obs = await Observation.find({ stationId: station._id })
    .select("_id at sst salinity turbidity chlorophyll dissolvedOxygen")
    .sort({ at: -1 })
    .limit(parsed.data.limit);

  res.json({
    station: { id: String(station._id), name: station.name, regionName: station.regionName },
    observations: obs
      .map((o) => ({
        id: String(o._id),
        at: o.at,
        sst: o.sst,
        salinity: o.salinity,
        turbidity: o.turbidity,
        chlorophyll: o.chlorophyll,
        dissolvedOxygen: o.dissolvedOxygen,
      }))
      .reverse(),
  });
});

stationsRouter.get("/:id/realtime", requireAuth, async (req, res) => {
  const station = await Station.findById(req.params.id).select("_id name regionName");
  if (!station) return res.status(404).json({ message: "Station not found" });

  // Use the latest stored observation as a baseline, then add small time-dependent noise.
  const latest = await Observation.findOne({ stationId: station._id })
    .select("_id at sst salinity turbidity chlorophyll dissolvedOxygen")
    .sort({ at: -1 });

  const now = new Date();
  const t = now.getTime() / 1000;
  const baseSst = latest?.sst ?? 24;
  const baseSal = latest?.salinity ?? 31;
  const baseTur = latest?.turbidity ?? 3.5;
  const baseChl = latest?.chlorophyll ?? 2.4;
  const baseDo = latest?.dissolvedOxygen ?? 7.1;

  const sst = baseSst + Math.sin(t / 45) * 0.35 + (Math.random() - 0.5) * 0.15;
  const salinity = baseSal + Math.cos(t / 60) * 0.12 + (Math.random() - 0.5) * 0.06;
  const turbidity = baseTur + Math.sin(t / 30) * 0.25 + (Math.random() - 0.5) * 0.12;
  const chlorophyll = baseChl + Math.cos(t / 75) * 0.18 + (Math.random() - 0.5) * 0.08;
  const dissolvedOxygen = baseDo + Math.sin(t / 55) * 0.22 + (Math.random() - 0.5) * 0.1;

  res.json({
    station: { id: String(station._id), name: station.name, regionName: station.regionName },
    realtime: {
      at: now,
      sst: Number(sst.toFixed(2)),
      salinity: Number(salinity.toFixed(2)),
      turbidity: Number(turbidity.toFixed(2)),
      chlorophyll: Number(chlorophyll.toFixed(2)),
      dissolvedOxygen: Number(dissolvedOxygen.toFixed(2)),
      baselineAt: latest?.at ?? null,
    },
  });
});

