"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { FaUpload, FaFileAlt, FaTimes, FaEye, FaSave, FaSpinner, FaFilePdf, FaFileInvoice } from "react-icons/fa"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

// Import API functions
import { uploadExportXMLPreview, saveExportXMLPreview, validateExportStock } from "@/lib/api/exports"

interface ExportXMLPreviewResponse {
  success: boolean
  tempFileId: string
  data: any
  previewData: any
}

interface ExportXMLUploadFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function ExportXMLUploadForm({ onSuccess, onCancel }: ExportXMLUploadFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewData, setPreviewData] = useState<ExportXMLPreviewResponse | null>(null)
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [invoiceType] = useState<'auto' | 'all_goods' | 'all_expenses'>('all_goods') // Mặc định là hàng hóa cho export

  const handleXmlFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const fileExtension = file.name.toLowerCase().split('.').pop()
      if (fileExtension === 'xml' || fileExtension === 'zip') {
        setXmlFile(file)
      } else {
        toast.error("Chỉ chấp nhận file XML hoặc ZIP")
        event.target.value = ''
      }
    }
  }

  const handlePdfFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const fileExtension = file.name.toLowerCase().split('.').pop()
      if (fileExtension === 'pdf') {
        setPdfFile(file)
      } else {
        toast.error("Chỉ chấp nhận file PDF")
        event.target.value = ''
      }
    }
  }

  const handleUpload = async () => {
    if (!xmlFile) {
      toast.error("Vui lòng chọn file XML hoặc ZIP")
      return
    }

    setIsUploading(true)
    try {
      // Tạo FormData với files
      const xmlFileToUpload = xmlFile
      const pdfFileToUpload = pdfFile

      const formData = new FormData()
      formData.append('files', xmlFileToUpload)
      if (pdfFileToUpload) {
        formData.append('files', pdfFileToUpload)
      }
      formData.append('invoice_type', invoiceType)

      const result = await uploadExportXMLPreview(formData)

      // Thống nhất với Import: sử dụng code thay vì success
      if (result.code === 1) {
        setPreviewData(result)
        toast.success("Upload và parse XML thành công!")
      } else {
        toast.error(result.message || "Lỗi upload XML")
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Lỗi upload XML")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    if (!previewData) {
      toast.error("Không có dữ liệu preview để lưu")
      return
    }

    setIsSaving(true)
    try {
      // Validate stock trước khi save - thống nhất với Import format
      const previews = previewData.data.previews || []

      // Tạo danh sách items để validate stock
      const itemsToValidate: any[] = []
      previews.forEach((item: any) => {
        if (item.items && Array.isArray(item.items)) {
          item.items.forEach((product: any) => {
            // Debug log để kiểm tra cấu trúc dữ liệu
            console.log('🔍 Product data:', product);

            const itemName = product.itemName || product.name || product.item_name;
            if (itemName) {
              itemsToValidate.push({
                item_name: itemName,
                quantity: product.quantity,
                category: product.category
              })
            } else {
              console.warn('⚠ Missing item name for product:', product);
            }
          })
        }
      })

      console.log('📋 Items to validate:', itemsToValidate);

      // Kiểm tra có items để validate không
      if (itemsToValidate.length === 0) {
        toast.error("Không có hàng hóa để kiểm tra tồn kho")
        return
      }

      // Validate stock cho hàng hóa (HH)
      try {
        const stockValidation = await validateExportStock(itemsToValidate)

        if (!stockValidation.success) {
          const errorMessages = stockValidation.data.stock_errors.map((error: any) =>
            `${error.item_name}: ${error.error} (Tồn kho: ${error.current_stock}, Cần: ${error.required_quantity})`
          ).join('\n')

          toast.error(`Lỗi tồn kho:\n${errorMessages}`, {
            duration: 8000
          })
          return
        }
      } catch (validationError: any) {
        console.error('❌ Lỗi validation stock:', validationError);
        toast.error(`Lỗi kiểm tra tồn kho: ${validationError.response?.data?.message || validationError.message || 'Lỗi không xác định'}`, {
          duration: 5000
        })
        return
      }

      // Nếu stock validation thành công, tiếp tục save
      const result = await saveExportXMLPreview(previewData.data.tempFileId, previewData.data.previews, invoiceType)

      if (result.success) {
        toast.success("Lưu hóa đơn xuất thành công!")
        onSuccess()
      } else {
        toast.error(result.message || "Lỗi lưu hóa đơn")
      }
    } catch (error: any) {
      console.error("Save error:", error)
      toast.error(error.message || "Lỗi lưu hóa đơn")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setPreviewData(null)
    setXmlFile(null)
    setPdfFile(null)
    onCancel()
  }

  // Hàm format tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const renderPreviewContent = () => {
    if (!previewData?.data?.previews) return null

    // Thống nhất với Import: sử dụng previews array
    const previews = previewData.data.previews

    return (
      <div className="space-y-6">
        {previews.map((item: any, index: number) => (
          <Card key={index} className="max-w-6xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FaEye className="h-5 w-5" />
                  Xem Trước Dữ Liệu XML
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.invoiceNumber}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Thông tin chung */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Thông tin hóa đơn</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Số hóa đơn:</strong> {item.invoiceNumber}</div>
                    <div><strong>Ngày lập:</strong> {item.generalInfo?.issueDate}</div>
                    {item.generalInfo?.invoiceType && (
                      <div><strong>Loại hóa đơn:</strong> {item.generalInfo.invoiceType}</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Tổng tiền</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Tiền trước thuế:</strong> {formatCurrency(item.totals?.totalBeforeTax || 0)}</div>
                    <div><strong>Tiền thuế:</strong> {formatCurrency(item.totals?.totalTax || 0)}</div>
                    <div><strong>Tổng tiền:</strong> <span className="font-semibold text-green-600">{formatCurrency(item.totals?.totalAfterTax || 0)}</span></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Thông tin tồn kho</h4>
                  <div className="space-y-1 text-sm">
                    {(() => {
                      const goodsItems = item.items?.filter((product: any) => product.category === 'HH') || [];
                      const hasStockIssues = goodsItems.some((product: any) =>
                        !product.stockInfo?.isEnough || !product.stockInfo?.available
                      );

                      return (
                        <>
                          <div><strong>Tổng mặt hàng:</strong> {item.items?.length || 0}</div>
                          <div><strong>Hàng hóa (HH):</strong> {goodsItems.length}</div>
                          <div><strong>Trạng thái kho:</strong>
                            <span className={`ml-1 font-medium ${hasStockIssues ? 'text-red-600' : 'text-green-600'}`}>
                              {hasStockIssues ? '⚠ Có vấn đề' : '✓ Đủ hàng'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Thông tin người bán và người mua */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Người bán (Công ty)</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Tên:</strong> {item.supplierInfo?.name}</div>
                    <div><strong>Mã số thuế:</strong> {item.supplierInfo?.taxCode}</div>
                    {item.supplierInfo?.address && (
                      <div><strong>Địa chỉ:</strong> {item.supplierInfo.address}</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Người mua (Đối tác)</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Tên:</strong> {item.customerInfo?.name}</div>
                    <div><strong>Mã số thuế:</strong> {item.customerInfo?.taxCode}</div>
                    {item.customerInfo?.address && (
                      <div><strong>Địa chỉ:</strong> {item.customerInfo.address}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chi tiết hàng hóa */}
              <div>
                <h4 className="font-semibold mb-3">Chi tiết hàng hóa ({item.items?.length || 0} mặt hàng)</h4>
                <ScrollArea className="h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên hàng hóa</TableHead>
                        <TableHead>ĐVT</TableHead>
                        <TableHead className="text-right">SL</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead className="text-right">Thành tiền</TableHead>
                        <TableHead>Thuế</TableHead>
                        <TableHead className="text-right">Tổng tiền</TableHead>
                        <TableHead>Tồn kho</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.items?.map((product: any, index: number) => {
                        const stockInfo = product.stockInfo;
                        const isGoods = product.category === 'HH';
                        const hasStockIssue = isGoods && (!stockInfo?.isEnough || !stockInfo?.available);

                        return (
                          <TableRow key={index} className={hasStockIssue ? 'bg-red-50' : ''}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{product.itemName}</span>
                                <Badge variant={product.category === 'HH' ? 'default' : 'secondary'} className="w-fit text-xs mt-1">
                                  {product.category === 'HH' ? 'Hàng hóa' : 'Chi phí'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>{product.unit}</TableCell>
                            <TableCell className="text-right">{product.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.unitPrice || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.totalBeforeTax || 0)}</TableCell>
                            <TableCell>{product.taxRate}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.totalAfterTax || 0)}</TableCell>
                            <TableCell>
                              {isGoods && stockInfo ? (
                                <div className="text-xs">
                                  {stockInfo.available ? (
                                    stockInfo.isEnough ? (
                                      <div className="text-green-600">
                                        <div>✓ Đủ hàng</div>
                                        <div>Kho: {stockInfo.currentStock}</div>
                                      </div>
                                    ) : (
                                      <div className="text-red-600">
                                        <div>⚠ Thiếu {stockInfo.shortage}</div>
                                        <div>Kho: {stockInfo.currentStock}</div>
                                      </div>
                                    )
                                  ) : (
                                    <div className="text-gray-600">
                                      <div>✗ Không có</div>
                                      <div>Kho: 0</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-blue-600 text-xs">Chi phí</div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">


      {/* Upload Areas */}
      {!previewData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* XML/ZIP Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaFileAlt className="h-5 w-5 text-blue-600" />
                File XML/ZIP (Bắt buộc)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors h-32 flex flex-col justify-center">
                <input
                  type="file"
                  accept=".xml,.zip"
                  onChange={handleXmlFileChange}
                  className="hidden"
                  id="xml-upload"
                />
                <label htmlFor="xml-upload" className="cursor-pointer">
                  <FaUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {xmlFile ? xmlFile.name : "Chọn file XML hoặc ZIP"}
                  </p>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* PDF Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaFilePdf className="h-5 w-5 text-red-600" />
                File PDF (Tùy chọn)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors h-32 flex flex-col justify-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <FaUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {pdfFile ? pdfFile.name : "Chọn file PDF"}
                  </p>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Content */}
      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaEye className="h-5 w-5 text-green-600" />
              Xem trước dữ liệu hóa đơn xuất
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderPreviewContent()}
          </CardContent>
        </Card>
      )}

      {/* Manual Upload Button - chỉ hiển thị khi có file và chưa có preview */}
      {(xmlFile || pdfFile) && !previewData && !isUploading && (
        <div className="flex justify-center">
          <Button
            onClick={handleUpload}
            disabled={!xmlFile}
            className="px-8"
          >
            <FaUpload className="h-4 w-4 mr-2" />
            Xử lý và xem trước
          </Button>
        </div>
      )}

      {/* Save Button - chỉ hiển thị khi có preview data */}
      {previewData && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <>
                <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <FaSave className="h-4 w-4 mr-2" />
                Lưu hóa đơn xuất
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
