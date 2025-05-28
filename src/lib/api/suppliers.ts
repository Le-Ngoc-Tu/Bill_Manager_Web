import apiClient, { API_URL } from "./config";

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

    const response = await apiClient.get(`/suppliers?${params.toString()}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
};

// Lấy chi tiết nhà cung cấp
export const getSupplierById = async (id: number) => {
  try {
    const response = await apiClient.get(`/suppliers/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching supplier details:", error);
    throw error;
  }
};

// Tạo mới nhà cung cấp
export const createSupplier = async (data: SupplierFormData, force: boolean = false) => {
  try {
    const url = force ? `/suppliers?force=true` : `/suppliers`;
    const response = await apiClient.post(url, data);

    return response.data;
  } catch (error) {
    console.error("Error creating supplier:", error);
    throw error;
  }
};

// Cập nhật thông tin nhà cung cấp
export const updateSupplier = async (id: number, data: SupplierFormData) => {
  try {
    const response = await apiClient.put(`/suppliers/${id}`, data);

    return response.data;
  } catch (error) {
    console.error("Error updating supplier:", error);
    throw error;
  }
};

// Xóa nhà cung cấp
export const deleteSupplier = async (id: number) => {
  try {
    const response = await apiClient.delete(`/suppliers/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting supplier:", error);
    throw error;
  }
};

// Tìm nhà cung cấp tương tự
export const findSimilarSuppliers = async (data: Partial<SupplierFormData>) => {
  try {
    const response = await apiClient.post(`/suppliers/similar`, data);

    return response.data;
  } catch (error) {
    console.error("Error finding similar suppliers:", error);
    throw error;
  }
};
