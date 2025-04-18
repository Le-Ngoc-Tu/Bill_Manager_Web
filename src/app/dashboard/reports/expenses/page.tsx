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
import { Input } from "@/components/ui/input"
import { FaFilter, FaFileExport } from "react-icons/fa"
import { DataTable } from "@/components/ui/data-table"
import { getDetailColumns, getSummaryColumns } from "./columns"
import { format, startOfDay, endOfDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency, formatQuantity } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Import API
import { getExpenseReport, ExpenseReportData, ExpenseReportDetail, ExpenseSummaryItem } from "@/lib/api/reports"

export default function ExpenseReportPage() {
  const isMobile = useIsMobile()
  const { user, loading } = useAuth()
  const router = useRouter()
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [reportData, setReportData] = useState<ExpenseReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // State cho bộ lọc
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [itemName, setItemName] = useState<string>("")
  const [isFiltering, setIsFiltering] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

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
            {/* Hiển thị lỗi nếu có */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Bộ lọc */}
            <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
              <Button
                variant="outline"
                onClick={() => setIsFilterModalOpen(true)}
                className="w-full sm:w-auto h-10 md:h-12 text-sm md:text-base"
              >
                <FaFilter className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                Bộ lọc
              </Button>

              {/* Hiển thị thông tin bộ lọc đang áp dụng */}
              {(startDate || endDate || itemName) && (
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
                  {itemName && (
                    <Badge variant="outline" className="font-normal">
                      Tên chi phí: {itemName}
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

          {/* Modal bộ lọc */}
          <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Bộ lọc báo cáo chi phí</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Lọc báo cáo chi phí theo khoảng thời gian và tên chi phí
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

                <div className="space-y-2">
                  <Label htmlFor="item-name" className="text-sm md:text-base font-medium">Tên chi phí</Label>
                  <Input
                    id="item-name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Nhập tên chi phí"
                    className="w-full"
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
