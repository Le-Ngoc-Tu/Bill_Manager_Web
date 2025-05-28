"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/page-title-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { FaPlus, FaFilter } from "react-icons/fa"
import { ImportForm } from "@/components/forms/ImportForm"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "./columns"
import { format, startOfDay, endOfDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency, formatQuantity, formatPrice } from "@/lib/utils"

// Import các API đã tách
import { getImports, getImportById, createImport, updateImport, deleteImport, ImportInvoice } from "@/lib/api/imports"

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
  const isMobile = useIsMobile()
  const { user, loading } = useAuth()
  const router = useRouter()
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [imports, setImports] = useState<ImportInvoice[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const [selectedImport, setSelectedImport] = useState<ImportInvoice | null>(null)
  const [selectedImports, setSelectedImports] = useState<ImportInvoice[]>([])
  const [error, setError] = useState<string | null>(null)

  // State cho bộ lọc nâng cao
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isFiltering, setIsFiltering] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  // Đặt tiêu đề khi trang được tải
  useEffect(() => {
    setTitle("Hóa đơn nhập kho")
  }, [setTitle])

  // Fetch data from API GET /imports
  const fetchData = async (resetFilters = false) => {
    try {
      setIsFiltering(true)
      // Nếu resetFilters = true, đặt lại các bộ lọc
      if (resetFilters) {
        setStartDate(undefined)
        setEndDate(undefined)
      }

      // Tạo đối tượng chứa các tham số tìm kiếm
      const searchParams: Record<string, string> = {}

      // Chỉ thêm tham số nếu không phải là reset filters
      if (!resetFilters) {
        // Thêm tham số ngày bắt đầu nếu có
        if (startDate) {
          // Đảm bảo định dạng ngày chính xác và đặt giờ về 00:00:00
          const formattedStartDate = format(startOfDay(startDate), 'yyyy-MM-dd')
          searchParams.startDate = formattedStartDate
        }

        // Thêm tham số ngày kết thúc nếu có
        if (endDate) {
          // Đảm bảo định dạng ngày chính xác và đặt giờ về 23:59:59
          const formattedEndDate = format(endOfDay(endDate), 'yyyy-MM-dd')
          searchParams.endDate = formattedEndDate
        }
      }

      // Đã bỏ lọc theo người bán

      // Sử dụng API đã tách với các tham số tìm kiếm
      const result = await getImports(searchParams)

      if (result && result.success) {
        const importData = result.data.imports || [];
        setImports(importData);

        // Hiển thị thông báo khi không tìm thấy kết quả
        if (importData.length === 0 && (startDate || endDate)) {
          toast.info("Không tìm thấy hóa đơn nào phù hợp với bộ lọc", {
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          });
        }
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

  // Tải dữ liệu khi component được mount
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Sử dụng các hàm định dạng từ utils

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-lg">Đang chuyển hướng...</p>
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": isMobile ? "calc(var(--spacing) * 60)" : "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-2 sm:p-3 md:p-4 lg:p-6 overflow-x-hidden">
          <div className="mb-6">
            {/* Bỏ nút thêm hóa đơn ở đây vì đã được thêm vào DataTable */}

            {/* Hiển thị lỗi nếu có */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Bộ lọc nâng cao */}
            <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
              <Button
                variant="outline"
                onClick={() => setIsFilterModalOpen(true)}
                className="w-full sm:w-auto h-10 md:h-12 text-sm md:text-base"
              >
                <FaFilter className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                Lọc theo ngày
              </Button>

              {/* Hiển thị thông tin bộ lọc đang áp dụng */}
              {(startDate || endDate) && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span>Bộ lọc: </span>
                  {startDate && (
                    <Badge variant="outline" className="font-normal">
                      Ngày lập hóa đơn từ: {format(startDate, 'dd/MM/yyyy')}
                    </Badge>
                  )}
                  {endDate && (
                    <Badge variant="outline" className="font-normal">
                      Ngày lập hóa đơn đến: {format(endDate, 'dd/MM/yyyy')}
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Gọi fetchData với tham số resetFilters = true để xóa bộ lọc và tải lại tất cả dữ liệu
                      fetchData(true);
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              )}
            </div>

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
                  const importToDelete = imports.find(item => item.id === id);
                  if (importToDelete) {
                    setSelectedImport(importToDelete);
                    setIsDeleteModalOpen(true);
                  }
                },
                onDeleteMany: handleBatchDelete
              })}
              data={imports}
              searchColumn="invoice_number"
              searchPlaceholder="Tìm kiếm số hóa đơn..."
              onDeleteSelected={handleBatchDelete}
              actionButton={
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
                    {selectedImport.details && selectedImport.details.length > 0 && selectedImport.details[0].seller_name && (
                      <div className="flex flex-col sm:col-span-2">
                        <div className="flex items-center">
                          <p className="text-base md:text-xl font-bold mr-2">Người bán:</p>
                          <p className="text-base md:text-xl">{selectedImport.details[0].seller_name}</p>
                        </div>
                        {selectedImport.details[0].seller_tax_code && (
                          <div className="flex items-center mt-1">
                            <p className="text-base md:text-xl font-bold mr-2">Mã số thuế:</p>
                            <p className="text-base md:text-xl">{selectedImport.details[0].seller_tax_code}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg md:text-xl font-medium mb-2">Chi tiết hàng hóa</h3>
                    <div className="overflow-hidden rounded-sm border max-w-full relative">
                      <ScrollArea className="w-full h-[400px] overflow-x-auto">
                        <div className="relative w-full min-w-[800px]">
                        <Table className="w-full min-w-[800px]">
                        <TableHeader className="bg-destructive rounded-t-sm sticky top-0 z-10">
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

          {/* Modal bộ lọc nâng cao */}
          <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Bộ lọc nâng cao</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Lọc hóa đơn nhập kho theo ngày lập hóa đơn
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
                    // Gọi fetchData với tham số resetFilters = true để xóa bộ lọc và tải lại tất cả dữ liệu
                    fetchData(true);
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
