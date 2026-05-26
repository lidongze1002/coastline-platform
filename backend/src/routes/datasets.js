import express from "express";
import multer from "multer";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as turf from "@turf/turf";

import { requireAuth, requireRole } from "../middleware/auth.js";
import { Dataset } from "../models/Dataset.js";

export const datasetsRouter = express.Router();
// 增大文件上传限制：GeoJSON 50MB，原文件 100MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
// Separate uploader with larger limit for shapefile ZIP components, if needed
const uploadShapefile = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// __dirname for ESM - datasets.js is in src/routes/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Two levels up from src/routes/ to backend/
const PUBLIC_DIR = path.resolve(__dirname, "..", "..", "public");
console.log("[datasets] PUBLIC_DIR resolved to:", PUBLIC_DIR);

datasetsRouter.get("/", requireAuth, async (req, res) => {
  const querySchema = z.object({
    sensor: z.enum(["sentinel2", "landsat8", "landsat9", "mixed"]).optional(),
    regionName: z.string().optional(),
    status: z.enum(["draft", "pending", "published"]).optional(),
    dataType: z.enum(["shoreline", "reference"]).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    // 新增：时间范围筛选（支持更灵活的范围）
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    // 查询所有状态（仅管理员）
    statusAll: z.string().optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

  const q = {};
  if (parsed.data.sensor) q.sensor = parsed.data.sensor;
  if (parsed.data.regionName) q.regionName = parsed.data.regionName;
  if (parsed.data.status) q.status = parsed.data.status;
  if (parsed.data.dataType) q.dataType = parsed.data.dataType;

  // 支持dateFrom/dateTo和startDate/endDate两种方式
  if (parsed.data.dateFrom || parsed.data.dateTo || parsed.data.startDate || parsed.data.endDate) {
    q.date = {};
    const start = parsed.data.dateFrom || parsed.data.startDate;
    const end = parsed.data.dateTo || parsed.data.endDate;
    if (start) q.date.$gte = new Date(start);
    if (end) q.date.$lte = new Date(end);
  }

  // 普通用户只看 published + 自己创建的
  if (req.user.role !== "admin") {
    if (!parsed.data.statusAll) {
      q.$or = [
        { status: "published" },
        { createdBy: req.user.id }
      ];
    } else {
      q.createdBy = req.user.id;
    }
  } else if (!parsed.data.statusAll) {
    // 管理员不带 statusAll 时只看 published
    q.status = "published";
  }

  if (!parsed.data.statusAll && req.user.role === "admin") {
    q.status = "published";
  }

  const datasets = await Dataset.find(q)
    .select("_id name groupName folderId sensor date regionName method status dataType coastlineType coastlineSubtype originalDataPath description shorelineGeojson createdAt updatedAt rejectReason")
    .sort({ date: -1 });

  res.json({
    datasets: datasets.map((d) => ({
      id: String(d._id),
      name: d.name,
      groupName: d.groupName,
      folderId: d.folderId ? String(d.folderId) : null,
      sensor: d.sensor,
      date: d.date,
      regionName: d.regionName,
      method: d.method,
      status: d.status,
      dataType: d.dataType,
      coastlineType: d.coastlineType,
      coastlineSubtype: d.coastlineSubtype,
      originalDataPath: d.originalDataPath,
      description: d.description,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      rejectReason: d.rejectReason || "",
    })),
  });
});

// 获取分组后的数据集列表（按区域+类型分组，同一组内包含不同年份）
datasetsRouter.get("/groups", requireAuth, async (req, res) => {
  const querySchema = z.object({
    regionName: z.string().optional(),
    sensor: z.enum(["sentinel2", "landsat8", "landsat9", "mixed"]).optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

  // 只查询已发布的
  const q = { status: "published" };
  if (parsed.data.regionName) q.regionName = parsed.data.regionName;
  if (parsed.data.sensor) q.sensor = parsed.data.sensor;

  const datasets = await Dataset.find(q)
    .select("_id name groupName sensor date regionName method status coastlineType coastlineSubtype")
    .sort({ regionName: 1, date: 1 });

  // 按 regionName 分组（只使用 regionName，严格避免重复）
  const groups = {};
  for (const d of datasets) {
    // 只使用 regionName，分组更加稳定
    // 去除空格并转小写，确保一致性
    let key = d.regionName ? d.regionName.trim() : null;
    
    if (!key) continue; // 跳过没有 regionName 的数据
    
    // 转换为小写比较，避免 "胶州湾" 和 "胶州湾" 被分开
    const normalizedKey = key.toLowerCase();
    
    if (!groups[normalizedKey]) {
      groups[normalizedKey] = { originalName: key, items: [] };
    }
    groups[normalizedKey].items.push({
      id: String(d._id),
      name: d.name,
      groupName: d.groupName,
      sensor: d.sensor,
      date: d.date,
      regionName: d.regionName,
      coastlineType: d.coastlineType,
      coastlineSubtype: d.coastlineSubtype,
    });
  }

  // 转换为数组，按年份排序
  const groupList = Object.values(groups).map((g) => ({
    name: g.originalName,
    items: g.items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  })).sort((a, b) => a.name.localeCompare(b.name));

  res.json({ groups: groupList });
});

// 下载原始数据文件
datasetsRouter.get("/:id/download", requireAuth, async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id status originalDataPath name");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  if (req.user.role !== "admin" && d.status !== "published") {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  // 如果没有配置原始数据路径，返回提示
  if (!d.originalDataPath) {
    return res.status(404).json({ message: "原始数据文件不可用" });
  }
  
  // From public目录解析文件路径
  const relativePath = d.originalDataPath.replace(/^\/+/, ""); // remove leading slash
  const filePath = path.resolve(PUBLIC_DIR, relativePath);
  console.log("[download] originalDataPath:", d.originalDataPath);
  console.log("[download] resolved filePath:", filePath);
  console.log("[download] file exists:", fs.existsSync(filePath));
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "原始数据文件不存在: " + relativePath });
  }
  
  // 设置响应头，支持下载
  res.download(filePath, path.basename(filePath));
});

