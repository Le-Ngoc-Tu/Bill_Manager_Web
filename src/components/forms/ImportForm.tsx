"use client"

import { useState, useEffect } from "react"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { FaPlus, FaTrash, FaPlusCircle, FaEdit } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Combobox } from "@/components/ui/combobox"
import { formatCurrency } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

// Import các kiểu dữ liệu và API từ lib
import type { Supplier } from "@/lib/api/suppliers"
import type { Inventory } from "@/lib/api/inventory"
import { createSupplier, getSuppliers } from "@/lib/api/suppliers"
import { createInventoryItem, getInventoryItems } from "@/lib/api/inventory"
import { addImportDetail, updateImportDetail, deleteImportDetail } from "@/lib/api/imports"

// Định nghĩa Zod schema để validation
const importDetailSchema = z.object({
  id: z.number().optional(),
  category: z.enum(["HH", "CP"]).optional().default("HH"),
  inventory_id: z.number().nullable().optional(),
  supplier_id: z.number().nullable().optional(),
  item_name: z.string().min(1, "Tên hàng hóa là bắt buộc"),
  unit: z.string().optional().default(""),
  quantity: z.coerce.number().min(0.001, "Số lượng phải lớn hơn 0"),
  price_before_tax: z.coerce.number().min(0, "Đơn giá không được âm"),
  tax_rate: z.string().default("0%"),
  seller_name: z.string().optional(),
  seller_tax_code: z.string().optional(),
  // Thêm các trường tính toán
  total_before_tax: z.number().optional(),
  tax_amount: z.number().optional(),
  total_after_tax: z.number().optional(),
})

const importFormSchema = z.object({
  invoice_number: z.string().min(1, "Số hóa đơn là bắt buộc"),
  invoice_date: z.date({
    required_error: "Ngày lập hóa đơn là bắt buộc"
  }),
  description: z.string().optional(),
  note: z.string().optional(),
  details: z.array(importDetailSchema).min(1, "Phải có ít nhất một mặt hàng"),
})

const supplierFormSchema = z.object({
  name: z.string().min(1, "Tên nhà cung cấp là bắt buộc"),
  tax_code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
})

const inventoryFormSchema = z.object({
  item_name: z.string().min(1, "Tên hàng hóa là bắt buộc"),
  unit: z.string().min(1, "Đơn vị tính là bắt buộc"),
  quantity: z.coerce.number().min(0, "Số lượng không được âm"),
  category: z.enum(["HH", "CP"], {
    required_error: "Loại là bắt buộc"
  }),
})

type ImportFormValues = z.infer<typeof importFormSchema>
type SupplierFormValues = z.infer<typeof supplierFormSchema>
type InventoryFormValues = z.infer<typeof inventoryFormSchema>

interface ImportFormProps {
  mode: "add" | "edit" | "view"
  initialData?: any
  onSubmit: (data: ImportFormValues) => void
  onCancel: () => void
}

