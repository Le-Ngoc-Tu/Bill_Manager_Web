import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      <p className="text-lg font-medium text-gray-600">Đang tải hóa đơn xuất kho...</p>
    </div>
  )
}
