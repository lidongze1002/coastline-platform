<template>
  <div style="padding: 16px; width: 100%">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px">
      <div style="display: flex; align-items: center; gap: 12px">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <div style="font-weight: 800; font-size: 16px">我的数据集</div>
      </div>
      <div style="display: flex; gap: 8px">
        <el-button @click="load" :loading="loading">刷新</el-button>
        <el-button type="primary" @click="openCreate">上传数据</el-button>
        <el-button @click="openCreateFolder">新建文件夹</el-button>
      </div>
    </div>

    <!-- 文件夹树形结构 -->
    <el-tree 
      :data="treeData" 
      :props="treeProps" 
      node-key="id"
      default-expand-all
      @node-click="onNodeClick"
    >
      <template #default="{ node, data }">
        <span style="display: flex; align-items: center; gap: 8px; width: 100%">
          <el-icon v-if="data.isFolder"><Folder /></el-icon>
          <el-icon v-else><Document /></el-icon>
          <span style="flex: 1">{{ data.label }}</span>
          <el-tag v-if="!data.isFolder && data.data?.rejectReason" type="danger" size="small">已拒绝</el-tag>
          <el-tag v-if="!data.isFolder" :type="data.status === 'published' ? 'success' : data.status === 'pending' ? 'warning' : 'info'" size="small">
            {{ data.status === 'published' ? '已发布' : data.status === 'pending' ? '待审核' : '草稿' }}
          </el-tag>
          <el-button v-if="!data.isFolder && data.status === 'draft'" size="small" text type="warning" @click.stop="submitForReview(data)">提交审核</el-button>
          <el-button v-if="!data.isFolder && data.data?.rejectReason" size="small" text type="danger" @click.stop="showRejectReason(data.data)">查看拒绝原因</el-button>
          <el-button v-if="!data.isFolder" size="small" text type="primary" @click.stop="editDataset(data)">修改</el-button>
          <el-button v-if="data.isFolder" size="small" text type="danger" @click.stop="deleteFolder(data.id)">删除</el-button>
        </span>
      </template>
    </el-tree>

    <el-empty v-if="treeData.length === 0 && !loading" description="暂无文件夹，请先创建" />

    <!-- 新建文件夹对话框 -->
    <el-dialog v-model="folderDialogVisible" title="新建文件夹" width="400px">
      <el-form :model="folderForm">
        <el-form-item label="文件夹名称">
          <el-input v-model="folderForm.name" placeholder="如：东海区海岸线" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="folderForm.description" type="textarea" :rows="2" placeholder="可选描述" />
        </el-form-item>
        <el-form-item label="是否公开">
          <el-switch v-model="folderForm.isPublic" />
          <span style="margin-left: 8px; opacity: 0.6">公开后所有用户可见</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="folderDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="folderLoading" @click="createFolder">创建</el-button>
      </template>
    </el-dialog>

    <!-- 新建/修改数据集对话框 -->
    <el-dialog v-model="createVisible" :title="isEditing ? '修改数据集' : '上传数据集'" width="700px" close-on-click-modal="false">
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
              <el-select v-model="createForm.coastlineType" style="width: 100%" :teleported="false" @change="onCoastlineTypeChange">
                <el-option label="自然岸线" value="natural" />
                <el-option label="人工岸线" value="artificial" />
                <el-option label="未分类" value="unknown" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="海岸线子类型（可选）">
              <el-select v-model="createForm.coastlineSubtype" style="width: 100%" allow-create filterable placeholder="如：基岩岸线、砂砾质岸线等" :teleported="false">
                <el-option v-for="subtype in filteredCoastlineSubtypes" :key="subtype.value" :label="subtype.label" :value="subtype.value" />
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
        <el-button type="primary" :loading="creating" @click="createDataset">{{ isEditing ? '保存修改' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { UploadFile, FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, Folder, Document, Upload } from "@element-plus/icons-vue";

import { api } from "../utils/api";

const router = useRouter();
const loading = ref(false);
const folders = ref<any[]>([]);
const datasets = ref<any[]>([]);
const treeData = ref<any[]>([]);
const treeProps = { label: "label", children: "children" };

const folderDialogVisible = ref(false);
const folderLoading = ref(false);
const folderForm = ref({ name: "", description: "", isPublic: false });

const createVisible = ref(false);
const creating = ref(false);
const isEditing = ref(false);
const editingId = ref("");
const editingDataInfo = ref("");
const createFormRef = ref<FormInstance>();
const geojsonFileList = ref<UploadFile[]>([]);
const originalFileList = ref<UploadFile[]>([]);
const shapefileList = ref<UploadFile[]>([]);
const currentFolderId = ref<string | null>(null);

const createForm = reactive({
  name: "",
  groupName: "",
  dataType: "shoreline",
  sensor: "sentinel2",
  date: new Date(),
  regionName: "",
  coastlineType: "unknown",
  coastlineSubtype: "",
  method: "",
  description: "",
});

const createRules: FormRules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }],
  regionName: [{ required: true, message: "请输入区域", trigger: "blur" }],
  sensor: [{ required: true, message: "请选择传感器", trigger: "change" }],
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
};

