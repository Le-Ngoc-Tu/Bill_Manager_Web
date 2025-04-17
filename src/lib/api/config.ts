// API URL từ biến môi trường
export const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7010/api";

// Hàm helper để lấy token
export const getAuthHeader = () => {
  const accessToken = localStorage.getItem("accessToken");
  return {
    Authorization: `Bearer ${accessToken}`
  };
};
