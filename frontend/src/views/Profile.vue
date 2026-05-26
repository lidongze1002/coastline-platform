<template>
  <div class="profile-page">
    <el-card>
      <template #header>
        <div style="display: flex; align-items: center; gap: 12px">
          <el-button text @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <div style="font-weight: 700; font-size: 16px">个人主页</div>
        </div>
      </template>
      
      <div style="display: flex; flex-direction: column; gap: 24px; align-items: center; padding: 20px">
        <!-- 头像 -->
        <div style="position: relative">
          <el-avatar :size="100" :src="form.avatar" style="background: #409eff; font-size: 40px">
            {{ form.username?.[0]?.toUpperCase() }}
          </el-avatar>
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            :on-change="onAvatarChange"
            style="position: absolute; bottom: 0; right: 0"
          >
            <el-button size="small" circle type="primary">
              <el-icon><Camera /></el-icon>
            </el-button>
          </el-upload>
        </div>
        
        <el-form label-position="top" :model="form" style="width: 100%; max-width: 400px">
          <el-form-item label="用户名">
            <el-input v-model="form.username" disabled />
          </el-form-item>
          
          <el-form-item label="性别">
            <el-radio-group v-model="form.gender">
              <el-radio value="">未知</el-radio>
              <el-radio value="male">男</el-radio>
              <el-radio value="female">女</el-radio>
              <el-radio value="other">其他</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="学校/单位">
            <el-input v-model="form.school" placeholder="如：北京大学" />
          </el-form-item>
          
          <el-form-item label="个人简介">
            <el-input v-model="form.bio" type="textarea" :rows="3" placeholder="介绍一下自己..." />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" :loading="saving" style="width: 100%" @click="saveProfile">
              保存修改
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type { UploadFile } from "element-plus";
import { reactive, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Camera, ArrowLeft } from "@element-plus/icons-vue";

import { useAuthStore } from "../stores/auth";
import { api } from "../utils/api";

const router = useRouter();
const auth = useAuthStore();

function goBack() {
  router.back();
}
const saving = ref(false);

const form = reactive({
  username: "",
  avatar: "",
  gender: "" as "" | "male" | "female" | "other",
  school: "",
  bio: "",
});

onMounted(async () => {
  if (auth.user) {
    form.username = auth.user.username || "";
    form.avatar = auth.user.avatar || "";
    form.gender = (auth.user.gender as any) || "";
    form.school = auth.user.school || "";
    form.bio = auth.user.bio || "";
  }
});

async function onAvatarChange(file: UploadFile) {
  if (!file.raw) return;
  
  // 创建本地预览
  const reader = new FileReader();
  reader.onload = (e) => {
    form.avatar = e.target?.result as string;
  };
  reader.readAsDataURL(file.raw);
}

async function saveProfile() {
  saving.value = true;
  console.log("[Profile] saving:", form);
  try {
    const res = await api.patch("/api/users/me", {
      avatar: form.avatar,
      gender: form.gender,
      school: form.school,
      bio: form.bio,
    });
    console.log("[Profile] response:", res.data);
    ElMessage.success("保存成功");
    await auth.refreshMe();
  } catch (e: any) {
    console.log("[Profile] error:", e.response?.data ?? e);
    ElMessage.error(e?.response?.data?.message ?? "保存失败");
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.profile-page {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}
</style>