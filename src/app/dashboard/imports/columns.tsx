"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { FaEye, FaEdit, FaTrash, FaFilePdf, FaDownload, FaUpload, FaFileCode } from "react-icons/fa"
import { format } from "date-fns"
import { ImportInvoice } from "@/lib/api/imports"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Import hàm định dạng tiền tệ từ utils
import { formatCurrency } from "@/lib/utils"

// Định nghĩa các hàm xử lý
interface ActionsProps {
  onView: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onViewPdf: (invoice: ImportInvoice) => void
  onDownloadXml: (invoice: ImportInvoice) => void
  onUploadPdf: (invoice: ImportInvoice) => void
  onUploadXml: (invoice: ImportInvoice) => void
  onDeleteMany?: (selectedRows: ImportInvoice[]) => void
}

export const getColumns = ({ onView, onEdit, onDelete, onViewPdf, onDownloadXml, onUploadPdf, onUploadXml, onDeleteMany }: ActionsProps): ColumnDef<ImportInvoice>[] => [
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
    accessorKey: "customer",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="w-full hover:bg-red-800 hover:text-white"
          >
            Người bán
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const item = row.original
      return <div className="text-left">{item.customer?.name || 'Chưa có thông tin'}</div>
    },
    meta: {
      columnName: "Người bán"
    },
    enableHiding: true, // Cho phép ẩn cột này trên thiết bị di động
  },
  {
    accessorKey: "total_before_tax",
    header: ({ column }) => {
      return (
        <div className="text-center" style={{ minWidth: '200px' }}>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="w-full hover:bg-red-800 hover:text-white"
          >
            Tổng tiền trước thuế
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_before_tax"))
      return <div className="font-bold w-full" style={{ minWidth: '200px' }}>{formatCurrency(amount)}</div>
    },
    meta: {
      columnName: "Tổng tiền trước thuế"
    },
    enableHiding: true, // Cho phép ẩn cột này trên thiết bị di động
  },
  {
    accessorKey: "total_tax",
    header: ({ column }) => {
      return (
        <div className="text-center" style={{ minWidth: '150px' }}>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="w-full hover:bg-red-800 hover:text-white"
          >
            Thuế
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_tax"))
      return <div className="font-bold w-full" style={{ minWidth: '150px' }}>{formatCurrency(amount)}</div>
    },
    meta: {
      columnName: "Thuế"
    },
    enableHiding: true, // Cho phép ẩn cột này trên thiết bị di động
  },
  {
    accessorKey: "total_after_tax",
    header: ({ column }) => {
      return (
        <div className="text-center" style={{ minWidth: '200px' }}>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="w-full hover:bg-red-800 hover:text-white"
          >
            Tổng tiền sau thuế
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_after_tax"))
      return <div className="font-bold w-full" style={{ minWidth: '200px' }}>{formatCurrency(amount)}</div>
    },
    meta: {
      columnName: "Tổng tiền sau thuế"
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
    header: () => {
      return (
        <div className="text-center" style={{ minWidth: '100px' }}>
          Thao tác
        </div>
      )
    },
    cell: ({ row }) => {
      const invoice = row.original

      return (
        <div className="flex justify-center" style={{ minWidth: '100px' }}>
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
                onClick={() => onView(invoice.id)}
                className="cursor-pointer"
              >
                <FaEye className="mr-2 h-4 w-4 text-purple-600" />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(invoice.id)}
                className="cursor-pointer"
              >
                <FaEdit className="mr-2 h-4 w-4 text-green-600" />
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* PDF Actions */}
              {invoice.pdf_url ? (
                <DropdownMenuItem
                  onClick={() => onViewPdf(invoice)}
                  className="cursor-pointer"
                >
                  <FaFilePdf className="mr-2 h-4 w-4 text-red-600" />
                  Xem PDF
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onUploadPdf(invoice)}
                  className="cursor-pointer"
                >
                  <FaUpload className="mr-2 h-4 w-4 text-orange-600" />
                  Tải lên PDF
                </DropdownMenuItem>
              )}

              {/* XML Actions */}
              {invoice.xml_url ? (
                <DropdownMenuItem
                  onClick={() => onDownloadXml(invoice)}
                  className="cursor-pointer"
                >
                  <FaDownload className="mr-2 h-4 w-4 text-blue-600" />
                  Tải XML
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onUploadXml(invoice)}
                  className="cursor-pointer"
                >
                  <FaUpload className="mr-2 h-4 w-4 text-orange-600" />
                  Tải lên XML
                </DropdownMenuItem>
              )}
              {(invoice.pdf_url || invoice.xml_url) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => onDelete(invoice.id)}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <FaTrash className="mr-2 h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
    meta: {
      columnName: "Thao tác"
    },
  },
]
