import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";

interface OcrResultViewerProps {
  ocrResult: any;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonClassName?: string;
}

// Hàm dịch các thuật ngữ tiếng Anh sang tiếng Việt
const translateKey = (key: string): string => {
  const translations: Record<string, string> = {
    // Thông tin chung
    "document_type": "Loại tài liệu",
    "invoice_number": "Số hóa đơn",
    "invoice_date": "Ngày hóa đơn",
    "total_amount": "Tổng tiền",
    "tax_amount": "Tiền thuế",
    "amount_in_words": "Số tiền bằng chữ",

    // Thông tin người bán
    "SellerName": "Tên người bán",
    "SellerTaxCode": "Mã số thuế",
    "SellerAddress": "Địa chỉ",
    "SellerPhone": "Số điện thoại",
    "SellerEmail": "Email",
    "Phone": "Điện thoại",

    // Thông tin người mua
    "BuyerName": "Tên người mua",
    "BuyerTaxCode": "Mã số thuế",
    "BuyerAddress": "Địa chỉ",
    "BuyerPhone": "Số điện thoại",
    "BuyerEmail": "Email",

    // Thông tin hàng hóa
    "ProductName": "Tên hàng hóa",
    "Unit": "Đơn vị tính",
    "Quantity": "Số lượng",
    "UnitPrice": "Đơn giá",
    "TaxRate": "Thuế suất",
    "TotalBeforeTax": "Thành tiền chưa có thuế GTGT",
    "Category": "Loại",
    "No": "STT",
    "Type": "Tính chất",
    "Discount": "Chiết khấu",

    // Các thuật ngữ khác
    "processing_time": "Thời gian xử lý",
    "confidence": "Độ tin cậy",
    "page_count": "Số trang",
    "table_count": "Số bảng",
    "total_pages": "Tổng số trang",
    "total_rows": "Tổng số dòng",
    "total_tables": "Tổng số bảng",
    "seller_fields": "Số trường người bán",
    "buyer_fields": "Số trường người mua",
    "total_text_entities": "Tổng số thực thể văn bản",
    "success": "Thành công"
  };

  return translations[key] || key;
};

// Hàm dịch tên loại tài liệu
const translateDocumentType = (documentType: string): string => {
  const documentTypeTranslations: Record<string, string> = {
    "Invoice": "Hóa đơn",
    "Regular invoice": "Hóa đơn thông thường",
    "Expense": "Chi phí",
    "PVOIL expense": "Chi phí PVOIL",
    "Unknown": "Không xác định"
  };

  return documentTypeTranslations[documentType] || documentType;
};

// Hàm tạo màu sắc cho các giá trị quan trọng
const getHighlightStyle = (key: string, value: any): string => {
  // Các trường quan trọng cần highlight
  const importantFields = {
    // Màu đỏ cho thông tin tài chính
    red: ["total_amount", "tax_amount", "UnitPrice", "Quantity", "TotalBeforeTax"],
    // Màu tím cho thông tin người bán
    purple: ["SellerName", "SellerTaxCode", "SellerAddress", "Phone", "SellerPhone"],
    // Màu xanh lá cho thông tin người mua
    green: ["BuyerName", "BuyerTaxCode", "BuyerAddress", "BuyerPhone"],
    // Màu xanh dương cho thông tin hàng hóa
    blue: ["ProductName", "Unit", "invoice_number", "invoice_date", "No", "Type", "Category", "TaxRate"]
  };

  if (importantFields.red.includes(key)) return "text-red-600 font-semibold";
  if (importantFields.purple.includes(key)) return "text-purple-600 font-semibold";
  if (importantFields.green.includes(key)) return "text-green-700 font-semibold";
  if (importantFields.blue.includes(key)) return "text-blue-600 font-semibold";

  return "";
};

