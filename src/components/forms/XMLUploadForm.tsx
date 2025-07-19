"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { FaUpload, FaFileAlt, FaTimes, FaEye, FaSave, FaSpinner, FaFilePdf, FaFileInvoice } from "react-icons/fa"
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
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [invoiceType, setInvoiceType] = useState<'auto' | 'all_goods' | 'all_expenses'>('auto')

  // Xử lý drop XML/ZIP file
  const onDropXml = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Kiểm tra định dạng file
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xml') && !fileName.endsWith('.zip')) {
      toast.error('Chỉ cho phép upload file XML hoặc ZIP')
      return
    }

    // Kiểm tra kích thước file (100MB cho ZIP)
    const maxSize = fileName.endsWith('.zip') ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(`File quá lớn. Vui lòng chọn file nhỏ hơn ${fileName.endsWith('.zip') ? '100MB' : '10MB'}`)
      return
    }

    setXmlFile(file)
  }, [pdfFile])

  // Xử lý drop PDF file
  const onDropPdf = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Kiểm tra định dạng file
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Chỉ cho phép upload file PDF')
      return
    }

    // Kiểm tra kích thước file (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File PDF quá lớn. Vui lòng chọn file nhỏ hơn 50MB')
      return
    }

    setPdfFile(file)
  }, [])

  // Xử lý upload files
  const handleUpload = useCallback(async (xmlFileToUpload: File, pdfFileToUpload: File | null) => {
    if (!xmlFileToUpload) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('files', xmlFileToUpload)
      if (pdfFileToUpload) {
        formData.append('files', pdfFileToUpload)
      }
      formData.append('invoice_type', invoiceType)

      const result = await uploadXMLPreview(formData)

      if (result.code === 1) {
        setPreviewData(result.data)
        toast.success('Upload và parse thành công!')
      } else {
        toast.error(result.message || 'Lỗi upload file')
      }
    } catch (error: any) {
      console.error('Error uploading files:', error)
      toast.error(error.response?.data?.message || 'Lỗi upload file')
      setXmlFile(null)
      setPdfFile(null)
    } finally {
      setIsUploading(false)
    }
  }, [])

  const { getRootProps: getXmlRootProps, getInputProps: getXmlInputProps, isDragActive: isXmlDragActive } = useDropzone({
    onDrop: onDropXml,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'application/zip': ['.zip']
    },
    maxFiles: 1,
    disabled: isUploading || !!previewData
  })

  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps, isDragActive: isPdfDragActive } = useDropzone({
    onDrop: onDropPdf,
    accept: {
      'application/pdf': ['.pdf']
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
    setXmlFile(null)
    setPdfFile(null)
    
    if (onCancel) {
      onCancel()
    }
  }

  // Lưu preview data vào database
  const handleSave = async () => {
    if (!previewData) return

    setIsSaving(true)

    try {
      const result = await saveXMLPreview(previewData.tempFileId, previewData.previewData, invoiceType)
      
      if (result.code === 1) {
        toast.success('Lưu hóa đơn từ XML thành công!')
        setPreviewData(null)
        setXmlFile(null)
        setPdfFile(null)
        
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
      {/* Invoice Type Selection */}
      {!previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaFileInvoice className="h-5 w-5" />
              Loại Hóa Đơn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="auto"
                  name="invoiceType"
                  value="auto"
                  checked={invoiceType === 'auto'}
                  onChange={(e) => setInvoiceType(e.target.value as 'auto' | 'all_goods' | 'all_expenses')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="auto" className="text-sm font-medium">
                  Tự động phân loại (theo XML)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all_goods"
                  name="invoiceType"
                  value="all_goods"
                  checked={invoiceType === 'all_goods'}
                  onChange={(e) => setInvoiceType(e.target.value as 'auto' | 'all_goods' | 'all_expenses')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="all_goods" className="text-sm font-medium">
                  Tất cả là hàng hóa (HH)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all_expenses"
                  name="invoiceType"
                  value="all_expenses"
                  checked={invoiceType === 'all_expenses'}
                  onChange={(e) => setInvoiceType(e.target.value as 'auto' | 'all_goods' | 'all_expenses')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="all_expenses" className="text-sm font-medium">
                  Tất cả là chi phí (CP)
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Chọn "Tất cả là chi phí" cho hóa đơn xăng dầu hoặc các trường hợp đặc biệt
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Areas */}
      {!previewData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* XML/ZIP Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaUpload className="h-5 w-5" />
              File XML/ZIP Hóa Đơn <span className="text-red-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!xmlFile && (
              <div
                {...getXmlRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors min-h-[140px] flex items-center justify-center
                  ${isXmlDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  ${isUploading ? 'pointer-events-none opacity-50' : ''}
                `}
              >
              <input {...getXmlInputProps()} />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <FaSpinner className="h-8 w-8 text-blue-500 animate-spin" />
                  <p className="text-lg font-medium">Đang xử lý file XML...</p>
                  <p className="text-sm text-gray-500">Vui lòng đợi trong giây lát</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FaFileAlt className="h-10 w-10 text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">
                      {isXmlDragActive ? 'Thả file XML/ZIP vào đây...' : 'Kéo thả file XML/ZIP hoặc click để chọn'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Hỗ trợ file .xml, .zip (tối đa 100MB)
                    </p>
                  </div>
                </div>
              )}
              </div>
            )}

            {xmlFile && !previewData && (
              <div className="mt-3 p-2 bg-blue-50 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaFileAlt className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium">{xmlFile.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(xmlFile.size / 1024 / 1024).toFixed(1)} MB
                  </Badge>
                </div>
                <button
                  onClick={() => setXmlFile(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PDF Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaFilePdf className="h-5 w-5" />
              File PDF (Tùy chọn)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!pdfFile && (
              <div
                {...getPdfRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors min-h-[140px] flex items-center justify-center
                  ${isPdfDragActive ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
                  ${isUploading ? 'pointer-events-none opacity-50' : ''}
                `}
              >
              <input {...getPdfInputProps()} />

              <div className="flex flex-col items-center gap-3">
                <FaFilePdf className="h-10 w-10 text-gray-400" />
                <div>
                  <p className="text-lg font-medium">
                    {isPdfDragActive ? 'Thả file PDF vào đây...' : 'Kéo thả file PDF hoặc click để chọn'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Hỗ trợ file .pdf (tối đa 50MB)
                  </p>
                </div>
              </div>
              </div>
            )}

            {pdfFile && !previewData && (
              <div className="mt-3 p-2 bg-green-50 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaFilePdf className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-medium">{pdfFile.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                  </Badge>
                </div>
                <button
                  onClick={() => setPdfFile(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* Manual Upload Button */}
      {(xmlFile || pdfFile) && !previewData && !isUploading && (
        <div className="flex justify-center">
          <Button
            onClick={() => handleUpload(xmlFile!, pdfFile)}
            disabled={!xmlFile}
            className="px-8"
          >
            <FaUpload className="h-4 w-4 mr-2" />
            Xử lý và xem trước
          </Button>
        </div>
      )}

      {/* Preview Data */}
      {previewData && (
        <Card className="max-w-6xl mx-auto">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

              <div>
                <h4 className="font-semibold mb-2">Files</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <FaFileAlt className="h-4 w-4 text-blue-500" />
                    <span>XML: {previewData.xmlFileName || 'N/A'}</span>
                  </div>
                  {previewData.hasPdf && (
                    <div className="flex items-center gap-2">
                      <FaFilePdf className="h-4 w-4 text-red-500" />
                      <span>PDF: {previewData.pdfFileName || 'N/A'}</span>
                    </div>
                  )}
                  {previewData.fromZip && (
                    <div className="text-xs text-gray-500">📦 Từ file ZIP</div>
                  )}
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
