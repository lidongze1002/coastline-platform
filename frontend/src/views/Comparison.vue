<template>
  <div class="comparison-container">
    <div class="comparison-header">
      <h2>海岸线多期对比分析 - {{ regionName }}</h2>
      <div style="display: flex; gap: 8px">
        <el-button @click="exportMap" type="primary">
          导出图片
        </el-button>
        <el-button @click="closeWindow">关闭</el-button>
      </div>
    </div>
    
    <div class="comparison-controls">
      <el-checkbox-group v-model="selectedDatasetIds" @change="updateOverlay">
        <el-checkbox v-for="ds in datasets" :key="ds.id" :value="ds.id">
          {{ formatDate(ds.date) }}
        </el-checkbox>
      </el-checkbox-group>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.7">
        提示：取消选中可隐藏对应年份的海岸线
      </div>
    </div>
    
    <div class="single-map-container">
      <div ref="mapEl" class="map-view"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import ArcGISMap from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";

import { api } from "../utils/api";

interface Dataset {
  id: string;
  name: string;
  sensor: string;
  date: string;
  regionName: string;
}

const route = useRoute();
const mapEl = ref<HTMLDivElement | null>(null);
const datasets = ref<Dataset[]>([]);
const selectedDatasetIds = ref<string[]>([]);

let map: ArcGISMap | null = null;
let view: MapView | null = null;
let overlayLayer: GraphicsLayer | null = null;

// 颜色配置：不同年份显示不同颜色
const COLORS = [
  [255, 0, 0, 0.9],      // 红色-最早
  [255, 165, 0, 0.9],   // 橙色
  [255, 255, 0, 0.9],  // 黄色
  [0, 255, 0, 0.9],    // 绿色
  [0, 0, 255, 0.9],    // 蓝色-最晚
  [128, 0, 128, 0.9],  // 紫色
  [0, 255, 255, 0.9],  // 青色
];

// 获取token：优先从URL参数，否则从localStorage
function getToken(): string | null {
  const urlToken = route.query.token as string;
  if (urlToken) return urlToken;
  return localStorage.getItem("coastline.token");
}

const regionName = computed(() => {
  return datasets.value[0]?.regionName || "对比";
});

