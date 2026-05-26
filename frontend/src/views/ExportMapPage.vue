<template>
  <div class="export-page-container">
    <!-- 左侧控制面板 -->
    <div class="control-panel">
      <div class="panel-header">
        <el-icon class="header-icon"><Picture /></el-icon>
        <span class="header-title">地图出图</span>
      </div>
      
      <!-- 纸张设置 -->
      <div class="control-section">
        <div class="section-label">纸张</div>
        <div class="section-content">
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <el-radio-group v-model="paperSize" style="flex: 1;">
              <el-radio-button value="A4 Portrait">A4 纵向</el-radio-button>
              <el-radio-button value="A4 Landscape">A4 横向</el-radio-button>
            </el-radio-group>
          </div>
          <div style="display: flex; gap: 8px;">
            <el-radio-group v-model="paperSize" style="flex: 1;">
              <el-radio-button value="A3 Portrait">A3 纵向</el-radio-button>
              <el-radio-button value="A3 Landscape">A3 横向</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </div>
      
      <!-- 标题设置 -->
      <div class="control-section">
        <div class="section-label">标题</div>
        <div class="section-content">
          <el-input 
            v-model="titleText" 
            placeholder="地图标题" 
            clearable
          />
        </div>
      </div>
      
      <!-- 作者设置 -->
      <div class="control-section">
        <div class="section-label">作者/来源</div>
        <div class="section-content">
          <el-input 
            v-model="authorText" 
            placeholder="作者名称" 
            clearable
          />
        </div>
      </div>
      
      <!-- 导出格式 -->
      <div class="control-section">
        <div class="section-label">格式</div>
        <div class="section-content">
          <el-radio-group v-model="exportFormat" class="full-width">
            <el-radio-button value="pdf">PDF</el-radio-button>
            <el-radio-button value="png32">PNG</el-radio-button>
            <el-radio-button value="jpg">JPG</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      
      <!-- DPI 设置 -->
      <div class="control-section">
        <div class="section-label">分辨率 (DPI)</div>
        <div class="section-content">
          <el-radio-group v-model="dpi" class="full-width">
            <el-radio-button :value="96">96 (屏幕)</el-radio-button>
            <el-radio-button :value="150">150 (中等)</el-radio-button>
            <el-radio-button :value="300">300 (打印)</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      
      <!-- 样式设置 -->
      <div class="control-section" style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed #ddd;">
        <div class="section-label" style="color: #409eff;">地图元素样式</div>
        
        <!-- 标题设置 -->
        <div class="style-row">
          <span class="style-label">标题字体</span>
          <el-slider v-model="styleConfig.titleFontSize" :min="16" :max="36" :step="2" show-stops />
          <span class="style-value">{{ styleConfig.titleFontSize }}px</span>
        </div>
        
        <div class="style-row">
          <span class="style-label">标题宽度</span>
          <el-slider v-model="styleConfig.titleWidth" :min="300" :max="800" :step="50" show-stops />
          <span class="style-value">{{ styleConfig.titleWidth }}px</span>
        </div>
        
        <div class="style-row">
          <span class="style-label">标题背景</span>
          <el-color-picker v-model="styleConfig.titleBgColor" show-alpha />
        </div>
        
        <div class="style-row">
          <span class="style-label">标题颜色</span>
          <el-color-picker v-model="styleConfig.titleColor" />
        </div>
        
        <!-- 图例设置 -->
        <div class="style-row">
          <span class="style-label">图例宽度</span>
          <el-slider v-model="styleConfig.legendWidth" :min="150" :max="500" :step="10" show-stops />
          <span class="style-value">{{ styleConfig.legendWidth }}px</span>
        </div>
        
        <div class="style-row">
          <span class="style-label">图例高度</span>
          <el-slider v-model="styleConfig.legendHeight" :min="80" :max="400" :step="10" show-stops />
          <span class="style-value">{{ styleConfig.legendHeight }}px</span>
        </div>
        
        <div class="style-row">
          <span class="style-label">图例背景</span>
          <el-color-picker v-model="styleConfig.legendBgColor" show-alpha />
        </div>
        
        <div class="style-row">
          <span class="style-label">图例字体</span>
          <el-slider v-model="styleConfig.legendFontSize" :min="10" :max="18" :step="1" show-stops />
          <span class="style-value">{{ styleConfig.legendFontSize }}px</span>
        </div>
        
        <!-- 显示选项 - 垂直排列 -->
        <div class="style-row" style="flex-direction: column; align-items: flex-start;">
          <el-checkbox v-model="styleConfig.showLegend">显示图例</el-checkbox>
          <el-checkbox v-model="styleConfig.showScale">显示比例尺</el-checkbox>
          <el-checkbox v-model="styleConfig.showNorth">显示北向标</el-checkbox>
        </div>
      </div>
      
      <!-- 图例 -->
      <div class="control-section">
        <div class="section-label">图例</div>
        <div class="legend-list" v-if="legendItems.length > 0">
          <div v-for="(item, idx) in legendItems" :key="item.id" class="legend-item">
            <div class="legend-style">
              <div :class="'style-' + (idx % 3 === 0 ? 'solid' : idx % 3 === 1 ? 'dashed' : 'dotted')" :style="{ backgroundColor: item.color }"></div>
            </div>
            <div class="legend-name" :title="item.name">{{ item.name }}</div>
            <div class="legend-year">({{ item.year }})</div>
            <div class="legend-style-name">{{ item.lineStyle }}</div>
          </div>
        </div>
        <div v-else class="legend-empty">
          暂无数据
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="control-actions">
        <el-button :type="previewMode ? 'warning' : 'default'" @click="togglePreview" class="action-button">
          {{ previewMode ? '退出预览' : '预览样式' }}
        </el-button>
        <el-button type="success" @click="toggleFullscreenPreview" class="action-button">
          全屏预览
        </el-button>
        <el-button type="primary" :loading="exporting" @click="handlePrint" class="action-button">
          导出打印
        </el-button>
        <el-button @click="goBack" class="action-button">
          返回
        </el-button>
      </div>
      
      <!-- 提示 -->
      <div class="tip-info">
        使用 ArcGIS Online 打印服务生成专业地图
      </div>
    </div>
    
    <!-- 右侧地图预览 -->
    <div class="canvas-preview">
      <!-- 地图容器 -->
      <div ref="mapEl" class="map-container" :class="{ 'preview-mode': previewMode }"></div>
      
      <!-- 实时样式预览层 -->
      <div v-if="previewMode" class="preview-overlay" :style="getPreviewOverlayStyle()">
        <!-- 标题预览 -->
        <div v-if="titleText" class="preview-title" :style="getTitleStyle()">
          {{ titleText }}
          <div class="preview-author">{{ authorText || "海洋地理信息系统" }}</div>
        </div>
        
        <!-- 图例预览 -->
        <div v-if="styleConfig.showLegend && legendItems.length > 0" class="preview-legend" :style="getLegendStyle()">
          <div class="preview-legend-title">图例</div>
          <div v-for="(item, idx) in legendItems" :key="item.id" class="preview-legend-item">
            <div class="preview-legend-color" :class="'style-' + item.lineStyle" :style="{ backgroundColor: item.color }"></div>
            <span class="legend-text">{{ item.name.substring(0, Math.floor(styleConfig.legendWidth / 8)) }}{{ item.name.length > styleConfig.legendWidth / 8 ? '...' : '' }} ({{ item.year }})</span>
          </div>
        </div>
        
        <!-- 比例尺预览 -->
        <div v-if="styleConfig.showScale" class="preview-scale">
          比例尺 1:1000000
        </div>
        
        <!-- 北向标预览 -->
        <div v-if="styleConfig.showNorth" class="preview-north">
          N
          <div class="preview-arrow"></div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 全屏预览弹窗 -->
  <el-dialog v-model="previewFullscreen" title="全屏预览" width="90%" :close-on-click-modal="false">
    <div class="fullscreen-preview">
      <div class="fullscreen-map" ref="fullscreenMapEl"></div>
      <!-- 拖动预览层 -->
      <div class="preview-overlay-fullscreen">
        <!-- 标题 -->
        <div v-if="titleText" 
             class="draggable-element preview-title"
             :style="getTitlePreviewStyle()"
             @mousedown="startDrag($event, 'title')">
          {{ titleText }}
          <div class="preview-author">{{ authorText || "海洋地理信息系统" }}</div>
        </div>
        
        <!-- 图例 -->
        <div v-if="styleConfig.showLegend && legendItems.length > 0" 
             class="draggable-element preview-legend"
             :style="getLegendPreviewStyle()"
             @mousedown="startDrag($event, 'legend')">
          <!-- 右侧拖动调整宽度 -->
          <div class="resize-handle resize-handle-right" @mousedown.stop="startResize($event, 'width')"></div>
          <!-- 底部拖动调整高度 -->
          <div class="resize-handle resize-handle-bottom" @mousedown.stop="startResize($event, 'height')"></div>
          <!-- 右下角同时调整宽高 -->
          <div class="resize-handle resize-handle-corner" @mousedown.stop="startResize($event, 'both')"></div>
          
          <div class="preview-legend-title">图例</div>
          <div v-for="item in legendItems" :key="item.id" class="preview-legend-item">
            <div class="preview-legend-color" :class="'style-' + item.lineStyle" :style="{ backgroundColor: item.color }"></div>
            <span class="legend-text">{{ item.name.substring(0, Math.floor(styleConfig.legendWidth / 8)) }}{{ item.name.length > styleConfig.legendWidth / 8 ? '...' : '' }} ({{ item.year }})</span>
          </div>
        </div>
        
        <!-- 比例尺（黑白相间风格） -->
        <div v-if="styleConfig.showScale" 
             class="draggable-element preview-scale"
             :style="getScalePreviewStyle()"
             @mousedown="startDrag($event, 'scale')">
          <div class="scale-bar">
            <div class="scale-segment"></div>
            <div class="scale-segment"></div>
            <div class="scale-segment"></div>
            <div class="scale-segment"></div>
            <div class="scale-segment"></div>
          </div>
          <div class="scale-label">比例尺 1:1000000</div>
        </div>
        
        <!-- 北向标 -->
        <div v-if="styleConfig.showNorth" 
             class="draggable-element preview-north"
             :style="getNorthPreviewStyle()"
             @mousedown="startDrag($event, 'north')">
          <div class="north-arrow"></div>
          <span class="north-label">N</span>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="previewFullscreen = false">关闭</el-button>
      <el-button type="primary" @click="handlePrint">导出打印</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { Picture } from "@element-plus/icons-vue";

