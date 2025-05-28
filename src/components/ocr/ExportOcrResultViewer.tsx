import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface ExportOcrResultViewerProps {
  ocrResult: any;
  validItems: any[];
  skippedItems: any[];
  inventoryItems: any[];
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonClassName?: string;
}

// Hàm dịch các thuật ngữ tiếng Anh sang tiếng Việt
const translateKey = (key: string): string => {
  const translations: Record<string, string> = {
    "No": "STT",
    "ProductName": "Tên hàng hóa",
    "Unit": "Đơn vị tính",
    "Quantity": "Số lượng",
    "UnitPrice": "Đơn giá",
    "DiscountAmount": "Chiết khấu",
    "TaxRate": "Thuế suất",
    "TotalBeforeTax": "Thành tiền",
    "Category": "Loại",
    "Type": "Tính chất",
  };

  return translations[key] || key;
};

// Hàm định dạng giá trị hiển thị - ưu tiên giữ nguyên định dạng từ OCR
const formatValue = (key: string, value: any): React.ReactNode => {
  // Các trường tiền tệ
  const moneyFields = ["UnitPrice", "DiscountAmount", "TotalBeforeTax"];

  if (moneyFields.includes(key) && value) {
    // Nếu OCR đã trả về định dạng Việt Nam, giữ nguyên
    if (typeof value === 'string' && (value.includes('.') || value.includes(','))) {
      return value; // Hiển thị nguyên bản từ OCR
    }

    // Chỉ format nếu là số thuần túy
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        return numValue.toLocaleString("vi-VN", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 3
        });
      }
    }
  }

  return value;
};

// Hàm kiểm tra hàng hóa có hợp lệ không (bao gồm xử lý đặc biệt cho dịch vụ lao động)
const isItemValid = (item: any, inventoryItems: any[]): { valid: boolean; reason?: string; inventory?: any; isLaborService?: boolean } => {
  if (!item.ProductName) {
    return { valid: false, reason: "Không có tên hàng hóa" };
  }

  // Kiểm tra xem có phải là dịch vụ lao động không
  const isLaborService = item.Unit && item.Unit.toLowerCase().includes('công');

  // Nếu là dịch vụ lao động, luôn hợp lệ
  if (isLaborService) {
    return {
      valid: true,
      reason: "Dịch vụ lao động (không cần kiểm tra tồn kho)",
      isLaborService: true
    };
  }

  // Tìm hàng hóa trong inventory cho hàng hóa thông thường
  const matchedInventory = inventoryItems.find(inv =>
    inv.item_name.toLowerCase().includes(item.ProductName.toLowerCase()) ||
    item.ProductName.toLowerCase().includes(inv.item_name.toLowerCase())
  );

  if (!matchedInventory) {
    return { valid: false, reason: "Không tìm thấy trong kho" };
  }

  if (matchedInventory.category !== 'HH') {
    return { valid: false, reason: "Không phải hàng hóa (HH)" };
  }

  if (Number(matchedInventory.quantity) <= 0) {
    return { valid: false, reason: "Hết hàng trong kho" };
  }

  const quantity = parseFloat(item.Quantity) || 0;
  if (quantity > Number(matchedInventory.quantity)) {
    return {
      valid: false,
      reason: `Số lượng xuất (${quantity}) vượt quá tồn kho (${matchedInventory.quantity})`,
      inventory: matchedInventory
    };
  }

  return { valid: true, inventory: matchedInventory };
};

