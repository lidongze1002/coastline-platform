<template>
  <div class="preview-page">
    <!-- 顶部工具栏 -->
    <div class="preview-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <span class="title">数据集预览 - {{ dataset?.name }}</span>
        <el-tag :type="dataset?.hasShoreline ? 'success' : 'danger'">
          {{ dataset?.hasShoreline ? '有海岸线数据' : '无海岸线数据' }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-button @click="goBack">返回</el-button>
        <el-button type="danger" :disabled="!canApprove" @click="handleReject">拒绝</el-button>
        <el-button type="success" :disabled="!canApprove" @click="handleApprove">审核通过</el-button>
      </div>
    </div>

    <!-- 数据信息 - 可折叠 -->
    <el-collapse v-model="activeCollapse" class="info-panel">
      <el-collapse-item title="数据集信息" name="info">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="区域">{{ dataset?.regionName }}</el-descriptions-item>
          <el-descriptions-item label="传感器">{{ dataset?.sensor }}</el-descriptions-item>
          <el-descriptions-item label="日期">{{ dataset?.date?.slice(0, 4) }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ dataset?.coastlineType }}</el-descriptions-item>
          <el-descriptions-item label="子类型">{{ dataset?.coastlineSubtype || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提取方法">{{ dataset?.method || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="dataset?.rejectReason" class="reject-reason">
          <div class="label">拒绝原因：</div>
          <div class="content">{{ dataset.rejectReason }}</div>
        </div>
        <div v-if="dataset?.description" class="description">
          <div class="label">数据详情：</div>
          <div class="content">{{ dataset.description }}</div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <!-- 地图 -->
    <div ref="mapEl" class="preview-map"></div>

    <!-- 拒绝原因对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="拒绝原因" width="400px">
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="4"
        placeholder="请输入拒绝原因，以便用户修改"
      />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";

import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils.js";

import { api } from "../utils/api";

const router = useRouter();
const route = useRoute();
const mapEl = ref<HTMLDivElement | null>(null);

const datasetId = route.params.id as string;
const dataset = ref<any>(null);
const loading = ref(false);
const activeCollapse = ref<string[]>(["info"]); // 默认展开

const rejectDialogVisible = ref(false);
const rejectReason = ref("");

let mapView: MapView | null = null;
let shorelineLayer: GraphicsLayer | null = null;

const canApprove = computed(() => dataset.value?.hasShoreline);

function goBack() {
  router.back();
}

async function loadDataset() {
  loading.value = true;
  try {
    const res = await api.get(`/api/datasets/${datasetId}/preview`);
    dataset.value = res.data.dataset;
    // 加载海岸线数据
    await loadShoreline();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载失败");
  } finally {
    loading.value = false;
  }
}

async function loadShoreline() {
  if (!mapView || !shorelineLayer) return;
  
  try {
    console.log("[loadShoreline] loading for dataset:", datasetId);
    const res = await api.get(`/api/datasets/${datasetId}/shoreline`);
    console.log("[loadShoreline] response:", res.data);
    const fc = res.data.geojson;
    if (!fc?.features) {
      console.log("[loadShoreline] no features in response");
      return;
    }

    const validFeatures = fc.features.filter((f: any) => f?.geometry);
    if (validFeatures.length === 0) {
      console.log("[loadShoreline] no valid features");
      return;
    }

    shorelineLayer.removeAll();

    // 计算中心点
    let totalLng = 0, totalLat = 0, count = 0;
    
    for (const f of validFeatures) {
      if (!f.geometry) continue;
      if (f.geometry.type !== "LineString" && f.geometry.type !== "MultiLineString") continue;
      
      const coords = f.geometry.type === "LineString" 
        ? [f.geometry.coordinates] 
        : f.geometry.coordinates;
      
      for (const line of coords) {
        for (const coord of line) {
          totalLng += coord[0];
          totalLat += coord[1];
          count++;
        }
      }

      const paths = f.geometry.type === "LineString" 
        ? [f.geometry.coordinates] 
        : f.geometry.coordinates;

      const geom = new Polyline({
        paths,
        spatialReference: { wkid: 4326 },
      });
      const geomInView = webMercatorUtils.geographicToWebMercator(geom);

      shorelineLayer.add(
        new Graphic({
          geometry: geomInView,
          symbol: {
            type: "simple-line",
            color: [0, 114, 198, 255],
            width: 2,
          },
        })
      );
    }

    // 定位到数据范围
    if (count > 0) {
      const centerLng = totalLng / count;
      const centerLat = totalLat / count;
      mapView?.goTo({
        center: [centerLng, centerLat],
        zoom: 10,
      });
      ElMessage.success(`已加载 ${validFeatures.length} 条海岸线`);
    }
  } catch (e: any) {
    console.error("[loadShoreline] error:", e);
    const msg = e?.response?.data?.message || "加载海岸线失败";
    ElMessage.warning(msg);
  }
}

async function handleApprove() {
  try {
    await api.patch(`/api/datasets/${datasetId}/approve`);
    ElMessage.success("审核通过");
    router.back();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "操作失败");
  }
}

async function handleReject() {
  rejectDialogVisible.value = true;
}

async function confirmReject() {
  try {
    await api.patch(`/api/datasets/${datasetId}/reject`, { reason: rejectReason.value });
    ElMessage.success("已拒绝");
    router.back();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "操作失败");
  }
}

function initMap() {
  if (!mapEl.value) return;

  const map = new Map({ basemap: "osm" });
  mapView = new MapView({
    container: mapEl.value,
    map,
    center: [115, 32],
    zoom: 4,
  });

  shorelineLayer = new GraphicsLayer();
  map.add(shorelineLayer);
}

onMounted(() => {
  initMap();
  loadDataset();
});
</script>

<style scoped>
.preview-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  background: #fff;
}

@media (max-width: 768px) {
  .info-panel {
    display: none;
  }
  
  .preview-header {
    padding: 8px 12px;
  }
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-weight: 700;
  font-size: 16px;
}

.header-right {
  display: flex;
  gap: 8px;
}

.info-panel {
  padding: 0;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

.reject-reason {
  margin-top: 12px;
  padding: 12px;
  background: #fff1f0;
  border-left: 3px solid #ff4d4f;
  border-radius: 4px;
}

.reject-reason .label {
  font-weight: 600;
  color: #cf1322;
  margin-bottom: 4px;
}

.reject-reason .content {
  color: #434343;
}

:deep(.el-collapse-item__header) {
  padding: 0 16px;
}

:deep(.el-collapse-item__content) {
  padding: 12px 16px;
}

.description {
  margin-top: 12px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.description .label {
  font-weight: 600;
  margin-bottom: 4px;
}

.preview-map {
  flex: 1;
  width: 100%;
}
</style>