import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import ScaleBar from "@arcgis/core/widgets/ScaleBar.js";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils.js";
import * as print from "@arcgis/core/rest/print.js";
import PrintTemplate from "@arcgis/core/rest/support/PrintTemplate.js";
import PrintParameters from "@arcgis/core/rest/support/PrintParameters.js";
import esriConfig from "@arcgis/core/config.js";

import { api } from "../utils/api";
import { useAuthStore } from "../stores/auth";
import { DATASET_COLORS, getDatasetColorString } from "../utils/colors";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// ArcGIS Online 打印服务 URL
const PRINT_SERVICE_URL = "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task";

// 颜色配置已移至 utils/colors.ts

// 图例数据
const legendItems = ref<{id: string, name: string, year: number, color: string, lineStyle: string, lineStyleName: string}[]>([]);

// 打印参数
const paperSize = ref<"A4 Landscape" | "A4 Portrait" | "A3 Landscape" | "A3 Portrait" | "MAP_ONLY">("A4 Landscape");
const titleText = ref("海岸线分布图");
const authorText = ref(authStore.user?.username || "海洋地理信息系统");
const exportFormat = ref<"pdf" | "png32" | "jpg">("pdf");
const dpi = ref<96 | 150 | 300>(300);
const exporting = ref(false);

