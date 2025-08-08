"use client"

import React from "react"
import { usePageTitle } from "@/lib/page-title-context"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker"
import FinancialSummaryCards from "@/components/ui/FinancialSummaryCards"
import { FaPlus, FaFilter, FaSync, FaFileUpload } from "react-icons/fa"
import { ImportForm } from "@/components/forms/ImportForm"
import { XMLUploadForm } from "@/components/forms/XMLUploadForm"
import { DataTable } from "@/components/ui/data-table"
import { PDFViewer } from "@/components/ui/PDFViewer"
import { AttachmentUploadModal } from "@/components/ui/AttachmentUploadModal"
import { getColumns } from "./columns"
import { format, startOfDay, endOfDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency, formatQuantity, formatPrice } from "@/lib/utils"

// Import các API đã tách
import { getImports, getImportById, createImport, updateImport, deleteImport, ImportInvoice } from "@/lib/api/imports"

// Import n8n webhook service
import {
  syncInvoicesFromN8n,
  N8nWebhookError,
  N8nNetworkError,
  getAvailableCompanies,
  formatWebhookResult
} from "@/lib/api/n8n-webhook"

// These interfaces will be used in the future implementation of the add/edit form
/*
interface Supplier {
  id: number
  name: string
  tax_code?: string
  address?: string
  phone?: string
  email?: string
}

interface Inventory {
  id: number
  item_name: string
  unit: string
  quantity: number
  category: "HH" | "CP"
}
*/