// Hàm định dạng giá trị hiển thị phù hợp với loại trường
const formatValue = (key: string, value: any): React.ReactNode => {
  // Các trường tiền tệ cần định dạng thành số nguyên (trừ đơn giá)
  const moneyFields = [
    "total_amount", "tax_amount", "TotalBeforeTax",
    "total_before_tax", "total_after_tax"
  ];

  // Các trường cần hiển thị với 3 chữ số thập phân
  const decimalFields = ["UnitPrice"];

  // Hàm chuẩn hóa giá trị số từ chuỗi
  const normalizeNumericValue = (value: any): number => {
    if (typeof value !== "string") return Number(value) || 0;

    // Xử lý trường hợp đặc biệt với chuỗi định dạng kiểu Việt Nam như "374.000"
    if (/^\d+(\.\d{3})+$/.test(value)) {
      // Đây là định dạng Việt Nam với dấu chấm phân cách hàng nghìn
      return parseFloat(value.replace(/\./g, ''));
    } else if (value.includes(',') && !value.includes('.')) {
      // Trường hợp dùng dấu phẩy làm dấu thập phân
      return parseFloat(value.replace(',', '.'));
    } else if (value.includes('.') && value.includes(',')) {
      // Trường hợp có cả dấu chấm và dấu phẩy
      // Kiểm tra vị trí của dấu chấm và dấu phẩy
      const lastDotPos = value.lastIndexOf('.');
      const lastCommaPos = value.lastIndexOf(',');

      if (lastDotPos > lastCommaPos) {
        // Dấu chấm là dấu thập phân (định dạng Mỹ)
        return parseFloat(value.replace(/,/g, ''));
      } else {
        // Dấu phẩy là dấu thập phân (định dạng Châu Âu/Việt Nam)
        return parseFloat(value.replace(/\./g, '').replace(',', '.'));
      }
    } else {
      // Các trường hợp khác, cố gắng chuyển đổi trực tiếp
      return parseFloat(value) || 0;
    }
  };

  // Ưu tiên giữ nguyên định dạng từ OCR
  if (decimalFields.includes(key) || moneyFields.includes(key)) {
    // Nếu OCR đã trả về định dạng Việt Nam, giữ nguyên
    if (typeof value === 'string' && (value.includes('.') || value.includes(','))) {
      return value; // Hiển thị nguyên bản từ OCR
    }

    // Chỉ format nếu là số thuần túy
    try {
      const numValue = normalizeNumericValue(value);
      if (!isNaN(numValue)) {
        if (decimalFields.includes(key)) {
          // Trường đơn giá - hiển thị với tối đa 3 chữ số thập phân
          return numValue.toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
          });
        } else {
          // Trường tiền tệ - làm tròn thành số nguyên
          const roundedValue = Math.round(numValue);
          return roundedValue.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
        }
      }
    } catch (error) {
      return value;
    }
  }

  // Nếu không phải trường tiền tệ, trả về giá trị gốc
  return value;
};

