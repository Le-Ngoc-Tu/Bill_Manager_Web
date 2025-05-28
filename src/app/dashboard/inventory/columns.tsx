"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown } from "lucide-react"
import { FaEye, FaEdit, FaTrash } from "react-icons/fa"
import { Inventory } from "@/lib/api/inventory"

interface GetColumnsProps {
  onView: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onDeleteMany?: (selectedRows: Inventory[]) => void
}

export function getColumns({ onView, onEdit, onDelete }: GetColumnsProps): ColumnDef<Inventory>[] {
  // Hàm kiểm tra hàng hóa hết hàng để tô màu vàng
  const getRowClassName = (row: any) => {
    const quantity = row.getValue("quantity") as number;
    const numericQuantity = Number(quantity);
    return numericQuantity === 0 ? "bg-yellow-100" : "";
  };
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
        columnName: "Chọn",
        getRowClassName: getRowClassName
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
      accessorKey: "item_name",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Tên hàng hóa
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const itemName = row.getValue("item_name") as string;
        console.log('Rendering item_name:', itemName, 'for row:', row.original);
        return <div>{itemName}</div>;
      },
      meta: {
        columnName: "Tên hàng hóa"
      },
    },
    {
      accessorKey: "unit",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Đơn vị
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue("unit") as string}</div>,
      meta: {
        columnName: "Đơn vị"
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Loại
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const category = row.getValue("category") as string
        return <div className="text-center">{category}</div>
      },
      meta: {
        columnName: "Loại"
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="w-full hover:bg-red-800 hover:text-white"
            >
              Số lượng
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>

          </div>
        )
      },
      cell: ({ row }) => {
        // Lấy giá trị số lượng
        const quantity = row.getValue("quantity") as number;

        // Chuyển đổi sang số
        const numericQuantity = Number(quantity);

        // Định dạng số lượng
        // Nếu là số nguyên, hiển thị không có phần thập phân
        // Nếu là số thập phân, hiển thị với số chữ số thập phân cần thiết
        let formattedQuantity;

        if (Number.isInteger(numericQuantity)) {
          formattedQuantity = numericQuantity.toString();
        } else {
          // Loại bỏ các số 0 ở cuối phần thập phân
          formattedQuantity = numericQuantity.toString().replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
        }

        return (
          <div className="text-center group relative">
            {formattedQuantity}
            <div className="absolute hidden group-hover:block bg-black text-white text-xs rounded p-2 z-50 w-48 -left-16 top-6">
              Số lượng được tính toán tự động dựa trên các hóa đơn nhập/xuất
            </div>
          </div>
        );
      },
      meta: {
        columnName: "Số lượng"
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
