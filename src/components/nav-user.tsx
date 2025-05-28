"use client"

import { useEffect, useState } from "react"
import {
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
  IconMail,
  IconShield,
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

  // Sử dụng useEffect để lấy thông tin người dùng từ localStorage khi component mount
  useEffect(() => {
    // Chỉ lấy từ localStorage nếu authUser không có sẵn
    if (!authUser?.fullname && !cachedUserInfo) {
      try {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          setCachedUserInfo(parsedUser)
          console.log("Đã tải thông tin người dùng từ localStorage:", parsedUser)
        }
      } catch (error) {
        console.error("Error reading user from localStorage:", error)
      }
    }
  }, [authUser])

  // Debug log để xem dữ liệu người dùng
  useEffect(() => {
    console.log("Auth User:", authUser)
    console.log("Cached User:", cachedUserInfo)
    console.log("Default User:", user)
  }, [authUser, cachedUserInfo, user])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleOpenAccountDialog = () => {
    setShowAccountDialog(true)
  }

  // Hàm lấy URL avatar với kiểm tra null và undefined
  const getAvatarUrl = (avatarPath: string | null | undefined) => {
    if (!avatarPath) return null
    const baseUrl = BACKEND_URL.replace('/api', '')
    return `${baseUrl}/api/avatar/${avatarPath.split('/').pop()}`
  }

  // Lấy thông tin người dùng ưu tiên từ authUser, sau đó từ cache, cuối cùng từ prop
  const userName = authUser?.fullname || cachedUserInfo?.fullname || user.name
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
