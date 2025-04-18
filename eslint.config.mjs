import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Tắt hoàn toàn các quy tắc gây ra cảnh báo khi build
      "@typescript-eslint/no-unused-vars": "off", // Tắt cảnh báo về biến không sử dụng
      "@typescript-eslint/no-explicit-any": "off", // Tắt cảnh báo về kiểu any
      "@typescript-eslint/no-empty-object-type": "off", // Tắt cảnh báo về kiểu đối tượng rỗng
      "react/no-unescaped-entities": "off", // Tắt quy tắc này
      "react-hooks/exhaustive-deps": "off", // Tắt cảnh báo về dependencies trong useEffect
      "prefer-const": "error", // Giữ lỗi khi không sử dụng const cho biến không thay đổi
    },
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
];

export default eslintConfig;