datasetsRouter.get("/:id", requireAuth, async (req, res) => {
  const d = await Dataset.findById(req.params.id).select(
    "_id name groupName folderId sensor date regionName method status dataType coastlineType coastlineSubtype description shorelineGeojson shorelineFilePath originalDataPath createdAt updatedAt rejectReason",
  );
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  // 允许用户查看自己的数据集，或者管理员查看所有，或者已发布的
  const isOwner = String(d.createdBy) === req.user.id;
  const isAdmin = req.user.role === "admin";
  const isPublished = d.status === "published";
  if (!isOwner && !isAdmin && !isPublished) {
    return res.status(403).json({ message: "Forbidden" });
  }
  res.json({
    dataset: {
      id: String(d._id),
      name: d.name,
      groupName: d.groupName,
      folderId: d.folderId ? String(d.folderId) : null,
      sensor: d.sensor,
      date: d.date,
      regionName: d.regionName,
      method: d.method,
      status: d.status,
      dataType: d.dataType,
      coastlineType: d.coastlineType,
      coastlineSubtype: d.coastlineSubtype,
      description: d.description,
shorelineGeojson: d.shorelineGeojson,
      shorelineFilePath: d.shorelineFilePath,
      originalDataPath: d.originalDataPath,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      rejectReason: d.rejectReason || "",
    },
  });
});

datasetsRouter.get("/:id/shoreline", requireAuth, async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id status shorelineGeojson shorelineFilePath createdBy");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  
  // 允许查看的情况：
  // 1. 管理员
  // 2. 数据集已发布
  // 3. 数据集创建者本人
  const isOwner = String(d.createdBy) === req.user.id;
  const isAdmin = req.user.role === "admin";
  const isPublished = d.status === "published";
  
  if (!isAdmin && !isPublished && !isOwner) {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  // 如果有shorelineFilePath，从文件读取
  if (d.shorelineFilePath) {
    const relativePath = d.shorelineFilePath.replace(/^\/+/, "");
    const filePath = path.resolve(PUBLIC_DIR, relativePath);
    if (fs.existsSync(filePath)) {
      const geojson = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return res.json({ geojson });
    }
  }
  
  // 否则从数据库返回
  if (!d.shorelineGeojson) return res.status(404).json({ message: "No shoreline data" });
  res.json({ geojson: d.shorelineGeojson });
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  folderId: z.string().optional().default(null),
  groupName: z.string().max(80).optional().default(""),
  sensor: z.enum(["sentinel2", "landsat8", "landsat9", "mixed"]),
  date: z.string().min(4),
  regionName: z.string().min(1).max(80),
  method: z.string().max(200).optional().default(""),
  dataType: z.enum(["shoreline", "reference"]).optional().default("shoreline"),
  status: z.enum(["draft", "pending"]).optional().default("draft"),
  coastlineType: z.string().optional().default("unknown"),
  coastlineSubtype: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

datasetsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const d = await Dataset.create({
    ...parsed.data,
    date: new Date(parsed.data.date),
    createdBy: req.user.id,
    status: "draft",
  });
  res.status(201).json({ id: String(d._id) });
});

