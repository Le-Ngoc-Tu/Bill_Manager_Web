"use client"

import { useAuth } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const [pageReady, setPageReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard/imports")
      } else {
        setPageReady(true)
      }
    }
  }, [loading, user, router])

  if (!pageReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-lg ml-3">Đang kiểm tra đăng nhập...</p>
      </div>
    )
  }

  return <LoginForm />
}
