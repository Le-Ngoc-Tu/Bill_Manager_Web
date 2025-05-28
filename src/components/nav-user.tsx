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
        }
      } catch (error) {
        console.error("Error reading user from localStorage:", error)
      }
    }
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleOpenAccountDialog = () => {
    setShowAccountDialog(true)
  }

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
                  {authUser?.avatar || cachedUserInfo?.avatar ? (
                    <AvatarImage
                      src={`${process.env.NEXT_PUBLIC_BACKEND_URL.replace('/api', '')}/api/avatar/${(authUser?.avatar || cachedUserInfo?.avatar).split('/').pop()}`}
                      alt={authUser?.fullname || cachedUserInfo?.fullname || user.name}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <AvatarImage
                      src={user.avatar}
                      alt={authUser?.fullname || cachedUserInfo?.fullname || user.name}
                    />
                  )}
                  <AvatarFallback className="rounded-lg font-semibold text-sm sm:text-base avatar-gray">
                    {(authUser?.fullname || cachedUserInfo?.fullname || user.name).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium text-sm sm:text-base">
                    {authUser?.fullname || cachedUserInfo?.fullname || user.name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs sm:text-sm">
                    {authUser?.email || cachedUserInfo?.email || user.email}
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
                    {authUser?.avatar || cachedUserInfo?.avatar ? (
                      <AvatarImage
                        src={`${process.env.NEXT_PUBLIC_BACKEND_URL.replace('/api', '')}/api/avatar/${(authUser?.avatar || cachedUserInfo?.avatar).split('/').pop()}`}
                        alt={authUser?.fullname || cachedUserInfo?.fullname || user.name}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <AvatarImage
                        src={user.avatar}
                        alt={authUser?.fullname || cachedUserInfo?.fullname || user.name}
                      />
                    )}
                    <AvatarFallback className="rounded-lg font-semibold text-base avatar-gray">
                      {(authUser?.fullname || cachedUserInfo?.fullname || user.name).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-medium text-base">
                      {authUser?.fullname || cachedUserInfo?.fullname || user.name}
                    </span>
                    <span className="text-muted-foreground truncate text-sm">
                      {authUser?.email || cachedUserInfo?.email || user.email}
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
                {authUser?.avatar || cachedUserInfo?.avatar ? (
                  <AvatarImage
                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL.replace('/api', '')}/api/avatar/${(authUser?.avatar || cachedUserInfo?.avatar).split('/').pop()}`}
                    alt={authUser?.fullname || cachedUserInfo?.fullname || user.name}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <AvatarImage
                    src={user.avatar}
                    alt={authUser?.fullname || cachedUserInfo?.fullname || user.name}
                  />
                )}
                <AvatarFallback className="rounded-lg text-2xl font-semibold avatar-gray">
                  {(authUser?.fullname || cachedUserInfo?.fullname || user.name).substring(0, 2).toUpperCase()}
                </AvatarFallback>
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
                <span className="font-medium">{authUser?.fullname || cachedUserInfo?.fullname || user.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1 border-b">
              <IconMail className="size-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="font-medium">{authUser?.email || cachedUserInfo?.email || user.email}</span>
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
