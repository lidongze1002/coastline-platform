import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "http://localhost:3001",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("coastline.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

