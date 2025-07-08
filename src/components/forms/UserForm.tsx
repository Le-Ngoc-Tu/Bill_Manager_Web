"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { createUser, updateUser, User, getRoles } from "@/lib/api/users"
import { toast } from "sonner"

// Định nghĩa Zod schema để validation
const userFormSchema = (mode: "add" | "edit" | "view") => {
  // Schema cơ bản cho cả thêm mới và chỉnh sửa
  const baseSchema = {
    username: z.string().min(1, "Tên đăng nhập là bắt buộc"),
    fullname: z.string().optional(),
    email: z.string().email("Email không hợp lệ"),
    role_id: z.string().min(1, "Vai trò là bắt buộc"),
  };

  // Thêm trường password nếu là thêm mới
  if (mode === "add") {
    return z.object({
      ...baseSchema,
      password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    });
  }

  // Không yêu cầu password khi chỉnh sửa
  return z.object(baseSchema);
}

// Type cho form values sẽ được xác định dựa trên schema
type UserFormValues = {
  username: string;
  fullname?: string;
  email: string;
  password?: string;
  role_id: string;
}

interface UserFormProps {
  mode: "add" | "edit" | "view"
  initialData?: User
  onSubmit: (data: any) => void
  onCancel: () => void
  stickyFooter?: boolean
}

export function UserForm({ mode, initialData, onSubmit, onCancel, stickyFooter = false }: UserFormProps) {
  const isViewMode = mode === "view"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roles, setRoles] = useState<any[]>([])

  // Form setup với react-hook-form và zod validation
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema(mode)),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: initialData
      ? {
          ...initialData,
          fullname: initialData.fullname || "",
        }
      : {
          username: "",
          fullname: "",
          email: "",
          password: "",
          role_id: "",
        }
  })

  // Lấy danh sách vai trò
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const result = await getRoles();
        if (Array.isArray(result)) {
          setRoles(result);
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
        setError("Không thể tải danh sách vai trò");
      }
    };

    fetchRoles();
  }, []);

  // Xử lý submit form
  const handleSubmit = async (values: UserFormValues) => {
    try {
      setLoading(true)
      setError(null)

      // Không cần xử lý trường password khi chỉnh sửa vì đã loại bỏ trường này khỏi form

      let result
      if (mode === "add") {
        // Tạo mới người dùng
        result = await createUser(values)

        if (result && result.code === 1) {
          toast.success("Thêm người dùng thành công", {
            description: `Đã thêm người dùng ${values.username} vào hệ thống`,
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          })
        } else {
          setError("Không thể tạo người dùng mới")
          toast.error("Không thể tạo người dùng mới", {
            description: result?.message || "Vui lòng kiểm tra lại thông tin",
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          })
          return
        }
      } else {
        // Cập nhật người dùng
        if (!initialData || !initialData.id) {
          setError("Không tìm thấy ID người dùng")
          toast.error("Không thể cập nhật người dùng", {
            description: "ID người dùng không hợp lệ",
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          })
          return
        }

        // Log ID để debug
        // console.log("Updating user with ID:", initialData.id)
        result = await updateUser(initialData.id, values)

        if (result && result.code === 1) {
          toast.success("Cập nhật người dùng thành công", {
            description: `Đã cập nhật người dùng ${values.username}`,
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          })
        } else {
          setError("Không thể cập nhật người dùng")
          toast.error("Không thể cập nhật người dùng", {
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
      console.error("Error submitting user form:", error)
      setError("Đã xảy ra lỗi khi lưu người dùng")
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
              mode === "add" ? "Thêm người dùng" : "Cập nhật người dùng"
            )}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <form id="user-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 md:space-y-6">
      {/* Hiển thị lỗi nếu có */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <Label htmlFor="username" className="text-base font-medium mb-1.5 block">Tên đăng nhập *</Label>
            <Input
              id="username"
              {...form.register("username")}
              className="h-9 md:h-10 text-sm"
              disabled={isViewMode || mode === "edit"} // Không cho phép sửa username khi edit
            />
            {form.formState.errors.username && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="fullname" className="text-base font-medium mb-1.5 block">Họ tên</Label>
            <Input
              id="fullname"
              {...form.register("fullname")}
              className="h-9 md:h-10 text-sm"
              disabled={isViewMode}
            />
            {form.formState.errors.fullname && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.fullname.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email" className="text-base font-medium mb-1.5 block">Email *</Label>
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

          {mode === "add" && (
            <div>
              <Label htmlFor="password" className="text-base font-medium mb-1.5 block">
                Mật khẩu *
              </Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                className="h-9 md:h-10 text-sm"
                disabled={isViewMode}
              />
              {form.formState.errors.password && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="role_id" className="text-base font-medium mb-1.5 block">Vai trò *</Label>
            <Select
              disabled={isViewMode}
              value={form.watch("role_id")}
              onValueChange={(value) => form.setValue("role_id", value)}
            >
              <SelectTrigger className="h-9 md:h-10 text-sm">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()} className="text-sm">
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.role_id && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.role_id.message}</p>
            )}
          </div>


        </div>
      </div>

      {/* Nếu không dùng sticky footer, hiển thị các nút trong form */}
      {!stickyFooter && renderFormFooter()}
    </form>
  )
}
