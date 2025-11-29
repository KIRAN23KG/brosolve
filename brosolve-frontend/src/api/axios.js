// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api",  // 🔥 ONLY THIS – correct base URL
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("brosolve_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
