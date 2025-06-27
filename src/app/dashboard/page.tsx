"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    // Chuyển hướng đến trang imports khi truy cập dashboard root
    router.push("/dashboard/imports")
  }, [router])

  // Hiển thị màn hình loading trong khi chuyển hướng
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="mt-4 text-lg">Đang chuyển hướng...</p>
    </div>
  )
}