// 样式配置
const styleConfig = ref({
  titleFontSize: 24,
  titleWidth: 600,
  titleColor: "#ffffff",
  titleBgColor: "rgba(0, 0, 0, 0.7)",
  legendWidth: 250,
  legendHeight: 150,
  legendFontSize: 12,
  legendBgColor: "rgba(255, 255, 255, 0.95)",
  showLegend: true,
  showScale: true,
  showNorth: true,
  // 位置配置 (全屏预览中的初始位置)
  titlePosition: { x: 30, y: 30 },
  legendPosition: { x: 30, y: 100 },
  scalePosition: { x: 30, y: 200 },
  northPosition: { x: 30, y: 280 },
});

// 预览模式
const previewMode = ref(false);
const previewFullscreen = ref(false);

// 切换预览
function togglePreview() {
  previewMode.value = !previewMode.value;
}

// 切换全屏预览
function toggleFullscreenPreview() {
  previewFullscreen.value = !previewFullscreen.value;
  if (previewFullscreen.value) {
    previewMode.value = true;
    // 延迟初始化全屏地图，确保DOM已渲染
    setTimeout(() => {
      initFullscreenMap();
    }, 100);
  }
}

// 初始化全屏地图 - 复用主地图
async function initFullscreenMap() {
  if (!fullscreenMapEl.value) return;
  if (fullscreenMapView) {
    // 如果已初始化，直接显示
    fullscreenMapView.visible = true;
    return;
  }
  
  // 复用主地图的map对象和图层
  if (mapView && mapView.map) {
    fullscreenMapView = new MapView({
      container: fullscreenMapEl.value,
      map: mapView.map,  // 复用同一个map
      center: mapView.center,
      zoom: mapView.zoom,
      ui: {
        components: [],
      },
    });
  } else {
    // 如果主地图还没初始化，创建一个新的
    const map = new Map({
      basemap: "osm",
    });
    
    fullscreenMapView = new MapView({
      container: fullscreenMapEl.value,
      map,
      center: [115, 32],
      zoom: 4,
      ui: {
        components: [],
      },
    });
  }
  
  await fullscreenMapView.when(() => {
    console.log("全屏地图已加载");
  });
}

// 拖动相关状态
const dragging = ref<string | null>(null);
const dragStartPos = ref({ x: 0, y: 0 });
const dragElementStartPos = ref({ x: 0, y: 0 });

