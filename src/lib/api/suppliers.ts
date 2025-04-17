import axios from "axios";
import { API_URL, getAuthHeader } from "./config";

// Định nghĩa kiểu dữ liệu
export interface Supplier {
  id: number;
  name: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierFormData {
  name: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  note?: string;
}

// Lấy danh sách nhà cung cấp
export const getSuppliers = async (search?: string) => {
  try {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }

    const response = await axios.get(`${API_URL}/suppliers?${params.toString()}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
};

// Lấy chi tiết nhà cung cấp
export const getSupplierById = async (id: number) => {
  try {
    const response = await axios.get(`${API_URL}/suppliers/${id}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching supplier details:", error);
    throw error;
  }
};

// Tạo mới nhà cung cấp
export const createSupplier = async (data: SupplierFormData) => {
  try {
    const response = await axios.post(`${API_URL}/suppliers`, data, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error creating supplier:", error);
    throw error;
  }
};

// Cập nhật thông tin nhà cung cấp
export const updateSupplier = async (id: number, data: SupplierFormData) => {
  try {
    const response = await axios.put(`${API_URL}/suppliers/${id}`, data, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error updating supplier:", error);
    throw error;
  }
};

// Xóa nhà cung cấp
export const deleteSupplier = async (id: number) => {
  try {
    const response = await axios.delete(`${API_URL}/suppliers/${id}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error deleting supplier:", error);
    throw error;
  }
};
