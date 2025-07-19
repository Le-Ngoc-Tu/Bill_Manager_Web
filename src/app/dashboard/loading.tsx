import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-red-600" />
      <p className="text-xl font-medium text-gray-600">Đang tải dashboard...</p>
    </div>
  )
}
