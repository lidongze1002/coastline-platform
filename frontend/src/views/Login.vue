<template>
  <div class="fullpage-center">
    <img src="/logo.png" alt="Logo" style="height: 120px; object-fit: contain; margin-bottom: 20px; background: transparent;" />
    <el-card class="card">
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between">
          <div style="font-weight: 700">{{ activeTab === 'login' ? '登录' : '注册' }}</div>
          <el-tag type="info">海洋地理信息系统</el-tag>
        </div>
      </template>

      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="用户名">
              <el-input v-model="loginForm.username" autocomplete="username" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password" autocomplete="current-password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading" style="width: 100%" @click="onLogin">
                登录
              </el-button>
            </el-form-item>
          </el-form>
          
          <div style="font-size: 13px; opacity: 0.8; line-height: 1.6">
            <div>演示账号：</div>
            <div><b>admin</b> / <b>admin123</b>（管理员）</div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form label-position="top" :rules="registerRules" :model="registerForm" ref="registerFormRef">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="registerForm.username" placeholder="3-32个字符" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="registerForm.password" type="password" placeholder="至少6个字符" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="registerForm.confirmPassword" type="password" placeholder="再次输入密码" show-password />
            </el-form-item>
            
            <el-divider content-position="center">选填信息（可选）</el-divider>
            
            <el-form-item label="性别">
              <el-radio-group v-model="registerForm.gender">
                <el-radio value="male">男</el-radio>
                <el-radio value="female">女</el-radio>
                <el-radio value="other">其他</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="学校/单位">
              <el-input v-model="registerForm.school" placeholder="如：北京大学" />
            </el-form-item>
            <el-form-item label="个人简介">
              <el-input v-model="registerForm.bio" type="textarea" :rows="2" placeholder="介绍一下自己..." />
            </el-form-item>
            
            <el-form-item>
              <el-button type="success" :loading="loading" style="width: 100%" @click="onRegister">
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";

import { useAuthStore } from "../stores/auth";
import { api } from "../utils/api";

const router = useRouter();
const auth = useAuthStore();

const activeTab = ref("login");
const loading = ref(false);
const registerFormRef = ref<FormInstance>();

const loginForm = reactive({
  username: "admin",
  password: "admin123",
});

const registerForm = reactive({
  username: "",
  password: "",
  confirmPassword: "",
  gender: "" as "" | "male" | "female" | "other",
  school: "",
  bio: "",
});

const validatePassword = (_rule: any, value: string, callback: any) => {
  if (value !== registerForm.password) {
    callback(new Error("两次输入的密码不一致"));
  } else {
    callback();
  }
};

const registerRules: FormRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, max: 32, message: "用户名需要3-32个字符", trigger: "blur" },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码至少6个字符", trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, message: "请确认密码", trigger: "blur" },
    { validator: validatePassword, trigger: "blur" },
  ],
};

async function onLogin() {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning("请输入用户名和密码");
    return;
  }
  console.log("[Login] attempting:", loginForm.username);
  loading.value = true;
  try {
    await auth.login(loginForm.username, loginForm.password);
    await auth.refreshMe();
    router.push({ name: "map" });
  } catch (e: any) {
    console.log("[Login] error:", e);
    ElMessage.error(e?.response?.data?.message ?? "登录失败");
  } finally {
    loading.value = false;
  }
}

async function onRegister() {
  if (!registerFormRef.value) return;
  await registerFormRef.value.validate().catch(() => {});
  
  if (!registerForm.username || !registerForm.password) {
    ElMessage.warning("请填写必填信息");
    return;
  }
  
  loading.value = true;
  try {
    await api.post("/api/auth/register", {
      username: registerForm.username,
      password: registerForm.password,
      gender: registerForm.gender || "",
      school: registerForm.school,
      bio: registerForm.bio,
    });
    ElMessage.success("注册成功，请登录");
    activeTab.value = "login";
    loginForm.username = registerForm.username;
    loginForm.password = "";
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "注册失败");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.fullpage-center {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f4f8 0%, #d4e8ed 100%);
}

.card {
  width: 400px;
  max-width: 90vw;
}

:deep(.el-card__body) {
  padding-top: 10px;
}
</style>