import bcrypt from "bcrypt";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { connectDb } from "../src/lib/db.js";
import { Dataset } from "../src/models/Dataset.js";
import { Observation } from "../src/models/Observation.js";
import { Station } from "../src/models/Station.js";
import { User } from "../src/models/User.js";

dotenv.config();

function readJson(relPathFromRepoRoot) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..", "..");
  const p = path.join(repoRoot, relPathFromRepoRoot);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function buildDataset({
  name,
  groupName,
  sensor,
  date,
  regionName,
  method,
  dataType = "shoreline",
  shorelineGeojson,
  adminId,
  coastlineType = "unknown",
  coastlineSubtype = "",
  originalDataPath = "",
  description = "",
}) {
  // 自动从name提取groupName（去除年份部分）
  const autoGroupName = groupName || name.replace(/（\d{4}年[^）]*）/g, "").trim();
  return {
    name,
    groupName: autoGroupName,
    sensor,
    date: new Date(date),
    regionName,
    method,
    status: "published",
    dataType,
    shorelineGeojson,
    coastlineType,
    coastlineSubtype,
    originalDataPath,
    description,
    createdBy: adminId,
  };
}

async function main() {
  await connectDb(process.env.MONGODB_URI);

  const adminUsername = "admin";
  const adminPassword = "admin123";

  let admin = await User.findOne({ username: adminUsername });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    admin = await User.create({ username: adminUsername, passwordHash, role: "admin" });
    // eslint-disable-next-line no-console
    console.log(`[seed] created admin: ${adminUsername} / ${adminPassword}`);
  } else {
    // eslint-disable-next-line no-console
    console.log("[seed] admin already exists");
  }

  const globalCoast = readJson("data/global_ne_110m_coastline.geojson");
  const globalNe50 = readJson("data/ne_50m_coastline.geojson");
  const globalNe10 = readJson("data/ne_10m_coastline.geojson");
  const globalGshhgCoarse = readJson("data/global_gshhg_c_L1.geojson");
  const globalGshhgLow = readJson("data/global_gshhg_l_L1.geojson");
  const chinaCoast = readJson("data/gshhg_china_coast_h_L1.geojson");

  // 海南岛真实数据（1990/2010/2020）
  const hainan1990 = readJson("data/hainan_1990.geojson");
  const hainan2010 = readJson("data/hainan_2010.geojson");
  const hainan2020 = readJson("data/hainan_2020.geojson");

  // 广西海岸线数据（1990/2000/2010/2015/2020）
  const guangxi1990 = readJson("data/guangxi_1990.geojson");
  const guangxi2000 = readJson("data/guangxi_2000.geojson");
  const guangxi2010 = readJson("data/guangxi_2010.geojson");
  const guangxi2015 = readJson("data/guangxi_2015.geojson");
  const guangxi2020 = readJson("data/guangxi_2020.geojson");

  // 胶州湾海岸线数据（1985/1990/1995/2000/2005/2010/2015/2020/2022）
  const jiaozhou1985 = readJson("data/jiaozhou_1985.geojson");
  const jiaozhou1990 = readJson("data/jiaozhou_1990.geojson");
  const jiaozhou1995 = readJson("data/jiaozhou_1995.geojson");
  const jiaozhou2000 = readJson("data/jiaozhou_2000.geojson");
  const jiaozhou2005 = readJson("data/jiaozhou_2005.geojson");
  const jiaozhou2010 = readJson("data/jiaozhou_2010.geojson");
  const jiaozhou2015 = readJson("data/jiaozhou_2015.geojson");
  const jiaozhou2020 = readJson("data/jiaozhou_2020.geojson");
  const jiaozhou2022 = readJson("data/jiaozhou_2022.geojson");

  // 全球红树林数据（文件过大，约763MB/35万要素，请通过管理员后台上传或直接下载使用）
  // 原始文件路径: C:/Users/ldz/全球10m分辨率红树林空间分布数据集（2020年）/
  // 数据集信息: DOI: https://doi.org/10.57760/sciencedb.IGA.00968

  // 中国东海区真实数据（1990-2015）
  const ecs1990 = readJson("data/east_china_sea_1990.geojson");
  const ecs1995 = readJson("data/east_china_sea_1995.geojson");
  const ecs2000 = readJson("data/east_china_sea_2000.geojson");
  const ecs2005 = readJson("data/east_china_sea_2005.geojson");
  const ecs2010 = readJson("data/east_china_sea_2010.geojson");
  const ecs2015 = readJson("data/east_china_sea_2015.geojson");

  // 粤港澳大湾区真实数据（1979-2020）
  const ghm1979 = readJson("data/bay_area_1979.geojson");
  const ghm1990 = readJson("data/bay_area_1990.geojson");
  const ghm2000 = readJson("data/bay_area_2000.geojson");
  const ghm2005 = readJson("data/bay_area_2005.geojson");
  const ghm2010 = readJson("data/bay_area_2010.geojson");
  const ghm2015 = readJson("data/bay_area_2015.geojson");
  const ghm2020 = readJson("data/bay_area_2020.geojson");

  // 全球精细海岸线数据（用于非中国区域的fallback）
  const globalCoastline = readJson("data/gshhg_china_coast_h_L1.geojson");

  // 旧金山湾真实数据
  const sf1980 = readJson("data/san_francisco_1980_coast.geojson");
  const sf1990 = readJson("data/san_francisco_1990_coast.geojson");
  const sf2000 = readJson("data/san_francisco_2000_coast.geojson");
  const sf2005 = readJson("data/san_francisco_2005_coast.geojson");
  const sf2010 = readJson("data/san_francisco_2010_coast.geojson");
  const sf2015 = readJson("data/san_francisco_2015_coast.geojson");
  const sf2020 = readJson("data/san_francisco_2020_coast.geojson");

  // 东京湾真实数据
  const tk1980 = readJson("data/tokyo_bay_1980_coast.geojson");
  const tk1990 = readJson("data/tokyo_bay_1990_coast.geojson");
  const tk2000 = readJson("data/tokyo_bay_2000_coast.geojson");
  const tk2005 = readJson("data/tokyo_bay_2005_coast.geojson");
  const tk2010 = readJson("data/tokyo_bay_2010_coast.geojson");
  const tk2015 = readJson("data/tokyo_bay_2015_coast.geojson");
  const tk2020 = readJson("data/tokyo_bay_2020_coast.geojson");

  // 斯里兰卡和瑙鲁数据
  const sriLanka = readJson("data/sri_lanka_coast.geojson");
  const nauru = readJson("data/nauru_coastline.geojson");

  // 删除所有区域数据，包括 Global、中国、厦门、东京湾、旧金山湾、斯里兰卡、秘鲁等
  const datasetRegions = ["Global", "China", "海南", "东海区", "广西", "粤港澳大湾区", "渤海湾", "示例区域-厦门近岸", "全球性数据集", "东京湾", "旧金山湾", "斯里兰卡", "秘鲁", "瑙鲁", "胶州湾"];
  await Dataset.deleteMany({ regionName: { $in: datasetRegions } });

  // 收集要导入的数据（检查是否已存在，避免重复）
  const datasetsToCreate = [];
  const existingDatasets = await Dataset.find({ regionName: { $in: datasetRegions } }).select("regionName date");
  const existingKeys = new Set(existingDatasets.map(d => `${d.regionName}_${new Date(d.date).getFullYear()}`));

