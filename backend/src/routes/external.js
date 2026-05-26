import express from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";

export const externalRouter = express.Router();

// ArcGIS Living Atlas / ArcGIS Online portal public search proxy
// Docs: https://developers.arcgis.com/rest/users-groups-and-items/search.htm
externalRouter.get("/arcgis-search", requireAuth, async (req, res) => {
  const schema = z.object({
    q: z.string().min(1).max(200),
    num: z.coerce.number().int().min(1).max(20).optional().default(10),
    start: z.coerce.number().int().min(1).max(200).optional().default(1),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

  const params = new URLSearchParams();
  params.set("f", "json");
  params.set("q", parsed.data.q);
  params.set("num", String(parsed.data.num));
  params.set("start", String(parsed.data.start));

  const url = `https://www.arcgis.com/sharing/rest/search?${params.toString()}`;
  const r = await fetch(url, { headers: { "User-Agent": "coastline-webgis/1.0" } });
  if (!r.ok) return res.status(502).json({ message: "Upstream error" });
  const data = await r.json();
  res.json({
    total: data.total,
    start: data.start,
    num: data.num,
    results: (data.results ?? []).map((it) => ({
      id: it.id,
      title: it.title,
      type: it.type,
      url: it.url,
      snippet: it.snippet,
      tags: it.tags,
      owner: it.owner,
      created: it.created,
      modified: it.modified,
      access: it.access,
    })),
  });
});

