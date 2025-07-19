"use client"

import React from "react"
import { usePageTitle } from "@/lib/page-title-context"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FaPlus } from "react-icons/fa"
import { CustomerForm } from "@/components/forms/CustomerForm"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "./columns"

// Import các API
import { getCustomers, getCustomerById, deleteCustomer, Customer } from "@/lib/api/customers"
// import { createCustomer, updateCustomer } from "@/lib/api/customers" // Commented out unused imports

export default function CustomersPage() {
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Customer | null>(null)
  const [selectedItems, setSelectedItems] = useState<Customer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Đặt tiêu đề khi trang được tải
  useEffect(() => {
    setTitle("Quản lý đối tác")
  }, [setTitle])

  // Fetch data from API
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const result = await getCustomers()

      if (result && result.success) {
        const customersData = result.data || [];
        setCustomers(customersData);
      } else {
        setError("Không thể tải dữ liệu người mua")
      }
    } catch (err) {
      console.error("Error fetching customers:", err)
      setError("Đã xảy ra lỗi khi tải dữ liệu")
    } finally {
      setIsLoading(false)
    }
  }

  // Tải dữ liệu khi component được mount
  useEffect(() => {
    fetchData()
  }, [])

  // Xử lý xóa người mua
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedItem) return

    try {
      setIsDeleting(true)
      const result = await deleteCustomer(selectedItem.id)

      if (result && result.success) {
        toast.success("Xóa người mua thành công", {
          description: `Đã xóa người mua ${selectedItem.name}`,
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
        // Tải lại dữ liệu
        await fetchData()
        setIsDeleteModalOpen(false)
      } else {
        toast.error(result?.message || "Xóa người mua thất bại", {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
    } catch (err) {
      console.error("Error deleting customer:", err)
      toast.error("Đã xảy ra lỗi khi xóa người mua", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Xử lý xóa nhiều người mua
  const handleBatchDelete = async (selectedRows: Customer[]) => {
    try {
      setSelectedItems(selectedRows)
      setIsBatchDeleteModalOpen(true)
    } catch (err) {
      console.error("Error preparing batch delete:", err)
      toast.error("Đã xảy ra lỗi", {
        description: "Đã xảy ra lỗi khi chuẩn bị xóa hàng loạt"
      })
    }
  }

  // Xử lý xóa nhiều người mua
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  const confirmBatchDelete = async () => {
    if (!selectedItems.length) return

    try {
      setIsBatchDeleting(true)
      let successCount = 0
      let errorCount = 0

      // Xử lý từng người mua
      for (const item of selectedItems) {
        try {
          const result = await deleteCustomer(item.id)
          if (result && result.success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (err) {
          console.error(`Error deleting customer ${item.id}:`, err)
          errorCount++
        }
      }

      // Hiển thị thông báo
      if (successCount > 0) {
        toast.success(`Đã xóa ${successCount} người mua thành công`, {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
      if (errorCount > 0) {
        toast.error(`Có ${errorCount} người mua xóa thất bại`, {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }

      // Tải lại dữ liệu
      await fetchData()
      setIsBatchDeleteModalOpen(false)
      setSelectedItems([])
    } catch (err) {
      console.error("Error batch deleting customers:", err)
      toast.error("Đã xảy ra lỗi khi xóa người mua", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setIsBatchDeleting(false)
    }
  }

  // Xử lý xem chi tiết người mua
  const handleViewDetails = async (id: number) => {
    try {
      const result = await getCustomerById(id)

      if (result && result.success) {
        setSelectedItem(result.data)
        setIsViewModalOpen(true)
      } else {
        setError("Không thể tải chi tiết người mua")
      }
    } catch (err) {
      console.error("Error fetching customer details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết người mua")
    }
  }

  // Xử lý chỉnh sửa người mua
  const handleEdit = async (id: number) => {
    try {
      const result = await getCustomerById(id)

      if (result && result.success) {
        setSelectedItem(result.data)
        setIsModalOpen(true)
      } else {
        setError("Không thể tải chi tiết người mua")
      }
    } catch (err) {
      console.error("Error fetching customer details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết người mua")
    }
  }

  return (
    <div>
      <div className="mb-6">
            {/* Hiển thị lỗi nếu có */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Bảng dữ liệu sử dụng DataTable */}
            <DataTable
              columns={getColumns({
                onView: handleViewDetails,
                onEdit: handleEdit,
                onDelete: (id) => {
                  const itemToDelete = customers.find(item => item.id === id);
                  if (itemToDelete) {
                    setSelectedItem(itemToDelete);
                    setIsDeleteModalOpen(true);
                  }
                },
                onDeleteMany: handleBatchDelete
              })}
              data={customers}
              searchColumn="name"
              searchPlaceholder="Tìm kiếm người mua..."
              onDeleteSelected={handleBatchDelete}
              actionButton={
                <Button
                  onClick={() => {
                    setSelectedItem(null)
                    setIsModalOpen(true)
                  }}
                  className="h-10 md:h-12 text-sm md:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <FaPlus className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                      Thêm người mua
                    </>
                  )}
                </Button>
              }
            />
          </div>

        {/* Modal xác nhận xóa */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">Xác nhận xóa</DialogTitle>
                <DialogDescription className="text-base md:text-lg">
                  Bạn có chắc chắn muốn xóa người mua {selectedItem?.name} không?
                  Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                >
                  {isDeleting ? (
                    <>
                      <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    "Xóa"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal xác nhận xóa hàng loạt */}
          <Dialog open={isBatchDeleteModalOpen} onOpenChange={setIsBatchDeleteModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">Xác nhận xóa hàng loạt</DialogTitle>
                <DialogDescription className="text-base md:text-lg">
                  Bạn có chắc chắn muốn xóa {selectedItems.length} người mua đã chọn không?
                  Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsBatchDeleteModalOpen(false)}
                  className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmBatchDelete}
                  disabled={isBatchDeleting}
                  className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                >
                  {isBatchDeleting ? (
                    <>
                      <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    `Xóa ${selectedItems.length} người mua`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal xem chi tiết */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">Chi tiết người mua</DialogTitle>
              </DialogHeader>
              {selectedItem && (
                <div className="space-y-6 h-auto overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Tên người mua</p>
                      <p className="text-lg md:text-xl">{selectedItem.name}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Mã số thuế</p>
                      <p className="text-lg md:text-xl">{selectedItem.tax_code || "-"}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Địa chỉ</p>
                      <p className="text-lg md:text-xl">{selectedItem.address || "-"}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Số điện thoại</p>
                      <p className="text-lg md:text-xl">{selectedItem.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Email</p>
                      <p className="text-lg md:text-xl">{selectedItem.email || "-"}</p>
                    </div>
                    {selectedItem.note && (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-base md:text-lg font-medium text-gray-500">Ghi chú</p>
                        <p className="text-lg md:text-xl">{selectedItem.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter className="mt-6">
                <Button
                  onClick={() => setIsViewModalOpen(false)}
                  className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                >
                  Đóng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal thêm/sửa người mua */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">{selectedItem ? 'Chỉnh sửa người mua' : 'Thêm người mua mới'}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                <CustomerForm
                  mode={selectedItem ? "edit" : "add"}
                  initialData={selectedItem || undefined}
                  onSubmit={async (_data) => {
                    try {
                      // Tải lại dữ liệu
                      await fetchData();
                      setIsModalOpen(false);
                    } catch (err) {
                      console.error("Error saving customer:", err);
                      setError("Đã xảy ra lỗi khi lưu người mua");
                    }
                  }}
                  onCancel={() => setIsModalOpen(false)}
                  stickyFooter={true}
                />
              </div>

              {/* Footer cố định */}
              <div className="sticky bottom-0 bg-white py-2 border-t mt-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 md:gap-4 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    form="customer-form"
                    className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Đang xử lý...
                      </>
                    ) : (
                      selectedItem ? "Cập nhật người mua" : "Thêm người mua"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
    </div>
  )
}