function formatDate(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

function closeWindow() {
  window.close();
}

async function loadDatasets() {
  const ids = (route.query.ids as string)?.split(",") || [];
  if (ids.length === 0) {
    ElMessage.error("没有数据集");
    return;
  }
  
  const token = getToken();
  if (!token) {
    // 没有token，跳转到登录页面并返回当前URL
    window.location.href = "/login?redirect=" + encodeURIComponent(window.location.href);
    return;
  }
  
  // 批量加载数据集信息
  const loaded: Dataset[] = [];
  for (const id of ids) {
    try {
      const res = await api.get(`/api/datasets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loaded.push(res.data.dataset);
    } catch (e) {
      console.error("Failed to load dataset:", id);
    }
  }
  
  datasets.value = loaded.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  selectedDatasetIds.value = loaded.map(d => d.id);
  
  // 初始化地图
  await initMap();
  
  // 加载所有海岸线数据
  await loadAllShorelines();
}

async function initMap() {
  if (!mapEl.value) return;
  
  map = new ArcGISMap({ basemap: "osm" });
  view = new MapView({
    container: mapEl.value,
    map,
    center: getRegionCenter(datasets.value[0]?.regionName || ""),
    zoom: getRegionZoom(datasets.value[0]?.regionName || ""),
  });
  
  overlayLayer = new GraphicsLayer({ id: "overlay-layer" });
  map.add(overlayLayer);
}

async function loadAllShorelines() {
  if (!overlayLayer) return;
  
  overlayLayer.removeAll();
  
  for (let i = 0; i < selectedDatasetIds.value.length; i++) {
    const dsId = selectedDatasetIds.value[i];
    const ds = datasets.value.find(d => d.id === dsId);
    if (!ds) continue;
    
    const color = COLORS[i % COLORS.length];
    await loadShoreline(dsId, ds, color, i);
  }
}

async function loadShoreline(_id: string, ds: Dataset, color: number[], index: number) {
  const token = getToken();
  if (!token) return;
  
  try {
    const res = await api.get(`/api/datasets/${ds.id}/shoreline`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const fc = res.data.geojson;
    if (!fc?.features?.length) return;
    
    for (const f of fc.features) {
      if (!f?.geometry) continue;
      if (f.geometry.type !== "LineString" && f.geometry.type !== "MultiLineString") continue;
      
      const paths = f.geometry.type === "LineString" 
        ? [f.geometry.coordinates] 
        : f.geometry.coordinates;
      
      const geom = new Polyline({
        paths,
        spatialReference: { wkid: 4326 },
      });
      
      overlayLayer!.add(
        new Graphic({
          geometry: geom,
          symbol: {
            type: "simple-line",
            color: color as any,
            width: 2.5,
          },
          attributes: {
            year: formatDate(ds.date),
            index,
          },
        })
      );
    }
  } catch (e) {
    console.error("Failed to load shoreline:", e);
  }
}

function updateOverlay() {
  loadAllShorelines();
}

async function exportMap() {
  if (!view || datasets.value.length === 0) {
    ElMessage.warning("没有可导出的数据");
    return;
  }
  
  try {
    // 确保地图已完全加载
    await view.when();
    
    const screenshot = await view.takeScreenshot();
    
    // ArcGIS screenshot.data can be ImageData or base64 string
    if (!screenshot || !screenshot.data) {
      ElMessage.error("截图为空，请确保地图已加载完成");
      return;
    }
    
    // 检查数据类型
    let imageDataUrl: string;
    if (typeof screenshot.data === 'string') {
      imageDataUrl = "data:image/png;base64," + screenshot.data;
    } else if (screenshot.data instanceof ImageData) {
      // 如果是 ImageData，转换为 canvas 再导出
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = screenshot.data.width;
      tempCanvas.height = screenshot.data.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.putImageData(screenshot.data, 0, 0);
        imageDataUrl = tempCanvas.toDataURL("image/png");
      } else {
        ElMessage.error("无法创建临时画布");
        return;
      }
    } else {
      ElMessage.error("不支持的截图格式");
      return;
    }
    
    // 获取当前屏幕尺寸，计算600DPI的高分辨率尺寸
    const scaleFactor = 600 / 96;  // 约6.25倍
    const baseW = view.width;
    const baseH = view.height;
    const w = Math.round(baseW * scaleFactor);
    const h = Math.round(baseH * scaleFactor);
    
    if (baseW === 0 || baseH === 0) {
      ElMessage.error("地图尺寸无效");
      return;
    }
    
    // 创建画布
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      ElMessage.error("无法创建画布上下文");
      return;
    }
    
    const scale = scaleFactor;
    
    const img = new Image();
    img.src = imageDataUrl;
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        // 使用平滑插值放大图片
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        
        // 添加美化图例 - 右下角
        const legendW = 240 * scale;
        const legendH = (50 + datasets.value.length * 24) * scale;
        const legendX = w - legendW - 20 * scale;
        const legendY = h - legendH - 20 * scale;
        
        // 图例背景 - 带圆角效果的半透明深色底
        ctx.fillStyle = "rgba(20, 25, 35, 0.85)";
        ctx.beginPath();
        ctx.roundRect(legendX, legendY, legendW, legendH, 8 * scale);
        ctx.fill();
        
        // 图例边框
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
        
        // 图例标题
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${15 * scale}px "Microsoft YaHei", Arial, sans-serif`;
        ctx.fillText(`${regionName.value} 海岸线多期对比`, legendX + 12 * scale, legendY + 26 * scale);
        
        // 分隔线
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.moveTo(legendX + 12 * scale, legendY + 40 * scale);
        ctx.lineTo(legendX + legendW - 12 * scale, legendY + 40 * scale);
        ctx.stroke();
        
        // 图例内容 - 各年份海岸线
        ctx.font = `${13 * scale}px "Microsoft YaHei", Arial, sans-serif`;
        for (let i = 0; i < datasets.value.length; i++) {
          const ds = datasets.value[i];
          const color = COLORS[i % COLORS.length];
          const lineY = legendY + 60 * scale + i * 22 * scale;
          
          // 颜色条
          ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
          ctx.fillRect(legendX + 14 * scale, lineY - 10 * scale, 18 * scale, 4 * scale);
          
          // 年份文字
          ctx.fillStyle = "#e8e8e8";
          ctx.fillText(formatDate(ds.date), legendX + 40 * scale, lineY);
        }
        
        // 添加比例尺 - 左下角
        const scaleW = 200 * scale;
        const scaleH = 44 * scale;
        const scaleX = 20 * scale;
        const scaleY = h - scaleH - 20 * scale;
        
        // 比例尺背景
        ctx.fillStyle = "rgba(20, 25, 35, 0.85)";
        ctx.beginPath();
        ctx.roundRect(scaleX, scaleY, scaleW, scaleH, 6 * scale);
        ctx.fill();
        
        // 比例尺刻度
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(scaleX + 18 * scale, scaleY + 14 * scale);
        ctx.lineTo(scaleX + 18 * scale, scaleY + 30 * scale);
        ctx.lineTo(scaleX + scaleW - 12 * scale, scaleY + 30 * scale);
        ctx.lineTo(scaleX + scaleW - 12 * scale, scaleY + 14 * scale);
        ctx.stroke();
        
        // 比例尺文字
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${14 * scale}px Arial`;
        ctx.fillText("~10 km", scaleX + 65 * scale, scaleY + 26 * scale);
        
        resolve();
      };
      img.onerror = () => reject(new Error("图片加载失败"));
    });
    
    // 下载
    const link = document.createElement("a");
    link.download = `coastline-comparison-${regionName.value}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    ElMessage.success("导出成功（600DPI）");
  } catch (e: any) {
    console.error(e);
    ElMessage.error("导出失败");
  }
}

function getRegionCenter(region: string): [number, number] {
  if (region.includes("海南")) return [109.7, 19.2];
  if (region.includes("东海区") || region.includes("东海")) return [121.0, 28.0];
  if (region.includes("粤港澳") || region.includes("大湾区")) return [113.5, 22.2];
  return [115.0, 32.0];
}

function getRegionZoom(region: string): number {
  if (region.includes("海南")) return 9;
  if (region.includes("东海区") || region.includes("东海")) return 6;
  if (region.includes("粤港澳") || region.includes("大湾区")) return 9;
  return 4;
}

onMounted(() => {
  loadDatasets();
});
</script>

<style scoped>
.comparison-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.comparison-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.comparison-controls {
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #eee;
}

.single-map-container {
  flex: 1;
  padding: 8px;
}

.map-view {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>