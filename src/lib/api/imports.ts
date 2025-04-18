import axios from "axios";
import { API_URL, getAuthHeader } from "./config";
import { format } from "date-fns";

// Định nghĩa kiểu dữ liệu
export interface ImportDetail {
  id?: number;
  import_id?: number;
  inventory_id?: number | null;
  supplier_id?: number | null;
  category: "HH" | "CP";
  item_name: string;
  unit: string;
  quantity: number;
  price_before_tax: number;
  total_before_tax?: number;
  tax_rate: string;
  tax_amount?: number;
  total_after_tax?: number;
  seller_name?: string;
  seller_tax_code?: string;
  inventory?: any;
  supplier?: any;
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
}

export interface ImportFormData {
  invoice_number: string;
  invoice_date: Date;
  description?: string;
  note?: string;
  details: ImportDetail[];
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

    const response = await axios.get(`${API_URL}/imports?${params.toString()}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching imports:", error);
    throw error;
  }
};

// Lấy chi tiết hóa đơn nhập kho
export const getImportById = async (id: number) => {
  try {
    const response = await axios.get(`${API_URL}/imports/${id}`, {
      headers: getAuthHeader()
    });

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

    // Đảm bảo có seller_name (bắt buộc theo backend)
    let sellerName = data.details[0]?.seller_name || '';
    if (!sellerName) {
      // Nếu không có seller_name, sử dụng giá trị mặc định
      sellerName = "Nhà cung cấp";
    }

    const submitData = {
      ...data,
      invoice_date: format(data.invoice_date, 'yyyy-MM-dd'),
      // Đảm bảo trường note được gửi đúng cách
      // Luôn gửi chuỗi rỗng khi người dùng muốn xóa ghi chú
      note: noteValue,
      // Đảm bảo luôn có seller_name
      seller_name: sellerName,
      seller_tax_code: data.details[0]?.seller_tax_code || '',
      // Đảm bảo các trường số được gửi đúng định dạng
      details: data.details.map(d => ({
        ...d,
        quantity: Number(d.quantity),
        price_before_tax: Number(d.price_before_tax),
        // Đảm bảo mỗi chi tiết đều có seller_name
        seller_name: d.seller_name || sellerName,
        // Bỏ các trường tính toán hoặc chỉ đọc nếu backend không nhận
        total_before_tax: undefined,
        total_after_tax: undefined,
        tax_amount: undefined
      }))
    };

    console.log("Create submitData:", submitData);
    console.log("Note field in create submitData:", submitData.note);

    const response = await axios.post(`${API_URL}/imports`, submitData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    console.log("Create API response:", response.data);
    console.log("Note field in create API response:", response.data?.data?.note);
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
      // Thêm seller_name từ detail đầu tiên nếu có
      seller_name: data.details[0]?.seller_name || '',
      seller_tax_code: data.details[0]?.seller_tax_code || '',
      // Đảm bảo các trường số được gửi đúng định dạng
      details: data.details.map(d => ({
        ...d,
        quantity: Number(d.quantity),
        price_before_tax: Number(d.price_before_tax),
        // Bỏ các trường tính toán hoặc chỉ đọc nếu backend không nhận
        total_before_tax: undefined,
        total_after_tax: undefined,
        tax_amount: undefined
      }))
    };

    console.log("Prepared submitData:", submitData);
    console.log("Note field in submitData:", submitData.note);

    // In ra URL và dữ liệu gửi đi để debug
    console.log(`PUT ${API_URL}/imports/${id}`);
    console.log("Headers:", { ...getAuthHeader(), 'Content-Type': 'application/json' });
    console.log("Request body:", JSON.stringify(submitData, null, 2));

    const response = await axios.put(`${API_URL}/imports/${id}`, submitData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    console.log("API response:", response.data);
    console.log("Note field in API response:", response.data?.data?.note);
    return response.data;
  } catch (error) {
    console.error("Error updating import:", error);
    throw error;
  }
};

// Xóa hóa đơn nhập kho
export const deleteImport = async (id: number) => {
  try {
    const response = await axios.delete(`${API_URL}/imports/${id}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error deleting import:", error);
    throw error;
  }
};

// Thêm chi tiết hàng hóa mới vào hóa đơn
export const addImportDetail = async (importId: number, detailData: any) => {
  try {
    const response = await axios.post(`${API_URL}/imports/${importId}/details`, detailData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error adding import detail:", error);
    throw error;
  }
};

// Cập nhật chi tiết hàng hóa trong hóa đơn
export const updateImportDetail = async (importId: number, detailId: number, detailData: any) => {
  try {
    const response = await axios.put(`${API_URL}/imports/${importId}/details/${detailId}`, detailData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error updating import detail:", error);
    throw error;
  }
};

// Xóa chi tiết hàng hóa trong hóa đơn
export const deleteImportDetail = async (importId: number, detailId: number) => {
  try {
    const response = await axios.delete(`${API_URL}/imports/${importId}/details/${detailId}`, {
      headers: getAuthHeader()
    });

    return response.data;
  } catch (error) {
    console.error("Error deleting import detail:", error);
    throw error;
  }
};
