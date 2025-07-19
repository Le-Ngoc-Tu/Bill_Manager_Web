"use client"

import React from "react"
import { usePageTitle } from "@/lib/page-title-context"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker"
import { FaSync, FaSearch, FaTimes, FaExclamationTriangle, FaTrash, FaPlus } from "react-icons/fa"
import { ChevronDown } from "lucide-react"
import { CreateDebtModal } from "@/components/debt/create-debt-modal"
import { DataTable } from "@/components/ui/data-table"
import { format, startOfDay, endOfDay } from "date-fns"

// Import debt API
import {
  getDebts,
  getDebtById,
  addPayment,
  updateDebt,
  deleteDebt,
  deletePayment,
  Debt,
  DebtFilters,
  AddPaymentRequest,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusText,
  getPaymentMethodText,
  isNearDue,
  filterDebtsByInvoiceNumber
} from "@/lib/api/debts"

// Import columns
import { getPayableColumns, getReceivableColumns } from "./columns"

export default function DebtsPage() {
  const { setTitle } = usePageTitle()
  
  // State management
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'payable' | 'receivable'>('payable')
  
  // Filters
  const [dueStartDate, setDueStartDate] = useState<Date | undefined>()
  const [dueEndDate, setDueEndDate] = useState<Date | undefined>()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all")
  
  // Modal states
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Payment form
  const [paymentForm, setPaymentForm] = useState<AddPaymentRequest>({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    note: ''
  })

  // Edit form
  const [editForm, setEditForm] = useState({
    due_date: '',
    description: ''
  })

  useEffect(() => {
    setTitle("Quản lý Công nợ")
  }, [setTitle])

  useEffect(() => {
    fetchDebts()
  }, [activeTab, dueStartDate, dueEndDate, statusFilter, selectedSupplierId])

  const fetchDebts = async () => {
    setLoading(true)
    try {
      const filters: DebtFilters = {
        debt_type: activeTab,
        due_start: dueStartDate ? format(startOfDay(dueStartDate), 'yyyy-MM-dd') : undefined,
        due_end: dueEndDate ? format(endOfDay(dueEndDate), 'yyyy-MM-dd') : undefined,
        status: (statusFilter as 'pending' | 'overdue' | 'paid') || undefined,
        supplier_id: selectedSupplierId !== "all" ? selectedSupplierId : undefined
      }

      const response = await getDebts(filters)
      if (response.success) {
        setDebts(response.data || [])
      } else {
        toast.error("Lỗi khi tải danh sách công nợ")
      }
    } catch (error) {
      console.error("Error fetching debts:", error)
      toast.error("Lỗi khi tải danh sách công nợ")
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (debt: Debt) => {
    try {
      const response = await getDebtById(debt.id)
      if (response.success) {
        setSelectedDebt(response.data)
        setShowDetailModal(true)
      } else {
        toast.error("Lỗi khi tải chi tiết công nợ")
      }
    } catch (error) {
      console.error("Error fetching debt detail:", error)
      toast.error("Lỗi khi tải chi tiết công nợ")
    }
  }

  const handleAddPayment = (debt: Debt) => {
    setSelectedDebt(debt)
    setPaymentForm({
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      payment_method: 'cash',
      reference_number: '',
      note: ''
    })
    setShowPaymentModal(true)
  }

  const handleEdit = (debt: Debt) => {
    setSelectedDebt(debt)
    setEditForm({
      due_date: debt.due_date || '',
      description: debt.description || ''
    })
    setShowEditModal(true)
  }

  const handleDelete = (debt: Debt) => {
    setSelectedDebt(debt)
    setShowDeleteModal(true)
  }

  const handleDeletePayment = (debt: Debt, paymentId: number) => {
    setSelectedDebt(debt)
    setSelectedPaymentId(paymentId)
    setShowDeletePaymentModal(true)
  }

  const handleSubmitPayment = async () => {
    if (!selectedDebt) return

    try {
      const response = await addPayment(selectedDebt.id, paymentForm)
      if (response.success) {
        toast.success("Thêm thanh toán thành công")
        setShowPaymentModal(false)
        fetchDebts() // Refresh data
      } else {
        toast.error(response.message || "Lỗi khi thêm thanh toán")
      }
    } catch (error) {
      console.error("Error adding payment:", error)
      toast.error("Lỗi khi thêm thanh toán")
    }
  }

  const handleSubmitEdit = async () => {
    if (!selectedDebt) return

    try {
      const response = await updateDebt(selectedDebt.id, editForm)
      if (response.success) {
        toast.success("Cập nhật công nợ thành công")
        setShowEditModal(false)
        fetchDebts() // Refresh data
      } else {
        toast.error(response.message || "Lỗi khi cập nhật công nợ")
      }
    } catch (error) {
      console.error("Error updating debt:", error)
      toast.error("Lỗi khi cập nhật công nợ")
    }
  }

  const handleSubmitDelete = async () => {
    if (!selectedDebt) return

    try {
      const response = await deleteDebt(selectedDebt.id)
      if (response.success) {
        toast.success("Xóa công nợ thành công")
        setShowDeleteModal(false)
        fetchDebts() // Refresh data
      } else {
        toast.error(response.message || "Lỗi khi xóa công nợ")
      }
    } catch (error) {
      console.error("Error deleting debt:", error)
      toast.error("Lỗi khi xóa công nợ")
    }
  }

  const handleSubmitDeletePayment = async () => {
    if (!selectedDebt || !selectedPaymentId) return

    try {
      const response = await deletePayment(selectedDebt.id, selectedPaymentId)
      if (response.success) {
        toast.success("Xóa giao dịch thanh toán thành công")
        setShowDeletePaymentModal(false)
        // Refresh debt detail
        const detailResponse = await getDebtById(selectedDebt.id)
        if (detailResponse.success) {
          setSelectedDebt(detailResponse.data)
        }
        fetchDebts() // Refresh data
      } else {
        toast.error(response.message || "Lỗi khi xóa giao dịch thanh toán")
      }
    } catch (error) {
      console.error("Error deleting payment:", error)
      toast.error("Lỗi khi xóa giao dịch thanh toán")
    }
  }

  const clearFilters = () => {
    setDueStartDate(undefined)
    setDueEndDate(undefined)
    setSearchTerm("")
    setStatusFilter("")
    setSelectedSupplierId("all")
  }

  // Lấy danh sách suppliers unique từ debts
  const getUniqueSuppliers = () => {
    const suppliersMap = new Map()

    debts.forEach(debt => {
      if (debt.supplier_name && debt.supplier_id) {
        suppliersMap.set(debt.supplier_id, {
          id: debt.supplier_id,
          name: debt.supplier_name,
          tax_code: debt.supplier_tax_code
        })
      }
    })

    return Array.from(suppliersMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  // Filter debts by search term (data already filtered by tab from API)
  const filteredDebts = filterDebtsByInvoiceNumber(debts, searchTerm)

  // Calculate summary statistics for current tab
  const totalAmount = filteredDebts.reduce((sum, debt) => sum + debt.total_amount, 0)
  const paidAmount = filteredDebts.reduce((sum, debt) => sum + debt.paid_amount, 0)
  const remainingAmount = filteredDebts.reduce((sum, debt) => sum + debt.remaining_amount, 0)
  const overdueCount = filteredDebts.filter(debt => debt.status === 'overdue').length
  const nearDueCount = filteredDebts.filter(debt => debt.due_date && isNearDue(debt.due_date)).length

  return (
    <div className="space-y-6">
      {/* Tabs for Payable/Receivable */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'payable' | 'receivable')} className="w-full">
        <TabsList className="w-full p-0 bg-background justify-start border-b rounded-none">
          <TabsTrigger
            value="payable"
            className="rounded-none bg-background h-full data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <span className="text-[15px] font-medium">Công nợ phải trả</span>
          </TabsTrigger>
          <TabsTrigger
            value="receivable"
            className="rounded-none bg-background h-full data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <span className="text-[15px] font-medium">Công nợ phải thu</span>
          </TabsTrigger>
        </TabsList>

        {/* Summary Cards - 5 cards in one row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 mt-6">
        {/* Tổng công nợ */}
        <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-700 mb-1">
                {activeTab === 'payable' ? 'Tổng phải trả' : 'Tổng phải thu'}
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(totalAmount)}
              </div>
              <p className="text-xs text-blue-600">công nợ</p>
            </div>
            <div className="text-2xl ml-3">💰</div>
          </div>
        </div>

        {/* Đã thanh toán */}
        <div className="bg-green-50 border-green-200 border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-green-700 mb-1">
                {activeTab === 'payable' ? 'Đã trả' : 'Đã thu'}
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(paidAmount)}
              </div>
              <p className="text-xs text-green-600">công nợ</p>
            </div>
            <div className="text-2xl ml-3">✅</div>
          </div>
        </div>

        {/* Còn lại */}
        <div className="bg-orange-50 border-orange-200 border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-orange-700 mb-1">
                Còn lại
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {formatCurrency(remainingAmount)}
              </div>
              <p className="text-xs text-orange-600">công nợ</p>
            </div>
            <div className="text-2xl ml-3">⏳</div>
          </div>
        </div>

        {/* Quá hạn */}
        <div className="bg-red-50 border-red-200 border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-red-700 mb-1">
                Quá hạn
              </div>
              <div className="text-2xl font-bold text-red-900">
                {overdueCount}
              </div>
              <p className="text-xs text-red-600">công nợ</p>
            </div>
            <div className="text-2xl ml-3">🚨</div>
          </div>
        </div>

        {/* Sắp đến hạn */}
        <div className="bg-yellow-50 border-yellow-200 border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-700 mb-1">
                Sắp đến hạn
              </div>
              <div className="text-2xl font-bold text-yellow-900">
                {nearDueCount}
              </div>
              <p className="text-xs text-yellow-600">công nợ</p>
            </div>
            <div className="text-2xl ml-3">⚠️</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Search by invoice number and partner name */}
            <div className="flex-1 min-w-[200px] flex flex-col">
              <label className="text-sm font-medium mb-1">Tìm kiếm</label>
              <div className="relative">
                <Input
                  placeholder="Nhập số hóa đơn hoặc tên đối tác..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 !h-10"
                />
                <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>

            {/* Status filter */}
            <div className="min-w-[150px] flex flex-col">
              <label className="text-sm font-medium mb-1">Trạng thái</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="w-full justify-between">
                    {statusFilter === '' ? 'Tất cả' :
                     statusFilter === 'pending' ? 'Chờ thanh toán' :
                     statusFilter === 'overdue' ? 'Quá hạn' :
                     statusFilter === 'paid' ? 'Đã thanh toán' : 'Tất cả'}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setStatusFilter('')}>
                    Tất cả
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                    Chờ thanh toán
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('overdue')}>
                    Quá hạn
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('paid')}>
                    Đã thanh toán
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Supplier filter */}
            <div className="min-w-[200px] flex flex-col">
              <label className="text-sm font-medium mb-1">Công ty chính</label>
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

            {/* Due date range filter */}
            <div className="min-w-[200px] flex flex-col">
              <label className="text-sm font-medium mb-1">Hạn thanh toán</label>
              <div>
                <CustomDateRangePicker
                  startDate={dueStartDate}
                  endDate={dueEndDate}
                  onStartDateChange={setDueStartDate}
                  onEndDateChange={setDueEndDate}
                  placeholder="Chọn hạn thanh toán"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-col">
              <div className="h-[20px]"></div> {/* Spacer to match label height */}
              <div className="flex gap-2">
                <Button onClick={() => setShowCreateModal(true)} size="lg">
                  <FaPlus className="mr-2 h-4 w-4" />
                  Thêm công nợ
                </Button>
                <Button onClick={fetchDebts} disabled={loading} size="lg" variant="outline">
                  <FaSync className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>
                <Button variant="outline" onClick={clearFilters} size="lg">
                  <FaTimes className="mr-2 h-4 w-4" />
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Tab Content */}
        <TabsContent value="payable" className="space-y-4">
          <DataTable
            columns={getPayableColumns(handleViewDetail, handleAddPayment, handleEdit, handleDelete)}
            data={filteredDebts}
          />
        </TabsContent>

        <TabsContent value="receivable" className="space-y-4">
          <DataTable
            columns={getReceivableColumns(handleViewDetail, handleAddPayment, handleEdit, handleDelete)}
            data={filteredDebts}
          />
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết công nợ</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết và lịch sử thanh toán
            </DialogDescription>
          </DialogHeader>

          {selectedDebt && (
            <div className="space-y-6">
              {/* Debt Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Số hóa đơn</label>
                    <p className="font-medium">{selectedDebt.invoice_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      {selectedDebt.debt_type === 'payable' ? 'Người bán' : 'Người mua'}
                    </label>
                    <p className="font-medium">{selectedDebt.partner_name}</p>
                    {selectedDebt.partner_tax_code && (
                      <p className="text-sm text-gray-500">MST: {selectedDebt.partner_tax_code}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Công ty</label>
                    <p className="font-medium">{selectedDebt.supplier_name}</p>
                    {selectedDebt.supplier_tax_code && (
                      <p className="text-sm text-gray-500">MST: {selectedDebt.supplier_tax_code}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">

                  <div>
                    <label className="text-sm font-medium text-gray-500">Hạn thanh toán</label>
                    <p className="font-medium">
                      {selectedDebt.due_date ? formatDate(selectedDebt.due_date) : 'Không có'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(selectedDebt.status)} border-0`}>
                        {getStatusText(selectedDebt.status)}
                      </Badge>
                      {selectedDebt.due_date && isNearDue(selectedDebt.due_date) && selectedDebt.status === 'pending' && (
                        <Badge className="text-orange-600 bg-orange-50 border-0">
                          <FaExclamationTriangle className="mr-1 h-3 w-3" />
                          Sắp đến hạn
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{formatCurrency(selectedDebt.total_amount)}</div>
                    <p className="text-xs text-muted-foreground">Tổng tiền</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedDebt.paid_amount)}</div>
                    <p className="text-xs text-muted-foreground">
                      {selectedDebt.debt_type === 'payable' ? 'Đã trả' : 'Đã thu'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(selectedDebt.remaining_amount)}</div>
                    <p className="text-xs text-muted-foreground">Còn lại</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Lịch sử thanh toán</h3>
                {selectedDebt.transactions && selectedDebt.transactions.length > 0 ? (
                  <div className="border rounded-lg">
                    <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 font-medium text-sm">
                      <div>Ngày</div>
                      <div>Số tiền</div>
                      <div>Phương thức</div>
                      <div>Số tham chiếu</div>
                      <div>Ghi chú</div>
                      <div>Thao tác</div>
                    </div>
                    {selectedDebt.transactions.map((transaction, index) => (
                      <div key={transaction.id} className={`grid grid-cols-6 gap-4 p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <div>{formatDate(transaction.transaction_date)}</div>
                        <div className="font-medium text-green-600">{formatCurrency(transaction.amount)}</div>
                        <div>{getPaymentMethodText(transaction.payment_method)}</div>
                        <div>{transaction.reference_number || '-'}</div>
                        <div>{transaction.note || '-'}</div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePayment(selectedDebt, transaction.id)}
                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                          >
                            <FaTrash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Chưa có giao dịch thanh toán nào</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thanh toán</DialogTitle>
            <DialogDescription>
              Thêm giao dịch thanh toán cho công nợ
            </DialogDescription>
          </DialogHeader>

          {selectedDebt && (
            <div className="space-y-4">
              {/* Debt Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Số hóa đơn:</span>
                    <span className="font-medium">{selectedDebt.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng tiền:</span>
                    <span className="font-medium">{formatCurrency(selectedDebt.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đã thanh toán:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedDebt.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Còn lại:</span>
                    <span className="font-medium text-orange-600">{formatCurrency(selectedDebt.remaining_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Ngày thanh toán</label>
                  <Input
                    type="date"
                    value={paymentForm.transaction_date}
                    onChange={(e) => setPaymentForm({...paymentForm, transaction_date: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Số tiền thanh toán</label>
                  <Input
                    type="number"
                    placeholder="Nhập số tiền..."
                    value={paymentForm.amount || ''}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Phương thức thanh toán</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="bank_transfer">Chuyển khoản</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Số tham chiếu</label>
                  <Input
                    placeholder="Số séc, mã giao dịch..."
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Ghi chú</label>
                  <Input
                    placeholder="Ghi chú cho lần thanh toán này..."
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({...paymentForm, note: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitPayment}>
              Thêm thanh toán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa công nợ</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin công nợ
            </DialogDescription>
          </DialogHeader>

          {selectedDebt && (
            <div className="space-y-4">
              {/* Debt Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Số hóa đơn:</span>
                    <span className="font-medium">{selectedDebt.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đối tác:</span>
                    <span className="font-medium">{selectedDebt.partner_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng tiền:</span>
                    <span className="font-medium">{formatCurrency(selectedDebt.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Hạn thanh toán</label>
                  <Input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({...editForm, due_date: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Ghi chú</label>
                  <Input
                    placeholder="Ghi chú về công nợ..."
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitEdit}>
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa công nợ</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa công nợ này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          {selectedDebt && (
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Số hóa đơn:</span>
                  <span className="font-medium">{selectedDebt.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Đối tác:</span>
                  <span className="font-medium">{selectedDebt.partner_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tổng tiền:</span>
                  <span className="font-medium">{formatCurrency(selectedDebt.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Trạng thái:</span>
                  <span className="font-medium">{getStatusText(selectedDebt.status)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleSubmitDelete}>
              Xóa công nợ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirmation Modal */}
      <Dialog open={showDeletePaymentModal} onOpenChange={setShowDeletePaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa giao dịch thanh toán</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa giao dịch thanh toán này? Số tiền sẽ được cộng lại vào công nợ.
            </DialogDescription>
          </DialogHeader>

          {selectedDebt && selectedPaymentId && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm">
                <p><strong>Lưu ý:</strong> Sau khi xóa giao dịch này, số tiền còn lại của công nợ sẽ được cập nhật lại.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePaymentModal(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleSubmitDeletePayment}>
              Xóa giao dịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Debt Modal */}
      <CreateDebtModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchDebts();
          setShowCreateModal(false);
        }}
      />
    </div>
  )
}