const ExportOcrResultViewer: React.FC<ExportOcrResultViewerProps> = ({
  ocrResult,
  validItems,
  skippedItems,
  inventoryItems,
  buttonLabel = "Xem kết quả OCR",
  buttonVariant = "outline",
  buttonSize = "sm",
  buttonClassName = "",
}) => {
  const [open, setOpen] = useState(false);

  if (!ocrResult) {
    return null;
  }

  // Xử lý bảng dữ liệu từ OCR
  const tableData = ocrResult.table || [];

  // Tính toán thống kê cho dịch vụ lao động
  const laborServices = tableData.filter((item: any) => {
    const validation = isItemValid(item, inventoryItems);
    return validation.isLaborService;
  });

  const regularValidItems = validItems.filter((item: any) => !item.isLaborService);

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={buttonClassName}
        type="button"
      >
        <Eye className="mr-1 h-3.5 w-3.5" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] max-h-[90vh] h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-bold">
              Kết quả OCR - Hóa đơn xuất kho
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="summary" className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary" className="text-base md:text-lg">Tổng quan</TabsTrigger>
              <TabsTrigger value="valid" className="text-base md:text-lg">Hàng hóa hợp lệ</TabsTrigger>
              <TabsTrigger value="labor" className="text-base md:text-lg">Dịch vụ lao động</TabsTrigger>
              <TabsTrigger value="skipped" className="text-base md:text-lg">Hàng hóa bị bỏ qua</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-150px)]">
              <TabsContent value="summary" className="p-4">
                <div className="space-y-4">
                  {/* Thống kê tổng quan */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg md:text-xl">Thống kê tổng quan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-md bg-gray-50 border border-gray-200">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-gray-600" />
                            <span className="text-sm md:text-base font-medium">Tổng số hàng hóa:</span>
                          </div>
                          <Badge variant="outline" className="text-base px-3 py-1 bg-gray-100 text-gray-700">
                            {tableData.length}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-md bg-green-50 border border-green-200">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-sm md:text-base font-medium">Hàng hóa thông thường:</span>
                          </div>
                          <Badge variant="outline" className="text-base px-3 py-1 bg-green-100 text-green-700">
                            {regularValidItems.length}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-md bg-blue-50 border border-blue-200">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                            <span className="text-sm md:text-base font-medium">Dịch vụ lao động:</span>
                          </div>
                          <Badge variant="outline" className="text-base px-3 py-1 bg-blue-100 text-blue-700">
                            {laborServices.length}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-md bg-orange-50 border border-orange-200">
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-5 w-5 text-orange-600" />
                            <span className="text-sm md:text-base font-medium">Hàng hóa bị bỏ qua:</span>
                          </div>
                          <Badge variant="outline" className="text-base px-3 py-1 bg-orange-100 text-orange-700">
                            {skippedItems.length}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bảng dữ liệu OCR gốc với màu sắc phân biệt */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg md:text-xl">Dữ liệu OCR gốc</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-blue-50">
                            <TableRow>
                              <TableHead className="text-base md:text-lg font-bold text-blue-700">Trạng thái</TableHead>
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
                            {tableData.map((row: any, rowIndex: number) => {
                              const validation = isItemValid(row, inventoryItems);
                              const isValid = validation.valid;
                              const isLaborService = validation.isLaborService;

                              // Màu sắc phân biệt: xanh lá cho hợp lệ, xanh dương cho dịch vụ lao động, cam cho bị bỏ qua
                              let rowBgColor = "bg-orange-50";
                              let borderColor = "border-l-4 border-l-orange-500";
                              let iconColor = "text-orange-600";
                              let icon = <XCircle className="h-5 w-5 text-orange-600 mx-auto" />;

                              if (isValid) {
                                if (isLaborService) {
                                  // Dịch vụ lao động - màu xanh dương
                                  rowBgColor = "bg-blue-50";
                                  borderColor = "border-l-4 border-l-blue-500";
                                  iconColor = "text-blue-600";
                                  icon = <CheckCircle className="h-5 w-5 text-blue-600 mx-auto" />;
                                } else {
                                  // Hàng hóa thông thường hợp lệ - màu xanh lá
                                  rowBgColor = "bg-green-50";
                                  borderColor = "border-l-4 border-l-green-500";
                                  iconColor = "text-green-600";
                                  icon = <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />;
                                }
                              }

                              return (
                                <TableRow key={rowIndex} className={`${rowBgColor} ${borderColor}`}>
                                  <TableCell className="text-center">
                                    {icon}
                                  </TableCell>
                                  {Object.entries(row).map(([key, cell]: [string, any], cellIndex: number) => {
                                    const isProductName = key === "ProductName";
                                    return (
                                      <TableCell
                                        key={cellIndex}
                                        className={`text-base ${isProductName ? 'whitespace-normal break-words max-w-[250px] font-medium' : ''}`}
                                      >
                                        {formatValue(key, cell)}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="valid" className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl text-green-700">
                      Hàng hóa thông thường hợp lệ ({regularValidItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {regularValidItems.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-green-50">
                            <TableRow>
                              {regularValidItems[0] && Object.keys(regularValidItems[0]).filter(key => key !== 'reason' && key !== 'ocrTaskId' && key !== 'isLaborService').map((header, i) => {
                                const translatedHeader = translateKey(header);
                                return (
                                  <TableHead key={i} className="text-base md:text-lg font-bold text-green-700">
                                    {translatedHeader}
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {regularValidItems.map((row: any, rowIndex: number) => (
                              <TableRow key={rowIndex} className="bg-green-50 border-l-4 border-l-green-500">
                                {Object.entries(row).filter(([key]) => key !== 'reason' && key !== 'ocrTaskId' && key !== 'isLaborService').map(([key, cell]: [string, any], cellIndex: number) => {
                                  const isProductName = key === "ProductName";
                                  return (
                                    <TableCell
                                      key={cellIndex}
                                      className={`text-base ${isProductName ? 'whitespace-normal break-words max-w-[250px] font-medium' : ''}`}
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
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                        <p className="text-lg text-muted-foreground">Không có hàng hóa thông thường hợp lệ nào</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="labor" className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl text-blue-700">
                      Dịch vụ lao động ({laborServices.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {laborServices.length > 0 ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-blue-800">Lưu ý về dịch vụ lao động</span>
                          </div>
                          <p className="text-sm text-blue-700">
                            Các dịch vụ lao động có đơn vị tính "công" được tự động chấp nhận mà không cần kiểm tra tồn kho
                            vì đây là dịch vụ lao động, không phải hàng hóa vật lý.
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-blue-50">
                              <TableRow>
                                {laborServices[0] && Object.keys(laborServices[0]).map((header, i) => {
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
                              {laborServices.map((row: any, rowIndex: number) => (
                                <TableRow key={rowIndex} className="bg-blue-50 border-l-4 border-l-blue-500">
                                  {Object.entries(row).map(([key, cell]: [string, any], cellIndex: number) => {
                                    const isProductName = key === "ProductName";
                                    return (
                                      <TableCell
                                        key={cellIndex}
                                        className={`text-base ${isProductName ? 'whitespace-normal break-words max-w-[250px] font-medium' : ''}`}
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
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                        <p className="text-lg text-muted-foreground">Không có dịch vụ lao động nào</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="skipped" className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl text-orange-700">
                      Hàng hóa bị bỏ qua ({skippedItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {skippedItems.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-orange-50">
                            <TableRow>
                              <TableHead className="text-base md:text-lg font-bold text-orange-700">Lý do</TableHead>
                              {skippedItems[0] && Object.keys(skippedItems[0]).filter(key => key !== 'reason').map((header, i) => {
                                const translatedHeader = translateKey(header);
                                return (
                                  <TableHead key={i} className="text-base md:text-lg font-bold text-orange-700">
                                    {translatedHeader}
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {skippedItems.map((row: any, rowIndex: number) => (
                              <TableRow key={rowIndex} className="bg-orange-50 border-l-4 border-l-orange-500">
                                <TableCell className="text-sm font-medium text-orange-700 max-w-[200px] whitespace-normal break-words">
                                  <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                    <span>{row.reason}</span>
                                  </div>
                                </TableCell>
                                {Object.entries(row).filter(([key]) => key !== 'reason').map(([key, cell]: [string, any], cellIndex: number) => {
                                  const isProductName = key === "ProductName";
                                  return (
                                    <TableCell
                                      key={cellIndex}
                                      className={`text-base ${isProductName ? 'whitespace-normal break-words max-w-[250px] font-medium' : ''}`}
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
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                        <p className="text-lg text-muted-foreground">Tất cả hàng hóa đều hợp lệ!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExportOcrResultViewer;
