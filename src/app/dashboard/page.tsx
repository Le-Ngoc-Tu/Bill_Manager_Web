"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Luôn chuyển về trang đăng nhập nếu chưa đăng nhập
    if (!loading && !user) {
      router.push("/login")
    } else if (!loading && user) {
      // Chuyển hướng đến trang imports khi đã đăng nhập
      router.push("/dashboard/imports")
    }
  }, [loading, user, router])

  // Hiển thị màn hình loading trong khi chuyển hướng
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="mt-4 text-lg">Đang chuyển hướng...</p>
    </div>
  )
}
