"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    // Đợi cho quá trình kiểm tra trạng thái đăng nhập hoàn tất
    if (!loading) {
      setRedirecting(true)
      if (user) {
        // Nếu đã đăng nhập, chuyển hướng đến trang imports
        router.push("/dashboard/imports")
      } else {
        // Nếu chưa đăng nhập, chuyển hướng đến trang login
        router.push("/login")
      }
    }
  }, [loading, user, router])

  // Hiển thị màn hình loading trong khi kiểm tra trạng thái đăng nhập
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="mt-4 text-sm text-muted-foreground">
        {loading ? "Đang kiểm tra đăng nhập..." : "Đang chuyển hướng..."}
      </p>
    </div>
  )
}
