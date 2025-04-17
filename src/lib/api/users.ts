import axios from "axios";
import { API_URL, getAuthHeader } from "./config";

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
    
    const response = await axios.get(`${API_URL}/users?${params.toString()}`, {
      headers: getAuthHeader()
    });
    
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

// Lấy chi tiết người dùng
export const getUserById = async (id: number) => {
  try {
    const response = await axios.get(`${API_URL}/users/${id}`, {
      headers: getAuthHeader()
    });
    
    return response.data;
  } catch (error) {
    console.error("Error fetching user details:", error);
    throw error;
  }
};

// Tạo mới người dùng
export const createUser = async (data: UserFormData) => {
  try {
    const response = await axios.post(`${API_URL}/users`, data, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Cập nhật thông tin người dùng
export const updateUser = async (id: number, data: UserFormData) => {
  try {
    const response = await axios.put(`${API_URL}/users/${id}`, data, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Xóa người dùng
export const deleteUser = async (id: number) => {
  try {
    const response = await axios.delete(`${API_URL}/users/${id}`, {
      headers: getAuthHeader()
    });
    
    return response.data;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Lấy danh sách vai trò
export const getRoles = async () => {
  try {
    const response = await axios.get(`${API_URL}/roles`, {
      headers: getAuthHeader()
    });
    
    return response.data;
  } catch (error) {
    console.error("Error fetching roles:", error);
    throw error;
  }
};
