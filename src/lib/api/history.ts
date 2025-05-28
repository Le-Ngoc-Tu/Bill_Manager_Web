import apiClient, { API_URL } from "./config";

// Định nghĩa kiểu dữ liệu
export interface HistoryItem {
  id: number;
  user_id: number;
  noi_dung: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: number;
    username: string;
    role_id: string;
  };
  // Các trường để tương thích với giao diện
  action?: string;
  module?: string;
  description?: string;
  username?: string;
  ip_address?: string;
  details?: string;
}

// Lấy danh sách lịch sử
export const getHistory = async (params?: Record<string, string>) => {
  try {
    // Tạo URL với các tham số tìm kiếm
    let url = `${API_URL}/logs`;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url = `${url}?${queryString}`;
    }

    const response = await apiClient.get(url);

    // Chuyển đổi dữ liệu để phù hợp với giao diện
    if (response.data) {
      // Kiểm tra cấu trúc dữ liệu trả về
      const logs = response.data.logs || response.data.rows || [];
      const total = response.data.total || response.data.count || 0;

      const formattedData = logs.map((item: any) => ({
        ...item,
        action: "LOG", // Mặc định là LOG
        module: "System", // Mặc định là System
        description: item.noi_dung,
        username: item.user ? item.user.username : "Unknown",
        details: JSON.stringify({ content: item.noi_dung })
      }));

      return {
        success: true,
        data: formattedData,
        count: total
      };
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching history:", error);
    // Trả về một đối tượng với success = false để xử lý lỗi ở UI
    return {
      success: false,
      message: "Không thể tải dữ liệu lịch sử hoạt động",
      data: []
    };
  }
};

// Lấy chi tiết lịch sử
export const getHistoryById = async (id: number) => {
  try {
    const response = await apiClient.get(`/logs/${id}`);

    // Chuyển đổi dữ liệu để phù hợp với giao diện
    if (response.data) {
      const item = response.data;
      // Đảm bảo các trường cần thiết tồn tại
      const formattedData = {
        ...item,
        id: item.id,
        user_id: item.user_id,
        noi_dung: item.noi_dung || '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        user: item.user || { username: 'Unknown' },
        action: "LOG", // Mặc định là LOG
        module: "System", // Mặc định là System
        description: item.noi_dung || '',
        username: item.user ? item.user.username : "Unknown",
        details: JSON.stringify({ content: item.noi_dung || '' })
      };

      return {
        success: true,
        data: formattedData
      };
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching history details:", error);
    // Trả về một đối tượng với success = false để xử lý lỗi ở UI
    return {
      success: false,
      message: "Không thể tải chi tiết lịch sử hoạt động",
      data: null
    };
  }
};
