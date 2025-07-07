import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';

// API URL từ biến môi trường
export const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7010/api";

// Kiểu dữ liệu cho JWT token
interface JwtPayload {
  exp: number;
  iat: number;
  userId: number;
  username: string;
  email: string;
}

// Hàm helper để lấy token
export const getAuthHeader = () => {
  const accessToken = localStorage.getItem("accessToken");
  return {
    Authorization: `Bearer ${accessToken}`
  };
};

// Kiểm tra token có hết hạn chưa
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    // Thời gian hết hạn (tính bằng giây)
    const currentTime = Date.now() / 1000;

    // Token sẽ được coi là hết hạn nếu còn dưới 60 giây
    return decoded.exp < currentTime + 60;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true;
  }
};

// Loại bỏ các biến phức tạp không cần thiết theo mẫu axiosCustomize.js

// Loại bỏ hàm refreshToken riêng biệt - sử dụng trực tiếp trong interceptor theo mẫu

// Tạo instance axios với cấu hình mặc định
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor cho request - ĐƠN GIẢN HÓA THEO MẪU axiosCustomize.js
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor cho response - ĐƠN GIẢN HÓA THEO MẪU axiosCustomize.js
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    // Chỉ xử lý 401 error và thử refresh token 1 lần duy nhất
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        console.log("🔄 Attempting to refresh token due to 401 error...");
        const response = await apiClient.post('/auth/refresh-token', { refreshToken });
        const { accessToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

        console.log("✅ Token refreshed successfully, retrying original request");
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("❌ Failed to refresh token:", refreshError);

        // Clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        if (typeof window !== 'undefined') {
          const { toast } = await import("sonner");
          toast.error("Phiên đăng nhập đã hết hạn", {
            description: "Vui lòng đăng nhập lại",
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          });

          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
