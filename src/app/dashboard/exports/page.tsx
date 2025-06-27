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
import { FaPlus, FaFilter } from "react-icons/fa"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "./columns"
import { format, startOfDay, endOfDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency, formatQuantity, formatPrice } from "@/lib/utils"
import { ExportForm } from "@/components/forms/ExportForm"

// Import các API đã tách
import { getExports, getExportById, createExport, updateExport, deleteExport, ExportInvoice, ExportFormData } from "@/lib/api/exports"

export default function ExportsPage() {
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [exports, setExports] = useState<ExportInvoice[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const [selectedExport, setSelectedExport] = useState<ExportInvoice | null>(null)
  const [selectedExports, setSelectedExports] = useState<ExportInvoice[]>([])
  const [error, setError] = useState<string | null>(null)

  // State cho bộ lọc nâng cao
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isFiltering, setIsFiltering] = useState(false)

  // Đặt tiêu đề khi trang được tải
  useEffect(() => {
    setTitle("Hóa đơn xuất kho")
  }, [setTitle])

  // Fetch data from API GET /exports
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

      // Đã bỏ lọc theo người mua

      // Sử dụng API đã tách với các tham số tìm kiếm
      const result = await getExports(searchParams)

      if (result && result.success) {
        const exportData = result.data.exports || [];
        setExports(exportData);

        // Hiển thị thông báo khi không tìm thấy kết quả
        if (exportData.length === 0 && (startDate || endDate)) {
          toast.info("Không tìm thấy hóa đơn nào phù hợp với bộ lọc", {
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          });
        }
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

  // Tải dữ liệu khi component được mount
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Sử dụng các hàm định dạng từ utils

  return (
    <div>
      <div className="mb-6">
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
                  const exportToDelete = exports.find(item => item.id === id);
                  if (exportToDelete) {
                    setSelectedExport(exportToDelete);
                    setIsDeleteModalOpen(true);
                  }
                },
                onDeleteMany: handleBatchDelete
              })}
              data={exports}
              searchColumn="invoice_number"
              searchPlaceholder="Tìm kiếm số hóa đơn..."
              onDeleteSelected={handleBatchDelete}
              actionButton={
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
                  </div>

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
                    <div className="overflow-hidden rounded-sm border max-w-full relative">
                      <ScrollArea className="w-full h-[400px] overflow-x-auto">
                        <div className="relative w-full min-w-[800px]">
                        <Table className="w-full min-w-[800px]">
                        <TableHeader className="bg-destructive rounded-t-sm sticky top-0 z-10">
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
  )
}
