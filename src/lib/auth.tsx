"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import apiClient, { API_URL, isTokenExpired } from "./api/config";
import jwtDecode from "jwt-decode";
import { TokenMonitor, DEFAULT_TOKEN_MONITOR_CONFIG, type TokenMonitorConfig } from "./token-monitor";
import { toast } from "sonner";

interface User {
  id: number;
  username: string;
  email: string;
  role_id: string;
  isAuthenticated: boolean;
  avatar?: string;
  fullname?: string;
  role_name?: string;
  permissions?: string[];
  userDetailsLoaded?: boolean; // Thêm flag để biết đã tải thông tin chi tiết chưa
}

interface AuthContextType {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
  loading: boolean;
  loginWithCredentials: (username: string, password: string) => Promise<any>;
  verifyCode: (username: string, uuid: string, code: string) => Promise<any>;
  forceTokenRefresh: () => Promise<void>;
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
  const tokenMonitorRef = useRef<TokenMonitor | null>(null);

  // Initialize token monitor
  const initializeTokenMonitor = () => {
    if (tokenMonitorRef.current) {
      tokenMonitorRef.current.stop();
    }

    const config: TokenMonitorConfig = {
      ...DEFAULT_TOKEN_MONITOR_CONFIG,
      onTokenExpired: () => {
        console.log("Token expired, logging out user");
        toast.error("Phiên đăng nhập đã hết hạn", {
          description: "Bạn sẽ được chuyển hướng đến trang đăng nhập",
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        });
        logout();
      },
      onTokenNearExpiry: async () => {
        console.log("Token near expiry, attempting refresh");
        try {
          await forceTokenRefresh();
          toast.success("Phiên đăng nhập đã được gia hạn", {
            className: "text-lg font-medium"
          });
        } catch (error) {
          console.error("Failed to refresh token:", error);
          toast.error("Không thể gia hạn phiên đăng nhập", {
            description: "Vui lòng đăng nhập lại",
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          });
          logout();
        }
      },
      onTokenRefreshed: (newToken: string) => {
        console.log("Token refreshed successfully");
        localStorage.setItem("accessToken", newToken);
      },
      onError: (error: Error) => {
        console.error("Token monitor error:", error);
        toast.error("Lỗi kiểm tra phiên đăng nhập", {
          description: error.message,
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        });
      }
    };

    tokenMonitorRef.current = new TokenMonitor(config);
  };

  useEffect(() => {
    // Initialize token monitor
    initializeTokenMonitor();

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

    // Cleanup function
    return () => {
      if (tokenMonitorRef.current) {
        tokenMonitorRef.current.stop();
      }
    };
  }, []);

  // Start/stop token monitoring based on user authentication status
  useEffect(() => {
    if (user && tokenMonitorRef.current) {
      console.log("Starting token monitor for authenticated user");
      tokenMonitorRef.current.start();
    } else if (!user && tokenMonitorRef.current) {
      console.log("Stopping token monitor for unauthenticated user");
      tokenMonitorRef.current.stop();
    }
  }, [user]);

  // Kiểm tra token có hợp lệ không và tải thông tin chi tiết người dùng
  const validateToken = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      const userData = localStorage.getItem("user");

      if (!accessToken || !refreshToken || !userData) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Kiểm tra cả accessToken và refreshToken
      const isAccessTokenExpired = isTokenExpired(accessToken);
      const isRefreshTokenExpired = isTokenExpired(refreshToken);

      // Nếu refreshToken hết hạn, đăng xuất người dùng
      if (isRefreshTokenExpired) {
        console.log("Refresh token đã hết hạn, đăng xuất người dùng");

        // Hiển thị thông báo cho người dùng
        if (typeof window !== 'undefined') {
          alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }

        // Đăng xuất người dùng
        logout();
        setLoading(false);
        return;
      }

      const parsedUser = JSON.parse(userData);

      // Nếu chưa tải thông tin chi tiết người dùng, tải ngay bây giờ
      if (!parsedUser.userDetailsLoaded) {
        try {
          // Gọi API để lấy thông tin chi tiết người dùng
          const response = await apiClient.get(`/users/${parsedUser.id}`);

          // Cập nhật thông tin người dùng với dữ liệu chi tiết
          const userDetails = response.data.data || response.data;
          const updatedUser = {
            ...parsedUser,
            avatar: userDetails.avatar,
            fullname: userDetails.fullname,
            email: userDetails.email || parsedUser.email,
            role_name: userDetails.role_name,
            permissions: userDetails.permissions,
            userDetailsLoaded: true
          };

          // Cập nhật state và localStorage
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } catch (detailsError: any) {
          console.error("Failed to fetch user details:", detailsError);

          // Vẫn tiếp tục với thông tin cơ bản nếu không lấy được chi tiết
          // apiClient sẽ tự động xử lý refresh token nếu cần
        }
      } else {
        // Nếu đã tải thông tin chi tiết, sử dụng thông tin đã lưu
        setUser(parsedUser);
      }

      // Nếu không có lỗi, token vẫn hợp lệ
      setLoading(false);
    } catch (error: any) {
      console.error("Token validation failed:", error);

      // Xử lý lỗi không liên quan đến token
      setUser(null);
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

  // Force token refresh
  const forceTokenRefresh = async (): Promise<void> => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh-token`, {
        refreshToken,
      });

      const { accessToken } = response.data;
      localStorage.setItem("accessToken", accessToken);

      console.log("Token refreshed successfully");
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw error;
    }
  };

  // Xử lý đăng nhập thành công
  const handleSuccessfulLogin = (accessToken: string, refreshToken: string, userData: any) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    const userWithAuth = {
      ...userData,
      isAuthenticated: true,
      userDetailsLoaded: false, // Đánh dấu rằng thông tin chi tiết chưa được tải
    };

    setUser(userWithAuth);
    localStorage.setItem("user", JSON.stringify(userWithAuth));
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
      // Stop token monitoring
      if (tokenMonitorRef.current) {
        tokenMonitorRef.current.stop();
      }

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          await apiClient.post(`/auth/logout`, { refreshToken });
          console.log("Đăng xuất thành công trên server");
        } catch (logoutError) {
          // Nếu có lỗi khi gọi API logout, vẫn tiếp tục đăng xuất ở client
          console.warn("Không thể đăng xuất trên server, tiếp tục đăng xuất ở client:", logoutError);
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Xóa dữ liệu người dùng khỏi state
      setUser(null);

      // Xóa tất cả dữ liệu đăng nhập khỏi localStorage
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("lastActivity");

      console.log("Đã đăng xuất và xóa dữ liệu người dùng");

      // Chuyển hướng về trang đăng nhập
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
      verifyCode,
      forceTokenRefresh
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