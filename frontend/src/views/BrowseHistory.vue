<template>
  <div class="history-page">
    <el-card shadow="never">
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between">
          <div style="display: flex; align-items: center; gap: 12px">
            <el-button text @click="goBack">
              <el-icon><ArrowLeft /></el-icon>
            </el-button>
            <div style="font-weight: 700; font-size: 16px">浏览记录</div>
          </div>
          <el-button text type="danger" size="small" :disabled="history.length === 0" @click="clearHistory">
            清空
          </el-button>
        </div>
      </template>
      
      <!-- 简洁列表风格 -->
      <div v-if="history.length > 0" class="history-list">
        <div 
          v-for="(item, index) in history" 
          :key="item.datasetId || index" 
          class="history-list-item"
          @click="viewDataset(item.datasetId)"
        >
          <!-- 图标 -->
          <div class="item-icon">
            <el-icon :size="20"><Place /></el-icon>
          </div>
          
          <!-- 内容 -->
          <div class="item-content">
            <div class="item-title">{{ item.datasetName }}</div>
            <div class="item-meta">
              <span class="meta-item">{{ item.regionName }}</span>
              <span class="meta-divider">·</span>
              <span class="meta-item">{{ getSensorLabel(item.sensor) }}</span>
              <span class="meta-divider">·</span>
              <span class="meta-item">{{ item.year }}年</span>
            </div>
          </div>
          
          <!-- 时间 -->
          <div class="item-time">{{ formatTime(item.viewedAt) }}</div>
          
          <!-- 箭头 -->
          <el-icon class="item-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
      
      <el-empty v-if="!loading && history.length === 0">
        <div style="color: #909399; margin-bottom: 8px">暂无浏览记录</div>
        <el-button type="primary" size="small" @click="goToDatasets">去浏览</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowLeft, ArrowRight, Place } from "@element-plus/icons-vue";

import { api } from "../utils/api";

const router = useRouter();

function goBack() {
  router.back();
}

const loading = ref(false);
const history = ref<any[]>([]);

const sensorLabels: Record<string, string> = {
  sentinel2: "Sentinel-2",
  landsat8: "Landsat-8",
  landsat9: "Landsat-9",
  mixed: "Mixed",
};

function getSensorLabel(sensor?: string) {
  return sensor ? (sensorLabels[sensor] || sensor) : '';
}

onMounted(async () => {
  loading.value = true;
  try {
    const res = await api.get("/api/users/me/browse-history");
    history.value = res.data.history || [];
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载失败");
  } finally {
    loading.value = false;
  }
});

function formatTime(timeStr: string) {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return mins <= 1 ? '刚刚' : `${mins}分钟前`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  }
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}天前`;
  }
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

function viewDataset(id: string) {
  router.push({ name: "map", query: { dataset: id } });
}

function goToDatasets() {
  router.push({ name: "datasets" });
}

async function clearHistory() {
  try {
    await ElMessageBox.confirm('确定清空所有浏览记录？', '提示', { type: 'warning' });
    await api.delete("/api/users/me/browse-history");
    history.value = [];
    ElMessage.success('已清空');
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message ?? '清空失败');
    }
  }
}
</script>

<style scoped>
.history-page {
  padding: 20px;
  width: 100%;
  min-height: 100vh;
  background: #f5f7fa;
  box-sizing: border-box;
}

.history-list {
  display: flex;
  flex-direction: column;
}

.history-list-item {
  display: flex;
  align-items: center;
  padding: 14px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.history-list-item:hover {
  background: #f8f9fa;
}

.history-list-item:last-child {
  border-bottom: none;
}

.item-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e8f4fc 0%, #d4e9f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: #00a1d6;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.meta-item {
  white-space: nowrap;
}

.meta-divider {
  margin: 0 6px;
  opacity: 0.5;
}

.item-time {
  font-size: 13px;
  color: #c0c4cc;
  margin: 0 16px;
  flex-shrink: 0;
}

.item-arrow {
  color: #dcdfe6;
  flex-shrink: 0;
}

:deep(.el-card) {
  border-radius: 8px;
  width: 100%;
}

:deep(.el-card__header) {
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-card__body) {
  padding: 0;
}
</style>