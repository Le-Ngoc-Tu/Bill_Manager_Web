"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter } from "@/components/ui/dialog"
import { createCustomer, updateCustomer, Customer } from "@/lib/api/customers"
import { toast } from "sonner"

// Định nghĩa Zod schema để validation
const customerFormSchema = z.object({
  name: z.string().min(1, "Tên người mua là bắt buộc"),
  tax_code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  note: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

interface CustomerFormProps {
  mode: "add" | "edit" | "view"
  initialData?: Customer
  onSubmit: (data: any) => void
  onCancel: () => void
  stickyFooter?: boolean
}

export function CustomerForm({ mode, initialData, onSubmit, onCancel, stickyFooter = false }: CustomerFormProps) {
  const isViewMode = mode === "view"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form setup với react-hook-form và zod validation
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: initialData
      ? {
          ...initialData,
          tax_code: initialData.tax_code || "",
          address: initialData.address || "",
          phone: initialData.phone || "",
          email: initialData.email || "",
          note: initialData.note || "",
        }
      : {
          name: "",
          tax_code: "",
          address: "",
          phone: "",
          email: "",
          note: "",
        }
  })

  // Xử lý submit form
  const handleSubmit = async (values: CustomerFormValues) => {
    try {
      setLoading(true)
      setError(null)
      
      let result
      if (mode === "add") {
        // Tạo mới người mua
        result = await createCustomer(values)
        
        if (result && result.success) {
          toast.success("Thêm người mua thành công", {
            description: `Đã thêm người mua ${values.name} vào hệ thống`,
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          })
        } else {
          setError("Không thể tạo người mua mới")
          toast.error("Không thể tạo người mua mới", {
            description: result?.message || "Vui lòng kiểm tra lại thông tin",
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          })
          return
        }
      } else {
        // Cập nhật người mua
        if (!initialData) {
          setError("Không tìm thấy thông tin người mua")
          return
        }
        
        result = await updateCustomer(initialData.id, values)
        
        if (result && result.success) {
          toast.success("Cập nhật người mua thành công", {
            description: `Đã cập nhật người mua ${values.name}`,
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          })
        } else {
          setError("Không thể cập nhật người mua")
          toast.error("Không thể cập nhật người mua", {
            description: result?.message || "Vui lòng kiểm tra lại thông tin",
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          })
          return
        }
      }
      
      // Gọi callback onSubmit để cập nhật UI
      onSubmit(result.data || result)
    } catch (error: any) {
      console.error("Error submitting customer form:", error)
      setError("Đã xảy ra lỗi khi lưu người mua")
      toast.error("Đã xảy ra lỗi", {
        description: error.response?.data?.message || "Không thể xử lý yêu cầu. Vui lòng thử lại sau.",
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setLoading(false)
    }
  }

  const renderFormFooter = () => (
    <div className={stickyFooter ? "sticky bottom-0 bg-white py-2 border-t mt-4" : "mt-4 md:mt-6"}>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 md:gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
          onClick={onCancel}
        >
          {isViewMode ? "Đóng" : "Hủy"}
        </Button>
        {!isViewMode && (
          <Button
            type="submit"
            className="h-9 md:h-10 px-3 md:px-6 text-sm md:text-base w-full sm:w-auto"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Đang xử lý...
              </>
            ) : (
              mode === "add" ? "Thêm người mua" : "Cập nhật người mua"
            )}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <form id="customer-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 md:space-y-6">
      {/* Hiển thị lỗi nếu có */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-4 md:space-y-6">
        <div>
          <Label htmlFor="name" className="text-base font-medium mb-1.5 block">Tên người mua *</Label>
          <Input
            id="name"
            {...form.register("name")}
            className="h-9 md:h-10 text-sm"
            disabled={isViewMode}
          />
          {form.formState.errors.name && (
            <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="tax_code" className="text-base font-medium mb-1.5 block">Mã số thuế</Label>
          <Input
            id="tax_code"
            {...form.register("tax_code")}
            className="h-9 md:h-10 text-sm"
            disabled={isViewMode}
          />
          {form.formState.errors.tax_code && (
            <p className="text-red-500 text-xs mt-1">{form.formState.errors.tax_code.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address" className="text-base font-medium mb-1.5 block">Địa chỉ</Label>
          <Input
            id="address"
            {...form.register("address")}
            className="h-9 md:h-10 text-sm"
            disabled={isViewMode}
          />
          {form.formState.errors.address && (
            <p className="text-red-500 text-xs mt-1">{form.formState.errors.address.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone" className="text-base font-medium mb-1.5 block">Số điện thoại</Label>
          <Input
            id="phone"
            {...form.register("phone")}
            className="h-9 md:h-10 text-sm"
            disabled={isViewMode}
          />
          {form.formState.errors.phone && (
            <p className="text-red-500 text-xs mt-1">{form.formState.errors.phone.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-base font-medium mb-1.5 block">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            className="h-9 md:h-10 text-sm"
            disabled={isViewMode}
          />
          {form.formState.errors.email && (
            <p className="text-red-500 text-xs mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="note" className="text-base font-medium mb-1.5 block">Ghi chú</Label>
          <Textarea
            id="note"
            {...form.register("note")}
            className="min-h-[80px] text-sm"
            disabled={isViewMode}
          />
          {form.formState.errors.note && (
            <p className="text-red-500 text-xs mt-1">{form.formState.errors.note.message}</p>
          )}
        </div>
      </div>

      {/* Nếu không dùng sticky footer, hiển thị các nút trong form */}
      {!stickyFooter && renderFormFooter()}
    </form>
  )
}
