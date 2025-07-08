import apiClient, { API_URL } from "./config";

// Định nghĩa kiểu dữ liệu
export interface Inventory {
  id: number;
  item_name: string;
  unit: string;
  quantity: number;
  category: "HH" | "CP";
  price?: number;
  latest_import_price?: number | null;
  latest_import_date?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryFormData {
  item_name: string;
  unit: string;
  quantity: number;
  category: "HH" | "CP";
  price?: number;
}

// Lấy danh sách hàng hóa trong kho
export const getInventoryItems = async (forCombobox = false, category = "", includeLatestImportPrice = false, search = "") => {
  try {
    const response = await apiClient.get(`/inventory`, {
      params: {
        forCombobox: forCombobox,
        category: category, // Thêm tham số category để lọc theo loại
        includeLatestImportPrice: includeLatestImportPrice, // Thêm tham số để lấy giá nhập gần nhất
        search: search // Thêm tham số search để tìm kiếm hàng hóa
      }
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
    const response = await apiClient.get(`/inventory/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching inventory item details:", error);
    throw error;
  }
};

// Tạo mới hàng hóa trong kho
export const createInventoryItem = async (data: InventoryFormData, force: boolean = false) => {
  try {
    const url = force ? `/inventory?force=true` : `/inventory`;
    const response = await apiClient.post(url, data);

    return response.data;
  } catch (error) {
    console.error("Error creating inventory item:", error);
    throw error;
  }
};

// Cập nhật hàng hóa trong kho
export const updateInventoryItem = async (id: number, data: InventoryFormData) => {
  try {
    const response = await apiClient.put(`/inventory/${id}`, data);

    return response.data;
  } catch (error) {
    console.error("Error updating inventory item:", error);
    throw error;
  }
};

// Xóa hàng hóa khỏi kho
export const deleteInventoryItem = async (id: number) => {
  try {
    const response = await apiClient.delete(`/inventory/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    throw error;
  }
};

// Tìm hàng hóa tương tự
export const findSimilarInventoryItems = async (data: Partial<InventoryFormData>) => {
  try {
    const response = await apiClient.post(`/inventory/similar`, data);

    return response.data;
  } catch (error) {
    console.error("Error finding similar inventory items:", error);
    throw error;
  }
};
