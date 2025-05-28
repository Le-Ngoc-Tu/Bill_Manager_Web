import axios from "axios";
import apiClient from "./config";

// URL của OCR API
const OCR_API_URL = process.env.NEXT_PUBLIC_OCR_API_URL || "http://localhost:7011";

// Log URL khi khởi tạo để debug
console.log("OCR API URL:", OCR_API_URL);

// Định nghĩa kiểu dữ liệu
export interface OCRResponse {
  task_id: string;
  filename: string;
  status: string;
  message: string;
}

export interface OCRTaskProgress {
  id: string;
  status: string;
  progress: number;
  message?: string;
  result_url?: string;
  result?: any;
}

// Hàm upload file PDF lên OCR API (cho import)
export const uploadPdfToOcr = async (file: File): Promise<OCRResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${OCR_API_URL}/ocr/auto`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading PDF to OCR API:", error);
    throw error;
  }
};

// Hàm upload file PDF lên OCR API cho export invoice
export const uploadPdfToOcrExport = async (file: File): Promise<OCRResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${OCR_API_URL}/ocr/export_invoice`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading PDF to OCR API for export:", error);
    throw error;
  }
};

// Hàm lấy tiến trình của task OCR
export const getOcrTaskProgress = async (taskId: string): Promise<OCRTaskProgress> => {
  try {
    const response = await axios.get(`${OCR_API_URL}/tasks/${taskId}`);
    return response.data.task;
  } catch (error) {
    console.error("Error getting OCR task progress:", error);
    throw error;
  }
};

// Hàm lấy kết quả của task OCR
export const getOcrTaskResult = async (taskId: string): Promise<any> => {
  try {
    const response = await axios.get(`${OCR_API_URL}/tasks/${taskId}/result`);
    return response.data.result;
  } catch (error) {
    console.error("Error getting OCR task result:", error);
    throw error;
  }
};

// Hàm chuẩn hóa định dạng đơn giá từ OCR API (định dạng Việt Nam: dấu chấm = hàng nghìn, dấu phẩy = thập phân)
export const normalizePrice = (priceStr: string | number): number => {
  if (typeof priceStr === "number") return priceStr;
  if (!priceStr) return 0;

  // Loại bỏ tất cả khoảng trắng và ký tự không phải số, dấu chấm, dấu phẩy
  const cleanedStr = priceStr.toString().trim().replace(/[^\d.,]/g, '');

  // Log để debug
  console.log(`Normalizing price: "${priceStr}" -> cleaned: "${cleanedStr}"`);

  if (!cleanedStr) return 0;

  let result: number;

  // Định dạng Việt Nam chuẩn:
  // - Dấu chấm (.) = phân cách hàng nghìn
  // - Dấu phẩy (,) = phân cách thập phân
  // Ví dụ: "454.545,45" = 454545.45
  //        "1.545.454,55" = 1545454.55
  //        "300.000" = 300000
  //        "277.777,78" = 277777.78

  if (cleanedStr.includes(',')) {
    // Có phần thập phân với dấu phẩy
    const parts = cleanedStr.split(',');
    const integerPart = parts[0].replace(/\./g, ''); // Loại bỏ dấu chấm phân cách hàng nghìn
    const decimalPart = parts[1];

    // Đảm bảo phần thập phân không quá 3 chữ số
    const limitedDecimal = decimalPart.substring(0, 3);

    result = parseFloat(`${integerPart}.${limitedDecimal}`);
    console.log(`Vietnamese format with decimal: "${cleanedStr}" -> ${result}`);
    return result;
  } else {
    // Không có phần thập phân - chỉ có số nguyên với dấu chấm phân cách hàng nghìn
    // Ví dụ: "300.000" -> 300000
    const integerValue = parseInt(cleanedStr.replace(/\./g, ''));
    result = integerValue;
    console.log(`Vietnamese format integer: "${cleanedStr}" -> ${result}`);
    return result;
  }
};

// Hàm làm tròn đến 3 chữ số thập phân
const roundToThreeDecimals = (num: number): number => {
  return Math.round(num * 1000) / 1000;
};

// Hàm làm tròn thành số nguyên
const roundToInteger = (num: number): number => {
  return Math.round(num);
};

