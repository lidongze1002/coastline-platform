import { defineStore } from "pinia";

import { api } from "../utils/api";

type Role = "user" | "admin";
type User = { 
  id: string; 
  username: string; 
  role: Role;
  avatar?: string;
  gender?: string;
  school?: string;
  bio?: string;
};

const LS_TOKEN = "coastline.token";
const LS_USER = "coastline.user";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: (localStorage.getItem(LS_TOKEN) as string | null) ?? null,
    user: (localStorage.getItem(LS_USER)
      ? (JSON.parse(localStorage.getItem(LS_USER) as string) as User)
      : null) as User | null,
    loading: false,
  }),
  actions: {
    async login(username: string, password: string) {
      this.loading = true;
      try {
        console.log("[auth.login] attempting:", username);
        const res = await api.post("/api/auth/login", { username, password });
        console.log("[auth.login] response:", res.data);
        this.token = res.data.token;
        this.user = res.data.user;
        localStorage.setItem(LS_TOKEN, this.token ?? "");
        localStorage.setItem(LS_USER, JSON.stringify(this.user));
      } catch (err: any) {
        console.log("[auth.login] error:", err.response?.data ?? err.message);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_USER);
    },
    async refreshMe() {
      if (!this.token) return;
      const res = await api.get("/api/users/me");
      this.user = res.data.user;
      localStorage.setItem(LS_USER, JSON.stringify(this.user));
    },
  },
});

