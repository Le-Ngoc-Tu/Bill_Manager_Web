"use client"

import { useState, useEffect, useRef } from "react"
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
import { DropdownPortal } from "@/components/ui/dropdown-portal"
import { formatCurrency, formatCurrencyInput } from "@/lib/utils"
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
import type { Customer } from "@/lib/api/customers"
import type { Inventory } from "@/lib/api/inventory"
import { createSupplier, getSuppliers } from "@/lib/api/suppliers"
import { createCustomer, getCustomers } from "@/lib/api/customers"
import { createInventoryItem, getInventoryItems } from "@/lib/api/inventory"
import { addExportDetail, updateExportDetail, deleteExportDetail, updateExport } from "@/lib/api/exports"
// import { uploadPdfToOcrExport, convertOcrResultToExportDetails, getOriginalOcrResult, getOcrTaskResult } from "@/lib/api/ocr"
// import OcrResultViewer from "@/components/ocr/OcrResultViewer"
// import ExportOcrResultViewer from "@/components/ocr/ExportOcrResultViewer"

// Định nghĩa Zod schema để validation
const exportDetailSchema = z.object({
    id: z.number().optional(),
    category: z.enum(["HH", "CP"]).optional().default("HH"),
    inventory_id: z.number().nullable().optional(),
    item_name: z.string().min(1, "Tên hàng hóa là bắt buộc"),
    unit: z.string().optional().default(""),
    quantity: z.coerce.number().min(0.001, "Số lượng phải lớn hơn 0"),
    price_before_tax: z.coerce.number().min(0, "Đơn giá không được âm"),
    tax_rate: z.string().default("0%"),
    // Thêm các trường tính toán
    total_before_tax: z.coerce.number().min(0, "Tổng tiền trước thuế không được âm").optional(),
    tax_amount: z.coerce.number().min(0, "Thuế không được âm").optional(),
    total_after_tax: z.coerce.number().min(0, "Tổng tiền sau thuế không được âm").optional(),
    // Thêm cờ để đánh dấu người dùng đã tự chỉnh sửa
    is_manually_edited: z.boolean().optional().default(false),
    // Thêm trường OCR task ID
    // ocrTaskId: z.string().optional(),
    // Thêm flag để phân biệt dịch vụ lao động
    isLaborService: z.boolean().optional().default(false),
    // Removed customer_id, buyer_name, buyer_tax_code - now at invoice level
})

