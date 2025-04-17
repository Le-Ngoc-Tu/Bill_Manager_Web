import axios from "axios";
import { API_URL, getAuthHeader } from "./config";

// Định nghĩa kiểu dữ liệu
export interface Inventory {
  id: number;
  item_name: string;
  unit: string;
  quantity: number;
  category: "HH" | "CP";
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryFormData {
  item_name: string;
  unit: string;
  quantity: number;
  category: "HH" | "CP";
}

// Lấy danh sách hàng hóa trong kho
export const getInventoryItems = async () => {
  try {
    const response = await axios.get(`${API_URL}/inventory`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    throw error;
  }
};

// Lấy chi tiết hàng hóa
export const getInventoryItemById = async (id: number) => {
  try {
    const response = await axios.get(`${API_URL}/inventory/${id}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching inventory item details:", error);
    throw error;
  }
};

// Tạo mới hàng hóa trong kho
export const createInventoryItem = async (data: InventoryFormData) => {
  try {
    const response = await axios.post(`${API_URL}/inventory`, data, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error creating inventory item:", error);
    throw error;
  }
};

// Cập nhật hàng hóa trong kho
export const updateInventoryItem = async (id: number, data: InventoryFormData) => {
  try {
    const response = await axios.put(`${API_URL}/inventory/${id}`, data, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error updating inventory item:", error);
    throw error;
  }
};

// Xóa hàng hóa khỏi kho
export const deleteInventoryItem = async (id: number) => {
  try {
    const response = await axios.delete(`${API_URL}/inventory/${id}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    throw error;
  }
};
