import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

/**
 * Axios instance dengan konfigurasi "Secure & Seamless".
 * Menggunakan baseURL dari environment variable.
 */
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || "/api",
});

// Request Interceptor: Sisipkan Bearer Token secara otomatis
axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Global Error Handler untuk 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Force Reset State & Cache
      useAuthStore.getState().logout();
      
      // Redirect ke login untuk pembersihan total memory/state HANYA jika bukan di halaman login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
