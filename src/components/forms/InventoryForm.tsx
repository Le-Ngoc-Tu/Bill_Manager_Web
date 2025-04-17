"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DialogFooter,
} from "@/components/ui/dialog"
import { createInventoryItem, updateInventoryItem } from "@/lib/api/inventory"
import { toast } from "sonner"

// Định nghĩa Zod schema để validation
const inventoryFormSchema = z.object({
  item_name: z.string().min(1, "Tên hàng hóa là bắt buộc"),
  unit: z.string().min(1, "Đơn vị tính là bắt buộc"),
  quantity: z.coerce.number().min(0, "Số lượng không được âm"),
  category: z.enum(["HH", "CP"], {
    required_error: "Loại là bắt buộc"
  }),
})

type InventoryFormValues = z.infer<typeof inventoryFormSchema>

interface InventoryFormProps {
  mode: "add" | "edit"
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function InventoryForm({ mode, initialData, onSubmit, onCancel }: InventoryFormProps) {
  const [loading, setLoading] = useState(false)

  // Form setup với react-hook-form và zod validation
  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: initialData
      ? {
          ...initialData,
          quantity: Number(initialData.quantity) || 0,
        }
      : {
          item_name: "",
          unit: "",
          quantity: 0,
          category: "HH",
        }
  })

  // Xử lý submit form
  const handleSubmit = async (values: InventoryFormValues) => {
    try {
      setLoading(true)

      let result
      if (mode === "add") {
        // Tạo mới hàng hóa
        result = await createInventoryItem(values)
        toast.success("Thêm hàng hóa thành công", {
          description: `Đã thêm hàng hóa ${values.item_name} vào hệ thống`
        })
      } else {
        // Cập nhật hàng hóa
        result = await updateInventoryItem(initialData.id, values)
        toast.success("Cập nhật hàng hóa thành công", {
          description: `Đã cập nhật hàng hóa ${values.item_name}`
        })
      }

      // Gọi callback onSubmit để cập nhật UI
      onSubmit(result.data || result)
    } catch (error: any) {
      console.error("Error submitting inventory form:", error)
      toast.error("Có lỗi xảy ra", {
        description: error.response?.data?.message || "Không thể xử lý yêu cầu. Vui lòng thử lại sau."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 md:space-y-8">
      <div className="space-y-6 md:space-y-8">
        <div>
          <Label htmlFor="item_name" className="text-base md:text-lg font-medium mb-3 md:mb-4 block">Tên hàng hóa *</Label>
          <Input
            id="item_name"
            {...form.register("item_name")}
            className="h-12 md:h-14 text-base md:text-lg"
          />
          {form.formState.errors.item_name && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.item_name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="unit" className="text-base md:text-lg font-medium mb-3 md:mb-4 block">Đơn vị tính *</Label>
          <Input
            id="unit"
            {...form.register("unit")}
            className="h-12 md:h-14 text-base md:text-lg"
          />
          {form.formState.errors.unit && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.unit.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="category" className="text-base md:text-lg font-medium mb-3 md:mb-4 block">Loại *</Label>
          <Select
            defaultValue={form.getValues("category")}
            onValueChange={(value) => form.setValue("category", value as "HH" | "CP")}
          >
            <SelectTrigger className="h-12 md:h-14 text-base md:text-lg">
              <SelectValue placeholder="Chọn loại" />
            </SelectTrigger>
            <SelectContent className="text-base md:text-lg">
              <SelectItem value="HH" className="text-base md:text-lg">Hàng hóa</SelectItem>
              <SelectItem value="CP" className="text-base md:text-lg">Chi phí</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.category && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.category.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="quantity" className="text-base md:text-lg font-medium mb-3 md:mb-4 block">Số lượng *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            min="0"
            {...form.register("quantity")}
            className="h-12 md:h-14 text-base md:text-lg"
          />
          {form.formState.errors.quantity && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.quantity.message}</p>
          )}
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-4 sm:gap-4 md:gap-6 mt-6 md:mt-8">
        <Button
          type="button"
          variant="outline"
          className="h-12 md:h-14 px-6 md:px-10 text-base md:text-lg w-full sm:w-auto"
          onClick={onCancel}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          className="h-12 md:h-14 px-6 md:px-10 text-base md:text-lg w-full sm:w-auto"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Đang xử lý...
            </>
          ) : (
            mode === "add" ? "Thêm hàng hóa" : "Cập nhật hàng hóa"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
