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
import type { Customer } from "@/lib/api/customers"
import type { Inventory } from "@/lib/api/inventory"
import { createCustomer, getCustomers } from "@/lib/api/customers"
import { createInventoryItem, getInventoryItems } from "@/lib/api/inventory"
import { addExportDetail, updateExportDetail, deleteExportDetail } from "@/lib/api/exports"

// Định nghĩa Zod schema để validation
const exportDetailSchema = z.object({
    id: z.number().optional(),
    category: z.enum(["HH", "CP"]).optional().default("HH"),
    inventory_id: z.number().nullable().optional(),
    customer_id: z.number().nullable().optional(),
    item_name: z.string().min(1, "Tên hàng hóa là bắt buộc"),
    unit: z.string().optional().default(""),
    quantity: z.coerce.number().min(0.001, "Số lượng phải lớn hơn 0"),
    price_before_tax: z.coerce.number().min(0, "Đơn giá không được âm"),
    tax_rate: z.string().default("0%"),
    buyer_name: z.string().optional(),
    buyer_tax_code: z.string().optional(),
    // Thêm các trường tính toán
    total_before_tax: z.number().optional(),
    tax_amount: z.number().optional(),
    total_after_tax: z.number().optional(),
})

const exportFormSchema = z.object({
    invoice_number: z.string().min(1, "Số hóa đơn là bắt buộc"),
    invoice_date: z.date({
        required_error: "Ngày lập hóa đơn là bắt buộc"
    }),
    description: z.string().optional(),
    note: z.string().optional(),
    details: z.array(exportDetailSchema).min(1, "Phải có ít nhất một mặt hàng"),
})