export default function ImportsPage() {
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const [isXMLUploadModalOpen, setIsXMLUploadModalOpen] = useState(false)

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
  const [selectedImport, setSelectedImport] = useState<ImportInvoice | null>(null)
  const [selectedImports, setSelectedImports] = useState<ImportInvoice[]>([])
  const [error, setError] = useState<string | null>(null)

  // State cho date filtering
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isFiltering, setIsFiltering] = useState(false)

  // State cho frontend filtering
  const [allImports, setAllImports] = useState<ImportInvoice[]>([])
  const [filteredImports, setFilteredImports] = useState<ImportInvoice[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all")
  const [selectedCompany, setSelectedCompany] = useState<'nang_vang' | 'nguyen_luan'>('nang_vang')

  // State cho financial summary
  const [financialSummary, setFinancialSummary] = useState({
    totalBeforeTax: 0,
    totalTax: 0,
    totalAfterTax: 0
  })

  // State cho n8n sync functionality
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStartDate, setSyncStartDate] = useState<Date | undefined>(() => {
    const today = new Date()
    return startOfDay(today)
  })
  const [syncEndDate, setSyncEndDate] = useState<Date | undefined>(() => {
    const today = new Date()
    return endOfDay(today)
  })

  // Đặt tiêu đề khi trang được tải
  useEffect(() => {
    setTitle("Hóa đơn nhập kho")
  }, [setTitle])

  // Fetch data from API GET /imports - chỉ lấy tất cả dữ liệu một lần
  const fetchData = async () => {
    try {
      setIsFiltering(true)

      // Lấy tất cả dữ liệu không có filter để frontend xử lý
      const result = await getImports({})

      if (result && result.success) {
        const importData = result.data.imports || [];
        setAllImports(importData);
        setFilteredImports(importData); // Khởi tạo filtered data
      } else {
        setError("Không thể tải dữ liệu hóa đơn nhập kho")
      }
    } catch (err) {
      console.error("Error fetching imports:", err)
      setError("Đã xảy ra lỗi khi tải dữ liệu")
    } finally {
      setIsFiltering(false)
    }
  }

  // Lấy danh sách suppliers unique từ allImports
  const getUniqueSuppliers = () => {
    const suppliersMap = new Map()

    allImports.forEach(invoice => {
      if (invoice.supplier && invoice.supplier_id) {
        suppliersMap.set(invoice.supplier_id, {
          id: invoice.supplier_id,
          name: invoice.supplier.name,
          tax_code: invoice.supplier.tax_code
        })
      }
    })

    return Array.from(suppliersMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  // Frontend filtering function
  const applyFilters = () => {
    let filtered = [...allImports]

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

    // Lọc theo supplier (công ty chính/người mua)
    if (selectedSupplierId !== "all") {
      filtered = filtered.filter(invoice => {
        return invoice.supplier_id?.toString() === selectedSupplierId
      })
    }

    // Lọc theo tìm kiếm (số hóa đơn + tên người bán + tên người mua)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(invoice => {
        const invoiceNumber = invoice.invoice_number?.toLowerCase() || ''
        const supplierName = invoice.supplier?.name?.toLowerCase() || '' // Người mua (công ty chính)
        const customerName = invoice.customer?.name?.toLowerCase() || '' // Người bán (đối tác)

        return invoiceNumber.includes(searchLower) ||
               supplierName.includes(searchLower) ||
               customerName.includes(searchLower)
      })
    }

    setFilteredImports(filtered)

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
  }, [allImports, startDate, endDate, searchTerm, selectedSupplierId])

  // Xử lý xóa hóa đơn
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedImport) return

    try {
      setIsDeleting(true)
      // Sử dụng API đã tách
      const result = await deleteImport(selectedImport.id)

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
      console.error("Error deleting import:", err)
      toast.error("Đã xảy ra lỗi khi xóa hóa đơn", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Xử lý xóa nhiều hóa đơn
  const handleBatchDelete = async (selectedRows: ImportInvoice[]) => {
    try {
      setSelectedImports(selectedRows)
      setIsBatchDeleteModalOpen(true)
    } catch (err) {
      console.error("Error preparing batch delete:", err)
      toast.error("Đã xảy ra lỗi", {
        description: "Đã xảy ra lỗi khi chuẩn bị xóa hàng loạt"
      })
    }
  }

  // Xử lý xóa nhiều hóa đơn
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  const confirmBatchDelete = async () => {
    if (!selectedImports.length) return

    try {
      setIsBatchDeleting(true)
      let successCount = 0
      let errorCount = 0

      // Xử lý từng hóa đơn
      for (const importItem of selectedImports) {
        try {
          const result = await deleteImport(importItem.id)
          if (result && result.success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (err) {
          console.error(`Error deleting import ${importItem.id}:`, err)
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
      setSelectedImports([])
    } catch (err) {
      console.error("Error batch deleting imports:", err)
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
      const result = await getImportById(id)

      if (result && result.success) {
        setSelectedImport(result.data)
        setIsViewModalOpen(true)
      } else {
        setError("Không thể tải chi tiết hóa đơn")
      }
    } catch (err) {
      console.error("Error fetching import details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết hóa đơn")
    }
  }

  // Xử lý chỉnh sửa hóa đơn
  const handleEdit = async (id: number) => {
    try {
      // Sử dụng API đã tách
      const result = await getImportById(id)

      if (result && result.success) {
        setSelectedImport(result.data)
        setIsModalOpen(true)
      } else {
        setError("Không thể tải chi tiết hóa đơn")
      }
    } catch (err) {
      console.error("Error fetching import details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết hóa đơn")
    }
  }

  // Xử lý xem PDF
  const handleViewPdf = (invoice: ImportInvoice) => {
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
  const handleDownloadXml = async (invoice: ImportInvoice) => {
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
  const handleUploadPdf = (invoice: ImportInvoice) => {
    setUploadModalConfig({
      recordId: invoice.id,
      fileType: 'pdf',
      currentFileName: invoice.pdf_url ? `Hóa đơn ${invoice.invoice_number}.pdf` : undefined
    })
    setIsUploadModalOpen(true)
  }

  // Xử lý upload XML
  const handleUploadXml = (invoice: ImportInvoice) => {
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

  // Xử lý sync hóa đơn từ n8n
  const handleSyncFromN8n = async () => {
    // Kiểm tra nếu có một trong hai date nhưng không có cả hai
    const hasStartDate = syncStartDate !== undefined && syncStartDate !== null
    const hasEndDate = syncEndDate !== undefined && syncEndDate !== null

    if ((hasStartDate && !hasEndDate) || (!hasStartDate && hasEndDate)) {
      toast.error("Vui lòng chọn cả ngày bắt đầu và ngày kết thúc, hoặc chọn 'Tất cả' để đồng bộ tất cả hóa đơn", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
      return
    }

    // Check cooldown to prevent spam
    if (!canSync()) {
      const remainingTime = Math.ceil((SYNC_COOLDOWN - (Date.now() - lastSyncTime)) / 1000)
      toast.warning(`Vui lòng đợi ${remainingTime} giây trước khi đồng bộ lại`, {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
      return
    }

    // Xác định xem có phải sync all hay không
    const isSyncAll = !hasStartDate && !hasEndDate

    // Confirmation dialog for large date ranges (chỉ khi có date range)
    if (!isSyncAll) {
      const daysDiff = Math.ceil((syncEndDate!.getTime() - syncStartDate!.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 30) {
        const confirmed = window.confirm(
          `Bạn đang đồng bộ ${daysDiff} ngày dữ liệu. Quá trình này có thể mất từ vài phút đến vài chục phút tùy theo số lượng hóa đơn. Vui lòng không đóng trang trong quá trình xử lý. Bạn có chắc chắn muốn tiếp tục?`
        )
        if (!confirmed) return
      }
    } else {
      // Confirmation cho sync all
      const confirmed = window.confirm(
        `Bạn đang đồng bộ TẤT CẢ hóa đơn từ email. Quá trình này có thể mất rất lâu tùy theo số lượng hóa đơn trong email. Vui lòng không đóng trang trong quá trình xử lý. Bạn có chắc chắn muốn tiếp tục?`
      )
      if (!confirmed) return
    }

    try {
      setIsSyncing(true)
      setLastSyncTime(Date.now())

      // Get company name for display
      const companyName = getAvailableCompanies().find(c => c.value === selectedCompany)?.label || selectedCompany

      let startDateStr: string | undefined
      let endDateStr: string | undefined
      let logMessage: string
      let toastMessage: string

      if (isSyncAll) {
        logMessage = 'Syncing all invoices from email'
        toastMessage = `Bắt đầu đồng bộ TẤT CẢ hóa đơn ${companyName} từ email...`
      } else {
        startDateStr = format(syncStartDate!, 'yyyy-MM-dd')
        endDateStr = format(syncEndDate!, 'yyyy-MM-dd')
        logMessage = `Syncing invoices from ${startDateStr} to ${endDateStr}`
        toastMessage = `Bắt đầu đồng bộ hóa đơn ${companyName} từ ${startDateStr} đến ${endDateStr}...`
      }

      console.log(logMessage)

      // Show initial progress toast with timeout warning
      toast.info(toastMessage, {
        description: "Quá trình có thể mất vài phút đối với khoảng thời gian lớn. Vui lòng đợi...",
        className: "text-lg font-medium",
        descriptionClassName: "text-base",
        duration: 5000
      })

      const result = await syncInvoicesFromN8n(startDateStr, endDateStr, selectedCompany)

      // Sử dụng formatWebhookResult để hiển thị kết quả chi tiết
      const resultMessage = formatWebhookResult(result, !isSyncAll)
      toast.success(`Đồng bộ hóa đơn ${companyName} thành công!`, {
        description: resultMessage,
        className: "text-lg font-medium",
        descriptionClassName: "text-base",
        duration: 5000
      })

      // Refresh data và đóng modal
      console.log('Refreshing imports data after successful sync...')
      await fetchData()

      // Đóng modal ngay lập tức
      setIsSyncModalOpen(false)

    } catch (error) {
      console.error('Error syncing from n8n:', error)

      let errorMessage = 'Đã xảy ra lỗi khi đồng bộ hóa đơn'
      let errorDetails = ''

      if (error instanceof N8nWebhookError) {
        errorMessage = `Lỗi webhook: ${error.message}`
        if (error.statusCode) {
          errorDetails = `Mã lỗi: ${error.statusCode}`
        }
      } else if (error instanceof N8nNetworkError) {
        errorMessage = `Lỗi kết nối: ${error.message}`
        errorDetails = 'Vui lòng kiểm tra kết nối mạng và thử lại'
      }

      toast.error(errorMessage, {
        description: errorDetails,
        className: "text-lg font-medium",
        descriptionClassName: "text-base",
        duration: 10000
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Reset sync modal state
  const resetSyncModal = () => {
    const today = new Date()
    setSyncStartDate(startOfDay(today))
    setSyncEndDate(endOfDay(today))
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC to close sync modal
      if (event.key === 'Escape' && isSyncModalOpen && !isSyncing) {
        setIsSyncModalOpen(false)
      }

      // Ctrl+R to open sync modal (prevent default browser refresh)
      if (event.ctrlKey && event.key === 'r' && !isSyncModalOpen && !isFiltering) {
        event.preventDefault()
        resetSyncModal()
        setIsSyncModalOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSyncModalOpen, isSyncing, isFiltering])

  // Prevent multiple rapid sync attempts
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)
  const SYNC_COOLDOWN = 5000 // 5 seconds

  const canSync = () => {
    const now = Date.now()
    return now - lastSyncTime > SYNC_COOLDOWN
  }

  // Sử dụng các hàm định dạng từ utils

  // Add CSS override for dropdown z-index in modal
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'modal-dropdown-override'
    style.textContent = `
      [role="dialog"] .z-\\[1000\\] {
        z-index: 9999 !important;
      }
    `

    // Only add if not already exists
    if (!document.getElementById('modal-dropdown-override')) {
      document.head.appendChild(style)
    }

    return () => {
      const existingStyle = document.getElementById('modal-dropdown-override')
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

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

              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Công ty chính
                </label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Chọn công ty chính" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả công ty</SelectItem>
                    {getUniqueSuppliers().map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name} {supplier.tax_code ? `(${supplier.tax_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo số hóa đơn, tên người bán hoặc tên công ty..."
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
                  setSelectedSupplierId("all")
                }}
                className="h-10"
              >
                <FaFilter className="mr-2 h-4 w-4" />
                Xóa bộ lọc
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  resetSyncModal()
                  setIsSyncModalOpen(true)
                }}
                className="h-10 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                disabled={isFiltering || isSyncing}
              >
                <FaSync className="mr-2 h-4 w-4" />
                Làm mới hóa đơn
              </Button>

              <div className="text-sm bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                <span className="text-blue-600 font-medium">
                  {filteredImports.length} / {allImports.length} hóa đơn
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
                  const importToDelete = filteredImports.find(item => item.id === id);
                  if (importToDelete) {
                    setSelectedImport(importToDelete);
                    setIsDeleteModalOpen(true);
                  }
                },
                onViewPdf: handleViewPdf,
                onDownloadXml: handleDownloadXml,
                onUploadPdf: handleUploadPdf,
                onUploadXml: handleUploadXml,
                onDeleteMany: handleBatchDelete
              })}
              data={filteredImports}
              searchColumn=""
              searchPlaceholder=""
              onDeleteSelected={handleBatchDelete}
              actionButton={
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsXMLUploadModalOpen(true)}
                    variant="outline"
                    className="h-10 md:h-12 text-sm md:text-base border-green-600 text-green-600 hover:bg-green-50"
                    disabled={isFiltering}
                  >
                    <FaFileUpload className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                    Tải Hóa Đơn
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedImport(null)
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

            {/* Phân trang đã được xử lý bởi DataTable */}
          </div>

        {/* Modal xác nhận xóa */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Xác nhận xóa</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Bạn có chắc chắn muốn xóa hóa đơn nhập kho số {selectedImport?.invoice_number} không?
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

          {/* Modal xác nhận xóa hàng loạt */}
          <Dialog open={isBatchDeleteModalOpen} onOpenChange={setIsBatchDeleteModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Xác nhận xóa hàng loạt</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Bạn có chắc chắn muốn xóa {selectedImports.length} hóa đơn nhập kho đã chọn không?
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
                    `Xóa ${selectedImports.length} hóa đơn`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal xem chi tiết */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1800px] w-full p-6 md:p-8 lg:p-10 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="hidden">
                <DialogTitle>Chi tiết hóa đơn nhập kho</DialogTitle>
              </DialogHeader>
              {selectedImport && (
                <div className="space-y-4 md:space-y-6 pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Số hóa đơn:</p>
                      <p className="text-base md:text-xl">{selectedImport.invoice_number}</p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Ngày hóa đơn:</p>
                      <p className="text-base md:text-xl">{format(new Date(selectedImport.invoice_date), 'dd/MM/yyyy')}</p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-base md:text-xl font-bold mr-2">Loại hóa đơn:</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedImport.invoice_type === 'CP' ? 'text-orange-600 bg-orange-100' :
                        selectedImport.invoice_type === 'HH' ? 'text-blue-600 bg-blue-100' :
                        selectedImport.invoice_type === 'HH/CP' ? 'text-purple-600 bg-purple-100' :
                        'text-gray-500 bg-gray-100'
                      }`}>
                        {selectedImport.invoice_type === 'CP' ? 'CP' :
                         selectedImport.invoice_type === 'HH' ? 'HH' :
                         selectedImport.invoice_type === 'HH/CP' ? 'HH/CP' :
                         'Chưa phân loại'}
                      </span>
                    </div>
                  </div>

                  {/* Thông tin người bán và người mua - hiển thị theo chiều ngang */}
                  {(selectedImport.supplier || selectedImport.customer) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                      {selectedImport.customer && (
                        <div className="bg-gray-50 p-4 rounded-sm">
                          <h4 className="text-sm md:text-base font-bold text-gray-700 mb-2">Thông tin người bán</h4>
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <p className="text-sm md:text-base font-medium mr-2 min-w-[80px]">Tên:</p>
                              <p className="text-sm md:text-base">{selectedImport.customer.name}</p>
                            </div>
                            {selectedImport.customer.tax_code && (
                              <div className="flex items-center">
                                <p className="text-sm md:text-base font-medium mr-2 min-w-[80px]">MST:</p>
                                <p className="text-sm md:text-base">{selectedImport.customer.tax_code}</p>
                              </div>
                            )}
                            {selectedImport.customer.address && (
                              <div className="flex items-start">
                                <p className="text-sm md:text-base font-medium mr-2 min-w-[80px]">Địa chỉ:</p>
                                <p className="text-sm md:text-base">{selectedImport.customer.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedImport.supplier && (
                        <div className="bg-blue-50 p-4 rounded-sm">
                          <h4 className="text-sm md:text-base font-bold text-gray-700 mb-2">Thông tin người mua</h4>
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <p className="text-sm md:text-base font-medium mr-2 min-w-[80px]">Tên:</p>
                              <p className="text-sm md:text-base">{selectedImport.supplier.name}</p>
                            </div>
                            {selectedImport.supplier.tax_code && (
                              <div className="flex items-center">
                                <p className="text-sm md:text-base font-medium mr-2 min-w-[80px]">MST:</p>
                                <p className="text-sm md:text-base">{selectedImport.supplier.tax_code}</p>
                              </div>
                            )}
                            {selectedImport.supplier.address && (
                              <div className="flex items-start">
                                <p className="text-sm md:text-base font-medium mr-2 min-w-[80px]">Địa chỉ:</p>
                                <p className="text-sm md:text-base">{selectedImport.supplier.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  </div>

                  <div>
                    <h3 className="text-lg md:text-xl font-medium mb-2">Chi tiết hàng hóa</h3>
                    <div className="overflow-hidden rounded border max-w-full relative">
                      <ScrollArea className="w-full h-[400px] overflow-x-auto">
                        <div className="relative w-full min-w-[800px]">
                        <Table className="w-full min-w-[800px]">
                        <TableHeader className="bg-destructive rounded-t sticky top-0 z-10">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center w-[30%] min-w-[150px]">Tên hàng</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center hidden md:table-cell w-[8%]">Loại</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center hidden md:table-cell w-[8%]">Đơn vị</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center w-[10%] min-w-[80px]">Số lượng</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center w-[12%] min-w-[100px]">Đơn giá</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center hidden md:table-cell w-[12%]">Thành tiền</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center hidden md:table-cell w-[8%]">Thuế suất</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center hidden lg:table-cell w-[10%]">Tiền thuế</TableHead>
                            <TableHead className="text-white font-bold text-sm md:text-base py-2 md:py-3 text-center w-[12%] min-w-[120px]">Tổng cộng</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedImport.details.map((detail: any, index: number) => (
                            <TableRow key={detail.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <TableCell className="text-sm md:text-base py-2 md:py-3 break-words">{detail.item_name}</TableCell>
                              <TableCell className="hidden md:table-cell text-sm md:text-base py-2 md:py-3 text-center">{detail.category === 'HH' ? 'Hàng hóa' : 'Chi phí'}</TableCell>
                              <TableCell className="hidden md:table-cell text-sm md:text-base py-2 md:py-3 text-center">{detail.unit}</TableCell>
                              <TableCell className="text-center text-sm md:text-base py-2 md:py-3">{formatQuantity(detail.quantity)}</TableCell>
                              <TableCell className="text-center text-sm md:text-base py-2 md:py-3 font-bold">{formatPrice(detail.price_before_tax)}</TableCell>
                              <TableCell className="text-center hidden md:table-cell text-sm md:text-base py-2 md:py-3 font-bold">{formatCurrency(detail.total_before_tax || 0)}</TableCell>
                              <TableCell className="text-center hidden md:table-cell text-sm md:text-base py-2 md:py-3 font-bold">{detail.tax_rate === "KCT" ? "KCT" : detail.tax_rate}</TableCell>
                              <TableCell className="text-center hidden lg:table-cell text-sm md:text-base py-2 md:py-3 font-bold">{formatCurrency(detail.tax_amount || 0)}</TableCell>
                              <TableCell className="text-center text-sm md:text-base py-2 md:py-3 font-bold">
                                {formatCurrency(detail.total_after_tax || 0)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Đã bỏ phân trang vì đã có ScrollArea */}
                  </div>

                  <div className="flex justify-between items-center pt-6 md:pt-8 border-t mt-6">
                    <div></div>
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium mr-6 md:mr-10 text-sm md:text-base">Tổng tiền hàng:</span>
                        <span className="text-sm md:text-base font-bold">{formatCurrency(selectedImport.total_before_tax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium mr-6 md:mr-10 text-sm md:text-base">Tổng tiền thuế:</span>
                        <span className="text-sm md:text-base font-bold">{formatCurrency(selectedImport.total_tax)}</span>
                      </div>
                      <div className="flex justify-between text-lg md:text-xl font-bold pt-2 border-t">
                        <span className="mr-6 md:mr-10">Tổng thanh toán:</span>
                        <span>{formatCurrency(selectedImport.total_after_tax)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="mt-6 pt-4 border-t">
                <Button
                  onClick={() => setIsViewModalOpen(false)}
                  className="h-10 md:h-12 px-6 md:px-10 text-sm md:text-base w-full sm:w-auto"
                >
                  Đóng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal thêm/sửa hóa đơn */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1800px] w-full p-6 md:p-8 lg:p-10 max-h-[90vh] h-auto overflow-y-auto">
              <DialogHeader className="hidden">
                <DialogTitle>{selectedImport ? 'Chỉnh sửa hóa đơn nhập kho' : 'Thêm hóa đơn nhập kho mới'}</DialogTitle>
              </DialogHeader>
              <div className="pr-2">
                <ImportForm
                mode={selectedImport ? "edit" : "add"}
                initialData={selectedImport}
                onSubmit={async (data: any) => {
                  try {
                    // Sử dụng API đã tách
                    let result;

                    if (selectedImport) {
                      // Cập nhật hóa đơn
                      console.log("Data being sent for update:", data);

                      // Đảm bảo trường note được gửi đúng cách
                      // Tạo một bản sao của dữ liệu và đặt trường note rõ ràng
                      const updatedData = {
                        ...data,
                        note: data.note === undefined || data.note === null ? "" : data.note
                      };

                      console.log("Modified data for update:", updatedData);
                      result = await updateImport(selectedImport.id, updatedData);
                    } else {
                      // Tạo hóa đơn mới
                      console.log("Data being sent for create:", data);

                      // Đảm bảo trường note được gửi đúng cách
                      // Tạo một bản sao của dữ liệu và đặt trường note rõ ràng
                      const createData = {
                        ...data,
                        note: data.note === undefined || data.note === null ? "" : data.note
                      };

                      console.log("Modified data for create:", createData);
                      result = await createImport(createData);
                    }

                    if (result && result.success) {
                      // Tải lại dữ liệu
                      await fetchData();

                      setIsModalOpen(false);

                      // Hiển thị thông báo thành công
                      const action = selectedImport ? "Cập nhật" : "Thêm mới";
                      toast.success(`${action} hóa đơn thành công`, {
                        description: `Đã ${action.toLowerCase()} hóa đơn ${data.invoice_number}`,
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                      });
                    } else {
                      setError("Không thể lưu hóa đơn");
                      toast.error("Không thể lưu hóa đơn", {
                        description: result?.message || "Vui lòng kiểm tra lại thông tin",
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                      });
                    }
                  } catch (err) {
                    console.error("Error saving import:", err);
                    setError("Đã xảy ra lỗi khi lưu hóa đơn");
                    toast.error("Đã xảy ra lỗi", {
                      description: "Đã xảy ra lỗi khi lưu hóa đơn",
                      className: "text-lg font-medium",
                      descriptionClassName: "text-base"
                    });
                  }
                }}
                onCancel={() => setIsModalOpen(false)}
              />
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal đồng bộ hóa đơn từ n8n */}
          <Dialog open={isSyncModalOpen} onOpenChange={(open) => {
            if (!isSyncing) {
              setIsSyncModalOpen(open)
            }
          }}>
            <DialogContent
              className="max-w-2xl min-h-fit max-h-[95vh] overflow-visible"
              style={{
                height: 'auto',
                maxHeight: '95vh',
                zIndex: 50
              }}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FaSync className="h-5 w-5 text-green-600" />
                  Làm mới hóa đơn từ hệ thống
                </DialogTitle>
                <DialogDescription>
                  Đồng bộ hóa đơn mới từ hệ thống n8n trong khoảng thời gian được chọn, hoặc chọn "Tất cả" để đồng bộ tất cả hóa đơn từ email
                  <br />
                  <span className="text-xs text-gray-500">
                    Phím tắt: Ctrl+R để mở, ESC để đóng
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 overflow-visible">
                {/* Date Range Picker */}
                <div className="relative" style={{ zIndex: 9999 }}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn khoảng thời gian đồng bộ (hoặc "Tất cả" để đồng bộ tất cả hóa đơn)
                  </label>
                  <div className="relative">
                    <CustomDateRangePicker
                      startDate={syncStartDate}
                      endDate={syncEndDate}
                      onStartDateChange={setSyncStartDate}
                      onEndDateChange={setSyncEndDate}
                      onRangeChange={(start, end) => {
                        setSyncStartDate(start)
                        setSyncEndDate(end)
                      }}
                      onSyncAll={() => {
                        // Clear dates để đồng bộ tất cả
                        setSyncStartDate(undefined)
                        setSyncEndDate(undefined)
                      }}
                      className="w-full"
                      placeholder="Chọn khoảng thời gian"
                    />
                  </div>

                  {/* Ghi chú khi chọn "Tất cả" */}
                  {!syncStartDate && !syncEndDate && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-orange-800">
                            Đồng bộ tất cả hóa đơn
                          </h3>
                          <div className="mt-1 text-sm text-orange-700">
                            Bạn đã chọn đồng bộ tất cả hóa đơn từ email. Bộ lọc thời gian sẽ được bỏ qua và hệ thống sẽ gửi yêu cầu với body rỗng để xử lý tất cả hóa đơn có sẵn.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Company Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn công ty
                  </label>
                  <Select value={selectedCompany} onValueChange={(value) => setSelectedCompany(value as 'nang_vang' | 'nguyen_luan')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn công ty" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCompanies().map((company) => (
                        <SelectItem key={company.value} value={company.value}>
                          {company.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsSyncModalOpen(false)}
                  disabled={isSyncing}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSyncFromN8n}
                  disabled={isSyncing || !canSync() || ((!!syncStartDate && !syncEndDate) || (!syncStartDate && !!syncEndDate))}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  title={!canSync() ? `Đợi ${Math.ceil((SYNC_COOLDOWN - (Date.now() - lastSyncTime)) / 1000)} giây` : ''}
                >
                  {isSyncing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang đồng bộ...
                    </>
                  ) : !canSync() ? (
                    <>
                      <FaSync className="mr-2 h-4 w-4" />
                      Đợi {Math.ceil((SYNC_COOLDOWN - (Date.now() - lastSyncTime)) / 1000)}s
                    </>
                  ) : (
                    <>
                      <FaSync className="mr-2 h-4 w-4" />
                      Bắt đầu đồng bộ
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal Tải Hóa Đơn */}
          <Dialog open={isXMLUploadModalOpen} onOpenChange={setIsXMLUploadModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[1200px] w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">Tải Hóa Đơn</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <XMLUploadForm
                  onSuccess={() => {
                    setIsXMLUploadModalOpen(false)
                    fetchData() // Refresh data after successful upload
                    toast.success('Tải hóa đơn thành công!')
                  }}
                  onCancel={() => setIsXMLUploadModalOpen(false)}
                />
              </div>
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
              recordType="import"
              fileType={uploadModalConfig.fileType}
              currentFileName={uploadModalConfig.currentFileName}
            />
          )}

    </div>
  )
}
