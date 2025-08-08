"use client"

import React from "react"
import { usePageTitle } from "@/lib/page-title-context"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker"
import FinancialSummaryCards from "@/components/ui/FinancialSummaryCards"
import { FaPlus, FaFilter, FaFileUpload, FaSync } from "react-icons/fa"
import { DataTable } from "@/components/ui/data-table"
import { PDFViewer } from "@/components/ui/PDFViewer"
import { AttachmentUploadModal } from "@/components/ui/AttachmentUploadModal"
import { getColumns } from "./columns"
import { format, startOfDay, endOfDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency, formatQuantity, formatPrice } from "@/lib/utils"
import { ExportForm } from "@/components/forms/ExportForm"
import { ExportXMLUploadForm } from "@/components/forms/ExportXMLUploadForm"

// Import các API đã tách
import { getExports, getExportById, createExport, updateExport, deleteExport, ExportInvoice, ExportFormData } from "@/lib/api/exports"

export default function ExportsPage() {
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedExport, setSelectedExport] = useState<ExportInvoice | null>(null)
  const [selectedExports, setSelectedExports] = useState<ExportInvoice[]>([])
  const [error, setError] = useState<string | null>(null)

  // PDF Viewer state
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false)
  const [currentPDFUrl, setCurrentPDFUrl] = useState<string>("")
  const [currentPDFTitle, setCurrentPDFTitle] = useState<string>("")

  // Attachment Upload Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadModalConfig, setUploadModalConfig] = useState<{
    recordId: number
    fileType: 'pdf' | 'xml'
    currentFileName?: string
  } | null>(null)

  // State cho bộ lọc nâng cao
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isFiltering, setIsFiltering] = useState(false)

  // State cho frontend filtering
  const [allExports, setAllExports] = useState<ExportInvoice[]>([])
  const [filteredExports, setFilteredExports] = useState<ExportInvoice[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // State cho financial summary
  const [financialSummary, setFinancialSummary] = useState({
    totalBeforeTax: 0,
    totalTax: 0,
    totalAfterTax: 0
  })

  // Đặt tiêu đề khi trang được tải
  useEffect(() => {
    setTitle("Hóa đơn xuất kho")
  }, [setTitle])

  // Fetch data from API GET /exports - chỉ lấy tất cả dữ liệu một lần
  const fetchData = async () => {
    try {
      setIsFiltering(true)

      // Lấy tất cả dữ liệu không có filter để frontend xử lý
      const result = await getExports({})

      if (result && result.success) {
        const exportData = result.data.exports || [];
        setAllExports(exportData);
        setFilteredExports(exportData); // Khởi tạo filtered data
      } else {
        setError("Không thể tải dữ liệu hóa đơn xuất kho")
      }
    } catch (err) {
      console.error("Error fetching exports:", err)
      setError("Đã xảy ra lỗi khi tải dữ liệu")
    } finally {
      setIsFiltering(false)
    }
  }

  // Frontend filtering function
  const applyFilters = () => {
    let filtered = [...allExports]

    // Lọc theo ngày lập hóa đơn
    if (startDate || endDate) {
      filtered = filtered.filter(invoice => {
        if (!invoice.invoice_date) return false

        const invoiceDate = new Date(invoice.invoice_date)
        const start = startDate ? startOfDay(startDate) : null
        const end = endDate ? endOfDay(endDate) : null

        if (start && end) {
          return invoiceDate >= start && invoiceDate <= end
        } else if (start) {
          return invoiceDate >= start
        } else if (end) {
          return invoiceDate <= end
        }
        return true
      })
    }

    // Lọc theo tìm kiếm (số hóa đơn + tên người bán)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(invoice => {
        const invoiceNumber = invoice.invoice_number?.toLowerCase() || ''
        const supplierName = invoice.supplier?.name?.toLowerCase() || ''

        return invoiceNumber.includes(searchLower) || supplierName.includes(searchLower)
      })
    }

    setFilteredExports(filtered)

    // Tính toán tổng hợp tài chính từ dữ liệu đã lọc
    const financialSummary = {
      totalBeforeTax: filtered.reduce((sum, invoice) => sum + (invoice.total_before_tax || 0), 0),
      totalTax: filtered.reduce((sum, invoice) => sum + (invoice.total_tax || 0), 0),
      totalAfterTax: filtered.reduce((sum, invoice) => sum + (invoice.total_after_tax || 0), 0)
    }
    setFinancialSummary(financialSummary)
  }

  // Tải dữ liệu khi component được mount
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Áp dụng filter khi có thay đổi
  useEffect(() => {
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allExports, startDate, endDate, searchTerm])

  // Xử lý xóa hóa đơn
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedExport) return

    try {
      setIsDeleting(true)
      // Sử dụng API đã tách
      const result = await deleteExport(selectedExport.id)

      if (result && result.success) {
        toast.success("Xóa hóa đơn thành công", {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
        // Tải lại dữ liệu
        await fetchData()
        setIsDeleteModalOpen(false)
      } else {
        toast.error(result?.message || "Xóa hóa đơn thất bại", {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
    } catch (err) {
      console.error("Error deleting export:", err)
      toast.error("Đã xảy ra lỗi khi xóa hóa đơn", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Xử lý xóa nhiều hóa đơn
  const handleBatchDelete = async (selectedRows: ExportInvoice[]) => {
    if (!selectedRows.length) return

    setSelectedExports(selectedRows)
    setIsBatchDeleteModalOpen(true)
  }

  // Xử lý xóa nhiều hóa đơn
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  const confirmBatchDelete = async () => {
    if (!selectedExports.length) return

    try {
      setIsBatchDeleting(true)
      let successCount = 0
      let errorCount = 0

      // Xử lý từng hóa đơn
      for (const exportItem of selectedExports) {
        try {
          const result = await deleteExport(exportItem.id)
          if (result && result.success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (err) {
          console.error(`Error deleting export ${exportItem.id}:`, err)
          errorCount++
        }
      }

      // Hiển thị thông báo
      if (successCount > 0) {
        toast.success(`Đã xóa ${successCount} hóa đơn thành công`, {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
      if (errorCount > 0) {
        toast.error(`Có ${errorCount} hóa đơn xóa thất bại`, {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }

      // Tải lại dữ liệu
      await fetchData()
      setIsBatchDeleteModalOpen(false)
      setSelectedExports([])
    } catch (err) {
      console.error("Error batch deleting exports:", err)
      toast.error("Đã xảy ra lỗi khi xóa hóa đơn", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setIsBatchDeleting(false)
    }
  }

  // Xử lý xem chi tiết hóa đơn
  const handleViewDetails = async (id: number) => {
    try {
      // Sử dụng API đã tách
      const result = await getExportById(id)

      if (result && result.success) {
        setSelectedExport(result.data)
        setIsViewModalOpen(true)
      } else {
        setError("Không thể tải chi tiết hóa đơn")
      }
    } catch (err) {
      console.error("Error fetching export details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết hóa đơn")
    }
  }

  // Xử lý chỉnh sửa hóa đơn
  const handleEdit = async (id: number) => {
    try {
      // Sử dụng API đã tách
      const result = await getExportById(id)

      if (result && result.success) {
        setSelectedExport(result.data)
        setIsModalOpen(true)
      } else {
        setError("Không thể tải chi tiết hóa đơn")
      }
    } catch (err) {
      console.error("Error fetching export details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết hóa đơn")
    }
  }

  // Xử lý xem PDF
  const handleViewPdf = (invoice: ExportInvoice) => {
    if (!invoice.pdf_url) {
      toast.error("Không tìm thấy file PDF")
      return
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    // Giữ nguyên /api trong backendUrl vì backend serve static files qua /api/uploads
    const baseUrl = backendUrl || 'http://localhost:7010/api'
    const pdfUrl = `${baseUrl}/${invoice.pdf_url}`

    // Mở PDF trong PDFViewer component
    setCurrentPDFUrl(pdfUrl)
    setCurrentPDFTitle(`Hóa đơn ${invoice.invoice_number}`)
    setIsPDFViewerOpen(true)
  }

  // Xử lý tải XML
  const handleDownloadXml = async (invoice: ExportInvoice) => {
    if (!invoice.xml_url) {
      toast.error("Không tìm thấy file XML")
      return
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      // Giữ nguyên /api trong backendUrl vì backend serve static files qua /api/uploads
      const baseUrl = backendUrl || 'http://localhost:7010/api'
      const xmlUrl = `${baseUrl}/${invoice.xml_url}`

      // Fetch file và tạo blob để force download
      const response = await fetch(xmlUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      // Tạo anchor element để download
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice_${invoice.invoice_number}.xml`
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Tải file XML thành công!")
    } catch (error) {
      console.error("Error downloading XML:", error)
      toast.error("Lỗi khi tải file XML")
    }
  }

  // Xử lý upload PDF
  const handleUploadPdf = (invoice: ExportInvoice) => {
    setUploadModalConfig({
      recordId: invoice.id,
      fileType: 'pdf',
      currentFileName: invoice.pdf_url ? `Hóa đơn ${invoice.invoice_number}.pdf` : undefined
    })
    setIsUploadModalOpen(true)
  }

  // Xử lý upload XML
  const handleUploadXml = (invoice: ExportInvoice) => {
    setUploadModalConfig({
      recordId: invoice.id,
      fileType: 'xml',
      currentFileName: invoice.xml_url ? `Hóa đơn ${invoice.invoice_number}.xml` : undefined
    })
    setIsUploadModalOpen(true)
  }

  // Xử lý thành công upload
  const handleUploadSuccess = () => {
    // Refresh data để cập nhật UI
    fetchData()
    setIsUploadModalOpen(false)
    setUploadModalConfig(null)
  }

  // Sử dụng các hàm định dạng từ utils

  return (
    <div>
      <div className="mb-6">
        {/* Tổng hợp tài chính */}
        <FinancialSummaryCards summary={financialSummary} />

        {/* Bộ lọc thời gian */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1 max-w-60">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lọc theo ngày lập hóa đơn
                </label>
                <CustomDateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onRangeChange={(start, end) => {
                    setStartDate(start)
                    setEndDate(end)
                  }}
                  className="w-full"
                  placeholder="Chọn khoảng thời gian"
                />
              </div>

              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo số hóa đơn hoặc tên người bán..."
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate(undefined)
                  setEndDate(undefined)
                  setSearchTerm("")
                }}
                className="h-10"
              >
                <FaFilter className="mr-2 h-4 w-4" />
                Xóa bộ lọc
              </Button>

              <Button
                onClick={() => {
                  toast.info("Tính năng N8N Webhook cho Export đang được phát triển", {
                    description: "Vui lòng sử dụng tính năng tải hóa đơn thủ công",
                    duration: 5000
                  })
                }}
                variant="outline"
                className="h-10 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                disabled={isFiltering}
              >
                <FaSync className="mr-2 h-4 w-4" />
                Làm mới (Đang phát triển)
              </Button>

              <div className="text-sm bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                <span className="text-blue-600 font-medium">
                  {filteredExports.length} / {allExports.length} hóa đơn
                </span>
              </div>
            </div>
          </div>
        </div>

            {/* Hiển thị lỗi nếu có */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Hiển thị trạng thái đang tải */}
            {isFiltering && (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="ml-2 text-sm">Đang tải dữ liệu...</p>
              </div>
            )}

            {/* Bảng dữ liệu sử dụng DataTable */}
            <DataTable
              columns={getColumns({
                onView: handleViewDetails,
                onEdit: handleEdit,
                onDelete: (id) => {
                  const exportToDelete = filteredExports.find(item => item.id === id);
                  if (exportToDelete) {
                    setSelectedExport(exportToDelete);
                    setIsDeleteModalOpen(true);
                  }
                },
                onViewPdf: handleViewPdf,
                onDownloadXml: handleDownloadXml,
                onUploadPdf: handleUploadPdf,
                onUploadXml: handleUploadXml
              })}
              data={filteredExports}
              searchColumn=""
              searchPlaceholder=""
              onDeleteSelected={handleBatchDelete}
              actionButton={
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    variant="outline"
                    className="h-10 md:h-12 text-sm md:text-base border-green-600 text-green-600 hover:bg-green-50"
                    disabled={isFiltering}
                  >
                    <FaFileUpload className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                    Tải hóa đơn
                  </Button>

                  <Button
                    onClick={() => {
                      setSelectedExport(null)
                      setIsModalOpen(true)
                    }}
                    className="h-10 md:h-12 text-sm md:text-base"
                    disabled={isFiltering}
                  >
                    {isFiltering ? (
                      <>
                        <div className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <FaPlus className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                        Thêm hóa đơn
                      </>
                    )}
                  </Button>
                </div>
              }
            />
          </div>

        {/* Modal xóa hóa đơn */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Xác nhận xóa</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Bạn có chắc chắn muốn xóa hóa đơn xuất kho số {selectedExport?.invoice_number} không?
                  Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                >
                  {isDeleting ? (
                    <>
                      <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    "Xóa"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal xóa nhiều hóa đơn */}
          <Dialog open={isBatchDeleteModalOpen} onOpenChange={setIsBatchDeleteModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Xác nhận xóa hàng loạt</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Bạn có chắc chắn muốn xóa {selectedExports.length} hóa đơn xuất kho đã chọn không?
                  Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsBatchDeleteModalOpen(false)}
                  className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmBatchDelete}
                  disabled={isBatchDeleting}
                  className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                >
                  {isBatchDeleting ? (
                    <>
                      <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    `Xóa ${selectedExports.length} hóa đơn`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal xem chi tiết */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1800px] w-full p-2 md:p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Chi tiết hóa đơn xuất kho</DialogTitle>
              </DialogHeader>
              {selectedExport && (
                <div className="space-y-3 md:space-y-4 h-[70vh] overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Số hóa đơn:</p>
                      <p className="text-base md:text-xl">{selectedExport.invoice_number}</p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Ngày lập:</p>
                      <p className="text-base md:text-xl">{format(new Date(selectedExport.invoice_date), 'dd/MM/yyyy')}</p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Loại hóa đơn:</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedExport.invoice_type === 'CP' ? 'text-orange-600 bg-orange-100' :
                        selectedExport.invoice_type === 'HH' ? 'text-blue-600 bg-blue-100' :
                        selectedExport.invoice_type === 'HH/CP' ? 'text-purple-600 bg-purple-100' :
                        'text-gray-500 bg-gray-100'
                      }`}>
                        {selectedExport.invoice_type === 'CP' ? 'CP' :
                         selectedExport.invoice_type === 'HH' ? 'HH' :
                         selectedExport.invoice_type === 'HH/CP' ? 'HH/CP' :
                         'Chưa phân loại'}
                      </span>
                    </div>
                  </div>

                  {/* Thông tin người bán và người mua - hiển thị theo chiều ngang */}
                  {(selectedExport.supplier || selectedExport.customer) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                      {selectedExport.supplier && (
                        <div className="bg-gray-50 p-3 md:p-4 rounded-sm">
                          <h4 className="text-sm md:text-base font-bold text-gray-700 mb-2">Thông tin người bán</h4>
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <p className="text-sm md:text-base font-medium mr-2 min-w-[60px]">Tên:</p>
                              <p className="text-sm md:text-base">{selectedExport.supplier.name}</p>
                            </div>
                            {selectedExport.supplier.tax_code && (
                              <div className="flex items-center">
                                <p className="text-sm md:text-base font-medium mr-2 min-w-[60px]">MST:</p>
                                <p className="text-sm md:text-base">{selectedExport.supplier.tax_code}</p>
                              </div>
                            )}
                            {selectedExport.supplier.address && (
                              <div className="flex items-start">
                                <p className="text-sm md:text-base font-medium mr-2 min-w-[60px]">Địa chỉ:</p>
                                <p className="text-sm md:text-base">{selectedExport.supplier.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedExport.customer && (
                        <div className="bg-blue-50 p-3 md:p-4 rounded-sm">
                          <h4 className="text-sm md:text-base font-bold text-gray-700 mb-2">Thông tin người mua</h4>
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <p className="text-sm md:text-base font-medium mr-2 min-w-[60px]">Tên:</p>
                              <p className="text-sm md:text-base">{selectedExport.customer.name}</p>
                            </div>
                            {selectedExport.customer.tax_code && (
                              <div className="flex items-center">
                                <p className="text-sm md:text-base font-medium mr-2 min-w-[60px]">MST:</p>
                                <p className="text-sm md:text-base">{selectedExport.customer.tax_code}</p>
                              </div>
                            )}
                            {selectedExport.customer.address && (
                              <div className="flex items-start">
                                <p className="text-sm md:text-base font-medium mr-2 min-w-[60px]">Địa chỉ:</p>
                                <p className="text-sm md:text-base">{selectedExport.customer.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Thông tin tổng tiền */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Tổng tiền trước thuế:</p>
                      <p className="text-base md:text-xl font-bold">{formatCurrency(selectedExport.total_before_tax)}</p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Tổng thuế:</p>
                      <p className="text-base md:text-xl font-bold">{formatCurrency(selectedExport.total_tax)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Tổng tiền sau thuế:</p>
                      <p className="text-base md:text-xl font-bold">{formatCurrency(selectedExport.total_after_tax)}</p>
                    </div>
                    {selectedExport.description && (
                      <div className="flex items-center">
                        <p className="text-base md:text-xl font-bold mr-2">Mô tả:</p>
                        <p className="text-base md:text-xl">{selectedExport.description}</p>
                      </div>
                    )}
                  </div>

                  {selectedExport.note && (
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Ghi chú:</p>
                      <p className="text-base md:text-xl">{selectedExport.note}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg md:text-xl font-medium mb-2">Chi tiết hàng hóa</h3>
                    <div className="overflow-hidden rounded border max-w-full relative">
                      <ScrollArea className="w-full h-[400px] overflow-x-auto">
                        <div className="relative w-full min-w-[800px]">
                        <Table className="w-full min-w-[800px]">
                        <TableHeader className="bg-destructive rounded-t sticky top-0 z-10">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center w-[25%] min-w-[120px]">Tên hàng</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center hidden md:table-cell w-[6%]">Loại</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center w-[8%] min-w-[60px]">Đơn vị</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center w-[8%] min-w-[80px]">Số lượng</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center w-[10%] min-w-[100px]">Đơn giá</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center hidden md:table-cell w-[8%]">Thành tiền</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center hidden md:table-cell w-[7%]">Thuế suất</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center hidden lg:table-cell w-[8%]">Tiền thuế</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center w-[8%] min-w-[100px]">Tổng cộng</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedExport.details.map((detail: any, index: number) => (
                            <TableRow key={detail.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 break-words">{detail.item_name}</TableCell>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 text-center hidden md:table-cell">{detail.category}</TableCell>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 text-center">{detail.unit}</TableCell>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 text-center">{formatQuantity(detail.quantity)}</TableCell>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 text-right font-bold">{formatPrice(detail.price_before_tax)}</TableCell>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 text-right hidden md:table-cell font-bold">{formatCurrency(detail.total_before_tax)}</TableCell>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 text-center hidden md:table-cell font-bold">{detail.tax_rate}</TableCell>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 text-right hidden lg:table-cell font-bold">{formatCurrency(detail.tax_amount)}</TableCell>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 text-right font-bold">
                                {formatCurrency(
                                  // Tính lại tổng tiền sau thuế để đảm bảo nhất quán với backend
                                  (() => {
                                    // Tính tổng tiền trước thuế và làm tròn thành số nguyên (giống backend)
                                    const totalBeforeTax = Math.round(detail.total_before_tax || 0);

                                    // Tính thuế dựa trên tổng tiền trước thuế đã làm tròn (giống backend)
                                    let taxRate = 0;
                                    if (detail.tax_rate !== "KCT") {
                                      taxRate = Number(detail.tax_rate?.replace("%", "") || 0) / 100;
                                    }
                                    const taxAmount = Math.round(totalBeforeTax * taxRate);

                                    // Tính tổng tiền sau thuế bằng cách cộng tổng tiền trước thuế đã làm tròn và thuế đã làm tròn
                                    return totalBeforeTax + taxAmount;
                                  })()
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Đóng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal thêm/sửa hóa đơn */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1800px] w-full p-2 md:p-6 overflow-hidden">
              <DialogHeader className="hidden">
                <DialogTitle>
                  {selectedExport ? "Chỉnh sửa hóa đơn xuất kho" : "Thêm hóa đơn xuất kho"}
                </DialogTitle>
              </DialogHeader>

              {/* Import ExportForm component */}
              <div className="h-[75vh] overflow-y-auto pr-2">
                <ExportForm
                  mode={selectedExport ? "edit" : "add"}
                  initialData={selectedExport}
                  onSubmit={async (data: ExportFormData) => {
                    try {
                      if (selectedExport) {
                        // Chỉnh sửa hóa đơn
                        const result = await updateExport(selectedExport.id, data);
                        if (result && result.success) {
                          toast.success("Cập nhật hóa đơn thành công", {
                            className: "text-lg font-medium",
                            descriptionClassName: "text-base"
                          });

                          // Tải lại dữ liệu
                          await fetchData();
                          setIsModalOpen(false);
                        } else {
                          // Hiển thị thông báo lỗi cụ thể từ backend
                          if (result?.message && result.message.includes("tồn kho")) {
                            toast.error("Vượt quá số lượng tồn kho", {
                              description: result.message,
                              className: "text-lg font-medium",
                              descriptionClassName: "text-base"
                            });
                          } else {
                            toast.error(result?.message || "Cập nhật hóa đơn thất bại", {
                              className: "text-lg font-medium",
                              descriptionClassName: "text-base"
                            });
                          }
                        }
                      } else {
                        // Thêm hóa đơn mới
                        const result = await createExport(data);
                        if (result && result.success) {
                          toast.success("Thêm hóa đơn thành công", {
                            className: "text-lg font-medium",
                            descriptionClassName: "text-base"
                          });

                          // Tải lại dữ liệu
                          await fetchData();
                          setIsModalOpen(false);
                        } else {
                          // Hiển thị thông báo lỗi cụ thể từ backend
                          if (result?.message && result.message.includes("tồn kho")) {
                            toast.error("Vượt quá số lượng tồn kho", {
                              description: result.message,
                              className: "text-lg font-medium",
                              descriptionClassName: "text-base"
                            });
                          } else {
                            toast.error(result?.message || "Thêm hóa đơn thất bại", {
                              className: "text-lg font-medium",
                              descriptionClassName: "text-base"
                            });
                          }
                        }
                      }
                    } catch (err) {
                      console.error("Error saving export:", err);
                      toast.error("Đã xảy ra lỗi khi lưu hóa đơn", {
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                      });
                    }
                  }}
                  onCancel={() => {
                    setIsModalOpen(false);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal bộ lọc nâng cao */}
          <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Bộ lọc nâng cao</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Lọc hóa đơn xuất kho theo ngày lập hóa đơn
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm md:text-base font-medium">Từ ngày (ngày lập hóa đơn)</Label>
                  <DatePicker
                    date={startDate}
                    setDate={setStartDate}
                    className="w-full"
                    placeholder="Chọn ngày bắt đầu"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-sm md:text-base font-medium">Đến ngày (ngày lập hóa đơn)</Label>
                  <DatePicker
                    date={endDate}
                    setDate={setEndDate}
                    className="w-full"
                    placeholder="Chọn ngày kết thúc"
                  />
                </div>


              </div>

              <DialogFooter className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset bộ lọc
                    setStartDate(undefined);
                    setEndDate(undefined);
                    setSearchTerm("");
                    setIsFilterModalOpen(false);
                  }}
                >
                  Xóa bộ lọc
                </Button>
                <Button
                  onClick={() => {
                    fetchData();
                    setIsFilterModalOpen(false);
                  }}
                  disabled={isFiltering}
                >
                  {isFiltering ? (
                    <>
                      <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    "Áp dụng"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* PDF Viewer Modal */}
          <PDFViewer
            isOpen={isPDFViewerOpen}
            onClose={() => setIsPDFViewerOpen(false)}
            pdfUrl={currentPDFUrl}
            title={currentPDFTitle}
          />

          {/* Modal Upload Attachment */}
          {uploadModalConfig && (
            <AttachmentUploadModal
              isOpen={isUploadModalOpen}
              onClose={() => {
                setIsUploadModalOpen(false)
                setUploadModalConfig(null)
              }}
              onSuccess={handleUploadSuccess}
              recordId={uploadModalConfig.recordId}
              recordType="export"
              fileType={uploadModalConfig.fileType}
              currentFileName={uploadModalConfig.currentFileName}
            />
          )}

          {/* Modal Tải Hóa Đơn */}
          <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[1200px] w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">Tải Hóa Đơn</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <ExportXMLUploadForm
                  onSuccess={() => {
                    setShowUploadModal(false)
                    fetchData() // Refresh data
                    toast.success("Tải hóa đơn xuất thành công!")
                  }}
                  onCancel={() => setShowUploadModal(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
    </div>
  )
}