// Lưu kết quả OCR gốc vào localStorage
export const saveOriginalOcrResult = (taskId: string, ocrResult: any) => {
  try {
    localStorage.setItem(`ocr_result_${taskId}`, JSON.stringify(ocrResult));
    return true;
  } catch (error) {
    console.error("Error saving OCR result to localStorage:", error);
    return false;
  }
};

// Lấy kết quả OCR gốc từ localStorage
export const getOriginalOcrResult = (taskId: string) => {
  try {
    const result = localStorage.getItem(`ocr_result_${taskId}`);
    return result ? JSON.parse(result) : null;
  } catch (error) {
    console.error("Error getting OCR result from localStorage:", error);
    return null;
  }
};

// Hàm chuyển đổi kết quả OCR thành dữ liệu chi tiết hóa đơn
export const convertOcrResultToImportDetails = (ocrResult: any) => {
  // Lưu kết quả OCR gốc vào localStorage với ID là timestamp
  const taskId = `ocr_${Date.now()}`;
  saveOriginalOcrResult(taskId, ocrResult);

  // Định nghĩa kiểu dữ liệu ImportDetail
  interface ImportDetail {
    category: string;
    inventory_id: number | null;
    supplier_id: number | null;
    item_name: string;
    unit: string;
    quantity: number;
    price_before_tax: number;
    tax_rate: string;
    total_before_tax: number;
    tax_amount: number;
    total_after_tax: number;
    seller_name: string;
    seller_tax_code: string;
    originalNo: string;
    ocrTaskId: string;
  }

  // Thêm taskId vào kết quả để có thể truy xuất lại sau này
  const details: ImportDetail[] = [];
  const ocrTaskId = taskId;

  // Xử lý kết quả OCR cho hóa đơn thông thường
  if (ocrResult.tables && ocrResult.tables.length > 0) {
    // Lấy thông tin người bán từ text_content
    let sellerName = "";
    let sellerTaxCode = "";

    if (ocrResult.text_content) {
      const sellerInfo = ocrResult.text_content.find((item: any) => item.type === "seller");
      if (sellerInfo) {
        sellerName = sellerInfo.SellerName || "";
        sellerTaxCode = sellerInfo.SellerTaxCode || "";
      }
    }

    // Lấy dữ liệu hàng hóa từ tất cả các bảng (tất cả các trang)
    ocrResult.tables.forEach((table: any) => {
      const tableData = table.data || [];

      tableData.forEach((item: any) => {
        if (item.No && item.ProductName) {
          const quantity = parseFloat(item.Quantity) || 0;
          // Parse đơn giá chỉ để tính toán, không thay đổi định dạng hiển thị
          const priceBeforeTax = normalizePrice(item.UnitPrice) || 0;

          // Sử dụng TotalBeforeTax từ OCR nếu có, nếu không tính từ số lượng và đơn giá
          let totalBeforeTax = 0;
          if (item.TotalBeforeTax) {
            totalBeforeTax = normalizePrice(item.TotalBeforeTax) || 0;
          } else {
            totalBeforeTax = quantity * priceBeforeTax;
          }

          // Tính thuế
          let taxRate = 0;
          if (item.TaxRate && item.TaxRate !== "KCT") {
            taxRate = parseFloat(item.TaxRate.replace("%", "")) || 0;
          }

          // Làm tròn tổng tiền trước thuế thành số nguyên (giống backend)
          const roundedTotalBeforeTax = Math.round(totalBeforeTax);

          // Tính thuế dựa trên tổng tiền trước thuế đã làm tròn (giống backend)
          const taxAmount = Math.round((roundedTotalBeforeTax * taxRate) / 100);

          // Tính tổng tiền sau thuế bằng cách cộng tổng tiền trước thuế đã làm tròn và thuế đã làm tròn
          const totalAfterTax = roundedTotalBeforeTax + taxAmount;

          details.push({
            category: item.Category || "HH",
            inventory_id: null,
            supplier_id: null,
            item_name: item.ProductName,
            unit: item.Unit || "",
            quantity: quantity,
            price_before_tax: priceBeforeTax,
            tax_rate: item.TaxRate || "0%",
            total_before_tax: roundedTotalBeforeTax,
            tax_amount: taxAmount,
            total_after_tax: totalAfterTax,
            seller_name: sellerName,
            seller_tax_code: sellerTaxCode,
            originalNo: item.No, // Lưu số thứ tự gốc để sắp xếp
            ocrTaskId: ocrTaskId // Lưu ID của kết quả OCR gốc
          });
        }
      });
    });
  }
  // Xử lý kết quả OCR cho hóa đơn chi phí
  else if (ocrResult.table && Array.isArray(ocrResult.table)) {
    // Lấy thông tin người bán
    const sellerName = ocrResult.seller?.SellerName || "";
    const sellerTaxCode = ocrResult.seller?.SellerTaxCode || "";

    // Lấy dữ liệu hàng hóa
    ocrResult.table.forEach((item: any) => {
      if (item.No && item.ProductName) {
        const quantity = parseFloat(item.Quantity) || 0;
        // Parse đơn giá chỉ để tính toán, không thay đổi định dạng hiển thị
        const priceBeforeTax = normalizePrice(item.UnitPrice) || 0;

        // Sử dụng TotalBeforeTax từ OCR nếu có, nếu không tính từ số lượng và đơn giá
        let totalBeforeTax = 0;
        if (item.TotalBeforeTax) {
          totalBeforeTax = normalizePrice(item.TotalBeforeTax) || 0;
        } else {
          totalBeforeTax = quantity * priceBeforeTax;
        }

        // Tính thuế
        let taxRate = 0;
        if (item.TaxRate && item.TaxRate !== "KCT") {
          taxRate = parseFloat(item.TaxRate.replace("%", "")) || 0;
        }

        // Làm tròn tổng tiền trước thuế thành số nguyên (giống backend)
        const roundedTotalBeforeTax = Math.round(totalBeforeTax);

        // Tính thuế dựa trên tổng tiền trước thuế đã làm tròn (giống backend)
        const taxAmount = Math.round((roundedTotalBeforeTax * taxRate) / 100);

        // Tính tổng tiền sau thuế bằng cách cộng tổng tiền trước thuế đã làm tròn và thuế đã làm tròn
        const totalAfterTax = roundedTotalBeforeTax + taxAmount;

        details.push({
          category: item.Category || "CP",
          inventory_id: null,
          supplier_id: null,
          item_name: item.ProductName,
          unit: item.Unit || "",
          quantity: quantity,
          price_before_tax: priceBeforeTax,
          tax_rate: item.TaxRate || "0%",
          total_before_tax: roundedTotalBeforeTax,
          tax_amount: taxAmount,
          total_after_tax: totalAfterTax,
          seller_name: sellerName,
          seller_tax_code: sellerTaxCode,
          originalNo: item.No, // Lưu số thứ tự gốc để sắp xếp
          ocrTaskId: ocrTaskId // Lưu ID của kết quả OCR gốc
        });
      }
    });
  }

  // Sắp xếp lại các chi tiết theo số thứ tự (nếu có)
  details.sort((a, b) => {
    // Nếu có thông tin về số thứ tự trong dữ liệu gốc, sử dụng nó để sắp xếp
    const aNo = parseInt(a.originalNo || "0");
    const bNo = parseInt(b.originalNo || "0");
    return aNo - bNo;
  });

  return details;
};

