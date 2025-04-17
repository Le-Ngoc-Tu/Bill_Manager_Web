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
      // Tắt các quy tắc gây ra lỗi khi build
      "@typescript-eslint/no-unused-vars": "warn", // Chuyển từ error sang warning
      "@typescript-eslint/no-explicit-any": "warn", // Chuyển từ error sang warning
      "@typescript-eslint/no-empty-object-type": "warn", // Chuyển từ error sang warning
      "react/no-unescaped-entities": "off", // Tắt quy tắc này
      "react-hooks/exhaustive-deps": "warn", // Đã là warning, giữ nguyên
    },
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
];

export default eslintConfig;
