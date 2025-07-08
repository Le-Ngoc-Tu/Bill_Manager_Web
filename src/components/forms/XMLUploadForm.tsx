"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { FaUpload, FaFileAlt, FaTimes, FaEye, FaSave, FaSpinner } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatQuantity } from "@/lib/utils"
import { uploadXMLPreview, saveXMLPreview, cancelXMLPreview, XMLPreviewData, XMLPreviewResponse } from "@/lib/api/imports"

interface XMLUploadFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function XMLUploadForm({ onSuccess, onCancel }: XMLUploadFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewData, setPreviewData] = useState<XMLPreviewResponse | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Xử lý drop file
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Kiểm tra định dạng file
    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Chỉ cho phép upload file XML')
      return
    }

    // Kiểm tra kích thước file (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB')
      return
    }

    setIsUploading(true)
    setUploadedFile(file)

    try {
      const result = await uploadXMLPreview(file)
      
      if (result.code === 1) {
        setPreviewData(result.data)
        toast.success('Upload và parse XML thành công!')
      } else {
        toast.error(result.message || 'Lỗi upload XML')
      }
    } catch (error: any) {
      console.error('Error uploading XML:', error)
      toast.error(error.response?.data?.message || 'Lỗi upload XML')
      setUploadedFile(null)
    } finally {
      setIsUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml']
    },
    maxFiles: 1,
    disabled: isUploading || !!previewData
  })

  // Hủy upload và preview
  const handleCancel = async () => {
    if (previewData?.tempFileId) {
      try {
        await cancelXMLPreview(previewData.tempFileId)
      } catch (error) {
        console.error('Error canceling preview:', error)
      }
    }
    
    setPreviewData(null)
    setUploadedFile(null)
    
    if (onCancel) {
      onCancel()
    }
  }

  // Lưu preview data vào database
  const handleSave = async () => {
    if (!previewData) return

    setIsSaving(true)

    try {
      const result = await saveXMLPreview(previewData.tempFileId, previewData.previewData)
      
      if (result.code === 1) {
        toast.success('Lưu hóa đơn từ XML thành công!')
        setPreviewData(null)
        setUploadedFile(null)
        
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast.error(result.message || 'Lỗi lưu hóa đơn')
      }
    } catch (error: any) {
      console.error('Error saving XML preview:', error)
      toast.error(error.response?.data?.message || 'Lỗi lưu hóa đơn')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaUpload className="h-5 w-5" />
              Upload File XML Hóa Đơn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                ${isUploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <FaSpinner className="h-8 w-8 text-blue-500 animate-spin" />
                  <p className="text-lg font-medium">Đang xử lý file XML...</p>
                  <p className="text-sm text-gray-500">Vui lòng đợi trong giây lát</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FaFileAlt className="h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive ? 'Thả file XML vào đây...' : 'Kéo thả file XML hoặc click để chọn'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Chỉ hỗ trợ file .xml, tối đa 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {uploadedFile && !previewData && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaFileAlt className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">{uploadedFile.name}</span>
                  <Badge variant="secondary">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Data */}
      {previewData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FaEye className="h-5 w-5" />
                Xem Trước Dữ Liệu XML
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{previewData.fileName}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Thông tin chung */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Thông tin hóa đơn</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Số hóa đơn:</strong> {previewData.previewData.general.invoiceNumber}</div>
                  <div><strong>Ngày lập:</strong> {previewData.previewData.general.issueDate}</div>
                  {previewData.previewData.general.invoiceType && (
                    <div><strong>Loại hóa đơn:</strong> {previewData.previewData.general.invoiceType}</div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Tổng tiền</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Tiền trước thuế:</strong> {formatCurrency(previewData.previewData.totals.totalBeforeTax)}</div>
                  <div><strong>Tiền thuế:</strong> {formatCurrency(previewData.previewData.totals.totalTax)}</div>
                  <div><strong>Tổng tiền:</strong> <span className="font-semibold text-green-600">{formatCurrency(previewData.previewData.totals.totalAfterTax)}</span></div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Thông tin bên bán và bên mua */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Bên bán (Supplier)</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Tên:</strong> {previewData.previewData.seller.name}</div>
                  {previewData.previewData.seller.taxCode && (
                    <div><strong>MST:</strong> {previewData.previewData.seller.taxCode}</div>
                  )}
                  {previewData.previewData.seller.address && (
                    <div><strong>Địa chỉ:</strong> {previewData.previewData.seller.address}</div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Bên mua (Customer)</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Tên:</strong> {previewData.previewData.buyer.name}</div>
                  {previewData.previewData.buyer.taxCode && (
                    <div><strong>MST:</strong> {previewData.previewData.buyer.taxCode}</div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Chi tiết hàng hóa */}
            <div>
              <h4 className="font-semibold mb-3">Chi tiết hàng hóa ({previewData.previewData.items.length} mặt hàng)</h4>
              <ScrollArea className="h-64">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.previewData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{formatQuantity(item.quantity)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.priceBeforeTax)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalBeforeTax)}</TableCell>
                        <TableCell>{item.taxRate}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.totalAfterTax)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <FaTimes className="h-4 w-4 mr-2" />
                Hủy
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FaSave className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Đang lưu...' : 'Lưu hóa đơn'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
