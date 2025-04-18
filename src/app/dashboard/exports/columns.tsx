"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { FaEye, FaEdit, FaTrash } from "react-icons/fa"
import { format } from "date-fns"
import { ExportInvoice } from "@/lib/api/exports"
import { Checkbox } from "@/components/ui/checkbox"
// DropdownMenu đã được xóa vì không sử dụng

// Import hàm định dạng tiền tệ từ utils
import { formatCurrency } from "@/lib/utils"

// Định nghĩa các hàm xử lý
interface ActionsProps {
  onView: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onDeleteMany?: (selectedRows: ExportInvoice[]) => void
}

export const getColumns = ({ onView, onEdit, onDelete }: ActionsProps): ColumnDef<ExportInvoice>[] => [
  // Các cột được định nghĩa với các thuộc tính responsive
  {
    id: "select",
    header: ({ table }) => (
      <div className="text-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Chọn tất cả"
          className="h-5 w-5"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Chọn dòng"
          className="h-5 w-5"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    meta: {
      columnName: "Chọn"
    },
  },
  {
    accessorKey: "index",
    header: "STT",
    cell: ({ row }) => <div className="text-center">{row.index + 1}</div>,
    enableSorting: false,
    enableHiding: false,
    meta: {
      columnName: "STT"
    },
  },
  {
    accessorKey: "invoice_number",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="w-full hover:bg-red-800 hover:text-white"
          >
            Số hóa đơn
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => <div>{row.getValue("invoice_number")}</div>,
    meta: {
      columnName: "Số hóa đơn"
    },
  },
  {
    accessorKey: "invoice_date",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="w-full hover:bg-red-800 hover:text-white"
          >
            Ngày lập hóa đơn
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("invoice_date"))
      return <div>{format(date, 'dd/MM/yyyy')}</div>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    meta: {
      columnName: "Ngày hóa đơn"
    },
  },
  {
    accessorKey: "total_before_tax",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="w-full hover:bg-red-800 hover:text-white"
          >
            Tổng trước thuế
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_before_tax"))
      return <div className="font-bold">{formatCurrency(amount)}</div>
    },
    meta: {
      columnName: "Tổng trước thuế"
    },
    enableHiding: true, // Cho phép ẩn cột này trên thiết bị di động
  },
  {
    accessorKey: "total_tax",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="w-full hover:bg-red-800 hover:text-white"
          >
            Tổng thuế
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_tax"))
      return <div className="font-bold">{formatCurrency(amount)}</div>
    },
    meta: {
      columnName: "Tổng thuế"
    },
    enableHiding: true, // Cho phép ẩn cột này trên thiết bị di động
  },
  {
    accessorKey: "total_after_tax",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="w-full hover:bg-red-800 hover:text-white"
          >
            Tổng sau thuế
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_after_tax"))
      return <div className="font-bold">{formatCurrency(amount)}</div>
    },
    meta: {
      columnName: "Tổng sau thuế"
    },
  },

  {
    accessorKey: "note",
    header: "Ghi chú",
    cell: ({ row }) => <div>{row.getValue("note") || "-"}</div>,
    enableHiding: true,
    meta: {
      columnName: "Ghi chú"
    },
  },
  {
    id: "actions",
    header: "Thao tác",
    cell: ({ row }) => {
      const invoice = row.original

      return (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-purple-100 hover:bg-purple-200 border-purple-200 text-purple-700"
            onClick={() => onView(invoice.id)}
          >
            <FaEye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-green-100 hover:bg-green-200 border-green-200 text-green-700"
            onClick={() => onEdit(invoice.id)}
          >
            <FaEdit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-red-100 hover:bg-red-200 border-red-200 text-red-700"
            onClick={() => onDelete(invoice.id)}
          >
            <FaTrash className="h-4 w-4" />
          </Button>
        </div>
      )
    },
    enableSorting: false,
    meta: {
      columnName: "Thao tác"
    },
  },
]