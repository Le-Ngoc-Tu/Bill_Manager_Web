"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal } from "lucide-react"
import { FaEye, FaPlus, FaExclamationTriangle, FaEdit, FaTrash } from "react-icons/fa"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Debt, 
  formatCurrency, 
  formatDate, 
  getStatusColor, 
  getStatusText,
  isNearDue 
} from "@/lib/api/debts"

// Status Badge Component
const StatusBadge = ({ debt }: { debt: Debt }) => {
  const isNear = debt.due_date && isNearDue(debt.due_date)
  const statusColor = getStatusColor(debt.status)
  
  return (
    <div className="flex items-center gap-2">
      <Badge className={`${statusColor} border-0`}>
        {getStatusText(debt.status)}
      </Badge>
      {isNear && debt.status === 'pending' && (
        <Badge className="text-orange-600 bg-orange-50 border-0">
          <FaExclamationTriangle className="mr-1 h-3 w-3" />
          Sắp đến hạn
        </Badge>
      )}
    </div>
  )
}

// Action Dropdown Component
const ActionDropdown = ({
  debt,
  onViewDetail,
  onAddPayment,
  onEdit,
  onDelete
}: {
  debt: Debt
  onViewDetail: (debt: Debt) => void
  onAddPayment: (debt: Debt) => void
  onEdit: (debt: Debt) => void
  onDelete: (debt: Debt) => void
}) => {
  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Mở menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onViewDetail(debt)}
            className="cursor-pointer"
          >
            <FaEye className="mr-2 h-4 w-4 text-purple-600" />
            Xem chi tiết
          </DropdownMenuItem>

          {debt.status !== 'paid' && (
            <DropdownMenuItem
              onClick={() => onAddPayment(debt)}
              className="cursor-pointer"
            >
              <FaPlus className="mr-2 h-4 w-4 text-green-600" />
              Thêm thanh toán
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onEdit(debt)}
            className="cursor-pointer"
          >
            <FaEdit className="mr-2 h-4 w-4 text-blue-600" />
            Chỉnh sửa
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onDelete(debt)}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <FaTrash className="mr-2 h-4 w-4" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Columns for Payable Debts (Công nợ phải trả)
export const getPayableColumns = (
  onViewDetail: (debt: Debt) => void,
  onAddPayment: (debt: Debt) => void,
  onEdit: (debt: Debt) => void,
  onDelete: (debt: Debt) => void
): ColumnDef<Debt>[] => [
  {
    id: "invoice_number",
    accessorKey: "invoice_number",
    header: "Số hóa đơn",
    meta: {
      columnName: "Số hóa đơn"
    },
    cell: ({ row }) => {
      const debt = row.original
      return (
        <div className="font-medium">
          {debt.invoice_number || `${debt.reference_type.toUpperCase()}-${debt.reference_id}`}
        </div>
      )
    },
  },
  {
    id: "partner_name",
    accessorKey: "partner_name",
    header: "Người bán",
    meta: {
      columnName: "Người bán"
    },
    cell: ({ row }) => {
      const debt = row.original
      return (
        <div>
          <div className="font-medium">{debt.partner_name || 'N/A'}</div>
          {debt.partner_tax_code && (
            <div className="text-sm text-gray-500">MST: {debt.partner_tax_code}</div>
          )}
        </div>
      )
    },
  },
  {
    id: "supplier_name",
    accessorKey: "supplier_name",
    header: "Công ty",
    meta: {
      columnName: "Công ty"
    },
    cell: ({ row }) => {
      const debt = row.original
      return (
        <div>
          <div className="font-medium">{debt.supplier_name || 'N/A'}</div>
          {debt.supplier_tax_code && (
            <div className="text-sm text-gray-500">MST: {debt.supplier_tax_code}</div>
          )}
        </div>
      )
    },
  },

  {
    id: "due_date",
    accessorKey: "due_date",
    header: "Hạn thanh toán",
    meta: {
      columnName: "Hạn thanh toán"
    },
    cell: ({ row }) => {
      const dueDate = row.getValue("due_date") as string
      return dueDate ? formatDate(dueDate) : "Không có"
    },
  },
  {
    id: "total_amount",
    accessorKey: "total_amount",
    header: "Tổng tiền",
    meta: {
      columnName: "Tổng tiền"
    },
    cell: ({ row }) => (
      <div className="font-medium text-right">
        {formatCurrency(row.getValue("total_amount"))}
      </div>
    ),
  },
  {
    id: "paid_amount",
    accessorKey: "paid_amount",
    header: "Đã trả",
    meta: {
      columnName: "Đã trả"
    },
    cell: ({ row }) => (
      <div className="font-medium text-right text-green-600">
        {formatCurrency(row.getValue("paid_amount"))}
      </div>
    ),
  },
  {
    id: "remaining_amount",
    accessorKey: "remaining_amount",
    header: "Còn lại",
    meta: {
      columnName: "Còn lại"
    },
    cell: ({ row }) => (
      <div className="font-medium text-right text-orange-600">
        {formatCurrency(row.getValue("remaining_amount"))}
      </div>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Trạng thái",
    meta: {
      columnName: "Trạng thái"
    },
    cell: ({ row }) => (
      <div className="flex justify-center">
        <StatusBadge debt={row.original} />
      </div>
    ),
  },
  {
    id: "actions",
    header: "Thao tác",
    meta: {
      columnName: "Thao tác"
    },
    cell: ({ row }) => (
      <ActionDropdown
        debt={row.original}
        onViewDetail={onViewDetail}
        onAddPayment={onAddPayment}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]

// Columns for Receivable Debts (Công nợ phải thu)
export const getReceivableColumns = (
  onViewDetail: (debt: Debt) => void,
  onAddPayment: (debt: Debt) => void,
  onEdit: (debt: Debt) => void,
  onDelete: (debt: Debt) => void
): ColumnDef<Debt>[] => [
  {
    id: "invoice_number",
    accessorKey: "invoice_number",
    header: "Số hóa đơn",
    meta: {
      columnName: "Số hóa đơn"
    },
    cell: ({ row }) => {
      const debt = row.original
      return (
        <div className="font-medium">
          {debt.invoice_number || `${debt.reference_type.toUpperCase()}-${debt.reference_id}`}
        </div>
      )
    },
  },
  {
    id: "partner_name",
    accessorKey: "partner_name",
    header: "Người mua",
    meta: {
      columnName: "Người mua"
    },
    cell: ({ row }) => {
      const debt = row.original
      return (
        <div>
          <div className="font-medium">{debt.partner_name || 'N/A'}</div>
          {debt.partner_tax_code && (
            <div className="text-sm text-gray-500">MST: {debt.partner_tax_code}</div>
          )}
        </div>
      )
    },
  },
  {
    id: "supplier_name",
    accessorKey: "supplier_name",
    header: "Công ty",
    meta: {
      columnName: "Công ty"
    },
    cell: ({ row }) => {
      const debt = row.original
      return (
        <div>
          <div className="font-medium">{debt.supplier_name || 'N/A'}</div>
          {debt.supplier_tax_code && (
            <div className="text-sm text-gray-500">MST: {debt.supplier_tax_code}</div>
          )}
        </div>
      )
    },
  },

  {
    id: "due_date",
    accessorKey: "due_date",
    header: "Hạn thanh toán",
    meta: {
      columnName: "Hạn thanh toán"
    },
    cell: ({ row }) => {
      const dueDate = row.getValue("due_date") as string
      return dueDate ? formatDate(dueDate) : "Không có"
    },
  },
  {
    id: "total_amount",
    accessorKey: "total_amount",
    header: "Tổng tiền",
    meta: {
      columnName: "Tổng tiền"
    },
    cell: ({ row }) => (
      <div className="font-medium text-right">
        {formatCurrency(row.getValue("total_amount"))}
      </div>
    ),
  },
  {
    id: "paid_amount",
    accessorKey: "paid_amount",
    header: "Đã thu",
    meta: {
      columnName: "Đã thu"
    },
    cell: ({ row }) => (
      <div className="font-medium text-right text-green-600">
        {formatCurrency(row.getValue("paid_amount"))}
      </div>
    ),
  },
  {
    id: "remaining_amount",
    accessorKey: "remaining_amount",
    header: "Còn lại",
    meta: {
      columnName: "Còn lại"
    },
    cell: ({ row }) => (
      <div className="font-medium text-right text-orange-600">
        {formatCurrency(row.getValue("remaining_amount"))}
      </div>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Trạng thái",
    meta: {
      columnName: "Trạng thái"
    },
    cell: ({ row }) => (
      <div className="flex justify-center">
        <StatusBadge debt={row.original} />
      </div>
    ),
  },
  {
    id: "actions",
    header: "Thao tác",
    meta: {
      columnName: "Thao tác"
    },
    cell: ({ row }) => (
      <ActionDropdown
        debt={row.original}
        onViewDetail={onViewDetail}
        onAddPayment={onAddPayment}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
