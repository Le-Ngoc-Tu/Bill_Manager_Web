import apiClient from "./config";
import { format } from "date-fns";

// Định nghĩa kiểu dữ liệu
export interface ExportDetail {
  id?: number;
  export_id?: number;
  inventory_id?: number | null;
  category: "HH" | "CP";
  item_name: string;
  unit: string;
  quantity: number;
  price_before_tax: number;
  total_before_tax?: number;
  tax_rate: string;
  tax_amount?: number;
  total_after_tax?: number;
  inventory?: any;
  // Trường tạm thời cho UI
  isEditing?: boolean;
  // Removed customer_id, buyer_name, buyer_tax_code - now at invoice level
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
  // File URLs for PDF and XML
  pdf_url?: string;
  xml_url?: string;
  // Added supplier/customer info at invoice level
  supplier_id?: number | null;
  customer_id?: number | null;
  supplier?: {
    id: number;
    name: string;
    tax_code?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  customer?: {
    id: number;
    name: string;
    tax_code?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export interface ExportFormData {
  invoice_number: string;
  invoice_date: Date;
  description?: string;
  note?: string;
  details: ExportDetail[];
  // Added supplier/customer info at invoice level
  supplier_id?: number | null;
  customer_id?: number | null;
  seller_name?: string;
  seller_tax_code?: string;
  seller_address?: string;
  buyer_name?: string;
  buyer_tax_code?: string;
  buyer_address?: string;
  // Các trường tổng tiền của hóa đơn
  total_before_tax?: number;
  total_tax?: number;
  total_after_tax?: number;
  is_invoice_totals_manually_edited?: boolean;
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

    const response = await apiClient.get(`/exports?${params.toString()}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching exports:", error);
    throw error;
  }
};

// Lấy chi tiết hóa đơn xuất kho
export const getExportById = async (id: number) => {
  try {
    const response = await apiClient.get(`/exports/${id}`);

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
      ...data,
      invoice_date: format(data.invoice_date, 'yyyy-MM-dd'),
      // Đảm bảo trường note được gửi đúng cách
      note: noteValue,
      details: data.details.map(detail => ({
        ...detail,
        // Đảm bảo các trường số được gửi đúng định dạng
        quantity: Number(detail.quantity),
        price_before_tax: Number(detail.price_before_tax),
        // Đảm bảo các trường bắt buộc luôn có giá trị
        unit: detail.unit || "",
        category: detail.category || "HH",
        tax_rate: detail.tax_rate || "0%",
        // Gửi các trường tính toán đã được frontend xử lý
        total_before_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)),
        tax_amount: Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
          (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
        total_after_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) +
          Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
          (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100)
        // Removed buyer_name and buyer_tax_code - now handled at invoice level
      }))
    };

    const response = await apiClient.post(`/exports`, submitData);
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
      ...data,
      invoice_date: format(data.invoice_date, 'yyyy-MM-dd'),
      // Đảm bảo trường note được gửi đúng cách
      note: noteValue,
      details: data.details.map(detail => ({
        ...detail,
        // Đảm bảo các trường số được gửi đúng định dạng
        quantity: Number(detail.quantity),
        price_before_tax: Number(detail.price_before_tax),
        // Đảm bảo các trường bắt buộc luôn có giá trị
        unit: detail.unit || "",
        category: detail.category || "HH",
        tax_rate: detail.tax_rate || "0%",
        // Gửi các trường tính toán đã được frontend xử lý
        total_before_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)),
        tax_amount: Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
          (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
        total_after_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) +
          Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
          (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100)
        // Removed buyer_name and buyer_tax_code - now handled at invoice level
      }))
    };

    const response = await apiClient.put(`/exports/${id}`, submitData);
    return response.data;
  } catch (error) {
    console.error("Error updating export:", error);
    throw error;
  }
};

// Xóa hóa đơn xuất kho
export const deleteExport = async (id: number) => {
  try {
    const response = await apiClient.delete(`/exports/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting export:", error);
    throw error;
  }
};

// Thêm chi tiết hàng hóa mới vào hóa đơn
export const addExportDetail = async (exportId: number, detailData: any) => {
  try {
    const response = await apiClient.post(`/exports/${exportId}/details`, detailData);

    return response.data;
  } catch (error) {
    console.error("Error adding export detail:", error);
    throw error;
  }
};

// Cập nhật chi tiết hàng hóa trong hóa đơn
export const updateExportDetail = async (exportId: number, detailId: number, detailData: any) => {
  try {
    const response = await apiClient.put(`/exports/${exportId}/details/${detailId}`, detailData);

    return response.data;
  } catch (error) {
    console.error("Error updating export detail:", error);
    throw error;
  }
};

// Xóa chi tiết hàng hóa trong hóa đơn
export const deleteExportDetail = async (exportId: number, detailId: number) => {
  try {
    const response = await apiClient.delete(`/exports/${exportId}/details/${detailId}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting export detail:", error);
    throw error;
  }
};

// Các function tính toán đã được chuyển hoàn toàn sang frontend components
// Backend chỉ nhận dữ liệu đã tính toán từ frontend

// XML Preview Data interface
export interface XMLPreviewData {
  type: string
  xmlFileName: string
  xmlFilePath: string
  tempFilePath: string
  invoiceNumber: string
  supplierInfo: any
  customerInfo: any
  items: any[]
  totals: any
  generalInfo: any
  rawXmlData: any
}

// Upload XML for preview
export const uploadExportXMLPreview = async (formData: FormData) => {
  try {
    const response = await apiClient.post('/exports/xml/upload-preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    console.error('Error uploading export XML:', error)
    throw error
  }
}

// Save preview data to database
export const saveExportXMLPreview = async (tempFileId: string, previewData: XMLPreviewData, invoiceType: string = 'auto') => {
  try {
    const response = await apiClient.post('/exports/xml/save-from-preview', {
      tempFileId,
      previewData,
      confirmed: true,
      invoice_type: invoiceType
    })
    return response.data
  } catch (error) {
    console.error('Error saving export XML preview:', error)
    throw error
  }
}

// Get available inventory items for export (only goods with stock)
export const getAvailableInventoryForExport = async () => {
  try {
    const response = await apiClient.get('/exports/available-inventory')
    return response.data
  } catch (error) {
    console.error('Error fetching available inventory:', error)
    throw error
  }
}

// Validate stock before export
export const validateExportStock = async (items: { item_name: string, quantity: number, category: string }[]) => {
  try {
    const response = await apiClient.post('/exports/validate-stock', { items })
    return response.data
  } catch (error) {
    console.error('Error validating export stock:', error)
    throw error
  }
}

// Upload bổ sung PDF/XML cho hóa đơn xuất
export const uploadExportAttachment = async (exportId: number, file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/exports/${exportId}/upload-attachment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading export attachment:', error);
    throw error;
  }
}