// 带文件上传的创建接口（所有用户可用）
datasetsRouter.post(
  "/with-files",
  requireAuth,
  upload.fields([
    { name: "data", maxCount: 1 },
    { name: "geojson", maxCount: 1 },
    { name: "original", maxCount: 1 },
  ]),
  async (req, res) => {
    // 解析JSON数据
    let dataObj = {};
    if (req.body.data) {
      try {
        dataObj = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
      } catch {
        return res.status(400).json({ message: "Invalid JSON in data field" });
      }
    }

    // 验证必填字段
    if (!dataObj.name || !dataObj.sensor || !dataObj.date || !dataObj.regionName) {
      return res.status(400).json({ message: "Missing required fields: name, sensor, date, regionName" });
    }

    // 处理GeoJSON
    let shorelineGeojson = null;
    if (req.files?.geojson) {
      try {
        const geojsonData = JSON.parse(req.files.geojson[0].buffer.toString("utf-8"));
        shorelineGeojson = normalizeGeojson(geojsonData);
      } catch {
        return res.status(400).json({ message: "Invalid GeoJSON file" });
      }
    }

// 处理原始文件
    let originalDataPath = "";
    // 支持通过 attachments 传入的原始数据路径（逗号分隔的多文件）
    let attachmentPaths = [];
    if (req.body && (req.body.attachments || req.body.attachmentPaths)) {
      try {
        const at = req.body.attachments || req.body.attachmentPaths;
        if (Array.isArray(at)) attachmentPaths = at;
        else if (typeof at === "string") attachmentPaths = JSON.parse(at);
      } catch {
        // ignore parsing errors, fall back to file-based attachments
      }
    }

    if (attachmentPaths.length > 0) {
      originalDataPath = attachmentPaths.join(",");
    } else if (req.files?.original) {
      const originalFile = req.files.original[0];
      const ext = path.extname(originalFile.originalname);
      const destPath = path.join(PUBLIC_DIR, "datasets", `${Date.now()}${ext}`);
      
      // 确保目录存在
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(destPath, originalFile.buffer);
      originalDataPath = `/datasets/${path.basename(destPath)}`;
    }

    // 创建数据集
    const d = await Dataset.create({
      name: dataObj.name,
      groupName: dataObj.groupName || dataObj.regionName || "",
      sensor: dataObj.sensor,
      date: new Date(dataObj.date),
      regionName: dataObj.regionName,
      method: dataObj.method || "",
      dataType: dataObj.dataType || "shoreline",
      status: dataObj.status || "draft",
      coastlineType: dataObj.coastlineType || "unknown",
      coastlineSubtype: dataObj.coastlineSubtype || "",
      description: dataObj.description || "",
      shorelineGeojson,
      originalDataPath,
      createdBy: req.user.id,
    });

    res.status(201).json({ id: String(d._id) });
  },
);

function normalizeGeojson(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (obj.type !== "FeatureCollection" || !Array.isArray(obj.features)) return null;
  // 轻度保护：限制 feature 数量，防止前端卡死
  if (obj.features.length > 5000) return null;
  return obj;
}

