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

// Biến để theo dõi quá trình refresh token
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Hàm để đăng ký các request đang chờ token mới
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// Hàm để thông báo cho tất cả các request đang chờ với token mới
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

// Hàm để refresh token
const refreshToken = async (): Promise<string> => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Kiểm tra refreshToken có hết hạn không
    if (isTokenExpired(refreshToken)) {
      throw new Error("Refresh token expired");
    }

    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken,
    });

    const { accessToken } = response.data;
    localStorage.setItem("accessToken", accessToken);

    return accessToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    // Xóa token và thông tin người dùng
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    // Chuyển hướng đến trang đăng nhập
    if (typeof window !== 'undefined') {
      window.location.href = "/login";
    }

    throw error;
  }
};

// Tạo instance axios với cấu hình mặc định
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor cho request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Lấy token từ localStorage
    let accessToken = localStorage.getItem("accessToken");

    // Nếu có token và token sắp hết hạn, thử refresh token
    if (accessToken && isTokenExpired(accessToken)) {
      console.log("Access token sắp hết hạn, đang làm mới...");

      // Nếu chưa có quá trình refresh nào đang diễn ra
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          // Thực hiện refresh token
          accessToken = await refreshToken();
          isRefreshing = false;
          onRefreshed(accessToken);
        } catch (error) {
          console.error("Failed to refresh token:", error);
          isRefreshing = false;
          throw error;
        }
      } else {
        // Nếu đang có quá trình refresh, đăng ký request này để chờ
        const retryOriginalRequest = new Promise<InternalAxiosRequestConfig>(resolve => {
          subscribeTokenRefresh((token: string) => {
            config.headers.Authorization = `Bearer ${token}`;
            resolve(config);
          });
        });

        return retryOriginalRequest;
      }
    }

    // Thêm token vào header nếu có
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor cho response
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    // Kiểm tra lỗi 401 (Unauthorized) và chưa thử lại - ƯU TIÊN THỬ REFRESH TOKEN TRƯỚC
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('auth/login') &&
      !originalRequest.url.includes('auth/refresh-token')
    ) {
      // Đánh dấu request này đã được thử refresh token
      originalRequest._retry = true;

      // Nếu chưa có quá trình refresh nào đang diễn ra
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          console.log("🔄 Attempting to refresh token due to 401 error...");
          // Thực hiện refresh token
          const accessToken = await refreshToken();
          console.log("✅ Token refreshed successfully");
          isRefreshing = false;
          onRefreshed(accessToken);

          // Cập nhật token trong header của request gốc
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Thử lại request gốc
          return apiClient(originalRequest);
        } catch (refreshError) {
          console.error("❌ Failed to refresh token on 401:", refreshError);
          isRefreshing = false;

          // Clear tokens and redirect
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
      } else {
        // Nếu đang có quá trình refresh, đăng ký request này để chờ
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }
    }

    // Chỉ logout ngay lập tức khi không thể refresh token hoặc các lỗi khác không phải 401
    const errorCode = error.response?.data?.code;
    const LOGOUT_ERROR_CODES = ['INVALID_TOKEN', 'TOKEN_NOT_ACTIVE'];

    // Chỉ logout ngay cho các lỗi không thể recover được (không bao gồm TOKEN_EXPIRED vì đã thử refresh ở trên)
    if (LOGOUT_ERROR_CODES.includes(errorCode)) {
      console.log(`Non-recoverable authentication error: ${errorCode}`);

      // Clear tokens and redirect to login
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      if (typeof window !== 'undefined') {
        const { toast } = await import("sonner");
        toast.error("Phiên đăng nhập không hợp lệ", {
          description: "Bạn sẽ được chuyển hướng đến trang đăng nhập",
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        });

        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      }

      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
