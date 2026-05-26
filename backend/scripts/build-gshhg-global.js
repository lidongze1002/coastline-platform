import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as shapefile from "shapefile";
import * as turf from "@turf/turf";

const RES = process.env.GSHHG_RES ?? "l"; // c|l|i|h|f
const LEVEL = process.env.GSHHG_LEVEL ?? "L1";
const SIMPLIFY_TOL = Number(process.env.GSHHG_SIMPLIFY_TOL ?? "0.02");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const shpRoot = path.join(repoRoot, ".cache", "gshhg-shp-2.3.7", "GSHHS_shp", RES);
const shpPath = path.join(shpRoot, `GSHHS_${RES}_${LEVEL}.shp`);
const dbfPath = path.join(shpRoot, `GSHHS_${RES}_${LEVEL}.dbf`);
const outPath = path.join(repoRoot, "data", `global_gshhg_${RES}_${LEVEL}.geojson`);

function polygonToLines(geom) {
  const lines = [];
  if (!geom) return lines;
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates ?? []) {
      if (Array.isArray(ring) && ring.length >= 2) lines.push(ring);
    }
    return lines;
  }
  if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates ?? []) {
      for (const ring of poly ?? []) {
        if (Array.isArray(ring) && ring.length >= 2) lines.push(ring);
      }
    }
  }
  return lines;
}

function simplify(coords) {
  try {
    const ls = turf.lineString(coords);
    return turf.simplify(ls, { tolerance: SIMPLIFY_TOL, highQuality: false }).geometry.coordinates ?? coords;
  } catch {
    return coords;
  }
}

async function main() {
  if (!fs.existsSync(shpPath) || !fs.existsSync(dbfPath)) {
    throw new Error(`Missing shapefile: ${shpPath}`);
  }
  const source = await shapefile.open(shpPath, dbfPath, { encoding: "utf-8" });
  const lineParts = [];
  let scanned = 0;
  while (true) {
    const r = await source.read();
    if (r.done) break;
    scanned += 1;
    const geom = r.value?.geometry;
    if (!geom) continue;
    for (const ring of polygonToLines(geom)) {
      const simp = simplify(ring);
      if (simp.length >= 2) lineParts.push(simp);
    }
  }

  const fc = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { source: `GSHHG 2.3.7 (${RES} ${LEVEL})`, simplifyTolerance: SIMPLIFY_TOL, scanned },
        geometry: { type: "MultiLineString", coordinates: lineParts },
      },
    ],
  };
  fs.writeFileSync(outPath, JSON.stringify(fc));
  // eslint-disable-next-line no-console
  console.log(`[gshhg-global] wrote ${outPath}, lines=${lineParts.length}, scanned=${scanned}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