// 海岸线子类型选项
const NATURAL_SUBTYPES = [
  { label: "基岩岸线", value: "基岩岸线" },
  { label: "砂砾质岸线", value: "砂砾质岸线" },
  { label: "淤泥质岸线", value: "淤泥质岸线" },
  { label: "河口岸线", value: "河口岸线" },
  { label: "生物岸线", value: "生物岸线" },
];

const ARTIFICIAL_SUBTYPES = [
  { label: "养殖岸线", value: "养殖岸线" },
  { label: "港口码头岸线", value: "港口码头岸线" },
  { label: "建设岸线", value: "建设岸线" },
  { label: "防护岸线", value: "防护岸线" },
];

const UNKNOWN_SUBTYPES = [
  { label: "基岩岸线", value: "基岩岸线" },
  { label: "砂砾质岸线", value: "砂砾质岸线" },
  { label: "淤泥质岸线", value: "淤泥质岸线" },
  { label: "河口岸线", value: "河口岸线" },
  { label: "生物岸线", value: "生物岸线" },
  { label: "养殖岸线", value: "养殖岸线" },
  { label: "港口码头岸线", value: "港口码头岸线" },
  { label: "建设岸线", value: "建设岸线" },
  { label: "防护岸线", value: "防护岸线" },
];

const filteredCoastlineSubtypes = ref(UNKNOWN_SUBTYPES);

function onCoastlineTypeChange() {
  if (createForm.coastlineType === "natural") {
    filteredCoastlineSubtypes.value = NATURAL_SUBTYPES;
  } else if (createForm.coastlineType === "artificial") {
    filteredCoastlineSubtypes.value = ARTIFICIAL_SUBTYPES;
  } else {
    filteredCoastlineSubtypes.value = UNKNOWN_SUBTYPES;
  }
  createForm.coastlineSubtype = "";
}

function goBack() {
  router.back();
}

async function load() {
  loading.value = true;
  try {
    // 加载文件夹
    const resF = await api.get("/api/folders");
    folders.value = resF.data.folders || [];
    // 加载数据集
    const resD = await api.get("/api/datasets?statusAll=true");
    datasets.value = resD.data.datasets || [];
    // 构建树
    buildTree();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载失败");
  } finally {
    loading.value = false;
  }
}

function buildTree() {
  const tree: any[] = [];
  for (const folder of folders.value) {
    const folderDatasets = datasets.value.filter(d => d.folderId === folder.id);
    tree.push({
      id: folder.id,
      label: folder.name,
      isFolder: true,
      children: folderDatasets.map(d => ({
        id: d.id,
        label: d.name + " (" + new Date(d.date).getFullYear() + ")",
        isFolder: false,
        status: d.status,
        data: d,
      })),
    });
  }
  // 未分类的数据
  const uncategorized = datasets.value.filter(d => !d.folderId);
  if (uncategorized.length > 0) {
    tree.push({
      id: "__uncategorized__",
      label: "未分类",
      isFolder: true,
      children: uncategorized.map(d => ({
        id: d.id,
        label: d.name + " (" + new Date(d.date).getFullYear() + ")",
        isFolder: false,
        status: d.status,
        data: d,
      })),
    });
  }
  treeData.value = tree;
}

function onNodeClick(data: any) {
  if (!data.isFolder && data.data) {
    router.push({ name: "map", query: { dataset: data.id } });
  }
}

function openCreateFolder() {
  folderForm.value = { name: "", description: "", isPublic: false };
  folderDialogVisible.value = true;
}

async function createFolder() {
  if (!folderForm.value.name) {
    ElMessage.warning("请输入文件夹名称");
    return;
  }
  folderLoading.value = true;
  try {
    await api.post("/api/folders", folderForm.value);
    ElMessage.success("创建成功");
    folderDialogVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "创建失败");
  } finally {
    folderLoading.value = false;
  }
}

async function deleteFolder(id: string) {
  try {
    await ElMessageBox.confirm("删除文件夹将同时删除其中所有数据", "确认删除", { type: "warning" });
    await api.delete(`/api/folders/${id}`);
    ElMessage.success("删除成功");
    await load();
  } catch (e: any) {
    if (e !== "cancel") ElMessage.error(e?.response?.data?.message ?? "删除失败");
  }
}

function showRejectReason(data: any) {
  ElMessageBox.alert(data.rejectReason || "无", "拒绝原因", { type: "warning" });
}

function openCreate() {
  isEditing.value = false;
  editingId.value = "";
  editingDataInfo.value = "";
  currentFolderId.value = null;
  // 重置表单
  createForm.name = "";
  createForm.groupName = "";
  createForm.dataType = "shoreline";
  createForm.sensor = "sentinel2";
  createForm.date = new Date();
  createForm.regionName = "";
  createForm.coastlineType = "unknown";
  createForm.coastlineSubtype = "";
  createForm.method = "";
  createForm.description = "";
  geojsonFileList.value = [];
  originalFileList.value = [];
  shapefileList.value = [];
  filteredCoastlineSubtypes.value = UNKNOWN_SUBTYPES;
  createVisible.value = true;
}