// 开始拖动
function startDrag(e: MouseEvent, element: string) {
  dragging.value = element;
  dragStartPos.value = { x: e.clientX, y: e.clientY };
  
  // 记录元素当前位置
  if (element === 'title') {
    dragElementStartPos.value = { ...styleConfig.value.titlePosition };
  } else if (element === 'legend') {
    dragElementStartPos.value = { ...styleConfig.value.legendPosition };
  } else if (element === 'scale') {
    dragElementStartPos.value = { ...styleConfig.value.scalePosition };
  } else if (element === 'north') {
    dragElementStartPos.value = { ...styleConfig.value.northPosition };
  }
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

// 拖动中
function onDrag(e: MouseEvent) {
  if (!dragging.value) return;
  
  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  
  const newX = dragElementStartPos.value.x + dx;
  const newY = dragElementStartPos.value.y + dy;
  
  // 更新位置
  if (dragging.value === 'title') {
    styleConfig.value.titlePosition = { x: newX, y: newY };
  } else if (dragging.value === 'legend') {
    styleConfig.value.legendPosition = { x: newX, y: newY };
  } else if (dragging.value === 'scale') {
    styleConfig.value.scalePosition = { x: newX, y: newY };
  } else if (dragging.value === 'north') {
    styleConfig.value.northPosition = { x: newX, y: newY };
  }
}

// 停止拖动
function stopDrag() {
  dragging.value = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// 图例调整大小相关状态
const resizing = ref<string | null>(null);
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeStartDim = ref({ width: 0, height: 0 });

// 开始调整大小
function startResize(e: MouseEvent, direction: string) {
  resizing.value = direction;
  resizeStartPos.value = { x: e.clientX, y: e.clientY };
  resizeStartDim.value = { 
    width: styleConfig.value.legendWidth, 
    height: styleConfig.value.legendHeight 
  };
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
}

// 调整大小中
function onResize(e: MouseEvent) {
  if (!resizing.value) return;
  
  const dx = e.clientX - resizeStartPos.value.x;
  const dy = e.clientY - resizeStartPos.value.y;
  
  if (resizing.value === 'width' || resizing.value === 'both') {
    styleConfig.value.legendWidth = Math.max(150, Math.min(500, resizeStartDim.value.width + dx));
  }
  if (resizing.value === 'height' || resizing.value === 'both') {
    styleConfig.value.legendHeight = Math.max(80, Math.min(400, resizeStartDim.value.height + dy));
  }
}

// 停止调整大小
function stopResize() {
  resizing.value = null;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
}

// 获取预览层样式
function getPreviewOverlayStyle() {
  return {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 10,
  };
}

// 获取标题样式
function getTitleStyle() {
  const s = styleConfig.value;
  return {
    position: "absolute",
    top: "10px",
    left: "10px",
    right: "10px",
    height: "50px",
    background: s.titleBgColor,
    color: s.titleColor,
    fontSize: `${s.titleFontSize}px`,
    fontWeight: "bold",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "4px",
  };
}

// 全屏预览标题样式（带位置和宽度）
function getTitlePreviewStyle() {
  const s = styleConfig.value;
  const pos = s.titlePosition;
  return {
    position: "absolute",
    top: pos.y + "px",
    left: pos.x + "px",
    width: s.titleWidth + "px",
    background: s.titleBgColor,
    color: s.titleColor,
    fontSize: `${s.titleFontSize}px`,
    fontWeight: "bold",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "4px",
    padding: "8px 16px",
    cursor: "move",
  };
}

// 获取图例样式
function getLegendStyle() {
  const s = styleConfig.value;
  return {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    width: `${s.legendWidth}px`,
    maxHeight: "200px",
    background: s.legendBgColor,
    fontSize: `${s.legendFontSize}px`,
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #333",
    overflow: "hidden",
  };
}

// 全屏预览图例样式（带位置）
function getLegendPreviewStyle() {
  const s = styleConfig.value;
  const pos = s.legendPosition;
  return {
    position: "absolute",
    top: pos.y + "px",
    left: pos.x + "px",
    width: `${s.legendWidth}px`,
    height: `${s.legendHeight}px`,
    background: s.legendBgColor,
    fontSize: `${s.legendFontSize}px`,
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #333",
    cursor: "move",
  };
}

// 比例尺预览样式（黑白相间风格）
function getScalePreviewStyle() {
  const s = styleConfig.value;
  const pos = s.scalePosition;
  return {
    position: "absolute",
    top: pos.y + "px",
    left: pos.x + "px",
    cursor: "move",
  };
}

// 北向标预览样式
function getNorthPreviewStyle() {
  const s = styleConfig.value;
  const pos = s.northPosition;
  return {
    position: "absolute",
    top: pos.y + "px",
    left: pos.x + "px",
    width: "40px",
    height: "40px",
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "50%",
    border: "2px solid #333",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "move",
  };
}

// 地图
let mapView: MapView | null = null;
let fullscreenMapView: MapView | null = null;
let shorelineLayer: GraphicsLayer | null = null;
let scaleBar: any = null;
const mapEl = ref<HTMLDivElement | null>(null);
const fullscreenMapEl = ref<HTMLDivElement | null>(null);

const LINE_STYLES = ["solid", "dashed", "dot"] as const;
const LINE_STYLE_NAMES = ["实线", "虚线", "点线"] as const;

// 区域中心点映射
function getRegionCenterFromName(name: string): [number, number] {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("厦门") || lowerName.includes("泉州") || lowerName.includes("海峡")) return [118.14, 24.48];
  if (lowerName.includes("青岛") || lowerName.includes("胶州") || lowerName.includes("山东")) return [120.3, 36.1];
  if (lowerName.includes("上海")) return [121.5, 31.2];
  if (lowerName.includes("广东") || lowerName.includes("广州") || lowerName.includes("深圳")) return [113.5, 23.5];
  if (lowerName.includes("福建")) return [118.5, 26.5];
  if (lowerName.includes("浙江")) return [120.5, 29.0];
  if (lowerName.includes("江苏")) return [120.0, 32.5];
  if (lowerName.includes("辽宁")) return [122.0, 40.0];
  if (lowerName.includes("河北") || lowerName.includes("天津")) return [117.5, 39.5];
  if (lowerName.includes("海南")) return [110.0, 19.0];
  if (lowerName.includes("台湾")) return [121.5, 24.0];
  if (lowerName.includes("广西")) return [108.5, 22.5];
  if (lowerName.includes("渭河") || lowerName.includes("甘肃")) return [105.0, 35.0];
  // 中国默认中心
  return [115.0, 32.0];
}

// 区域缩放级别
function getRegionZoomFromName(name: string): number {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("厦门") || lowerName.includes("泉州")) return 11;
  if (lowerName.includes("青岛") || lowerName.includes("胶州")) return 11;
  if (lowerName.includes("渭河") || lowerName.includes("甘肃")) return 8;
  if (lowerName.includes("县") || lowerName.includes("市")) return 12;
  if (lowerName.includes("省") || lowerName.includes("区")) return 7;
  if (lowerName.includes("中国大陆") || lowerName.includes("中国海岸线")) return 5;
  return 6;
}

