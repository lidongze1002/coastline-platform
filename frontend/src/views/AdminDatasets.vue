<template>
  <div style="padding: 16px; width: 100%">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px">
      <div style="font-weight: 800; font-size: 16px">数据集管理（管理员）</div>
      <div style="display: flex; gap: 8px">
        <el-select v-model="filterRegion" placeholder="区域筛选" clearable style="width: 140px" :teleported="false" @change="handleFilter">
          <el-option v-for="r in regionOptions" :key="r" :label="r" :value="r" />
        </el-select>
        <el-select v-model="filterSensor" placeholder="传感器筛选" clearable style="width: 130px" :teleported="false" @change="handleFilter">
          <el-option label="Sentinel-2" value="sentinel2" />
          <el-option label="Landsat-8" value="landsat8" />
          <el-option label="Landsat-9" value="landsat9" />
          <el-option label="Mixed" value="mixed" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px" :teleported="false" @change="handleFilter">
          <el-option label="全部状态" value="" />
          <el-option label="草稿" value="draft" />
          <el-option label="待审核" value="pending" />
          <el-option label="已打回" value="rejected" />
          <el-option label="已发布" value="published" />
        </el-select>
        <el-button @click="load" :loading="loading">刷新</el-button>
        <el-button type="danger" :disabled="selectedIds.length === 0" @click="deleteSelected">
          删除已选 ({{ selectedIds.length }})
        </el-button>
        <el-button type="primary" @click="openCreate">新建数据集</el-button>
      </div>
    </div>

    <el-table :data="filteredDatasets" size="small" style="width: 100%" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="id" label="ID" width="180">
        <template #default="{ row }">
          <span style="font-family: monospace; font-size: 11px; color: #909399">{{ row.id }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="date" label="日期" width="100">
        <template #default="{ row }">{{ formatDate(row.date) }}</template>
      </el-table-column>
      <el-table-column prop="sensor" label="数据源" width="100" />
      <el-table-column prop="regionName" label="区域" width="160" />
      <el-table-column prop="name" label="名称" min-width="240" />
      <el-table-column prop="status" label="状态" width="110">
        <template #default="{ row }">
          <el-tag v-if="row.rejectReason" type="danger">已打回</el-tag>
          <el-tag v-else :type="row.status === 'published' ? 'success' : row.status === 'pending' ? 'warning' : 'info'">
            {{ row.status === 'published' ? '已发布' : row.status === 'pending' ? '待审核' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300">
        <template #default="{ row }">
          <div style="display: flex; gap: 4px">
            <el-button size="small" type="primary" @click="editDataset(row)">修改</el-button>
            <el-button size="small" type="warning" @click="previewDataset(row)">预览</el-button>
            <el-button v-if="row.rejectReason" size="small" text type="danger" @click="showRejectReason(row.rejectReason)">查看打回原因</el-button>
            <el-button size="small" type="success" :disabled="row.status==='published'" @click="publish(row.id)">发布</el-button>
            <el-button size="small" type="danger" @click="remove(row.id)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="createVisible" :title="isEditing ? '修改数据集' : '新建数据集'" width="700px" close-on-click-modal="false">
      <el-form label-position="top" :model="createForm" :rules="createRules" ref="createFormRef">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="数据集名称" prop="name">
              <el-input v-model="createForm.name" placeholder="如：东海区大陆海岸线数据集（1990年）" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="分组名称（如同一区域多年数据可设相同组名）">
              <el-input v-model="createForm.groupName" placeholder="如：胶州湾岸线时空变化数据集" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据类型">
              <el-select v-model="createForm.dataType" style="width: 100%" :teleported="false">
                <el-option label="海岸线" value="shoreline" />
                <el-option label="参考线" value="reference" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="区域" prop="regionName">
              <el-input v-model="createForm.regionName" placeholder="如：东海区、广西、胶州湾" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="传感器" prop="sensor">
              <el-select v-model="createForm.sensor" style="width: 100%" :teleported="false">
                <el-option label="Sentinel-2" value="sentinel2" />
                <el-option label="Landsat-8" value="landsat8" />
                <el-option label="Landsat-9" value="landsat9" />
                <el-option label="Mixed（混合）" value="mixed" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="数据日期" prop="date">
              <el-date-picker v-model="createForm.date" type="year" style="width: 100%" placeholder="选择年份" :teleported="false" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="海岸线类型">
              <el-select v-model="createForm.coastlineType" style="width: 100%" :teleported="false">
                <el-option label="自然岸线" value="natural" />
                <el-option label="人工岸线" value="artificial" />
                <el-option label="未分类" value="unknown" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="海岸线子类型（可选）">
              <el-select v-model="createForm.coastlineSubtype" style="width: 100%" allow-create filterable placeholder="如：基岩岸线、砂砾质岸线等" :teleported="false">
                <el-option label="基岩岸线" value="基岩岸线" />
                <el-option label="砂砾质岸线" value="砂砾质岸线" />
                <el-option label="淤泥质岸线" value="淤泥质岸线" />
                <el-option label="河口岸线" value="河口岸线" />
                <el-option label="生物岸线" value="生物岸线" />
                <el-option label="养殖岸线" value="养殖岸线" />
                <el-option label="港口码头岸线" value="港口码头岸线" />
                <el-option label="建设岸线" value="建设岸线" />
                <el-option label="防护岸线" value="防护岸线" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="数据提取方法">
              <el-input v-model="createForm.method" placeholder="如：Landsat TM - 波段边缘检测 + 目视解译修正" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="数据详情（描述）">
              <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="如：数据来源、处理流程、精度说明等" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="原始数据文件（RAR/ZIP压缩包，用于下载）">
              <el-upload
                v-model:file-list="originalFileList"
                :auto-upload="false"
                :limit="1"
                accept=".rar,.zip"
                drag
              >
                <el-icon><Upload /></el-icon>
                <div class="el-upload__text">拖拽文件到此处或点击上传<em>（RAR/ZIP格式）</em></div>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="GeoJSON文件（用于地图展示）">
              <el-upload
                v-model:file-list="geojsonFileList"
                :auto-upload="false"
                :limit="1"
                accept=".geojson,.json"
                drag
              >
                <el-icon><Upload /></el-icon>
                <div class="el-upload__text">拖拽GeoJSON文件到此处或点击上传<em>（GeoJSON格式）</em></div>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="Shapefile文件（可选）">
              <el-upload
                v-model:file-list="shapefileList"
                :auto-upload="false"
                multiple
                accept=".shp,.zip,.geojson,.json"
                drag
              >
                <el-icon><Upload /></el-icon>
                <div class="el-upload__text">拖拽文件到此处（支持 .shp、.zip、.geojson）</div>
                <template #tip>
                  <div style="font-size: 12px; color: #909399; margin-top: 8px">
                    支持直接上传 .shp 文件，或 .zip（内含Shapefile组件）、.geojson
                  </div>
                </template>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="isEditing && editingDataInfo" :gutter="20">
          <el-col :span="24">
            <el-alert :title="editingDataInfo" type="info" :closable="false" show-icon />
          </el-col>
        </el-row>
        </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button v-if="!isEditing" type="info" @click="saveAsDraft">保存为草稿</el-button>
        <el-button type="primary" :loading="creating" @click="create">{{ isEditing ? '保存修改' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, UploadFile } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref, reactive } from "vue";
import { useRouter } from "vue-router";

import { api } from "../utils/api";

const router = useRouter();

type DatasetRow = {
  id: string;
  name: string;
  sensor: string;
  date: string;
  regionName: string;
  method: string;
  status: "draft" | "published";
  dataType?: string;
  coastlineType?: string;
  coastlineSubtype?: string;
  description?: string;
  originalDataPath?: string;
  rejectReason?: string;
};

const loading = ref(false);
const datasets = ref<DatasetRow[]>([]);
const filterStatus = ref("");
const filterRegion = ref("");
const filterSensor = ref("");
const regionOptions = ref<string[]>([]);
const filteredDatasets = ref<DatasetRow[]>([]);
const selectedIds = ref<string[]>([]);

function handleSelectionChange(val: any[]) {
  selectedIds.value = val.map((v: any) => v.id);
}

async function deleteSelected() {
  if (selectedIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条数据吗？`, "确认删除", {
      type: "warning",
    });
    for (const id of selectedIds.value) {
      await api.delete(`/api/datasets/${id}`);
    }
    ElMessage.success("删除成功");
    selectedIds.value = [];
    await load();
  } catch (e: any) {
    if (e !== "cancel") {
      ElMessage.error(e?.response?.data?.message ?? "删除失败");
    }
  }
}

const createVisible = ref(false);
const creating = ref(false);
const isEditing = ref(false);
const editingId = ref("");
const editingDataInfo = ref("");
const createFormRef = ref<FormInstance>();
const originalFileList = ref<UploadFile[]>([]);
const geojsonFileList = ref<UploadFile[]>([]);
const shapefileList = ref<UploadFile[]>([]);

const createForm = reactive({
  name: "",
  groupName: "",
  sensor: "sentinel2",
  date: new Date(),
  regionName: "",
  method: "",
  dataType: "shoreline",
  coastlineType: "unknown",
  coastlineSubtype: "",
  description: "",
});

const createRules = {
  name: [{ required: true, message: "请输入数据集名称", trigger: "blur" }],
  regionName: [{ required: true, message: "请输入区域名称", trigger: "blur" }],
  sensor: [{ required: true, message: "请选择传感器", trigger: "change" }],
  date: [{ required: true, message: "请选择数据日期", trigger: "change" }],
};

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(
    2,
    "0",
  )}`;
}

async function load() {
  loading.value = true;
  try {
    // admin: 查看所有状态的数据集（包括draft、pending、published）
    const res = await api.get("/api/datasets", { params: { statusAll: "true" } });
    datasets.value = res.data.datasets.sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    // 提取区域选项
    const regions = new Set(res.data.datasets.map((d: any) => d.regionName).filter(Boolean));
    regionOptions.value = Array.from(regions).sort();
    handleFilter();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载失败");
  } finally {
    loading.value = false;
  }
}

function handleFilter() {
  let result = datasets.value;
  
  // 按区域筛选
  if (filterRegion.value) {
    result = result.filter((d: any) => d.regionName === filterRegion.value);
  }
  
  // 按传感器筛选
  if (filterSensor.value) {
    result = result.filter((d: any) => d.sensor === filterSensor.value);
  }
  
  // 按状态筛选
  if (filterStatus.value) {
    if (filterStatus.value === "rejected") {
      // 已打回 = draft + 有 rejectReason
      result = result.filter((d: any) => d.status === "draft" && d.rejectReason);
    } else {
      result = result.filter((d: any) => d.status === filterStatus.value);
    }
  }
  
  filteredDatasets.value = result;
}

function showRejectReason(reason: string) {
  ElMessageBox.alert(reason || "无", "打回原因", { type: "warning" });
}

async function create() {
  if (!createFormRef.value) return;
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return;
    creating.value = true;
    try {
      const dateStr = createForm.date instanceof Date 
        ? createForm.date.getFullYear().toString() 
        : new Date(createForm.date).getFullYear().toString();
      
      if (isEditing.value && editingId.value) {
        // 更新现有数据集 - 只发送有值的字段
        const updateData: any = {};
        if (createForm.name) updateData.name = createForm.name;
        if (createForm.groupName !== undefined) updateData.groupName = createForm.groupName;
        if (createForm.sensor) updateData.sensor = createForm.sensor;
        if (dateStr) updateData.date = dateStr;
        if (createForm.regionName) updateData.regionName = createForm.regionName;
        if (createForm.method !== undefined) updateData.method = createForm.method;
        if (createForm.dataType) updateData.dataType = createForm.dataType;
        if (createForm.coastlineType) updateData.coastlineType = createForm.coastlineType;
        if (createForm.coastlineSubtype !== undefined) updateData.coastlineSubtype = createForm.coastlineSubtype;
        if (createForm.description !== undefined) updateData.description = createForm.description;
        
        await api.patch(`/api/datasets/${editingId.value}`, updateData);
        
        // 如果上传了Shapefile文件，同时保存数据
        if (shapefileList.value[0]?.raw) {
          const fd = new FormData();
          fd.append("file", shapefileList.value[0].raw);
          await api.post(`/api/datasets/upload-shp?datasetId=${editingId.value}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        
        ElMessage.success("已更新");
      } else {
        // 创建新数据集
        await api.post("/api/datasets", {
          ...createForm,
          date: dateStr,
        });
        ElMessage.success("已创建");
      }
      createVisible.value = false;
      resetCreateForm();
      await load();
    } catch (e: any) {
      console.error("保存错误:", e);
      const errMsg = e?.response?.data?.message || (isEditing.value ? "更新失败" : "创建失败");
      ElMessage.error(errMsg);
    } finally {
      creating.value = false;
    }
  });
}

function resetCreateForm() {
  createForm.name = "";
  createForm.groupName = "";
  createForm.sensor = "sentinel2";
  createForm.date = new Date();
  createForm.regionName = "";
  createForm.method = "";
  createForm.dataType = "shoreline";
  createForm.coastlineType = "unknown";
  createForm.coastlineSubtype = "";
  createForm.description = "";
  originalFileList.value = [];
  geojsonFileList.value = [];
  shapefileList.value = [];
}

async function saveAsDraft() {
  if (!createFormRef.value) return;
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return;
    creating.value = true;
    try {
      await api.post("/api/datasets", {
        ...createForm,
        status: "draft",
        date: createForm.date?.toISOString?.() ?? createForm.date,
      });
      ElMessage.success("已保存为草稿");
      createVisible.value = false;
      resetCreateForm();
      await load();
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message ?? "保存失败");
    } finally {
      creating.value = false;
    }
  });
}

async function submitForReview2() {
  if (!createFormRef.value) return;
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return;
    creating.value = true;
    try {
      const payload = {
        ...createForm,
        status: "pending_review",
        date: createForm.date?.toISOString?.() ?? createForm.date,
      };
      // 如果有文件，先创建数据集再上传文件
      const res = await api.post("/api/datasets", payload);
      const datasetId = res.data.id;
      // 上传原始数据文件
      if (originalFileList.value[0]?.raw) {
        const fd1 = new FormData();
        fd1.append("file", originalFileList.value[0].raw);
        await api.post(`/api/datasets/${datasetId}/upload-original`, fd1, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      // 上传GeoJSON文件（使用upload-shp接口处理，并自动保存到数据集）
      if (geojsonFileList.value[0]?.raw) {
        const fd2 = new FormData();
        fd2.append("file", geojsonFileList.value[0].raw);
        await api.post(`/api/datasets/upload-shp?datasetId=${datasetId}`, fd2, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      // 上传Shapefile文件（使用upload-shp接口处理，并自动保存到数据集）
      for (const f of shapefileList.value) {
        if (f.raw) {
          const fd3 = new FormData();
          fd3.append("file", f.raw);
          await api.post(`/api/datasets/upload-shp?datasetId=${datasetId}`, fd3, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }
      ElMessage.success("已提交审核");
      createVisible.value = false;
      resetCreateForm();
      await load();
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message ?? "提交失败");
    } finally {
      creating.value = false;
    }
  });
}

function openCreate() {
  isEditing.value = false;
  editingId.value = "";
  editingDataInfo.value = "";
  resetCreateForm();
  createVisible.value = true;
}

async function editDataset(row: DatasetRow) {
  isEditing.value = true;
  editingId.value = row.id;
  try {
    // 调用API获取完整数据
    const res = await api.get(`/api/datasets/${row.id}`);
    const d = res.data.dataset;
    // 填充现有数据到表单
    createForm.name = d.name || "";
    createForm.groupName = d.groupName || "";
    createForm.sensor = d.sensor || "sentinel2";
    createForm.regionName = d.regionName || "";
    createForm.date = d.date ? new Date(d.date) : new Date();
    createForm.method = d.method || "";
    createForm.dataType = d.dataType || "shoreline";
    createForm.coastlineType = d.coastlineType || "unknown";
    createForm.coastlineSubtype = d.coastlineSubtype || "";
    createForm.description = d.description || "";
    // 显示已有数据信息
    if (d.originalDataPath && d.originalDataPath.trim()) {
      editingDataInfo.value = `已有原始数据: ${d.originalDataPath}`;
    } else {
      editingDataInfo.value = "（暂无上传数据）";
    }
  } catch (e: any) {
    ElMessage.error("获取数据集详情失败");
    return;
  }
  createVisible.value = true;
}

async function publish(id: string) {
  try {
    await api.patch(`/api/datasets/${id}/publish`);
    ElMessage.success("已发布");
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "发布失败");
  }
}

function previewDataset(row: DatasetRow) {
  router.push({ name: "dataset-preview", params: { id: row.id } });
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm("确定删除该数据集？删除不可恢复。", "提示", { type: "warning" });
    await api.delete(`/api/datasets/${id}`);
    ElMessage.success("已删除");
    await load();
  } catch (e: any) {
    if (e === "cancel") return;
    ElMessage.error(e?.response?.data?.message ?? "删除失败");
  }
}

onMounted(load);
</script>

<style scoped>
</style>

