"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown } from "lucide-react"
import { HistoryItem } from "@/lib/api/history"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface GetColumnsProps {}

export function getColumns({}: GetColumnsProps): ColumnDef<HistoryItem>[] {
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
      accessorKey: "noi_dung",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Nội dung
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => <div>{row.original.noi_dung || ""}</div>,
      meta: {
        columnName: "Nội dung"
      },
    },
    {
      accessorKey: "user",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Người thực hiện
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const user = row.original.user;
        return <div className="text-center">{user?.username || "Unknown"}</div>;
      },
      meta: {
        columnName: "Người thực hiện"
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Thời gian
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return <div className="text-center">{format(date, 'dd/MM/yyyy HH:mm:ss')}</div>;
      },
      meta: {
        columnName: "Thời gian"
      },
    },

  ]
}
