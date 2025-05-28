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
