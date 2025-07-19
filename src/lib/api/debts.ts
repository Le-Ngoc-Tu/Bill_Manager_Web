import apiClient from "./config";
import { format } from "date-fns";

// Định nghĩa kiểu dữ liệu
export interface PaymentTransaction {
  id: number;
  debt_id: number;
  transaction_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'other';
  reference_number?: string;
  note?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: number;
  debt_type: 'payable' | 'receivable';
  reference_type: 'import' | 'export';
  reference_id: number;

  due_date?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'overdue' | 'paid';
  description?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  
  // Thông tin từ hóa đơn
  invoice_number?: string;
  partner_name?: string;
  partner_tax_code?: string;
  supplier_name?: string;
  supplier_id?: number;
  supplier_tax_code?: string;
  
  // Lịch sử thanh toán
  transactions?: PaymentTransaction[];
}

export interface DebtFilters {
  debt_type?: 'payable' | 'receivable';
  status?: 'pending' | 'overdue' | 'paid';
  due_start?: string;
  due_end?: string;
  invoice_number?: string;
  supplier_id?: string;
}

export interface AvailableInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  total_after_tax: number;
  supplier_name?: string;
  customer_name?: string;
  type: 'import' | 'export';
  debt_type: 'payable' | 'receivable';
}

export interface CreateDebtFromInvoiceRequest {
  invoice_type: 'import' | 'export';
  invoice_id: number;
  due_date?: string;
  description?: string;
}

export interface CreateDebtFromImportRequest {
  import_id: number;
  due_date?: string;
  description?: string;
}

export interface CreateDebtFromExportRequest {
  export_id: number;
  due_date?: string;
  description?: string;
}

export interface AddPaymentRequest {
  transaction_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'other';
  reference_number?: string;
  note?: string;
}

// API Functions
export const getDebts = async (filters: DebtFilters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.debt_type) params.append('debt_type', filters.debt_type);
    if (filters.status) params.append('status', filters.status);
    if (filters.due_start) params.append('due_start', filters.due_start);
    if (filters.due_end) params.append('due_end', filters.due_end);
    if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);

    const response = await apiClient.get(`/debts?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching debts:", error);
    throw error;
  }
};

export const getDebtById = async (id: number) => {
  try {
    const response = await apiClient.get(`/debts/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching debt by id:", error);
    throw error;
  }
};

export const createDebtFromImport = async (data: CreateDebtFromImportRequest) => {
  try {
    const response = await apiClient.post("/debts/from-import", data);
    return response.data;
  } catch (error) {
    console.error("Error creating debt from import:", error);
    throw error;
  }
};

export const createDebtFromExport = async (data: CreateDebtFromExportRequest) => {
  try {
    const response = await apiClient.post("/debts/from-export", data);
    return response.data;
  } catch (error) {
    console.error("Error creating debt from export:", error);
    throw error;
  }
};

export const addPayment = async (debtId: number, data: AddPaymentRequest) => {
  try {
    const response = await apiClient.post(`/debts/${debtId}/payments`, data);
    return response.data;
  } catch (error) {
    console.error("Error adding payment:", error);
    throw error;
  }
};

export const updateDebtStatus = async () => {
  try {
    const response = await apiClient.put("/debts/update-status");
    return response.data;
  } catch (error) {
    console.error("Error updating debt status:", error);
    throw error;
  }
};

export const updateDebt = async (id: number, data: Partial<Debt>) => {
  try {
    const response = await apiClient.put(`/debts/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating debt:", error);
    throw error;
  }
};

export const deleteDebt = async (id: number) => {
  try {
    const response = await apiClient.delete(`/debts/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting debt:", error);
    throw error;
  }
};

export const deletePayment = async (debtId: number, paymentId: number) => {
  try {
    const response = await apiClient.delete(`/debts/${debtId}/payments/${paymentId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting payment:", error);
    throw error;
  }
};

// Helper functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal'
  }).format(amount) + ' VNĐ';
};

export const formatDate = (dateString: string): string => {
  return format(new Date(dateString), 'dd/MM/yyyy');
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'text-green-600 bg-green-50';
    case 'overdue':
      return 'text-red-600 bg-red-50';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'Đã thanh toán';
    case 'overdue':
      return 'Quá hạn';
    case 'pending':
      return 'Chờ thanh toán';
    default:
      return status;
  }
};

export const getPaymentMethodText = (method: string): string => {
  switch (method) {
    case 'cash':
      return 'Tiền mặt';
    case 'bank_transfer':
      return 'Chuyển khoản';
    case 'other':
      return 'Khác';
    default:
      return method;
  }
};

// Kiểm tra công nợ sắp đến hạn (trong vòng 7 ngày)
export const isNearDue = (dueDate: string): boolean => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7 && diffDays > 0;
};

// Lọc debts theo invoice number và tên đối tác
export const filterDebtsByInvoiceNumber = (debts: Debt[], searchTerm: string): Debt[] => {
  if (!searchTerm.trim()) return debts;

  const lowerSearchTerm = searchTerm.toLowerCase();

  return debts.filter(debt =>
    debt.invoice_number?.toLowerCase().includes(lowerSearchTerm) ||
    debt.partner_name?.toLowerCase().includes(lowerSearchTerm) ||
    debt.supplier_name?.toLowerCase().includes(lowerSearchTerm)
  );
};

// Lấy danh sách hóa đơn chưa có công nợ
export const getAvailableInvoices = async (type?: 'import' | 'export', search?: string) => {
  try {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);

    const response = await apiClient.get(`/debts/available-invoices?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching available invoices:", error);
    throw error;
  }
};

// Tạo công nợ từ hóa đơn
export const createDebtFromInvoice = async (data: CreateDebtFromInvoiceRequest) => {
  try {
    const endpoint = data.invoice_type === 'import' ? '/debts/from-import' : '/debts/from-export';
    const requestBody = data.invoice_type === 'import'
      ? { import_id: data.invoice_id, due_date: data.due_date, description: data.description }
      : { export_id: data.invoice_id, due_date: data.due_date, description: data.description };

    const response = await apiClient.post(endpoint, requestBody);
    return response.data;
  } catch (error) {
    console.error("Error creating debt from invoice:", error);
    throw error;
  }
};
