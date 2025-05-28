"use client"

import { type Icon } from "@tabler/icons-react"
import { IconType } from "react-icons"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon | IconType
  }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeItem, setActiveItem] = useState<string | null>(null)

  // Cập nhật active item dựa trên đường dẫn hiện tại
  useEffect(() => {
    const currentPath = pathname || ""
    const matchedItem = items.find(item => currentPath.includes(item.url))
    setActiveItem(matchedItem?.url || null)
  }, [pathname, items])

  // Hàm xử lý khi nhấn vào menu item
  const handleNavigation = (url: string) => {
    setActiveItem(url)
    router.push(url)
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-4 px-0">
        <SidebarMenu className="py-1">
          {items.map((item) => {
            const isActive = activeItem === item.url

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  className={`group py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-5 text-base sm:text-xl md:text-2xl w-full transition-all duration-300 rounded-md
                    ${isActive
                      ? "bg-red-700 text-white hover:bg-red-700 hover:text-white"
                      : "hover:bg-red-400/70 hover:text-white active:bg-red-700 active:text-white"
                    }`}
                  onClick={() => handleNavigation(item.url)}
                >
                  {item.icon && <item.icon className="size-5 sm:size-6 md:size-7 mr-2 sm:mr-3 transition-colors duration-300" />}
                  <span className="text-sm sm:text-base md:text-[18px] transition-colors duration-300">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