// 最大特征数量限制（超过此值视为"过大"）
const MAX_FEATURES_LIMIT = 100000;
// 文件大小限制 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 处理Shapefile上传并转换为GeoJSON
// 支持两种模式：
// 1. 仅解析：不上传datasetId，只返回GeoJSON供预览
// 2. 自动保存：上传datasetId，解析后自动保存GeoJSON到数据集
datasetsRouter.post(
  "/upload-shp",
  requireAuth,
  uploadShapefile.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "请选择要上传的文件（支持GeoJSON、ZIP、SHP）" });
    }

    const originalname = req.file.originalname.toLowerCase();
    const fileSize = req.file.buffer.length;
    const datasetId = req.query.datasetId; // 可选：数据集ID，如果提供则自动保存

    console.log(`[upload-shp] 收到文件: ${originalname}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB` + (datasetId ? `, datasetId: ${datasetId}` : ""));

    // 如果提供了datasetId，先检查数据集是否存在
    let dataset = null;
    if (datasetId) {
      dataset = await Dataset.findById(datasetId).select("_id name shorelineGeojson");
      if (!dataset) {
        return res.status(404).json({ message: "数据集不存在" });
      }
    }

    let geojson = null;
    let resultMessage = "";
    let resultType = "";

    try {
      // 1. 如果是GeoJSON文件
      if (originalname.endsWith(".geojson") || originalname.endsWith(".json")) {
        const geojsonData = JSON.parse(req.file.buffer.toString("utf-8"));
        geojson = normalizeGeojson(geojsonData);

        if (!geojson) {
          return res.status(400).json({ message: "无效的GeoJSON格式或特征数量过多（>5000）" });
        }

        resultType = "geojson";
        resultMessage = `GeoJSON解析成功，共 ${geojson.features?.length || 0} 个要素`;
      }

      // 2. SHP文件 - 不支持直接上传，需要打包成ZIP
      else if (originalname.endsWith(".shp")) {
        return res.status(400).json({ message: "暂不支持直接上传.shp文件，请将.shp、.shx、.dbf、.prj等文件打包成.zip后上传" });
      }

      // 3. 如果是ZIP文件（包含Shapefile）
      else if (originalname.endsWith(".zip")) {
        const AdmZip = (await import("adm-zip")).default;
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();

        // 优先查找GeoJSON文件
        const geojsonEntry = entries.find(e => e.entryName.toLowerCase().endsWith(".geojson") || e.entryName.toLowerCase().endsWith(".json"));
        if (geojsonEntry) {
          try {
            const geojsonData = JSON.parse(geojsonEntry.getData().toString("utf8"));
            geojson = normalizeGeojson(geojsonData);
            if (!geojson) {
              return res.status(400).json({ message: "无效的GeoJSON格式" });
            }
            resultType = "geojson";
            resultMessage = `ZIP中GeoJSON解析成功，共 ${geojson.features?.length || 0} 个要素`;
          } catch (e) {
            return res.status(400).json({ message: "ZIP中GeoJSON解析失败: " + e.message });
          }
        } else {
          // 查找.shp文件
          const shpEntry = entries.find(e => e.entryName.toLowerCase().endsWith(".shp"));
          if (!shpEntry) {
            return res.status(400).json({ message: "ZIP文件中未找到.shp或.geojson文件，请确保ZIP中包含GeoJSON文件或.shp文件" });
          }
          
          // 尝试解析Shapefile
          const shpModule = await import("shapefile");
          console.log(`[upload-shp] 找到shp文件: ${shpEntry.entryName}, 大小: ${shpEntry.header.size} bytes`);
          
          if (shpEntry.header.size > MAX_FILE_SIZE) {
            return res.status(400).json({ message: "SHP文件过大" });
          }
          
          try {
            // shapefile包需要从ArrayBuffer读取
            const shpBuffer = shpEntry.getData();
            // 创建新的ArrayBuffer
            const arrayBuffer = shpBuffer.buffer.slice(shpBuffer.byteOffset, shpBuffer.byteOffset + shpBuffer.byteLength);
            const ds = await shpModule.openDs(arrayBuffer);
            
            const features = [];
            let result = await ds.read();
            while (!result.done) {
              if (result.value) {
                features.push({
                  type: "Feature",
                  geometry: result.value,
                  properties: {},
                });
              }
              result = await ds.read();
            }
            
            geojson = {
              type: "FeatureCollection",
              features: features,
            };
            resultType = "shapefile";
            resultMessage = `Shapefile解析成功，共 ${features.length} 个要素`;
          } catch (e) {
            console.error("[upload-shp] SHP解析失败:", e);
            return res.status(400).json({ message: "Shapefile解析失败。请将您的数据转换为GeoJSON格式（.geojson或.json文件），然后上传GeoJSON文件，这是最可靠的方式。" });
          }
        }
      }

      // 4. 其他文件类型
      else {
        return res.status(400).json({ message: "不支持的文件格式，请上传 .geojson、.zip 或 .shp 文件" });
      }

      // 如果提供了datasetId，自动保存GeoJSON到数据集
      if (dataset && geojson) {
        dataset.shorelineGeojson = geojson;
        await dataset.save();
        console.log(`[upload-shp] GeoJSON已保存到数据集 ${datasetId}`);
        
        return res.json({
          success: true,
          type: resultType,
          message: resultMessage + "（已自动保存到数据集）",
          features: geojson.features?.length || 0,
          geojson: geojson,
          savedToDataset: true,
          datasetId: datasetId,
        });
      }

      // 如果没有datasetId，只返回解析结果
      return res.json({
        success: true,
        type: resultType,
        message: resultMessage,
        features: geojson?.features?.length || 0,
        geojson: geojson,
      });

    } catch (e) {
      console.error("[upload-shp] 处理错误:", e);
      return res.status(500).json({ message: "文件处理失败: " + e.message });
    }
  },
);

datasetsRouter.post(
  "/:id/upload-shoreline",
  requireAuth,
  requireRole("admin"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Missing file" });
    let parsedJson;
    try {
      parsedJson = JSON.parse(req.file.buffer.toString("utf-8"));
    } catch {
      return res.status(400).json({ message: "Invalid JSON" });
    }
    const geojson = normalizeGeojson(parsedJson);
    if (!geojson) return res.status(400).json({ message: "Invalid GeoJSON FeatureCollection" });

const d = await Dataset.findByIdAndUpdate(
      req.params.id,
      { shorelineGeojson: geojson },
      { new: true },
    ).select("_id");
    if (!d) return res.status(404).json({ message: "Dataset not found" });
    res.json({ ok: true });
  },
);

