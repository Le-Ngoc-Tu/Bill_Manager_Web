"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  VisibilityState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchColumn?: string
  searchPlaceholder?: string
  actionButton?: React.ReactNode
  onDeleteSelected?: (selectedRows: TData[]) => void
  onRowClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Tìm kiếm...",
  actionButton,
  onDeleteSelected,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  // Thiết lập mặc định ẩn một số cột trên thiết bị di động
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    note: false
  })

  // Sử dụng useEffect để cập nhật trạng thái hiển thị cột dựa trên kích thước màn hình
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setColumnVisibility(prev => ({
          ...prev,
          seller_name: false,
          total_before_tax: false,
          total_tax: false
        }))
      }
    }

    // Gọi hàm khi component mount
    handleResize()

    // Thêm event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-center py-2 md:py-4 gap-2 md:gap-3">
        <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
          {searchColumn && (
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchColumn)?.setFilterValue(event.target.value)
              }
              className="w-full sm:w-[250px] h-10 md:h-12 text-sm md:text-base"
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 md:h-12 text-sm md:text-base">
                Hiển thị <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {(column.columnDef.meta as any)?.columnName || column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        <div className="w-full sm:w-auto sm:ml-auto mt-2 sm:mt-0">
          {actionButton}
        </div>
      </div>
      <div className="rounded-sm border">
        <Table>
          <TableHeader className="bg-destructive rounded-t-sm">
            {table.getHeaderGroups().map((headerGroup, index) => (
              <TableRow key={headerGroup.id} className={index === 0 ? "rounded-t-sm hover:bg-transparent" : "hover:bg-transparent"}>
                {headerGroup.headers.map((header, idx) => {
                  const isFirstCell = idx === 0;
                  const isLastCell = idx === headerGroup.headers.length - 1;
                  let cellClassName = "text-white font-bold text-center text-sm md:text-base lg:text-lg";

                  if (isFirstCell) cellClassName += " rounded-tl-sm";
                  if (isLastCell) cellClassName += " rounded-tr-sm";

                  return (
                    <TableHead key={header.id} className={cellClassName}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer hover:bg-gray-100" : ""}
                  onClick={() => onRowClick && onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-center text-sm md:text-base lg:text-lg">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm md:text-base lg:text-lg">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between py-2 md:py-4 gap-2 sm:gap-0">
        <div className="text-sm md:text-base lg:text-lg text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} trong{" "}
          {table.getFilteredRowModel().rows.length} dòng được chọn.
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:space-x-4 w-full sm:w-auto">
          {onDeleteSelected && table.getFilteredSelectedRowModel().rows.length > 0 && (
            <Button
              variant="destructive"
              size="default"
              className="w-full sm:w-auto"
              onClick={() => {
                const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
                onDeleteSelected(selectedRows);
                table.resetRowSelection();
              }}
            >
              <span className="text-sm md:text-base lg:text-lg">Xóa {table.getFilteredSelectedRowModel().rows.length} dòng</span>
            </Button>
          )}

          <Pagination className="w-full sm:w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => table.previousPage()}
                  className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {/* Hiển thị số trang */}
              {Array.from({length: table.getPageCount()}, (_, i) => i + 1).map((page) => {
                // Hiển thị tối đa 5 trang, nếu nhiều hơn thì hiển thị dấu ...
                const currentPage = table.getState().pagination.pageIndex + 1;
                const totalPages = table.getPageCount();

                // Luôn hiển thị trang đầu, trang cuối và trang hiện tại
                // Cùng với 1 trang trước và 1 trang sau trang hiện tại (nếu có)
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => table.setPageIndex(page - 1)}
                        isActive={currentPage === page}
                        className="text-sm md:text-base lg:text-lg"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }

                // Hiển thị dấu ... sau trang đầu nếu có khoảng cách
                if (page === 2 && currentPage > 3) {
                  return (
                    <PaginationItem key="ellipsis-start">
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                // Hiển thị dấu ... trước trang cuối nếu có khoảng cách
                if (page === totalPages - 1 && currentPage < totalPages - 2) {
                  return (
                    <PaginationItem key="ellipsis-end">
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                // Không hiển thị các trang khác
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => table.nextPage()}
                  className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}
