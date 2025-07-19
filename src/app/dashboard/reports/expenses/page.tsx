"use client"

import React from "react"
import { usePageTitle } from "@/lib/page-title-context"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FaFilter, FaFileExport } from "react-icons/fa"
import { DataTable } from "@/components/ui/data-table"
import { getDetailColumns, getSummaryColumns } from "./columns"
import { format, startOfDay, endOfDay } from "date-fns"
import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency, formatQuantity } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Import API
import { getExpenseReport, ExpenseReportData, ExpenseReportDetail, ExpenseSummaryItem } from "@/lib/api/reports"

export default function ExpenseReportPage() {
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [reportData, setReportData] = useState<ExpenseReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // State cho bộ lọc
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [itemName, setItemName] = useState<string>("")
  const [isFiltering, setIsFiltering] = useState(false)

  // Đặt tiêu đề khi trang được tải
  useEffect(() => {
    setTitle("Báo cáo chi phí")
  }, [setTitle])

  // Fetch data from API
  const fetchData = async (resetFilters = false) => {
    try {
      setIsFiltering(true)
      // Nếu resetFilters = true, đặt lại các bộ lọc
      if (resetFilters) {
        setStartDate(undefined)
        setEndDate(undefined)
        setItemName("")
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

        // Thêm tham số tên chi phí nếu có
        if (itemName) {
          searchParams.item_name = itemName
        }
      }

      // Sử dụng API
      const result = await getExpenseReport(searchParams)

      if (result && result.success) {
        setReportData(result.data);

        // Hiển thị thông báo khi không tìm thấy kết quả
        if (result.data.details.length === 0 && (startDate || endDate || itemName)) {
          toast.info("Không tìm thấy chi phí nào phù hợp với bộ lọc", {
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          });
        }
      } else {
        setError("Không thể tải dữ liệu báo cáo chi phí")
      }
    } catch (err) {
      console.error("Error fetching expense report:", err)
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

  return (
    <div>
      <div className="mb-6">
            {/* Hiển thị lỗi nếu có */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Bộ lọc thời gian */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="flex-1 max-w-60">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lọc theo ngày lập hóa đơn chi phí
                    </label>
                    <CustomDateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onStartDateChange={setStartDate}
                      onEndDateChange={setEndDate}
                      onRangeChange={(start: Date | undefined, end: Date | undefined) => {
                        setStartDate(start)
                        setEndDate(end)
                      }}
                      className="w-full"
                      placeholder="Chọn khoảng thời gian"
                    />
                  </div>

                  <div className="flex-1 max-w-60">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tìm kiếm theo tên chi phí
                    </label>
                    <Input
                      placeholder="Nhập tên chi phí..."
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchData()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isFiltering}
                  >
                    <FaFilter className="mr-2 h-4 w-4" />
                    Lọc dữ liệu
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate(undefined)
                      setEndDate(undefined)
                      setItemName("")
                      fetchData(true)
                    }}
                    disabled={isFiltering}
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
            </div>



            {/* Hiển thị trạng thái đang tải */}
            {isFiltering && (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="ml-2 text-sm">Đang tải dữ liệu...</p>
              </div>
            )}

            {/* Hiển thị thông tin tổng hợp */}
            {reportData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg">Tổng tiền hàng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl md:text-3xl font-bold">{formatCurrency(reportData.totals.total_before_tax)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg">Tổng tiền thuế</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl md:text-3xl font-bold">{formatCurrency(reportData.totals.total_tax)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg">Tổng thanh toán</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl md:text-3xl font-bold">{formatCurrency(reportData.totals.total_after_tax)}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs cho báo cáo */}
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="summary">Tổng hợp theo loại chi phí</TabsTrigger>
                <TabsTrigger value="details">Chi tiết</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary">
                {reportData && reportData.summary.length > 0 ? (
                  <DataTable
                    columns={getSummaryColumns()}
                    data={reportData.summary}
                    searchColumn="item_name"
                    searchPlaceholder="Tìm kiếm theo tên chi phí..."
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {isFiltering ? "Đang tải dữ liệu..." : "Không có dữ liệu chi phí"}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="details">
                {reportData && reportData.details.length > 0 ? (
                  <DataTable
                    columns={getDetailColumns()}
                    data={reportData.details}
                    searchColumn="item_name"
                    searchPlaceholder="Tìm kiếm theo tên chi phí..."
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {isFiltering ? "Đang tải dữ liệu..." : "Không có dữ liệu chi phí"}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>


    </div>
  )
}
