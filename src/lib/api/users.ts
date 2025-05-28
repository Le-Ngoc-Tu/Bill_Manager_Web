import apiClient, { API_URL } from "./config";

// Định nghĩa kiểu dữ liệu
export interface User {
  id: number;
  username: string;
  fullname?: string;
  email: string;
  avatar?: string;
  status?: number;
  role_id?: string;
  role_name?: string;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFormData {
  username: string;
  fullname?: string;
  email: string;
  password?: string;
  role_id?: string;
  status?: number;
}

// Lấy danh sách người dùng
export const getUsers = async (search?: string) => {
  try {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }

    const response = await apiClient.get(`/users?${params.toString()}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

// Lấy chi tiết người dùng
export const getUserById = async (id: number) => {
  try {
    const response = await apiClient.get(`/users/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching user details:", error);
    throw error;
  }
};

// Tạo mới người dùng
export const createUser = async (data: UserFormData) => {
  try {
    const response = await apiClient.post(`/users`, data);

    return response.data;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Cập nhật thông tin người dùng
export const updateUser = async (id: number, data: UserFormData) => {
  try {
    const response = await apiClient.put(`/users/${id}`, data);

    return response.data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Xóa người dùng
export const deleteUser = async (id: number) => {
  try {
    const response = await apiClient.delete(`/users/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Lấy danh sách vai trò
export const getRoles = async () => {
  try {
    const response = await apiClient.get(`/roles`);

    return response.data;
  } catch (error) {
    console.error("Error fetching roles:", error);
    throw error;
  }
};
