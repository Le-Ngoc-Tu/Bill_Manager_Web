"use client"

import { useEffect, useState } from "react"
import {
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
  IconMail,
  IconShield,
  IconRefresh,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import apiClient from "@/lib/api/config"
import { toast } from "sonner"

// Đảm bảo biến môi trường có giá trị mặc định
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7010/api'

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const { logout, user: authUser } = useAuth()
  const router = useRouter()
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [cachedUserInfo, setCachedUserInfo] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Sử dụng useEffect để lấy thông tin người dùng từ localStorage khi component mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        setCachedUserInfo(parsedUser)
        console.log("Đã tải thông tin người dùng từ localStorage:", parsedUser)
        console.log("Fullname từ localStorage:", parsedUser.fullname)
      }
    } catch (error) {
      console.error("Error reading user from localStorage:", error)
    }
  }, [])

  // Debug log để xem dữ liệu người dùng
  useEffect(() => {
    console.log("Auth User:", authUser)
    console.log("Auth User Fullname:", authUser?.fullname)
    console.log("Cached User:", cachedUserInfo)
    console.log("Cached User Fullname:", cachedUserInfo?.fullname)
    console.log("Default User:", user)
  }, [authUser, cachedUserInfo, user])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleOpenAccountDialog = () => {
    setShowAccountDialog(true)
  }

  // Hàm làm mới thông tin người dùng từ API
  const refreshUserInfo = async () => {
    if (!authUser?.id) {
      toast.error("Không thể làm mới thông tin người dùng")
      return
    }
    
    setRefreshing(true)
    try {
      const response = await apiClient.get(`/users/${authUser.id}`)
      const userData = response.data.data || response.data
      
      // Cập nhật dữ liệu người dùng trong localStorage
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
      const updatedUser = {
        ...currentUser,
        fullname: userData.fullname,
        email: userData.email,
        avatar: userData.avatar,
        role_name: userData.role_name,
        userDetailsLoaded: true
      }
      
      localStorage.setItem("user", JSON.stringify(updatedUser))
      setCachedUserInfo(updatedUser)
      
      toast.success("Đã làm mới thông tin người dùng")
    } catch (error) {
      console.error("Lỗi khi làm mới thông tin người dùng:", error)
      toast.error("Không thể làm mới thông tin người dùng")
    } finally {
      setRefreshing(false)
    }
  }

  // Hàm lấy URL avatar với kiểm tra null và undefined
  const getAvatarUrl = (avatarPath: string | null | undefined) => {
    if (!avatarPath) return null
    const baseUrl = BACKEND_URL.replace('/api', '')
    return `${baseUrl}/api/avatar/${avatarPath.split('/').pop()}`
  }

  // Ưu tiên sử dụng fullname và đảm bảo không sử dụng username nếu có fullname
  const getDisplayName = () => {
    // Ưu tiên fullname từ authUser
    if (authUser?.fullname) return authUser.fullname
    
    // Kiểm tra trong cachedUserInfo
    if (cachedUserInfo?.fullname) return cachedUserInfo.fullname
    
    // Fallback: Hiển thị từ prop user.name hoặc username nếu name không có
    return user.name || authUser?.username || cachedUserInfo?.username || "Chưa có thông tin"
  }

  // Lấy thông tin người dùng với ưu tiên cao cho fullname
  const userName = getDisplayName()
  const userEmail = authUser?.email || cachedUserInfo?.email || user.email
  const userAvatar = authUser?.avatar || cachedUserInfo?.avatar
  const avatarUrl = userAvatar ? getAvatarUrl(userAvatar) : user.avatar
  const userInitials = userName ? userName.substring(0, 2).toUpperCase() : "UN"

  return (
    <>
      <SidebarMenu className="mt-2 px-2">
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground py-2 sm:py-3"
              >
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg">
                  {avatarUrl ? (
                    <AvatarImage
                      src={avatarUrl}
                      alt={userName}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <AvatarFallback className="rounded-lg font-semibold text-sm sm:text-base avatar-gray">
                      {userInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium text-sm sm:text-base">
                    {userName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs sm:text-sm">
                    {userEmail}
                  </span>
                </div>
                <IconDotsVertical className="ml-auto size-4 sm:size-5" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg text-base"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-2 text-left">
                  <Avatar className="h-10 w-10 rounded-lg">
                    {avatarUrl ? (
                      <AvatarImage
                        src={avatarUrl}
                        alt={userName}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <AvatarFallback className="rounded-lg font-semibold text-base avatar-gray">
                        {userInitials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-medium text-base">
                      {userName}
                    </span>
                    <span className="text-muted-foreground truncate text-sm">
                      {userEmail}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="py-2.5"
                  onClick={handleOpenAccountDialog}
                >
                  <IconUserCircle className="mr-2 size-5" />
                  Tài khoản
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="py-2.5"
                  onClick={refreshUserInfo}
                  disabled={refreshing}
                >
                  <IconRefresh className={`mr-2 size-5 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Đang làm mới..." : "Làm mới thông tin"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 py-2.5"
              >
                <IconLogout className="mr-2 size-5" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Dialog hiển thị thông tin tài khoản */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Thông tin tài khoản</DialogTitle>
            <DialogDescription>
              Chi tiết thông tin tài khoản của bạn
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col space-y-4">
            <div className="flex items-center justify-center mb-4">
              <Avatar className="h-24 w-24 rounded-lg">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={userName}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <AvatarFallback className="rounded-lg text-2xl font-semibold avatar-gray">
                    {userInitials}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            <div className="flex items-center gap-2 py-1 border-b">
              <IconUserCircle className="size-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Tên người dùng</span>
                <span className="font-medium">{authUser?.username || cachedUserInfo?.username || user.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1 border-b">
              <IconUserCircle className="size-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Họ tên</span>
                <span className="font-medium">{userName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1 border-b">
              <IconMail className="size-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="font-medium">{userEmail}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1 border-b">
              <IconShield className="size-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Vai trò</span>
                <span className="font-medium">{authUser?.role_name || cachedUserInfo?.role_name || authUser?.role_id || cachedUserInfo?.role_id || "Người dùng"}</span>
              </div>
            </div>

            <Button onClick={refreshUserInfo} disabled={refreshing} className="w-full">
              <IconRefresh className={`mr-2 size-5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Đang làm mới..." : "Làm mới thông tin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