const OcrResultViewer: React.FC<OcrResultViewerProps> = ({
  ocrResult,
  buttonLabel = "Xem kết quả OCR",
  buttonVariant = "outline",
  buttonSize = "sm",
  buttonClassName = "",
}) => {
  const [open, setOpen] = useState(false);

  if (!ocrResult) {
    return null;
  }

  // Xác định loại hóa đơn
  const documentType = ocrResult.statistics?.document_type || "Không xác định";

  // Xử lý thông tin người bán
  const sellerInfoFromText = ocrResult.text_content?.find((item: any) => item.type === "seller") || {};
  const sellerInfoDirect = ocrResult.seller || {};
  // Ưu tiên dữ liệu từ trường seller nếu có
  const sellerInfo = Object.keys(sellerInfoDirect).length > 0 ? sellerInfoDirect : sellerInfoFromText;

  // Xử lý thông tin người mua
  const buyerInfoFromText = ocrResult.text_content?.find((item: any) => item.type === "buyer") || {};
  const buyerInfoDirect = ocrResult.buyer || {};
  // Ưu tiên dữ liệu từ trường buyer nếu có
  const buyerInfo = Object.keys(buyerInfoDirect).length > 0 ? buyerInfoDirect : buyerInfoFromText;

  // Xử lý bảng dữ liệu
  const tables = ocrResult.tables || [];
  const tableData = ocrResult.table || []; // Cho hóa đơn chi phí

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={(e) => {
          // Ngăn chặn sự kiện lan truyền để không kích hoạt validate form
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={buttonClassName}
        type="button" // Đảm bảo nút này không submit form
      >
        <Eye className="mr-1 h-3.5 w-3.5" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={(open) => {
        // Ngăn chặn validate form khi đóng dialog
        setOpen(open);
      }}>
        <DialogContent className="max-w-[90vw] md:max-w-[80vw] max-h-[90vh] h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-bold">Kết quả OCR</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="summary" className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary" className="text-base md:text-lg">Tổng quan</TabsTrigger>
              <TabsTrigger value="seller" className="text-base md:text-lg">Người bán</TabsTrigger>
              <TabsTrigger value="buyer" className="text-base md:text-lg">Người mua</TabsTrigger>
              <TabsTrigger value="tables" className="text-base md:text-lg">Bảng dữ liệu</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-150px)]">
              <TabsContent value="summary" className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Thông tin tổng quan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Thông tin cơ bản */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                          <span className="text-sm md:text-base font-medium">Loại tài liệu:</span>
                          <Badge variant="outline" className="text-base px-3 py-1">{documentType}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                          <span className="text-sm md:text-base font-medium">Tên file:</span>
                          <span className="text-sm md:text-base font-semibold">{ocrResult.filename || "Không có thông tin"}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                          <span className="text-sm md:text-base font-medium">Thời gian xử lý:</span>
                          <span className="text-sm md:text-base font-semibold">{ocrResult.processing_time ? `${ocrResult.processing_time.toFixed(2)}s` : "Không có thông tin"}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                          <span className="text-sm md:text-base font-medium">Số bảng:</span>
                          <span className="text-sm md:text-base font-semibold">{tables.length || tableData.length || 0}</span>
                        </div>
                      </div>

                      {/* Thống kê chi tiết */}
                      {ocrResult.statistics && (
                        <div className="mt-6">
                          <h3 className="text-base md:text-lg font-medium mb-3">Thống kê chi tiết:</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(ocrResult.statistics).map(([key, value]: [string, any]) => {
                              // Dịch các thuật ngữ tiếng Anh sang tiếng Việt
                              const translatedKey = translateKey(key);
                              // Dịch giá trị nếu cần
                              let translatedValue = value;
                              if (key === "document_type") {
                                translatedValue = translateDocumentType(value);
                              } else if (typeof value === "boolean") {
                                translatedValue = value ? "Có" : "Không";
                              }

                              return (
                                <div key={key} className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                                  <span className="text-sm md:text-base font-medium">{translatedKey}:</span>
                                  <span className="text-sm md:text-base font-semibold">{translatedValue}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seller" className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Thông tin người bán</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(sellerInfo).length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(sellerInfo).map(([key, value]: [string, any]) => {
                          // Bỏ qua các trường không cần hiển thị
                          if (key === "type" || key === "page" || key === "BankAccount" || key === "Bank") return null;

                          const translatedKey = translateKey(key);
                          const highlightClass = getHighlightStyle(key, value);
                          return (
                            <div key={key} className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                              <span className="text-sm md:text-base font-medium">{translatedKey}:</span>
                              <span className={`text-sm md:text-base ${highlightClass}`}>{formatValue(key, value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-base md:text-lg text-muted-foreground">Không có thông tin người bán</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="buyer" className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Thông tin người mua</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(buyerInfo).length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(buyerInfo).map(([key, value]: [string, any]) => {
                          // Bỏ qua các trường không cần hiển thị
                          if (key === "type" || key === "page") return null;

                          const translatedKey = translateKey(key);
                          const highlightClass = getHighlightStyle(key, value);
                          return (
                            <div key={key} className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                              <span className="text-sm md:text-base font-medium">{translatedKey}:</span>
                              <span className={`text-sm md:text-base ${highlightClass}`}>{formatValue(key, value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-base md:text-lg text-muted-foreground">Không có thông tin người mua</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tables" className="p-4">
                {tables.length > 0 ? (
                  tables.map((table: any, tableIndex: number) => (
                    <Card key={tableIndex} className="mb-4">
                      <CardHeader>
                        <CardTitle className="text-lg md:text-xl">Bảng {tableIndex + 1} (Trang {table.page || 1})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-blue-50">
                              <TableRow>
                                {table.data[0] && Object.keys(table.data[0]).map((header, i) => {
                                  const translatedHeader = translateKey(header);
                                  return (
                                    <TableHead key={i} className="text-base md:text-lg font-bold text-blue-700">
                                      {translatedHeader}
                                    </TableHead>
                                  );
                                })}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {table.data.map((row: any, rowIndex: number) => (
                                <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  {Object.entries(row).map(([key, cell]: [string, any], cellIndex: number) => {
                                    const highlightClass = getHighlightStyle(key, cell);
                                    // Thêm class đặc biệt cho tên hàng hóa để đảm bảo xuống dòng
                                    const isProductName = key === "ProductName" || key === "product_name" || key === "item_name";
                                    return (
                                      <TableCell
                                        key={cellIndex}
                                        className={`text-base ${highlightClass} ${isProductName ? 'whitespace-normal break-words max-w-[250px]' : ''}`}
                                      >
                                        {formatValue(key, cell)}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : tableData.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg md:text-xl">Bảng dữ liệu</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-blue-50">
                            <TableRow>
                              {tableData[0] && Object.keys(tableData[0]).map((header, i) => {
                                const translatedHeader = translateKey(header);
                                return (
                                  <TableHead key={i} className="text-base md:text-lg font-bold text-blue-700">
                                    {translatedHeader}
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableData.map((row: any, rowIndex: number) => (
                              <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                {Object.entries(row).map(([key, cell]: [string, any], cellIndex: number) => {
                                  const highlightClass = getHighlightStyle(key, cell);
                                  // Thêm class đặc biệt cho tên hàng hóa để đảm bảo xuống dòng
                                  const isProductName = key === "ProductName" || key === "product_name" || key === "item_name";
                                  return (
                                    <TableCell
                                      key={cellIndex}
                                      className={`text-base ${highlightClass} ${isProductName ? 'whitespace-normal break-words max-w-[250px]' : ''}`}
                                    >
                                      {formatValue(key, cell)}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-base md:text-lg text-muted-foreground">Không có dữ liệu bảng</p>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OcrResultViewer;
