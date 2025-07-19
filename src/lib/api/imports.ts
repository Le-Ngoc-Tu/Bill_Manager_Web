import apiClient from "./config";
import { format } from "date-fns";

// Định nghĩa kiểu dữ liệu
export interface ImportDetail {
  id?: number;
  import_id?: number;
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
  // Removed supplier_id, seller_name, seller_tax_code - now at invoice level
}

export interface ImportInvoice {
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
  details: ImportDetail[];
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

export interface ImportFormData {
  invoice_number: string;
  invoice_date: Date;
  description?: string;
  note?: string;
  details: ImportDetail[];
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

// Lấy danh sách hóa đơn nhập kho
export const getImports = async (searchParams?: Record<string, string>) => {
  try {
    const params = new URLSearchParams();

    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await apiClient.get(`/imports?${params.toString()}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching imports:", error);
    throw error;
  }
};

// Lấy chi tiết hóa đơn nhập kho
export const getImportById = async (id: number) => {
  try {
    const response = await apiClient.get(`/imports/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching import details:", error);
    throw error;
  }
};

// Tạo hóa đơn nhập kho mới
export const createImport = async (data: ImportFormData) => {
  try {
    // Chuẩn bị dữ liệu gửi đi
    // Đảm bảo trường note được gửi đúng cách
    // Sử dụng chuỗi rỗng nếu note là undefined hoặc null
    const noteValue = data.note === undefined || data.note === null ? "" : data.note;

    const submitData = {
      ...data,
      invoice_date: format(data.invoice_date, 'yyyy-MM-dd'),
      // Đảm bảo trường note được gửi đúng cách
      // Luôn gửi chuỗi rỗng khi người dùng muốn xóa ghi chú
      note: noteValue,
      // Đảm bảo các trường số được gửi đúng định dạng
      details: data.details.map(d => ({
        ...d,
        quantity: Number(d.quantity),
        price_before_tax: Number(d.price_before_tax),
        // Gửi các trường tính toán đã được làm tròn
        total_before_tax: Math.round(Number(d.quantity) * Number(d.price_before_tax)),
        tax_amount: Math.round((Math.round(Number(d.quantity) * Number(d.price_before_tax)) *
          (d.tax_rate === "KCT" ? 0 : Number(d.tax_rate?.replace("%", "") || 0))) / 100),
        total_after_tax: Math.round(Number(d.quantity) * Number(d.price_before_tax)) +
          Math.round((Math.round(Number(d.quantity) * Number(d.price_before_tax)) *
          (d.tax_rate === "KCT" ? 0 : Number(d.tax_rate?.replace("%", "") || 0))) / 100)
        // Removed seller_name and seller_tax_code - now handled at invoice level
      }))
    };

    const response = await apiClient.post(`/imports`, submitData);
    return response.data;
  } catch (error) {
    console.error("Error creating import:", error);
    throw error;
  }
};

// Cập nhật hóa đơn nhập kho
export const updateImport = async (id: number, data: ImportFormData) => {
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
      // Luôn gửi chuỗi rỗng khi người dùng muốn xóa ghi chú
      // Điều này đảm bảo rằng khi người dùng muốn xóa ghi chú, chuỗi rỗng sẽ được gửi đi
      note: noteValue,
      // Removed seller_name and seller_tax_code - now handled at invoice level
      // Đảm bảo các trường số được gửi đúng định dạng
      details: data.details.map(d => ({
        ...d,
        quantity: Number(d.quantity),
        price_before_tax: Number(d.price_before_tax),
        // Gửi các trường tính toán đã được làm tròn
        total_before_tax: Math.round(Number(d.quantity) * Number(d.price_before_tax)),
        tax_amount: Math.round((Math.round(Number(d.quantity) * Number(d.price_before_tax)) *
          (d.tax_rate === "KCT" ? 0 : Number(d.tax_rate?.replace("%", "") || 0))) / 100),
        total_after_tax: Math.round(Number(d.quantity) * Number(d.price_before_tax)) +
          Math.round((Math.round(Number(d.quantity) * Number(d.price_before_tax)) *
          (d.tax_rate === "KCT" ? 0 : Number(d.tax_rate?.replace("%", "") || 0))) / 100)
      }))
    };

    const response = await apiClient.put(`/imports/${id}`, submitData);
    return response.data;
  } catch (error) {
    console.error("Error updating import:", error);
    throw error;
  }
};

// Xóa hóa đơn nhập kho
export const deleteImport = async (id: number) => {
  try {
    const response = await apiClient.delete(`/imports/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting import:", error);
    throw error;
  }
};

// ===== XML PREVIEW APIs =====

// Interface cho XML preview data
export interface XMLPreviewData {
  general: {
    invoiceNumber: string;
    issueDate: string;
    invoiceType?: string;
    currencyCode?: string;
  };
  seller: {
    name: string;
    taxCode?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  buyer: {
    name: string;
    taxCode?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    itemName: string;
    unit: string;
    quantity: number;
    priceBeforeTax: number;
    totalBeforeTax: number;
    taxRate: string;
    taxAmount: number;
    totalAfterTax: number;
    category: "HH" | "CP";
  }>;
  totals: {
    totalBeforeTax: number;
    totalTax: number;
    totalAfterTax: number;
  };
}

export interface XMLPreviewResponse {
  tempFileId: string;
  fileName?: string; // Legacy field
  previewData: XMLPreviewData;
  hasXml: boolean;
  hasPdf: boolean;
  fromZip: boolean;
  xmlFileName?: string;
  pdfFileName?: string;
}

// Upload XML và lấy preview data
export const uploadXMLPreview = async (formData: FormData) => {
  try {
    const response = await apiClient.post('/invoices/xml/upload-preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading XML preview:", error);
    throw error;
  }
};

// Lưu preview data vào database
export const saveXMLPreview = async (tempFileId: string, previewData: XMLPreviewData, invoiceType: string = 'auto') => {
  try {
    const response = await apiClient.post('/invoices/xml/save-from-preview', {
      tempFileId,
      previewData,
      confirmed: true,
      invoice_type: invoiceType
    });

    return response.data;
  } catch (error) {
    console.error("Error saving XML preview:", error);
    throw error;
  }
};

// Hủy preview và xóa file tạm
export const cancelXMLPreview = async (tempFileId: string) => {
  try {
    const response = await apiClient.delete(`/invoices/xml/cancel-preview/${tempFileId}`);

    return response.data;
  } catch (error) {
    console.error("Error canceling XML preview:", error);
    throw error;
  }
};

// Thêm chi tiết hàng hóa mới vào hóa đơn
export const addImportDetail = async (importId: number, detailData: any) => {
  try {
    const response = await apiClient.post(`/imports/${importId}/details`, detailData);

    return response.data;
  } catch (error) {
    console.error("Error adding import detail:", error);
    throw error;
  }
};

// Cập nhật chi tiết hàng hóa trong hóa đơn
export const updateImportDetail = async (importId: number, detailId: number, detailData: any) => {
  try {
    const response = await apiClient.put(`/imports/${importId}/details/${detailId}`, detailData);

    return response.data;
  } catch (error) {
    console.error("Error updating import detail:", error);
    throw error;
  }
};

// Xóa chi tiết hàng hóa trong hóa đơn
export const deleteImportDetail = async (importId: number, detailId: number) => {
  try {
    const response = await apiClient.delete(`/imports/${importId}/details/${detailId}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting import detail:", error);
    throw error;
  }
};

// Upload bổ sung PDF/XML cho hóa đơn nhập
export const uploadImportAttachment = async (importId: number, file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/imports/${importId}/upload-attachment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading import attachment:', error);
    throw error;
  }
};
