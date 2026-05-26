<template>
  <div style="padding: 16px; width: 100%">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px">
      <el-button text @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <div style="font-weight: 800; font-size: 16px">数据集浏览</div>
      <el-button @click="load" :loading="loading">刷新</el-button>
    </div>

    <!-- 文件夹区域 -->
    <el-card shadow="never" style="margin-bottom: 12px">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px">
        <div style="font-size: 13px; font-weight: 600">我的文件夹</div>
        <el-button size="small" text @click="showCreateFolder = true">+ 新建</el-button>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px">
        <!-- 未分类文件夹 -->
        <div 
          class="folder-item" 
          :class="{ active: !targetFolder }"
          @click="targetFolder = null"
        >
          <el-icon><Folder /></el-icon>
          <span>未分类</span>
        </div>
        <!-- 用户文件夹 -->
        <div 
          v-for="f in folders" 
          :key="f.id" 
          class="folder-item"
          :class="{ active: targetFolder === f.id }"
          @click="targetFolder = f.id"
        >
          <el-icon><FolderOpened /></el-icon>
          <span>{{ f.name }}</span>
          <el-button size="small" text type="danger" style="margin-left: 4px; padding: 2px" @click.stop="deleteFolder(f.id)">×</el-button>
        </div>
      </div>
      </el-card>

    <!-- 筛选条件 - B站风格 -->
    <el-card shadow="never" style="margin-bottom: 12px">
      <div style="margin-bottom: 12px">
        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 8px">区域</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px">
          <span 
            :class="['filter-tag', { active: !filterRegion }]" 
            @click="filterRegion = ''; loadGroups()"
          >全部</span>
          <span 
            v-for="r in regionOptions" 
            :key="r" 
            :class="['filter-tag', { active: filterRegion === r }]"
            @click="filterRegion = r; loadGroups()"
          >{{ r }}</span>
        </div>
      </div>
      <div>
        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 8px">卫星</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px">
          <span 
            :class="['filter-tag', { active: !filterSensor }]" 
            @click="filterSensor = null; loadGroups()"
          >全部</span>
          <span 
            :class="['filter-tag', { active: filterSensor === 'sentinel2' }]"
            @click="filterSensor = 'sentinel2'; loadGroups()"
          >Sentinel-2</span>
          <span 
            :class="['filter-tag', { active: filterSensor === 'landsat8' }]"
            @click="filterSensor = 'landsat8'; loadGroups()"
          >Landsat-8</span>
          <span 
            :class="['filter-tag', { active: filterSensor === 'landsat9' }]"
            @click="filterSensor = 'landsat9'; loadGroups()"
          >Landsat-9</span>
          <span 
            :class="['filter-tag', { active: filterSensor === 'mixed' }]"
            @click="filterSensor = 'mixed'; loadGroups()"
          >Mixed</span>
        </div>
      </div>
    </el-card>

    <!-- 已选择的数据 -->
    <el-alert v-if="selectedIds.length > 0" type="success" :closable="false" style="margin-bottom: 12px">
      <template #title>
        <span>已选择 <strong>{{ selectedIds.length }}</strong> 个数据集</span>
        <el-button size="small" type="danger" style="margin-left: 12px" @click="clearSelection">清空</el-button>
      </template>
    </el-alert>

    <!-- 分组列表 -->
    <el-empty v-if="groups.length === 0 && !loading" description="暂无数据" />

    <el-card v-for="g in groups" :key="g.name" shadow="never" style="margin-bottom: 12px">
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between">
          <div>
            <el-checkbox 
              :model-value="isGroupSelected(g)" 
              @change="toggleGroup(g)"
              style="margin-right: 8px"
            />
            <span style="font-weight: 600">{{ g.name }}</span>
            <el-tag size="small" style="margin-left: 8px">{{ g.items.length }}个年份</el-tag>
          </div>
          <!-- 年份下拉选择 -->
          <el-select 
            v-if="g.items.length > 1" 
            v-model="selectedYears[g.name]" 
            placeholder="选择年份"
            style="width: 120px"
            :teleported="false"
            @change="onYearChange(g.name)"
          >
            <el-option 
              v-for="item in g.items" 
              :key="item.id" 
              :label="formatYear(item.date)" 
              :value="item.id" 
            />
          </el-select>
        </div>
      </template>

      <el-table :data="g.items" size="small">
        <el-table-column width="40">
          <template #default="{ row }">
            <el-checkbox 
              :model-value="selectedIds.includes(row.id)" 
              @change="toggleOne(row.id)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="date" label="年份" width="80">
          <template #default="{ row }">{{ formatYear(row.date) }}</template>
        </el-table-column>
        <el-table-column prop="sensor" label="卫星" width="100">
          <template #default="{ row }">
            {{ getSensorLabel(row.sensor) }}
          </template>
        </el-table-column>
        <el-table-column prop="coastlineType" label="类型" width="100">
          <template #default="{ row }">
            {{ getCoastlineTypeLabel(row.coastlineType) }}
          </template>
        </el-table-column>
        <el-table-column prop="coastlineSubtype" label="子类型" min-width="120" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="viewOnMap(row.id)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建文件夹对话框 -->
    <el-dialog v-model="showCreateFolder" title="新建文件夹" width="360px">
      <el-input v-model="newFolderName" placeholder="请输入文件夹名称" @keyup.enter="createFolder" />
      <template #footer>
        <el-button @click="showCreateFolder = false">取消</el-button>
        <el-button type="primary" @click="createFolder">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { ArrowLeft, Folder, FolderOpened } from "@element-plus/icons-vue";

