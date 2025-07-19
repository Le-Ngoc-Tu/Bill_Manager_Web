"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown } from "lucide-react"
import { FaEye, FaEdit, FaTrash, FaLock } from "react-icons/fa"
import { User } from "@/lib/api/users"
import { Badge } from "@/components/ui/badge"

interface GetColumnsProps {
  onView: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onResetPassword?: (id: number) => void
  onDeleteMany?: (selectedRows: User[]) => void
}

export function getColumns({ onView, onEdit, onDelete, onResetPassword, onDeleteMany }: GetColumnsProps): ColumnDef<User>[] {
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
      accessorKey: "username",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Tên đăng nhập
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => <div>{row.getValue("username")}</div>,
      meta: {
        columnName: "Tên đăng nhập"
      },
    },
    {
      accessorKey: "fullname",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Họ tên
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => <div>{row.getValue("fullname") || "-"}</div>,
      meta: {
        columnName: "Họ tên"
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
      accessorKey: "role_name",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Vai trò
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue("role_name") || "-"}</div>,
      meta: {
        columnName: "Vai trò"
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
            {onResetPassword && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700"
                onClick={() => onResetPassword(item.id)}
              >
                <FaLock className="h-4 w-4" />
              </Button>
            )}
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
