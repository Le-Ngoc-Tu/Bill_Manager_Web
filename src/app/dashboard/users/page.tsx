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
import { UserForm } from "@/components/forms/UserForm"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "./columns"

// Import các API
import { getUsers, getUserById, createUser, updateUser, deleteUser, User } from "@/lib/api/users"

export default function UsersPage() {
  const isMobile = useIsMobile()
  const { user, loading } = useAuth()
  const router = useRouter()
  const { setTitle } = usePageTitle()

  // State cho dữ liệu và UI
  const [users, setUsers] = useState<User[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<User | null>(null)
  const [selectedItems, setSelectedItems] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  // Đặt tiêu đề khi trang được tải
  useEffect(() => {
    setTitle("Quản lý người dùng")
  }, [setTitle])

  // Fetch data from API
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const result = await getUsers()

      if (Array.isArray(result)) {
        setUsers(result);
      } else {
        setError("Không thể tải dữ liệu người dùng")
      }
    } catch (err) {
      console.error("Error fetching users:", err)
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

  // Xử lý xóa người dùng
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedItem) return

    try {
      setIsDeleting(true)
      const result = await deleteUser(selectedItem.id)

      if (result && result.code === 1) {
        toast.success("Xóa người dùng thành công", {
          description: `Đã xóa người dùng ${selectedItem.username}`,
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
        // Tải lại dữ liệu
        await fetchData()
        setIsDeleteModalOpen(false)
      } else {
        toast.error(result?.message || "Xóa người dùng thất bại", {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
    } catch (err) {
      console.error("Error deleting user:", err)
      toast.error("Đã xảy ra lỗi khi xóa người dùng", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Xử lý xóa nhiều người dùng
  const handleBatchDelete = async (selectedRows: User[]) => {
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

  // Xử lý xóa nhiều người dùng
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  const confirmBatchDelete = async () => {
    if (!selectedItems.length) return

    try {
      setIsBatchDeleting(true)
      let successCount = 0
      let errorCount = 0

      // Xử lý từng người dùng
      for (const item of selectedItems) {
        try {
          const result = await deleteUser(item.id)
          if (result && result.code === 1) {
            successCount++
          } else {
            errorCount++
          }
        } catch (err) {
          console.error(`Error deleting user ${item.id}:`, err)
          errorCount++
        }
      }

      // Hiển thị thông báo
      if (successCount > 0) {
        toast.success(`Đã xóa ${successCount} người dùng thành công`, {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
      if (errorCount > 0) {
        toast.error(`Có ${errorCount} người dùng xóa thất bại`, {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }

      // Tải lại dữ liệu
      await fetchData()
      setIsBatchDeleteModalOpen(false)
      setSelectedItems([])
    } catch (err) {
      console.error("Error batch deleting users:", err)
      toast.error("Đã xảy ra lỗi khi xóa người dùng", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setIsBatchDeleting(false)
    }
  }

  // Xử lý xem chi tiết người dùng
  const handleViewDetails = async (id: number) => {
    try {
      const result = await getUserById(id)

      if (result) {
        setSelectedItem(result)
        setIsViewModalOpen(true)
      } else {
        setError("Không thể tải chi tiết người dùng")
      }
    } catch (err) {
      console.error("Error fetching user details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết người dùng")
    }
  }

  // Xử lý chỉnh sửa người dùng
  const handleEdit = async (id: number) => {
    try {
      const result = await getUserById(id)

      if (result && result.id) {
        console.log("Loaded user for edit:", result)
        setSelectedItem(result)
        setIsModalOpen(true)
      } else {
        console.error("Invalid user data received:", result)
        setError("Không thể tải chi tiết người dùng")
        toast.error("Không thể tải chi tiết người dùng", {
          description: "Dữ liệu người dùng không hợp lệ",
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
    } catch (err) {
      console.error("Error fetching user details:", err)
      setError("Đã xảy ra lỗi khi tải chi tiết người dùng")
      toast.error("Đã xảy ra lỗi", {
        description: "Đã xảy ra lỗi khi tải chi tiết người dùng",
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    }
  }

  // Xử lý đặt lại mật khẩu
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const handleResetPassword = (id: number) => {
    const userToReset = users.find(item => item.id === id);
    if (userToReset) {
      setSelectedItem(userToReset);
      setNewPassword("");
      setIsResetPasswordModalOpen(true);
    }
  }

  const confirmResetPassword = async () => {
    if (!selectedItem || !newPassword) return;

    try {
      setIsResettingPassword(true);
      const result = await updateUser(selectedItem.id, {
        username: selectedItem.username,
        email: selectedItem.email,
        password: newPassword,
        role_id: selectedItem.role_id || "2"
      });

      if (result && result.code === 1) {
        toast.success("Đặt lại mật khẩu thành công", {
          description: `Đã đặt lại mật khẩu cho người dùng ${selectedItem.username}`,
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        });
        setIsResetPasswordModalOpen(false);
      } else {
        toast.error(result?.message || "Đặt lại mật khẩu thất bại", {
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        });
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      toast.error("Đã xảy ra lỗi khi đặt lại mật khẩu", {
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

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
                  const itemToDelete = users.find(item => item.id === id);
                  if (itemToDelete) {
                    setSelectedItem(itemToDelete);
                    setIsDeleteModalOpen(true);
                  }
                },
                onResetPassword: handleResetPassword,
                onDeleteMany: handleBatchDelete
              })}
              data={users}
              searchColumn="username"
              searchPlaceholder="Tìm kiếm người dùng..."
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
                      Thêm người dùng
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
                  Bạn có chắc chắn muốn xóa người dùng "{selectedItem?.username}" không?
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
                  Bạn có chắc chắn muốn xóa {selectedItems.length} người dùng đã chọn không?
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
                    `Xóa ${selectedItems.length} người dùng`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal đặt lại mật khẩu */}
          <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">Đặt lại mật khẩu</DialogTitle>
                <DialogDescription className="text-base md:text-lg">
                  Nhập mật khẩu mới cho người dùng "{selectedItem?.username}"
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="newPassword" className="text-base font-medium mb-1.5 block">
                      Mật khẩu mới *
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex h-9 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Nhập mật khẩu mới"
                    />
                    {newPassword && newPassword.length < 6 && (
                      <p className="text-red-500 text-xs mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                >
                  Hủy
                </Button>
                <Button
                  onClick={confirmResetPassword}
                  disabled={isResettingPassword || !newPassword || newPassword.length < 6}
                  className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                >
                  {isResettingPassword ? (
                    <>
                      <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    "Đặt lại mật khẩu"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal xem chi tiết */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">Chi tiết người dùng</DialogTitle>
              </DialogHeader>
              {selectedItem && (
                <div className="space-y-6 h-auto overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Tên đăng nhập</p>
                      <p className="text-lg md:text-xl">{selectedItem.username}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Họ tên</p>
                      <p className="text-lg md:text-xl">{selectedItem.fullname || "-"}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Email</p>
                      <p className="text-lg md:text-xl">{selectedItem.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Vai trò</p>
                      <p className="text-lg md:text-xl">{selectedItem.role_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-gray-500">Trạng thái</p>
                      <p className="text-lg md:text-xl">
                        {selectedItem.status === 1 ? "Hoạt động" : "Vô hiệu hóa"}
                      </p>
                    </div>
                    {selectedItem.permissions && selectedItem.permissions.length > 0 && (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-base md:text-lg font-medium text-gray-500">Quyền hạn</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedItem.permissions.map((permission, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                              {permission}
                            </span>
                          ))}
                        </div>
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

          {/* Modal thêm/sửa người dùng */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[1200px] w-full p-2 md:p-6 overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">{selectedItem ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                <UserForm
                  mode={selectedItem ? "edit" : "add"}
                  initialData={selectedItem || undefined}
                  onSubmit={async (data: any) => {
                    try {
                      // Tải lại dữ liệu
                      await fetchData();
                      setIsModalOpen(false);
                    } catch (err) {
                      console.error("Error saving user:", err);
                      setError("Đã xảy ra lỗi khi lưu người dùng");
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
                    form="user-form"
                    className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Đang xử lý...
                      </>
                    ) : (
                      selectedItem ? "Cập nhật người dùng" : "Thêm người dùng"
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
