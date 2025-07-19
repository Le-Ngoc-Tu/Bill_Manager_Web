"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown } from "lucide-react"
import { FaEye, FaEdit, FaTrash } from "react-icons/fa"
import { Customer } from "@/lib/api/customers"

interface GetColumnsProps {
  onView: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onDeleteMany?: (selectedRows: Customer[]) => void
}

export function getColumns({ onView, onEdit, onDelete }: GetColumnsProps): ColumnDef<Customer>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="text-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
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
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Tên đối tác
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => <div className="text-left">{row.getValue("name")}</div>,
      meta: {
        columnName: "Tên đối tác"
      },
      size: 300, // Tăng width cho cột tên đối tác
    },
    {
      accessorKey: "tax_code",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Mã số thuế
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue("tax_code") || "-"}</div>,
      meta: {
        columnName: "Mã số thuế"
      },
    },
    {
      accessorKey: "address",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Địa chỉ
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const address = row.getValue("address") as string;
        return (
          <div className="text-left max-w-[150px] truncate" title={address || ""}>
            {address || "-"}
          </div>
        );
      },
      meta: {
        columnName: "Địa chỉ"
      },
      size: 150, // Giảm width cho cột địa chỉ
      enableHiding: true,
      defaultHidden: true, // Ẩn cột này mặc định
    },
    {
      accessorKey: "phone",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Số điện thoại
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue("phone") || "-"}</div>,
      meta: {
        columnName: "Số điện thoại"
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Email
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue("email") || "-"}</div>,
      meta: {
        columnName: "Email"
      },
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => {
        const item = row.original

        return (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-purple-100 hover:bg-purple-200 border-purple-200 text-purple-700"
              onClick={() => onView(item.id)}
            >
              <FaEye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-green-100 hover:bg-green-200 border-green-200 text-green-700"
              onClick={() => onEdit(item.id)}
            >
              <FaEdit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-red-100 hover:bg-red-200 border-red-200 text-red-700"
              onClick={() => onDelete(item.id)}
            >
              <FaTrash className="h-4 w-4" />
            </Button>
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
}
