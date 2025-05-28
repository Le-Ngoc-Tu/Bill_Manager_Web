"use client"

import * as React from "react"
import Image from "next/image"
import { FaFileInvoice, FaFileExport, FaBoxOpen, FaUserTie, FaUsers, FaUserCog, FaHistory, FaChartBar } from "react-icons/fa"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth"
import { useIsMobile } from "@/hooks/use-mobile"

const data = {
  navMain: [
    {
      title: "Hóa đơn nhập kho",
      url: "/dashboard/imports",
      icon: FaFileInvoice,
    },
    {
      title: "Hóa đơn xuất kho",
      url: "/dashboard/exports",
      icon: FaFileExport,
    },
    {
      title: "Quản lý hàng hóa",
      url: "/dashboard/inventory",
      icon: FaBoxOpen,
    },
    {
      title: "Quản lý người bán",
      url: "/dashboard/suppliers",
      icon: FaUserTie,
    },
    {
      title: "Quản lý người mua",
      url: "/dashboard/customers",
      icon: FaUsers,
    },
    {
      title: "Quản lý người dùng",
      url: "/dashboard/users",
      icon: FaUserCog,
    },
    {
      title: "Báo cáo chi phí",
      url: "/dashboard/reports/expenses",
      icon: FaChartBar,
    },
    {
      title: "Lịch sử",
      url: "/dashboard/history",
      icon: FaHistory,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [userInfo, setUserInfo] = React.useState({
    name: "Admin",
    email: "admin@nltech.vn",
    avatar: "/NLTECH.png",
  })

  // Sử dụng useEffect để chỉ cập nhật thông tin người dùng khi user thay đổi
  // hoặc khi component được mount lần đầu
  React.useEffect(() => {
    if (user) {
      // Lưu thông tin người dùng vào state
      setUserInfo({
        name: user.username || "Admin",
        email: user.username ? `${user.username}@nltech.vn` : "admin@nltech.vn",
        avatar: "/NLTECH.png",
      })
    }
  }, [user?.id]) // Chỉ chạy lại khi user.id thay đổi, không phải toàn bộ user object

  return (
    <Sidebar
      collapsible="offcanvas"
      className="text-sm md:text-base lg:text-lg"
      {...props}
    >
      <SidebarHeader className="border-b pb-2 pt-2">
        <div className="flex flex-col items-center gap-2 px-3">
          <Image
            src="/NLTECH.png"
            alt="NLTECH Logo"
            width={60}
            height={60}
            className="mb-2"
          />
        </div>
        <NavUser user={userInfo} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="py-1 text-center text-sm text-muted-foreground">
        © NLTECH {new Date().getFullYear()}
      </SidebarFooter>
    </Sidebar>
  )
}
