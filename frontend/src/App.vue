<template>
  <div class="app-shell">
    <el-container style="height: 100%">
      <el-header v-if="showHeader" height="56px" style="display: flex; align-items: center; gap: 16px; z-index: 1000; position: relative">
        <!-- 仅在非主页页面显示返回主页按钮 -->
        <el-button v-if="showHomeButton" text @click="goHome">
          <el-icon><HomeFilled /></el-icon>
        </el-button>
        <img src="/logo.png" alt="Logo" style="height: 50px; object-fit: contain;" />
        <div style="font-weight: 700; font-size: 16px">海岸线数据共享服务平台</div>
        <el-tag type="info" v-if="auth.user" size="small">{{ auth.user.role === 'admin' ? '管理员' : '用户' }}</el-tag>

        <div style="flex: 1"></div>

        <template v-if="auth.user">
          <!-- 头像下拉菜单 -->
          <el-dropdown 
            @command="onDropdownCommand" 
            :teleported="false"
            popper-class="user-dropdown"
          >
            <div style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px; border-radius: 20px; background: #f5f7fa">
              <el-avatar :size="32" :src="auth.user.avatar || undefined">
                {{ auth.user.username?.[0]?.toUpperCase() }}
              </el-avatar>
              <span style="font-size: 14px">{{ auth.user.username }}</span>
              <span style="opacity: 0.6; font-size: 12px">▼</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu style="z-index: 9999">
                <el-dropdown-item command="datasets">
                  <el-icon><Collection /></el-icon> 数据集浏览
                </el-dropdown-item>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon> 个人主页
                </el-dropdown-item>
                <el-dropdown-item command="history">
                  <el-icon><Clock /></el-icon> 浏览记录
                </el-dropdown-item>
                <el-dropdown-item command="my-datasets" divided>
                  <el-icon><Folder /></el-icon> 我的数据集
                </el-dropdown-item>
                <el-dropdown-item v-if="auth.user.role === 'admin'" command="admin-datasets">
                  <el-icon><DataLine /></el-icon> 数据集管理
                </el-dropdown-item>
                <el-dropdown-item v-if="auth.user.role === 'admin'" command="admin-users">
                  <el-icon><UserFilled /></el-icon> 用户管理
                </el-dropdown-item>
                <el-dropdown-item v-if="auth.user.role === 'admin'" command="admin-feedback">
                  <el-icon><MessageBox /></el-icon> 反馈管理
                </el-dropdown-item>
                <el-dropdown-item command="feedback">
                  <el-icon><MessageBox /></el-icon> 意见反馈
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <el-button v-else type="primary" @click="goLogin">登录</el-button>
      </el-header>

      <el-main class="app-main" style="padding: 0">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { User, Clock, DataLine, UserFilled, SwitchButton, Folder, HomeFilled, Collection, MessageBox } from "@element-plus/icons-vue";

import { useAuthStore } from "./stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const showHeader = computed(() => route.name !== "login");

// 只在登录页面不显示主页按钮
const showHomeButton = computed(() => {
  return route.name !== "login";
});

function goLogin() {
  router.push({ name: "login" });
}

function goHome() {
  router.push({ name: "map" });
}

function goBack() {
  router.back();
}

function onDropdownCommand(cmd: string) {
  switch (cmd) {
    case "datasets":
      router.push({ name: "datasets" });
      break;
    case "profile":
      router.push({ name: "profile" });
      break;
    case "history":
      router.push({ name: "browse-history" });
      break;
    case "my-datasets":
      router.push({ name: "my-datasets" });
      break;
    case "admin-datasets":
      router.push({ name: "admin-datasets" });
      break;
    case "admin-users":
      router.push({ name: "admin-users" });
      break;
    case "admin-feedback":
      router.push({ name: "admin-feedback" });
      break;
    case "feedback":
      router.push({ name: "feedback" });
      break;
    case "logout":
      auth.logout();
      router.push({ name: "login" });
      ElMessage.success("已退出登录");
      break;
  }
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f5f7fa;
}
:deep(.el-dropdown-menu) {
  z-index: 10000 !important;
}
:deep(.el-popper) {
  z-index: 10000 !important;
}
</style>