import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Hàm định dạng số tiền với dấu phân cách hàng nghìn là dấu chấm (định dạng tiếng Việt)
// Luôn làm tròn thành số nguyên
export function formatCurrency(amount: number | string): string {
  if (amount === null || amount === undefined) return "0 VNĐ";

  // Chuyển đổi sang số và làm tròn thành số nguyên
  const numAmount = Math.round(typeof amount === "string" ? parseFloat(amount) : amount);

  // Định dạng số với dấu phân cách hàng nghìn là dấu chấm (.) và không hiển thị phần thập phân
  return numAmount.toLocaleString("vi-VN", {
    maximumFractionDigits: 0
  }) + " VNĐ";
}

// Hàm định dạng số tiền cho các ô input tổng tiền (không có đơn vị VNĐ)
// Sử dụng định dạng Việt Nam: dấu chấm (.) làm phân cách hàng nghìn
export function formatCurrencyInput(amount: number | string): string {
  if (amount === null || amount === undefined) return "";

  // Chuyển đổi sang số và làm tròn thành số nguyên
  const numAmount = Math.round(typeof amount === "string" ? parseFloat(amount) : amount);

  // Nếu giá trị bằng 0, trả về chuỗi rỗng
  if (numAmount === 0) return "";

  // Định dạng số với dấu phân cách hàng nghìn là dấu chấm (.) và không hiển thị phần thập phân
  return numAmount.toLocaleString("vi-VN", {
    maximumFractionDigits: 0
  });
}

// Hàm định dạng đơn giá với dấu phân cách hàng nghìn là dấu chấm và dấu phẩy làm dấu thập phân (định dạng tiếng Việt)
// Luôn hiển thị 3 chữ số thập phân
export function formatPrice(price: number | string): string {
  if (price === null || price === undefined) return "0,000 VNĐ";

  // Chuyển đổi sang số
  const numPrice = typeof price === "string" ? parseFloat(price) : price;

  // Làm tròn đến 3 chữ số thập phân
  const roundedPrice = Math.round(numPrice * 1000) / 1000;

  // Định dạng số với dấu phân cách hàng nghìn là dấu chấm (.) và hiển thị luôn 3 chữ số thập phân
  return roundedPrice.toLocaleString("vi-VN", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3
  }) + " VNĐ";
}

// Hàm định dạng số lượng, sử dụng dấu chấm làm dấu phân cách hàng nghìn và dấu phẩy làm dấu thập phân
export function formatQuantity(quantity: number | string): string {
  if (quantity === null || quantity === undefined) return "0";
  const numQuantity = typeof quantity === "string" ? parseFloat(quantity) : quantity;

  // Kiểm tra xem số có phải là số nguyên không
  if (Number.isInteger(numQuantity)) {
    // Nếu số nhỏ hơn 1000, không cần dấu phân cách hàng nghìn
    if (numQuantity < 1000) {
      return numQuantity.toString();
    }
    // Nếu là số nguyên lớn hơn 1000, sử dụng dấu chấm làm dấu phân cách hàng nghìn
    return numQuantity.toLocaleString("vi-VN", {
      maximumFractionDigits: 0
    });
  }

  // Nếu là số thập phân, hiển thị tất cả các chữ số thập phân với dấu phẩy làm dấu thập phân
  return numQuantity.toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 20 // Giữ tất cả các chữ số thập phân có ý nghĩa
  });
}