import { api } from "../utils/api";

const router = useRouter();
const loading = ref(false);
const groups = ref<any[]>([]);
const regionOptions = ref<string[]>([]);

const filterRegion = ref("");
const filterSensor = ref("");
const selectedIds = ref<string[]>([]);
const selectedYears = reactive<Record<string, string>>({});

// 文件夹相关
const folders = ref<{ id: string; name: string }[]>([]);
const targetFolder = ref<string | null>(null);
const showCreateFolder = ref(false);
const newFolderName = ref("");

async function loadFolders() {
  try {
    const res = await api.get("/api/folders");
    folders.value = res.data.folders || [];
  } catch (e) {
    console.error("加载文件夹失败", e);
  }
}

async function createFolder() {
  if (!newFolderName.value.trim()) return;
  try {
    await api.post("/api/folders", { name: newFolderName.value.trim() });
    newFolderName.value = "";
    showCreateFolder.value = false;
    await loadFolders();
    ElMessage.success("文件夹创建成功");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "创建失败");
  }
}

async function deleteFolder(id: string) {
  try {
    await api.delete(`/api/folders/${id}`);
    await loadFolders();
    ElMessage.success("已删除");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "删除失败");
  }
}

function goBack() {
  router.back();
}

function formatYear(d: string) {
  return new Date(d).getFullYear().toString();
}

function getSensorLabel(s: string) {
  const map: Record<string, string> = {
    sentinel2: "Sentinel-2",
    landsat8: "Landsat-8",
    landsat9: "Landsat-9",
    mixed: "Mixed",
  };
  return map[s] || s;
}

function getCoastlineTypeLabel(t: string) {
  const map: Record<string, string> = {
    natural: "自然岸线",
    artificial: "人工岸线",
    unknown: "未分类",
  };
  return map[t] || t;
}

async function load() {
  loading.value = true;
  try {
    // 加载分组数据
    const params: any = {};
    if (filterRegion.value) params.regionName = filterRegion.value;
    if (filterSensor.value) params.sensor = filterSensor.value;
    
    const res = await api.get("/api/datasets/groups", { params });
    groups.value = res.data.groups || [];
    
    // 初始化年份选择（默认选最新的）
    for (const g of groups.value) {
      if (g.items.length > 0) {
        selectedYears[g.name] = g.items[0].id;
      }
    }
    
    // 获取区域选项
    const res2 = await api.get("/api/datasets");
    const allDatasets = res2.data.datasets || [];
    regionOptions.value = [...new Set(allDatasets.map((d: any) => d.regionName))];
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载失败");
  } finally {
    loading.value = false;
  }
}

async function loadGroups() {
  await load();
}

function isGroupSelected(g: any) {
  return g.items.every((item: any) => selectedIds.value.includes(item.id));
}

function toggleGroup(g: any) {
  if (isGroupSelected(g)) {
    // 取消全选
    selectedIds.value = selectedIds.value.filter(id => !g.items.some((item: any) => item.id === id));
  } else {
    // 全选
    const newIds = [...selectedIds.value];
    for (const item of g.items) {
      if (!newIds.includes(item.id)) {
        newIds.push(item.id);
      }
    }
    selectedIds.value = newIds;
  }
}

function toggleOne(id: string) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(i => i !== id);
  } else {
    selectedIds.value = [...selectedIds.value, id];
  }
}

function clearSelection() {
  selectedIds.value = [];
}

function onYearChange(groupName: string) {
  // 年份变更时可以触发地图更新
  const id = selectedYears[groupName];
  if (id) {
    viewOnMap(id);
  }
}

function viewOnMap(id: string) {
  // 记录浏览历史
  api.post("/api/users/me/browse-history", { datasetId: id }).catch(() => {});
  router.push({ name: "map", query: { dataset: id, selected: selectedIds.value.join(",") } });
}

onMounted(() => {
  load();
  loadFolders();
});
</script>

<style scoped>
.filter-tag {
  display: inline-block;
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 4px;
  background: #f4f5f7;
  color: #61666d;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.filter-tag:hover {
  background: #e3e5e7;
  color: #18191c;
}

.filter-tag.active {
  background: #00a1d6;
  color: #fff;
  border-color: #00a1d6;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  background: #f4f5f7;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.folder-item:hover {
  background: #e3e5e7;
}

.folder-item.active {
  background: #e8f4fc;
  border-color: #00a1d6;
  color: #00a1d6;
}
</style>