const exportFormSchema = z.object({
    invoice_number: z.string().min(1, "Số hóa đơn là bắt buộc"),
    invoice_date: z.date({
        required_error: "Ngày lập hóa đơn là bắt buộc"
    }),
    description: z.string().optional(),
    note: z.string().optional(),
    details: z.array(exportDetailSchema).min(1, "Phải có ít nhất một mặt hàng"),
    // Thêm cờ để đánh dấu người dùng đã tự chỉnh sửa các trường tổng tiền
    is_invoice_totals_manually_edited: z.boolean().optional().default(false),
    // Các trường tổng tiền của hóa đơn
    total_before_tax: z.number().optional(),
    total_tax: z.number().optional(),
    total_after_tax: z.number().optional(),
    // Added supplier/customer info at invoice level
    supplier_id: z.number().nullable().optional(),
    customer_id: z.number().nullable().optional(),
    seller_name: z.string().optional(),
    seller_tax_code: z.string().optional(),
    seller_address: z.string().optional(),
    buyer_name: z.string().optional(),
    buyer_tax_code: z.string().optional(),
    buyer_address: z.string().optional(),
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
type InventoryFormValues = z.infer<typeof inventoryFormSchema>

interface ExportFormProps {
    mode: "add" | "edit" | "view"
    initialData?: any
    onSubmit: (data: ExportFormValues) => void
    onCancel: () => void
}

export function ExportForm({ mode, initialData, onSubmit, onCancel }: ExportFormProps) {
    const isViewMode = mode === "view"
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [inventoryItems, setInventoryItems] = useState<Inventory[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [inventoryError, setInventoryError] = useState<{ [key: number]: string }>({})
    const [itemNameError, setItemNameError] = useState<{ [key: number]: string }>({})
    const [priceWarning, setPriceWarning] = useState<{ [key: number]: string }>({})

    // State cho modal thêm mới
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

    // State cho OCR
    // const [isOcrModalOpen, setIsOcrModalOpen] = useState(false)
    // const [isPdfUploading, setIsPdfUploading] = useState(false)
    // const [pdfUploadProgress, setPdfUploadProgress] = useState(0)
    // const [lastOcrResult, setLastOcrResult] = useState<any>(null)
    // const [lastValidItems, setLastValidItems] = useState<any[]>([])
    // const [lastSkippedItems, setLastSkippedItems] = useState<any[]>([])
    // const [lastOcrTaskId, setLastOcrTaskId] = useState<string>("")

    // State cho manual calculation
    const [isCalculating, setIsCalculating] = useState(false)

    // State để force re-render input fields sau manual calculation
    const [inputKey, setInputKey] = useState(0)

    // State để quản lý giá trị hiển thị của các ô tổng tiền
    const [totalBeforeTaxDisplay, setTotalBeforeTaxDisplay] = useState("")
    const [totalTaxDisplay, setTotalTaxDisplay] = useState("")
    const [totalAfterTaxDisplay, setTotalAfterTaxDisplay] = useState("")

    // State để quản lý thông tin người mua mặc định
    const [defaultBuyerName, setDefaultBuyerName] = useState("")
    const [defaultBuyerTaxCode, setDefaultBuyerTaxCode] = useState("")

    // State cho dropdown tìm kiếm người mua
    const [showBuyerDropdown, setShowBuyerDropdown] = useState(false)
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
    const [defaultCustomerId, setDefaultCustomerId] = useState<number | null>(null)

    // State cho dropdown tìm kiếm người bán
    const [showSellerDropdown, setShowSellerDropdown] = useState(false)
    const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
    const [defaultSupplierId, setDefaultSupplierId] = useState<number | null>(null)
    const [defaultSellerName, setDefaultSellerName] = useState("")
    const [defaultSellerTaxCode, setDefaultSellerTaxCode] = useState("")

    // Ref cho input người mua
    const buyerInputRef = useRef<HTMLInputElement>(null)
    // Ref cho input người bán
    const sellerInputRef = useRef<HTMLInputElement>(null)

    // Refs cho các input tên hàng
    const itemInputRefs = useRef<(HTMLInputElement | null)[]>([])

    // State để quản lý việc hiển thị dropdown cho từng input
    const [showItemDropdown, setShowItemDropdown] = useState<Record<number, boolean>>({})

    // Hàm đóng dropdown
    const closeDropdown = () => {
        setShowItemDropdown({})
    }

    // Utility functions cho định dạng số Việt Nam
    const formatVietnameseNumber = (value: number | string): string => {
        if (!value && value !== 0) return "";

        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue === 0) return "";

        // Tách phần nguyên và phần thập phân
        const parts = numValue.toString().split('.');
        let integerPart = parts[0];
        let decimalPart = parts[1] || '';

        // Thêm dấu chấm phân cách hàng nghìn cho phần nguyên
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        // Xử lý phần thập phân (tối đa 3 chữ số)
        if (decimalPart) {
            decimalPart = decimalPart.substring(0, 3);
            // Loại bỏ số 0 thừa ở cuối
            decimalPart = decimalPart.replace(/0+$/, '');

            if (decimalPart) {
                return integerPart + ',' + decimalPart;
            }
        }

        return integerPart;
    }

    const parseVietnameseNumber = (value: string): number => {
        if (!value || value.trim() === '') return 0;

        // Loại bỏ dấu chấm phân cách hàng nghìn và thay dấu phẩy thành dấu chấm
        const cleanValue = value
            .replace(/\./g, '') // Loại bỏ dấu chấm phân cách hàng nghìn
            .replace(',', '.'); // Thay dấu phẩy thành dấu chấm cho phần thập phân

        const numValue = parseFloat(cleanValue);
        return isNaN(numValue) ? 0 : numValue;
    }

    // Function để parse số nguyên (chỉ loại bỏ dấu chấm phân cách hàng nghìn)
    const parseIntegerNumber = (value: string): number => {
        if (!value || value.trim() === '') return 0;

        // Chỉ loại bỏ dấu chấm phân cách hàng nghìn (không có dấu phẩy)
        const cleanValue = value.replace(/\./g, '');

        const numValue = parseInt(cleanValue, 10);
        return isNaN(numValue) ? 0 : numValue;
    }

    // Function để format input khi đang nhập (real-time) - cho phép thập phân
    const formatInputWhileTyping = (value: string, maxDecimals: number = 3): string => {
        // Chỉ cho phép số, dấu chấm và dấu phẩy
        value = value.replace(/[^0-9.,]/g, '');

        // Đảm bảo chỉ có một dấu phẩy
        const commaCount = (value.match(/,/g) || []).length;
        if (commaCount > 1) {
            const parts = value.split(',');
            value = parts[0] + ',' + parts.slice(1).join('');
        }

        // Giới hạn số chữ số thập phân
        if (value.includes(',')) {
            const parts = value.split(',');
            if (parts[1] && parts[1].length > maxDecimals) {
                parts[1] = parts[1].substring(0, maxDecimals);
                value = parts[0] + ',' + parts[1];
            }
        }

        // Tách phần nguyên và phần thập phân
        const parts = value.split(',');
        let integerPart = parts[0];
        const decimalPart = parts[1];

        // Loại bỏ dấu chấm cũ để tránh conflict
        integerPart = integerPart.replace(/\./g, '');

        // Thêm dấu chấm phân cách hàng nghìn cho phần nguyên
        if (integerPart.length > 3) {
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }

        // Ghép lại với phần thập phân nếu có
        if (decimalPart !== undefined) {
            return integerPart + ',' + decimalPart;
        }

        return integerPart;
    }

    // Function để format input chỉ cho số nguyên (không cho phép dấu phẩy)
    const formatInputWhileTypingInteger = (value: string): string => {
        // Chỉ cho phép số và dấu chấm (loại bỏ dấu phẩy)
        value = value.replace(/[^0-9.]/g, '');

        // Loại bỏ dấu chấm cũ để tránh conflict
        value = value.replace(/\./g, '');

        // Thêm dấu chấm phân cách hàng nghìn
        if (value.length > 3) {
            value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }

        return value;
    }

    const handleVietnameseNumberInput = (
        e: React.ChangeEvent<HTMLInputElement>,
        setValue: (value: number) => void,
        maxDecimals: number = 3
    ) => {
        const rawValue = e.target.value;

        // Format value khi đang nhập
        const formattedValue = formatInputWhileTyping(rawValue, maxDecimals);

        // Cập nhật display value
        e.target.value = formattedValue;

        // Parse và set giá trị số
        const numValue = parseVietnameseNumber(formattedValue);
        setValue(numValue);
    }

    // Hàm định dạng tiền tệ cho input (hiển thị với định dạng Việt Nam)
    const formatCurrencyInputVN = (value: number): string => {
        if (value === 0) return "";

        // Làm tròn thành số nguyên
        const roundedValue = Math.round(value);

        // Sử dụng formatVietnameseNumber để định dạng theo chuẩn Việt Nam
        return formatVietnameseNumber(roundedValue);
    }

    // Hàm định dạng hiển thị đơn giá thông minh (đồng bộ với ImportForm)
    const formatPriceDisplay = (value: number): string => {
        if (value === 0) return "";

        // Sử dụng formatVietnameseNumber để có dấu phân cách hàng nghìn giống ImportForm
        return formatVietnameseNumber(value);
    }

    // Hàm kiểm tra cảnh báo giá xuất thấp hơn giá nhập
    const checkPriceWarning = (exportPrice: number, inventoryId: number | null, index: number) => {
        if (!inventoryId || exportPrice <= 0) {
            // Xóa cảnh báo nếu không có inventory_id hoặc giá xuất <= 0
            const newPriceWarning = { ...priceWarning }
            delete newPriceWarning[index]
            setPriceWarning(newPriceWarning)
            return
        }

        // Tìm hàng hóa trong inventory để lấy giá nhập gần nhất
        const inventoryItem = inventoryItems.find(item => item.id === inventoryId)

        if (inventoryItem && inventoryItem.latest_import_price && inventoryItem.latest_import_price > 0) {
            const latestImportPrice = inventoryItem.latest_import_price

            if (exportPrice < latestImportPrice) {
                // Hiển thị cảnh báo nếu giá xuất thấp hơn giá nhập
                const formattedExportPrice = formatVietnameseNumber(exportPrice)
                const formattedImportPrice = formatVietnameseNumber(latestImportPrice)

                setPriceWarning({
                    ...priceWarning,
                    [index]: `⚠️ Cảnh báo: Đơn giá xuất (${formattedExportPrice} VNĐ) thấp hơn đơn giá nhập gần nhất (${formattedImportPrice} VNĐ)`
                })
            } else {
                // Xóa cảnh báo nếu giá xuất >= giá nhập
                const newPriceWarning = { ...priceWarning }
                delete newPriceWarning[index]
                setPriceWarning(newPriceWarning)
            }
        } else {
            // Xóa cảnh báo nếu không có thông tin giá nhập
            const newPriceWarning = { ...priceWarning }
            delete newPriceWarning[index]
            setPriceWarning(newPriceWarning)
        }
    }

    // Hàm kiểm tra tên hàng hóa có tồn tại trong kho không (bỏ qua cho dịch vụ lao động)
    const validateItemName = (itemName: string, index: number) => {
        if (!itemName || itemName.trim() === "") {
            // Nếu tên hàng rỗng, xóa lỗi
            const newItemNameError = { ...itemNameError }
            delete newItemNameError[index]
            setItemNameError(newItemNameError)
            return true
        }

        // Kiểm tra xem có phải là dịch vụ lao động không
        const unit = form.getValues(`details.${index}.unit`) || "";
        const isLaborService = unit.toLowerCase().includes('công');

        // Nếu là dịch vụ lao động, bỏ qua kiểm tra tồn kho
        if (isLaborService) {
            const newItemNameError = { ...itemNameError }
            delete newItemNameError[index]
            setItemNameError(newItemNameError)
            return true
        }

        // Kiểm tra xem hàng hóa có tồn tại trong kho và còn hàng không
        const existingItem = inventoryItems.find(
            item => item.item_name.toLowerCase() === itemName.toLowerCase() &&
                   item.category === 'HH' &&
                   Number(item.quantity) > 0
        )

        if (!existingItem) {
            // Nếu không tồn tại hoặc hết hàng, hiển thị lỗi
            const outOfStockItem = inventoryItems.find(
                item => item.item_name.toLowerCase() === itemName.toLowerCase() &&
                       item.category === 'HH' &&
                       Number(item.quantity) <= 0
            );

            if (outOfStockItem) {
                setItemNameError({
                    ...itemNameError,
                    [index]: "Hàng hóa này đã hết hàng trong kho. Vui lòng chọn hàng hóa khác."
                });
            } else {
                setItemNameError({
                    ...itemNameError,
                    [index]: "Hàng hóa này không tồn tại trong kho. Vui lòng chọn hàng hóa từ danh sách gợi ý."
                });
            }
            return false
        } else {
            // Nếu tồn tại, xóa lỗi
            const newItemNameError = { ...itemNameError }
            delete newItemNameError[index]
            setItemNameError(newItemNameError)
            return true
        }
    }

    // Khai báo form cho thêm mới inventory

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
                // Thêm các trường tổng tiền của hóa đơn
                total_before_tax: initialData.total_before_tax || 0,
                total_tax: initialData.tax_amount || 0,
                total_after_tax: initialData.total_after_tax || 0,
                is_invoice_totals_manually_edited: initialData.is_invoice_totals_manually_edited || false,
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
                        // Removed customer_id - now at invoice level
                        inventory_id: null,
                        total_before_tax: 0,
                        tax_amount: 0,
                        total_after_tax: 0,
                        is_manually_edited: false,
                    },
                ],
                // Thêm các trường tổng tiền của hóa đơn
                total_before_tax: 0,
                total_tax: 0,
                total_after_tax: 0,
                is_invoice_totals_manually_edited: false,
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

    // Không tự động tính toán khi form được tải - cho phép người dùng nhập thủ công
    // useEffect(() => {
    //     fields.forEach((_, index) => {
    //         calculateDetailTotals(index)
    //     })
    // }, [fields.length])

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

    // Khởi tạo giá trị hiển thị ban đầu
    useEffect(() => {
        const details = form.getValues("details") || [];

        const totalBeforeTax = initialData && initialData.total_before_tax
            ? initialData.total_before_tax
            : details.reduce((sum, detail) => sum + (Number(detail?.total_before_tax || 0)), 0);

        const totalTax = initialData && initialData.tax_amount
            ? initialData.tax_amount
            : details.reduce((sum, detail) => sum + (Number(detail?.tax_amount || 0)), 0);

        const totalAfterTax = initialData && initialData.total_after_tax
            ? initialData.total_after_tax
            : details.reduce((sum, detail) => sum + (Number(detail?.total_after_tax || 0)), 0);

        // Chỉ hiển thị giá trị nếu có dữ liệu thực tế, không hiển thị "0"
        setTotalBeforeTaxDisplay(totalBeforeTax > 0 ? formatCurrencyInput(totalBeforeTax) : "");
        setTotalTaxDisplay(totalTax > 0 ? formatCurrencyInput(totalTax) : "");
        setTotalAfterTaxDisplay(totalAfterTax > 0 ? formatCurrencyInput(totalAfterTax) : "");

        // Khởi tạo thông tin người bán và người mua mặc định
        if (initialData) {
            // Thiết lập thông tin người bán từ dữ liệu ban đầu
            if (initialData.supplier?.name || initialData.seller_name) {
                const sellerName = initialData.supplier?.name || initialData.seller_name || "";
                const sellerTaxCode = initialData.supplier?.tax_code || initialData.seller_tax_code || "";
                const sellerAddress = initialData.supplier?.address || initialData.seller_address || "";
                const supplierId = initialData.supplier_id || null;

                // Set seller info in form
                form.setValue("seller_name", sellerName);
                form.setValue("seller_tax_code", sellerTaxCode);
                form.setValue("seller_address", sellerAddress);
                if (supplierId) {
                    form.setValue("supplier_id", supplierId);
                }

                // Sync state với form values
                setDefaultSellerName(sellerName);
                setDefaultSellerTaxCode(sellerTaxCode);
                setDefaultSupplierId(supplierId);
            }

            // Thiết lập thông tin người mua từ dữ liệu ban đầu
            if (initialData.customer?.name || initialData.buyer_name) {
                const buyerName = initialData.customer?.name || initialData.buyer_name || "";
                const buyerTaxCode = initialData.customer?.tax_code || initialData.buyer_tax_code || "";
                const customerId = initialData.customer_id || null;

                setDefaultBuyerName(buyerName);
                setDefaultBuyerTaxCode(buyerTaxCode);
                setDefaultCustomerId(customerId);

                // Set buyer info in form
                form.setValue("buyer_name", buyerName);
                form.setValue("buyer_tax_code", buyerTaxCode);
                if (customerId) {
                    form.setValue("customer_id", customerId);
                }
            }
        }
    }, [initialData]);

    // LOẠI BỎ auto-calculation useEffect - chỉ tính toán khi manual calculation
    // useEffect đã bị loại bỏ để tắt auto-calculation hoàn toàn

    // Fetch customers và inventory items từ API
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                // Fetch suppliers sử dụng API
                const suppliersResult = await getSuppliers()
                if (suppliersResult && suppliersResult.success) {
                    const suppliersData = suppliersResult.data || []
                    setSuppliers(suppliersData)
                }

                // Fetch customers sử dụng API
                const customersResult = await getCustomers()
                if (customersResult && customersResult.success) {
                    const customersData = customersResult.data || []
                    setCustomers(customersData)
                }

                // Fetch inventory items sử dụng API với thông tin giá nhập gần nhất
                const inventoryResult = await getInventoryItems(false, "", true) // includeLatestImportPrice = true
                if (inventoryResult && inventoryResult.success) {
                    const inventoryData = inventoryResult.data || [];
                    // console.log("📦 Inventory items loaded:", inventoryData.length);
                    // console.log("📦 Sample inventory items:", inventoryData.slice(0, 3).map((item: Inventory) => ({
                    //     id: item.id,
                    //     name: item.item_name,
                    //     unit: item.unit,
                    //     quantity: item.quantity,
                    //     category: item.category
                    // })));
                    setInventoryItems(inventoryData);
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

        // Xóa lỗi tên hàng
        const newItemNameError = { ...itemNameError }
        delete newItemNameError[index]
        setItemNameError(newItemNameError)

        // Xóa cảnh báo giá
        const newPriceWarning = { ...priceWarning }
        delete newPriceWarning[index]
        setPriceWarning(newPriceWarning)
    }

    // Tính toán tổng tiền cho từng dòng
    const calculateDetailTotals = (index: number, forceCalculation = false) => {
        const details = form.getValues("details")
        const detail = details[index]

        if (!detail) return

        // Kiểm tra xem người dùng đã tự chỉnh sửa giá trị chưa
        // Nếu đã chỉnh sửa thủ công, giữ nguyên giá trị và không tính toán lại
        // TRỪ KHI forceCalculation = true
        if (detail.is_manually_edited && !forceCalculation) {
            return;
        }

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
            taxRate = Number(detail.tax_rate?.replace("%", "") || 0)
        }

        // Tính tổng tiền trước thuế và làm tròn thành số nguyên (giống backend)
        const totalBeforeTax = Math.round(quantity * priceBeforeTax)
        // Tính thuế dựa trên tổng tiền trước thuế đã làm tròn (giống backend)
        const taxAmount = Math.round((totalBeforeTax * taxRate) / 100)
        // Tính tổng tiền sau thuế bằng cách cộng tổng tiền trước thuế đã làm tròn và thuế đã làm tròn
        const totalAfterTax = totalBeforeTax + taxAmount

        // Update the calculated fields - đã làm tròn ở các bước trước
        form.setValue(`details.${index}.total_before_tax`, totalBeforeTax)
        form.setValue(`details.${index}.tax_amount`, taxAmount)
        form.setValue(`details.${index}.total_after_tax`, totalAfterTax)

        // Force re-render to update displayed values
        form.trigger(`details.${index}`)

        // Không tự động cập nhật tổng tiền hóa đơn - chỉ khi manual calculation
    }

    // Hàm cập nhật tổng tiền của toàn bộ hóa đơn (chỉ khi manual calculation)
    const updateInvoiceTotals = () => {
        // CHỈ được gọi từ handleManualCalculation - không tự động cập nhật
        const details = form.getValues("details")

        // Tính tổng tiền trước thuế, tổng thuế và tổng thanh toán
        let totalBeforeTax = 0
        let totalTax = 0
        let totalAfterTax = 0

        details.forEach(detail => {
            totalBeforeTax += Number(detail.total_before_tax || 0)
            totalTax += Number(detail.tax_amount || 0)
            totalAfterTax += Number(detail.total_after_tax || 0)
        })

        // Cập nhật form values (chỉ khi manual calculation)
        form.setValue("total_before_tax", totalBeforeTax)
        form.setValue("total_tax", totalTax)
        form.setValue("total_after_tax", totalAfterTax)
    }

    // Hàm tính toán thủ công cho tất cả items - Force recalculation
    const handleManualCalculation = async () => {
        setIsCalculating(true)

        try {
            const details = form.getValues("details")

            // BƯỚC 1: Reset tất cả manual edit flags trước khi tính toán
            details.forEach((_, index) => {
                form.setValue(`details.${index}.is_manually_edited`, false)
            })

            // Reset invoice level manual edit flag
            form.setValue("is_invoice_totals_manually_edited", false)

            // BƯỚC 2: Force tính toán lại tất cả items sử dụng calculateDetailTotals với forceCalculation = true
            details.forEach((_, index) => {
                calculateDetailTotals(index, true) // Force calculation bỏ qua manual edit check
            })

            // BƯỚC 3: Cập nhật tổng tiền invoice
            updateInvoiceTotals()

            // BƯỚC 4: Cập nhật display values
            const allDetails = form.getValues("details")
            const newTotalBeforeTax = allDetails.reduce((sum, detail) => sum + (Number(detail.total_before_tax) || 0), 0)
            const newTotalTax = allDetails.reduce((sum, detail) => sum + (Number(detail.tax_amount) || 0), 0)
            const newTotalAfterTax = allDetails.reduce((sum, detail) => sum + (Number(detail.total_after_tax) || 0), 0)

            setTotalBeforeTaxDisplay(formatCurrencyInputVN(newTotalBeforeTax))
            setTotalTaxDisplay(formatCurrencyInputVN(newTotalTax))
            setTotalAfterTaxDisplay(formatCurrencyInputVN(newTotalAfterTax))

            // BƯỚC 5: Force re-render toàn bộ form để cập nhật UI
            // Trigger re-render cho từng field để đảm bảo UI sync
            details.forEach((_, index) => {
                form.trigger(`details.${index}.total_before_tax`)
                form.trigger(`details.${index}.tax_amount`)
                form.trigger(`details.${index}.total_after_tax`)
                form.trigger(`details.${index}.is_manually_edited`)
            })

            // Trigger re-render cho invoice totals
            form.trigger("total_before_tax")
            form.trigger("total_tax")
            form.trigger("total_after_tax")
            form.trigger("is_invoice_totals_manually_edited")

            // Force re-render toàn bộ form
            form.trigger()

            // Đảm bảo UI được cập nhật hoàn toàn
            setTimeout(() => {
                // Final trigger để đảm bảo tất cả input fields được sync
                details.forEach((_, index) => {
                    form.trigger(`details.${index}`)
                })
                form.trigger()

                // Force re-render input fields bằng cách thay đổi key
                setInputKey(prev => prev + 1)
            }, 50)

            // Hiển thị thông báo thành công
            toast.success("Tính toán hoàn thành", {
                description: `Đã tính toán lại tất cả ${details.length} mặt hàng từ số lượng và đơn giá`,
                className: "text-lg font-medium",
                descriptionClassName: "text-base"
            })

        } catch (error) {
            console.error("Error in manual calculation:", error)
            toast.error("Lỗi tính toán", {
                description: "Đã xảy ra lỗi khi tính toán. Vui lòng thử lại.",
                className: "text-lg font-medium",
                descriptionClassName: "text-base"
            })
        } finally {
            setIsCalculating(false)
        }
    }

    // Hàm xử lý cập nhật chi tiết trong chế độ chỉnh sửa (auto-update)
    const handleUpdateDetailInEditMode = async (index: number) => {
        if (!initialData?.id) return;

        try {
            setLoading(true);

            // Lấy dữ liệu chi tiết cần cập nhật
            const details = form.getValues("details");
            const detail = details[index];

            // Tính toán lại các giá trị tổng trước khi cập nhật
            calculateDetailTotals(index, true); // Force calculation

            // Lấy lại dữ liệu sau khi tính toán
            const updatedDetails = form.getValues("details");
            const updatedDetail = updatedDetails[index];
            const detailId = updatedDetail.id;

            if (!detailId) {
                toast.error("Lỗi", {
                    description: "Không tìm thấy ID chi tiết để cập nhật",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                });
                return;
            }

            // Chuẩn bị dữ liệu để gửi API
            // Tính toán lại các trường nếu chưa có
            const quantity = Number(detail.quantity) || 0;
            const priceBeforeTax = Number(detail.price_before_tax) || 0;
            const taxRate = detail.tax_rate || "0%";

            // Tính toán total_before_tax
            const totalBeforeTax = quantity * priceBeforeTax;

            // Tính toán tax_amount
            const taxPercent = taxRate === "KCT" ? 0 : Number(taxRate.replace("%", "") || 0);
            const taxAmount = (totalBeforeTax * taxPercent) / 100;

            // Tính toán total_after_tax
            const totalAfterTax = totalBeforeTax + taxAmount;

            const updateData = {
                category: detail.category || "HH",
                inventory_id: detail.inventory_id,
                item_name: detail.item_name,
                unit: detail.unit,
                quantity: quantity,
                price_before_tax: priceBeforeTax,
                tax_rate: taxRate,
                // Sử dụng giá trị đã tính toán hoặc giá trị từ form nếu đã chỉnh sửa thủ công
                total_before_tax: detail.is_manually_edited ? (Number(detail.total_before_tax) || 0) : totalBeforeTax,
                tax_amount: detail.is_manually_edited ? (Number(detail.tax_amount) || 0) : taxAmount,
                total_after_tax: detail.is_manually_edited ? (Number(detail.total_after_tax) || 0) : totalAfterTax,
                is_manually_edited: detail.is_manually_edited || false,
            };

            console.log("Export update detail data being sent:", updateData);

            // Gọi API cập nhật chi tiết
            const result = await updateExportDetail(initialData.id, detailId, updateData);

            if (result.success) {
                // Cập nhật tổng tiền hóa đơn
                const invoiceTotals = form.getValues();
                const invoiceUpdateData = {
                    invoice_number: invoiceTotals.invoice_number,
                    invoice_date: invoiceTotals.invoice_date,
                    description: invoiceTotals.description || "",
                    note: invoiceTotals.note || "",
                    total_before_tax: invoiceTotals.total_before_tax,
                    total_tax: invoiceTotals.total_tax,
                    total_after_tax: invoiceTotals.total_after_tax,
                    is_invoice_totals_manually_edited: invoiceTotals.is_invoice_totals_manually_edited || false,
                    details: invoiceTotals.details || []
                };

                await updateExport(initialData.id, invoiceUpdateData);

                // Tắt chế độ chỉnh sửa
                setEditingRowIndex(null);

                // Cập nhật tổng tiền hóa đơn sau khi cập nhật chi tiết
                updateInvoiceTotals();

                // Cập nhật display values với giá trị mới từ form
                const allDetails = form.getValues("details");
                const newTotalBeforeTax = allDetails.reduce((sum, detail) => sum + (Number(detail.total_before_tax) || 0), 0);
                const newTotalTax = allDetails.reduce((sum, detail) => sum + (Number(detail.tax_amount) || 0), 0);
                const newTotalAfterTax = allDetails.reduce((sum, detail) => sum + (Number(detail.total_after_tax) || 0), 0);

                setTotalBeforeTaxDisplay(formatCurrencyInput(newTotalBeforeTax));
                setTotalTaxDisplay(formatCurrencyInput(newTotalTax));
                setTotalAfterTaxDisplay(formatCurrencyInput(newTotalAfterTax));

                // Force re-render input fields để hiển thị values mới
                setInputKey(prev => prev + 1);

                toast.success("Thành công", {
                    description: "Đã cập nhật chi tiết hàng hóa",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                });
            } else {
                toast.error("Lỗi", {
                    description: result.message || "Không thể cập nhật chi tiết",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                });
            }
        } catch (error) {
            console.error("Error updating detail:", error);
            toast.error("Lỗi", {
                description: "Đã xảy ra lỗi khi cập nhật chi tiết",
                className: "text-lg font-medium",
                descriptionClassName: "text-base"
            });
        } finally {
            setLoading(false);
        }
    }

    // Hàm xử lý xóa chi tiết trong chế độ chỉnh sửa
    const handleDeleteDetailInEditMode = async (index: number) => {
        if (!initialData?.id) return;

        try {
            const detail = form.getValues(`details.${index}`);
            const detailId = detail.id;

            if (!detailId) {
                // Nếu không có ID, chỉ xóa khỏi form
                remove(index);
                return;
            }

            // Gọi API xóa chi tiết
            const result = await deleteExportDetail(initialData.id, detailId);

            if (result.success) {
                // Xóa khỏi form
                remove(index);

                // Cập nhật tổng tiền hóa đơn
                setTimeout(async () => {
                    const invoiceTotals = form.getValues();
                    const invoiceUpdateData = {
                        invoice_number: invoiceTotals.invoice_number,
                        invoice_date: invoiceTotals.invoice_date,
                        description: invoiceTotals.description || "",
                        note: invoiceTotals.note || "",
                        total_before_tax: invoiceTotals.total_before_tax,
                        total_tax: invoiceTotals.total_tax,
                        total_after_tax: invoiceTotals.total_after_tax,
                        is_invoice_totals_manually_edited: invoiceTotals.is_invoice_totals_manually_edited || false,
                        details: invoiceTotals.details || []
                    };

                    await updateExport(initialData.id, invoiceUpdateData);
                }, 100);

                toast.success("Thành công", {
                    description: "Đã xóa chi tiết hàng hóa",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                });
            } else {
                toast.error("Lỗi", {
                    description: result.message || "Không thể xóa chi tiết",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                });
            }
        } catch (error) {
            console.error("Error deleting detail:", error);
            toast.error("Lỗi", {
                description: "Đã xảy ra lỗi khi xóa chi tiết",
                className: "text-lg font-medium",
                descriptionClassName: "text-base"
            });
        }
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

            // Kiểm tra cảnh báo giá khi chọn hàng hóa
            const currentPrice = form.getValues(`details.${index}.price_before_tax`) || 0
            checkPriceWarning(currentPrice, matchedItem.id, index)
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
        // Kiểm tra nếu value là empty string hoặc chỉ chứa khoảng trắng
        const trimmedValue = value.trim()
        const isEmpty = trimmedValue === "" || trimmedValue === null || trimmedValue === undefined

        // Cập nhật giá trị số lượng
        const numValue = isEmpty ? 0 : (parseFloat(trimmedValue) || 0)
        form.setValue(`details.${index}.quantity`, numValue)

        // Kiểm tra xem có phải là dịch vụ lao động không
        const unit = form.getValues(`details.${index}.unit`) || "";
        const isLaborService = unit.toLowerCase().includes('công');

        // Nếu là dịch vụ lao động, bỏ qua kiểm tra tồn kho
        if (isLaborService) {
            // Xóa lỗi tồn kho nếu có
            const newInventoryError = { ...inventoryError }
            delete newInventoryError[index]
            setInventoryError(newInventoryError)

            handleDetailFieldChange(index)
            return
        }

        // Kiểm tra tồn kho cho hàng hóa thông thường
        const inventoryId = form.getValues(`details.${index}.inventory_id`)
        if (inventoryId) {
            const matchedItem = inventoryItems.find(item => item.id === inventoryId)

            // Nếu ô trống hoặc số lượng = 0, reset tồn kho về giá trị ban đầu
            if (isEmpty || numValue === 0) {
                // Xóa lỗi tồn kho
                const newInventoryError = { ...inventoryError }
                delete newInventoryError[index]
                setInventoryError(newInventoryError)

                // Reset tồn kho dự kiến về giá trị ban đầu bằng cách xóa khỏi estimatedInventory
                if (matchedItem) {
                    setEstimatedInventory(prev => {
                        const newEstimated = { ...prev }
                        delete newEstimated[inventoryId as number]
                        return newEstimated
                    })
                }

                // Không tự động tính toán - cho phép người dùng nhập thủ công
                handleDetailFieldChange(index)
                return
            }

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
                            const estimatedQty = Math.max(0, Number(matchedItem.quantity) - Math.max(0, numValue - oldQuantity))
                            console.log(`[DEBUG] Edit mode - Setting estimated inventory for inventoryId: ${inventoryId}, originalQty: ${matchedItem.quantity}, oldQuantity: ${oldQuantity}, newQuantity: ${numValue}, estimatedQty: ${estimatedQty}`)
                            setEstimatedInventory(prev => ({
                                ...prev,
                                [inventoryId as number]: estimatedQty
                            }))
                        }
                    }
                } else {
                    // Nếu không tìm thấy chi tiết gốc, xử lý như thêm mới
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
                    } else {
                        const newInventoryError = { ...inventoryError }
                        delete newInventoryError[index]
                        setInventoryError(newInventoryError)

                        // Tính toán số lượng tồn kho dự kiến sau khi xuất
                        if (matchedItem) {
                            const estimatedQty = Math.max(0, Number(matchedItem.quantity) - numValue)
                            setEstimatedInventory(prev => ({
                                ...prev,
                                [inventoryId as number]: estimatedQty
                            }))
                        }
                    }
                }

                // Không tự động tính toán - cho phép người dùng nhập thủ công
                handleDetailFieldChange(index)
                return; // Đã xử lý xong trường hợp chỉnh sửa
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

        // Không tự động tính toán - cho phép người dùng nhập thủ công
        handleDetailFieldChange(index)
    }

    // Xử lý khi người dùng nhập vào ô tìm kiếm hàng hóa
    const handleInventoryInputChange = (_value: string, _index: number) => {
        // Không cần làm gì đặc biệt khi người dùng nhập, vì sẽ xử lý khi người dùng chọn hoặc đóng combobox
    }

    // Customer info is now handled at invoice level, not detail level
    // This function is no longer needed as customer selection is done globally

    // Xử lý khi người dùng nhập vào ô tìm kiếm khách hàng
    const handleCustomerInputChange = (_value: string, _index: number) => {
        // Không cần làm gì đặc biệt khi người dùng nhập, vì sẽ xử lý khi người dùng chọn hoặc đóng combobox
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

    // Làm tròn đến 3 chữ số thập phân
    const roundToThreeDecimals = (value: number): number => {
        return Math.round(value * 1000) / 1000;
    };

    // Làm tròn thành số nguyên
    const roundToInteger = (value: number): number => {
        return Math.round(value);
    };

    // Đã loại bỏ calculateReferenceValues và calculateSummaryReferenceValues
    // vì không còn sử dụng placeholder tính toán

    // // Hàm xử lý tải lên tập tin PDF cho export
    // const handlePdfUpload = async (file: File) => {
    //     if (!file || file.type !== "application/pdf") {
    //         toast.error("Vui lòng chọn tập tin PDF hợp lệ", {
    //             className: "text-lg font-medium",
    //             descriptionClassName: "text-base"
    //         });
    //         return;
    //     }

    //     console.log("🚀 Starting PDF upload process");
    //     console.log("📄 File info:", { name: file.name, size: file.size, type: file.type });
    //     console.log("📦 Current inventoryItems count:", inventoryItems.length);

    //     // Kiểm tra xem inventoryItems đã được load chưa
    //     if (inventoryItems.length === 0) {
    //         console.warn("⚠️ inventoryItems is empty before PDF upload!");
    //         toast.warning("Dữ liệu kho hàng chưa được tải", {
    //             description: "Vui lòng đợi dữ liệu kho hàng được tải xong rồi thử lại",
    //             className: "text-lg font-medium",
    //             descriptionClassName: "text-base"
    //         });
    //         return;
    //     }

    //     try {
    //         setIsPdfUploading(true);
    //         setPdfUploadProgress(10);

    //         // Upload file lên OCR API cho export
    //         const response = await uploadPdfToOcrExport(file);

    //         if (response && response.task_id) {
    //             setPdfUploadProgress(30);

    //             // Tạo một EventSource để lắng nghe tiến trình xử lý OCR
    //             const eventSourceUrl = `${process.env.NEXT_PUBLIC_OCR_API_URL || "http://localhost:7011"}/tasks/${response.task_id}/progress`;
    //             console.log("Connecting to EventSource:", eventSourceUrl);
    //             const eventSource = new EventSource(eventSourceUrl);

    //             eventSource.onmessage = async (event) => {
    //                 const data = JSON.parse(event.data);

    //                 // Cập nhật tiến trình
    //                 setPdfUploadProgress(Math.min(30 + (data.progress * 0.7), 95));

                //     if (data.status === "completed" && data.result) {
                //         console.log("OCR completed:", data.result);

                //         // Debug log để kiểm tra inventoryItems
                //         console.log("🔍 inventoryItems available for OCR conversion:", inventoryItems.length);
                //         console.log("📦 inventoryItems data:", inventoryItems.map((item: any) => ({ id: item.id, name: item.item_name, unit: item.unit, quantity: item.quantity })));

                //         // Kiểm tra xem inventoryItems đã được load chưa
                //         if (inventoryItems.length === 0) {
                //             console.warn("⚠️ inventoryItems is empty! OCR processing may fail.");
                //             toast.warning("Dữ liệu kho hàng chưa được tải", {
                //                 description: "Vui lòng đợi dữ liệu kho hàng được tải xong rồi thử lại",
                //                 className: "text-lg font-medium",
                //                 descriptionClassName: "text-base"
                //             });
                //             eventSource.close();
                //             setIsPdfUploading(false);
                //             setPdfUploadProgress(0);
                //             return;
                //         }

                //         // Chuyển đổi kết quả OCR thành dữ liệu chi tiết hóa đơn xuất kho
                //         const conversionResult = convertOcrResultToExportDetails(data.result, inventoryItems);
                //         const { details, skippedItems, ocrTaskId } = conversionResult;

                //         console.log("🎯 OCR conversion result:", { details: details.length, skippedItems: skippedItems.length });

                //         // Lưu thông tin OCR để hiển thị sau này
                //         setLastOcrResult(data.result);
                //         setLastValidItems(details);
                //         setLastSkippedItems(skippedItems);
                //         setLastOcrTaskId(ocrTaskId);

                //         if (details && details.length > 0) {
                //             console.log("📝 Populating form with OCR details:", details);

                //             // Xóa dòng mặc định nếu chưa có dữ liệu
                //             if (fields.length === 1 && !form.getValues("details.0.item_name")) {
                //                 console.log("🗑️ Removing default empty row");
                //                 remove(0);
                //             }

                //             // Thêm các chi tiết mới vào form
                //             details.forEach((detail, index) => {
                //                 console.log(`📝 Adding detail ${index + 1}:`, {
                //                     item_name: detail.item_name,
                //                     inventory_id: detail.inventory_id,
                //                     unit: detail.unit,
                //                     quantity: detail.quantity,
                //                     price_before_tax: detail.price_before_tax
                //                 });

                //                 append({
                //                     category: "HH" as const, // Export chỉ cho phép HH
                //                     inventory_id: detail.inventory_id,
                //                     item_name: detail.item_name,
                //                     unit: detail.unit,
                //                     quantity: detail.quantity,
                //                     price_before_tax: detail.price_before_tax,
                //                     tax_rate: detail.tax_rate,
                //                     total_before_tax: detail.total_before_tax,
                //                     tax_amount: detail.tax_amount,
                //                     total_after_tax: detail.total_after_tax,
                //                     is_manually_edited: false,
                //                     isLaborService: detail.isLaborService || false,
                //                     ocrTaskId: detail.ocrTaskId
                //                     // Removed customer_id, buyer_name, buyer_tax_code - now at invoice level
                //                 });
                //             });

                //             console.log("✅ Form populated successfully with", details.length, "items");

                //             // Cập nhật estimatedInventory cho các hàng hóa được populate từ OCR
                //             setTimeout(() => {
                //                 const newEstimatedInventory: Record<number, number> = {};
                //                 details.forEach((detail) => {
                //                     if (detail.inventory_id && detail.quantity > 0) {
                //                         const inventory = inventoryItems.find(item => item.id === detail.inventory_id);
                //                         if (inventory) {
                //                             const estimatedQty = Math.max(0, Number(inventory.quantity) - Number(detail.quantity));
                //                             newEstimatedInventory[detail.inventory_id] = estimatedQty;
                //                             console.log(`📊 Setting estimated inventory for ${detail.item_name} (ID: ${detail.inventory_id}): ${estimatedQty}`);
                //                         }
                //                     }
                //                 });

                //                 if (Object.keys(newEstimatedInventory).length > 0) {
                //                     setEstimatedInventory(prev => ({
                //                         ...prev,
                //                         ...newEstimatedInventory
                //                     }));
                //                     console.log("✅ Updated estimatedInventory for OCR populated items:", newEstimatedInventory);
                //                 }
                //             }, 100); // Delay để đảm bảo form đã được populate xong

                //             // Tính toán và cập nhật tổng tiền hóa đơn sau khi populate
                //             setTimeout(() => {
                //                 console.log("💰 Calculating invoice totals after OCR populate...");

                //                 // Tính tổng tiền từ các chi tiết đã được populate
                //                 const allDetails = form.getValues("details");
                //                 let totalBeforeTax = 0;
                //                 let totalTax = 0;
                //                 let totalAfterTax = 0;

                //                 allDetails.forEach(detail => {
                //                     totalBeforeTax += Number(detail.total_before_tax || 0);
                //                     totalTax += Number(detail.tax_amount || 0);
                //                     totalAfterTax += Number(detail.total_after_tax || 0);
                //                 });

                //                 console.log("💰 Calculated totals:", { totalBeforeTax, totalTax, totalAfterTax });

                //                 // Cập nhật form values
                //                 form.setValue("total_before_tax", totalBeforeTax);
                //                 form.setValue("total_tax", totalTax);
                //                 form.setValue("total_after_tax", totalAfterTax);
                //                 form.setValue("is_invoice_totals_manually_edited", false);

                //                 // Cập nhật display values
                //                 setTotalBeforeTaxDisplay(formatCurrencyInputVN(totalBeforeTax));
                //                 setTotalTaxDisplay(formatCurrencyInputVN(totalTax));
                //                 setTotalAfterTaxDisplay(formatCurrencyInputVN(totalAfterTax));

                //                 // Trigger re-render cho invoice totals
                //                 form.trigger("total_before_tax");
                //                 form.trigger("total_tax");
                //                 form.trigger("total_after_tax");

                //                 console.log("✅ Invoice totals updated after OCR populate");
                //             }, 200); // Delay thêm để đảm bảo estimatedInventory đã được cập nhật

                //             // Hiển thị thông báo thành công
                //             let message = `Đã trích xuất thành công ${details.length} hàng hóa từ PDF`;
                //             if (skippedItems.length > 0) {
                //                 message += `. Bỏ qua ${skippedItems.length} hàng hóa không có trong kho hoặc hết hàng.`;
                //             }

                //             toast.success("Trích xuất PDF thành công", {
                //                 description: message,
                //                 className: "text-lg font-medium",
                //                 descriptionClassName: "text-base"
                //             });

                //             // Hiển thị chi tiết các hàng hóa bị bỏ qua
                //             if (skippedItems.length > 0) {
                //                 const skippedMessage = skippedItems.map(item =>
                //                     `${item.ProductName}: ${item.reason}`
                //                 ).join('\n');

                //                 toast.warning("Một số hàng hóa đã bị bỏ qua", {
                //                     description: skippedMessage,
                //                     className: "text-lg font-medium",
                //                     descriptionClassName: "text-base"
                //                 });
                //             }
                //         } else {
                //             toast.warning("Không tìm thấy hàng hóa nào có sẵn trong kho", {
                //                 description: "Tất cả hàng hóa trong PDF đều không có trong kho hoặc đã hết hàng",
                //                 className: "text-lg font-medium",
                //                 descriptionClassName: "text-base"
                //             });
                //         }

                //         setPdfUploadProgress(100);
                //         eventSource.close();

                //         setTimeout(() => {
                //             setIsPdfUploading(false);
                //             setPdfUploadProgress(0);
                //             setIsOcrModalOpen(false);
                //         }, 1000);
                //     } else if (data.status === "failed") {
                //         console.error("OCR failed:", data.message);
                //         toast.error("Trích xuất PDF thất bại", {
                //             description: data.message || "Đã xảy ra lỗi khi xử lý tập tin PDF",
                //             className: "text-lg font-medium",
                //             descriptionClassName: "text-base"
                //         });

                //         eventSource.close();
                //         setIsPdfUploading(false);
                //         setPdfUploadProgress(0);
                //     }
                // };

                // eventSource.onerror = (error) => {
                //     console.error("EventSource error:", error);
                //     eventSource.close();

                //     // Thử lấy kết quả trực tiếp nếu EventSource gặp lỗi
                //     getOcrTaskResult(response.task_id)
                //         .then((result: any) => {
                //             if (result) {
                //                 console.log("Retrieved OCR result directly:", result);

                //                 // Kiểm tra xem inventoryItems đã được load chưa
                //                 if (inventoryItems.length === 0) {
                //                     console.warn("⚠️ inventoryItems is empty in error handler! OCR processing may fail.");
                //                     toast.warning("Dữ liệu kho hàng chưa được tải", {
                //                         description: "Vui lòng đợi dữ liệu kho hàng được tải xong rồi thử lại",
                //                         className: "text-lg font-medium",
                //                         descriptionClassName: "text-base"
                //                     });
                //                     setIsPdfUploading(false);
                //                     setPdfUploadProgress(0);
                //                     return;
                //                 }

                //                 // Xử lý kết quả tương tự như trong onmessage
                //                 const conversionResult = convertOcrResultToExportDetails(result, inventoryItems);
                //                 const { details, skippedItems, ocrTaskId } = conversionResult;

                //                 // Lưu thông tin OCR để hiển thị sau này
                //                 setLastOcrResult(result);
                //                 setLastValidItems(details);
                //                 setLastSkippedItems(skippedItems);
                //                 setLastOcrTaskId(ocrTaskId);

                //                 if (details && details.length > 0) {
                //                     // Xóa dòng mặc định nếu chưa có dữ liệu
                //                     if (fields.length === 1 && !form.getValues("details.0.item_name")) {
                //                         remove(0);
                //                     }

                //                     // Thêm các chi tiết mới vào form
                //                     details.forEach((detail) => {
                //                         append({
                //                             category: "HH" as const, // Export chỉ cho phép HH
                //                             inventory_id: detail.inventory_id,
                //                             item_name: detail.item_name,
                //                             unit: detail.unit,
                //                             quantity: detail.quantity,
                //                             price_before_tax: detail.price_before_tax,
                //                             tax_rate: detail.tax_rate,
                //                             total_before_tax: detail.total_before_tax,
                //                             tax_amount: detail.tax_amount,
                //                             total_after_tax: detail.total_after_tax,
                //                             is_manually_edited: false,
                //                             isLaborService: detail.isLaborService || false,
                //                             // Removed customer_id, buyer_name, buyer_tax_code - now at invoice level
                //                             ocrTaskId: detail.ocrTaskId
                //                         });
                //                     });

                //                     // Cập nhật estimatedInventory cho các hàng hóa được populate từ OCR (error handler)
                //                     setTimeout(() => {
                //                         const newEstimatedInventory: Record<number, number> = {};
                //                         details.forEach((detail) => {
                //                             if (detail.inventory_id && detail.quantity > 0) {
                //                                 const inventory = inventoryItems.find(item => item.id === detail.inventory_id);
                //                                 if (inventory) {
                //                                     const estimatedQty = Math.max(0, Number(inventory.quantity) - Number(detail.quantity));
                //                                     newEstimatedInventory[detail.inventory_id] = estimatedQty;
                //                                     console.log(`📊 Setting estimated inventory (error handler) for ${detail.item_name} (ID: ${detail.inventory_id}): ${estimatedQty}`);
                //                                 }
                //                             }
                //                         });

                //                         if (Object.keys(newEstimatedInventory).length > 0) {
                //                             setEstimatedInventory(prev => ({
                //                                 ...prev,
                //                                 ...newEstimatedInventory
                //                             }));
                //                             console.log("✅ Updated estimatedInventory for OCR populated items (error handler):", newEstimatedInventory);
                //                         }
                //                     }, 100);

                //                     // Tính toán và cập nhật tổng tiền hóa đơn sau khi populate (error handler)
                //                     setTimeout(() => {
                //                         console.log("💰 Calculating invoice totals after OCR populate (error handler)...");

                //                         // Tính tổng tiền từ các chi tiết đã được populate
                //                         const allDetails = form.getValues("details");
                //                         let totalBeforeTax = 0;
                //                         let totalTax = 0;
                //                         let totalAfterTax = 0;

                //                         allDetails.forEach(detail => {
                //                             totalBeforeTax += Number(detail.total_before_tax || 0);
                //                             totalTax += Number(detail.tax_amount || 0);
                //                             totalAfterTax += Number(detail.total_after_tax || 0);
                //                         });

                //                         console.log("💰 Calculated totals (error handler):", { totalBeforeTax, totalTax, totalAfterTax });

                //                         // Cập nhật form values
                //                         form.setValue("total_before_tax", totalBeforeTax);
                //                         form.setValue("total_tax", totalTax);
                //                         form.setValue("total_after_tax", totalAfterTax);
                //                         form.setValue("is_invoice_totals_manually_edited", false);

                //                         // Cập nhật display values
                //                         setTotalBeforeTaxDisplay(formatCurrencyInputVN(totalBeforeTax));
                //                         setTotalTaxDisplay(formatCurrencyInputVN(totalTax));
                //                         setTotalAfterTaxDisplay(formatCurrencyInputVN(totalAfterTax));

                //                         // Trigger re-render cho invoice totals
                //                         form.trigger("total_before_tax");
                //                         form.trigger("total_tax");
                //                         form.trigger("total_after_tax");

                //                         console.log("✅ Invoice totals updated after OCR populate (error handler)");
                //                     }, 200);

                //                     toast.success("Trích xuất PDF thành công", {
                //                         description: `Đã trích xuất thành công ${details.length} hàng hóa từ PDF`,
                //                         className: "text-lg font-medium",
                //                         descriptionClassName: "text-base"
                //                     });
                //                 }

                //                 setIsPdfUploading(false);
                //                 setPdfUploadProgress(0);
                //                 setIsOcrModalOpen(false);
                //             } else {
                //                 toast.error("Không thể lấy kết quả OCR", {
                //                     description: "Vui lòng thử lại sau",
                //                     className: "text-lg font-medium",
                //                     descriptionClassName: "text-base"
                //                 });
                //                 setIsPdfUploading(false);
                //                 setPdfUploadProgress(0);
                //             }
                //         })
                //         .catch((err) => {
                //             console.error("Error getting OCR result:", err);
                //             toast.error("Lỗi khi lấy kết quả OCR", {
                //                 description: "Vui lòng thử lại sau",
                //                 className: "text-lg font-medium",
                //                 descriptionClassName: "text-base"
                //             });
                //             setIsPdfUploading(false);
                //             setPdfUploadProgress(0);
                //         });
                // };
            // } else {
            //     toast.error("Không thể tải lên tập tin PDF", {
            //         description: "Vui lòng thử lại sau",
            //         className: "text-lg font-medium",
            //         descriptionClassName: "text-base"
            //     });
            //     setIsPdfUploading(false);
            //     setPdfUploadProgress(0);
            // }
        // } catch (error) {
        //     console.error("Error uploading PDF:", error);
        //     toast.error("Lỗi khi tải lên tập tin PDF", {
        //         description: "Vui lòng kiểm tra kết nối mạng và thử lại",
        //         className: "text-lg font-medium",
        //         descriptionClassName: "text-base"
        //     });
        //     setIsPdfUploading(false);
        //     setPdfUploadProgress(0);
        // }
    // };



    // Hàm xử lý kiểm tra và lưu các hàng hóa mới trước khi submit form
    const handleFormSubmit = async (data: ExportFormValues) => {
        // console.log("🚀 handleFormSubmit called with data:", data);
        // Đánh dấu form đã được submit
        setIsSubmitted(true);

        // Nếu có thông tin người bán mặc định nhưng chưa có trong database, thêm mới
        const sellerName = form.getValues("seller_name");
        const sellerTaxCode = form.getValues("seller_tax_code");
        const sellerAddress = form.getValues("seller_address");

        if (sellerName && !form.getValues("supplier_id")) {
            try {
                setLoading(true);
                const result = await createSupplier({
                    name: sellerName,
                    tax_code: sellerTaxCode || "",
                    address: sellerAddress || "",
                    phone: "",
                    email: ""
                });

                if (result && result.success) {
                    const newSupplier = result.data;

                    // Cập nhật danh sách nhà cung cấp
                    const updatedSuppliers = [...suppliers, newSupplier];
                    setSuppliers(updatedSuppliers);

                    // Set supplier info at invoice level
                    form.setValue("supplier_id", newSupplier.id);
                    form.setValue("seller_name", newSupplier.name);
                    form.setValue("seller_tax_code", newSupplier.tax_code || "");
                    form.setValue("seller_address", newSupplier.address || "");

                    toast.success("Đã thêm người bán mới", {
                        description: `Đã thêm người bán "${newSupplier.name}" vào hệ thống`,
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                    });
                } else if (result && !result.success && result.data) {
                    // Trường hợp supplier đã tồn tại, sử dụng supplier hiện có
                    const existingSupplier = result.data;

                    // Set supplier info at invoice level
                    form.setValue("supplier_id", existingSupplier.id);
                    form.setValue("seller_name", existingSupplier.name);
                    form.setValue("seller_tax_code", existingSupplier.tax_code || "");
                    form.setValue("seller_address", existingSupplier.address || "");

                    toast.info("Sử dụng người bán đã có", {
                        description: `Người bán "${existingSupplier.name}" đã tồn tại trong hệ thống`,
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                    });
                }
            } catch (err) {
                console.error("Error adding new supplier:", err);
                toast.error("Lỗi khi thêm người bán mới", {
                    description: "Vẫn tiếp tục lưu hóa đơn",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                });
            } finally {
                setLoading(false);
            }
        }

        // Nếu có thông tin người mua mặc định nhưng chưa có trong database, thêm mới
        const buyerName = form.getValues("buyer_name");
        const buyerTaxCode = form.getValues("buyer_tax_code");

        if (buyerName && !form.getValues("customer_id")) {
            try {
                setLoading(true);
                const result = await createCustomer({
                    name: buyerName,
                    tax_code: buyerTaxCode || "",
                    address: "",
                    phone: "",
                    email: ""
                });

                if (result && result.success) {
                    const newCustomer = result.data;

                    // Cập nhật danh sách khách hàng
                    const updatedCustomers = [...customers, newCustomer];
                    setCustomers(updatedCustomers);

                    // Set customer info at invoice level
                    form.setValue("customer_id", newCustomer.id);
                    form.setValue("buyer_name", newCustomer.name);
                    form.setValue("buyer_tax_code", newCustomer.tax_code || "");

                    toast.success("Đã thêm người mua mới", {
                        description: `Đã thêm người mua "${newCustomer.name}" vào hệ thống`,
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                    });
                } else if (result && !result.success && result.data) {
                    // Trường hợp customer đã tồn tại, sử dụng customer hiện có
                    const existingCustomer = result.data;

                    // Set customer info at invoice level
                    form.setValue("customer_id", existingCustomer.id);
                    form.setValue("buyer_name", existingCustomer.name);
                    form.setValue("buyer_tax_code", existingCustomer.tax_code || "");

                    toast.info("Sử dụng người mua đã có", {
                        description: `Người mua "${existingCustomer.name}" đã tồn tại trong hệ thống`,
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                    });
                }
            } catch (err) {
                console.error("Error adding new customer:", err);
                toast.error("Lỗi khi thêm người mua mới", {
                    description: "Vẫn tiếp tục lưu hóa đơn",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                });
            } finally {
                setLoading(false);
            }
        }

        // Kiểm tra lỗi tên hàng hóa
        const hasItemNameError = Object.keys(itemNameError).length > 0;
        if (hasItemNameError) {
            // Hiển thị thông báo lỗi cụ thể về tên hàng hóa
            const errorMessages = Object.values(itemNameError);
            toast.error("Hàng hóa không hợp lệ", {
                description: errorMessages.join('\n'),
                className: "text-lg font-medium",
                descriptionClassName: "text-base"
            });
            return;
        }

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

        // Kiểm tra tất cả hàng hóa phải tồn tại trong kho (bỏ qua dịch vụ lao động)
        for (let i = 0; i < data.details.length; i++) {
            const detail = data.details[i];
            if (detail.item_name && detail.item_name.trim() !== "") {
                // Kiểm tra xem có phải là dịch vụ lao động không
                const isLaborService = detail.unit && detail.unit.toLowerCase().includes('công');

                // Nếu là dịch vụ lao động, bỏ qua kiểm tra tồn kho
                if (isLaborService) {
                    continue;
                }

                const existingItem = inventoryItems.find(
                    item => item.item_name.toLowerCase() === detail.item_name.toLowerCase() && item.category === 'HH'
                );

                if (!existingItem) {
                    toast.error("Hàng hóa không hợp lệ", {
                        description: `Hàng hóa "${detail.item_name}" không tồn tại trong kho. Vui lòng chọn hàng hóa từ danh sách gợi ý.`,
                        className: "text-lg font-medium",
                        descriptionClassName: "text-base"
                    });
                    return;
                }
            }
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
                const details = data.details;
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
                            // Luôn gửi giá trị tính toán từ frontend
                            total_before_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)),
                            tax_amount: Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                              (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
                            total_after_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) +
                              Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                              (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
                            is_manually_edited: detail.is_manually_edited || false
                        };

                        console.log("Export detail data being sent in form submit:", detailData);
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
                            // Kiểm tra xem có phải là dịch vụ lao động không
                            const isLaborService = detail.unit && detail.unit.toLowerCase().includes('công');

                            // Kiểm tra tồn kho (bỏ qua dịch vụ lao động)
                            if (!isLaborService && detail.inventory_id) {
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
                                // Luôn gửi giá trị tính toán từ frontend
                                total_before_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)),
                                tax_amount: Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                                  (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
                                total_after_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) +
                                  Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                                  (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
                                is_manually_edited: detail.is_manually_edited || false
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
                    note: updatedFormValues.note === undefined || updatedFormValues.note === null ? "" : updatedFormValues.note,
                    // Sử dụng giá trị từ form nếu đã được chỉnh sửa thủ công
                    total_before_tax: updatedFormValues.is_invoice_totals_manually_edited ? Number(updatedFormValues.total_before_tax) : Number(updatedFormValues.details.reduce((sum: number, detail: any) => sum + (Number(detail.total_before_tax) || 0), 0)),
                    total_tax: updatedFormValues.is_invoice_totals_manually_edited ? Number(updatedFormValues.total_tax) : Number(updatedFormValues.details.reduce((sum: number, detail: any) => sum + (Number(detail.tax_amount) || 0), 0)),
                    total_after_tax: updatedFormValues.is_invoice_totals_manually_edited ? Number(updatedFormValues.total_after_tax) : Number(updatedFormValues.details.reduce((sum: number, detail: any) => sum + (Number(detail.total_after_tax) || 0), 0)),
                    is_invoice_totals_manually_edited: updatedFormValues.is_invoice_totals_manually_edited || false
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
        // Tạo formData sau khi đã tạo supplier và customer để đảm bảo có supplier_id và customer_id
        const formData = {
            ...data,
            note: data.note === undefined || data.note === null ? "" : data.note,
            // Lấy supplier_id và customer_id từ form sau khi đã được set
            supplier_id: form.getValues("supplier_id"),
            customer_id: form.getValues("customer_id"),
            seller_name: form.getValues("seller_name"),
            seller_tax_code: form.getValues("seller_tax_code"),
            buyer_name: form.getValues("buyer_name"),
            buyer_tax_code: form.getValues("buyer_tax_code"),
            // Sử dụng giá trị từ form nếu đã được chỉnh sửa thủ công
            total_before_tax: data.is_invoice_totals_manually_edited ? Number(data.total_before_tax) : Number(data.details.reduce((sum: number, detail: any) => sum + (Number(detail.total_before_tax) || 0), 0)),
            total_tax: data.is_invoice_totals_manually_edited ? Number(data.total_tax) : Number(data.details.reduce((sum: number, detail: any) => sum + (Number(detail.tax_amount) || 0), 0)),
            total_after_tax: data.is_invoice_totals_manually_edited ? Number(data.total_after_tax) : Number(data.details.reduce((sum: number, detail: any) => sum + (Number(detail.total_after_tax) || 0), 0)),
            is_invoice_totals_manually_edited: data.is_invoice_totals_manually_edited || false,
            // Đảm bảo các chi tiết có tên hàng hóa được gửi đúng
            details: data.details.map(detail => ({
                ...detail,
                // Đảm bảo item_name là chuỗi
                item_name: typeof detail.item_name === 'string' ? detail.item_name : String(detail.item_name || ''),
                // Luôn gửi giá trị tính toán từ frontend
                total_before_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)),
                tax_amount: Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                  (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
                total_after_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) +
                  Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                  (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
                is_manually_edited: detail.is_manually_edited || false
            }))
        };

        // Debug dữ liệu form
        // console.log("Final data for submit:", formData);
        // console.log("Supplier and Customer IDs:", {
        //     supplier_id: formData.supplier_id,
        //     customer_id: formData.customer_id,
        // });

        onSubmit(formData);
    };

    // Hàm xử lý khi submit form không hợp lệ
    const handleInvalidSubmit = (errors: any) => {
        // console.log("❌ Form validation errors:", errors);
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

            {/* Hàng 1: Số hóa đơn và ngày lập hóa đơn */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 max-w-full">
                <div className="flex flex-wrap items-center">
                    <Label htmlFor="invoice_number" className="text-sm md:text-base font-bold mr-2 min-w-[90px] sm:min-w-0">Số hóa đơn:</Label>
                    <div className="flex-1">
                        <Input
                            id="invoice_number"
                            {...form.register("invoice_number", {
                                onChange: () => form.formState.errors.invoice_number && form.clearErrors("invoice_number")
                            })}
                            disabled={isViewMode}
                            className={`h-8 md:h-10 text-sm md:text-base rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300 ${isSubmitted && form.formState.errors.invoice_number ? "border-red-500" : ""}`}
                        />
                        {isSubmitted && form.formState.errors.invoice_number && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.invoice_number.message}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center">
                    <Label htmlFor="invoice_date" className="text-sm md:text-base font-bold mr-2 min-w-[90px] sm:min-w-0">Ngày hóa đơn:</Label>
                    <div className="flex-1">
                        <Controller
                            name="invoice_date"
                            control={form.control}
                            render={({ field }) => (
                                <DatePicker
                                    date={field.value}
                                    setDate={(date) => field.onChange(date)}
                                    disabled={isViewMode}
                                    className="h-8 md:h-10 text-sm md:text-base w-full"
                                    placeholder="Chọn ngày lập hóa đơn"
                                />
                            )}
                        />
                        {isSubmitted && form.formState.errors.invoice_date && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.invoice_date.message}</p>
                        )}
                    </div>
                </div>


            </div>

            {/* Hàng 2: Thông tin người bán và người mua */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-full">
                {/* Thông tin người bán */}
                <div className="max-w-full">
                    <Label className="text-sm md:text-base mb-1 md:mb-2 block">Thông tin người bán</Label>
                    <div className="p-3 border rounded-md bg-blue-50 space-y-2 max-w-full min-h-[180px] flex flex-col">
                        <div className="flex flex-col space-y-2">
                            <div className="flex flex-col">
                                <Label htmlFor="default_seller_name" className="text-xs font-medium mb-1">Tên người bán:</Label>
                                <div className="relative">
                                    <Input
                                        ref={sellerInputRef}
                                        id="default_seller_name"
                                        type="text"
                                        placeholder="Nhập tên người bán"
                                        value={defaultSellerName}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setDefaultSellerName(value);

                                            // Set seller_name vào form để có thể submit
                                            form.setValue("seller_name", value);

                                            // Clear supplier_id khi user thay đổi seller name manually
                                            // để tránh conflict giữa supplier_id cũ và seller_name mới
                                            if (form.getValues("supplier_id")) {
                                                form.setValue("supplier_id", null);
                                                setDefaultSupplierId(null);
                                            }

                                            // Tìm kiếm người bán phù hợp
                                            if (value.length > 0) {
                                                const filteredSuppliers = suppliers.filter(supplier =>
                                                    supplier.name.toLowerCase().includes(value.toLowerCase()) ||
                                                    (supplier.tax_code && supplier.tax_code.toLowerCase().includes(value.toLowerCase()))
                                                );
                                                setFilteredSuppliers(filteredSuppliers);
                                                setShowSellerDropdown(filteredSuppliers.length > 0);
                                            } else {
                                                setShowSellerDropdown(false);
                                            }
                                        }}
                                        onFocus={() => {
                                            // Hiển thị dropdown khi focus nếu có kết quả
                                            if (defaultSellerName.length > 0 && filteredSuppliers.length > 0) {
                                                setShowSellerDropdown(true);
                                            }
                                        }}
                                        onBlur={() => {
                                            // Ẩn dropdown sau một khoảng thời gian ngắn để cho phép click vào dropdown
                                            setTimeout(() => {
                                                setShowSellerDropdown(false);
                                            }, 150);
                                        }}
                                        className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                        disabled={isViewMode}
                                    />

                                    {/* Dropdown hiển thị danh sách người bán */}
                                    {showSellerDropdown && filteredSuppliers.length > 0 && (
                                        <DropdownPortal
                                            targetRef={sellerInputRef}
                                            isOpen={showSellerDropdown}
                                            onClose={() => setShowSellerDropdown(false)}
                                        >
                                            {filteredSuppliers.slice(0, 5).map((supplier) => (
                                                <div
                                                    key={supplier.id}
                                                    className="px-3 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                    onMouseDown={(e) => {
                                                        // Ngăn sự kiện mousedown lan truyền
                                                        e.preventDefault();
                                                        e.stopPropagation();

                                                        // Cập nhật thông tin người bán mặc định
                                                        setDefaultSellerName(supplier.name);
                                                        setDefaultSellerTaxCode(supplier.tax_code || "");
                                                        setDefaultSupplierId(supplier.id);

                                                        // Set supplier info at invoice level
                                                        form.setValue("supplier_id", supplier.id);
                                                        form.setValue("seller_name", supplier.name);
                                                        form.setValue("seller_tax_code", supplier.tax_code || "");
                                                        form.setValue("seller_address", supplier.address || "");

                                                        // Ẩn dropdown
                                                        setShowSellerDropdown(false);
                                                    }}
                                                >
                                                    <div className="text-sm font-medium">{supplier.name}</div>
                                                    {supplier.tax_code && (
                                                        <div className="text-xs text-gray-500">MST: {supplier.tax_code}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </DropdownPortal>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <Label htmlFor="default_seller_tax_code" className="text-xs font-medium mb-1">Mã số thuế:</Label>
                                <Input
                                    id="default_seller_tax_code"
                                    type="text"
                                    placeholder="Nhập mã số thuế"
                                    value={defaultSellerTaxCode}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setDefaultSellerTaxCode(value);
                                        // Set seller_tax_code vào form để có thể submit
                                        form.setValue("seller_tax_code", value);

                                        // Clear supplier_id khi user thay đổi seller tax code manually
                                        if (form.getValues("supplier_id")) {
                                            form.setValue("supplier_id", null);
                                            setDefaultSupplierId(null);
                                        }
                                    }}
                                    className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>

                        <div className="flex-1 flex items-end">

                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                            Thông tin người bán sẽ áp dụng cho hóa đơn này.
                        </div>
                    </div>
                </div>

                {/* Thông tin người mua */}
                <div className="max-w-full">
                    <Label className="text-sm md:text-base mb-1 md:mb-2 block">Thông tin người mua</Label>
                    <div className="p-3 border rounded-md bg-green-50 space-y-2 max-w-full min-h-[180px] flex flex-col">
                        <div className="flex flex-col space-y-2">
                            <div className="flex flex-col">
                                <Label htmlFor="default_buyer_name" className="text-xs font-medium mb-1">Tên người mua:</Label>
                                <div className="relative">
                                    <Input
                                        ref={buyerInputRef}
                                        id="default_buyer_name"
                                        type="text"
                                        placeholder="Nhập tên người mua"
                                        value={defaultBuyerName}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setDefaultBuyerName(value);

                                            // Set buyer name at invoice level instead of detail level
                                            form.setValue("buyer_name", value);

                                            // Clear customer_id khi user thay đổi buyer name manually
                                            if (form.getValues("customer_id")) {
                                                form.setValue("customer_id", null);
                                                setDefaultCustomerId(null);
                                            }

                                            // Tìm kiếm người mua phù hợp
                                            if (value.length > 0) {
                                                const filteredCustomers = customers.filter(customer =>
                                                    customer.name.toLowerCase().includes(value.toLowerCase()) ||
                                                    (customer.tax_code && customer.tax_code.toLowerCase().includes(value.toLowerCase()))
                                                );
                                                setFilteredCustomers(filteredCustomers);
                                                setShowBuyerDropdown(filteredCustomers.length > 0);
                                            } else {
                                                setShowBuyerDropdown(false);
                                            }
                                        }}
                                        onFocus={() => {
                                            // Hiển thị dropdown khi focus nếu có kết quả
                                            if (defaultBuyerName.length > 0 && filteredCustomers.length > 0) {
                                                setShowBuyerDropdown(true);
                                            }
                                        }}
                                        onBlur={() => {
                                            // Ẩn dropdown sau một khoảng thời gian ngắn để cho phép click vào dropdown
                                            setTimeout(() => {
                                                setShowBuyerDropdown(false);
                                            }, 150);
                                        }}
                                        className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                        disabled={isViewMode}
                                    />

                                    {/* Dropdown hiển thị danh sách người mua */}
                                    {showBuyerDropdown && filteredCustomers.length > 0 && (
                                        <DropdownPortal
                                            targetRef={buyerInputRef}
                                            isOpen={showBuyerDropdown}
                                            onClose={() => setShowBuyerDropdown(false)}
                                        >
                                            {filteredCustomers.slice(0, 5).map((customer) => (
                                                <div
                                                    key={customer.id}
                                                    className="px-3 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                    onMouseDown={(e) => {
                                                        // Ngăn sự kiện mousedown lan truyền
                                                        e.preventDefault();
                                                        e.stopPropagation();

                                                        // Cập nhật thông tin người mua mặc định
                                                        setDefaultBuyerName(customer.name);
                                                        setDefaultBuyerTaxCode(customer.tax_code || "");
                                                        setDefaultCustomerId(customer.id);

                                                        // Set customer info at invoice level instead of detail level
                                                        form.setValue("customer_id", customer.id);
                                                        form.setValue("buyer_name", customer.name);
                                                        form.setValue("buyer_tax_code", customer.tax_code || "");

                                                        // Ẩn dropdown sau khi chọn
                                                        setShowBuyerDropdown(false);

                                                        // Focus vào input sau khi chọn
                                                        setTimeout(() => {
                                                            if (buyerInputRef.current) {
                                                                buyerInputRef.current.focus();
                                                            }
                                                        }, 10);
                                                    }}
                                                >
                                                    <div className="text-sm font-medium">{customer.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {customer.tax_code && `MST: ${customer.tax_code}`}
                                                    </div>
                                                </div>
                                            ))}
                                        </DropdownPortal>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <Label className="text-xs font-medium mb-1">Mã số thuế:</Label>
                                <Input
                                    type="text"
                                    placeholder="Nhập mã số thuế"
                                    className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                    value={defaultBuyerTaxCode}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setDefaultBuyerTaxCode(value);
                                        // Set buyer_tax_code vào form ở invoice level
                                        form.setValue("buyer_tax_code", value);

                                        // Clear customer_id khi user thay đổi buyer tax code manually
                                        if (form.getValues("customer_id")) {
                                            form.setValue("customer_id", null);
                                            setDefaultCustomerId(null);
                                        }
                                    }}
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>

                        <div className="flex-1 flex items-end">

                        </div>

                        {/* Thông báo về việc tự động áp dụng */}
                        <div className="text-xs text-gray-500 mt-1">
                            Thông tin người mua sẽ tự động áp dụng cho tất cả hàng hóa.
                        </div>
                    </div>
                </div>
            </div>


            {/* Hàng 2.5: Tổng tiền */}
            <div className="max-w-full">
                <Label className="text-sm md:text-base mb-1 md:mb-2 block">Tổng tiền</Label>
                <div className="p-3 border rounded-md bg-yellow-50 space-y-2 max-w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Tổng tiền trước thuế */}
                        <div className="flex-1">
                            <Label htmlFor="total_before_tax" className="text-sm font-medium text-gray-700 mb-1 block">Tổng tiền trước thuế:</Label>
                            {isViewMode ? (
                                <span className="text-sm font-bold">
                                    {formatCurrency(
                                        // Sử dụng trực tiếp giá trị total_before_tax từ API nếu có
                                        initialData && initialData.total_before_tax
                                            ? initialData.total_before_tax
                                            : form.getValues("details")?.reduce(
                                                (sum, detail) => sum + (Number(detail.total_before_tax || 0)),
                                                0
                                              ) || 0
                                    )}
                                </span>
                            ) : (
                                <Input
                                    id="total_before_tax"
                                    type="text"
                                    inputMode="decimal"
                                    className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                    value={totalBeforeTaxDisplay}
                                    placeholder=""
                                    onChange={(e) => {
                                        // Sử dụng formatInputWhileTypingInteger cho số nguyên
                                        const rawValue = e.target.value;
                                        const formattedValue = formatInputWhileTypingInteger(rawValue);

                                        // Cập nhật display value với formatting
                                        e.target.value = formattedValue;
                                        setTotalBeforeTaxDisplay(formattedValue);

                                        // Parse và lưu giá trị số nguyên vào form
                                        const numValue = parseIntegerNumber(formattedValue);
                                        form.setValue("total_before_tax", numValue);

                                        // Đánh dấu là đã chỉnh sửa thủ công
                                        form.setValue("is_invoice_totals_manually_edited", true);
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || value === ".") {
                                            setTotalBeforeTaxDisplay("");
                                            form.setValue("total_before_tax", 0);
                                        } else {
                                            const numValue = parseIntegerNumber(value);
                                            setTotalBeforeTaxDisplay(formatCurrencyInputVN(numValue));
                                            form.setValue("total_before_tax", numValue);
                                        }
                                        // Đánh dấu là đã chỉnh sửa thủ công
                                        form.setValue("is_invoice_totals_manually_edited", true);
                                    }}
                                />
                            )}
                        </div>

                        {/* Tổng tiền thuế */}
                        <div className="flex-1">
                            <Label htmlFor="total_tax" className="text-sm font-medium text-gray-700 mb-1 block">Tổng tiền thuế:</Label>
                            {isViewMode ? (
                                <span className="text-sm font-bold">
                                    {formatCurrency(
                                        // Sử dụng trực tiếp giá trị tax_amount từ API nếu có
                                        initialData && initialData.tax_amount
                                            ? initialData.tax_amount
                                            : form.getValues("details")?.reduce(
                                                (sum, detail) => sum + (Number(detail.tax_amount || 0)),
                                                0
                                              ) || 0
                                    )}
                                </span>
                            ) : (
                                <Input
                                    id="total_tax"
                                    type="text"
                                    inputMode="decimal"
                                    className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                    value={totalTaxDisplay}
                                    placeholder=""
                                    onChange={(e) => {
                                        // Sử dụng formatInputWhileTypingInteger cho số nguyên
                                        const rawValue = e.target.value;
                                        const formattedValue = formatInputWhileTypingInteger(rawValue);

                                        // Cập nhật display value với formatting
                                        e.target.value = formattedValue;
                                        setTotalTaxDisplay(formattedValue);

                                        // Parse và lưu giá trị số nguyên vào form
                                        const numValue = parseIntegerNumber(formattedValue);
                                        form.setValue("total_tax", numValue);

                                        // Đánh dấu là đã chỉnh sửa thủ công
                                        form.setValue("is_invoice_totals_manually_edited", true);
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || value === ".") {
                                            setTotalTaxDisplay("");
                                            form.setValue("total_tax", 0);
                                        } else {
                                            const numValue = parseIntegerNumber(value);
                                            setTotalTaxDisplay(formatCurrencyInputVN(numValue));
                                            form.setValue("total_tax", numValue);
                                        }
                                        // Đánh dấu là đã chỉnh sửa thủ công
                                        form.setValue("is_invoice_totals_manually_edited", true);
                                    }}
                                />
                            )}
                        </div>

                        {/* Tổng thanh toán */}
                        <div className="flex-1">
                            <Label htmlFor="total_payment" className="text-sm font-bold text-gray-700 mb-1 block">Tổng thanh toán:</Label>
                            {isViewMode ? (
                                <span className="text-sm font-bold">
                                    {formatCurrency(
                                        // Sử dụng trực tiếp giá trị total_after_tax từ API nếu có
                                        initialData && initialData.total_after_tax
                                            ? initialData.total_after_tax
                                            : form.getValues("details")?.reduce(
                                                (sum, detail) => sum + (Number(detail.total_after_tax || 0)),
                                                0
                                              ) || 0
                                    )}
                                </span>
                            ) : (
                                <Input
                                    id="total_after_tax"
                                    type="text"
                                    inputMode="decimal"
                                    className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                    value={totalAfterTaxDisplay}
                                    placeholder=""
                                    onChange={(e) => {
                                        // Sử dụng formatInputWhileTypingInteger cho số nguyên
                                        const rawValue = e.target.value;
                                        const formattedValue = formatInputWhileTypingInteger(rawValue);

                                        // Cập nhật display value với formatting
                                        e.target.value = formattedValue;
                                        setTotalAfterTaxDisplay(formattedValue);

                                        // Parse và lưu giá trị số nguyên vào form
                                        const numValue = parseIntegerNumber(formattedValue);
                                        form.setValue("total_after_tax", numValue);

                                        // Đánh dấu là đã chỉnh sửa thủ công
                                        form.setValue("is_invoice_totals_manually_edited", true);
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || value === ".") {
                                            setTotalAfterTaxDisplay("");
                                            form.setValue("total_after_tax", 0);
                                        } else {
                                            const numValue = parseIntegerNumber(value);
                                            setTotalAfterTaxDisplay(formatCurrencyInputVN(numValue));
                                            form.setValue("total_after_tax", numValue);
                                        }
                                        // Đánh dấu là đã chỉnh sửa thủ công
                                        form.setValue("is_invoice_totals_manually_edited", true);
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Nút tính toán thủ công */}

                </div>
            </div>

            {/* Hàng 3: Chi tiết hàng hóa */}
            <div className="max-w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-1 sm:gap-0 max-w-full">
                    <h3 className="text-sm md:text-base font-medium">Chi tiết hàng hóa</h3>
                    {!isViewMode && (
                        <div className="flex flex-col sm:flex-row gap-1">
                            <Button
                                type="button"
                                onClick={() => {
                                    // Thêm dòng mới vào form với thông tin người mua mặc định
                                    append({
                                        category: "HH", // Solo permitimos HH (hàng hóa) para exportaciones
                                        item_name: "",
                                        unit: "",
                                        quantity: 0,
                                        price_before_tax: 0,
                                        tax_rate: "10%",
                                        // Removed customer_id, buyer_name, buyer_tax_code - now at invoice level
                                        is_manually_edited: false,
                                        isLaborService: false,
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
                                className="px-1 md:px-2 h-6 md:h-7 text-xs w-full sm:w-auto"
                            >
                                <FaPlus className="mr-1 h-2 w-2" /> Thêm hàng hóa
                            </Button>

                            {/* Nút trích xuất từ PDF */}
                            {/* <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOcrModalOpen(true)}
                                className="px-1 md:px-2 h-6 md:h-7 text-xs w-full sm:w-auto bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                            >
                                <svg className="mr-1 h-2 w-2" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                                </svg>
                                Trích xuất từ PDF
                            </Button> */}

                            {/* Nút tính toán thủ công */}
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleManualCalculation}
                                disabled={isCalculating}
                                title="Tính toán lại tất cả tổng tiền từ số lượng và đơn giá (sẽ ghi đè các giá trị đã chỉnh sửa thủ công)"
                                className="px-1 md:px-2 h-6 md:h-7 text-xs w-full sm:w-auto bg-green-100 hover:bg-green-200 border-green-200 text-green-700"
                            >
                                {isCalculating ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-1 h-2 w-2 text-green-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang tính...
                                    </>
                                ) : (
                                    <>
                                        <svg className="mr-1 h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                        </svg>
                                        Tính toán lại tất cả
                                    </>
                                )}
                            </Button>

                            {/* Nút xem kết quả OCR chung cho toàn bộ hóa đơn */}
                            {/* {lastOcrResult && (
                                <ExportOcrResultViewer
                                    ocrResult={lastOcrResult}
                                    validItems={lastValidItems}
                                    skippedItems={lastSkippedItems}
                                    inventoryItems={inventoryItems}
                                    buttonVariant="outline"
                                    buttonSize="sm"
                                    buttonLabel="Xem kết quả OCR"
                                    buttonClassName="px-1 md:px-2 h-6 md:h-7 text-xs w-full sm:w-auto bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700"
                                />
                            )} */}
                        </div>
                    )}
                </div>

                <div className="w-full border rounded-sm max-w-full overflow-hidden relative">
                    <ScrollArea className="w-full h-[250px] md:h-[300px] overflow-x-auto">
                        <div className="relative w-full min-w-[800px]">
                            <Table className="w-full min-w-[800px]">
                                <TableHeader className="bg-destructive rounded-t-sm sticky top-0 z-10">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-white font-bold text-center text-xs md:text-sm rounded-tl-sm w-[4%] min-w-[40px]">
                                            Loại
                                        </TableHead>
                                        <TableHead className="text-white font-bold text-center text-xs md:text-sm w-[25%] min-w-[120px]">
                                            Tên hàng
                                        </TableHead>
                                        <TableHead className="text-white font-bold text-center text-xs md:text-sm hidden md:table-cell w-[6%]">
                                            Đơn vị
                                        </TableHead>
                                        <TableHead className="text-white font-bold text-center text-xs md:text-sm hidden md:table-cell w-[7%]">
                                            Tồn kho
                                        </TableHead>
                                        <TableHead className="text-white font-bold text-center text-xs md:text-sm w-[5%] min-w-[60px]">
                                            SL
                                        </TableHead>
                                        <TableHead className="text-white font-bold text-center text-xs md:text-sm hidden md:table-cell w-[10%] min-w-[100px]">
                                            Đơn giá
                                        </TableHead>
                                        <TableHead className="text-white font-bold text-center text-xs md:text-sm hidden md:table-cell w-[6%] min-w-[60px]">
                                            Thuế
                                        </TableHead>
                                        <TableHead className="text-white font-bold text-center text-xs md:text-sm w-[8%] min-w-[80px]">
                                            Thành tiền
                                        </TableHead>
                                        <TableHead className="text-white font-bold text-center text-xs md:text-sm w-[8%] min-w-[80px]">
                                            Sau thuế
                                        </TableHead>
                                        {!isViewMode && (
                                            <TableHead className="text-white font-bold text-center text-xs md:text-sm rounded-tr-sm w-[6%] min-w-[60px]">
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
                                                                    <SelectItem value="HH" className="text-sm">HH</SelectItem>
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
                                                                            <div className="relative">
                                                                                <Input
                                                                                    type="text"
                                                                                    placeholder="Nhập tên hàng hóa"
                                                                                    value={form.getValues(`details.${actualIndex}.item_name`) || ""}
                                                                                    disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                                                                                    className="h-10 text-sm w-full px-3 rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                                                                    ref={(el) => {
                                                                                        itemInputRefs.current[actualIndex] = el;
                                                                                    }}
                                                                                    onChange={(e) => {
                                                                                        const value = e.target.value;
                                                                                        // Cập nhật giá trị vào form
                                                                                        form.setValue(`details.${actualIndex}.item_name`, value);

                                                                                        // Nếu có hàng hóa trùng tên và còn hàng, tự động gán inventory_id
                                                                                        const matchedByName = inventoryItems.find(
                                                                                            item => item.item_name.toLowerCase() === value.toLowerCase() &&
                                                                                                   item.category === 'HH' &&
                                                                                                   Number(item.quantity) > 0
                                                                                        );

                                                                                        if (matchedByName) {
                                                                                            // Nếu tìm thấy hàng hóa trùng khớp chính xác, tự động chọn
                                                                                            form.setValue(`details.${actualIndex}.inventory_id`, matchedByName.id);
                                                                                            form.setValue(`details.${actualIndex}.unit`, matchedByName.unit);
                                                                                            form.setValue(`details.${actualIndex}.category`, matchedByName.category);

                                                                                            // Xóa lỗi tên hàng khi tìm thấy hàng hóa hợp lệ
                                                                                            const newItemNameError = { ...itemNameError }
                                                                                            delete newItemNameError[actualIndex]
                                                                                            setItemNameError(newItemNameError)

                                                                                            handleDetailFieldChange(actualIndex);
                                                                                        } else {
                                                                                            // Nếu không tìm thấy, xóa inventory_id và kiểm tra validation
                                                                                            form.setValue(`details.${actualIndex}.inventory_id`, null);

                                                                                            // Chỉ validate nếu người dùng đã nhập đủ ký tự
                                                                                            if (value.length >= 2) {
                                                                                                validateItemName(value, actualIndex);
                                                                                            } else {
                                                                                                // Xóa lỗi nếu chưa nhập đủ ký tự
                                                                                                const newItemNameError = { ...itemNameError }
                                                                                                delete newItemNameError[actualIndex]
                                                                                                setItemNameError(newItemNameError)
                                                                                            }
                                                                                        }

                                                                                        handleDetailFieldChange(actualIndex);
                                                                                    }}
                                                                                    onFocus={() => {
                                                                                        // Hiển thị dropdown khi focus
                                                                                        setShowItemDropdown(prev => ({
                                                                                            ...prev,
                                                                                            [actualIndex]: true
                                                                                        }));
                                                                                    }}
                                                                                    onBlur={() => {
                                                                                        // Ẩn dropdown sau một khoảng thời gian ngắn để cho phép click vào dropdown
                                                                                        setTimeout(() => {
                                                                                            // Kiểm tra lại một lần nữa xem có hàng hóa trùng khớp không
                                                                                            const currentValue = form.getValues(`details.${actualIndex}.item_name`) || "";
                                                                                            const exactMatch = inventoryItems.find(
                                                                                                item => item.item_name.toLowerCase() === currentValue.toLowerCase() &&
                                                                                                       item.category === 'HH' &&
                                                                                                       Number(item.quantity) > 0
                                                                                            );

                                                                                            if (exactMatch) {
                                                                                                // Nếu có kết quả trùng khớp chính xác, tự động chọn
                                                                                                form.setValue(`details.${actualIndex}.inventory_id`, exactMatch.id);
                                                                                                form.setValue(`details.${actualIndex}.item_name`, exactMatch.item_name);
                                                                                                form.setValue(`details.${actualIndex}.unit`, exactMatch.unit);
                                                                                                form.setValue(`details.${actualIndex}.category`, exactMatch.category);
                                                                                                handleDetailFieldChange(actualIndex);
                                                                                            } else {
                                                                                                // Nếu không có kết quả trùng khớp, validate tên hàng
                                                                                                validateItemName(currentValue, actualIndex);
                                                                                            }

                                                                                            // Ẩn dropdown
                                                                                            setShowItemDropdown(prev => ({
                                                                                                ...prev,
                                                                                                [actualIndex]: false
                                                                                            }));
                                                                                        }, 200);
                                                                                    }}
                                                                                />

                                                                                {/* Dropdown gợi ý hàng hóa tương tự */}
                                                                                {!isViewMode &&
                                                                                    (mode !== "edit" || editingRowIndex === actualIndex) &&
                                                                                    showItemDropdown[actualIndex] &&
                                                                                    // Chỉ hiển thị dropdown khi không có kết quả trùng khớp chính xác
                                                                                    !inventoryItems.some(item =>
                                                                                        item.item_name.toLowerCase() === (form.getValues(`details.${actualIndex}.item_name`) || "").toLowerCase() &&
                                                                                        item.category === 'HH' &&
                                                                                        Number(item.quantity) > 0
                                                                                    ) &&
                                                                                    (() => {
                                                                                        const searchValue = (form.getValues(`details.${actualIndex}.item_name`) || "").toLowerCase();
                                                                                        return inventoryItems.filter(item =>
                                                                                            item.category === 'HH' &&
                                                                                            Number(item.quantity) > 0 &&
                                                                                            (searchValue === "" || item.item_name.toLowerCase().includes(searchValue))
                                                                                        );
                                                                                    })().length > 0 && (
                                                                                    <DropdownPortal
                                                                                        targetRef={{ current: itemInputRefs.current[actualIndex] }}
                                                                                        isOpen={true}
                                                                                        onClose={closeDropdown}
                                                                                    >
                                                                                        {(() => {
                                                                                            const searchValue = (form.getValues(`details.${actualIndex}.item_name`) || "").toLowerCase();
                                                                                            return inventoryItems
                                                                                                .filter(item =>
                                                                                                    item.category === 'HH' &&
                                                                                                    Number(item.quantity) > 0 &&
                                                                                                    (searchValue === "" || item.item_name.toLowerCase().includes(searchValue))
                                                                                                )
                                                                                                .slice(0, 10) // Hiển thị tối đa 10 gợi ý
                                                                                                .map(item => (
                                                                                                <div
                                                                                                    key={item.id}
                                                                                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                                                                                                    onMouseDown={(e) => {
                                                                                                        // Ngăn sự kiện mousedown lan truyền
                                                                                                        e.stopPropagation();
                                                                                                        e.preventDefault();

                                                                                                        // Cập nhật thông tin hàng hóa
                                                                                                        form.setValue(`details.${actualIndex}.inventory_id`, item.id);
                                                                                                        form.setValue(`details.${actualIndex}.item_name`, item.item_name);
                                                                                                        form.setValue(`details.${actualIndex}.unit`, item.unit);
                                                                                                        form.setValue(`details.${actualIndex}.category`, item.category);

                                                                                                        // Kiểm tra tồn kho
                                                                                                        handleInventoryChange(item.id.toString(), actualIndex);

                                                                                                        handleDetailFieldChange(actualIndex);

                                                                                                        // Ẩn dropdown sau khi chọn
                                                                                                        setShowItemDropdown(prev => ({
                                                                                                            ...prev,
                                                                                                            [actualIndex]: false
                                                                                                        }));

                                                                                                        // Focus vào input sau khi chọn
                                                                                                        setTimeout(() => {
                                                                                                            if (itemInputRefs.current[actualIndex]) {
                                                                                                                itemInputRefs.current[actualIndex]?.focus();
                                                                                                            }
                                                                                                        }, 10);
                                                                                                    }}
                                                                                                >
                                                                                                    <div className="text-sm font-medium">{item.item_name}</div>
                                                                                                    <div className="text-xs text-gray-500">
                                                                                                        Hàng hóa | Đơn vị: {item.unit} | Tồn kho: {Number(item.quantity)}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ));
                                                                                        })()}
                                                                                    </DropdownPortal>
                                                                                )}
                                                                            </div>

                                                                            {/* Hiển thị lỗi tên hàng */}
                                                                            {itemNameError[actualIndex] && (
                                                                                <div className="text-red-500 text-xs mt-1">
                                                                                    {itemNameError[actualIndex]}
                                                                                </div>
                                                                            )}
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
                                                    <Input
                                                        type="text"
                                                        defaultValue={form.getValues(`details.${actualIndex}.unit`) || ""}
                                                        disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                                                        className="h-10 text-sm w-full px-3 text-center rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                                        onChange={(e) => {
                                                            form.setValue(`details.${actualIndex}.unit`, e.target.value);
                                                        }}
                                                        placeholder="Đơn vị"
                                                    />
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
                                                                            <span className="line-through text-gray-500 mr-1">{inventory ? Number(inventory.quantity) : ""}</span>
                                                                            <span className="text-blue-600">{estimatedInventory[inventoryId]}</span>
                                                                        </>
                                                                    );
                                                                }

                                                                return inventory ? Number(inventory.quantity) : "";
                                                            })() : ""}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-1 md:px-2 py-2 md:py-3 text-sm md:text-base">
                                                    <div className="space-y-1">
                                                        <Input
                                                            type="text"
                                                            inputMode="decimal"
                                                            defaultValue={(() => {
                                                                const value = form.getValues(`details.${actualIndex}.quantity`);
                                                                return (value === 0 || value === null || value === undefined) ? "" : value.toString();
                                                            })()}
                                                            disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                                                            className={`h-10 text-sm w-full px-3 rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300 ${isSubmitted && form.formState.errors.details?.[actualIndex]?.quantity ? "border-red-500" : ""}`}
                                                            onChange={(e) => {
                                                                handleVietnameseNumberInput(e, (value) => {
                                                                    form.setValue(`details.${actualIndex}.quantity`, value);
                                                                    // Kiểm tra tồn kho
                                                                    handleQuantityChange(value.toString(), actualIndex);
                                                                }, 3); // Cho phép 3 chữ số thập phân

                                                                // Tính toán tổng tiền
                                                                calculateDetailTotals(actualIndex);
                                                                handleDetailFieldChange(actualIndex);
                                                            }}
                                                            onBlur={(e) => {
                                                                const value = e.target.value;
                                                                if (value === "" || value === ",") {
                                                                    // Giữ trường trống thay vì điền "0"
                                                                    e.target.value = "";
                                                                    form.setValue(`details.${actualIndex}.quantity`, 0);
                                                                    // Gọi handleQuantityChange để cập nhật tồn kho động (không tính toán tự động)
                                                                    handleQuantityChange("", actualIndex);
                                                                } else {
                                                                    const numValue = parseVietnameseNumber(value);
                                                                    form.setValue(`details.${actualIndex}.quantity`, numValue);
                                                                    e.target.value = formatVietnameseNumber(numValue);

                                                                    // Gọi handleQuantityChange để cập nhật tồn kho động (không tính toán tự động)
                                                                    handleQuantityChange(numValue.toString(), actualIndex);
                                                                }
                                                                calculateDetailTotals(actualIndex);
                                                            }}
                                                        />

                                                        {/* Hiển thị tồn kho dự kiến */}
                                                        {(() => {
                                                            const inventoryId = form.getValues(`details.${actualIndex}.inventory_id`);
                                                            const unit = form.getValues(`details.${actualIndex}.unit`) || "";
                                                            const quantity = form.getValues(`details.${actualIndex}.quantity`) || 0;
                                                            const isLaborService = unit.toLowerCase().includes('công');

                                                            // Chỉ hiển thị cho hàng hóa thông thường (không phải dịch vụ lao động)
                                                            if (!isLaborService && inventoryId && quantity > 0 && estimatedInventory[inventoryId] !== undefined && estimatedInventory[inventoryId] >= 0) {
                                                                return (
                                                                    <div className="text-xs text-blue-600 mt-1">
                                                                        Tồn kho sau xuất: {formatVietnameseNumber(estimatedInventory[inventoryId])} {unit}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-1 md:px-2 py-2 md:py-3 hidden md:table-cell text-sm md:text-base">
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        defaultValue={formatPriceDisplay(form.getValues(`details.${actualIndex}.price_before_tax`))}
                                                        disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                                                        className={`h-10 text-sm w-full px-3 rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300 ${isSubmitted && form.formState.errors.details?.[actualIndex]?.price_before_tax ? "border-red-500" : ""}`}
                                                        onChange={(e) => {
                                                            handleVietnameseNumberInput(e, (value) => {
                                                                form.setValue(`details.${actualIndex}.price_before_tax`, value);

                                                                // Kiểm tra cảnh báo giá
                                                                const inventoryId = form.getValues(`details.${actualIndex}.inventory_id`);
                                                                checkPriceWarning(value, inventoryId || null, actualIndex);
                                                            }, 3); // Cho phép 3 chữ số thập phân

                                                            // Không tự động tính toán - cho phép người dùng nhập thủ công
                                                            handleDetailFieldChange(actualIndex);
                                                        }}
                                                        onBlur={(e) => {
                                                            const value = e.target.value;
                                                            if (value === "" || value === ",") {
                                                                // Giữ trường trống thay vì điền "0"
                                                                e.target.value = "";
                                                                form.setValue(`details.${actualIndex}.price_before_tax`, 0);

                                                                // Xóa cảnh báo giá khi giá = 0
                                                                const inventoryId = form.getValues(`details.${actualIndex}.inventory_id`);
                                                                checkPriceWarning(0, inventoryId || null, actualIndex);
                                                            } else {
                                                                const numValue = parseVietnameseNumber(value);
                                                                form.setValue(`details.${actualIndex}.price_before_tax`, numValue);
                                                                e.target.value = formatVietnameseNumber(numValue);

                                                                // Kiểm tra cảnh báo giá
                                                                const inventoryId = form.getValues(`details.${actualIndex}.inventory_id`);
                                                                checkPriceWarning(numValue, inventoryId || null, actualIndex);
                                                            }
                                                            // Không tự động tính toán - cho phép người dùng nhập thủ công
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
                                                                    // Không tự động tính toán - cho phép người dùng nhập thủ công
                                                                    handleDetailFieldChange(actualIndex)
                                                                }}
                                                                disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                                                            >
                                                                <SelectTrigger className="w-full h-10 text-sm px-3 rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300">
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
                                                    {isViewMode || (mode === "edit" && editingRowIndex !== actualIndex) ? (
                                                        <span className="text-sm md:text-base font-bold">
                                                            {formatCurrency(
                                                                form.getValues(`details.${actualIndex}.total_before_tax`) || 0
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <Input
                                                            key={`total_before_tax_${actualIndex}_${inputKey}`}
                                                            type="text"
                                                            inputMode="decimal"
                                                            defaultValue={(() => {
                                                                const value = form.getValues(`details.${actualIndex}.total_before_tax`);
                                                                return (value === 0 || value === null || value === undefined) ? "" : formatVietnameseNumber(value);
                                                            })()}
                                                            placeholder=""
                                                            className="h-10 text-sm w-full px-3 text-right rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                                            onChange={(e) => {
                                                                // Sử dụng formatInputWhileTypingInteger cho số nguyên
                                                                const rawValue = e.target.value;
                                                                const formattedValue = formatInputWhileTypingInteger(rawValue);

                                                                // Cập nhật display value
                                                                e.target.value = formattedValue;

                                                                // Parse và set giá trị số nguyên
                                                                const numValue = parseIntegerNumber(formattedValue);
                                                                form.setValue(`details.${actualIndex}.total_before_tax`, numValue);
                                                                // Đánh dấu đã chỉnh sửa thủ công
                                                                form.setValue(`details.${actualIndex}.is_manually_edited`, true);
                                                            }}
                                                            onBlur={(e) => {
                                                                const value = e.target.value;
                                                                if (value === "" || value === ".") {
                                                                    // Giữ trường trống thay vì điền "0"
                                                                    e.target.value = "";
                                                                    form.setValue(`details.${actualIndex}.total_before_tax`, 0);
                                                                } else {
                                                                    const numValue = parseIntegerNumber(value);
                                                                    form.setValue(`details.${actualIndex}.total_before_tax`, numValue);
                                                                    e.target.value = formatVietnameseNumber(numValue);

                                                                    // Đánh dấu đã chỉnh sửa thủ công - không tự động tính toán các trường khác
                                                                    form.setValue(`details.${actualIndex}.is_manually_edited`, true);
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-1 md:px-2 py-2 md:py-3 text-right font-medium">
                                                    {isViewMode || (mode === "edit" && editingRowIndex !== actualIndex) ? (
                                                        <span className="text-sm md:text-base font-bold">
                                                            {formatCurrency(
                                                                form.getValues(`details.${actualIndex}.total_after_tax`) || 0
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <Input
                                                            key={`total_after_tax_${actualIndex}_${inputKey}`}
                                                            type="text"
                                                            inputMode="decimal"
                                                            defaultValue={(() => {
                                                                const value = form.getValues(`details.${actualIndex}.total_after_tax`);
                                                                return (value === 0 || value === null || value === undefined) ? "" : formatVietnameseNumber(value);
                                                            })()}
                                                            placeholder=""
                                                            className="h-10 text-sm w-full px-3 text-right rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                                            onChange={(e) => {
                                                                // Sử dụng formatInputWhileTypingInteger cho số nguyên
                                                                const rawValue = e.target.value;
                                                                const formattedValue = formatInputWhileTypingInteger(rawValue);

                                                                // Cập nhật display value
                                                                e.target.value = formattedValue;

                                                                // Parse và set giá trị số nguyên
                                                                const numValue = parseIntegerNumber(formattedValue);
                                                                form.setValue(`details.${actualIndex}.total_after_tax`, numValue);
                                                                // Đánh dấu đã chỉnh sửa thủ công
                                                                form.setValue(`details.${actualIndex}.is_manually_edited`, true);
                                                            }}
                                                            onBlur={(e) => {
                                                                const value = e.target.value;
                                                                if (value === "" || value === ".") {
                                                                    // Giữ trường trống thay vì điền "0"
                                                                    e.target.value = "";
                                                                    form.setValue(`details.${actualIndex}.total_after_tax`, 0);
                                                                } else {
                                                                    const numValue = parseIntegerNumber(value);
                                                                    form.setValue(`details.${actualIndex}.total_after_tax`, numValue);
                                                                    e.target.value = formatVietnameseNumber(numValue);

                                                                    // Đánh dấu đã chỉnh sửa thủ công - không tự động tính toán các trường khác
                                                                    form.setValue(`details.${actualIndex}.is_manually_edited`, true);
                                                                }
                                                            }}
                                                        />
                                                    )}
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
                                                                        // Xóa hàng hiện tại
                                                                        remove(actualIndex);

                                                                        // Nếu đã xóa hàng cuối cùng, thêm một hàng mới trống với thông tin người mua mặc định
                                                                        setTimeout(() => {
                                                                            if (form.getValues("details")?.length === 0) {
                                                                                append({
                                                                                    category: "HH",
                                                                                    item_name: "",
                                                                                    unit: "",
                                                                                    quantity: 0,
                                                                                    price_before_tax: 0,
                                                                                    tax_rate: "10%",
                                                                                    // Removed customer_id, buyer_name, buyer_tax_code - now at invoice level
                                                                                    inventory_id: null,
                                                                                    total_before_tax: 0,
                                                                                    tax_amount: 0,
                                                                                    total_after_tax: 0,
                                                                                    is_manually_edited: false,
                                                                                    isLaborService: false,
                                                                                });
                                                                            }
                                                                        }, 100);
                                                                    }
                                                                }}
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

                {/* Hiển thị lỗi tồn kho */}
                {Object.keys(inventoryError).length > 0 && (
                    <div className="mt-2 md:mt-4 space-y-1">
                        {Object.entries(inventoryError).map(([index, error]) => (
                            <p key={index} className="text-red-500 text-xs md:text-sm">
                                Dòng {parseInt(index) + 1}: {error}
                            </p>
                        ))}
                    </div>
                )}

                {/* Hiển thị lỗi tên hàng hóa */}
                {Object.keys(itemNameError).length > 0 && (
                    <div className="mt-2 md:mt-4 space-y-1">
                        {Object.entries(itemNameError).map(([index, error]) => (
                            <p key={index} className="text-red-500 text-xs md:text-sm">
                                Dòng {parseInt(index) + 1}: {error}
                            </p>
                        ))}
                    </div>
                )}

                {/* Hiển thị cảnh báo giá */}
                {Object.keys(priceWarning).length > 0 && (
                    <div className="mt-2 md:mt-4 space-y-1">
                        {Object.entries(priceWarning).map(([index, warning]) => (
                            <p key={index} className="text-orange-600 text-xs md:text-sm bg-orange-50 border border-orange-200 rounded-md p-2">
                                Dòng {parseInt(index) + 1}: {warning}
                            </p>
                        ))}
                    </div>
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

            {/* Modal tải lên tập tin PDF cho Export */}
            {/* <Dialog open={isOcrModalOpen} onOpenChange={setIsOcrModalOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-3 md:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg md:text-xl">Trích xuất dữ liệu từ PDF hóa đơn xuất kho</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 md:space-y-8">
                        {isPdfUploading ? (
                            <div className="space-y-4">
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div
                                        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                                        style={{ width: `${pdfUploadProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-center text-sm md:text-base">
                                    {pdfUploadProgress < 30 ? "Đang tải lên tập tin..." :
                                     pdfUploadProgress < 60 ? "Đang xử lý OCR..." :
                                     pdfUploadProgress < 90 ? "Đang trích xuất dữ liệu..." :
                                     "Hoàn tất xử lý..."}
                                </p>
                                <p className="text-center text-xs text-gray-500">
                                    {pdfUploadProgress}% hoàn thành
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center w-full">
                                    <label htmlFor="pdf-upload-export" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                            </svg>
                                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Nhấp để tải lên</span> hoặc kéo thả tập tin</p>
                                            <p className="text-xs text-gray-500">PDF hóa đơn xuất kho (Tối đa 10MB)</p>
                                        </div>
                                        <input
                                            id="pdf-upload-export"
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    handlePdfUpload(e.target.files[0]);
                                                }
                                                // Reset input để có thể chọn lại cùng file
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>
                                <p className="text-sm text-gray-500 text-center">
                                    Tải lên tập tin PDF hóa đơn xuất kho để trích xuất thông tin hàng hóa.
                                    Chỉ những hàng hóa có sẵn trong kho mới được thêm vào.
                                </p>
                            </div>
                        )}
                        <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2 md:gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                                onClick={() => {
                                    setIsOcrModalOpen(false);
                                    // Reset states khi đóng modal
                                    if (!isPdfUploading) {
                                        setPdfUploadProgress(0);
                                    }
                                }}
                                disabled={isPdfUploading}
                            >
                                {isPdfUploading ? "Đang xử lý..." : "Hủy"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog> */}
        </form>
    )
}