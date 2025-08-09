import apiClient, { API_URL } from "./config";
import { format } from "date-fns";

// Định nghĩa kiểu dữ liệu
export interface ExpenseReportDetail {
  id: number;
  import_id: number;
  invoice_number: string;
  invoice_date: string;
  item_name: string;
  unit: string;
  quantity: number;
  price_before_tax: number;
  total_before_tax: number;
  tax_rate: string;
  tax_amount: number;
  total_after_tax: number;
  seller_name?: string;
  seller_tax_code?: string;
}

export interface ExpenseSummaryItem {
  item_name: string;
  unit: string;
  count: number;
  total_quantity: number;
  total_before_tax: number;
  total_tax: number;
  total_after_tax: number;
}

export interface ExpenseReportTotals {
  total_before_tax: number;
  total_tax: number;
  total_after_tax: number;
  count: number;
}

export interface ExpenseReportFilters {
  startDate?: string;
  endDate?: string;
  item_name?: string;
}

export interface ExpenseReportData {
  details: ExpenseReportDetail[];
  summary: ExpenseSummaryItem[];
  totals: ExpenseReportTotals;
  filters: ExpenseReportFilters;
}

// Lấy báo cáo chi phí
export const getExpenseReport = async (searchParams?: Record<string, string>) => {
  try {
    const params = new URLSearchParams();

    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await apiClient.get(`/reports/expenses?${params.toString()}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching expense report:", error);
    throw error;
  }
};

// Xuất báo cáo chi tiết nhập kho
export const exportImportDetailReport = async (
  supplierId?: number,
  startDate?: string,
  endDate?: string
) => {
  try {
    const params = new URLSearchParams();

    if (supplierId) {
      params.append('supplier_id', supplierId.toString());
    }

    if (startDate) {
      params.append('start_date', startDate);
    }

    if (endDate) {
      params.append('end_date', endDate);
    }

    const response = await apiClient.get(`/reports/import-detail-export?${params.toString()}`, {
      responseType: 'blob'
    });

    // Tạo URL để download file
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);

    const filename = `BANGKECHITIET_NHAPKHO.xlsx`;

    // Tạo link download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Error exporting import detail report:", error);
    throw error;
  }
};

// Xuất báo cáo tổng hợp nhập kho
export const exportImportSummaryReport = async (
  supplierId?: number,
  startDate?: string,
  endDate?: string
) => {
  try {
    const params = new URLSearchParams();

    if (supplierId) {
      params.append('supplier_id', supplierId.toString());
    }

    if (startDate) {
      params.append('start_date', startDate);
    }

    if (endDate) {
      params.append('end_date', endDate);
    }

    const response = await apiClient.get(`/reports/import-summary-export?${params.toString()}`, {
      responseType: 'blob'
    });

    // Tạo URL để download file
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);

    const filename = `BANGKETONGHOP_NHAPKHO.xlsx`;

    // Tạo link download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Error exporting import summary report:", error);
    throw error;
  }
};

// Xuất báo cáo chi tiết xuất kho
export const exportExportDetailReport = async (
  supplierId?: number,
  startDate?: string,
  endDate?: string
) => {
  try {
    const params = new URLSearchParams();

    if (supplierId) {
      params.append('supplier_id', supplierId.toString());
    }

    if (startDate) {
      params.append('start_date', startDate);
    }

    if (endDate) {
      params.append('end_date', endDate);
    }

    const response = await apiClient.get(`/reports/export-detail-export?${params.toString()}`, {
      responseType: 'blob'
    });

    // Tạo URL để download file
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);

    const filename = `BANGKECHITIET_XUATKHO.xlsx`;

    // Tạo link download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Error exporting export detail report:", error);
    throw error;
  }
};

// Xuất báo cáo tổng hợp xuất kho
export const exportExportSummaryReport = async (
  supplierId?: number,
  startDate?: string,
  endDate?: string
) => {
  try {
    const params = new URLSearchParams();

    if (supplierId) {
      params.append('supplier_id', supplierId.toString());
    }

    if (startDate) {
      params.append('start_date', startDate);
    }

    if (endDate) {
      params.append('end_date', endDate);
    }

    const response = await apiClient.get(`/reports/export-summary-export?${params.toString()}`, {
      responseType: 'blob'
    });

    // Tạo URL để download file
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);

    const filename = `BANGKETONGHOP_XUATKHO.xlsx`;

    // Tạo link download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Error exporting export summary report:", error);
    throw error;
  }
};