function editDataset(data: any) {
  isEditing.value = true;
  editingId.value = data.id;
  currentFolderId.value = data.folderId || null;
  // 填充现有数据
  createForm.name = data.name || "";
  createForm.groupName = data.groupName || "";
  createForm.dataType = data.dataType || "shoreline";
  createForm.sensor = data.sensor || "sentinel2";
  createForm.date = new Date(data.date) || new Date();
  createForm.regionName = data.regionName || "";
  createForm.coastlineType = data.coastlineType || "unknown";
  createForm.coastlineSubtype = data.coastlineSubtype || "";
  createForm.method = data.method || "";
  createForm.description = data.description || "";
  // 更新子类型选项
  onCoastlineTypeChange();
  // 编辑时的数据信息
  editingDataInfo.value = `当前数据：${data.name || ''} | ${data.regionName || ''} | ${data.sensor || ''} | ${data.date ? new Date(data.date).getFullYear() : ''}`;
  geojsonFileList.value = [];
  originalFileList.value = [];
  shapefileList.value = [];
  createVisible.value = true;
}

async function submitForReview(data: any) {
  try {
    await api.patch(`/api/datasets/${data.id}/submit`);
    ElMessage.success("已提交审核，请等待管理员审核");
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "提交失败");
  }
}

async function saveAsDraft() {
  creating.value = true;
  try {
    const dateStr = new Date(createForm.date).getFullYear().toString();
    
    // 构建表单数据
    const formData = new FormData();
    const data = {
      name: createForm.name,
      groupName: createForm.groupName,
      dataType: createForm.dataType,
      sensor: createForm.sensor,
      date: dateStr,
      regionName: createForm.regionName,
      coastlineType: createForm.coastlineType,
      coastlineSubtype: createForm.coastlineSubtype,
      method: createForm.method,
      description: createForm.description,
      status: "draft",
      folderId: currentFolderId.value,
    };
    console.log("[saveAsDraft] data:", data);
    formData.append("data", JSON.stringify(data));
    
    // 添加文件
    if (originalFileList.value[0]?.raw) {
      formData.append("original", originalFileList.value[0].raw);
    }
    if (geojsonFileList.value[0]?.raw) {
      formData.append("geojson", geojsonFileList.value[0].raw);
    }
    for (const f of shapefileList.value) {
      if (f.raw) formData.append("shapefiles", f.raw);
    }
    
    if (isEditing.value && editingId.value) {
      await api.patch(`/api/datasets/${editingId.value}`, {
        name: createForm.name,
        groupName: createForm.groupName,
        dataType: createForm.dataType,
        sensor: createForm.sensor,
        date: dateStr,
        regionName: createForm.regionName,
        coastlineType: createForm.coastlineType,
        coastlineSubtype: createForm.coastlineSubtype,
        method: createForm.method,
        description: createForm.description,
        status: "draft",
      });
      ElMessage.success("已更新");
    } else {
      await api.post("/api/datasets/with-files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      ElMessage.success("已保存为草稿");
    }
    createVisible.value = false;
    await load();
  } catch (e: any) {
    console.error("[saveAsDraft] error:", e);
    ElMessage.error(e?.response?.data?.message ?? "保存失败");
  } finally {
    creating.value = false;
  }
}

async function createDataset() {
  creating.value = true;
  try {
    const dateStr = new Date(createForm.date).getFullYear().toString();
    
    // 构建表单数据
    const formData = new FormData();
    const data = {
      name: createForm.name,
      groupName: createForm.groupName,
      dataType: createForm.dataType,
      sensor: createForm.sensor,
      date: dateStr,
      regionName: createForm.regionName,
      coastlineType: createForm.coastlineType,
      coastlineSubtype: createForm.coastlineSubtype,
      method: createForm.method,
      description: createForm.description,
      status: "draft",
      folderId: currentFolderId.value,
    };
    formData.append("data", JSON.stringify(data));
    
    // 添加文件
    if (geojsonFileList.value[0]?.raw) {
      formData.append("geojson", geojsonFileList.value[0].raw);
    }
    if (originalFileList.value[0]?.raw) {
      formData.append("original", originalFileList.value[0].raw);
    }
    for (const f of shapefileList.value) {
      if (f.raw) formData.append("shapefiles", f.raw);
    }
    
    if (isEditing.value && editingId.value) {
      await api.patch(`/api/datasets/${editingId.value}`, {
        name: createForm.name,
        groupName: createForm.groupName,
        dataType: createForm.dataType,
        sensor: createForm.sensor,
        date: dateStr,
        regionName: createForm.regionName,
        coastlineType: createForm.coastlineType,
        coastlineSubtype: createForm.coastlineSubtype,
        method: createForm.method,
        description: createForm.description,
        status: "draft",
      });
      ElMessage.success("已保存修改");
    } else {
      await api.post("/api/datasets/with-files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      ElMessage.success("创建成功");
    }
    createVisible.value = false;
    await load();
  } catch (e: any) {
    console.error("[createDataset] error:", e);
    ElMessage.error(e?.response?.data?.message ?? "创建失败");
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>