// 加载选中的海岸线数据
async function loadSelectedCoastlines() {
  const datasetIds = (route.query.datasets as string)?.split(",") || [];
  if (datasetIds.length === 0) {
    ElMessage.warning("请先在地图页面选择海岸线");
    return;
  }
  
  ElMessage.info(`正在加载 ${datasetIds.length} 个数据集...`);
  
  for (let i = 0; i < datasetIds.length; i++) {
    const datasetId = datasetIds[i];
    const color = DATASET_COLORS[i % DATASET_COLORS.length];
    const lineStyle = LINE_STYLES[i % LINE_STYLES.length];
    console.log(`加载 ${i}: color=${color}, lineStyle=${lineStyle}`);
    await loadDatasetShoreline(datasetId, color, lineStyle);
  }
  
  console.log("图例数据:", legendItems.value);
  
  // 使用与主页相同的定位方式 - 根据区域名
  if (legendItems.value.length > 0) {
    const firstItem = legendItems.value[0];
    // 获取第一个数据集的区域信息来定位
    const regionCenter = getRegionCenterFromName(firstItem.name);
    const regionZoom = getRegionZoomFromName(firstItem.name);
    mapView?.goTo({
      center: regionCenter,
      zoom: regionZoom,
    }, { duration: 400 });
  }
  
  ElMessage.success("海岸线加载完成");
}

async function loadDatasetShoreline(datasetId: string, color: number[], lineStyle: string = "solid") {
  try {
    // 获取数据集信息
    const dsRes = await api.get(`/api/datasets/${datasetId}`);
    const dataset = dsRes.data.dataset;
    
    // 转RGB颜色为字符串
    const colorStr = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    const year = new Date(dataset.date).getFullYear();
    
    // 添加图例项
    const lineStyleName = lineStyle === "dot" ? "点线" : (lineStyle === "dashed" ? "虚线" : "实线");
    legendItems.value.push({
      id: datasetId,
      name: dataset.name,
      year,
      color: colorStr,
      lineStyle: lineStyle,
      lineStyleName: lineStyleName,
    });
    
    // 获取海岸线数据
    const res = await api.get(`/api/datasets/${datasetId}/shoreline`);
    const fc = res.data.geojson;
    const features = fc?.features?.filter((f: any) => f?.geometry) || [];
    
    for (const f of features) {
      if (!f.geometry) continue;
      if (f.geometry.type !== "LineString" && f.geometry.type !== "MultiLineString") continue;
      
      const paths = f.geometry.type === "LineString" 
        ? [f.geometry.coordinates] 
        : f.geometry.coordinates;
      
      const geom = new Polyline({
        paths,
        spatialReference: { wkid: 4326 },
      });
      
      const geomInView = webMercatorUtils.geographicToWebMercator(geom);
      
      if (shorelineLayer) {
        shorelineLayer.add(
          new Graphic({
            geometry: geomInView,
            symbol: {
              type: "simple-line",
              color: [color[0], color[1], color[2], 255],
              width: 0.8,
              style: lineStyle as any,
            },
          })
        );
      }
    }
  } catch (e) {
    console.error("加载失败:", datasetId, e);
  }
}

// 执行打印 - 使用截图方案（更稳定）
async function handlePrint() {
  if (!mapView) {
    ElMessage.error("地图未加载");
    return;
  }
  
  exporting.value = true;
  
  try {
    // 1. 先尝试截图方案（稳定）
    ElMessage.info("正在生成地图截图...");
    await takeScreenshot();
    ElMessage.success("地图截图已保存!");
  } catch (e: any) {
    console.error("截图失败:", e);
    ElMessage.error("生成失败: " + (e.message || "未知错误"));
  } finally {
    exporting.value = false;
  }
}

