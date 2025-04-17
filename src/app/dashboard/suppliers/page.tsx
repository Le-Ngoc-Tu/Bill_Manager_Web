"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/page-title-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FaPlus } from "react-icons/fa"
import { SupplierForm } from "@/components/forms/SupplierForm"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "./columns"

// Import các API
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier, Supplier } from "@/lib/api/suppliers"

export default function SuppliersPage() {
  const isMobile = useIsMobile()
  const { user, loading } = useAuth()
  const router = useRouter()
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Supplier | null>(null)
  const [selectedItems, setSelectedItems] = useState<Supplier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  // Đặt tiêu đề khi trang được tải
  useEffect(() => {
    setTitle("Quản lý người bán")
  }, [setTitle])

  // Fetch data from API
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const result = await getSuppliers()

      if (result && result.success) {
        const suppliersData = result.data || [];
        setSuppliers(suppliersData);
      } else {
        setError("Không thể tải dữ liệu người bán")
      }
    } catch (err) {
      console.error("Error fetching suppliers:", err)
      setError("Đã xảy ra lỗi khi tải dữ liệu")
    } finally {
      setIsLoading(false)
    }
  }

  // Tải dữ liệu khi component được mount
  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  // Xử lý xóa người bán
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedItem) return

    try {
      setIsDeleting(true)
      const result = await deleteSupplier(selectedItem.id)

      if (result && result.success) {
        toast.success("Xóa người bán thành công", {
          description: `Đã xóa người bán ${selectedItem.name}`,
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
        // Tải lại dữ liệu
        await fetchData()
        setIsDeleteModalOpen(false)
      } else {
        toast.error(result?.message || "Xóa người bán thất bại", {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
    } catch (err) {
      console.error("Error deleting supplier:", err)
      toast.error("Đã xảy ra lỗi khi xóa người bán", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Xử lý xóa nhiều người bán
  const handleBatchDelete = async (selectedRows: Supplier[]) => {
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

  // Xử lý xóa nhiều người bán
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  const confirmBatchDelete = async () => {
    if (!selectedItems.length) return

    try {
      setIsBatchDeleting(true)
      let successCount = 0
      let errorCount = 0

      // Xử lý từng người bán
      for (const item of selectedItems) {
        try {
          const result = await deleteSupplier(item.id)
          if (result && result.success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (err) {
          console.error(`Error deleting supplier ${item.id}:`, err)
          errorCount++
        }
      }

      // Hiển thị thông báo
      if (successCount > 0) {
        toast.success(`Đã xóa ${successCount} người bán thành công`, {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
      if (errorCount > 0) {
        toast.error(`Có ${errorCount} người bán xóa thất bại`, {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }

      // Tải lại dữ liệu
      await fetchData()
      setIsBatchDeleteModalOpen(false)
      setSelectedItems([])
    } catch (err) {
      console.error("Error batch deleting suppliers:", err)
      toast.error("Đã xảy ra lỗi khi xóa người bán", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setIsBatchDeleting(false)
    }
  }

  // Xử lý xem chi tiết người bán
  const handleViewDetails = async (id: number) => {
    try {
      const result = await getSupplierById(id)

      if (result && result.success) {
        setSelectedItem(result.data)
        setIsViewModalOpen(true)
      } else {
        setError("Không thể tải chi tiết người bán")
      }
    } catch (err) {
      console.error("Error fetching supplier details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết người bán")
    }
  }

  // Xử lý chỉnh sửa người bán
  const handleEdit = async (id: number) => {
    try {
      const result = await getSupplierById(id)

      if (result && result.success) {
        setSelectedItem(result.data)
        setIsModalOpen(true)
      } else {
        setError("Không thể tải chi tiết người bán")
      }
    } catch (err) {
      console.error("Error fetching supplier details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết người bán")
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-lg">Đang chuyển hướng...</p>
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": isMobile ? "calc(var(--spacing) * 60)" : "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-2 sm:p-3 md:p-4 lg:p-6 overflow-x-hidden">
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
                  const itemToDelete = suppliers.find(item => item.id === id);
                  if (itemToDelete) {
                    setSelectedItem(itemToDelete);
                    setIsDeleteModalOpen(true);
                  }
                },
                onDeleteMany: handleBatchDelete
              })}
              data={suppliers}
              searchColumn="name"
              searchPlaceholder="Tìm kiếm người bán..."
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
                      Thêm người bán
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
                  Bạn có chắc chắn muốn xóa người bán "{selectedItem?.name}" không?
                  Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="h-12 md:h-14 px-6 md:px-10 text-base md:text-lg w-full sm:w-auto"
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-12 md:h-14 px-6 md:px-10 text-base md:text-lg w-full sm:w-auto"
                >
                  {isDeleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
                  Bạn có chắc chắn muốn xóa {selectedItems.length} người bán đã chọn không?
                  Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsBatchDeleteModalOpen(false)}
                  className="h-12 md:h-14 px-6 md:px-10 text-base md:text-lg w-full sm:w-auto"
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmBatchDelete}
                  disabled={isBatchDeleting}
                  className="h-12 md:h-14 px-6 md:px-10 text-base md:text-lg w-full sm:w-auto"
                >
                  {isBatchDeleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    `Xóa ${selectedItems.length} người bán`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal xem chi tiết */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">Chi tiết người bán</DialogTitle>
              </DialogHeader>
              {selectedItem && (
                <div className="space-y-6 h-auto overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Tên người bán</p>
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
                  className="h-12 md:h-14 px-6 md:px-10 text-base md:text-lg w-full sm:w-auto"
                >
                  Đóng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal thêm/sửa người bán */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">{selectedItem ? 'Chỉnh sửa người bán' : 'Thêm người bán mới'}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                <SupplierForm
                  mode={selectedItem ? "edit" : "add"}
                  initialData={selectedItem || undefined}
                  onSubmit={async (data: any) => {
                    try {
                      // Tải lại dữ liệu
                      await fetchData();
                      setIsModalOpen(false);
                    } catch (err) {
                      console.error("Error saving supplier:", err);
                      setError("Đã xảy ra lỗi khi lưu người bán");
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
                    form="supplier-form"
                    className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Đang xử lý...
                      </>
                    ) : (
                      selectedItem ? "Cập nhật người bán" : "Thêm người bán"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}