await Dataset.create([
    // ---- 海南岛海岸线数据集 ----
    // 数据来源: CASEarth 地球大数据平台
    // DOI: 10.5281/zenodo.xxx (待补充)
    // 时间范围: 1990, 2010, 2020
    // 分辨率: 30m
    // 方法: NDWI水体指数法提取 + 人工修正
    buildDataset({
      name: "海南岛海岸线变迁数据集（1990年，30m分辨率）",
      sensor: "landsat8",
      date: "1990-12-31",
      regionName: "海南",
      method: "Landsat TM/OLI - MNDWI自适应阈值分割 + 实地调查修正",
dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: tk2010,
      adminId: admin._id,
      originalDataPath: "/uploads/30m coastline changes in Hainan Island in 1990.rar",
      description: "【数据名称】海南岛海岸线变迁数据集（1990年，30m分辨率）\n【位置】海南省海岛\n【数据来源】CASEarth地球大数据平台\n【DOI】10.12237/casearth.6396cf6c819aec7aa363a692\n【作者】Zhang Li Chen Bowei\n【单位】International Research Center of Big Data for Sustainable Development Goals\n【出版时间】2022年12月\n【分辨率】30m\n【时间分辨率】10年\n【数据格式】Shapefile\n【关键词】海南岛、海岸线变化\n【摘要】基于Landsat TM/OLI数据（1990, 2010, 2020年），采用基于MNDWI的自适应阈值分割算法，结合实地调查数据，获得海南岛1990-2020年海岸线变迁数据集。",
    }),
    buildDataset({
      name: "海南岛海岸线变迁数据集（2010年，30m分辨率）",
      sensor: "landsat8",
      date: "2010-12-31",
      regionName: "海南",
      method: "Landsat TM/OLI - MNDWI自适应阈值分割 + 实地调查修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: hainan2010,
      adminId: admin._id,
      originalDataPath: "/uploads/30m coastline changes in Hainan Island in 2010.rar",
      description: "【数据名称】海南岛海岸线变迁数据集（2010年，30m分辨率）\n【位置】海南省海岛\n【数据来源】CASEarth地球大数据平台\n【DOI】10.12237/casearth.6396cf6c819aec7aa363a692\n【作者】Zhang Li Chen Bowei\n【单位】International Research Center of Big Data for Sustainable Development Goals\n【出版时间】2022年12月\n【分辨率】30m\n【时间分辨率】10年\n【数据格式】Shapefile\n【关键词】海南岛、海岸线变化\n【摘要】基于Landsat TM/OLI数据（1990, 2010, 2020年），采用基于MNDWI的自适应阈值分割算法，结合实地调查数据，获得海南岛1990-2020年海岸线变迁数据集。",
    }),
    buildDataset({
      name: "海南岛海岸线变迁数据集（2020年，30m分辨率）",
      sensor: "sentinel2",
      date: "2020-12-31",
      regionName: "海南",
      method: "Landsat TM/OLI - MNDWI自适应阈值分割 + 实地调查修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: hainan2020,
      adminId: admin._id,
      originalDataPath: "/uploads/30m coastline changes in Hainan Island in 2020.rar",
      description: "【数据名称】海南岛海岸线变迁数据集（2020年，30m分辨率）\n【位置】海南省海岛\n【数据来源】CASEarth地球大数据平台\n【DOI】10.12237/casearth.6396cf6c819aec7aa363a692\n【作者】Zhang Li Chen Bowei\n【单位】International Research Center of Big Data for Sustainable Development Goals\n【出版时间】2022年12月\n【分辨率】30m\n【时间分辨率】10年\n【数据格式】Shapefile\n【关键词】海南岛、海岸线变化\n【摘要】基于Landsat TM/OLI数据（1990, 2010, 2020年），采用基于MNDWI的自适应阈值分割算法���结合实地调查数据，获得海南岛1990-2020年海岸线变迁数据集。",
    }),
    // ---- 广西海岸线数据集 ----
    buildDataset({
      name: "1990-2020年中国广西海岸线遥感监测数据集（1990年）",
      sensor: "landsat8",
      date: "1990-12-31",
      regionName: "广西",
      method: "Landsat TM - MNDWI阈值分割 + 边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: guangxi1990,
      adminId: admin._id,
      description: `【数据名称】1990-2020年中国广西海岸线遥感监测数据集
【作者】李开鑫; 张丽; 李丽; 陈研茹; 杨振宇; 陈博伟
【位置】广西沿海地区
【数据来源】本研究利用1990-2020年5个时段的Landsat TM/OLI数据，对广西沿海地区进行海岸线提取研究。
【分辨率】30m
【时间分辨率】5年
【数据格式】Shapefile
【关键词】广西、海岸线、遥感监测、Landsat、时空分布
【摘要】本研究利用1990-2020年5个时段的Landsat TM/OLI数据，对广西沿海地区进行海岸线提取研究。我们进一步将海岸线划分为人工和自然海岸线两个主要类别和生物质海岸线和砂质海岸线等六个次要类别。该数据集具有时间序列长、精度高、海岸线类型全面的特点。`,
    }),
    buildDataset({
      name: "1990-2020年中国广西海岸线遥感监测数据集（2000年）",
      sensor: "landsat8",
      date: "2000-12-31",
      regionName: "广西",
      method: "Landsat TM - MNDWI阈值分割 + 边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: guangxi2000,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1990-2020年中国广西海岸线遥感监测数据集（2010年）",
      sensor: "mixed",
      date: "2010-12-31",
      regionName: "广西",
      method: "Landsat TM/OLI - MNDWI阈值分割 + 边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: guangxi2010,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1990-2020年中国广西海岸线遥感监测数据集（2015年）",
      sensor: "landsat8",
      date: "2015-12-31",
      regionName: "广西",
      method: "Landsat TM/OLI - MNDWI阈值分割 + 边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: guangxi2015,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1990-2020年中国广西海岸线遥感监测数据集（2020年）",
      sensor: "landsat9",
      date: "2020-12-31",
      regionName: "广西",
      method: "Landsat TM/OLI - MNDWI阈值分割 + 边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: guangxi2020,
      adminId: admin._id,
    }),
    // ---- 胶州湾海岸线数据集 ----
    buildDataset({
      name: "1985-2022年胶州湾岸线时空变化数据集（1985年）",
      sensor: "landsat8",
      date: "1985-12-31",
      regionName: "胶州湾",
      method: "Google Earth Engine - 波段边缘检测 + 影像目视解译",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: jiaozhou1985,
      adminId: admin._id,
      description: `【数据名称】1985-2022年胶州湾岸线时空变化数据集
【DOI】https://doi.org/10.57760/sciencedb.13386
【作者】赵永芳; 邢容荣; 李金洋; 孙晓霞
【位置】胶州湾（青岛）
【数据来源】基于遥感和GIS技术，利用Google Earth Engine平台经波段边缘检测及影像目视解译，获得1985-2022年9期胶州湾海岸线时空分布数据。
【时间分辨率】5年间隔（1985-2020）+ 2022年
【关键词】胶州湾、海岸线、遥感、时空变化
【摘要】胶州湾是青岛的母亲湾，岸线时空变化受到气候变化和人类活动双重影响。岸线变化检测对于研究海陆格局演变和维护城市生态平衡至关重要。`,
    }),
    buildDataset({
      name: "1985-2022年胶州湾岸线时空变化数据集（1990年）",
      sensor: "landsat8",
      date: "1990-12-31",
      regionName: "胶州湾",
      method: "Google Earth Engine - 波段边缘检测 + 影像目视解译",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: jiaozhou1990,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1985-2022年胶州湾岸线时空变化数据集（1995年）",
      sensor: "landsat8",
      date: "1995-12-31",
      regionName: "胶州湾",
      method: "Google Earth Engine - 波段边缘检测 + 影像目视解译",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: jiaozhou1995,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1985-2022年胶州湾岸线时空变化数据集（2000年）",
      sensor: "landsat8",
      date: "2000-12-31",
      regionName: "胶州湾",
      method: "Google Earth Engine - 波段边缘检测 + 影像目视解译",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: jiaozhou2000,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1985-2022年胶州湾岸线时空变化数据集（2005年）",
      sensor: "landsat8",
      date: "2005-12-31",
      regionName: "胶州湾",
      method: "Google Earth Engine - 波段边缘检测 + 影像目视解译",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: jiaozhou2005,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1985-2022年胶州湾岸线时空变化数据集（2010年）",
      sensor: "mixed",
      date: "2010-12-31",
      regionName: "胶州湾",
      method: "Google Earth Engine - 波段边缘检测 + 影像目视解译",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: jiaozhou2010,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1985-2022年胶州湾岸线时空变化数据集（2015年）",
      sensor: "landsat8",
      date: "2015-12-31",
      regionName: "胶州湾",
      method: "Google Earth Engine - 波段边缘检测 + 影像目视解译",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: jiaozhou2015,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1985-2022年胶州湾岸线时空变化数据集（2020年）",
      sensor: "landsat8",
      date: "2020-12-31",
      regionName: "胶州湾",
      method: "Google Earth Engine - 波段边缘检测 + 影像目视解译",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: jiaozhou2020,
      adminId: admin._id,
    }),
    buildDataset({
      name: "1985-2022年胶州湾岸线时空变化数据集（2022年）",
      sensor: "landsat9",
      date: "2022-12-31",
      regionName: "胶州湾",
      method: "Google Earth Engine - 波段边缘检测 + 影像目视解译",
      dataType: "shoreline",
      coastlineType: "unknown",
shorelineGeojson: jiaozhou2022,
      adminId: admin._id,
    }),
    // ---- 全球红树林数据集 ----
    buildDataset({
      name: "全球10m分辨率红树林空间分布数据集（2020年）",
      sensor: "mixed",
      date: "2020-12-31",
      regionName: "Global",
      method: "遥感影像分类 + 深度学习",
      dataType: "shoreline",
      coastlineType: "unknown",
      originalDataPath: "https://doi.org/10.57760/sciencedb.IGA.00968",
      adminId: admin._id,
      description: `【数据名称】全球10m分辨率红树林空间分布数据集（2020年）
【DOI】https://doi.org/10.57760/sciencedb.IGA.00968
【作者】贾明明
【位置】全球
【数据来源】基于2020年遥感影像进行红树林分布提取
【分辨率】10m
【数据量】约763MB
【说明】原始数据文件过大（约35万要素），请点击下方"下载原始数据"按钮从DOI链接下载完整数据
【建设目的】红树林是地球上生物多样性和生产力最高的生态系统之一，可为生态保育、红树林保护与修复提供数据支撑。`,
    }),
    // ---- 中国东海区海岸线数据集 ----
    // 数据来源: 全球变化科学研究数据出版系统
    // DOI: 10.3974/geodb.2019.04.14.V1
    // 引用: Li, J. L., Tian, P., Shao, S. Y., et al. (2019). East China Sea Coastline Dataset (1990-2015). Journal of Global Change Data & Discovery, 3(3): 252-258.
    // 时间范围: 1990, 1995, 2000, 2005, 2010, 2015
    // 分辨率: 30m
    // ---- 中国东海区海岸线数据集 ----
    // 数据来源: 全球变化科学研究数据出版系统
    // DOI: 10.3974/geodb.2019.04.14.V1
    // 引用: Li, J. L., Tian, P., Shao, S. Y., et al. (2019). East China Sea Coastline Dataset (1990-2015). Journal of Global Change Data & Discovery, 3(3): 252-258.
    // 时间范围: 1990, 1995, 2000, 2005, 2010, 2015
    // 分辨率: 30m
    // 传感器: Landsat TM/OLI
    // 方法: 波段边缘检测 + 目视解译修正
    buildDataset({
      name: "中国东海区5年间隔大陆海岸线及类型时空变化数据集（1990年）",
      sensor: "landsat8",
      date: "1990-12-31",
      regionName: "东海区",
      method: "Landsat TM - 波段边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ecs1990,
      adminId: admin._id,
      originalDataPath: "/uploads/Coastline_ESC_1990-2015.rar",
      description: "【数据名称】中国东海区5年间隔大陆海岸线及类型时空变化数据集（1990年）\n【位置】中国东海区（23°37′N~31°46′N，117°11′E~122°08′E）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2019.04.14.V1\n【作者】李加林 田鹏 邵姝遥 赵梦琪\n【单位】宁波大学东海研究院，宁波315211；宁波大学地理与空间信息技术系，宁波315211\n【出版时间】2019年7月\n【分辨率】30m\n【时间分辨率】5年\n【数据格式】Shapefile\n【关键词】海岸线、岸线分形维数、岸线利用强度、中国东海区\n【摘要】东海区大陆海岸线北起长江口启东嘴，南到福建、广东交界的铁炉港。南北跨越8个纬度，隶属上海、浙江、福建三省市。基于Landsat TM影像，经波段边缘检测确定岸线位置。2015年海岸线总长4720.74 km，自然岸线占比46.12%。\n【期刊引用】李加林, 田鹏, 邵姝遥等. 中国东海区大陆海岸线数据集(1990–2015) [J]. 全球变化数据学报, 2019, 3(3): 252–258.",
    }),
    buildDataset({
      name: "中国东海区5年间隔大陆海岸线及类型时空变化数据集（1995年）",
      sensor: "landsat8",
      date: "1995-12-31",
      regionName: "东海区",
      method: "Landsat TM - 波段边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ecs1995,
      adminId: admin._id,
      originalDataPath: "/uploads/Coastline_ESC_1990-2015.rar",
      description: "【数据名称】中国东海区5年间隔大陆海岸线及类型时空变化数据集（1995年）\n【位置】中国东海区（23°37′N~31°46′N，117°11′E~122°08′E）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2019.04.14.V1\n【作者】李加林 田鹏 邵姝遥 赵梦琪\n【单位】宁波大学东海研究院，宁波315211；宁波大学地理与空间信息技术系，宁波315211\n【出版时间】2019年7月\n【分辨率】30m\n【时间分辨率】5年\n【数据格式】Shapefile\n【关键词】海岸线、岸线分形维数、岸线利用强度、中国东海区",
    }),
    buildDataset({
      name: "中国东海区5年间隔大陆海岸线及类型时空变化数据集（2000年）",
      sensor: "landsat8",
      date: "2000-12-31",
      regionName: "东海区",
      method: "Landsat TM - 波段边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ecs2000,
      adminId: admin._id,
      originalDataPath: "/uploads/Coastline_ESC_1990-2015.rar",
      description: "【数据名称】中国东海区5年间隔大陆海岸线及类型时空变化数据集（2000年）\n【位置】中国东海区（23°37′N~31°46′N，117°11′E~122°08′E）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2019.04.14.V1\n【作者】李加林 田鹏 邵姝遥 赵梦琪\n【单位】宁波大学东海研究院，宁波315211；宁波大学地理与空间信息技术系，宁波315211\n【出版时间】2019年7月\n【分辨率】30m\n【时间分辨率】5年\n【数据格式】Shapefile\n【关键词】海岸线、岸线分形维数、岸线利用强度、中国东海区",
    }),
    buildDataset({
      name: "中国东海区5年间隔大陆海岸线及类型时空变化数据集（2005年）",
      sensor: "landsat8",
      date: "2005-12-31",
      regionName: "东海区",
      method: "Landsat TM - 波段边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ecs2005,
      adminId: admin._id,
      originalDataPath: "/uploads/Coastline_ESC_1990-2015.rar",
      description: "【数据名称】中国东海区5年间隔大陆海岸线及类型时空变化数据集（2005年）\n【位置】中国东海区（23°37′N~31°46′N，117°11′E~122°08′E）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2019.04.14.V1\n【作者】李加林 田鹏 邵姝遥 赵梦琪\n【单位】宁波大学东海研究院，宁波315211；宁波大学地理与空间信息技术系，宁波315211\n【出版时间】2019年7月\n【分辨率】30m\n【时间分辨率】5年\n【数据格式】Shapefile\n【关键词】海岸线、岸线分形维数、岸线利用强度、中国东海区",
    }),
    buildDataset({
      name: "中国东海区5年间隔大陆海岸线及类型时空变化数据集（2010年）",
      sensor: "mixed",
      date: "2010-12-31",
      regionName: "东海区",
      method: "Landsat TM/OLI - 波段边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ecs2010,
      adminId: admin._id,
      originalDataPath: "/uploads/Coastline_ESC_1990-2015.rar",
      description: "【数据名称】中国东海区5年间隔大陆海岸线及类型时空变化数据集（2010年）\n【位置】中国东海区（23°37′N~31°46′N，117°11′E~122°08′E）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2019.04.14.V1\n【作者】李加林 田鹏 邵姝遥 赵梦琪\n【单位】宁波大学东海研究院，宁波315211；宁波大学地理与空间信息技术系，宁波315211\n【出版时间】2019年7月\n【分辨率】30m\n【时间分辨率】5年\n【数据格式】Shapefile\n【关键词】海岸线、岸线分形维数、岸线利用强度、中国东海区",
    }),
    buildDataset({
      name: "中国东海区5年间隔大陆海岸线及类型时空变化数据集（2015年）",
      sensor: "landsat8",
      date: "2015-12-31",
      regionName: "东海区",
      method: "Landsat OLI - 波段边缘检测 + 目视解译修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ecs2015,
      adminId: admin._id,
      originalDataPath: "/uploads/Coastline_ESC_1990-2015.rar",
      description: "【数据名称】中国东海区5年间隔大陆海岸线及类型时空变化数据集（2015年）\n【位置】中国东海区（23°37′N~31°46′N，117°11′E~122°08′E）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2019.04.14.V1\n【作者】李加林 田鹏 邵姝遥 赵梦琪\n【单位】宁波大学东海研究院，宁波315211；宁波大学地理与空间信息技术系，宁波315211\n【出版时间】2019年7月\n【分辨率】30m\n【时间分辨率】5年\n【数据格式】Shapefile\n【关键词】海岸线、岸线分形维数、岸线利用强度、中国东海区\n【统计】2015年海岸线总长4720.74 km，自然岸线占比46.12%，人工岸线占比53.88%。",
    }),
    // ---- 粤港澳大湾区海岸线数据集 ----
buildDataset({
      name: "粤港澳湾区海岸线类型及时空变化数据集（1979年）",
      sensor: "mixed",
      date: "1979-12-31",
      regionName: "粤港澳大湾区",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ghm1979,
      adminId: admin._id,
      originalDataPath: "/uploads/GHM_Coastline_1979-2020.rar",
      description: "【数据名称】粤港澳湾区海岸线类型及时空变化数据集（1979年）\n【位置】粤港澳湾区（112°E~115°E，21°N~23°N）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2021.04.07.V1\n【作者】苏倩欣 李志强\n【单位】广东海洋大学电子与信息工程学院海洋技术系，湛江524088\n【出版时间】2021年4月\n【分辨率】30m\n【时间分辨率】~10年\n【数据格式】Shapefile/KMZ\n【关键词】粤港澳湾区、中国、海岸线变化、岸线类型、利用程度指数\n【摘要】粤港澳湾区位于珠江口区域，涉及珠江三角洲9个城市、香港和澳门。基于1979-2020年Landsat系列遥感影像，进行海岸线位置提取和类型划分。",
    }),
    buildDataset({
      name: "粤港澳湾区海岸线类型及时空变化数据集（1990年）",
      sensor: "landsat8",
      date: "1990-12-31",
      regionName: "粤港澳大湾区",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ghm1990,
      adminId: admin._id,
      originalDataPath: "/uploads/GHM_Coastline_1979-2020.rar",
      description: "【数据名称】粤港澳湾区海岸线类型及时空变化数据集（1990年）\n【位置】粤港澳湾区（112°E~115°E，21°N~23°N）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2021.04.07.V1\n【作者】苏倩欣 李志强\n【单位】广东海洋大学电子与信息工程学院海洋技术系，湛江524088\n【出版时间】2021年4月\n【分辨率】30m\n【时间分辨率】~10年\n【数据格式】Shapefile/KMZ\n【关键词】粤港澳湾区、中国、海岸线变化、岸线类型、利用程度指数",
    }),
    buildDataset({
      name: "粤港澳湾区海岸线类型及时空变化数据集（2000年）",
      sensor: "landsat8",
      date: "2000-12-31",
      regionName: "粤港澳大湾区",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ghm2000,
      adminId: admin._id,
      originalDataPath: "/uploads/GHM_Coastline_1979-2020.rar",
      description: "【数据名称】粤港澳湾区海岸线类型及时空变化数据集（2000年）\n【位置】粤港澳湾区（112°E~115°E，21°N~23°N）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2021.04.07.V1\n【作者】苏倩欣 李志强\n【单位】广东海洋大学电子与信息工程学院海洋技术系，湛江524088\n【出版时间】2021年4月\n【分辨率】30m\n【时间分辨率】~10年\n【数据格式】Shapefile/KMZ\n【关键词】粤港澳湾区、中国、海岸线变化、岸线类型、利用程度指数",
    }),
    buildDataset({
      name: "粤港澳湾区海岸线类型及时空变化数据集（2005年）",
      sensor: "landsat8",
      date: "2005-12-31",
      regionName: "粤港澳大湾区",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ghm2005,
      adminId: admin._id,
      originalDataPath: "/uploads/GHM_Coastline_1979-2020.rar",
      description: "【数据名称】粤港澳湾区海岸线类型及时空变化数据集（2005年）\n【位置】粤港澳湾区（112°E~115°E，21°N~23°N）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2021.04.07.V1\n【作者】苏倩欣 李志强\n【单位】广东海洋大学电子与信息工程学院海洋技术系，湛江524088\n【出版时间】2021年4月\n【分辨率】30m\n【时间分辨率】~10年\n【数据格式】Shapefile/KMZ\n【关键词】粤港澳湾区、中国、海岸线变化、岸线类型、利用程度指数",
    }),
    buildDataset({
      name: "粤港澳湾区海岸线类型及时空变化数据集（2010年）",
      sensor: "mixed",
      date: "2010-12-31",
      regionName: "粤港澳大湾区",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ghm2010,
      adminId: admin._id,
      originalDataPath: "/uploads/GHM_Coastline_1979-2020.rar",
      description: "【数据名称】粤港澳湾区海岸线类型及时空变化数据集（2010年）\n【位置】粤港澳湾区（112°E~115°E，21°N~23°N）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2021.04.07.V1\n【作者】苏倩欣 李志强\n【单位】广东海洋大学电子与信息工程学院海洋技术系，湛江524088\n【出版时间】2021年4月\n【分辨率】30m\n【时间分辨率】~10年\n【数据格式】Shapefile/KMZ\n【关键词】粤港澳湾区、中国、海岸线变化、岸线类型、利用程度指数",
    }),
    buildDataset({
      name: "粤港澳湾区海岸线类型及时空变化数据集（2015年）",
      sensor: "landsat8",
      date: "2015-12-31",
      regionName: "粤港澳大湾区",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ghm2015,
      adminId: admin._id,
      originalDataPath: "/uploads/GHM_Coastline_1979-2020.rar",
      description: "【数据名称】粤港澳湾区海岸线类型及时空变化数据集（2015年）\n【位置】粤港澳湾区（112°E~115°E，21°N~23°N）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2021.04.07.V1\n【作者】苏倩欣 李志强\n【单位】广东海洋大学电子与信息工程学院海洋技术系，湛江524088\n【出版时间】2021年4月\n【分辨率】30m\n【时间分辨率】~10年\n【数据格式】Shapefile/KMZ\n【关键词】粤港澳湾区、中国、海岸线变化、岸线类型、利用程度指数",
    }),
    buildDataset({
      name: "粤港澳湾区海岸线类型及时空变化数据集（2020年）",
      sensor: "landsat8",
      date: "2020-12-31",
      regionName: "粤港澳大湾区",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: ghm2020,
      adminId: admin._id,
      originalDataPath: "/uploads/GHM_Coastline_1979-2020.rar",
description: "【数据名称】粤港澳湾区海岸线类型及时空变化数据集（2020年）\n【位置】粤港澳湾区（112°E~115°E，21°N~23°N）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2021.04.07.V1\n【作者】苏倩欣 李志强\n【单位】广东海洋大学电子与信息工程学院海洋技术系，湛江524088\n【出版时间】2021年4月\n【分辨率】30m\n【时间分辨率】~10年\n【数据格式】Shapefile/KMZ\n【关键词】粤港澳湾区、中国、海岸线变化、岸线类型、利用程度指数",
}),
    // ---- 东京湾海岸线数据集 (使用全球海岸线数据作为占位符) ----
buildDataset({
      name: "东京湾海岸线类型及时空变化数据集（2010年）",
      sensor: "mixed",
      date: "2010-12-31",
      regionName: "东京湾",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: tk2010,
      adminId: admin._id,
      originalDataPath: "/uploads/TK_Coastline.zip",
      description: "【数据名称】东京湾海岸线类型及时空变化数据集（2010年）\n【位置】东京湾（139.0°E~140.1°E，34.0°N~35.6°N）\n【数据来源】全球变化科学研究数据出版系统\n【DOI】10.3974/geodb.2021.04.08.V1",
    }),
    buildDataset({
      name: "东京湾海岸线类型及时空变化数据集（2015年）",
      sensor: "mixed",
      date: "2015-12-31",
      regionName: "东京湾",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: tk2015,
      adminId: admin._id,
      originalDataPath: "/uploads/TK_Coastline.zip",
      description: "【数据名称】东京湾海岸线类型及时空变化数据集（2015年）\n【位置】东京湾",
    }),
    buildDataset({
      name: "东京湾海岸线类型及时空变化数据集（2020年）",
      sensor: "mixed",
      date: "2020-12-31",
      regionName: "东京湾",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: tk2020,
      adminId: admin._id,
      originalDataPath: "/uploads/TK_Coastline.zip",
      description: "【数据名称】东京湾海岸线类型及时空变化数据集（2020年）",
    }),
    // ---- 旧金山湾海岸线数据集 ----
    buildDataset({
      name: "旧金山湾海岸线类型及时空变化数据集（2010年）",
      sensor: "mixed",
      date: "2010-12-31",
      regionName: "旧金山湾",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: sf2010,
      adminId: admin._id,
      originalDataPath: "/uploads/SF_Coastline.zip",
      description: "【数据名称】旧金山湾海岸线类型及时空变化数据集（2010年）\n【位置】旧金山湾",
    }),
    buildDataset({
      name: "旧金山湾海岸线类型及时空变化数据集（2015年）",
      sensor: "mixed",
      date: "2015-12-31",
      regionName: "旧金山湾",
      method: "Landsat系列 - MNDWI阈值分割 + Sobel算子 + Google Earth修正",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: sf2015,
      adminId: admin._id,
      originalDataPath: "/uploads/SF_Coastline.zip",
    }),
    // ---- 斯里兰卡海岸线数据集 ----
    buildDataset({
      name: "斯里兰卡海岸线数据",
      sensor: "mixed",
      date: "2015-12-31",
      regionName: "斯里兰卡",
      method: "Google Earth遥感影像提取",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: sriLanka,
      adminId: admin._id,
      originalDataPath: "/uploads/SriLankaIslandsshp.rar",
      description: "【数据名称】斯里兰卡海岸线数据\n【位置】斯里兰卡岛",
    }),
    // ---- 瑙鲁海岸线数据集 ----
    buildDataset({
      name: "瑙鲁海岸线数据",
      sensor: "mixed",
      date: "2015-12-31",
      regionName: "瑙鲁",
      method: "Google Earth遥感影像提取",
      dataType: "shoreline",
      coastlineType: "unknown",
      shorelineGeojson: nauru,
      adminId: admin._id,
      originalDataPath: "/uploads/NauruIslandshp.rar",
      description: "【数据名称】瑙鲁海岸线数据\n【位置】瑙鲁岛",
    }),
    // ---- 全球参考海岸线数据集 ----
    buildDataset({
      name: "Natural Earth 1:1.1亿全球海岸线",
      sensor: "mixed",
      date: "2020-01-01",
      regionName: "Global",
      method: "Natural Earth数据",
      dataType: "reference",
      coastlineType: "unknown",
      shorelineGeojson: globalCoast,
      adminId: admin._id,
      description: "【数据来源】Natural Earth\n【比例尺】1:1.1亿\n【描述】全球海岸线参考数据",
    }),
    buildDataset({
      name: "Natural Earth 1:5000万全球海岸线",
      sensor: "mixed",
      date: "2020-01-01",
      regionName: "Global",
      method: "Natural Earth数据",
      dataType: "reference",
      coastlineType: "unknown",
      shorelineGeojson: globalNe50,
      adminId: admin._id,
      description: "【数据来源】Natural Earth\n【比例尺】1:5000万\n【描述】中等分辨率全球海岸线参考数据",
    }),
    buildDataset({
      name: "Natural Earth 1:1000万全球海岸线",
      sensor: "mixed",
      date: "2020-01-01",
      regionName: "Global",
      method: "Natural Earth数据",
      dataType: "reference",
      coastlineType: "unknown",
      shorelineGeojson: globalNe10,
      adminId: admin._id,
      description: "【数据来源】Natural Earth\n【比例尺】1:1000万\n【描述】高分辨率全球海岸线参考数据",
    }),
    buildDataset({
      name: "GSHHG粗分辨率全球海岸线",
      sensor: "mixed",
      date: "2020-01-01",
      regionName: "Global",
      method: "GSHHG数据",
      dataType: "reference",
      coastlineType: "unknown",
      shorelineGeojson: globalGshhgCoarse,
      adminId: admin._id,
      description: "【数据来源】GSHHG (Global Self-consistent Hierarchical High-resolution Geography)\n【分辨率】粗分辨率(C)\n【描述】GSHHG全球海岸线数据库",
    }),
    buildDataset({
      name: "GSHHG低分辨率全球海岸线",
      sensor: "mixed",
      date: "2020-01-01",
      regionName: "Global",
      method: "GSHHG数据",
      dataType: "reference",
      coastlineType: "unknown",
      shorelineGeojson: globalGshhgLow,
      adminId: admin._id,
      description: "【数据来源】GSHHG (Global Self-consistent Hierarchical High-resolution Geography)\n【分辨率】低分辨率(L)\n【描述】GSHHG全球海岸线数据库",
    }),

  ]);

  // ---- business data demo (stations + observations) ----
  await Observation.deleteMany({});

  const stationSeed = [
    // ---- Fujian / Xiamen demo ----
    { name: "福建-厦门（近岸）", regionName: "福建", coordinates: [118.085, 24.49] },
    { name: "福建-厦门（外海）", regionName: "福建", coordinates: [118.12, 24.46] },

    // ---- China coastal provinces (representative stations) ----
    { name: "辽宁-大连", regionName: "辽宁", coordinates: [121.6147, 38.9140] },
    { name: "河北-秦皇岛", regionName: "河北", coordinates: [119.6000, 39.9350] },
    { name: "天津-滨海", regionName: "天津", coordinates: [117.7000, 39.0200] },
    { name: "山东-青岛", regionName: "山东", coordinates: [120.3826, 36.0671] },
    { name: "江苏-连云港", regionName: "江苏", coordinates: [119.2216, 34.5967] },
    { name: "上海-崇明", regionName: "上海", coordinates: [121.3960, 31.6240] },
    { name: "浙江-宁波", regionName: "浙江", coordinates: [121.5500, 29.8800] },
    { name: "福建-福州", regionName: "福建", coordinates: [119.3062, 26.0753] },
    { name: "广东-深圳", regionName: "广东", coordinates: [114.0579, 22.5431] },
    { name: "广东-湛江", regionName: "广东", coordinates: [110.3594, 21.2707] },
    { name: "广西-北海", regionName: "广西", coordinates: [109.1190, 21.4733] },
    { name: "海南-三亚", regionName: "海南", coordinates: [109.5119, 18.2528] },
  ];

  // wipe and reinsert known regions (idempotent)
  const regions = [...new Set(stationSeed.map((s) => s.regionName))];
  await Station.deleteMany({ regionName: { $in: regions } });

  const stationDocs = await Station.insertMany(
    stationSeed.map((s) => ({
      name: s.name,
      regionName: s.regionName,
      location: { type: "Point", coordinates: s.coordinates }, // [lon, lat]
    })),
  );

  function genSeries(stationId) {
    const arr = [];
    const start = new Date("2021-05-01T00:00:00Z");
    const signal = stationId.toString().slice(-1).charCodeAt(0) % 3;
    for (let i = 0; i < 60; i += 1) {
      const at = new Date(start.getTime() + i * 24 * 3600 * 1000);
      arr.push({
        stationId,
        at,
        sst: Number((22 + signal + Math.sin(i / 8) * 1.8).toFixed(2)),
        salinity: Number((30.5 + signal * 0.2 + Math.cos(i / 10) * 0.4).toFixed(2)),
        turbidity: Number((3.2 + signal * 0.3 + Math.sin(i / 6) * 0.6).toFixed(2)),
        chlorophyll: Number((1.6 + signal * 0.25 + Math.cos(i / 7) * 0.35).toFixed(2)),
        dissolvedOxygen: Number((6.9 + signal * 0.15 + Math.sin(i / 9) * 0.45).toFixed(2)),
      });
    }
    return arr;
  }

  await Observation.insertMany(stationDocs.flatMap((s) => genSeries(s._id)));
  // eslint-disable-next-line no-console
  console.log("[seed] inserted demo stations + observations");

  // eslint-disable-next-line no-console
  console.log("[seed] inserted demo datasets (published)");
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