// Hàm chuyển đổi kết quả OCR thành dữ liệu chi tiết hóa đơn xuất kho
export const convertOcrResultToExportDetails = (ocrResult: any, inventoryItems: any[]) => {
  // Lưu kết quả OCR gốc vào localStorage với ID là timestamp
  const taskId = `ocr_export_${Date.now()}`;
  saveOriginalOcrResult(taskId, ocrResult);

  // Định nghĩa kiểu dữ liệu ExportDetail
  interface ExportDetail {
    category: string;
    inventory_id: number | null;
    customer_id: number | null;
    item_name: string;
    unit: string;
    quantity: number;
    price_before_tax: number;
    tax_rate: string;
    total_before_tax: number;
    tax_amount: number;
    total_after_tax: number;
    buyer_name: string;
    buyer_tax_code: string;
    originalNo: string;
    ocrTaskId: string;
    isLaborService?: boolean; // Flag để phân biệt dịch vụ lao động
  }

  // Thêm taskId vào kết quả để có thể truy xuất lại sau này
  const details: ExportDetail[] = [];
  const skippedItems: any[] = [];
  const ocrTaskId = taskId;

  // Xử lý kết quả OCR cho hóa đơn xuất kho (chỉ có table data, không có thông tin buyer)
  if (ocrResult.table && Array.isArray(ocrResult.table)) {
    // Lấy dữ liệu hàng hóa
    ocrResult.table.forEach((item: any) => {
      if (item.No && item.ProductName) {
        // Kiểm tra xem có phải là hàng hóa có đơn vị "công" không
        const isLaborService = item.Unit && item.Unit.toLowerCase().includes('công');

        // Debug log để kiểm tra matching
        console.log(`🔍 OCR Item: "${item.ProductName}", Unit: "${item.Unit}"`);
        console.log(`📦 Available inventory items:`, inventoryItems.map(inv => `"${inv.item_name}" (${inv.unit})`));

        // Chuẩn hóa tên hàng hóa để so sánh (loại bỏ ký tự đặc biệt và khoảng trắng thừa)
        const normalizeString = (str: string) => {
          return str.toLowerCase()
            .replace(/[*\/\\()[\]{}]/g, '') // Loại bỏ ký tự đặc biệt
            .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
            .trim();
        };

        const normalizedOcrName = normalizeString(item.ProductName);
        console.log(`🔧 Normalized OCR name: "${normalizedOcrName}"`);

        // Tìm hàng hóa trong inventory với ưu tiên so sánh chính xác
        let matchedInventory = inventoryItems.find(inv =>
          inv.item_name.toLowerCase() === item.ProductName.toLowerCase()
        );

        if (matchedInventory) {
          console.log(`✅ Exact match found: "${matchedInventory.item_name}" (ID: ${matchedInventory.id})`);
        } else {
          console.log(`❌ No exact match for: "${item.ProductName}"`);

          // Thử so sánh với tên đã chuẩn hóa
          matchedInventory = inventoryItems.find(inv =>
            normalizeString(inv.item_name) === normalizedOcrName
          );

          if (matchedInventory) {
            console.log(`✅ Normalized exact match found: "${matchedInventory.item_name}" (ID: ${matchedInventory.id})`);
          } else {
            console.log(`❌ No normalized exact match for: "${item.ProductName}"`);

            // Nếu không tìm thấy khớp chính xác, thử tìm kiếm bằng includes
            matchedInventory = inventoryItems.find(inv =>
              inv.item_name.toLowerCase().includes(item.ProductName.toLowerCase()) ||
              item.ProductName.toLowerCase().includes(inv.item_name.toLowerCase()) ||
              normalizeString(inv.item_name).includes(normalizedOcrName) ||
              normalizedOcrName.includes(normalizeString(inv.item_name))
            );

            if (matchedInventory) {
              console.log(`🔍 Partial match found: "${matchedInventory.item_name}" (ID: ${matchedInventory.id})`);
            } else {
              console.log(`❌ No partial match found for: "${item.ProductName}"`);
            }
          }
        }

        // Logic xử lý:
        // 1. Nếu là dịch vụ lao động (đơn vị "công") -> cho phép thêm mà không cần kiểm tra tồn kho
        // 2. Nếu là hàng hóa thông thường -> phải tồn tại trong kho và có số lượng > 0
        const shouldInclude = isLaborService ||
          (matchedInventory && matchedInventory.category === 'HH' && Number(matchedInventory.quantity) > 0);

        console.log(`🔄 Processing "${item.ProductName}":`, {
          isLaborService,
          hasMatchedInventory: !!matchedInventory,
          inventoryCategory: matchedInventory?.category,
          inventoryQuantity: matchedInventory?.quantity,
          quantityCheck: matchedInventory ? Number(matchedInventory.quantity) > 0 : false,
          shouldInclude
        });

        // Debug chi tiết logic shouldInclude
        if (isLaborService) {
          console.log(`✅ Labor service - will be included`);
        } else if (!matchedInventory) {
          console.log(`❌ No matched inventory - will be skipped`);
        } else if (matchedInventory.category !== 'HH') {
          console.log(`❌ Not HH category (${matchedInventory.category}) - will be skipped`);
        } else if (Number(matchedInventory.quantity) <= 0) {
          console.log(`❌ Zero or negative quantity (${matchedInventory.quantity}) - will be skipped`);
        } else {
          console.log(`✅ All conditions met - will be included`);
        }

        if (shouldInclude) {
          const quantity = parseFloat(item.Quantity) || 0;

          // Kiểm tra số lượng xuất không vượt quá tồn kho (chỉ áp dụng cho hàng hóa thông thường)
          const quantityValid = isLaborService || (matchedInventory && quantity <= Number(matchedInventory.quantity));

          if (quantityValid) {
            // Parse đơn giá chỉ để tính toán, không thay đổi định dạng hiển thị
            const priceBeforeTax = normalizePrice(item.UnitPrice) || 0;

            // Tính tổng tiền trước thuế
            const totalBeforeTax = Math.round(quantity * priceBeforeTax);

            // Tính thuế
            let taxRate = 0;
            if (item.TaxRate && item.TaxRate !== "KCT") {
              taxRate = parseFloat(item.TaxRate.replace("%", "")) || 0;
            }

            // Tính thuế dựa trên tổng tiền trước thuế đã làm tròn
            const taxAmount = Math.round((totalBeforeTax * taxRate) / 100);

            // Tính tổng tiền sau thuế
            const totalAfterTax = totalBeforeTax + taxAmount;

            details.push({
              category: "HH", // Export chỉ cho phép hàng hóa
              inventory_id: isLaborService ? null : matchedInventory?.id || null, // Dịch vụ lao động không có inventory_id
              customer_id: null,
              item_name: isLaborService ? item.ProductName : (matchedInventory?.item_name || item.ProductName), // Dùng tên từ OCR cho dịch vụ lao động
              unit: item.Unit || (matchedInventory?.unit || ""), // Dùng đơn vị từ OCR
              quantity: quantity,
              price_before_tax: priceBeforeTax,
              tax_rate: item.TaxRate || "10%",
              total_before_tax: totalBeforeTax,
              tax_amount: taxAmount,
              total_after_tax: totalAfterTax,
              buyer_name: "", // Export OCR không có thông tin buyer
              buyer_tax_code: "",
              originalNo: item.No,
              ocrTaskId: ocrTaskId,
              isLaborService: isLaborService // Thêm flag để phân biệt dịch vụ lao động
            });
          } else {
            // Số lượng xuất vượt quá tồn kho (chỉ áp dụng cho hàng hóa thông thường)
            if (!isLaborService) {
              skippedItems.push({
                ...item,
                reason: `Số lượng xuất (${quantity}) vượt quá tồn kho (${matchedInventory?.quantity || 0})`
              });
            }
          }
        } else {
          // Hàng hóa không tồn tại hoặc hết hàng (không áp dụng cho dịch vụ lao động)
          if (!isLaborService) {
            const reason = !matchedInventory
              ? "Không tìm thấy trong kho"
              : matchedInventory.category !== 'HH'
              ? "Không phải hàng hóa (HH)"
              : "Hết hàng trong kho";

            console.log(`❌ Skipping "${item.ProductName}" - Reason: ${reason}`);

            skippedItems.push({
              ...item,
              reason: reason
            });
          } else {
            console.log(`⚠️ Labor service "${item.ProductName}" not included (should not happen)`);
          }
        }
      }
    });
  }

  // Sắp xếp lại các chi tiết theo số thứ tự
  details.sort((a, b) => {
    const aNo = parseInt(a.originalNo || "0");
    const bNo = parseInt(b.originalNo || "0");
    return aNo - bNo;
  });

  // Debug log tổng kết
  console.log(`🎯 OCR Conversion Summary:`, {
    totalOcrItems: ocrResult.table?.length || 0,
    validDetails: details.length,
    skippedItems: skippedItems.length,
    validItemNames: details.map(d => d.item_name),
    skippedItemNames: skippedItems.map(s => `${s.ProductName} (${s.reason})`)
  });

  return {
    details,
    skippedItems,
    ocrTaskId
  };
};
