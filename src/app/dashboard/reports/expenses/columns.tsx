"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { formatCurrency, formatQuantity } from "@/lib/utils"
import { ExpenseReportDetail, ExpenseSummaryItem } from "@/lib/api/reports"

// Columns cho bảng chi tiết
export const getDetailColumns = (): ColumnDef<ExpenseReportDetail>[] => {
  return [
    {
      accessorKey: "invoice_date",
      header: "Ngày hóa đơn",
      cell: ({ row }) => {
        const date = new Date(row.getValue("invoice_date"))
        return <div className="text-center">{format(date, "dd/MM/yyyy")}</div>
      },
      meta: {
        columnName: "Ngày hóa đơn"
      }
    },
    {
      accessorKey: "invoice_number",
      header: "Số hóa đơn",
      cell: ({ row }) => {
        return <div className="text-center">{row.getValue("invoice_number") as string}</div>
      },
      meta: {
        columnName: "Số hóa đơn"
      }
    },
    {
      accessorKey: "item_name",
      header: "Tên chi phí",
      cell: ({ row }) => {
        return <div className="text-left">{row.getValue("item_name") as string}</div>
      },
      meta: {
        columnName: "Tên chi phí"
      }
    },
    {
      accessorKey: "unit",
      header: "Đơn vị",
      cell: ({ row }) => {
        return <div className="text-center">{row.getValue("unit") as string}</div>
      },
      meta: {
        columnName: "Đơn vị"
      }
    },
    {
      accessorKey: "quantity",
      header: "Số lượng",
      cell: ({ row }) => {
        return <div className="text-center">{formatQuantity(row.getValue("quantity") as number)}</div>
      },
      meta: {
        columnName: "Số lượng"
      }
    },
    {
      accessorKey: "price_before_tax",
      header: "Đơn giá",
      cell: ({ row }) => {
        return <div className="text-center font-bold">{formatCurrency(row.getValue("price_before_tax") as number)}</div>
      },
      meta: {
        columnName: "Đơn giá"
      }
    },
    {
      accessorKey: "total_before_tax",
      header: "Thành tiền",
      cell: ({ row }) => {
        return <div className="text-center font-bold">{formatCurrency(row.getValue("total_before_tax") as number)}</div>
      },
      meta: {
        columnName: "Thành tiền"
      }
    },
    {
      accessorKey: "tax_rate",
      header: "Thuế suất",
      cell: ({ row }) => {
        return <div className="text-center">{row.getValue("tax_rate") as string}</div>
      },
      meta: {
        columnName: "Thuế suất"
      }
    },
    {
      accessorKey: "tax_amount",
      header: "Tiền thuế",
      cell: ({ row }) => {
        return <div className="text-center font-bold">{formatCurrency(row.getValue("tax_amount") as number)}</div>
      },
      meta: {
        columnName: "Tiền thuế"
      }
    },
    {
      accessorKey: "total_after_tax",
      header: "Tổng cộng",
      cell: ({ row }) => {
        return <div className="text-center font-bold">{formatCurrency(row.getValue("total_after_tax") as number)}</div>
      },
      meta: {
        columnName: "Tổng cộng"
      }
    },
    {
      accessorKey: "seller_name",
      header: "Người bán",
      cell: ({ row }) => {
        return <div className="text-left">{(row.getValue("seller_name") as string) || "Không có"}</div>
      },
      meta: {
        columnName: "Người bán"
      }
    }
  ]
}

// Columns cho bảng tổng hợp
export const getSummaryColumns = (): ColumnDef<ExpenseSummaryItem>[] => {
  return [
    {
      accessorKey: "item_name",
      header: "Tên chi phí",
      cell: ({ row }) => {
        return <div className="text-left">{row.getValue("item_name") as string}</div>
      },
      meta: {
        columnName: "Tên chi phí"
      }
    },
    {
      accessorKey: "unit",
      header: "Đơn vị",
      cell: ({ row }) => {
        return <div className="text-center">{row.getValue("unit") as string}</div>
      },
      meta: {
        columnName: "Đơn vị"
      }
    },
    {
      accessorKey: "count",
      header: "Số lần",
      cell: ({ row }) => {
        return <div className="text-center">{row.getValue("count") as number}</div>
      },
      meta: {
        columnName: "Số lần"
      }
    },
    {
      accessorKey: "total_quantity",
      header: "Tổng số lượng",
      cell: ({ row }) => {
        return <div className="text-center">{formatQuantity(row.getValue("total_quantity") as number)}</div>
      },
      meta: {
        columnName: "Tổng số lượng"
      }
    },
    {
      accessorKey: "total_before_tax",
      header: "Tổng tiền hàng",
      cell: ({ row }) => {
        return <div className="text-center font-bold">{formatCurrency(row.getValue("total_before_tax") as number)}</div>
      },
      meta: {
        columnName: "Tổng tiền hàng"
      }
    },
    {
      accessorKey: "total_tax",
      header: "Tổng tiền thuế",
      cell: ({ row }) => {
        return <div className="text-center font-bold">{formatCurrency(row.getValue("total_tax") as number)}</div>
      },
      meta: {
        columnName: "Tổng tiền thuế"
      }
    },
    {
      accessorKey: "total_after_tax",
      header: "Tổng cộng",
      cell: ({ row }) => {
        return <div className="text-center font-bold">{formatCurrency(row.getValue("total_after_tax") as number)}</div>
      },
      meta: {
        columnName: "Tổng cộng"
      }
    }
  ]
}
