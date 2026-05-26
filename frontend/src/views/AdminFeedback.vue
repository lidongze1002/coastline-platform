<template>
  <div style="padding: 16px; width: 100%">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px">
      <div style="font-weight: 800; font-size: 16px">反馈管理（管理员）</div>
      <el-button @click="load" :loading="loading">刷新</el-button>
    </div>

    <el-table :data="feedbacks" size="small" v-loading="loading">
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="email" label="邮箱" width="180" />
      <el-table-column prop="title" label="标题" min-width="150" />
      <el-table-column prop="content" label="内容" min-width="200">
        <template #default="{ row }">
          <div style="max-height: 60px; overflow: hidden; text-overflow: ellipsis">{{ row.content }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'completed' ? 'success' : 'warning'">
            {{ row.status === 'completed' ? '已处理' : '待处理' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="提交时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" @click="showDetail(row)">查看</el-button>
          <el-button v-if="row.status === 'pending'" size="small" type="success" @click="openCompleteDialog(row)">
            完成
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="反馈详情" width="500px">
      <div v-if="currentFeedback">
        <div style="margin-bottom: 8px"><b>用户：</b>{{ currentFeedback.username }}</div>
        <div style="margin-bottom: 8px"><b>邮箱：</b>{{ currentFeedback.email }}</div>
        <div style="margin-bottom: 8px"><b>标题：</b>{{ currentFeedback.title }}</div>
        <div style="margin-bottom: 8px">
          <b>内容：</b>
          <div style="margin-top: 8px; white-space: pre-wrap; background: #f5f5f5; padding: 8px; border-radius: 4px">
            {{ currentFeedback.content }}
          </div>
        </div>
        <div v-if="currentFeedback.status === 'completed'" style="margin-top: 12px">
          <b>处理结果：</b>
          <div v-if="currentFeedback.adminReply" style="margin-top: 8px; white-space: pre-wrap; color: #67c23a">
            {{ currentFeedback.adminReply }}
          </div>
          <div v-else style="margin-top: 8px; color: #909399">已标记为完成</div>
        </div>
      </div>
    </el-dialog>

    <!-- 完成处理对话框 -->
    <el-dialog v-model="completeVisible" title="完成反馈处理" width="400px">
      <div style="margin-bottom: 12px">确定要将此反馈标记为已完成吗？</div>
      <el-input v-model="adminReply" type="textarea" :rows="3" placeholder="回复内容（可选）" />
      <template #footer>
        <el-button @click="completeVisible = false">取消</el-button>
        <el-button type="primary" :loading="completing" @click="completeFeedback">确认完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { onMounted, ref } from "vue";

import { api } from "../utils/api";

const loading = ref(false);
const completing = ref(false);
const feedbacks = ref<any[]>([]);
const detailVisible = ref(false);
const completeVisible = ref(false);
const currentFeedback = ref<any>(null);
const adminReply = ref("");

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

async function load() {
  loading.value = true;
  try {
    const res = await api.get("/api/feedback/admin");
    feedbacks.value = res.data.feedbacks;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载失败");
  } finally {
    loading.value = false;
  }
}

function showDetail(row: any) {
  currentFeedback.value = row;
  detailVisible.value = true;
}

function openCompleteDialog(row: any) {
  currentFeedback.value = row;
  adminReply.value = "";
  completeVisible.value = true;
}

async function completeFeedback() {
  if (!currentFeedback.value) return;
  completing.value = true;
  try {
    await api.patch(`/api/feedback/${currentFeedback.value._id}/complete`, { adminReply: adminReply.value });
    ElMessage.success("已标记为完成");
    completeVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "操作失败");
  } finally {
    completing.value = false;
  }
}

onMounted(load);
</script>