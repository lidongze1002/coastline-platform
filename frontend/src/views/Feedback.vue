<template>
  <div style="padding: 16px; max-width: 800px; margin: 0 auto">
    <div style="font-weight: 800; font-size: 18px; margin-bottom: 16px">意见反馈</div>

    <!-- 提交反馈表单 -->
    <el-card style="margin-bottom: 16px">
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="您的邮箱" prop="email">
          <el-input v-model="form.email" placeholder="用于接收回复通知" />
        </el-form-item>
        <el-form-item label="反馈标题" prop="title">
          <el-input v-model="form.title" placeholder="简要描述问题或建议" />
        </el-form-item>
        <el-form-item label="详细内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="5" placeholder="请详细描述您的问题或改进建议..." />
        </el-form-item>
        <el-button type="primary" :loading="submitting" @click="submitFeedback">提交反馈</el-button>
      </el-form>
    </el-card>

    <!-- 我的反馈历史 -->
    <div style="font-weight: 700; margin-bottom: 12px">我的反馈记录</div>
    <el-table :data="feedbacks" v-loading="loading" size="small">
      <el-table-column prop="title" label="标题" min-width="150" />
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
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" @click="showDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 反馈详情对话框 -->
    <el-dialog v-model="detailVisible" title="反馈详情" width="500px">
      <div v-if="currentFeedback">
        <div style="margin-bottom: 12px">
          <b>标题：</b>{{ currentFeedback.title }}
        </div>
        <div style="margin-bottom: 12px">
          <b>状态：</b>
          <el-tag :type="currentFeedback.status === 'completed' ? 'success' : 'warning'">
            {{ currentFeedback.status === 'completed' ? '已处理' : '待处理' }}
          </el-tag>
        </div>
        <div style="margin-bottom: 12px">
          <b>提交时间：</b>{{ formatDate(currentFeedback.createdAt) }}
        </div>
        <div style="margin-bottom: 12px">
          <b>内容：</b>
          <div style="margin-top: 8px; white-space: pre-wrap">{{ currentFeedback.content }}</div>
        </div>
        <div v-if="currentFeedback.status === 'completed'" style="margin-top: 16px; padding: 12px; background: #f0f9eb; border-radius: 4px">
          <b>处理结果：</b>
          <div v-if="currentFeedback.adminReply" style="margin-top: 8px; white-space: pre-wrap">{{ currentFeedback.adminReply }}</div>
          <div v-else style="margin-top: 8px; color: #909399">问题已解决，感谢您的反馈！</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { onMounted, ref } from "vue";

import { api } from "../utils/api";

const formRef = ref();
const form = ref({ email: "", title: "", content: "" });
const rules = {
  email: [{ required: true, message: "请输入邮箱", trigger: "blur" }],
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  content: [{ required: true, message: "请输入内容", trigger: "blur" }],
};

const submitting = ref(false);
const loading = ref(false);
const feedbacks = ref<any[]>([]);
const detailVisible = ref(false);
const currentFeedback = ref<any>(null);

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

async function loadFeedbacks() {
  loading.value = true;
  try {
    const res = await api.get("/api/feedback/my");
    feedbacks.value = res.data.feedbacks;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载失败");
  } finally {
    loading.value = false;
  }
}

async function submitFeedback() {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    await api.post("/api/feedback", form.value);
    ElMessage.success("反馈已提交");
    form.value = { email: "", title: "", content: "" };
    await loadFeedbacks();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "提交失败");
  } finally {
    submitting.value = false;
  }
}

function showDetail(row: any) {
  currentFeedback.value = row;
  detailVisible.value = true;
}

onMounted(loadFeedbacks);
</script>