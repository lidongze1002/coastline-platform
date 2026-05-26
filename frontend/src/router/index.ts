import { createRouter, createWebHistory } from "vue-router";

import { useAuthStore } from "../stores/auth";
import AdminDatasets from "../views/AdminDatasets.vue";
import AdminFeedback from "../views/AdminFeedback.vue";
import AdminUsers from "../views/AdminUsers.vue";
import BrowseHistory from "../views/BrowseHistory.vue";
import Comparison from "../views/Comparison.vue";
import DatasetList from "../views/DatasetList.vue";
import DatasetPreview from "../views/DatasetPreview.vue";
import Feedback from "../views/Feedback.vue";
import Login from "../views/Login.vue";
import MapPage from "../views/MapPage.vue";
import Profile from "../views/Profile.vue";
import ExportMapPage from "../views/ExportMapPage.vue";
import UserDatasets from "../views/UserDatasets.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: { name: "map" } },
    { path: "/login", name: "login", component: Login },
    { path: "/map", name: "map", component: MapPage, meta: { requiresAuth: true } },
    { path: "/comparison", name: "comparison", component: Comparison, meta: { requiresAuth: true } },
    { path: "/datasets", name: "datasets", component: DatasetList, meta: { requiresAuth: true } },
    { path: "/profile", name: "profile", component: Profile, meta: { requiresAuth: true } },
    { path: "/browse-history", name: "browse-history", component: BrowseHistory, meta: { requiresAuth: true } },
    { path: "/my-datasets", name: "my-datasets", component: UserDatasets, meta: { requiresAuth: true } },
    { path: "/export-map", name: "export-map", component: ExportMapPage, meta: { requiresAuth: true } },
    {
      path: "/admin/dataset-preview/:id",
      name: "dataset-preview",
      component: DatasetPreview,
      meta: { requiresAuth: true, requiresRole: "admin" },
    },
    {
      path: "/admin/datasets",
      name: "admin-datasets",
      component: AdminDatasets,
      meta: { requiresAuth: true, requiresRole: "admin" },
    },
    {
      path: "/admin/users",
      name: "admin-users",
      component: AdminUsers,
      meta: { requiresAuth: true, requiresRole: "admin" },
    },
    {
      path: "/admin/feedback",
      name: "admin-feedback",
      component: AdminFeedback,
      meta: { requiresAuth: true, requiresRole: "admin" },
    },
    { path: "/feedback", name: "feedback", component: Feedback, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta?.requiresAuth) return true;
  if (!auth.token) return { name: "login" };

  const role = to.meta?.requiresRole;
  if (role && auth.user?.role !== role) return { name: "map" };

  return true;
});