// 尝试 ArcGIS 打印服务
async function tryArcGISPrint(): Promise<boolean> {
  if (!mapView) return false;
  
  // 格式映射
  const formatMap: Record<string, string> = {
    "pdf": "PDF",
    "png32": "PNG32", 
    "jpg": "JPG"
  };
  const layoutMap: Record<string, string> = {
    "A4 Portrait": "A4 Portrait",
    "A4 Landscape": "A4 Landscape",
    "A3 Portrait": "A3 Portrait",
    "A3 Landscape": "A3 Landscape"
  };
  
  const template = new PrintTemplate({
    format: formatMap[exportFormat.value] || "PDF",
    exportOptions: { 
      dpi: dpi.value,
      // 添加抗锯齿
      antialias: true,
    },
    layout: layoutMap[paperSize.value] || "A4 Landscape",
    layoutOptions: {
      titleText: titleText.value,
      authorText: authorText.value,
      // 添加图例
      legendLayers: [],
    },
  } as any);
  
  const params = new PrintParameters({ 
    view: mapView, 
    template: template 
  });
  
  console.log("尝试 ArcGIS 打印服务:", PRINT_SERVICE_URL);
  
  try {
    const result = await print.execute(PRINT_SERVICE_URL, params);
    console.log("打印结果:", result);
    
    let outputUrl = "";
    if (result?.url) outputUrl = result.url;
    else if (result?.href) outputUrl = result.href;
    else if (typeof result === 'string') outputUrl = result;
    
    if (outputUrl && (outputUrl.startsWith('http://') || outputUrl.startsWith('https://'))) {
      // 延时确保文件生成完成
      setTimeout(() => {
        window.open(outputUrl, "_blank");
        ElMessage.success("打印文件已生成！");
      }, 1000);
      return true;
    }
    
    console.log("无效的返回URL:", outputUrl);
    return false;
  } catch (e: any) {
    console.error("ArcGIS打印错误:", e.message || e);
    return false;
  }
}

