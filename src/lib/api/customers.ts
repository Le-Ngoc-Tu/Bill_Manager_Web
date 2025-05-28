import apiClient, { API_URL } from "./config";

// Định nghĩa kiểu dữ liệu
export interface Customer {
  id: number;
  name: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  note?: string;
}

export interface CustomerFormData {
  name: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  note?: string;
}

// Lấy danh sách khách hàng
export const getCustomers = async (search?: string) => {
  try {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }

    const response = await apiClient.get(`/customers?${params.toString()}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};

// Lấy chi tiết khách hàng
export const getCustomerById = async (id: number) => {
  try {
    const response = await apiClient.get(`/customers/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching customer details:", error);
    throw error;
  }
};

// Tạo mới khách hàng
export const createCustomer = async (data: CustomerFormData) => {
  try {
    const response = await apiClient.post(`/customers`, data);

    return response.data;
  } catch (error) {
    console.error("Error creating customer:", error);
    throw error;
  }
};

// Cập nhật thông tin khách hàng
export const updateCustomer = async (id: number, data: CustomerFormData) => {
  try {
    const response = await apiClient.put(`/customers/${id}`, data);

    return response.data;
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
};

// Xóa khách hàng
export const deleteCustomer = async (id: number) => {
  try {
    const response = await apiClient.delete(`/customers/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
};
