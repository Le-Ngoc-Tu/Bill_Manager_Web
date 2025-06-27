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
import { FaFilter } from "react-icons/fa"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "./columns"
import { format, startOfDay, endOfDay } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"

// Import các API
import { getHistory, getHistoryById, HistoryItem } from "@/lib/api/history"

export default function HistoryPage() {
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  // State cho bộ lọc nâng cao
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isFiltering, setIsFiltering] = useState(false)

  // Đặt tiêu đề khi trang được tải
  useEffect(() => {
    setTitle("Lịch sử hoạt động")
  }, [setTitle])

  // Fetch data from API
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
          searchParams.start_date = formattedStartDate
        }

        // Thêm tham số ngày kết thúc nếu có
        if (endDate) {
          // Đảm bảo định dạng ngày chính xác và đặt giờ về 23:59:59
          const formattedEndDate = format(endOfDay(endDate), 'yyyy-MM-dd')
          searchParams.end_date = formattedEndDate
        }
      }

      // Sử dụng API với các tham số tìm kiếm
      const result = await getHistory(searchParams)

      if (result && result.success) {
        const historyData = result.data || [];
        setHistoryItems(historyData);

        // Hiển thị thông báo khi không tìm thấy kết quả
        if (historyData.length === 0 && (startDate || endDate)) {
          toast.info("Không tìm thấy lịch sử nào phù hợp với bộ lọc", {
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          });
        }
      } else {
        setError("Không thể tải dữ liệu lịch sử hoạt động")
      }
    } catch (err) {
      console.error("Error fetching history:", err)
      setError("Đã xảy ra lỗi khi tải dữ liệu")
    } finally {
      setIsFiltering(false)
    }
  }

  // Tải dữ liệu khi component được mount
  useEffect(() => {
    fetchData()
  }, [])

  // Xử lý xem chi tiết lịch sử
  const handleViewDetails = async (id: number) => {
    try {
      const result = await getHistoryById(id)

      if (result && result.success) {
        setSelectedItem(result.data)
        setIsViewModalOpen(true)
      } else {
        setError("Không thể tải chi tiết lịch sử")
      }
    } catch (err) {
      console.error("Error fetching history details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết lịch sử")
    }
  }

  // Hiển thị chi tiết lịch sử dưới dạng JSON
  const formatDetails = (details: string) => {
    try {
      const parsedDetails = JSON.parse(details);
      return JSON.stringify(parsedDetails, null, 2);
    } catch (e) {
      return details;
    }
  };

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
                Lọc theo thời gian
              </Button>

              {/* Hiển thị thông tin bộ lọc đang áp dụng */}
              {(startDate || endDate) && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span>Bộ lọc: </span>
                  {startDate && (
                    <Badge variant="outline" className="font-normal">
                      Từ ngày: {format(startDate, 'dd/MM/yyyy')}
                    </Badge>
                  )}
                  {endDate && (
                    <Badge variant="outline" className="font-normal">
                      Đến ngày: {format(endDate, 'dd/MM/yyyy')}
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
              columns={getColumns({})}
              data={historyItems}
              searchColumn="noi_dung"
              searchPlaceholder="Tìm kiếm nội dung..."
              onRowClick={(row) => handleViewDetails(row.id)}
            />
          </div>

        {/* Modal xem chi tiết */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">Chi tiết lịch sử hoạt động</DialogTitle>
              </DialogHeader>
              {selectedItem && (
                <div className="space-y-6 h-auto overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">

                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Nội dung</p>
                      <p className="text-lg md:text-xl">{selectedItem.noi_dung}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Người thực hiện</p>
                      <p className="text-lg md:text-xl">{selectedItem.user && selectedItem.user.username ? selectedItem.user.username : "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Thời gian</p>
                      <p className="text-lg md:text-xl">{format(new Date(selectedItem.createdAt), 'dd/MM/yyyy HH:mm:ss')}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">ID người dùng</p>
                      <p className="text-lg md:text-xl">{selectedItem.user_id}</p>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <p className="text-base md:text-lg font-medium text-gray-500">Chi tiết</p>
                      <div className="mt-2 bg-gray-100 p-4 rounded-md">
                        <ScrollArea className="h-[300px]">
                          <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                            {JSON.stringify({ content: selectedItem.noi_dung }, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="mt-6">
                <Button
                  onClick={() => setIsViewModalOpen(false)}
                  className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                >
                  Đóng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal bộ lọc nâng cao */}
          <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Bộ lọc nâng cao</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Lọc lịch sử hoạt động theo thời gian
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm md:text-base font-medium">Từ ngày</Label>
                  <DatePicker
                    date={startDate}
                    setDate={setStartDate}
                    className="w-full"
                    placeholder="Chọn ngày bắt đầu"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-sm md:text-base font-medium">Đến ngày</Label>
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
