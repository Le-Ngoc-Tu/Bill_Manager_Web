import axios from "axios";
import { API_URL, getAuthHeader } from "./config";
import { format } from "date-fns";

// Định nghĩa kiểu dữ liệu
export interface ExportDetail {
  id?: number;
  export_id?: number;
  inventory_id?: number | null;
  customer_id?: number | null;
  category: "HH" | "CP";
  item_name: string;
  unit: string;
  quantity: number;
  price_before_tax: number;
  total_before_tax?: number;
  tax_rate: string;
  tax_amount?: number;
  total_after_tax?: number;
  buyer_name?: string;
  buyer_tax_code?: string;
  inventory?: any;
  customer?: any;
  // Trường tạm thời cho UI
  isEditing?: boolean;
}

export interface ExportInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  description?: string;
  total_before_tax: number;
  total_tax: number;
  total_after_tax: number;
  note?: string;
  created_by?: number;
  createdAt: string;
  updatedAt: string;
  details: ExportDetail[];
}

export interface ExportFormData {
  invoice_number: string;
  invoice_date: Date;
  description?: string;
  note?: string;
  details: ExportDetail[];
}

// Lấy danh sách hóa đơn xuất kho
export const getExports = async (searchParams?: Record<string, string>) => {
  try {
    const params = new URLSearchParams();

    if (searchParams) {
      // Thêm các tham số vào URL mà không chuyển đổi tên
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await axios.get(`${API_URL}/exports?${params.toString()}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching exports:", error);
    throw error;
  }
};

// Lấy chi tiết hóa đơn xuất kho
export const getExportById = async (id: number) => {
  try {
    const response = await axios.get(`${API_URL}/exports/${id}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching export details:", error);
    throw error;
  }
};

// Tạo hóa đơn xuất kho mới
export const createExport = async (data: ExportFormData) => {
  try {
    // Chuẩn bị dữ liệu gửi đi
    // Đảm bảo trường note được gửi đúng cách
    // Sử dụng chuỗi rỗng nếu note là undefined hoặc null
    const noteValue = data.note === undefined || data.note === null ? "" : data.note;

    const submitData = {
      invoice_number: data.invoice_number,
      invoice_date: format(data.invoice_date, 'yyyy-MM-dd'),
      description: data.description || "",
      note: noteValue,
      details: data.details.map(detail => ({
        ...detail,
        // Đảm bảo các trường số được gửi đúng định dạng
        quantity: Number(detail.quantity),
        price_before_tax: Number(detail.price_before_tax),
        // Bỏ các trường tính toán để backend tự tính
        total_before_tax: undefined,
        tax_amount: undefined,
        total_after_tax: undefined,
        // Đảm bảo các trường buyer_name và buyer_tax_code được gửi đi
        buyer_name: detail.buyer_name || "",
        buyer_tax_code: detail.buyer_tax_code || ""
      }))
    };

    console.log("Create submitData:", submitData);
    console.log("Note field in create submitData:", submitData.note);

    const response = await axios.post(`${API_URL}/exports`, submitData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    console.log("Create API response:", response.data);
    console.log("Note field in create API response:", response.data?.data?.note);
    return response.data;
  } catch (error) {
    console.error("Error creating export:", error);
    throw error;
  }
};

// Cập nhật hóa đơn xuất kho
export const updateExport = async (id: number, data: ExportFormData) => {
  try {
    console.log("Original update data:", data);
    // Chuẩn bị dữ liệu gửi đi
    // Đảm bảo trường note được gửi đúng cách, luôn gửi trường note ngay cả khi là chuỗi rỗng
    // Điều này đảm bảo rằng khi người dùng muốn xóa ghi chú, giá trị rỗng sẽ được gửi đi
    // Sử dụng chuỗi rỗng nếu note là undefined hoặc null
    const noteValue = data.note === undefined || data.note === null ? "" : data.note;

    const submitData = {
      invoice_number: data.invoice_number,
      invoice_date: format(data.invoice_date, 'yyyy-MM-dd'),
      description: data.description || "",
      note: noteValue,
      details: data.details.map(detail => ({
        ...detail,
        // Đảm bảo các trường số được gửi đúng định dạng
        quantity: Number(detail.quantity),
        price_before_tax: Number(detail.price_before_tax),
        // Bỏ các trường tính toán để backend tự tính
        total_before_tax: undefined,
        tax_amount: undefined,
        total_after_tax: undefined,
        // Đảm bảo các trường buyer_name và buyer_tax_code được gửi đi
        buyer_name: detail.buyer_name || "",
        buyer_tax_code: detail.buyer_tax_code || ""
      }))
    };

    console.log("Prepared submitData:", submitData);
    console.log("Note field in submitData:", submitData.note);

    // In ra URL và dữ liệu gửi đi để debug
    console.log(`PUT ${API_URL}/exports/${id}`);
    console.log("Headers:", { ...getAuthHeader(), 'Content-Type': 'application/json' });
    console.log("Request body:", JSON.stringify(submitData, null, 2));

    const response = await axios.put(`${API_URL}/exports/${id}`, submitData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    console.log("API response:", response.data);
    console.log("Note field in API response:", response.data?.data?.note);
    return response.data;
  } catch (error) {
    console.error("Error updating export:", error);
    throw error;
  }
};

// Xóa hóa đơn xuất kho
export const deleteExport = async (id: number) => {
  try {
    const response = await axios.delete(`${API_URL}/exports/${id}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error deleting export:", error);
    throw error;
  }
};

// Thêm chi tiết hàng hóa mới vào hóa đơn
export const addExportDetail = async (exportId: number, detailData: any) => {
  try {
    const response = await axios.post(`${API_URL}/exports/${exportId}/details`, detailData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error adding export detail:", error);
    throw error;
  }
};

// Cập nhật chi tiết hàng hóa trong hóa đơn
export const updateExportDetail = async (exportId: number, detailId: number, detailData: any) => {
  try {
    const response = await axios.put(`${API_URL}/exports/${exportId}/details/${detailId}`, detailData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error updating export detail:", error);
    throw error;
  }
};

// Xóa chi tiết hàng hóa trong hóa đơn
export const deleteExportDetail = async (exportId: number, detailId: number) => {
  try {
    const response = await axios.delete(`${API_URL}/exports/${exportId}/details/${detailId}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error deleting export detail:", error);
    throw error;
  }
};

// Hàm tính toán thuế dựa trên thuế suất
function calculateTaxAmount(amount: number, taxRate: string): number {
  if (taxRate === "KCT") return 0;

  const rate = parseFloat(taxRate.replace("%", "")) / 100;
  return amount * rate;
}

// Hàm tính tổng sau thuế
function calculateTotalAfterTax(amount: number, taxRate: string): number {
  const taxAmount = calculateTaxAmount(amount, taxRate);
  return amount + taxAmount;
}
