"use client"

import { useLinkStatus } from "next/link"
import { Loader2 } from "lucide-react"

/**
 * Navigation Loading Indicator Component
 * Hiển thị loading state khi đang navigate giữa các trang
 */
export function NavigationLoading() {
  const { pending } = useLinkStatus()

  if (!pending) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-red-500 to-red-600">
      <div className="h-full bg-gradient-to-r from-red-600 to-red-700 animate-pulse" />
    </div>
  )
}

/**
 * Inline Loading Indicator for Navigation Links
 * Hiển thị spinner nhỏ bên cạnh text khi đang navigate
 */
export function InlineNavigationLoading() {
  const { pending } = useLinkStatus()

  if (!pending) return null

  return (
    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
  )
}

/**
 * Page Loading Overlay
 * Hiển thị overlay loading cho toàn bộ trang
 */
export function PageLoadingOverlay() {
  const { pending } = useLinkStatus()

  if (!pending) return null

  return (
    <div className="fixed inset-0 z-40 bg-white/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-3">
        <Loader2 className="h-6 w-6 animate-spin text-red-600" />
        <span className="text-lg font-medium text-gray-900">Đang tải...</span>
      </div>
    </div>
  )
}
