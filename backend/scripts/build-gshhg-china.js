import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as shapefile from "shapefile";
import * as turf from "@turf/turf";

const GSHHG_ZIP_URL = "http://www.soest.hawaii.edu/pwessel/gshhg/gshhg-shp-2.3.7.zip";
const RES = process.env.GSHHG_RES ?? "h"; // c|l|i|h|f
const LEVEL = process.env.GSHHG_LEVEL ?? "L1"; // L1 is coastline

// Rough bbox for China's coastal area (WGS84 lon/lat)
// You can widen if you want more context.
const CHINA_COAST_BBOX = [104.0, 17.0, 125.5, 41.8]; // [minLon, minLat, maxLon, maxLat]

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const cacheDir = path.join(repoRoot, ".cache");
const outGeojsonPath = path.join(repoRoot, "data", `gshhg_china_coast_${RES}_${LEVEL}.geojson`);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function download(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

function bboxIntersects(a, b) {
  // a/b: [minX,minY,maxX,maxY]
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

function featureBbox(geom) {
  const bb = turf.bbox({ type: "Feature", properties: {}, geometry: geom });
  return bb; // [minX,minY,maxX,maxY]
}

function polygonToLines(geom) {
  // Return array of LineString coords arrays (each: [[lon,lat],...])
  const lines = [];
  if (!geom) return lines;
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates ?? []) {
      if (Array.isArray(ring) && ring.length >= 2) lines.push(ring);
    }
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates ?? []) {
      for (const ring of poly ?? []) {
        if (Array.isArray(ring) && ring.length >= 2) lines.push(ring);
      }
    }
  }
  return lines;
}

function simplifyLineCoords(coords, toleranceDeg = 0.0002) {
  // Use turf.simplify on a LineString
  try {
    const ls = turf.lineString(coords);
    const s = turf.simplify(ls, { tolerance: toleranceDeg, highQuality: false });
    return s.geometry.coordinates ?? coords;
  } catch {
    return coords;
  }
}

async function main() {
  ensureDir(cacheDir);

  const zipPath = path.join(cacheDir, "gshhg-shp-2.3.7.zip");
  if (!fs.existsSync(zipPath)) {
    // eslint-disable-next-line no-console
    console.log(`[gshhg] downloading ${GSHHG_ZIP_URL}`);
    await download(GSHHG_ZIP_URL, zipPath);
  }

  const extractDir = path.join(cacheDir, "gshhg-shp-2.3.7");
  const shpRel = path.join("GSHHS_shp", RES, `GSHHS_${RES}_${LEVEL}`);
  const shpPath = path.join(extractDir, `${shpRel}.shp`);
  const dbfPath = path.join(extractDir, `${shpRel}.dbf`);

  if (!fs.existsSync(shpPath) || !fs.existsSync(dbfPath)) {
    // eslint-disable-next-line no-console
    console.log(`[gshhg] extracting zip to ${extractDir}`);
    ensureDir(extractDir);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractDir, true);
  }

  if (!fs.existsSync(shpPath) || !fs.existsSync(dbfPath)) {
    throw new Error(`Missing shapefile after extract: ${shpPath}`);
  }

  // eslint-disable-next-line no-console
  console.log(`[gshhg] reading ${shpRel} ...`);

  const chinaBbox = CHINA_COAST_BBOX;
  const lineParts = [];
  let kept = 0;
  let scanned = 0;

  const source = await shapefile.open(shpPath, dbfPath, { encoding: "utf-8" });
  while (true) {
    const r = await source.read();
    if (r.done) break;
    scanned += 1;
    const geom = r.value?.geometry;
    if (!geom) continue;

    // fast bbox filter
    const bb = featureBbox(geom);
    if (!bboxIntersects(bb, chinaBbox)) continue;

    const rings = polygonToLines(geom);
    if (rings.length === 0) continue;

    for (const ring of rings) {
      // ring is already closed; simplify to keep file small
      const simp = simplifyLineCoords(ring, 0.0002);
      if (simp.length < 2) continue;
      // bbox check again for ring-level
      const ringBb = turf.bbox(turf.lineString(simp));
      if (!bboxIntersects(ringBb, chinaBbox)) continue;
      lineParts.push(simp);
    }
    kept += 1;
  }

  // Build a single MultiLineString feature to satisfy backend feature-count limit
  const fc = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          source: `GSHHG 2.3.7 (${RES} ${LEVEL})`,
          bbox: chinaBbox,
          scanned,
          kept,
        },
        geometry: {
          type: "MultiLineString",
          coordinates: lineParts,
        },
      },
    ],
  };

  ensureDir(path.dirname(outGeojsonPath));
  fs.writeFileSync(outGeojsonPath, JSON.stringify(fc));
  // eslint-disable-next-line no-console
  console.log(`[gshhg] wrote ${outGeojsonPath} (parts=${lineParts.length}, scanned=${scanned}, kept=${kept})`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