export function ImportForm({ mode, initialData, onSubmit, onCancel }: ImportFormProps) {
  const isViewMode = mode === "view"
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  // Không cần lưu trữ danh sách lọc nữa vì đã sử dụng Combobox
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // State cho modal thêm mới
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false)
  const [currentDetailIndex, setCurrentDetailIndex] = useState<number | null>(null)

  // State để theo dõi hàng đang được chỉnh sửa
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)

  // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1)
  // State để lưu trữ danh sách các chi tiết đã đánh dấu xóa
  const [deletedDetails, setDeletedDetails] = useState<any[]>([])
  const itemsPerPage = 7

  // Tham chiếu cho combobox - hiện tại không sử dụng nhưng giữ lại cho tương thích trong tương lai

  // Khai báo form cho thêm mới supplier và inventory
  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    mode: "onSubmit", // Chỉ validate khi submit form
    reValidateMode: "onSubmit", // Chỉ validate lại khi submit form
    defaultValues: {
      name: "",
      tax_code: "",
      address: "",
      phone: "",
      email: "",
    }
  })

  const inventoryForm = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    mode: "onSubmit", // Chỉ validate khi submit form
    reValidateMode: "onSubmit", // Chỉ validate lại khi submit form
    defaultValues: {
      item_name: "",
      unit: "",
      quantity: 0,
      category: "HH",
    }
  })

  // Form setup với react-hook-form và zod validation
  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema) as any,
    mode: "onSubmit", // Chỉ validate khi submit form
    reValidateMode: "onSubmit", // Chỉ validate lại khi submit form
    defaultValues: initialData
      ? {
          ...initialData,
          invoice_date: initialData.invoice_date ? new Date(initialData.invoice_date) : new Date(),
          details: initialData.details?.map((d: any) => {
            console.log('Processing detail in defaultValues:', d);
            return {
              ...d,
              quantity: Number(d.quantity) || 0,
              price_before_tax: Number(d.price_before_tax) || 0,
              tax_rate: d.tax_rate || "0%", // Đảm bảo tax_rate luôn có giá trị
            };
          }) || [],
        }
      : {
          invoice_number: "",
          invoice_date: new Date(),
          description: "",
          note: "",
          details: [
            {
              category: "HH",
              item_name: "",
              unit: "",
              quantity: "",
              price_before_tax: "",
              tax_rate: "0%",
              supplier_id: null,
              inventory_id: null,
              total_before_tax: 0,
              tax_amount: 0,
              total_after_tax: 0,
            },
          ],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "details",
  })

  // Tính toán thông tin phân trang
  const totalPages = Math.ceil(fields.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = fields.slice(indexOfFirstItem, indexOfLastItem)

  // Reset isSubmitted khi form được reset
  useEffect(() => {
    setIsSubmitted(false);
  }, [form.formState.isSubmitSuccessful]);

  // Tính toán tổng tiền cho tất cả các dòng khi form được tải
  useEffect(() => {
    fields.forEach((_, index) => {
      calculateDetailTotals(index)
    })
  }, [fields.length])

  // Xử lý chuyển trang
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  // Reset isSubmitted khi component được mount
  useEffect(() => {
    setIsSubmitted(false);
  }, []);

  // Fetch suppliers và inventory items từ API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch suppliers sử dụng API đã tách
        const suppliersResult = await getSuppliers()
        if (suppliersResult && suppliersResult.success) {
          const suppliersData = suppliersResult.data || []
          setSuppliers(suppliersData)
        }

        // Fetch inventory items sử dụng API đã tách
        // Chỉ lấy hàng hóa loại HH cho combobox
        const inventoryResult = await getInventoryItems(true)
        if (inventoryResult && inventoryResult.success) {
          setInventoryItems(inventoryResult.data || [])
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Đã xảy ra lỗi khi tải dữ liệu")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Hàm xử lý xóa lỗi khi người dùng thay đổi giá trị
  const handleDetailFieldChange = (index: number) => {
    // Xóa lỗi của chi tiết cụ thể
    form.clearErrors(`details.${index}`)

    // Xóa lỗi chung của details nếu có
    if (form.formState.errors.details) {
      form.clearErrors("details")
    }
  }

  // Tính toán tổng tiền cho từng dòng
  const calculateDetailTotals = (index: number) => {
    const details = form.getValues("details")
    const detail = details[index]

    if (!detail) return

    // Chuyển đổi giá trị sang số (hỗ trợ cả chuỗi và số)
    let quantity = 0;
    const qtyValue = detail.quantity as any;
    if (qtyValue !== undefined && qtyValue !== null) {
      if (typeof qtyValue === 'string') {
        if (qtyValue === "" || qtyValue === ".") {
          quantity = 0;
        } else {
          // Giá trị đã là chuỗi số với dấu chấm
          quantity = parseFloat(qtyValue) || 0;
        }
      } else {
        quantity = Number(qtyValue) || 0;
      }
    }

    let priceBeforeTax = 0;
    const priceValue = detail.price_before_tax as any;
    if (priceValue !== undefined && priceValue !== null) {
      if (typeof priceValue === 'string') {
        if (priceValue === "" || priceValue === ".") {
          priceBeforeTax = 0;
        } else {
          // Giá trị đã là chuỗi số với dấu chấm
          priceBeforeTax = parseFloat(priceValue) || 0;
        }
      } else {
        priceBeforeTax = Number(priceValue) || 0;
      }
    }

    // Xử lý trường hợp KCT (Không chịu thuế)
    let taxRate = 0
    if (detail.tax_rate !== "KCT") {
      taxRate = Number(detail.tax_rate?.replace("%", "")) || 0
    }

    const totalBeforeTax = quantity * priceBeforeTax
    const taxAmount = (totalBeforeTax * taxRate) / 100
    const totalAfterTax = totalBeforeTax + taxAmount

    // Update the calculated fields - làm tròn đến 3 chữ số thập phân khi hiển thị
    form.setValue(`details.${index}.total_before_tax`, roundToThreeDecimals(totalBeforeTax))
    form.setValue(`details.${index}.tax_amount`, roundToThreeDecimals(taxAmount))
    form.setValue(`details.${index}.total_after_tax`, roundToThreeDecimals(totalAfterTax))

    // Force re-render to update displayed values
    form.trigger(`details.${index}`)
  }

  // Hàm này không còn sử dụng, thay thế bằng handleInventoryChange

  // Hàm này không còn sử dụng, thay thế bằng handleSupplierChange

  // Xử lý khi người dùng nhập hoặc chọn hàng hóa
  const handleInventoryChange = (value: string, index: number) => {
    console.log(`handleInventoryChange called with value:`, value, 'for index:', index);

    // Kiểm tra xem giá trị có phải là ID của hàng hóa hiện có không
    const matchedItem = inventoryItems.find(item => item.id.toString() === value)

    if (matchedItem) {
      console.log(`Matched existing inventory item by ID:`, matchedItem);
      // Nếu là hàng hóa hiện có, sử dụng thông tin của hàng hóa đó

      // Đối với cả hàng hóa (HH) và chi phí (CP), lưu ID để có thể cập nhật
      form.setValue(`details.${index}.inventory_id`, matchedItem.id)
      form.setValue(`details.${index}.item_name`, matchedItem.item_name) // Lưu tên hàng hóa, không phải ID
      form.setValue(`details.${index}.unit`, matchedItem.unit)
      form.setValue(`details.${index}.category`, matchedItem.category)
    } else {
      // Kiểm tra xem value có phải là ID không
      const isNumeric = /^\d+$/.test(value);

      if (isNumeric) {
        console.log(`Value appears to be an ID but no matching item found:`, value);
        // Nếu là ID nhưng không tìm thấy hàng hóa, đặt inventory_id = null
        form.setValue(`details.${index}.inventory_id`, null)
        // Giữ nguyên item_name hiện tại nếu có
        const currentItemName = form.getValues(`details.${index}.item_name`);
        if (!currentItemName) {
          form.setValue(`details.${index}.item_name`, "");
        }
      } else {
        // Nếu là hàng hóa mới, sử dụng giá trị nhập vào làm tên hàng hóa
        // Kiểm tra xem có phải là tên hàng hóa hiện có không
        const matchedByName = inventoryItems.find(
          item => item.item_name.toLowerCase() === value.toLowerCase()
        )

        if (matchedByName) {
          console.log(`Matched existing inventory item by name:`, matchedByName);
          // Nếu tìm thấy hàng hóa theo tên, sử dụng thông tin của hàng hóa đó
          form.setValue(`details.${index}.inventory_id`, matchedByName.id)
          form.setValue(`details.${index}.item_name`, matchedByName.item_name)
          form.setValue(`details.${index}.unit`, matchedByName.unit)
          form.setValue(`details.${index}.category`, matchedByName.category)
        } else {
          console.log(`Creating new inventory item with name:`, value);
          // Nếu không tìm thấy, sử dụng giá trị nhập vào làm tên hàng hóa mới
          form.setValue(`details.${index}.inventory_id`, null)
          form.setValue(`details.${index}.item_name`, value)
          // Để người dùng nhập đơn vị tính và chọn loại
          if (!form.getValues(`details.${index}.unit`)) {
            form.setValue(`details.${index}.unit`, "")
          }
        }
      }
    }

    // Ghi log giá trị cuối cùng
    console.log(`Final values for row ${index}:`, {
      inventory_id: form.getValues(`details.${index}.inventory_id`),
      item_name: form.getValues(`details.${index}.item_name`),
      unit: form.getValues(`details.${index}.unit`),
      category: form.getValues(`details.${index}.category`)
    });

    handleDetailFieldChange(index)
  }

  // Xử lý khi người dùng nhập vào ô tìm kiếm hàng hóa
  const handleInventoryInputChange = (_value: string, _index: number) => {
    // Không cần làm gì đặc biệt khi người dùng nhập, vì sẽ xử lý khi người dùng chọn hoặc đóng combobox
  }

  // Xử lý khi người dùng nhập hoặc chọn nhà cung cấp
  const handleSupplierChange = (value: string, index: number) => {
    // Kiểm tra xem giá trị có phải là ID của nhà cung cấp hiện có không
    const matchedSupplier = suppliers.find(supplier => supplier.id.toString() === value)

    if (matchedSupplier) {
      // Nếu là nhà cung cấp hiện có, sử dụng thông tin của nhà cung cấp đó
      form.setValue(`details.${index}.supplier_id`, matchedSupplier.id)
      form.setValue(`details.${index}.seller_name`, matchedSupplier.name)
      form.setValue(`details.${index}.seller_tax_code`, matchedSupplier.tax_code || "")
    } else {
      // Nếu là nhà cung cấp mới, sử dụng giá trị nhập vào làm tên nhà cung cấp
      // Kiểm tra xem có phải là tên nhà cung cấp hiện có không
      const matchedByName = suppliers.find(
        supplier => supplier.name.toLowerCase() === value.toLowerCase()
      )

      if (matchedByName) {
        // Nếu tìm thấy nhà cung cấp theo tên, sử dụng thông tin của nhà cung cấp đó
        form.setValue(`details.${index}.supplier_id`, matchedByName.id)
        form.setValue(`details.${index}.seller_name`, matchedByName.name)
        form.setValue(`details.${index}.seller_tax_code`, matchedByName.tax_code || "")
      } else {
        // Nếu không tìm thấy, sử dụng giá trị nhập vào làm tên nhà cung cấp mới
        form.setValue(`details.${index}.supplier_id`, null)
        form.setValue(`details.${index}.seller_name`, value)
        form.setValue(`details.${index}.seller_tax_code`, "")
      }
    }

    handleDetailFieldChange(index)
  }

  // Xử lý khi người dùng nhập vào ô tìm kiếm nhà cung cấp
  const handleSupplierInputChange = (_value: string, _index: number) => {
    // Không cần làm gì đặc biệt khi người dùng nhập, vì sẽ xử lý khi người dùng chọn hoặc đóng combobox
  }

  // Xử lý thêm mới nhà cung cấp
  const handleAddSupplier = async (data: SupplierFormValues) => {
    try {
      setLoading(true)
      const result = await createSupplier(data)

      if (result && result.success) {
        const newSupplier = result.data

        // Cập nhật danh sách nhà cung cấp
        const updatedSuppliers = [...suppliers, newSupplier]
        setSuppliers(updatedSuppliers)

        // Áp dụng nhà cung cấp vừa tạo vào dòng hiện tại
        if (currentDetailIndex !== null) {
          handleSupplierChange(newSupplier.id.toString(), currentDetailIndex)
        }

        setIsSupplierModalOpen(false)
        supplierForm.reset()

        // Hiển thị thông báo thành công
        toast.success("Thêm nhà cung cấp thành công", {
          description: `Đã thêm nhà cung cấp ${newSupplier.name} vào hệ thống`,
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      } else {
        setError("Không thể tạo nhà cung cấp mới")
        toast.error("Không thể tạo nhà cung cấp mới", {
          description: result?.message || "Vui lòng kiểm tra lại thông tin",
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
    } catch (err) {
      console.error("Error adding supplier:", err)
      setError("Đã xảy ra lỗi khi tạo nhà cung cấp mới")
      toast.error("Đã xảy ra lỗi", {
        description: "Đã xảy ra lỗi khi tạo nhà cung cấp mới",
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setLoading(false)
    }
  }

  // Xử lý thêm mới hàng hóa (chỉ hiển thị trong bảng, không lưu vào cơ sở dữ liệu)
  const handleAddInventory = async (data: InventoryFormValues) => {
    try {
      setLoading(true)

      console.log('Adding inventory item to table:', data);

      // Tạo một đối tượng hàng hóa tạm thời
      const tempInventory = {
        id: null, // Không có ID vì chưa lưu vào cơ sở dữ liệu
        item_name: data.item_name,
        unit: data.unit,
        quantity: data.quantity,
        category: data.category,
        price: data.category === 'CP' ? form.getValues(`details.${currentDetailIndex}.price_before_tax`) || 0 : 0
      };

      // Áp dụng hàng hóa vào dòng hiện tại
      if (currentDetailIndex !== null) {
        // Reset các giá trị trước khi áp dụng hàng hóa mới
        form.setValue(`details.${currentDetailIndex}.price_before_tax`, tempInventory.price)
        form.setValue(`details.${currentDetailIndex}.tax_rate`, "10%")

        // Áp dụng hàng hóa mới và cập nhật đơn vị tính trực tiếp
        // Đặt inventory_id = null vì chưa lưu vào cơ sở dữ liệu
        // Khi nhấn nút "Thêm hóa đơn", hệ thống sẽ tạo hàng hóa mới và lưu ID
        form.setValue(`details.${currentDetailIndex}.inventory_id`, null)
        form.setValue(`details.${currentDetailIndex}.item_name`, tempInventory.item_name)
        form.setValue(`details.${currentDetailIndex}.unit`, tempInventory.unit)
        form.setValue(`details.${currentDetailIndex}.category`, tempInventory.category)

        // Đối với chi phí, sử dụng số lượng đã nhập trong form thêm hàng hóa
        if (data.category === 'CP' && data.quantity > 0) {
          console.log(`Setting quantity for expense item to ${data.quantity}`);
          form.setValue(`details.${currentDetailIndex}.quantity`, data.quantity);
        }

        // Cập nhật giao diện
        form.trigger(`details.${currentDetailIndex}`)

        // Cập nhật các tính toán
        handleDetailFieldChange(currentDetailIndex)
        calculateDetailTotals(currentDetailIndex)
      }

      setIsInventoryModalOpen(false)
      inventoryForm.reset()

      // Hiển thị thông báo thành công
      toast.success("Thêm hàng hóa thành công", {
        description: `Đã thêm hàng hóa ${tempInventory.item_name} vào bảng`,
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } catch (err) {
      console.error("Error adding inventory:", err)
      setError("Đã xảy ra lỗi khi thêm hàng hóa")
      toast.error("Đã xảy ra lỗi", {
        description: "Đã xảy ra lỗi khi thêm hàng hóa",
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setLoading(false)
    }
  }

    // Sử dụng các hàm định dạng từ utils

  // Hàm làm tròn số thập phân đến 3 chữ số thập phân
  const roundToThreeDecimals = (value: number): number => {
    return Math.round(value * 1000) / 1000;
  };

  // Xử lý thêm chi tiết hàng hóa mới trong chế độ chỉnh sửa
  // Lưu ý: Hàm này đã được thay thế bằng logic trong handleUpdateDetailInEditMode
  // khi xử lý trường hợp chi tiết mới (!detail.id)

  // Xử lý cập nhật chi tiết hàng hóa trong chế độ chỉnh sửa
  const handleUpdateDetailInEditMode = async (index: number) => {
    if (mode !== "edit" || !initialData?.id) return;

    try {
      setLoading(true);

      // Lấy dữ liệu chi tiết cần cập nhật
      const details = form.getValues("details");
      const detail = details[index];

      // Tính toán lại các giá trị tổng
      calculateDetailTotals(index);

      // Tắt chế độ chỉnh sửa
      setEditingRowIndex(null);

      // Hiển thị thông báo thành công
      toast.success("Cập nhật hàng hóa thành công", {
        description: `Đã cập nhật hàng hóa ${detail.item_name} trong form. Nhấn nút "Cập nhật hóa đơn" để lưu các thay đổi.`,
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      });
    } catch (err) {
      console.error("Error updating detail in edit mode:", err);
      setError("Đã xảy ra lỗi khi cập nhật hàng hóa");
      toast.error("Đã xảy ra lỗi", {
        description: "Đã xảy ra lỗi khi cập nhật hàng hóa",
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      });
    } finally {
      setLoading(false);
    }
  };

  // Xử lý xóa chi tiết hàng hóa trong chế độ chỉnh sửa
  const handleDeleteDetailInEditMode = async (index: number) => {
    if (mode !== "edit" || !initialData?.id) return;

    try {
      setLoading(true);

      // Lấy dữ liệu chi tiết cần xóa
      const details = form.getValues("details");
      const detail = details[index];

      // Đánh dấu chi tiết này đã bị xóa bằng cách thêm trường _deleted
      // Nếu là chi tiết mới chưa có ID, xóa khỏi mảng
      // Nếu là chi tiết đã có ID, đánh dấu để xóa khi submit form
      if (!detail.id) {
        // Nếu là chi tiết mới chưa lưu, chỉ cần xóa khỏi form
        remove(index);

        // Hiển thị thông báo thành công
        toast.success("Xóa hàng hóa thành công", {
          description: `Đã xóa hàng hóa ${detail.item_name} trong form. Nhấn nút "Cập nhật hóa đơn" để lưu các thay đổi.`,
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        });
        return;
      }

      // Nếu là chi tiết đã có trong cơ sở dữ liệu, đánh dấu để xóa khi submit form
      // Lưu chi tiết vào danh sách các chi tiết đã đánh dấu xóa
      setDeletedDetails(prev => [...prev, detail]);

      // Xóa chi tiết khỏi form
      remove(index);

      // Đảm bảo các trường bắt buộc được cập nhật đúng cách
      // Trigger validation cho tất cả các trường
      form.trigger();

      console.log("Form values after delete:", form.getValues());
      console.log("Form errors after delete:", form.formState.errors);

      // Hiển thị thông báo thành công
      toast.success("Xóa hàng hóa thành công", {
        description: `Đã xóa hàng hóa ${detail.item_name} trong form. Nhấn nút "Cập nhật hóa đơn" để lưu các thay đổi.`,
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      });
    } catch (err) {
      console.error("Error deleting detail in edit mode:", err);
      setError("Đã xảy ra lỗi khi xóa hàng hóa");
      toast.error("Đã xảy ra lỗi", {
        description: "Đã xảy ra lỗi khi xóa hàng hóa",
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      });
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý kiểm tra và lưu các hàng hóa mới trước khi submit form
  const handleFormSubmit = async (data: ImportFormValues) => {
    // Đánh dấu form đã được submit
    setIsSubmitted(true);

    // Kiểm tra lỗi trước khi submit
    const isValid = await form.trigger();
    if (!isValid) {
      console.log("Form validation failed:", form.formState.errors);
      toast.error("Vui lòng kiểm tra lại thông tin", {
        description: "Có một số trường bắt buộc chưa được nhập",
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      });
      return;
    }

    // Tạo một bản sao của dữ liệu và đặt trường note rõ ràng
    const formData = {
      ...data,
      note: data.note === undefined || data.note === null ? "" : data.note,
      // Đảm bảo các chi tiết có tên hàng hóa được gửi đúng
      details: data.details.map(detail => ({
        ...detail,
        // Đảm bảo item_name là chuỗi
        item_name: typeof detail.item_name === 'string' ? detail.item_name : String(detail.item_name || ''),
      }))
    };

    // Kiểm tra xem có chi tiết nào đã được đánh dấu xóa không
    if (mode === "edit" && initialData?.id) {
      setLoading(true);
      try {
        // 1. Xử lý xóa các chi tiết đã đánh dấu
        if (deletedDetails.length > 0) {
          console.log("Found deleted details:", deletedDetails);

          // Xóa từng chi tiết đã đánh dấu
          for (const detail of deletedDetails) {
            if (detail.id) {
              console.log(`Deleting detail with ID ${detail.id}`);
              await deleteImportDetail(initialData.id, detail.id);
            }
          }

          // Xóa danh sách các chi tiết đã đánh dấu xóa
          setDeletedDetails([]);
        }

        // 2. Cập nhật các chi tiết đã thay đổi
        const details = formData.details;
        for (const detail of details) {
          if (detail.id) {
            console.log(`Updating detail with ID ${detail.id}`);
            // Chuẩn bị dữ liệu gửi đi
            const detailData = {
              ...detail,
              quantity: Number(detail.quantity),
              price_before_tax: Number(detail.price_before_tax),
              // Đảm bảo item_name là chuỗi
              item_name: typeof detail.item_name === 'string' ? detail.item_name : String(detail.item_name || ''),
              // Giữ lại inventory_id để cập nhật đúng bản ghi trong cơ sở dữ liệu
              inventory_id: detail.inventory_id,
              // Bỏ các trường tính toán hoặc chỉ đọc nếu backend không nhận
              total_before_tax: undefined,
              total_after_tax: undefined,
              tax_amount: undefined
            };

            await updateImportDetail(initialData.id, detail.id, detailData);
          }
        }
      } catch (error) {
        console.error("Error processing details:", error);
        toast.error("Đã xảy ra lỗi khi xử lý hàng hóa", {
          description: "Vui lòng kiểm tra lại thông tin và thử lại",
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        });
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    // Debug dữ liệu form
    console.log("Original form data:", data);
    console.log("Modified form data being submitted:", formData);
    console.log("Note field in form data:", formData.note);
    console.log("Details in form data:", formData.details);
    // Kiểm tra xem có hàng hóa mới nào chưa được lưu không
    if (mode === "edit" && initialData?.id) {
      const details = formData.details;
      const newDetails = details.filter(detail => !detail.id);

      // Nếu có hàng hóa mới chưa được lưu
      if (newDetails.length > 0) {
        setLoading(true);

        try {
          // Hiển thị thông báo cho người dùng
          toast.info("Lưu các hàng hóa mới trước khi cập nhật hóa đơn", {
            description: `Đang lưu ${newDetails.length} hàng hóa mới vào hóa đơn`,
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          });

          // Lưu từng hàng hóa mới
          for (let i = 0; i < newDetails.length; i++) {
            const detail = newDetails[i];
            const detailIndex = details.findIndex(d =>
              d.item_name === detail.item_name &&
              d.unit === detail.unit &&
              !d.id
            );

            if (detailIndex !== -1) {
              // Chuẩn bị dữ liệu gửi đi
              const detailData = {
                ...detail,
                quantity: Number(detail.quantity),
                price_before_tax: Number(detail.price_before_tax),
                // Đảm bảo item_name là chuỗi
                item_name: typeof detail.item_name === 'string' ? detail.item_name : String(detail.item_name || ''),
                // Giữ lại inventory_id để cập nhật đúng bản ghi trong cơ sở dữ liệu
                inventory_id: detail.inventory_id,
                total_before_tax: undefined,
                total_after_tax: undefined,
                tax_amount: undefined
              };

              console.log('New detail data with inventory_id:', detail.inventory_id);

              console.log('Sending detail data to backend:', detailData);

              // Gọi API để thêm hàng hóa mới
              const result = await addImportDetail(initialData.id, detailData);

              if (result && result.success) {
                // Cập nhật lại dữ liệu form với dữ liệu mới từ server
                const updatedImport = result.data.import;

                // Lưu lại toàn bộ dữ liệu form hiện tại
                const currentFormValues = form.getValues();

                // Tạo một bản sao của chi tiết đã được cập nhật
                const updatedDetails = updatedImport.details.map((d: any) => ({
                  ...d,
                  quantity: Number(d.quantity) || 0,
                  price_before_tax: Number(d.price_before_tax) || 0,
                  tax_rate: d.tax_rate || "0%",
                  // Đảm bảo item_name luôn được cập nhật
                  item_name: d.item_name || ""
                }));

                // Tạo một bản sao của toàn bộ dữ liệu form với chi tiết đã được cập nhật
                const newFormValues = {
                  ...currentFormValues,
                  invoice_number: updatedImport.invoice_number || currentFormValues.invoice_number,
                  invoice_date: updatedImport.invoice_date ? new Date(updatedImport.invoice_date) : currentFormValues.invoice_date,
                  description: updatedImport.description !== undefined ? updatedImport.description : currentFormValues.description,
                  note: updatedImport.note !== undefined ? updatedImport.note : currentFormValues.note,
                  details: updatedDetails
                };

                // Reset form với dữ liệu mới
                form.reset(newFormValues);

                // Đảm bảo các trường bắt buộc được cập nhật đúng cách
                // Trigger validation cho tất cả các trường
                form.trigger();

                console.log("Form values after adding new detail in handleFormSubmit:", form.getValues());
                console.log("Form errors after adding new detail in handleFormSubmit:", form.formState.errors);
              }
            }
          }

          // Sau khi lưu tất cả hàng hóa mới, gọi hàm onSubmit để cập nhật hóa đơn
          const updatedFormValues = form.getValues();

          // Đảm bảo trường note được gửi đúng cách
          const updatedData = {
            ...updatedFormValues,
            invoice_number: updatedFormValues.invoice_number || "",
            invoice_date: updatedFormValues.invoice_date || new Date(),
            description: updatedFormValues.description || "",
            note: updatedFormValues.note === undefined || updatedFormValues.note === null ? "" : updatedFormValues.note,
            details: updatedFormValues.details.map((detail: any) => ({
              ...detail,
              item_name: detail.item_name || "",
              unit: detail.unit || "",
              quantity: Number(detail.quantity) || 0,
              price_before_tax: Number(detail.price_before_tax) || 0,
              tax_rate: detail.tax_rate || "0%"
            }))
          };

          // Reset form với dữ liệu mới để đảm bảo tất cả các trường được cập nhật đúng cách
          form.reset(updatedData);

          // Kiểm tra lại lỗi trước khi submit
          const isValid = await form.trigger();
          if (!isValid) {
            console.log("Form validation failed after saving details:", form.formState.errors);
            toast.error("Vui lòng kiểm tra lại thông tin", {
              description: "Có một số trường bắt buộc chưa được nhập",
              className: "text-lg font-medium",
              descriptionClassName: "text-base"
            });
            return;
          }

          // Lấy lại dữ liệu form sau khi reset và validate
          const finalData = form.getValues();
          console.log("Final data after saving details:", finalData);
          onSubmit(finalData);
        } catch (error) {
          console.error("Error saving new details:", error);
          toast.error("Đã xảy ra lỗi khi lưu hàng hóa mới", {
            description: "Vui lòng kiểm tra lại thông tin và thử lại",
            className: "text-lg font-medium",
            descriptionClassName: "text-base"
          });
        } finally {
          setLoading(false);
        }

        return;
      }
    }

    // Nếu không có hàng hóa mới hoặc không phải chế độ chỉnh sửa, gọi hàm onSubmit bình thường
    // Đảm bảo tất cả các trường được cập nhật đúng cách
    const updatedData = {
      ...formData,
      invoice_number: formData.invoice_number || "",
      invoice_date: formData.invoice_date || new Date(),
      description: formData.description || "",
      note: formData.note === undefined || formData.note === null ? "" : formData.note,
      details: formData.details.map((detail: any) => ({
        ...detail,
        item_name: detail.item_name || "",
        unit: detail.unit || "",
        quantity: Number(detail.quantity) || 0,
        price_before_tax: Number(detail.price_before_tax) || 0,
        tax_rate: detail.tax_rate || "0%"
      }))
    };

    // Reset form với dữ liệu mới để đảm bảo tất cả các trường được cập nhật đúng cách
    form.reset(updatedData);

    // Lấy lại dữ liệu form sau khi reset
    const finalData = form.getValues();
    console.log("Final data for submit:", finalData);
    onSubmit(finalData);
  };

  // Hàm xử lý khi submit form không hợp lệ
  const handleInvalidSubmit = (errors: any) => {
    console.log("Form validation errors:", errors);
    // Đánh dấu form đã được submit để hiển thị lỗi
    setIsSubmitted(true);

    // Hiển thị thông báo lỗi
    toast.error("Vui lòng kiểm tra lại thông tin", {
      description: "Có một số trường bắt buộc chưa được nhập",
      className: "text-lg font-medium",
      descriptionClassName: "text-base"
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit, handleInvalidSubmit)} className="space-y-3 md:space-y-4 w-full overflow-x-hidden max-w-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Hàng 1: Số hóa đơn, ngày lập hóa đơn, mô tả */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-full">
        <div className="flex flex-wrap items-center">
          <Label htmlFor="invoice_number" className="text-base md:text-xl font-bold mr-2 min-w-[120px] sm:min-w-0">Số hóa đơn:</Label>
          <div className="flex-1">
            <Input
              id="invoice_number"
              {...form.register("invoice_number", {
                onChange: () => form.formState.errors.invoice_number && form.clearErrors("invoice_number")
              })}
              disabled={isViewMode}
              className={`h-10 md:h-12 text-base md:text-xl ${isSubmitted && form.formState.errors.invoice_number ? "border-red-500" : ""}`}
            />
            {isSubmitted && form.formState.errors.invoice_number && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.invoice_number.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center">
          <Label htmlFor="invoice_date" className="text-base md:text-xl font-bold mr-2 min-w-[120px] sm:min-w-0">Ngày hóa đơn:</Label>
          <div className="flex-1">
            <Controller
              name="invoice_date"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  date={field.value}
                  setDate={(date) => field.onChange(date)}
                  disabled={isViewMode}
                  className="h-10 md:h-12 text-base md:text-xl w-full"
                  placeholder="Chọn ngày lập hóa đơn"
                />
              )}
            />
            {isSubmitted && form.formState.errors.invoice_date && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.invoice_date.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center">
          <Label htmlFor="description" className="text-base md:text-xl font-bold mr-2 min-w-[120px] sm:min-w-0">Mô tả:</Label>
          <div className="flex-1">
            <Textarea
              id="description"
              {...form.register("description")}
              disabled={isViewMode}
              className="min-h-10 md:min-h-12 text-base md:text-xl px-3 md:px-4 py-2 md:py-3 h-10 md:h-12 w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center">
          <Label htmlFor="note" className="text-base md:text-xl font-bold mr-2 min-w-[120px] sm:min-w-0">Ghi chú:</Label>
          <div className="flex-1">
            <Textarea
              id="note"
              {...form.register("note", {
                onChange: (e) => {
                  // Đảm bảo rằng giá trị rỗng được gửi đi khi người dùng xóa ghi chú
                  console.log("Note value changed to:", e.target.value);
                  // Cập nhật giá trị trực tiếp vào form
                  form.setValue("note", e.target.value);
                }
              })}
              disabled={isViewMode}
              className="min-h-10 md:min-h-12 text-base md:text-xl px-3 md:px-4 py-2 md:py-3 h-10 md:h-12 w-full"
            />
          </div>
        </div>
      </div>

      {/* Hàng 2: Tổng tiền */}
      <div className="grid grid-cols-1 gap-3 md:gap-4 max-w-full">
        {/* Tổng tiền */}
        <div className="max-w-full">
          <Label className="text-base mb-2 md:mb-3 block">Tổng tiền</Label>
          <div className="p-2 md:p-4 border rounded-md bg-gray-50 space-y-1 md:space-y-2 max-w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center max-w-full">
              <span className="font-medium text-sm md:text-base">Tổng tiền trước thuế:</span>
              <span className="text-sm md:text-base font-bold">
                {formatCurrency(
                  roundToThreeDecimals(
                    form.getValues("details")?.reduce(
                      (sum, detail) => sum + (Number(detail.quantity || 0) * Number(detail.price_before_tax || 0)),
                      0
                    ) || 0
                  )
                )}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center max-w-full">
              <span className="font-medium text-sm md:text-base">Tổng tiền thuế:</span>
              <span className="text-sm md:text-base font-bold">
                {formatCurrency(
                  roundToThreeDecimals(
                    form.getValues("details")?.reduce(
                      (sum, detail) => {
                        const totalBeforeTax = Number(detail.quantity || 0) * Number(detail.price_before_tax || 0)
                        // Xử lý trường hợp KCT (Không chịu thuế)
                        let taxRate = 0
                        if (detail.tax_rate !== "KCT") {
                          taxRate = Number(detail.tax_rate?.replace("%", "") || 0)
                        }
                        return sum + (totalBeforeTax * taxRate) / 100
                      },
                      0
                    ) || 0
                  )
                )}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm md:text-base font-bold pt-2 md:pt-3 border-t max-w-full">
              <span>Tổng thanh toán:</span>
              <span>
                {formatCurrency(
                  roundToThreeDecimals(
                    form.getValues("details")?.reduce(
                      (sum, detail) => {
                        const totalBeforeTax = Number(detail.quantity || 0) * Number(detail.price_before_tax || 0)
                        // Xử lý trường hợp KCT (Không chịu thuế)
                        let taxRate = 0
                        if (detail.tax_rate !== "KCT") {
                          taxRate = Number(detail.tax_rate?.replace("%", "") || 0)
                        }
                        const taxAmount = (totalBeforeTax * taxRate) / 100
                        return sum + totalBeforeTax + taxAmount
                      },
                      0
                    ) || 0
                  )
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 3: Chi tiết hàng hóa */}
      <div className="max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1 sm:gap-0 max-w-full">
          <h3 className="text-base md:text-lg font-medium">Chi tiết hàng hóa</h3>
          {!isViewMode && (
            <Button
              type="button"
              onClick={() => {
                // Thêm dòng mới vào form
                append({
                  category: "HH",
                  item_name: "",
                  unit: "",
                  quantity: 0,
                  price_before_tax: 0,
                  tax_rate: "10%",
                  supplier_id: null,
                  inventory_id: null,
                  total_before_tax: 0,
                  tax_amount: 0,
                  total_after_tax: 0,
                });

                // Nếu đang ở chế độ chỉnh sửa, thiết lập chế độ chỉnh sửa cho dòng mới
                if (mode === "edit" && initialData?.id) {
                  // Đợi một chút để form cập nhật, sau đó thiết lập chế độ chỉnh sửa cho dòng mới
                  setTimeout(() => {
                    // Thiết lập chế độ chỉnh sửa cho dòng mới thêm vào
                    setEditingRowIndex(fields.length);
                  }, 100);
                }
              }}
              className="px-2 md:px-3 h-7 md:h-8 text-xs md:text-sm w-full sm:w-auto"
            >
              <FaPlus className="mr-1 h-3 w-3" /> Thêm hàng hóa
            </Button>
          )}
        </div>

        <div className="w-full border rounded-sm max-w-full overflow-hidden relative">
          <ScrollArea className="w-full h-[250px] md:h-[300px] overflow-x-auto">
            <div className="relative w-full min-w-[800px]">
            <Table className="w-full min-w-[800px]">
              <TableHeader className="bg-destructive rounded-t-sm sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-white font-bold text-center text-sm md:text-lg rounded-tl-sm w-[6%] min-w-[60px]">
                    Loại
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-sm md:text-lg w-[25%] min-w-[120px]">
                    Tên hàng
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-sm md:text-lg w-[6%]">
                    Đơn vị
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-sm md:text-lg w-[6%] min-w-[80px]">
                    Số lượng
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-sm md:text-lg hidden md:table-cell w-[8%] min-w-[80px]">
                    Đơn giá
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-sm md:text-lg hidden md:table-cell w-[8%]">
                    Thuế suất
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-sm md:text-lg w-[8%] min-w-[80px]">
                    Thành tiền
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-sm md:text-lg w-[8%] min-w-[80px]">
                    Sau thuế
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-sm md:text-lg hidden sm:table-cell w-[20%] min-w-[120px]">
                    Người bán
                  </TableHead>
                  {!isViewMode && (
                    <TableHead className="text-white font-bold text-center text-sm md:text-lg rounded-tr-sm w-[6%] min-w-[60px]">
                      Thao tác
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((field, index) => {
                  const actualIndex = indexOfFirstItem + index;
                  return (
                    <TableRow key={field.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 text-center text-sm md:text-lg">
                        <Controller
                          name={`details.${actualIndex}.category`}
                          control={form.control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value)
                                handleDetailFieldChange(actualIndex)
                              }}
                              disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                            >
                              <SelectTrigger className="w-full h-10 text-sm px-3">
                                <SelectValue placeholder="Loại" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="HH" className="text-sm">Hàng hóa</SelectItem>
                                <SelectItem value="CP" className="text-sm">Chi phí</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 text-sm md:text-base">
                        <div className="flex flex-col md:space-y-2">
                          <div className="flex space-x-1">
                            <div className="w-full flex-1">
                              <div className="flex flex-col">
                                <div className="flex space-x-2">
                                  <div className="flex-1">
                                    <Controller
                                      name={`details.${actualIndex}.inventory_id`}
                                      control={form.control}
                                      render={({ field }) => {
                                        // Chuyển đổi danh sách hàng hóa thành options cho Combobox
                                        const inventoryOptions = inventoryItems.map(item => ({
                                          label: item.item_name,
                                          value: item.id.toString(),
                                          description: `Loại: ${item.category === 'HH' ? 'Hàng hóa' : 'Chi phí'}`
                                        }))

                                        // Xác định giá trị hiện tại (ID hoặc tên hàng hóa)
                                        // Đối với chi phí, luôn sử dụng tên hàng hóa thay vì ID
                                        const category = form.getValues(`details.${actualIndex}.category`);
                                        const currentValue = (category === 'CP' || !field.value)
                                          ? form.getValues(`details.${actualIndex}.item_name`) || ""
                                          : field.value.toString()

                                        console.log(`Combobox current value for row ${actualIndex}:`, currentValue, 'item_name:', form.getValues(`details.${actualIndex}.item_name`))

                                        return (
                                          <Combobox
                                            options={inventoryOptions}
                                            value={currentValue}
                                            onChange={(value) => {
                                              console.log(`Combobox onChange called with value:`, value);
                                              handleInventoryChange(value, actualIndex);
                                            }}
                                            onInputChange={(value) => {
                                              console.log(`Combobox onInputChange called with value:`, value);
                                              handleInventoryInputChange(value, actualIndex);
                                              // Khi người dùng nhập trực tiếp, cập nhật luôn vào item_name
                                              form.setValue(`details.${actualIndex}.item_name`, value);
                                            }}
                                            placeholder="Chọn hoặc nhập tên hàng hóa"
                                            emptyMessage="Không tìm thấy hàng hóa. Nhập tên để tạo mới."
                                            allowCustomValue={true}
                                            disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                                            triggerClassName="h-10 text-sm"
                                          />
                                        )
                                      }}
                                    />
                                  </div>
                                  {!isViewMode && (mode !== "edit" || editingRowIndex === actualIndex) && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-10 w-10 flex-shrink-0"
                                      onClick={() => {
                                        setCurrentDetailIndex(actualIndex);
                                        // Reset form với các giá trị mặc định
                                        inventoryForm.reset({
                                          item_name: "",
                                          unit: "",
                                          quantity: 0,
                                          category: "HH"
                                        });
                                        setIsInventoryModalOpen(true);
                                      }}
                                    >
                                      <FaPlusCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                <Input
                                  type="hidden"
                                  {...form.register(`details.${actualIndex}.item_name`)}
                                  onChange={(e) => {
                                    console.log(`Hidden input onChange called with value:`, e.target.value);
                                  }}
                                />
                                {isSubmitted && form.formState.errors.details?.[actualIndex]?.item_name && (
                                  <p className="text-red-500 text-xs">{form.formState.errors.details?.[actualIndex]?.item_name?.message}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 text-center text-sm md:text-base">
                        <Controller
                          name={`details.${actualIndex}.unit`}
                          control={form.control}
                          render={({ field }) => (
                            <span className="text-sm md:text-base">
                              {field.value || ""}
                            </span>
                          )}
                        />
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 text-sm md:text-base">
                        {/* Hiển thị số lượng cho cả hàng hóa và chi phí */}
                        <Input
                          type="text"
                          inputMode="decimal"
                          defaultValue={form.getValues(`details.${actualIndex}.quantity`) === 0 ? "" : form.getValues(`details.${actualIndex}.quantity`)}
                          disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                          className={`h-10 text-sm w-full px-3 ${isSubmitted && form.formState.errors.details?.[actualIndex]?.quantity ? "border-red-500" : ""}`}
                          onChange={(e) => {
                            // Chỉ cho phép nhập số và dấu chấm
                            let value = e.target.value;

                            // Loại bỏ các ký tự không phải số hoặc dấu chấm
                            value = value.replace(/[^0-9.]/g, "");

                            // Đếm số dấu chấm trong chuỗi
                            const dotCount = (value.match(/\./g) || []).length;

                            if (dotCount > 1) {
                              // Nếu có nhiều hơn 1 dấu chấm, chỉ giữ lại dấu chấm đầu tiên
                              const parts = value.split('.');
                              value = parts[0] + '.' + parts.slice(1).join('');
                            }

                            // Cập nhật giá trị vào input
                            e.target.value = value;

                            // Cập nhật giá trị vào form
                            if (value === "" || value === ".") {
                              form.setValue(`details.${actualIndex}.quantity`, 0);
                            } else {
                              try {
                                // Lưu giá trị chuỗi vào form để hiển thị
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                  form.setValue(`details.${actualIndex}.quantity`, numValue);
                                } else {
                                  form.setValue(`details.${actualIndex}.quantity`, 0);
                                }
                              } catch (error) {
                                console.error("Error parsing quantity:", error);
                                form.setValue(`details.${actualIndex}.quantity`, 0);
                              }
                            }

                            // Tính toán tổng tiền
                            calculateDetailTotals(actualIndex);
                            handleDetailFieldChange(actualIndex);
                          }}
                          onBlur={(e) => {
                            // Khi rời khỏi trường nhập liệu, đảm bảo giá trị là số hợp lệ
                            const value = e.target.value;
                            if (value === "" || value === ".") {
                              e.target.value = "0";
                              form.setValue(`details.${actualIndex}.quantity`, 0);
                            } else {
                              try {
                                // Chuyển đổi thành số khi rời khỏi trường nhập liệu
                                const numValue = parseFloat(value) || 0;
                                form.setValue(`details.${actualIndex}.quantity`, numValue);

                                // Nếu là số nguyên, hiển thị không có phần thập phân
                                if (Number.isInteger(numValue)) {
                                  e.target.value = numValue.toString();
                                }
                              } catch (error) {
                                console.error("Error parsing quantity on blur:", error);
                                e.target.value = "0";
                                form.setValue(`details.${actualIndex}.quantity`, 0);
                              }
                            }
                            calculateDetailTotals(actualIndex);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 hidden md:table-cell text-sm md:text-base">
                        <Input
                          type="text"
                          inputMode="decimal"
                          defaultValue={form.getValues(`details.${actualIndex}.price_before_tax`) === 0 ? "" : form.getValues(`details.${actualIndex}.price_before_tax`)}
                          disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                          className={`h-10 text-sm w-full px-3 ${isSubmitted && form.formState.errors.details?.[actualIndex]?.price_before_tax ? "border-red-500" : ""}`}
                          onChange={(e) => {
                            // Chỉ cho phép nhập số và dấu chấm
                            let value = e.target.value;

                            // Loại bỏ các ký tự không phải số hoặc dấu chấm
                            value = value.replace(/[^0-9.]/g, "");

                            // Đếm số dấu chấm trong chuỗi
                            const dotCount = (value.match(/\./g) || []).length;

                            if (dotCount > 1) {
                              // Nếu có nhiều hơn 1 dấu chấm, chỉ giữ lại dấu chấm đầu tiên
                              const parts = value.split('.');
                              value = parts[0] + '.' + parts.slice(1).join('');
                            }

                            // Cập nhật giá trị vào input
                            e.target.value = value;

                            // Cập nhật giá trị vào form
                            if (value === "" || value === ".") {
                              form.setValue(`details.${actualIndex}.price_before_tax`, 0);
                            } else {
                              try {
                                // Lưu giá trị chuỗi vào form để hiển thị
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                  form.setValue(`details.${actualIndex}.price_before_tax`, numValue);
                                } else {
                                  form.setValue(`details.${actualIndex}.price_before_tax`, 0);
                                }
                              } catch (error) {
                                console.error("Error parsing price:", error);
                                form.setValue(`details.${actualIndex}.price_before_tax`, 0);
                              }
                            }

                            // Tính toán tổng tiền
                            calculateDetailTotals(actualIndex);
                            handleDetailFieldChange(actualIndex);
                          }}
                          onBlur={(e) => {
                            // Khi rời khỏi trường nhập liệu, đảm bảo giá trị là số hợp lệ
                            const value = e.target.value;
                            if (value === "" || value === ".") {
                              e.target.value = "0";
                              form.setValue(`details.${actualIndex}.price_before_tax`, 0);
                            } else {
                              try {
                                // Chuyển đổi thành số khi rời khỏi trường nhập liệu
                                const numValue = parseFloat(value) || 0;
                                form.setValue(`details.${actualIndex}.price_before_tax`, numValue);

                                // Nếu là số nguyên, hiển thị không có phần thập phân
                                if (Number.isInteger(numValue)) {
                                  e.target.value = numValue.toString();
                                }
                              } catch (error) {
                                console.error("Error parsing price on blur:", error);
                                e.target.value = "0";
                                form.setValue(`details.${actualIndex}.price_before_tax`, 0);
                              }
                            }
                            calculateDetailTotals(actualIndex);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 hidden md:table-cell">
                        <Controller
                          name={`details.${actualIndex}.tax_rate`}
                          control={form.control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value)
                                calculateDetailTotals(actualIndex)
                                handleDetailFieldChange(actualIndex)
                              }}
                              disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                            >
                              <SelectTrigger className="w-full h-10 text-sm px-3">
                                <SelectValue placeholder="Thuế" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="KCT" className="text-sm">KCT</SelectItem>
                                <SelectItem value="0%" className="text-sm">0%</SelectItem>
                                <SelectItem value="5%" className="text-sm">5%</SelectItem>
                                <SelectItem value="8%" className="text-sm">8%</SelectItem>
                                <SelectItem value="10%" className="text-sm">10%</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 text-right font-medium">
                        <span className="text-sm md:text-base">
                          {formatCurrency(
                            roundToThreeDecimals(
                              (form.getValues(`details.${actualIndex}.quantity`) || 0) *
                              (form.getValues(`details.${actualIndex}.price_before_tax`) || 0)
                            )
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 text-right font-medium">
                        <span className="text-sm md:text-base">
                          {formatCurrency(
                            roundToThreeDecimals(
                              form.getValues(`details.${actualIndex}.total_after_tax`) || 0
                            )
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3">
                        <div className="flex flex-col space-y-1 md:space-y-2">
                          <div className="flex space-x-2">
                            <div className="flex-1">
                              <Controller
                                name={`details.${actualIndex}.supplier_id`}
                                control={form.control}
                                render={({ field }) => {
                                  // Chuyển đổi danh sách người bán thành options cho Combobox
                                  const supplierOptions = suppliers.map(supplier => ({
                                    label: supplier.tax_code ? `${supplier.name} (MST: ${supplier.tax_code})` : supplier.name,
                                    value: supplier.id.toString(),
                                    description: undefined
                                  }))

                                  // Xác định giá trị hiện tại (ID hoặc tên nhà cung cấp)
                                  const currentValue = field.value
                                    ? field.value.toString()
                                    : form.getValues(`details.${actualIndex}.seller_name`) || ""

                                  return (
                                    <Combobox
                                      options={supplierOptions}
                                      value={currentValue}
                                      onChange={(value) => handleSupplierChange(value, actualIndex)}
                                      onInputChange={(value) => handleSupplierInputChange(value, actualIndex)}
                                      placeholder="Chọn hoặc nhập tên người bán"
                                      emptyMessage="Không tìm thấy người bán. Nhập tên để tạo mới."
                                      allowCustomValue={true}
                                      disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                                      triggerClassName="h-10 text-sm"
                                    />
                                  )
                                }}
                              />
                            </div>
                            {!isViewMode && (mode !== "edit" || editingRowIndex === actualIndex) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 flex-shrink-0"
                                onClick={() => {
                                  setCurrentDetailIndex(actualIndex);
                                  supplierForm.reset({
                                    name: "",
                                    tax_code: "",
                                    address: "",
                                    phone: "",
                                    email: "",
                                  });
                                  setIsSupplierModalOpen(true);
                                }}
                              >
                                <FaPlusCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {/* Đã bỏ hiển thị MST ở đây vì đã hiển thị trong dropdown */}
                        </div>
                      </TableCell>
                      {!isViewMode && (
                        <TableCell className="px-1 md:px-2 py-2 md:py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            {mode === "edit" && initialData?.id && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 bg-green-100 hover:bg-green-200 border-green-200 text-green-700"
                                onClick={() => {
                                  if (editingRowIndex === actualIndex) {
                                    // Nếu đang chỉnh sửa hàng này, lưu thay đổi và tắt chế độ chỉnh sửa
                                    handleUpdateDetailInEditMode(actualIndex);
                                    setEditingRowIndex(null);
                                  } else {
                                    // Nếu chưa chỉnh sửa hàng này, bật chế độ chỉnh sửa
                                    setEditingRowIndex(actualIndex);
                                  }
                                }}
                              >
                                {editingRowIndex === actualIndex ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <FaEdit className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-red-100 hover:bg-red-200 border-red-200 text-red-700"
                              onClick={() => {
                                if (mode === "edit" && initialData?.id) {
                                  handleDeleteDetailInEditMode(actualIndex);
                                } else {
                                  remove(actualIndex);
                                }
                              }}
                              disabled={fields.length <= 1}
                            >
                              <FaTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={handlePrevPage}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {/* Hiển thị số trang */}
                {Array.from({length: totalPages}, (_, i) => i + 1).map((page) => {
                  // Hiển thị tối đa 5 trang, nếu nhiều hơn thì hiển thị dấu ...

                  // Luôn hiển thị trang đầu, trang cuối và trang hiện tại
                  // Cùng với 1 trang trước và 1 trang sau trang hiện tại (nếu có)
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="text-lg"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }

                  // Hiển thị dấu ... sau trang đầu nếu có khoảng cách
                  if (page === 2 && currentPage > 3) {
                    return (
                      <PaginationItem key="ellipsis-start">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  // Hiển thị dấu ... trước trang cuối nếu có khoảng cách
                  if (page === totalPages - 1 && currentPage < totalPages - 2) {
                    return (
                      <PaginationItem key="ellipsis-end">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  // Không hiển thị các trang khác
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={handleNextPage}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Hiển thị lỗi chi tiết */}
        {isSubmitted && form.formState.errors.details && (
          <p className="text-red-500 text-xs md:text-sm mt-2 md:mt-4">{form.formState.errors.details.message}</p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-4 md:space-x-6 pt-2 md:pt-3 mt-2 md:mt-3 max-w-full">
        <Button
          type="button"
          variant="outline"
          className="h-9 md:h-10 px-3 md:px-6 text-xs md:text-sm w-full sm:w-auto"
          onClick={onCancel}
        >
          {isViewMode ? "Đóng" : "Hủy"}
        </Button>
        {!isViewMode && (
          <Button
            type="submit"
            className="h-9 md:h-10 px-3 md:px-6 text-xs md:text-sm w-full sm:w-auto"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : mode === "add" ? "Thêm hóa đơn" : "Cập nhật hóa đơn"}
          </Button>
        )}
      </div>

      {/* Modal thêm mới nhà cung cấp */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-3 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Thêm người bán mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault(); // Ngăn form chính tự động submit
            supplierForm.handleSubmit(handleAddSupplier)(e);
          }} className="space-y-4 md:space-y-8">
            <div className="space-y-4 md:space-y-6">
              <div>
                <Label htmlFor="name" className="text-sm md:text-base mb-2 md:mb-3 block">Tên người bán *</Label>
                <Input
                  id="name"
                  {...supplierForm.register("name")}
                  className="h-10 md:h-12 text-sm md:text-base"
                />
                {supplierForm.formState.isSubmitted && supplierForm.formState.errors.name && (
                  <p className="text-red-500 text-xs md:text-sm mt-1">{supplierForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="tax_code" className="text-sm md:text-base mb-2 md:mb-3 block">Mã số thuế</Label>
                <Input
                  id="tax_code"
                  {...supplierForm.register("tax_code")}
                  className="h-10 md:h-12 text-sm md:text-base"
                />
              </div>
              <div>
                <Label htmlFor="address" className="text-sm md:text-base mb-2 md:mb-3 block">Địa chỉ</Label>
                <Input
                  id="address"
                  {...supplierForm.register("address")}
                  className="h-10 md:h-12 text-sm md:text-base"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm md:text-base mb-2 md:mb-3 block">Số điện thoại</Label>
                <Input
                  id="phone"
                  {...supplierForm.register("phone")}
                  className="h-10 md:h-12 text-sm md:text-base"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm md:text-base mb-2 md:mb-3 block">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...supplierForm.register("email")}
                  className="h-10 md:h-12 text-sm md:text-base"
                />
                {supplierForm.formState.isSubmitted && supplierForm.formState.errors.email && (
                  <p className="text-red-500 text-xs md:text-sm mt-1">{supplierForm.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2 md:gap-4">
              <Button
                type="button"
                variant="outline"
                className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                onClick={() => setIsSupplierModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Thêm người bán"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal thêm mới hàng hóa */}
      <Dialog open={isInventoryModalOpen} onOpenChange={setIsInventoryModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-3 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Thêm hàng hóa mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 md:space-y-8">
            <div className="space-y-4 md:space-y-6">
              <div>
                <Label htmlFor="item_name" className="text-sm md:text-base mb-2 md:mb-3 block">Tên hàng hóa *</Label>
                <Input
                  id="item_name"
                  {...inventoryForm.register("item_name")}
                  className="h-10 md:h-12 text-sm md:text-base"
                />
                {inventoryForm.formState.errors.item_name && (
                  <p className="text-red-500 text-xs md:text-sm mt-1">{inventoryForm.formState.errors.item_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="unit" className="text-sm md:text-base mb-2 md:mb-3 block">Đơn vị tính *</Label>
                <Input
                  id="unit"
                  {...inventoryForm.register("unit")}
                  className="h-10 md:h-12 text-sm md:text-base"
                />
                {inventoryForm.formState.errors.unit && (
                  <p className="text-red-500 text-xs md:text-sm mt-1">{inventoryForm.formState.errors.unit.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="category" className="text-sm md:text-base mb-2 md:mb-3 block">Loại *</Label>
                <Controller
                  name="category"
                  control={inventoryForm.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset số lượng về 0 khi chuyển loại
                        inventoryForm.setValue("quantity", 0);
                      }}
                    >
                      <SelectTrigger className="h-10 md:h-12 text-sm md:text-base">
                        <SelectValue placeholder="Chọn loại" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HH">Hàng hóa</SelectItem>
                        <SelectItem value="CP">Chi phí</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {inventoryForm.formState.errors.category && (
                  <p className="text-red-500 text-xs md:text-sm mt-1">{inventoryForm.formState.errors.category.message}</p>
                )}
              </div>

              {/* Hiển thị ô nhập số lượng khi loại là chi phí */}
              {inventoryForm.watch("category") === "CP" && (
                <div>
                  <Label htmlFor="quantity" className="text-sm md:text-base mb-2 md:mb-3 block">Số lượng</Label>
                  <Input
                    id="quantity"
                    type="text"
                    inputMode="decimal"
                    {...inventoryForm.register("quantity", {
                      setValueAs: (value) => {
                        if (value === "" || value === ".") return 0;
                        return parseFloat(value) || 0;
                      }
                    })}
                    className="h-10 md:h-12 text-sm md:text-base"
                    onChange={(e) => {
                      // Chỉ cho phép nhập số và dấu chấm
                      let value = e.target.value;
                      value = value.replace(/[^0-9.]/g, "");

                      // Đếm số dấu chấm trong chuỗi
                      const dotCount = (value.match(/\./g) || []).length;
                      if (dotCount > 1) {
                        const parts = value.split('.');
                        value = parts[0] + '.' + parts.slice(1).join('');
                      }

                      e.target.value = value;
                      inventoryForm.setValue("quantity", value === "" || value === "." ? 0 : parseFloat(value) || 0);
                    }}
                  />
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2 md:gap-4">
              <Button
                type="button"
                variant="outline"
                className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                onClick={() => setIsInventoryModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                disabled={loading}
                onClick={() => {
                  // Kiểm tra validation của form thêm hàng hóa
                  inventoryForm.trigger().then(isValid => {
                    if (isValid) {
                      // Nếu hợp lệ, gọi hàm xử lý thêm hàng hóa
                      handleAddInventory(inventoryForm.getValues());
                    } else {
                      // Hiển thị thông báo lỗi
                      toast.error("Vui lòng kiểm tra lại thông tin", {
                        description: "Có một số trường bắt buộc chưa được nhập",
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                      });
                    }
                  });
                }}
              >
                {loading ? "Đang xử lý..." : "Thêm hàng hóa"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
