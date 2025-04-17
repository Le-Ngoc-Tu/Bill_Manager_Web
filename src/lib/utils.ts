import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Hàm định dạng số tiền với dấu phân cách hàng nghìn là dấu phẩy và dấu thập phân là dấu chấm
export function formatCurrency(amount: number | string): string {
  if (amount === null || amount === undefined) return "0 VNĐ";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  // Kiểm tra xem số có phải là số nguyên không
  if (Number.isInteger(numAmount)) {
    // Nếu là số nguyên, không hiển thị phần thập phân
    return numAmount.toLocaleString("en-US", {
      maximumFractionDigits: 0
    }) + " VNĐ";
  }

  // Nếu là số thập phân, hiển thị tất cả các chữ số thập phân
  // Chuyển đổi số thành chuỗi để giữ nguyên tất cả các chữ số thập phân
  const amountStr = numAmount.toString();
  // Tách phần nguyên và phần thập phân
  const parts = amountStr.split('.');
  // Định dạng phần nguyên với dấu phân cách hàng nghìn
  const integerPart = parseInt(parts[0]).toLocaleString("en-US");
  // Nếu có phần thập phân, giữ nguyên tất cả các chữ số thập phân
  if (parts.length > 1) {
    return `${integerPart}.${parts[1]} VNĐ`;
  }
  // Nếu không có phần thập phân
  return `${integerPart} VNĐ`;
}

// Hàm định dạng số lượng, sử dụng dấu phẩy làm dấu phân cách hàng nghìn và dấu chấm làm dấu thập phân
export function formatQuantity(quantity: number | string): string {
  if (quantity === null || quantity === undefined) return "0";
  const numQuantity = typeof quantity === "string" ? parseFloat(quantity) : quantity;

  // Kiểm tra xem số có phải là số nguyên không
  if (Number.isInteger(numQuantity)) {
    // Nếu số nhỏ hơn 1000, không cần dấu phân cách hàng nghìn
    if (numQuantity < 1000) {
      return numQuantity.toString();
    }
    // Nếu là số nguyên lớn hơn 1000, sử dụng dấu phẩy làm dấu phân cách hàng nghìn
    return numQuantity.toLocaleString("en-US", {
      maximumFractionDigits: 0
    });
  }

  // Nếu là số thập phân, hiển thị tất cả các chữ số thập phân
  // Chuyển đổi số thành chuỗi để giữ nguyên tất cả các chữ số thập phân
  const quantityStr = numQuantity.toString();
  // Tách phần nguyên và phần thập phân
  const parts = quantityStr.split('.');
  // Định dạng phần nguyên với dấu phân cách hàng nghìn
  const integerPart = parseInt(parts[0]).toLocaleString("en-US");
  // Nếu có phần thập phân, giữ nguyên tất cả các chữ số thập phân
  if (parts.length > 1) {
    return `${integerPart}.${parts[1]}`;
  }
  // Nếu không có phần thập phân
  return integerPart;
}