const customerFormSchema = z.object({
    name: z.string().min(1, "Tên khách hàng là bắt buộc"),
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

type ExportFormValues = z.infer<typeof exportFormSchema>
type CustomerFormValues = z.infer<typeof customerFormSchema>
type InventoryFormValues = z.infer<typeof inventoryFormSchema>

interface ExportFormProps {
    mode: "add" | "edit" | "view"
    initialData?: any
    onSubmit: (data: ExportFormValues) => void
    onCancel: () => void
}

export function ExportForm({ mode, initialData, onSubmit, onCancel }: ExportFormProps) {
    const isViewMode = mode === "view"
    const [customers, setCustomers] = useState<Customer[]>([])
    const [inventoryItems, setInventoryItems] = useState<Inventory[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [inventoryError, setInventoryError] = useState<{ [key: number]: string }>({})

    // State cho modal thêm mới
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false)
    const [currentDetailIndex, setCurrentDetailIndex] = useState<number | null>(null)

    // State để theo dõi hàng đang được chỉnh sửa
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)

    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 7

    // State để lưu trữ danh sách các chi tiết đã đánh dấu xóa
    const [deletedDetails, setDeletedDetails] = useState<any[]>([])

    // State để lưu trữ số lượng tồn kho dự kiến sau khi xuất
    const [estimatedInventory, setEstimatedInventory] = useState<Record<number, number>>({})

    // Khai báo form cho thêm mới customer và inventory
    const customerForm = useForm<CustomerFormValues>({
        resolver: zodResolver(customerFormSchema),
        mode: "onSubmit",
        reValidateMode: "onSubmit",
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
        mode: "onSubmit",
        reValidateMode: "onSubmit",
        defaultValues: {
            item_name: "",
            unit: "",
            quantity: 0,
            category: "HH",
        }
    })

    // Form setup với react-hook-form và zod validation
    const form = useForm<ExportFormValues>({
        resolver: zodResolver(exportFormSchema) as any,
        mode: "onSubmit",
        reValidateMode: "onSubmit",
        defaultValues: initialData
            ? {
                ...initialData,
                invoice_date: initialData.invoice_date ? new Date(initialData.invoice_date) : new Date(),
                details: initialData.details?.map((d: any) => ({
                    ...d,
                    quantity: Number(d.quantity) || 0,
                    price_before_tax: Number(d.price_before_tax) || 0,
                    tax_rate: d.tax_rate || "0%",
                })) || [],
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
                        customer_id: null,
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

    // Fetch customers và inventory items từ API
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                // Fetch customers sử dụng API
                const customersResult = await getCustomers()
                if (customersResult && customersResult.success) {
                    const customersData = customersResult.data || []
                    setCustomers(customersData)
                }

                // Fetch inventory items sử dụng API
                const inventoryResult = await getInventoryItems()
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

        // Xóa lỗi tồn kho
        const newInventoryError = { ...inventoryError }
        delete newInventoryError[index]
        setInventoryError(newInventoryError)
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

    // Xử lý khi người dùng chọn hàng hóa
    const handleInventoryChange = (value: string, index: number) => {
        // Chỉ cho phép chọn hàng hóa từ kho, không cho phép tạo mới
        const matchedItem = inventoryItems.find(item => item.id.toString() === value)

        if (matchedItem) {
            // Kiểm tra tồn kho trước khi cho phép chọn
            const currentQuantity = form.getValues(`details.${index}.quantity`) || 0
            if (matchedItem.quantity < currentQuantity) {
                // Cập nhật lỗi tồn kho
                setInventoryError({
                    ...inventoryError,
                    [index]: `Không đủ hàng trong kho! Tồn kho hiện tại: ${Number(matchedItem.quantity)} ${matchedItem.unit}, cần xuất: ${currentQuantity}`
                })

                // Hiển thị thông báo toast
                toast.error("Vượt quá số lượng tồn kho", {
                    description: `Không đủ hàng trong kho! ${matchedItem.item_name}: Tồn kho hiện tại: ${Number(matchedItem.quantity)} ${matchedItem.unit}, cần xuất: ${currentQuantity}`,
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                })
            } else {
                // Xóa lỗi tồn kho nếu số lượng đủ
                const newInventoryError = { ...inventoryError }
                delete newInventoryError[index]
                setInventoryError(newInventoryError)

                // Tính toán số lượng tồn kho dự kiến sau khi xuất
                const estimatedQty = Math.max(0, Number(matchedItem.quantity) - currentQuantity)
                setEstimatedInventory(prev => ({
                    ...prev,
                    [matchedItem.id as number]: estimatedQty
                }))
            }

            // Sử dụng thông tin của hàng hóa đã chọn
            form.setValue(`details.${index}.inventory_id`, matchedItem.id)
            form.setValue(`details.${index}.item_name`, matchedItem.item_name)
            form.setValue(`details.${index}.unit`, matchedItem.unit)
            form.setValue(`details.${index}.category`, matchedItem.category)
        } else {
            // Nếu không tìm thấy hàng hóa, hiển thị thông báo lỗi
            toast.error("Không tìm thấy hàng hóa", {
                description: "Vui lòng chọn hàng hóa từ danh sách kho",
                className: "text-lg font-medium",
                descriptionClassName: "text-base"
            })

            // Đặt thông báo lỗi
            setInventoryError({
                ...inventoryError,
                [index]: "Không tìm thấy hàng hóa này trong kho. Vui lòng chọn hàng hóa từ danh sách!"
            })
        }

        handleDetailFieldChange(index)
    }

    // Xử lý khi người dùng nhập số lượng
    const handleQuantityChange = (value: string, index: number) => {
        // Cập nhật giá trị số lượng
        const numValue = parseFloat(value) || 0
        form.setValue(`details.${index}.quantity`, numValue)

        // Kiểm tra tồn kho
        const inventoryId = form.getValues(`details.${index}.inventory_id`)
        if (inventoryId) {
            const matchedItem = inventoryItems.find(item => item.id === inventoryId)

            // Nếu đang ở chế độ chỉnh sửa, cần kiểm tra số lượng cũ
            if (mode === "edit" && initialData?.id && initialData.details) {
                // Tìm chi tiết hiện tại trong dữ liệu ban đầu
                const originalDetail = initialData.details.find((d: any) =>
                    d.inventory_id === inventoryId && d.id === form.getValues(`details.${index}.id`)
                );

                // Nếu tìm thấy chi tiết gốc và số lượng mới nhỏ hơn hoặc bằng số lượng cũ
                // hoặc số lượng chênh lệch không vượt quá tồn kho hiện tại
                if (originalDetail) {
                    const oldQuantity = Number(originalDetail.quantity) || 0;

                    // Chỉ kiểm tra nếu số lượng mới lớn hơn số lượng cũ
                    if (numValue > oldQuantity && matchedItem && matchedItem.quantity < (numValue - oldQuantity)) {
                        setInventoryError({
                            ...inventoryError,
                            [index]: `Không đủ hàng trong kho! Tồn kho hiện tại: ${Number(matchedItem.quantity)} ${matchedItem.unit}, cần xuất thêm: ${numValue - oldQuantity}`
                        })

                        // Hiển thị thông báo toast
                        toast.error("Vượt quá số lượng tồn kho", {
                            description: `Không đủ hàng trong kho! ${matchedItem.item_name}: Tồn kho hiện tại: ${Number(matchedItem.quantity)} ${matchedItem.unit}, cần xuất thêm: ${numValue - oldQuantity}`,
                            className: "text-lg font-medium",
                            descriptionClassName: "text-base"
                        })
                    } else {
                        const newInventoryError = { ...inventoryError }
                        delete newInventoryError[index]
                        setInventoryError(newInventoryError)

                        // Tính toán số lượng tồn kho dự kiến sau khi xuất
                        if (matchedItem) {
                            const estimatedQty = Math.max(0, Number(matchedItem.quantity) - (numValue - oldQuantity))
                            setEstimatedInventory(prev => ({
                                ...prev,
                                [inventoryId as number]: estimatedQty
                            }))
                        }
                    }
                    return; // Đã xử lý xong trường hợp chỉnh sửa
                }
            }

            // Xử lý trường hợp thêm mới hoặc không tìm thấy chi tiết gốc
            if (matchedItem && matchedItem.quantity < numValue) {
                setInventoryError({
                    ...inventoryError,
                    [index]: `Không đủ hàng trong kho! Tồn kho hiện tại: ${Number(matchedItem.quantity)} ${matchedItem.unit}, cần xuất: ${numValue}`
                })

                // Hiển thị thông báo toast
                toast.error("Vượt quá số lượng tồn kho", {
                    description: `Không đủ hàng trong kho! ${matchedItem.item_name}: Tồn kho hiện tại: ${Number(matchedItem.quantity)} ${matchedItem.unit}, cần xuất: ${numValue}`,
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                })
            } else if (matchedItem) {
                const newInventoryError = { ...inventoryError }
                delete newInventoryError[index]
                setInventoryError(newInventoryError)

                // Tính toán số lượng tồn kho dự kiến sau khi xuất
                const estimatedQty = Math.max(0, Number(matchedItem.quantity) - numValue)
                setEstimatedInventory(prev => ({
                    ...prev,
                    [inventoryId as number]: estimatedQty
                }))
            }
        }

        // Tính toán tổng tiền
        calculateDetailTotals(index)
        handleDetailFieldChange(index)
    }

    // Xử lý khi người dùng nhập vào ô tìm kiếm hàng hóa
    const handleInventoryInputChange = (_value: string, _index: number) => {
        // Không cần làm gì đặc biệt khi người dùng nhập, vì sẽ xử lý khi người dùng chọn hoặc đóng combobox
    }

    // Xử lý khi người dùng nhập hoặc chọn khách hàng
    const handleCustomerChange = (value: string, index: number) => {
        // Kiểm tra xem giá trị có phải là ID của khách hàng hiện có không
        const matchedCustomer = customers.find(customer => customer.id.toString() === value)

        if (matchedCustomer) {
            // Nếu là khách hàng hiện có, sử dụng thông tin của khách hàng đó
            form.setValue(`details.${index}.customer_id`, matchedCustomer.id)
            form.setValue(`details.${index}.buyer_name`, matchedCustomer.name)
            form.setValue(`details.${index}.buyer_tax_code`, matchedCustomer.tax_code || "")
        } else {
            // Nếu là khách hàng mới, sử dụng giá trị nhập vào làm tên khách hàng
            // Kiểm tra xem có phải là tên khách hàng hiện có không
            const matchedByName = customers.find(
                customer => customer.name.toLowerCase() === value.toLowerCase()
            )

            if (matchedByName) {
                // Nếu tìm thấy khách hàng theo tên, sử dụng thông tin của khách hàng đó
                form.setValue(`details.${index}.customer_id`, matchedByName.id)
                form.setValue(`details.${index}.buyer_name`, matchedByName.name)
                form.setValue(`details.${index}.buyer_tax_code`, matchedByName.tax_code || "")
            } else {
                // Nếu không tìm thấy, sử dụng giá trị nhập vào làm tên khách hàng mới
                form.setValue(`details.${index}.customer_id`, null)
                form.setValue(`details.${index}.buyer_name`, value)
                form.setValue(`details.${index}.buyer_tax_code`, "")
            }
        }

        handleDetailFieldChange(index)
    }

    // Xử lý khi người dùng nhập vào ô tìm kiếm khách hàng
    const handleCustomerInputChange = (_value: string, _index: number) => {
        // Không cần làm gì đặc biệt khi người dùng nhập, vì sẽ xử lý khi người dùng chọn hoặc đóng combobox
    }

    // Xử lý thêm mới khách hàng
    const handleAddCustomer = async (data: CustomerFormValues) => {
        try {
            setLoading(true)
            const result = await createCustomer(data)

            if (result && result.success) {
                const newCustomer = result.data

                // Cập nhật danh sách khách hàng
                const updatedCustomers = [...customers, newCustomer]
                setCustomers(updatedCustomers)

                // Áp dụng khách hàng vừa tạo vào dòng hiện tại
                if (currentDetailIndex !== null) {
                    // Sử dụng setTimeout để đảm bảo việc cập nhật khách hàng được thực hiện sau khi modal đã đóng
                    setTimeout(() => {
                        handleCustomerChange(newCustomer.id.toString(), currentDetailIndex)
                    }, 100)
                }

                setIsCustomerModalOpen(false)
                customerForm.reset()

                // Hiển thị thông báo thành công
                toast.success("Thêm khách hàng thành công", {
                    description: `Đã thêm khách hàng ${newCustomer.name} vào hệ thống`,
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                })
            } else {
                setError("Không thể tạo khách hàng mới")
                toast.error("Không thể tạo khách hàng mới", {
                    description: result?.message || "Vui lòng kiểm tra lại thông tin",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                })
            }
        } catch (err) {
            console.error("Error adding customer:", err)
            setError("Đã xảy ra lỗi khi tạo khách hàng mới")
            toast.error("Đã xảy ra lỗi", {
                description: "Đã xảy ra lỗi khi tạo khách hàng mới",
                className: "text-lg font-medium",
                descriptionClassName: "text-base"
            })
        } finally {
            setLoading(false)
        }
    }

    // Xử lý thêm mới hàng hóa
    const handleAddInventory = async (data: InventoryFormValues) => {
        try {
            setLoading(true)
            const result = await createInventoryItem(data)

            if (result && result.success) {
                const newInventory = result.data

                // Cập nhật danh sách hàng hóa
                setInventoryItems([...inventoryItems, newInventory])

                // Áp dụng hàng hóa vừa tạo vào dòng hiện tại
                if (currentDetailIndex !== null) {
                    // Reset các giá trị trước khi áp dụng hàng hóa mới
                    form.setValue(`details.${currentDetailIndex}.price_before_tax`, 0)
                    form.setValue(`details.${currentDetailIndex}.tax_rate`, "10%")

                    // Áp dụng hàng hóa mới
                    handleInventoryChange(newInventory.id.toString(), currentDetailIndex)
                }

                setIsInventoryModalOpen(false)
                inventoryForm.reset()

                // Hiển thị thông báo thành công
                toast.success("Thêm hàng hóa thành công", {
                    description: `Đã thêm hàng hóa ${newInventory.item_name} vào hệ thống`
                })
            } else {
                setError("Không thể tạo hàng hóa mới")
                toast.error("Không thể tạo hàng hóa mới", {
                    description: result?.message || "Vui lòng kiểm tra lại thông tin"
                })
            }
        } catch (err) {
            console.error("Error adding inventory:", err)
            setError("Đã xảy ra lỗi khi tạo hàng hóa mới")
            toast.error("Đã xảy ra lỗi", {
                description: "Đã xảy ra lỗi khi tạo hàng hóa mới"
            })
        } finally {
            setLoading(false)
        }
    }

    // Hàm làm tròn số thập phân đến 3 chữ số thập phân
    const roundToThreeDecimals = (value: number): number => {
        return Math.round(value * 1000) / 1000;
    };

    // Xử lý cập nhật chi tiết hàng hóa trong chế độ chỉnh sửa
    const handleUpdateDetailInEditMode = async (index: number) => {
        if (mode !== "edit" || !initialData?.id) return;

        try {
            setLoading(true);

            // Lấy dữ liệu chi tiết cần cập nhật
            const details = form.getValues("details");
            const detail = details[index];

            // Kiểm tra tồn kho trước khi cập nhật
            if (detail.inventory_id) {
                const inventory = inventoryItems.find(item => item.id === detail.inventory_id);

                // Tìm chi tiết gốc để so sánh số lượng
                const originalDetail = initialData.details.find((d: any) =>
                    d.id === detail.id && d.inventory_id === detail.inventory_id
                );

                if (originalDetail) {
                    const oldQuantity = Number(originalDetail.quantity) || 0;
                    const newQuantity = Number(detail.quantity) || 0;

                    // Chỉ kiểm tra nếu số lượng mới lớn hơn số lượng cũ
                    if (newQuantity > oldQuantity && inventory && inventory.quantity < (newQuantity - oldQuantity)) {
                        toast.error("Vượt quá số lượng tồn kho", {
                            description: `Không đủ hàng trong kho! ${detail.item_name}: Tồn kho hiện tại: ${Number(inventory.quantity)} ${inventory.unit}, cần xuất thêm: ${newQuantity - oldQuantity}`,
                            className: "text-lg font-medium",
                            descriptionClassName: "text-base"
                        });
                        setLoading(false);
                        return;
                    }
                } else if (inventory && inventory.quantity < detail.quantity) {
                    // Nếu không tìm thấy chi tiết gốc (trường hợp thêm mới), kiểm tra bình thường
                    toast.error("Vượt quá số lượng tồn kho", {
                        description: `Không đủ hàng trong kho! ${detail.item_name}: Tồn kho hiện tại: ${Number(inventory.quantity)} ${inventory.unit}, cần xuất: ${Number(detail.quantity)}`,
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                    });
                    setLoading(false);
                    return;
                }
            }

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

            // Kiểm tra xem chi tiết có ID không (nếu không có ID thì là chi tiết mới chưa lưu)
            if (!detail.id) {
                // Nếu là chi tiết mới chưa lưu, chỉ cần xóa khỏi form
                remove(index);

                // Hiển thị thông báo thành công
                toast.success("Xóa hàng hóa thành công", {
                    description: `Đã xóa hàng hóa ${detail.item_name} trong form. Nhấn nút "Cập nhật hóa đơn" để lưu các thay đổi.`,
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                });
                setLoading(false);
                return;
            }

            // Nếu là chi tiết đã có trong cơ sở dữ liệu, đánh dấu để xóa khi submit form
            // Lưu chi tiết vào danh sách các chi tiết đã đánh dấu xóa
            setDeletedDetails(prev => [...prev, detail]);

            // Cập nhật số lượng tồn kho dự kiến nếu chi tiết có inventory_id
            if (detail.inventory_id) {
                const inventory = inventoryItems.find(item => item.id === detail.inventory_id);
                if (inventory) {
                    // Tìm chi tiết gốc để so sánh số lượng
                    const originalDetail = initialData.details.find((d: any) =>
                        d.id === detail.id && d.inventory_id === detail.inventory_id
                    );

                    if (originalDetail) {
                        const oldQuantity = Number(originalDetail.quantity) || 0;
                        // Khi xóa chi tiết, số lượng tồn kho sẽ tăng lên bằng số lượng đã xuất
                        const estimatedQty = Number(inventory.quantity) + oldQuantity;
                        setEstimatedInventory(prev => ({
                            ...prev,
                            [detail.inventory_id as number]: estimatedQty
                        }));
                    }
                }
            }

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
    const handleFormSubmit = async (data: ExportFormValues) => {
        // Đánh dấu form đã được submit
        setIsSubmitted(true);

        // Kiểm tra lỗi tồn kho
        const hasInventoryError = Object.keys(inventoryError).length > 0;
        if (hasInventoryError) {
            // Hiển thị thông báo lỗi cụ thể về tồn kho
            const errorMessages = Object.values(inventoryError);
            toast.error("Vượt quá số lượng tồn kho", {
                description: errorMessages.join('\n'),
                className: "text-lg font-medium",
                descriptionClassName: "text-base"
            });
            return;
        }

        // Kiểm tra lại tồn kho cho tất cả các hàng hóa
        for (let i = 0; i < data.details.length; i++) {
            const detail = data.details[i];
            if (detail.category === 'HH' && detail.inventory_id) {
                const inventory = inventoryItems.find(item => item.id === detail.inventory_id);

                // Nếu đang ở chế độ chỉnh sửa, cần kiểm tra số lượng cũ
                if (mode === "edit" && initialData?.id && initialData.details && detail.id) {
                    // Tìm chi tiết gốc để so sánh số lượng
                    const originalDetail = initialData.details.find((d: any) =>
                        d.id === detail.id && d.inventory_id === detail.inventory_id
                    );

                    if (originalDetail) {
                        const oldQuantity = Number(originalDetail.quantity) || 0;
                        const newQuantity = Number(detail.quantity) || 0;

                        // Chỉ kiểm tra nếu số lượng mới lớn hơn số lượng cũ
                        if (newQuantity > oldQuantity && inventory && inventory.quantity < (newQuantity - oldQuantity)) {
                            toast.error("Vượt quá số lượng tồn kho", {
                                description: `Không đủ hàng trong kho! ${detail.item_name}: Tồn kho hiện tại: ${Number(inventory.quantity)} ${inventory.unit}, cần xuất thêm: ${newQuantity - oldQuantity}`,
                                className: "text-lg font-medium",
                                descriptionClassName: "text-base"
                            });
                            return;
                        }
                        continue; // Đã xử lý xong trường hợp chỉnh sửa
                    }
                }

                // Xử lý trường hợp thêm mới hoặc không tìm thấy chi tiết gốc
                if (inventory && Number(inventory.quantity) < Number(detail.quantity)) {
                    toast.error("Vượt quá số lượng tồn kho", {
                        description: `Không đủ hàng trong kho! ${detail.item_name}: Tồn kho hiện tại: ${Number(inventory.quantity)} ${inventory.unit}, cần xuất: ${Number(detail.quantity)}`,
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                    });
                    return;
                }
            }
        }

        // Đảm bảo trường note được gửi đúng cách
        // Tạo một bản sao của dữ liệu và đặt trường note rõ ràng
        const formData = {
            ...data,
            note: data.note === undefined || data.note === null ? "" : data.note
        };

        // Debug dữ liệu form
        console.log("Original form data:", data);
        console.log("Modified form data being submitted:", formData);
        console.log("Note field in form data:", formData.note);

        // Kiểm tra xem có đang ở chế độ chỉnh sửa không
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
                            await deleteExportDetail(initialData.id, detail.id);
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

                        await updateExportDetail(initialData.id, detail.id, detailData);
                    }
                }

                // 3. Kiểm tra xem có hàng hóa mới nào chưa được lưu không
                const newDetails = details.filter(detail => !detail.id);

                // Nếu có hàng hóa mới chưa được lưu
                if (newDetails.length > 0) {
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
                            // Kiểm tra tồn kho
                            if (detail.inventory_id) {
                                const inventory = inventoryItems.find(item => item.id === detail.inventory_id);
                                if (inventory && inventory.quantity < detail.quantity) {
                                    toast.error("Vượt quá số lượng tồn kho", {
                                        description: `Không thể lưu ${detail.item_name}: Tồn kho hiện tại: ${Number(inventory.quantity)} ${inventory.unit}, cần xuất: ${Number(detail.quantity)}`,
                                        className: "text-lg font-medium",
                                        descriptionClassName: "text-base"
                                    });
                                    continue;
                                }
                            }

                            // Chuẩn bị dữ liệu gửi đi
                            const detailData = {
                                ...detail,
                                quantity: Number(detail.quantity),
                                price_before_tax: Number(detail.price_before_tax),
                                total_before_tax: undefined,
                                total_after_tax: undefined,
                                tax_amount: undefined
                            };

                            // Gọi API để thêm hàng hóa mới
                            const result = await addExportDetail(initialData.id, detailData);

                            if (result && result.success) {
                                // Cập nhật lại dữ liệu form với dữ liệu mới từ server
                                const updatedExport = result.data.export;
                                const updatedDetails = updatedExport.details.map((d: any) => ({
                                    ...d,
                                    quantity: Number(d.quantity) || 0,
                                    price_before_tax: Number(d.price_before_tax) || 0,
                                    tax_rate: d.tax_rate || "0%"
                                }));

                                // Cập nhật lại form với dữ liệu mới
                                form.setValue("details", updatedDetails);
                            }
                        }
                    }
                }

                // 4. Sau khi xử lý tất cả chi tiết, gọi hàm onSubmit để cập nhật hóa đơn
                const updatedFormValues = form.getValues();
                // Đảm bảo trường note được gửi đúng cách
                const updatedData = {
                    ...updatedFormValues,
                    note: updatedFormValues.note === undefined || updatedFormValues.note === null ? "" : updatedFormValues.note
                };
                console.log("Updated data after processing details:", updatedData);
                onSubmit(updatedData);
            } catch (error) {
                console.error("Error processing details:", error);
                toast.error("Đã xảy ra lỗi khi xử lý hàng hóa", {
                    description: "Vui lòng kiểm tra lại thông tin và thử lại",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                });
            } finally {
                setLoading(false);
            }
            return;
        }

        // Nếu không phải chế độ chỉnh sửa, gọi hàm onSubmit bình thường
        // Sử dụng formData đã được xử lý để đảm bảo trường note được gửi đúng cách
        onSubmit(formData);
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
                                    category: "HH", // Solo permitimos HH (hàng hóa) para exportaciones
                                    item_name: "",
                                    unit: "",
                                    quantity: 0,
                                    price_before_tax: 0,
                                    tax_rate: "10%",
                                    customer_id: null,
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
                                        <TableHead className="text-white font-bold text-center text-sm md:text-lg hidden md:table-cell w-[6%]">
                                            Đơn vị
                                        </TableHead>
                                        <TableHead className="text-white font-bold text-center text-sm md:text-lg hidden md:table-cell w-[8%]">
                                            Tồn kho
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
                                            Người mua
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
                                                                                    // Chỉ lọc các hàng hóa loại HH (hàng hóa) cho xuất kho
                                                                                    const inventoryOptions = inventoryItems
                                                                                        .filter(item => item.category === 'HH')
                                                                                        .map(item => ({
                                                                                            label: item.item_name,
                                                                                            value: item.id.toString(),
                                                                                            description: `Tồn kho: ${Number(item.quantity)} ${item.unit}`
                                                                                        }))

                                                                                    // Xác định giá trị hiện tại (ID hoặc tên hàng hóa)
                                                                                    const currentValue = field.value
                                                                                        ? field.value.toString()
                                                                                        : form.getValues(`details.${actualIndex}.item_name`) || ""

                                                                                    return (
                                                                                        <Combobox
                                                                                            options={inventoryOptions}
                                                                                            value={currentValue}
                                                                                            onChange={(value) => handleInventoryChange(value, actualIndex)}
                                                                                            onInputChange={(value) => handleInventoryInputChange(value, actualIndex)}
                                                                                            placeholder="Chọn hàng hóa từ kho"
                                                                                            emptyMessage="Không tìm thấy hàng hóa."
                                                                                            allowCustomValue={false}
                                                                                            disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                                                                                            triggerClassName="h-10 text-sm"
                                                                                        />
                                                                                    )
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <Input
                                                                        type="hidden"
                                                                        {...form.register(`details.${actualIndex}.item_name`)}
                                                                    />
                                                                    {isSubmitted && form.formState.errors.details?.[actualIndex]?.item_name && (
                                                                        <p className="text-red-500 text-xs">{form.formState.errors.details?.[actualIndex]?.item_name?.message}</p>
                                                                    )}
                                                                    {inventoryError[actualIndex] && (
                                                                        <p className="text-red-500 text-xs">{inventoryError[actualIndex]}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-1 md:px-2 py-2 md:py-3 hidden md:table-cell text-center text-sm md:text-base">
                                                    <span className="text-sm md:text-base">
                                                        {form.getValues(`details.${actualIndex}.unit`) || ""}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-1 md:px-2 py-2 md:py-3 hidden md:table-cell text-center text-sm md:text-base">
                                                    <span className={`text-sm md:text-base ${form.getValues(`details.${actualIndex}.inventory_id`) ? 'font-medium' : ''}`}>
                                                        {form.getValues(`details.${actualIndex}.inventory_id`) ?
                                                            (() => {
                                                                const inventoryId = form.getValues(`details.${actualIndex}.inventory_id`);
                                                                const inventory = inventoryItems.find(item => item.id === inventoryId);

                                                                // Hiển thị số lượng tồn kho dự kiến nếu có
                                                                if (inventoryId && estimatedInventory[inventoryId] !== undefined) {
                                                                    return (
                                                                        <>
                                                                            <span className="line-through text-gray-500 mr-1">{inventory ? Number(inventory.quantity) : "N/A"}</span>
                                                                            <span className="text-blue-600">{estimatedInventory[inventoryId]}</span>
                                                                        </>
                                                                    );
                                                                }

                                                                return inventory ? Number(inventory.quantity) : "N/A";
                                                            })() : "N/A"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-1 md:px-2 py-2 md:py-3 text-sm md:text-base">
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
                                                                        // Kiểm tra tồn kho
                                                                        handleQuantityChange(value, actualIndex);
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
                                                    <span className="text-sm md:text-base font-bold">
                                                        {formatCurrency(
                                                            roundToThreeDecimals(
                                                                (form.getValues(`details.${actualIndex}.quantity`) || 0) *
                                                                (form.getValues(`details.${actualIndex}.price_before_tax`) || 0)
                                                            )
                                                        )}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-1 md:px-2 py-2 md:py-3 text-right font-medium">
                                                    <span className="text-sm md:text-base font-bold">
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
                                                                    name={`details.${actualIndex}.customer_id`}
                                                                    control={form.control}
                                                                    render={({ field }) => {
                                                                        // Chuyển đổi danh sách khách hàng thành options cho Combobox
                                                                        const customerOptions = customers.map(customer => ({
                                                                            label: customer.tax_code ? `${customer.name} (MST: ${customer.tax_code})` : customer.name,
                                                                            value: customer.id.toString(),
                                                                            description: undefined
                                                                        }))

                                                                        // Xác định giá trị hiện tại (ID hoặc tên khách hàng)
                                                                        const currentValue = field.value
                                                                            ? field.value.toString()
                                                                            : form.getValues(`details.${actualIndex}.buyer_name`) || ""

                                                                        return (
                                                                            <Combobox
                                                                                options={customerOptions}
                                                                                value={currentValue}
                                                                                onChange={(value) => handleCustomerChange(value, actualIndex)}
                                                                                onInputChange={(value) => handleCustomerInputChange(value, actualIndex)}
                                                                                placeholder="Chọn hoặc nhập tên người mua"
                                                                                emptyMessage="Không tìm thấy người mua. Nhập tên để tạo mới."
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
                                                                        customerForm.reset({
                                                                            name: "",
                                                                            tax_code: "",
                                                                            address: "",
                                                                            phone: "",
                                                                            email: "",
                                                                        });
                                                                        setIsCustomerModalOpen(true);
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
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
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

            {/* Modal thêm mới khách hàng */}
            <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-3 md:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg md:text-xl">Thêm khách hàng mới</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault(); // Ngăn chặn sự kiện submit mặc định
                        e.stopPropagation(); // Ngăn chặn sự kiện lan truyền lên form cha
                        customerForm.handleSubmit(handleAddCustomer)(e);
                    }} className="space-y-4 md:space-y-8">
                        <div className="space-y-4 md:space-y-6">
                            <div>
                                <Label htmlFor="name" className="text-sm md:text-base mb-2 md:mb-3 block">Tên khách hàng *</Label>
                                <Input
                                    id="name"
                                    {...customerForm.register("name")}
                                    className="h-10 md:h-12 text-sm md:text-base"
                                />
                                {customerForm.formState.isSubmitted && customerForm.formState.errors.name && (
                                    <p className="text-red-500 text-xs md:text-sm mt-1">{customerForm.formState.errors.name.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="tax_code" className="text-sm md:text-base mb-2 md:mb-3 block">Mã số thuế</Label>
                                <Input
                                    id="tax_code"
                                    {...customerForm.register("tax_code")}
                                    className="h-10 md:h-12 text-sm md:text-base"
                                />
                            </div>
                            <div>
                                <Label htmlFor="address" className="text-sm md:text-base mb-2 md:mb-3 block">Địa chỉ</Label>
                                <Input
                                    id="address"
                                    {...customerForm.register("address")}
                                    className="h-10 md:h-12 text-sm md:text-base"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone" className="text-sm md:text-base mb-2 md:mb-3 block">Số điện thoại</Label>
                                <Input
                                    id="phone"
                                    {...customerForm.register("phone")}
                                    className="h-10 md:h-12 text-sm md:text-base"
                                />
                            </div>
                            <div>
                                <Label htmlFor="email" className="text-sm md:text-base mb-2 md:mb-3 block">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    {...customerForm.register("email")}
                                    className="h-10 md:h-12 text-sm md:text-base"
                                />
                                {customerForm.formState.isSubmitted && customerForm.formState.errors.email && (
                                    <p className="text-red-500 text-xs md:text-sm mt-1">{customerForm.formState.errors.email.message}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2 md:gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                                onClick={() => setIsCustomerModalOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                                disabled={loading}
                                onClick={() => customerForm.handleSubmit(handleAddCustomer)()}
                            >
                                {loading ? "Đang xử lý..." : "Thêm khách hàng"}
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
                    <form onSubmit={inventoryForm.handleSubmit(handleAddInventory)} className="space-y-4 md:space-y-8">
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
                                            onValueChange={field.onChange}
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
                            {/* Ố nhập số lượng ban đầu */}
                            <div>
                                <Label htmlFor="quantity" className="text-sm md:text-base mb-2 md:mb-3 block">Số lượng ban đầu *</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    {...inventoryForm.register("quantity", { valueAsNumber: true })}
                                    className="h-10 md:h-12 text-sm md:text-base"
                                />
                                {inventoryForm.formState.errors.quantity && (
                                    <p className="text-red-500 text-xs md:text-sm mt-1">{inventoryForm.formState.errors.quantity.message}</p>
                                )}
                            </div>
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
                                type="submit"
                                className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                                disabled={loading}
                            >
                                {loading ? "Đang xử lý..." : "Thêm hàng hóa"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </form>
    )
}