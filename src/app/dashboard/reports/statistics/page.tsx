"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { usePageTitle } from "@/lib/page-title-context"
import { getSuppliers } from "@/lib/api/suppliers"
import { exportImportDetailReport, exportImportSummaryReport, exportExportDetailReport, exportExportSummaryReport } from "@/lib/api/reports"
import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker"
import { format } from "date-fns"
import { FaFileExcel, FaDownload } from "react-icons/fa"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Supplier {
  id: number
  name: string
  tax_code?: string
}

export default function StatisticsReportsPage() {
  const { setTitle } = usePageTitle()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingSummary, setIsExportingSummary] = useState(false)
  const [isExportingExportDetail, setIsExportingExportDetail] = useState(false)
  const [isExportingExportSummary, setIsExportingExportSummary] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTitle("Xuất báo cáo thống kê")
    loadSuppliers()
  }, [setTitle])

  const loadSuppliers = async () => {
    try {
      const response = await getSuppliers()
      if (response.success) {
        setSuppliers(response.data)
      }
    } catch (error) {
      console.error("Error loading suppliers:", error)
      toast.error("Không thể tải danh sách công ty")
    } finally {
      setLoading(false)
    }
  }

  const handleExportImportDetail = async () => {
    try {
      setIsExporting(true)

      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : undefined
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      const supplierId = selectedSupplierId !== "all" ? parseInt(selectedSupplierId) : undefined

      await exportImportDetailReport(supplierId, startDateStr, endDateStr)

      toast.success("Xuất báo cáo thành công!", {
        description: "File Excel đã được tải xuống"
      })
    } catch (error) {
      console.error("Error exporting report:", error)
      toast.error("Lỗi xuất báo cáo", {
        description: "Vui lòng thử lại sau"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportImportSummary = async () => {
    try {
      setIsExportingSummary(true)

      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : undefined
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      const supplierId = selectedSupplierId !== "all" ? parseInt(selectedSupplierId) : undefined

      await exportImportSummaryReport(supplierId, startDateStr, endDateStr)

      toast.success("Xuất báo cáo thành công!", {
        description: "File Excel đã được tải xuống"
      })
    } catch (error) {
      console.error("Error exporting summary report:", error)
      toast.error("Lỗi xuất báo cáo", {
        description: "Vui lòng thử lại sau"
      })
    } finally {
      setIsExportingSummary(false)
    }
  }

  const handleExportExportDetail = async () => {
    try {
      setIsExportingExportDetail(true)

      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : undefined
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      const supplierId = selectedSupplierId !== "all" ? parseInt(selectedSupplierId) : undefined

      await exportExportDetailReport(supplierId, startDateStr, endDateStr)

      toast.success("Xuất báo cáo thành công!", {
        description: "File Excel đã được tải xuống"
      })
    } catch (error) {
      console.error("Error exporting export detail report:", error)
      toast.error("Lỗi xuất báo cáo", {
        description: "Vui lòng thử lại sau"
      })
    } finally {
      setIsExportingExportDetail(false)
    }
  }

  const handleExportExportSummary = async () => {
    try {
      setIsExportingExportSummary(true)

      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : undefined
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      const supplierId = selectedSupplierId !== "all" ? parseInt(selectedSupplierId) : undefined

      await exportExportSummaryReport(supplierId, startDateStr, endDateStr)

      toast.success("Xuất báo cáo thành công!", {
        description: "File Excel đã được tải xuống"
      })
    } catch (error) {
      console.error("Error exporting export summary report:", error)
      toast.error("Lỗi xuất báo cáo", {
        description: "Vui lòng thử lại sau"
      })
    } finally {
      setIsExportingExportSummary(false)
    }
  }

  const handleDateRangeChange = (start: Date | undefined, end: Date | undefined) => {
    setStartDate(start)
    setEndDate(end)
  }

  const handleSyncAll = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Báo cáo nhập kho</TabsTrigger>
          <TabsTrigger value="export">Báo cáo xuất kho</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaFileExcel className="text-green-600" />
                Xuất bảng kê chi tiết nhập kho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chọn công ty */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Công ty chính (người mua)
                  </label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn công ty (để trống = tất cả)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả công ty</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name} {supplier.tax_code && `(${supplier.tax_code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Chọn thời gian */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Thời gian
                  </label>
                  <CustomDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onRangeChange={handleDateRangeChange}
                    onSyncAll={handleSyncAll}
                    placeholder="Chọn khoảng thời gian"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleExportImportDetail}
                  disabled={isExporting}
                  className="flex items-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      Xuất báo cáo Excel
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Thông tin báo cáo:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Báo cáo chi tiết các hàng hóa/chi phí từ hóa đơn nhập kho</li>
                  <li>• Bao gồm: Số hóa đơn, ngày lập, tên hàng hóa, số lượng, đơn giá, thành tiền</li>
                  <li>• Thông tin người bán và MST từ hóa đơn</li>
                  <li>• Sắp xếp theo ngày lập từ cũ đến mới</li>
                  <li>• Tổng cộng cuối báo cáo</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaFileExcel className="text-blue-600" />
                Xuất bảng kê tổng hợp nhập kho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chọn công ty */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Công ty chính (người mua)
                  </label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn công ty (để trống = tất cả)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả công ty</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name} {supplier.tax_code && `(${supplier.tax_code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Chọn thời gian */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Thời gian
                  </label>
                  <CustomDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onRangeChange={handleDateRangeChange}
                    onSyncAll={handleSyncAll}
                    placeholder="Chọn khoảng thời gian"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleExportImportSummary}
                  disabled={isExportingSummary}
                  className="flex items-center gap-2"
                >
                  {isExportingSummary ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      Xuất báo cáo Excel
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Thông tin báo cáo:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Báo cáo tổng hợp các hóa đơn nhập kho theo từng hóa đơn</li>
                  <li>• Bao gồm: STT, ký hiệu hóa đơn, số hóa đơn, ngày lập, MST và tên người bán</li>
                  <li>• Tổng tiền chưa thuế, tổng tiền thuế, tổng tiền thanh toán, loại hóa đơn</li>
                  <li>• Sắp xếp theo ngày lập từ cũ đến mới</li>
                  <li>• Tổng cộng cuối báo cáo</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaFileExcel className="text-orange-600" />
                Xuất bảng kê chi tiết xuất kho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chọn công ty */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Công ty chính (người bán)
                  </label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn công ty (để trống = tất cả)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả công ty</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name} {supplier.tax_code && `(${supplier.tax_code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Chọn thời gian */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Thời gian
                  </label>
                  <CustomDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onRangeChange={handleDateRangeChange}
                    onSyncAll={handleSyncAll}
                    placeholder="Chọn khoảng thời gian"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleExportExportDetail}
                  disabled={isExportingExportDetail}
                  className="flex items-center gap-2"
                >
                  {isExportingExportDetail ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      Xuất báo cáo Excel
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Thông tin báo cáo:</h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Báo cáo chi tiết các hàng hóa/chi phí từ hóa đơn xuất kho</li>
                  <li>• Bao gồm: Số hóa đơn, ngày lập, tên hàng hóa, số lượng, đơn giá, thành tiền</li>
                  <li>• Thông tin người mua và MST từ hóa đơn</li>
                  <li>• Sắp xếp theo ngày lập từ cũ đến mới</li>
                  <li>• Tổng cộng cuối báo cáo</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaFileExcel className="text-purple-600" />
                Xuất bảng kê tổng hợp xuất kho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chọn công ty */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Công ty chính (người bán)
                  </label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn công ty (để trống = tất cả)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả công ty</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name} {supplier.tax_code && `(${supplier.tax_code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Chọn thời gian */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Thời gian
                  </label>
                  <CustomDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onRangeChange={handleDateRangeChange}
                    onSyncAll={handleSyncAll}
                    placeholder="Chọn khoảng thời gian"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleExportExportSummary}
                  disabled={isExportingExportSummary}
                  className="flex items-center gap-2"
                >
                  {isExportingExportSummary ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      Xuất báo cáo Excel
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Thông tin báo cáo:</h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Báo cáo tổng hợp các hóa đơn xuất kho theo từng hóa đơn</li>
                  <li>• Bao gồm: STT, ký hiệu hóa đơn, số hóa đơn, ngày lập, MST và tên người mua</li>
                  <li>• Tổng tiền chưa thuế, tổng tiền thuế, tổng tiền thanh toán</li>
                  <li>• Sắp xếp theo ngày lập từ cũ đến mới</li>
                  <li>• Tổng cộng cuối báo cáo</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