// 高分辨率截图 - 带图例标题
async function takeScreenshot() {
  try {
    if (!mapView) throw new Error("地图视图不存在");
    
    const config = styleConfig.value;
    // 根据DPI计算缩放比例: 96dpi=1x, 150dpi=1.5x, 300dpi=3x
    const dpiScale: Record<number, number> = { 96: 1, 150: 1.5, 300: 3 };
    const scale = dpiScale[dpi.value] || 2;
    const mapWidth = mapView.width;
    const mapHeight = mapView.height;
    const width = mapWidth * scale;
    const height = mapHeight * scale;
    
    console.log(`截图尺寸: ${width} x ${height}, DPI: ${dpi.value}, scale: ${scale}`);
    
    const screenshot = await mapView.takeScreenshot({
      format: "png",
      width: width,
      height: height,
    });
    
    console.log("截图完成");
    
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建canvas上下文");
    
    // 绘制地图图像
    ctx.putImageData(screenshot.data, 0, 0);
    
    // 添加标题
    if (titleText.value && config.titleFontSize) {
      const titleHeight = 60 * scale;
      // 标题固定在顶部居中，使用可配置宽度
      const titleWidth = (config.titleWidth || 600) * scale;
      const titleY = 20 * scale;
      const titleX = (width - titleWidth) / 2;
      
      // 解析颜色
      const titleBg = parseColorWithAlpha(config.titleBgColor, ctx);
      ctx.fillStyle = titleBg;
      ctx.fillRect(titleX, titleY, titleWidth, titleHeight);
      
      ctx.fillStyle = config.titleColor || "#ffffff";
      ctx.font = `bold ${config.titleFontSize * scale}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(titleText.value, titleX + titleWidth / 2, titleY + 25 * scale + 5);
      
      ctx.font = `${(config.titleFontSize - 4) * scale}px "Microsoft YaHei", sans-serif`;
      ctx.fillText(authorText.value || "海洋地理信息系统", titleX + titleWidth / 2, titleY + 45 * scale + 5);
    }
    
    // 添加图例
    if (config.showLegend && legendItems.value.length > 0) {
      const legendWidth = config.legendWidth * scale;
      const legendHeight = config.legendHeight * scale;
      // 图例固定在右下角，使用配置的宽度和高度
      const legendX = width - legendWidth - 25 * scale;
      const legendY = height - legendHeight - 25 * scale;
      
      // 解析颜色
      const legendBg = parseColorWithAlpha(config.legendBgColor, ctx);
      ctx.fillStyle = legendBg;
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
      
      // 图例标题
      ctx.fillStyle = "#000";
      ctx.font = `bold ${config.legendFontSize * scale}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText("图例", legendX + 10 * scale, legendY + 18 * scale);
      
      // 图例项
      ctx.font = `${config.legendFontSize * scale}px "Microsoft YaHei", sans-serif`;
      const legendItemHeight = 22 * scale;
      legendItems.value.forEach((item, idx) => {
        const y = legendY + 38 * scale + idx * legendItemHeight;
        
        // 颜色条
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX + 10 * scale, y - 6 * scale, 30 * scale, 4 * scale);
        
        // 名称
        let displayName = item.name;
        if (displayName.length > (config.legendWidth / 8)) {
          displayName = displayName.substring(0, Math.floor(config.legendWidth / 8)) + "...";
        }
        ctx.fillStyle = "#333";
        ctx.fillText(`${displayName} (${item.year})`, legendX + 45 * scale, y + 4);
      });
    }
    
    // 添加比例尺
    if (config.showScale) {
      // 比例尺固定在左下角
      const scaleX = 20 * scale;
      const scaleY = height - 45 * scale - 20 * scale;
      const scaleWidth = 150 * scale;
      const scaleHeight = 20 * scale;
      
      // 绘制黑白相间比例尺（经典的ArcGIS风格）
      const segments = 5; // 5段黑白相间
      const segmentWidth = scaleWidth / segments;
      
      for (let i = 0; i < segments; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#000" : "#fff";
        ctx.fillRect(scaleX + i * segmentWidth, scaleY, segmentWidth, scaleHeight);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(scaleX + i * segmentWidth, scaleY, segmentWidth, scaleHeight);
      }
      
      // 比例尺文字
      ctx.fillStyle = "#000";
      ctx.font = `bold ${10 * scale}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText("比例尺 1:1000000", scaleX, scaleY - 5 * scale);
    }
    
    // 添加North方向标
    if (config.showNorth) {
      // 北向标固定在右下角
      const arrowX = width - 60 * scale;
      const arrowY = 60 * scale;
      const radius = 20 * scale;
      
      // 白色圆形背景
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.beginPath();
      ctx.arc(arrowX, arrowY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
      
      // 红色箭头（向上）
      ctx.fillStyle = "#c00";
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY - 10 * scale);
      ctx.lineTo(arrowX - 6 * scale, arrowY - 4 * scale);
      ctx.lineTo(arrowX + 6 * scale, arrowY - 4 * scale);
      ctx.closePath();
      ctx.fill();
      
      // N文字
      ctx.fillStyle = "#333";
      ctx.font = `bold ${12 * scale}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("N", arrowX, arrowY + 8 * scale);
    }
    
    // 转换为数据URL
    const format = exportFormat.value === "jpg" ? "jpeg" : "png";
    const dataUrl = canvas.toDataURL("image/" + format, 1.0);
    
    // 下载
    const timestamp = new Date().toLocaleString("zh-CN").replace(/[/:]/g, "-").replace(" ", "_");
    const paperLabel = paperSize.value.replace(" ", "-");
    const dpiLabel = dpi.value + "dpi";
    const filename = `${titleText.value || "海岸线地图"}_${paperLabel}_${dpiLabel}_${timestamp}.${format === "jpeg" ? "jpg" : format}`;
    
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
    
    ElMessage.success("截图已下载！");
  } catch (e: any) {
    console.error("截图失败:", e);
    ElMessage.error("截图失败: " + (e.message || "未知错误"));
  }
}

// 辅助函数：解析颜色并应用透明度
function parseColorWithAlpha(colorStr: string, ctx: CanvasRenderingContext2D): string {
  // 处理 rgba
  if (colorStr.startsWith("rgba")) {
    return colorStr;
  }
  // 处理其他颜色格式
  return colorStr;
}

async function initMap() {
  if (!mapEl.value) return;
  
  // 使用默认视图
  const initialCenter: [number, number] = [115, 32];
  const initialZoom = 4;
  
  const map = new Map({
    basemap: "osm",
  });
  
  mapView = new MapView({
    container: mapEl.value,
    map,
    center: initialCenter,
    zoom: initialZoom,
    ui: {
      components: [],
    },
  });
  
  await mapView.when(() => {
    // 添加黑白相间比例尺
    scaleBar = new ScaleBar({
      view: mapView,
      style: "ruler",  // 黑白相间样式
      unit: "metric",
    });
    mapView?.ui.add(scaleBar, {
      position: "bottom-left",
      margin: { left: 20, bottom: 20 },
    });
  });
  
  // 创建图形图层
  shorelineLayer = new GraphicsLayer();
  map.add(shorelineLayer);
  
  // 加载数据
  await loadSelectedCoastlines();
}

function goBack() {
  router.back();
}

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  mapView?.destroy();
});
</script>

<style scoped>
/* 容器 */
.export-page-container {
  display: flex;
  width: 100%;
  height: 100vh;
  background: #f0f0f0;
}