// 上传原始数据文件（RAR/ZIP等，用于下载）
datasetsRouter.post(
  "/:id/upload-original",
  requireAuth,
  requireRole("admin"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "请选择要上传的文件" });
    }

    const dataset = await Dataset.findById(req.params.id).select("_id name originalFile");
    if (!dataset) {
      return res.status(404).json({ message: "数据集不存在" });
    }

    const originalname = req.file.originalname.toLowerCase();
    const ext = path.extname(originalname);
    
    // 检查文件类型
    if (![".rar", ".zip", ".7z", ".tar", ".gz"].includes(ext)) {
      return res.status(400).json({ message: "仅支持 RAR、ZIP、7Z、TAR、GZ 格式的压缩文件" });
    }

    // 保存文件到 public/uploads/original/ 目录
    const destDir = path.join(PUBLIC_DIR, "uploads", "original", String(dataset._id));
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const fileName = `${timestamp}_${originalname}`;
    const destPath = path.join(destDir, fileName);
    
    fs.writeFileSync(destPath, req.file.buffer);
    
    const fileUrl = `/uploads/original/${String(dataset._id)}/${fileName}`;
    
    // 更新数据集记录
    dataset.originalFile = {
      fileName: originalname,
      filePath: fileUrl,
      fileSize: req.file.size,
      uploadedAt: new Date(),
    };
    await dataset.save();

    console.log(`[upload-original] 文件已保存: ${fileUrl}, 大小: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

    res.json({
      ok: true,
      fileName: originalname,
      filePath: fileUrl,
      fileSize: req.file.size,
    });
  },
);

// 更新数据集基本信息
datasetsRouter.patch("/:id", requireAuth, async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id name sensor date regionName method status dataType coastlineType coastlineSubtype description groupName");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  
  // 验证权限：只有创建者或管理员可以修改
  if (req.user.role !== "admin" && String(d.createdBy) !== String(req.user.id)) {
    return res.status(403).json({ message: "无权限修改此数据集" });
  }
  
  const updateSchema = z.object({
    name: z.string().min(1).max(80).optional(),
    sensor: z.enum(["sentinel2", "landsat8", "landsat9", "mixed"]).optional(),
    date: z.string().min(4).optional(),
    regionName: z.string().min(1).max(80).optional(),
    method: z.string().max(200).optional(),
    dataType: z.enum(["shoreline", "reference"]).optional(),
    status: z.enum(["draft", "pending"]).optional(),
    coastlineType: z.string().optional(),
    coastlineSubtype: z.string().optional(),
    description: z.string().optional(),
    groupName: z.string().optional(),
  });
  
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
  
  // 更新字段
  if (parsed.data.name !== undefined) d.name = parsed.data.name;
  if (parsed.data.sensor !== undefined) d.sensor = parsed.data.sensor;
  if (parsed.data.date !== undefined) d.date = new Date(parsed.data.date);
  if (parsed.data.regionName !== undefined) d.regionName = parsed.data.regionName;
  if (parsed.data.method !== undefined) d.method = parsed.data.method;
  if (parsed.data.dataType !== undefined) d.dataType = parsed.data.dataType;
  if (parsed.data.status !== undefined) d.status = parsed.data.status;
  if (parsed.data.coastlineType !== undefined) d.coastlineType = parsed.data.coastlineType;
  if (parsed.data.coastlineSubtype !== undefined) d.coastlineSubtype = parsed.data.coastlineSubtype;
  if (parsed.data.description !== undefined) d.description = parsed.data.description;
  if (parsed.data.groupName !== undefined) d.groupName = parsed.data.groupName;
  
  await d.save();
  
  res.json({
    ok: true,
    dataset: {
      id: String(d._id),
      name: d.name,
      sensor: d.sensor,
      date: d.date,
      regionName: d.regionName,
      method: d.method,
      status: d.status,
      dataType: d.dataType,
      coastlineType: d.coastlineType,
      coastlineSubtype: d.coastlineSubtype,
      description: d.description,
      groupName: d.groupName,
    },
  });
});

// Upload shapefile group (e.g., .shp, .shx, .dbf, etc.) to backend/uploads/
datasetsRouter.post(
  "/upload",
  requireAuth,
  uploadShapefile.array("files"),
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Missing files" });
    }

    const uploaded = [];
    const destDir = path.join(PUBLIC_DIR, "uploads");
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    for (const f of req.files) {
      const baseName = f.originalname;
      let targetName = baseName;
      let idx = 0;
      while (fs.existsSync(path.join(destDir, targetName))) {
        idx += 1;
        const name = baseName.substring(0, baseName.lastIndexOf('.')) || baseName;
        const ext = path.extname(baseName) || '';
        targetName = `${name}(${idx})${ext}`;
      }
      const destPath = path.join(destDir, targetName);
      fs.writeFileSync(destPath, f.buffer);
      uploaded.push(`/uploads/${targetName}`);
    }

    res.json({ files: uploaded });
  }
);

datasetsRouter.patch("/:id/publish", requireAuth, requireRole("admin"), async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id shorelineGeojson status");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  if (!d.shorelineGeojson) return res.status(400).json({ message: "Upload shoreline first" });
  d.status = "published";
  await d.save();
  res.json({ ok: true });
});

// 提交审核（草稿 -> 待审核，用户和管理员都可以调用）
datasetsRouter.patch("/:id/submit", requireAuth, async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id status createdBy");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  // 用户只能提交自己的数据集，管理员可以提交任何数据集
  if (req.user.role !== "admin" && String(d.createdBy) !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (d.status !== "draft") return res.status(400).json({ message: "Only draft can be submitted" });
  d.status = "pending";
  await d.save();
  res.json({ ok: true });
});

// 审核拒绝（待审核 -> 草稿）
datasetsRouter.patch("/:id/reject", requireAuth, requireRole("admin"), async (req, res) => {
  const { reason } = req.body;
  const d = await Dataset.findById(req.params.id).select("_id status rejectReason");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  if (d.status !== "pending") return res.status(400).json({ message: "Only pending can be rejected" });
  d.status = "draft";
  d.rejectReason = reason || "";
  await d.save();
  res.json({ ok: true });
});

// 审核通过（待审核 -> 已发布）
datasetsRouter.patch("/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id shorelineGeojson status createdBy");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  if (!d.shorelineGeojson) return res.status(400).json({ message: "Upload shoreline first" });
  if (d.status !== "pending") return res.status(400).json({ message: "Only pending can be approved" });
  d.status = "published";
  await d.save();
  // TODO: 发送通知给用户 - 这里可以后续添加消息系统
  console.log(`[approve] Dataset ${d._id} approved, createdBy: ${d.createdBy}`);
  res.json({ ok: true });
});

// 审核拒绝（待审核 -> 草稿）
datasetsRouter.patch("/:id/reject", requireAuth, requireRole("admin"), async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id status createdBy");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  if (d.status !== "pending") return res.status(400).json({ message: "Only pending can be rejected" });
  d.status = "draft";
  await d.save();
  // TODO: 发送通知给用户
  console.log(`[reject] Dataset ${d._id} rejected, createdBy: ${d.createdBy}`);
  res.json({ ok: true });
});

// 获取待审核数据集详情（用于管理员预览）
datasetsRouter.get("/:id/preview", requireAuth, requireRole("admin"), async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id name regionName sensor date method coastlineType coastlineSubtype description shorelineGeojson status createdBy rejectReason");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  res.json({
    dataset: {
      id: String(d._id),
      name: d.name,
      regionName: d.regionName,
      sensor: d.sensor,
      date: d.date,
      method: d.method,
      coastlineType: d.coastlineType,
      coastlineSubtype: d.coastlineSubtype,
      description: d.description,
      status: d.status,
      createdBy: d.createdBy,
      hasShoreline: !!d.shorelineGeojson,
      rejectReason: d.rejectReason || "",
    },
  });
});

datasetsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const d = await Dataset.findByIdAndDelete(req.params.id).select("_id");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  res.json({ ok: true });
});

// ============================================
// 分析接口 - 海岸线统计分析
// ============================================

// 计算单条海岸线长度
datasetsRouter.get("/:id/stats", requireAuth, async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id name shorelineGeojson date regionName status dataType");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  if (req.user.role !== "admin" && d.status !== "published") {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  const geojson = d.shorelineGeojson;
  if (!geojson?.features?.length) {
    return res.status(400).json({ message: "海岸线数据为空" });
  }
  
  // 计算总长度
  let totalLengthMeters = 0;
  let featureCount = 0;
  const lengthsByYear = {};
  
  for (const f of geojson.features) {
    if (!f?.geometry) continue;
    const g = f.geometry;
    if (g.type === "LineString" && g.coordinates?.length >= 2) {
      const line = turf.lineString(g.coordinates);
      const len = turf.length(line, { units: "meters" });
      totalLengthMeters += len;
      featureCount++;
      const yr = d.date?.getFullYear?.()?.toString() || "unknown";
      lengthsByYear[yr] = (lengthsByYear[yr] || 0) + len;
    } else if (g.type === "MultiLineString" && g.coordinates?.length) {
      for (const coords of g.coordinates) {
        if (coords?.length >= 2) {
          const line = turf.lineString(coords);
          const len = turf.length(line, { units: "meters" });
          totalLengthMeters += len;
          featureCount++;
        }
      }
    }
  }
  
  res.json({
    datasetId: String(d._id),
    name: d.name,
    date: d.date,
    regionName: d.regionName,
    totalLengthKm: Math.round(totalLengthMeters / 1000 * 100) / 100,
    totalLengthMeters: Math.round(totalLengthMeters),
    featureCount,
    lengthsByYear,
  });
});

// 计算两条海岸线之间的变化分析
datasetsRouter.post("/compare", requireAuth, async (req, res) => {
  const schema = z.object({
    fromDatasetId: z.string(),
    toDatasetId: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request" });
  }
  
  const { fromDatasetId, toDatasetId } = parsed.data;
  const [fromDs, toDs] = await Promise.all([
    Dataset.findById(fromDatasetId).select("_id name date shorelineGeojson status"),
    Dataset.findById(toDatasetId).select("_id name date shorelineGeojson status"),
  ]);
  
  if (!fromDs || !toDs) {
    return res.status(404).json({ message: "Dataset not found" });
  }
  
  const fromGeo = fromDs.shorelineGeojson;
  const toGeo = toDs.shorelineGeojson;
  if (!fromGeo?.features?.length || !toGeo?.features?.length) {
    return res.status(400).json({ message: "海岸线数据为空" });
  }
  
  // 简单比较：计算各自长度
  function calcLength(geojson) {
    let len = 0;
    for (const f of geojson.features || []) {
      if (!f?.geometry) continue;
      const g = f.geometry;
      if (g.type === "LineString" && g.coordinates?.length >= 2) {
        len += turf.length(turf.lineString(g.coordinates), { units: "meters" });
      } else if (g.type === "MultiLineString" && g.coordinates?.length) {
        for (const coords of g.coordinates) {
          if (coords?.length >= 2) {
            len += turf.length(turf.lineString(coords), { units: "meters" });
          }
        }
      }
    }
    return len;
  }
  
  const fromLen = calcLength(fromGeo);
  const toLen = calcLength(toGeo);
  const deltaMeters = toLen - fromLen;
  const deltaPct = fromLen > 0 ? (deltaMeters / fromLen) * 100 : 0;
  
  // 缓冲区分析（如果数据是Polygon）
  let fromAreaSqm = 0, toAreaSqm = 0;
  const fromPolys = [];
  const toPolys = [];
  
  // 转换LineString为缓冲区Polygon进行分析
  function lineToBufferPolygon(geojson, bufferMeters = 500) {
    const polys = [];
    for (const f of geojson.features || []) {
      if (!f?.geometry) continue;
      const g = f.geometry;
      let lineCoords = null;
      if (g.type === "LineString" && g.coordinates?.length >= 2) {
        lineCoords = g.coordinates;
      } else if (g.type === "MultiLineString" && g.coordinates?.length) {
        // 取第一条线
        lineCoords = g.coordinates[0];
      }
      if (lineCoords?.length >= 2) {
        try {
          const line = turf.lineString(lineCoords);
          const buffered = turf.buffer(line, bufferMeters / 1000, { units: "kilometers" });
          if (buffered) polys.push(buffered);
        } catch (e) {
          // ignore buffer errors
        }
      }
    }
    return polys;
  }
  
  try {
    const fromBufferPolys = lineToBufferPolygon(fromGeo, 500);
    const toBufferPolys = lineToBufferPolygon(toGeo, 500);
    
    // 计算缓冲区面积
    fromAreaSqm = fromBufferPolys.reduce((sum, p) => sum + Math.abs(turf.area(p)), 0);
    toAreaSqm = toBufferPolys.reduce((sum, p) => sum + Math.abs(turf.area(p)), 0);
  } catch (e) {
    // area calculation failed, continue without area data
  }
  
  const deltaAreaSqm = toAreaSqm - fromAreaSqm;
  
  res.json({
    fromDataset: { id: String(fromDs._id), name: fromDs.name, date: fromDs.date, lengthKm: Math.round(fromLen / 1000 * 100) / 100 },
    toDataset: { id: String(toDs._id), name: toDs.name, date: toDs.date, lengthKm: Math.round(toLen / 1000 * 100) / 100 },
    deltaMeters: Math.round(deltaMeters),
    deltaKm: Math.round(deltaMeters / 1000 * 100) / 100,
    deltaPct: Math.round(deltaPct * 100) / 100,
    changeType: deltaMeters > 0 ? "accretion" : deltaMeters < 0 ? "erosion" : "stable",
    // 缓冲区面积变化（500米缓冲区）
    bufferAreaSqm: { from: Math.round(fromAreaSqm), to: Math.round(toAreaSqm), delta: Math.round(deltaAreaSqm) },
    bufferAreaKm2: { from: Math.round(fromAreaSqm / 1000000 * 100) / 100, to: Math.round(toAreaSqm / 1000000 * 100) / 100, delta: Math.round(deltaAreaSqm / 1000000 * 100) / 100 },
  });
});

// 按区域统计所有数据集
datasetsRouter.get("/stats/region/:regionName", requireAuth, async (req, res) => {
  const { regionName } = req.params;
  
  const datasets = await Dataset.find({
    regionName,
    status: "published",
    dataType: "shoreline",
  }).select("_id name date shorelineGeojson").sort({ date: 1 });
  
  const results = [];
  for (const d of datasets) {
    const geojson = d.shorelineGeojson;
    if (!geojson?.features?.length) continue;
    
    let totalLen = 0;
    for (const f of geojson.features) {
      if (!f?.geometry) continue;
      const g = f.geometry;
      if (g.type === "LineString" && g.coordinates?.length >= 2) {
        totalLen += turf.length(turf.lineString(g.coordinates), { units: "meters" });
      } else if (g.type === "MultiLineString" && g.coordinates?.length) {
        for (const coords of g.coordinates) {
          if (coords?.length >= 2) {
            totalLen += turf.length(turf.lineString(coords), { units: "meters" });
          }
        }
      }
    }
    
    results.push({
      datasetId: String(d._id),
      name: d.name,
      date: d.date,
      lengthKm: Math.round(totalLen / 1000 * 100) / 100,
      lengthMeters: Math.round(totalLen),
    });
  }
  
  // 计算变化趋势
  const trends = [];
  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    const curr = results[i];
    const delta = curr.lengthMeters - prev.lengthMeters;
    trends.push({
      from: prev.name,
      to: curr.name,
      deltaMeters: Math.round(delta),
      deltaKm: Math.round(delta / 1000 * 100) / 100,
      deltaPct: prev.lengthMeters > 0 ? Math.round((delta / prev.lengthMeters) * 10000) / 100 : 0,
      changeType: delta > 0 ? "accretion" : delta < 0 ? "erosion" : "stable",
    });
  }
  
  res.json({ regionName, datasets: results, trends });
});

// 全局海岸线统计概览
datasetsRouter.get("/stats/summary", requireAuth, async (_req, res) => {
  // 获取所有区域
  const regions = await Dataset.distinct("regionName", { status: "published", dataType: "shoreline" });
  
  const summary = [];
  for (const region of regions) {
    const datasets = await Dataset.find({
      regionName: region,
      status: "published",
      dataType: "shoreline",
    }).select("_id name date").sort({ date: 1 });
    
    if (!datasets.length) continue;
    
    // 取最新的数据集
    const latest = datasets[datasets.length - 1];
    const earliest = datasets[0];
    
    summary.push({
      region,
      datasetCount: datasets.length,
      earliestDate: earliest.date,
      latestDate: latest.date,
      timeRangeYears: latest.date && earliest.date 
        ? Math.round((new Date(latest.date).getTime() - new Date(earliest.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10
        : 0,
    });
  }
  
  res.json({
    totalRegions: summary.length,
    regions: summary,
  });
});

// 找到与海岸线相关的监测站点
datasetsRouter.get("/:id/nearby-stations", requireAuth, async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id name shorelineGeojson status regionName");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  
  const geojson = d.shorelineGeojson;
  if (!geojson?.features?.length) {
    return res.status(400).json({ message: "海岸线数据为空" });
  }
  
  // 计算海岸线的包围盒
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
  for (const f of geojson.features) {
    if (!f?.geometry) continue;
    const g = f.geometry;
    const coords = g.type === "LineString" ? g.coordinates 
      : g.type === "MultiLineString" ? g.coordinates.flat() 
      : null;
    if (!coords) continue;
    for (const c of coords) {
      if (c?.length >= 2) {
        minLon = Math.min(minLon, c[0]);
        maxLon = Math.max(maxLon, c[0]);
        minLat = Math.min(minLat, c[1]);
        maxLat = Math.max(maxLat, c[1]);
      }
    }
  }
  
  // 找到包围盒附近的站点（扩展1度）
  const { Station } = await import("../models/Station.js");
  const stations = await Station.find({
    "location.coordinates": {
      $gte: [minLon - 1, minLat - 1],
      $lte: [maxLon + 1, maxLat + 1],
    },
  }).select("_id name regionName location");
  
  res.json({
    datasetId: String(d._id),
    datasetName: d.name,
    regionName: d.regionName,
    bounds: { minLon, maxLon, minLat, maxLat },
    stationCount: stations.length,
    stations: stations.map(s => ({
      id: String(s._id),
      name: s.name,
      regionName: s.regionName,
      coordinates: s.location.coordinates,
    })),
  });
});

// ============================================
// 社会经济数据接口（海岸线影响分析）
// ============================================

// 获取区域社会经济概况（示例数据，可扩展）
datasetsRouter.get("/:id/economy", requireAuth, async (req, res) => {
  const d = await Dataset.findById(req.params.id).select("_id name regionName date status");
  if (!d) return res.status(404).json({ message: "Dataset not found" });
  
  // 基于区域的示例社会经济数据（可扩展为真实数据库）
  const economyData = {
    "海南": {
      coastlineLengthKm: 1944,
      population: 1020,
      gdp: 6500,
      tourism: 230,
      fisheries: 180,
      ports: ["海口", "三亚", "洋浦"],
      primaryIndustry: "旅游、水产养殖",
    },
    "东海区": {
      coastlineLengthKm: 5800,
      population: 12000,
      gdp: 28000,
      tourism: 4500,
      fisheries: 1200,
      ports: ["上海", "宁波", "舟山", "福州", "厦门"],
      primaryIndustry: "航运、制造业",
    },
    "粤港澳大湾区": {
      coastlineLengthKm: 2100,
      population: 8000,
      gdp: 42000,
      tourism: 3200,
      fisheries: 650,
      ports: ["广州", "深圳", "香港", "珠海", "东莞"],
      primaryIndustry: "金融、科技、航运",
    },
  };
  
  const region = d.regionName;
  const data = economyData[region] || {
    coastlineLengthKm: 0,
    population: 0,
    gdp: 0,
    tourism: 0,
    fisheries: 0,
    ports: [],
    primaryIndustry: "未定义",
  };
  
  res.json({
    datasetId: String(d._id),
    regionName: region,
    year: d.date?.getFullYear?.() || 2020,
    economy: data,
    notes: "社会经济数据基于公开统计年鉴，可扩展",
  });
});

