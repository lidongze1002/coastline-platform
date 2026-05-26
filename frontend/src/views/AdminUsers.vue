<template>
  <div style="padding: 16px; width: 100%">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px">
      <div style="font-weight: 800; font-size: 16px">用户管理（管理员）</div>
      <el-button @click="load" :loading="loading">刷新</el-button>
    </div>

    <el-table :data="users" size="small" style="width: 100%">
      <el-table-column prop="username" label="用户名" width="200" />
      <el-table-column prop="role" label="角色" width="140">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">{{ row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="320">
        <template #default="{ row }">
          <el-button size="small" :disabled="row.role==='admin'" @click="setRole(row.id, 'admin')">
            设为管理员
          </el-button>
          <el-button size="small" :disabled="row.role==='user'" @click="setRole(row.id, 'user')">
            设为用户
          </el-button>
          <el-button size="small" type="danger" @click="confirmDeleteUser(row.id)" style="margin-left:8px">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref } from "vue";

import { api } from "../utils/api";

type Role = "user" | "admin";
type UserRow = { id: string; username: string; role: Role; createdAt: string };

const loading = ref(false);
const users = ref<UserRow[]>([]);

function fmt(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(
    2,
    "0",
  )} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

async function load() {
  loading.value = true;
  try {
    const res = await api.get("/api/users");
    users.value = res.data.users;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载失败");
  } finally {
    loading.value = false;
  }
}

async function setRole(id: string, role: Role) {
  try {
    await api.patch(`/api/users/${id}/role`, { role });
    ElMessage.success("已更新");
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "更新失败");
  }
}

async function confirmDeleteUser(id: string) {
  try {
    const { value } = await (ElMessageBox as any).prompt(
      "请输入管理员密码以确认删除",
      "删除用户",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        inputType: "password",
        inputPattern: /.+/,
        inputPlaceholder: "管理员密码",
      }
    );

    // If password provided, attempt deletion
    await api.delete(`/api/users/${id}`, { data: { password: value } });
    ElMessage.success("删除成功");
    await load();
  } catch (e: any) {
    // If user canceled, value will be undefined and catch will handle; otherwise show error from server
    const msg = e?.response?.data?.message ?? (e?.message ?? "删除失败");
    ElMessage.error(msg);
  }
}

onMounted(load);
</script>