/* 左侧控制面板 */
.control-panel {
  width: 280px;
  min-width: 280px;
  background: #fff;
  border-right: 1px solid #dcdfe6;
  padding: 16px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.header-icon {
  font-size: 22px;
  color: #409eff;
}

.header-title {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
}

/* 控制区块 */
.control-section {
  margin-bottom: 18px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.section-content {
  padding-left: 2px;
}

.full-width {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.full-width .el-radio-button {
  flex: 1;
  min-width: 70px;
  text-align: center;
}

/* 样式设置 - 简单对齐 */
.style-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.style-row > .style-label {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  width: 70px;
  flex-shrink: 0;
}

.style-row > .el-slider {
  flex: 1;
}

.style-row > .style-value {
  font-size: 12px;
  color: #409eff;
  font-weight: 600;
  width: 45px;
  text-align: right;
  flex-shrink: 0;
}

/* 预览控制 */
.preview-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.preview-hint {
  font-size: 12px;
  color: #409eff;
}

.map-container.preview-mode {
  position: relative;
}

/* 预览叠加层 */
.preview-overlay {
  position: absolute;
}

.preview-title {
  padding: 12px 20px;
  text-align: center;
  border-radius: 8px;
  line-height: 1.4;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.preview-author {
  font-size: 0.75em;
  font-weight: normal;
  opacity: 0.9;
  margin-top: 4px;
}

.preview-legend {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.preview-legend-title {
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 2px solid #409eff;
  padding-top: 4px;
}

.preview-legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0;
}

.legend-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
}

.preview-legend-color {
  width: 24px;
  height: 4px;
  flex-shrink: 0;
}

/* 图例线型样式 - 实线 */
.preview-legend-color.style-solid {
  background: var(--legend-color, #000);
}

/* 图例线型样式 - 虚线 */
.preview-legend-color.style-dashed {
  background: repeating-linear-gradient(
    90deg,
    var(--legend-color, #000) 0,
    var(--legend-color, #000) 6px,
    transparent 6px,
    transparent 12px
  );
}

/* 图例线型样式 - 点线 */
.preview-legend-color.style-dot {
  background: repeating-linear-gradient(
    90deg,
    var(--legend-color, #000) 0,
    var(--legend-color, #000) 2px,
    transparent 2px,
    transparent 8px
  );
}

.preview-scale {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-block;
  margin: 0;
}

.preview-north {
  position: absolute;
  top: 10px;
  right: 50px;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  border: 2px solid #333;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
}

.north-arrow {
  position: absolute;
  top: 3px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 12px solid #c00;
}

.north-label {
  position: absolute;
  bottom: 6px;
  font-size: 10px;
  color: #333;
}

/* 黑白相间比例尺 */
.preview-scale {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scale-bar {
  display: flex;
  height: 16px;
  border: 1px solid #333;
}

.scale-segment {
  width: 30px;
  height: 100%;
}

.scale-segment:nth-child(odd) {
  background: #000;
}

.scale-segment:nth-child(even) {
  background: #fff;
}

.scale-label {
  font-size: 10px;
  font-weight: bold;
  color: #000;
  text-align: left;
}

.preview-arrow {
  position: absolute;
  top: 2px;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 8px solid #000;
}

/* 全屏预览 */
.fullscreen-preview {
  position: relative;
  width: 100%;
  height: 70vh;
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.3);
}

.fullscreen-map {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.preview-overlay-fullscreen {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: auto;
}

.draggable-element {
  pointer-events: auto;
  z-index: 100;
}

.draggable-element:hover {
  outline: 2px dashed #409eff;
}

/* 修复图例显示 - 自动高度 */
.preview-legend {
  min-height: 50px;
  position: relative;
}

/* 图例调整大小手柄 */
.resize-handle {
  position: absolute;
  background: #409eff;
  z-index: 10;
}

.resize-handle-right {
  right: -3px;
  top: 10%;
  width: 6px;
  height: 80%;
  cursor: ew-resize;
  border-radius: 3px;
}

.resize-handle-bottom {
  left: 10%;
  bottom: -3px;
  width: 80%;
  height: 6px;
  cursor: ns-resize;
  border-radius: 3px;
}

.resize-handle-corner {
  right: -3px;
  bottom: -3px;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
  border-radius: 3px;
}

/* 图例 */
.legend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.legend-style {
  width: 24px;
  height: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.legend-style > div {
  width: 100%;
  height: 3px;
  border-radius: 1px;
}

.style-solid {
  background: var(--legend-color, #000);
}

.style-dashed {
  background: repeating-linear-gradient(
    90deg,
    var(--legend-color, #000) 0,
    var(--legend-color, #000) 6px,
    transparent 6px,
    transparent 10px
  );
}

.style-dotted {
  background: repeating-linear-gradient(
    90deg,
    var(--legend-color, #000) 0,
    var(--legend-color, #000) 2px,
    transparent 2px,
    transparent 6px
  );
}

.legend-name {
  flex: 1;
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-year {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.legend-empty {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

/* 操作按钮 - 垂直排列但宽度统一 */
.control-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 12px;
}

.action-button {
  width: 100%;
  height: 44px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* 提示 */
.tip-info {
  margin-top: 20px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f7ff 100%);
  border-radius: 8px;
  border-left: 3px solid #409eff;
  font-size: 13px;
  color: #606266;
  text-align: left;
  line-height: 1.5;
}

/* 右侧 */
.canvas-preview {
  flex: 1;
  padding: 16px;
  background: linear-gradient(135deg, #f0f2f5 0%, #e8eaed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}
</style>