"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

// API URL từ biến môi trường
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7010/api";

interface User {
  id: number;
  username: string;
  email: string;
  role_id: string;
  isAuthenticated: boolean;
  avatar?: string;
  fullname?: string;
  role_name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
  loading: boolean;
  loginWithCredentials: (username: string, password: string) => Promise<any>;
  verifyCode: (username: string, uuid: string, code: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tạo UUID cho thiết bị
const generateDeviceUuid = () => {
  let deviceUuid = localStorage.getItem("device_uuid");
  if (!deviceUuid) {
    deviceUuid = crypto.randomUUID();
    localStorage.setItem("device_uuid", deviceUuid);
  }
  return deviceUuid;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Thiết lập axios interceptor để thêm token vào header
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    }

    // Interceptor để xử lý token hết hạn
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) throw new Error("No refresh token");

            const response = await axios.post(`${API_URL}/auth/refresh-token`, {
              refreshToken,
            });

            const { accessToken } = response.data;
            localStorage.setItem("accessToken", accessToken);
            axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
            originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

            return axios(originalRequest);
          } catch (refreshError) {
            // Nếu refresh token cũng hết hạn, đăng xuất người dùng
            logout();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    // Kiểm tra dữ liệu đăng nhập trong localStorage khi khởi động
    console.log("AuthProvider initialized, checking localStorage");
    try {
      const accessToken = localStorage.getItem("accessToken");
      const userData = localStorage.getItem("user");

      if (accessToken && userData) {
        console.log("Found stored user data and token");
        setUser(JSON.parse(userData));
        // Kiểm tra token có hợp lệ không
        validateToken();
      } else {
        console.log("No stored user data or token found");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking localStorage:", error);
      setLoading(false);
    }
  }, []);

  // Kiểm tra token có hợp lệ không
  const validateToken = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const userData = localStorage.getItem("user");
      if (!accessToken || !userData) {
        setUser(null);
        setLoading(false);
        return;
      }

      const parsedUser = JSON.parse(userData);

      // Gọi API để kiểm tra token - sử dụng endpoint users/:id
      await axios.get(`${API_URL}/users/${parsedUser.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Nếu không có lỗi, token vẫn hợp lệ
      setLoading(false);
    } catch (error) {
      console.error("Token validation failed:", error);
      // Thử refresh token
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem("accessToken", accessToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      } catch (refreshError) {
        // Nếu refresh token cũng hết hạn, đăng xuất người dùng
        setUser(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
      setLoading(false);
    }
  };

  // Đăng nhập với username và password
  const loginWithCredentials = async (username: string, password: string) => {
    try {
      const deviceUuid = generateDeviceUuid();
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
        uuid: deviceUuid,
      });

      // Nếu cần xác thực 2 lớp
      if (response.data.requireVerification) {
        return {
          requireVerification: true,
          message: response.data.message,
          username,
          uuid: deviceUuid,
        };
      }

      // Nếu đăng nhập thành công
      const { accessToken, refreshToken, user: userData } = response.data;
      handleSuccessfulLogin(accessToken, refreshToken, userData);

      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Đăng nhập thất bại",
      };
    }
  };

  // Xác thực mã code
  const verifyCode = async (username: string, uuid: string, code: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-code`, {
        username,
        uuid,
        confirmationCode: code,
      });

      const { accessToken, refreshToken, user: userData } = response.data;
      handleSuccessfulLogin(accessToken, refreshToken, userData);

      return { success: true };
    } catch (error: any) {
      console.error("Verification error:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Xác thực thất bại",
      };
    }
  };

  // Xử lý đăng nhập thành công
  const handleSuccessfulLogin = (accessToken: string, refreshToken: string, userData: any) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    const userWithAuth = {
      ...userData,
      isAuthenticated: true,
    };

    setUser(userWithAuth);
    localStorage.setItem("user", JSON.stringify(userWithAuth));
    axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    router.push("/dashboard");
  };

  // Đăng nhập (giữ lại để tương thích với code cũ)
  const login = (username: string) => {
    console.log(`User logged in: ${username}`);
    const newUser = {
      id: 1,
      username,
      email: `${username}@example.com`,
      role_id: "1",
      isAuthenticated: true,
    };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
    router.push("/dashboard");
  };

  // Đăng xuất
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await axios.post(`${API_URL}/auth/logout`, { refreshToken });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      delete axios.defaults.headers.common["Authorization"];
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      loginWithCredentials,
      verifyCode
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// HOC để bảo vệ các trang yêu cầu đăng nhập
export function withAuth<T extends object>(Component: React.ComponentType<T>) {
  return function WithAuth(props: any) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      console.log("withAuth HOC check:", { user, loading });
      if (!loading && !user) {
        router.push("/login");
      }
    }, [loading, user, router]);

    // Hiển thị màn hình loading trong khi kiểm tra trạng thái đăng nhập
    if (loading || !user) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
          <span className="ml-2">Đang tải...</span>
        </div>
      );
    }

    return <Component {...props} />;
  };
}