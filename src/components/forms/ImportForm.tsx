"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

import { DropdownPortal } from "@/components/ui/dropdown-portal"

import { formatCurrency, formatPrice, formatCurrencyInput } from "@/lib/utils"
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
import { getInventoryItems } from "@/lib/api/inventory"
import { addImportDetail, updateImportDetail, deleteImportDetail, updateImport } from "@/lib/api/imports"
// import { uploadPdfToOcr, convertOcrResultToImportDetails, getOriginalOcrResult, getOcrTaskResult } from "@/lib/api/ocr"
// import OcrResultViewer from "@/components/ocr/OcrResultViewer"

// Định nghĩa Zod schema để validation
const importDetailSchema = z.object({
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
  // Thêm trường lưu ID kết quả OCR
  // ocrTaskId: z.string().optional(),
  // Removed supplier_id, seller_name, seller_tax_code - now at invoice level
})

const importFormSchema = z.object({
  invoice_number: z.string().min(1, "Số hóa đơn là bắt buộc"),
  invoice_date: z.date({
    required_error: "Ngày lập hóa đơn là bắt buộc"
  }),
  description: z.string().optional(),
  note: z.string().optional(),
  details: z.array(importDetailSchema).min(1, "Phải có ít nhất một mặt hàng"),
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
  const [customers, setCustomers] = useState<Customer[]>([])
  // Không cần lưu trữ danh sách lọc nữa vì đã sử dụng Combobox
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventorySearchCache, setInventorySearchCache] = useState<{[key: string]: Inventory[]}>({})

  // Debounce hook
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)

      return () => {
        clearTimeout(handler)
      }
    }, [value, delay])

    return debouncedValue
  }
  const [isSubmitted, setIsSubmitted] = useState(false)

  // State cho modal thêm mới
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)

  // State để theo dõi hàng đang được chỉnh sửa
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)

  // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1)
  // State để lưu trữ danh sách các chi tiết đã đánh dấu xóa
  const [deletedDetails, setDeletedDetails] = useState<any[]>([])
  const itemsPerPage = 7

  // State cho việc tải lên tập tin PDF
  // const [isPdfUploading, setIsPdfUploading] = useState(false)
  // const [pdfUploadProgress, setPdfUploadProgress] = useState(0)
  // const [isOcrModalOpen, setIsOcrModalOpen] = useState(false)

  // State cho thông tin người bán mặc định
  const [defaultSupplierId, setDefaultSupplierId] = useState<number | null>(null)
  const [defaultSellerName, setDefaultSellerName] = useState<string>("")
  const [defaultSellerTaxCode, setDefaultSellerTaxCode] = useState<string>("")
  const [showSellerDropdown, setShowSellerDropdown] = useState<boolean>(false)
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])

  // State cho thông tin người mua
  const [showBuyerDropdown, setShowBuyerDropdown] = useState<boolean>(false)
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])

  // Refs cho các input
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const sellerInputRef = useRef<HTMLInputElement>(null)

  // State để quản lý giá trị hiển thị của các ô tổng tiền
  const [totalBeforeTaxDisplay, setTotalBeforeTaxDisplay] = useState("")
  const [totalTaxDisplay, setTotalTaxDisplay] = useState("")
  const [totalAfterTaxDisplay, setTotalAfterTaxDisplay] = useState("")

  // State cho manual calculation
  const [isCalculating, setIsCalculating] = useState(false)

  // Hàm đóng dropdown
  const closeDropdown = () => {
    // Đóng dropdown
  }

  // Hàm định dạng hiển thị đơn giá thông minh
  const formatPriceDisplay = (value: number): string => {
    if (value === 0) return "";

    if (Number.isInteger(value)) {
      // Số nguyên: hiển thị không có phần thập phân
      return value.toString();
    } else {
      // Số thập phân: hiển thị với dấu phẩy và loại bỏ số 0 thừa
      const parts = value.toString().split('.');
      const integerPart = parts[0];
      let decimalPart = parts[1] || '';

      // Cắt bớt nếu có nhiều hơn 3 chữ số thập phân
      if (decimalPart.length > 3) {
        decimalPart = decimalPart.substring(0, 3);
      }

      // Loại bỏ số 0 thừa ở cuối phần thập phân
      decimalPart = decimalPart.replace(/0+$/, '');

      // Nếu không còn phần thập phân, hiển thị như số nguyên
      if (decimalPart === '') {
        return integerPart;
      } else {
        return integerPart + ',' + decimalPart;
      }
    }
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
  const formatCurrencyInput = (value: number): string => {
    if (value === 0) return "";

    // Làm tròn thành số nguyên
    const roundedValue = Math.round(value);

    // Sử dụng formatVietnameseNumber để định dạng theo chuẩn Việt Nam
    return formatVietnameseNumber(roundedValue);
  }

  // Hàm kiểm tra có nên thực hiện phân bổ tỷ lệ hay không
  const shouldDistributeAmounts = () => {
    // Không phân bổ nếu đang ở chế độ chỉnh sửa và có dữ liệu từ PDF extraction
    if (mode === "edit" && initialData) {
      // Kiểm tra xem có dữ liệu từ PDF extraction không
      // Thường thì dữ liệu từ PDF sẽ có nhiều chi tiết với giá trị cụ thể
      const hasDetailedData = initialData.details &&
                              initialData.details.length > 0 &&
                              initialData.details.some((detail: any) =>
                                detail.price_before_tax &&
                                detail.quantity &&
                                detail.total_before_tax
                              );

      if (hasDetailedData) {
        console.log('Skipping amount distribution - editing invoice with PDF data');
        return false;
      }
    }

    return true;
  }

  // Hàm phân bổ tổng tiền chính xác để tránh sai lệch làm tròn
  const distributeAmountAccurately = (totalAmount: number, details: any[], fieldName: string) => {
    if (details.length === 0) return [];

    // Tính tổng hiện tại của các chi tiết
    const currentTotal = details.reduce((sum, detail) => sum + (Number(detail[fieldName]) || 0), 0);

    if (currentTotal === 0) {
      // Nếu tổng hiện tại là 0, phân bổ đều
      const amountPerDetail = Math.floor(totalAmount / details.length);
      const remainder = totalAmount - (amountPerDetail * details.length);

      return details.map((_, index) =>
        index < remainder ? amountPerDetail + 1 : amountPerDetail
      );
    }

    // Tính tỷ lệ cho từng chi tiết
    const ratios = details.map(detail => (Number(detail[fieldName]) || 0) / currentTotal);

    // Phân bổ theo tỷ lệ và làm tròn
    const distributedAmounts = ratios.map(ratio => Math.round(totalAmount * ratio));

    // Tính tổng sau khi làm tròn
    const roundedTotal = distributedAmounts.reduce((sum, amount) => sum + amount, 0);

    // Điều chỉnh sai lệch do làm tròn
    const difference = totalAmount - roundedTotal;

    if (difference !== 0) {
      // Tìm chi tiết có giá trị lớn nhất để điều chỉnh
      let maxIndex = 0;
      let maxValue = distributedAmounts[0];

      for (let i = 1; i < distributedAmounts.length; i++) {
        if (distributedAmounts[i] > maxValue) {
          maxValue = distributedAmounts[i];
          maxIndex = i;
        }
      }

      // Điều chỉnh chi tiết có giá trị lớn nhất
      distributedAmounts[maxIndex] += difference;
    }

    return distributedAmounts;
  }

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



  // Form setup với react-hook-form và zod validation
  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema) as any,
    mode: "onSubmit", // Chỉ validate khi submit form
    reValidateMode: "onSubmit", // Chỉ validate lại khi submit form
    shouldFocusError: false, // Không tự động focus vào trường lỗi
    defaultValues: initialData
      ? {
          ...initialData,
          invoice_date: initialData.invoice_date ? new Date(initialData.invoice_date) : new Date(),
          details: initialData.details?.map((d: any) => {
            // console.log('Processing detail in defaultValues:', d);
            return {
              ...d,
              quantity: Number(d.quantity) || 0,
              // Làm tròn đơn giá đến 3 chữ số thập phân
              price_before_tax: Math.round((Number(d.price_before_tax) || 0) * 1000) / 1000,
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
              is_manually_edited: false,
              ocrTaskId: "",
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

  // Không tự động tính toán khi form được tải - chỉ khi user nhấn nút tính toán
  // useEffect(() => {
  //   fields.forEach((_, index) => {
  //     calculateDetailTotals(index)
  //   })
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

  // Thiết lập thông tin người bán mặc định từ dữ liệu ban đầu
  useEffect(() => {
    // Get supplier info from invoice level instead of detail level
    if (initialData) {
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
        setShowSellerDropdown(true);
      }

      // Thiết lập thông tin người mua từ dữ liệu ban đầu
      if (initialData.customer?.name || initialData.buyer_name) {
        const buyerName = initialData.customer?.name || initialData.buyer_name || "";
        const buyerTaxCode = initialData.customer?.tax_code || initialData.buyer_tax_code || "";
        const customerId = initialData.customer_id || null;

        // Set buyer info in form
        form.setValue("buyer_name", buyerName);
        form.setValue("buyer_tax_code", buyerTaxCode);
        if (customerId) {
          form.setValue("customer_id", customerId);
        }
      }
    }
  }, [initialData]);

  // Khởi tạo giá trị hiển thị ban đầu
  useEffect(() => {
    const details = form.getValues("details") || [];

    const totalBeforeTax = initialData && initialData.total_before_tax
      ? initialData.total_before_tax
      : details.reduce((sum, detail) => sum + (Number(detail?.total_before_tax || 0)), 0);

    const totalTax = initialData && initialData.total_tax
      ? initialData.total_tax
      : details.reduce((sum, detail) => sum + (Number(detail?.tax_amount || 0)), 0);

    const totalAfterTax = initialData && initialData.total_after_tax
      ? initialData.total_after_tax
      : details.reduce((sum, detail) => sum + (Number(detail?.total_after_tax || 0)), 0);

    console.log('Initial display values setup:', {
      initialData_total_tax: initialData?.total_tax,
      calculated_total_tax: totalTax,
      display_value: formatCurrencyInput(totalTax)
    });

    // Chỉ hiển thị giá trị nếu có dữ liệu thực tế, không hiển thị "0"
    setTotalBeforeTaxDisplay(totalBeforeTax > 0 ? formatCurrencyInput(totalBeforeTax) : "");
    setTotalTaxDisplay(totalTax > 0 ? formatCurrencyInput(totalTax) : "");
    setTotalAfterTaxDisplay(totalAfterTax > 0 ? formatCurrencyInput(totalAfterTax) : "");
  }, [initialData]);

  // Cập nhật state hiển thị khi initialData thay đổi (sau khi lưu thành công)
  useEffect(() => {
    if (initialData) {
      console.log('Updating display values after data change:', {
        total_before_tax: initialData.total_before_tax,
        total_tax: initialData.total_tax,
        total_after_tax: initialData.total_after_tax
      });

      // Cập nhật state hiển thị với dữ liệu mới từ API
      if (initialData.total_before_tax !== undefined) {
        setTotalBeforeTaxDisplay(formatCurrencyInput(initialData.total_before_tax));
      }
      if (initialData.total_tax !== undefined) {
        setTotalTaxDisplay(formatCurrencyInput(initialData.total_tax));
      }
      if (initialData.total_after_tax !== undefined) {
        setTotalAfterTaxDisplay(formatCurrencyInput(initialData.total_after_tax));
      }

      // Reset flag chỉnh sửa thủ công để cho phép cập nhật từ dữ liệu mới
      form.setValue("is_invoice_totals_manually_edited", false);
    }
  }, [initialData?.total_before_tax, initialData?.total_tax, initialData?.total_after_tax, initialData?.updatedAt]);

  // Đã loại bỏ useEffect auto-calculation để tránh tự động cập nhật invoice totals
  // Chỉ tính toán khi người dùng nhấn "Tính toán lại tất cả" hoặc OCR extract

  // Search inventory items với debounce và cache
  const searchInventoryItems = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setInventoryItems([])
      return
    }

    // Kiểm tra cache trước
    if (inventorySearchCache[searchTerm]) {
      setInventoryItems(inventorySearchCache[searchTerm])
      return
    }

    setInventoryLoading(true)
    try {
      const inventoryResult = await getInventoryItems(true, "", false, searchTerm)
      if (inventoryResult && inventoryResult.success) {
        const items = inventoryResult.data || []
        setInventoryItems(items)

        // Cache kết quả
        setInventorySearchCache(prev => ({
          ...prev,
          [searchTerm]: items
        }))
      }
    } catch (err) {
      console.error("Error searching inventory:", err)
    } finally {
      setInventoryLoading(false)
    }
  }, [inventorySearchCache])

  // Fetch chỉ suppliers và customers từ API (bỏ inventory items)
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

        // Fetch customers sử dụng API đã tách
        const customersResult = await getCustomers()
        if (customersResult && customersResult.success) {
          const customersData = customersResult.data || []
          setCustomers(customersData)
        }

        // ✅ LOẠI BỎ fetch inventory items - sẽ lazy load khi cần
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

  // // Hàm xử lý tải lên tập tin PDF
  // const handlePdfUpload = async (file: File) => {
  //   if (!file || file.type !== "application/pdf") {
  //     toast.error("Vui lòng chọn tập tin PDF hợp lệ", {
  //       className: "text-lg font-medium",
  //       descriptionClassName: "text-base"
  //     });
  //     return;
  //   }

  //   try {
  //     setIsPdfUploading(true);
  //     setPdfUploadProgress(10);

  //     // Upload file lên OCR API
  //     const response = await uploadPdfToOcr(file);

  //     if (response && response.task_id) {
  //       setPdfUploadProgress(30);

  //       // Tạo một EventSource để lắng nghe tiến trình xử lý OCR
  //       const eventSourceUrl = `${process.env.NEXT_PUBLIC_OCR_API_URL || "http://localhost:7011"}/tasks/${response.task_id}/progress`;
  //       console.log("Connecting to EventSource:", eventSourceUrl);
  //       const eventSource = new EventSource(eventSourceUrl);

  //       eventSource.onmessage = async (event) => {
  //         const data = JSON.parse(event.data);

  //         // Cập nhật tiến trình
  //         setPdfUploadProgress(Math.min(30 + (data.progress * 0.7), 95));

  //         // Nếu đã hoàn thành, lấy kết quả và đóng kết nối
  //         if (data.status === "completed" && data.result) {
  //           eventSource.close();

  //           // Chuyển đổi kết quả OCR thành dữ liệu chi tiết hóa đơn
  //           const details = convertOcrResultToImportDetails(data.result);

  //           // Thêm các chi tiết vào form
  //           if (details && details.length > 0) {
  //             // Xóa dòng mặc định nếu chưa có dữ liệu
  //             if (fields.length === 1 && !form.getValues("details.0.item_name")) {
  //               remove(0);
  //             }

              // // Trích xuất thông tin người bán từ dòng đầu tiên (nếu có)
              // if (details[0].seller_name) {
              //   // Thiết lập thông tin người bán mặc định
              //   setDefaultSellerName(details[0].seller_name);
              //   setDefaultSellerTaxCode(details[0].seller_tax_code || "");

              //   // Tìm kiếm người bán đã tồn tại
              //   let matchedSupplier = null;
              //   if (details[0].seller_tax_code) {
              //     matchedSupplier = suppliers.find(
              //       supplier =>
              //         supplier.name.toLowerCase() === details[0].seller_name.toLowerCase() &&
              //         supplier.tax_code === details[0].seller_tax_code
              //     );
              //   }

              //   if (!matchedSupplier) {
              //     matchedSupplier = suppliers.find(
              //       supplier => supplier.name.toLowerCase() === details[0].seller_name.toLowerCase()
              //     );
              //   }

              //   if (matchedSupplier) {
              //     setDefaultSupplierId(matchedSupplier.id);
              //     // Set supplier info at invoice level
              //     form.setValue("supplier_id", matchedSupplier.id);
              //   } else {
              //     setDefaultSupplierId(null);
              //   }

              //   // Set seller info at invoice level
              //   form.setValue("seller_name", details[0].seller_name);
              //   form.setValue("seller_tax_code", details[0].seller_tax_code || "");
              // }

              // // Thêm các chi tiết mới và tự động tìm kiếm hàng hóa đã tồn tại
              // details.forEach(detail => {
              //   // Tìm kiếm hàng hóa đã tồn tại dựa trên tên
              //   let matchedInventory = null;
              //   if (detail.item_name) {
              //     matchedInventory = inventoryItems.find(
              //       item => item.item_name.toLowerCase() === detail.item_name.toLowerCase()
              //     );

              //     if (matchedInventory) {
              //       console.log(`Found existing inventory with matching name: ${matchedInventory.item_name}, ID: ${matchedInventory.id}`);
              //       // Cập nhật thông tin hàng hóa
              //       detail.inventory_id = matchedInventory.id;
              //       detail.unit = detail.unit || matchedInventory.unit;
              //       detail.category = matchedInventory.category as "HH" | "CP";
              //     }
              //   }

              //   // Tìm kiếm người bán đã tồn tại dựa trên tên và mã số thuế
              //   let matchedSupplier = null;
              //   if (detail.seller_name) {
              //     // Tìm kiếm nhà cung cấp trùng khớp cả tên và mã số thuế (nếu có)
              //     if (detail.seller_tax_code) {
              //       matchedSupplier = suppliers.find(
              //         supplier =>
              //           supplier.name.toLowerCase() === detail.seller_name.toLowerCase() &&
              //           supplier.tax_code === detail.seller_tax_code
              //       );
              //     }

              //     // Nếu không tìm thấy, tìm kiếm chỉ dựa trên tên
              //     if (!matchedSupplier) {
              //       matchedSupplier = suppliers.find(
              //         supplier => supplier.name.toLowerCase() === detail.seller_name.toLowerCase()
              //       );
              //     }

              //     if (matchedSupplier) {
              //       console.log(`Found existing supplier with matching name: ${matchedSupplier.name}, ID: ${matchedSupplier.id}`);
              //       // Cập nhật thông tin người bán
              //       detail.supplier_id = matchedSupplier.id;
              //       detail.seller_tax_code = detail.seller_tax_code || matchedSupplier.tax_code || "";
              //     }
              //   }

              //   append({
              //     ...detail,
              //     category: detail.category as "HH" | "CP", // Ép kiểu category thành "HH" | "CP"
              //     is_manually_edited: false,
              //   });
              // });

              // // Tự động tính toán invoice totals sau OCR extract
              // setTimeout(() => {
              //   handleOcrAutoCalculation(details.length);
              // }, 100);

              // // Toast message đã được hiển thị trong setTimeout ở trên
            // } else {
            //   toast.warning("Không tìm thấy dữ liệu hàng hóa", {
            //     description: "Không thể trích xuất dữ liệu hàng hóa từ tập tin PDF này",
            //     className: "text-lg font-medium",
            //     descriptionClassName: "text-base"
            //   });
            // }

            // setPdfUploadProgress(100);
            // setIsPdfUploading(false);
            // setIsOcrModalOpen(false);
          // }
        // };

        // // Xử lý sự kiện khi kết nối được mở
        // eventSource.onopen = () => {
        //   console.log("EventSource connection opened successfully");
        // };

        // // Xử lý sự kiện lỗi
        // eventSource.onerror = (error) => {
        //   console.error("EventSource error:", error);

        //   // Đóng kết nối
        //   eventSource.close();
        //   setIsPdfUploading(false);

        //   // Thử lấy kết quả trực tiếp nếu EventSource gặp lỗi
        //   getOcrTaskResult(response.task_id)
        //     .then((result: any) => {
        //       if (result) {
        //         console.log("Retrieved OCR result directly:", result);
        //         // Chuyển đổi kết quả OCR thành dữ liệu chi tiết hóa đơn
        //         const details = convertOcrResultToImportDetails(result);

        //         // Xử lý kết quả tương tự như trong onmessage
        //         if (details && details.length > 0) {
        //           // Xóa dòng mặc định nếu chưa có dữ liệu
        //           if (fields.length === 1 && !form.getValues("details.0.item_name")) {
        //             remove(0);
        //           }

        //           // Thêm các chi tiết mới và tự động tìm kiếm hàng hóa và người bán đã tồn tại
        //           details.forEach(detail => {
                    // // Tìm kiếm hàng hóa đã tồn tại dựa trên tên
                    // let matchedInventory = null;
                    // if (detail.item_name) {
                    //   matchedInventory = inventoryItems.find(
                    //     item => item.item_name.toLowerCase() === detail.item_name.toLowerCase()
                    //   );

                    //   if (matchedInventory) {
                    //     console.log(`Found existing inventory with matching name: ${matchedInventory.item_name}, ID: ${matchedInventory.id}`);
                    //     // Cập nhật thông tin hàng hóa
                    //     detail.inventory_id = matchedInventory.id;
                    //     detail.unit = detail.unit || matchedInventory.unit;
                    //     detail.category = matchedInventory.category as "HH" | "CP";
                    //   }
                    // }

                    // // Tìm kiếm người bán đã tồn tại dựa trên tên và mã số thuế
                    // let matchedSupplier = null;
                    // if (detail.seller_name) {
                    //   // Tìm kiếm nhà cung cấp trùng khớp cả tên và mã số thuế (nếu có)
                    //   if (detail.seller_tax_code) {
                    //     matchedSupplier = suppliers.find(
                    //       supplier =>
                    //         supplier.name.toLowerCase() === detail.seller_name.toLowerCase() &&
                    //         supplier.tax_code === detail.seller_tax_code
                    //     );
                    //   }

                    //   // Nếu không tìm thấy, tìm kiếm chỉ dựa trên tên
                    //   if (!matchedSupplier) {
                    //     matchedSupplier = suppliers.find(
                    //       supplier => supplier.name.toLowerCase() === detail.seller_name.toLowerCase()
                    //     );
                    //   }

                    //   if (matchedSupplier) {
                    //     console.log(`Found existing supplier with matching name: ${matchedSupplier.name}, ID: ${matchedSupplier.id}`);
                    //     // Cập nhật thông tin người bán
                    //     detail.supplier_id = matchedSupplier.id;
                    //     detail.seller_tax_code = detail.seller_tax_code || matchedSupplier.tax_code || "";
                    //   }
                    // }

                    // append({
                    //   ...detail,
                    //   category: detail.category as "HH" | "CP", // Ép kiểu category thành "HH" | "CP"
                    //   is_manually_edited: false,
                    // });
                  // });

                  // // Tự động tính toán invoice totals sau OCR extract (fallback)
                  // setTimeout(() => {
                  //   handleOcrAutoCalculation(details.length);
                  // }, 100);
                // } else {
                //   toast.warning("Không tìm thấy dữ liệu hàng hóa", {
                //     description: "Không thể trích xuất dữ liệu hàng hóa từ tập tin PDF này",
                //     className: "text-lg font-medium",
                //     descriptionClassName: "text-base"
                //   });
                // }

                // setPdfUploadProgress(100);
                // setIsPdfUploading(false);
                // setIsOcrModalOpen(false);
              // } else {
              //   toast.error("Lỗi khi xử lý tập tin PDF", {
              //     description: "Đã xảy ra lỗi khi xử lý tập tin PDF. Vui lòng thử lại sau.",
              //     className: "text-lg font-medium",
              //     descriptionClassName: "text-base"
              //   });
              // }
            // })
            // .catch((err: Error) => {
            //   console.error("Error getting OCR result directly:", err);
            //   toast.error("Lỗi khi xử lý tập tin PDF", {
            //     description: "Đã xảy ra lỗi khi xử lý tập tin PDF. Vui lòng thử lại sau.",
            //     className: "text-lg font-medium",
            //     descriptionClassName: "text-base"
            //   });
            // });
        // };
      // } else {
      //   setIsPdfUploading(false);
      //   toast.error("Lỗi khi tải lên tập tin PDF", {
      //     description: "Không thể tải lên tập tin PDF. Vui lòng thử lại sau.",
      //     className: "text-lg font-medium",
      //     descriptionClassName: "text-base"
      //   });
      // }
    // } catch (error) {
    //   console.error("Error uploading PDF:", error);
    //   setIsPdfUploading(false);
    //   toast.error("Lỗi khi tải lên tập tin PDF", {
    //     description: "Đã xảy ra lỗi khi tải lên tập tin PDF. Vui lòng thử lại sau.",
    //     className: "text-lg font-medium",
    //     descriptionClassName: "text-base"
    //   });
    // }
  // }

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

      // Làm tròn đơn giá đến 3 chữ số thập phân
      priceBeforeTax = Math.round(priceBeforeTax * 1000) / 1000;
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

  // Hàm cập nhật tổng tiền của toàn bộ hóa đơn
  const updateInvoiceTotals = () => {
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

    // Cập nhật state để hiển thị trong UI
    form.setValue("total_before_tax", totalBeforeTax)
    form.setValue("total_tax", totalTax)
    form.setValue("total_after_tax", totalAfterTax)
  }

  // // Helper function cho auto-calculation sau OCR extract
  // const handleOcrAutoCalculation = (extractedItemsCount: number) => {
  //   // Cập nhật tổng tiền invoice từ item details đã có
  //   updateInvoiceTotals();

  //   // Cập nhật display values
  //   const allDetails = form.getValues("details");
  //   const newTotalBeforeTax = allDetails.reduce((sum, detail) => sum + (Number(detail.total_before_tax) || 0), 0);
  //   const newTotalTax = allDetails.reduce((sum, detail) => sum + (Number(detail.tax_amount) || 0), 0);
  //   const newTotalAfterTax = allDetails.reduce((sum, detail) => sum + (Number(detail.total_after_tax) || 0), 0);

  //   setTotalBeforeTaxDisplay(formatCurrencyInput(newTotalBeforeTax));
  //   setTotalTaxDisplay(formatCurrencyInput(newTotalTax));
  //   setTotalAfterTaxDisplay(formatCurrencyInput(newTotalAfterTax));

  //   // Kích hoạt cập nhật UI cho toàn bộ form
  //   form.trigger();

  //   // Hiển thị thông báo thành công với thông tin tổng tiền
  //   toast.success("Trích xuất và tính toán hoàn thành", {
  //     description: `Đã trích xuất ${extractedItemsCount} mặt hàng và tính toán tổng tiền tự động`,
  //     className: "text-lg font-medium",
  //     descriptionClassName: "text-base"
  //   });
  // }

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
      console.log("Starting force recalculation for", details.length, "items")
      details.forEach((_, index) => {
        const beforeCalc = form.getValues(`details.${index}`)
        console.log(`Before calc item ${index}:`, {
          quantity: beforeCalc.quantity,
          price_before_tax: beforeCalc.price_before_tax,
          total_before_tax: beforeCalc.total_before_tax,
          is_manually_edited: beforeCalc.is_manually_edited
        })

        calculateDetailTotals(index, true) // Force calculation bỏ qua manual edit check

        const afterCalc = form.getValues(`details.${index}`)
        console.log(`After calc item ${index}:`, {
          quantity: afterCalc.quantity,
          price_before_tax: afterCalc.price_before_tax,
          total_before_tax: afterCalc.total_before_tax,
          is_manually_edited: afterCalc.is_manually_edited
        })
      })

      // BƯỚC 3: Cập nhật tổng tiền invoice
      updateInvoiceTotals()

      // BƯỚC 4: Cập nhật display values
      const allDetails = form.getValues("details")
      const newTotalBeforeTax = allDetails.reduce((sum, detail) => sum + (Number(detail.total_before_tax) || 0), 0)
      const newTotalTax = allDetails.reduce((sum, detail) => sum + (Number(detail.tax_amount) || 0), 0)
      const newTotalAfterTax = allDetails.reduce((sum, detail) => sum + (Number(detail.total_after_tax) || 0), 0)

      setTotalBeforeTaxDisplay(formatCurrencyInput(newTotalBeforeTax))
      setTotalTaxDisplay(formatCurrencyInput(newTotalTax))
      setTotalAfterTaxDisplay(formatCurrencyInput(newTotalAfterTax))

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

  // Hàm này không còn sử dụng, thay thế bằng handleInventoryChange



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

        // Cập nhật thông tin người bán mặc định
        setDefaultSupplierId(newSupplier.id);
        setDefaultSellerName(newSupplier.name);
        setDefaultSellerTaxCode(newSupplier.tax_code || "");

        setIsSupplierModalOpen(false)
        supplierForm.reset()

        // Hiển thị thông báo thành công
        toast.success("Thêm người bán thành công", {
          description: `Đã thêm người bán ${newSupplier.name} vào hệ thống`,
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      } else {
        setError("Không thể tạo người bán mới")
        toast.error("Không thể tạo người bán mới", {
          description: result?.message || "Vui lòng kiểm tra lại thông tin",
          className: "text-lg font-medium",
          descriptionClassName: "text-base"
        })
      }
    } catch (err) {
      console.error("Error adding supplier:", err)
      setError("Đã xảy ra lỗi khi tạo người bán mới")
      toast.error("Đã xảy ra lỗi", {
        description: "Đã xảy ra lỗi khi tạo người bán mới",
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      })
    } finally {
      setLoading(false)
    }
  }





    // Sử dụng các hàm định dạng từ utils

  // Các hàm làm tròn đã được loại bỏ để giữ nguyên giá trị chính xác

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

      // Lấy lại dữ liệu sau khi tính toán
      const updatedDetails = form.getValues("details");
      const updatedDetail = updatedDetails[index];

      // Nếu là chi tiết mới (chưa có ID), thêm mới vào database
      if (!updatedDetail.id) {
        console.log("Adding new detail to database:", updatedDetail);

        // Chuẩn bị dữ liệu để thêm mới
        const newDetailData = {
          category: updatedDetail.category || "HH",
          item_name: String(updatedDetail.item_name || ''),
          unit: updatedDetail.unit || "",
          quantity: Number(updatedDetail.quantity) || 0,
          price_before_tax: Number(updatedDetail.price_before_tax) || 0,
          tax_rate: updatedDetail.tax_rate || "0%",
          inventory_id: updatedDetail.inventory_id || null,
          // Removed supplier_id, seller_name, seller_tax_code - now at invoice level
          total_before_tax: Number(updatedDetail.total_before_tax) || 0,
          tax_amount: Number(updatedDetail.tax_amount) || 0,
          total_after_tax: Number(updatedDetail.total_after_tax) || 0,
          is_manually_edited: updatedDetail.is_manually_edited || false
        };

        // Gọi API để thêm chi tiết mới
        const result = await addImportDetail(initialData.id, newDetailData);

        if (result && result.success) {
          // Cập nhật ID cho chi tiết vừa thêm
          form.setValue(`details.${index}.id`, result.data.id);

          console.log("Successfully added new detail with ID:", result.data.id);
        }
      } else {
        // Nếu là chi tiết đã tồn tại, cập nhật trong database
        console.log("Updating existing detail in database:", updatedDetail);

        // Chuẩn bị dữ liệu để cập nhật
        // Tính toán lại các trường nếu chưa có
        const quantity = Number(updatedDetail.quantity) || 0;
        const priceBeforeTax = Number(updatedDetail.price_before_tax) || 0;
        const taxRate = updatedDetail.tax_rate || "0%";

        // Tính toán total_before_tax
        const totalBeforeTax = quantity * priceBeforeTax;

        // Tính toán tax_amount
        const taxPercent = taxRate === "KCT" ? 0 : Number(taxRate.replace("%", "") || 0);
        const taxAmount = (totalBeforeTax * taxPercent) / 100;

        // Tính toán total_after_tax
        const totalAfterTax = totalBeforeTax + taxAmount;

        const updateDetailData = {
          category: updatedDetail.category || "HH",
          item_name: String(updatedDetail.item_name || ''),
          unit: updatedDetail.unit || "",
          quantity: quantity,
          price_before_tax: priceBeforeTax,
          tax_rate: taxRate,
          inventory_id: updatedDetail.inventory_id || null,
          // Sử dụng giá trị đã tính toán hoặc giá trị từ form nếu đã chỉnh sửa thủ công
          total_before_tax: updatedDetail.is_manually_edited ? (Number(updatedDetail.total_before_tax) || 0) : totalBeforeTax,
          tax_amount: updatedDetail.is_manually_edited ? (Number(updatedDetail.tax_amount) || 0) : taxAmount,
          total_after_tax: updatedDetail.is_manually_edited ? (Number(updatedDetail.total_after_tax) || 0) : totalAfterTax,
          is_manually_edited: updatedDetail.is_manually_edited || false
        };

        console.log("Update detail data being sent:", updateDetailData);

        // Gọi API để cập nhật chi tiết
        await updateImportDetail(initialData.id, updatedDetail.id, updateDetailData);

        console.log("Successfully updated detail with ID:", updatedDetail.id);
      }

      // Tắt chế độ chỉnh sửa
      setEditingRowIndex(null);

      // Không tự động cập nhật tổng tiền hóa đơn
      // Chỉ tính toán khi người dùng nhấn "Tính toán lại tất cả"

      // Hiển thị thông báo thành công
      toast.success("Cập nhật hàng hóa thành công", {
        description: `Đã lưu thay đổi cho hàng hóa ${updatedDetail.item_name} vào cơ sở dữ liệu.`,
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      });

    } catch (err) {
      console.error("Error updating detail in edit mode:", err);
      setError("Đã xảy ra lỗi khi cập nhật hàng hóa");
      toast.error("Đã xảy ra lỗi", {
        description: "Đã xảy ra lỗi khi lưu hàng hóa vào cơ sở dữ liệu",
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

        // Nếu đã xóa hàng cuối cùng, thêm một hàng mới trống
        setTimeout(() => {
          if (form.getValues("details")?.length === 0) {
            append({
              category: "HH",
              item_name: "",
              unit: "",
              quantity: 0,
              price_before_tax: 0,
              tax_rate: "0%",
              inventory_id: null,
              total_before_tax: 0,
              tax_amount: 0,
              total_after_tax: 0,
              is_manually_edited: false,
            });
          }
        }, 100);

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

      // Nếu đã xóa hàng cuối cùng, thêm một hàng mới trống
      setTimeout(() => {
        if (form.getValues("details")?.length === 0) {
          append({
            category: "HH",
            item_name: "",
            unit: "",
            quantity: 0,
            price_before_tax: 0,
            tax_rate: "10%",
            inventory_id: null,
            total_before_tax: 0,
            tax_amount: 0,
            total_after_tax: 0,
            is_manually_edited: false,
          });
        }
      }, 100);

      // Đảm bảo các trường bắt buộc được cập nhật đúng cách
      // Trigger validation cho tất cả các trường
      form.trigger();

      // console.log("Form values after delete:", form.getValues());
      // console.log("Form errors after delete:", form.formState.errors);

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

    // Nếu có thông tin người bán nhưng chưa có supplier_id, thêm mới
    const sellerName = form.getValues("seller_name");
    const sellerTaxCode = form.getValues("seller_tax_code");

    // console.log("Checking supplier creation:", {
    //   sellerName,
    //   sellerTaxCode,
    //   currentSupplierId: form.getValues("supplier_id")
    // });

    if (sellerName && !form.getValues("supplier_id")) {
      try {
        setLoading(true);
        console.log("Creating supplier with data:", {
          name: sellerName,
          tax_code: sellerTaxCode || "",
          address: "",
          phone: "",
          email: ""
        });
        const result = await createSupplier({
          name: sellerName,
          tax_code: sellerTaxCode || "",
          address: "",
          phone: "",
          email: ""
        });

        if (result && result.success) {
          const newSupplier = result.data;

          // Cập nhật danh sách người bán
          const updatedSuppliers = [...suppliers, newSupplier];
          setSuppliers(updatedSuppliers);

          // Set supplier info at invoice level
          form.setValue("supplier_id", newSupplier.id);
          form.setValue("seller_name", newSupplier.name);
          form.setValue("seller_tax_code", newSupplier.tax_code || "");
          form.setValue("seller_address", newSupplier.address || "");

          // Cập nhật state
          setDefaultSupplierId(newSupplier.id);
          setDefaultSellerName(newSupplier.name);
          setDefaultSellerTaxCode(newSupplier.tax_code || "");

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

          // Cập nhật state
          setDefaultSupplierId(existingSupplier.id);
          setDefaultSellerName(existingSupplier.name);
          setDefaultSellerTaxCode(existingSupplier.tax_code || "");

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
    };

    // Kiểm tra và cập nhật các hàng hóa mới theo tên
    let processedDetails = [...formData.details];

    // Duyệt qua từng chi tiết để kiểm tra hàng hóa trùng tên
    for (let i = 0; i < processedDetails.length; i++) {
      const detail = processedDetails[i];

      // Nếu chưa có inventory_id nhưng có tên hàng hóa
      if (!detail.inventory_id && detail.item_name) {
        // Tìm hàng hóa trùng tên (so sánh không phân biệt hoa thường)
        const matchedInventory = inventoryItems.find(
          item => item.item_name.toLowerCase() === detail.item_name.toLowerCase()
        );

        if (matchedInventory) {
          console.log(`Found existing inventory in ADD mode with matching name: ${matchedInventory.item_name}, ID: ${matchedInventory.id}`);

          // Cập nhật thông tin hàng hóa với thông tin từ hàng hóa đã có
          processedDetails[i] = {
            ...detail,
            inventory_id: matchedInventory.id,
            unit: detail.unit || matchedInventory.unit,
            category: matchedInventory.category
          };
        }
      }
    }

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
              // Sử dụng giá trị từ form nếu đã được chỉnh sửa thủ công, nếu không thì tính toán lại
              total_before_tax: detail.is_manually_edited
                ? Number(detail.total_before_tax)
                : Math.round(Number(detail.quantity) * Number(detail.price_before_tax)),
              // Sử dụng giá trị từ form nếu đã được chỉnh sửa thủ công, nếu không thì tính toán lại
              tax_amount: detail.is_manually_edited
                ? Number(detail.tax_amount)
                : Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                  (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
              // Sử dụng giá trị từ form nếu đã được chỉnh sửa thủ công, nếu không thì tính toán lại
              total_after_tax: detail.is_manually_edited
                ? Number(detail.total_after_tax)
                : Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) +
                  Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                  (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
              // Đánh dấu trạng thái chỉnh sửa thủ công
              is_manually_edited: detail.is_manually_edited || false
            };

            console.log("Detail data being sent in form submit:", detailData);
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
    // console.log("Original form data:", data);
    // console.log("Modified form data being submitted:", formData);
    // console.log("Note field in form data:", formData.note);
    // console.log("Details in form data:", formData.details);
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
              // Kiểm tra xem có hàng hóa trùng tên trong cơ sở dữ liệu không
              let matchedInventory = null;

              // Nếu chưa có inventory_id nhưng có tên hàng hóa
              if (!detail.inventory_id && detail.item_name) {
                // Tìm hàng hóa trùng tên (so sánh không phân biệt hoa thường)
                matchedInventory = inventoryItems.find(
                  item => item.item_name.toLowerCase() === detail.item_name.toLowerCase()
                );

                if (matchedInventory) {
                  console.log(`Found existing inventory with matching name: ${matchedInventory.item_name}, ID: ${matchedInventory.id}`);
                  // Hiển thị thông báo cho người dùng
                  toast.info(`Tìm thấy hàng hóa "${matchedInventory.item_name}" trong cơ sở dữ liệu`, {
                    description: "Sẽ cập nhật số lượng cho hàng hóa này thay vì tạo mới",
                    className: "text-lg font-medium",
                    descriptionClassName: "text-base"
                  });
                }
              }

              // Chuẩn bị dữ liệu gửi đi
              const detailData = {
                ...detail,
                quantity: Number(detail.quantity),
                price_before_tax: Number(detail.price_before_tax),
                // Đảm bảo item_name là chuỗi
                item_name: typeof detail.item_name === 'string' ? detail.item_name : String(detail.item_name || ''),
                // Nếu tìm thấy hàng hóa trùng tên, sử dụng ID của hàng hóa đó
                inventory_id: matchedInventory ? matchedInventory.id : detail.inventory_id,
                // Nếu tìm thấy hàng hóa trùng tên, sử dụng đơn vị của hàng hóa đó nếu chưa có đơn vị
                unit: matchedInventory && !detail.unit ? matchedInventory.unit : detail.unit,
                // Nếu tìm thấy hàng hóa trùng tên, sử dụng loại của hàng hóa đó
                category: matchedInventory ? matchedInventory.category : detail.category,
                // Luôn gửi giá trị tính toán từ frontend
                total_before_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)),
                tax_amount: Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                  (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
                total_after_tax: Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) +
                  Math.round((Math.round(Number(detail.quantity) * Number(detail.price_before_tax)) *
                  (detail.tax_rate === "KCT" ? 0 : Number(detail.tax_rate?.replace("%", "") || 0))) / 100),
                is_manually_edited: detail.is_manually_edited || false
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
                  // Làm tròn đơn giá đến 3 chữ số thập phân
                  price_before_tax: Math.round((Number(d.price_before_tax) || 0) * 1000) / 1000,
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
              tax_rate: detail.tax_rate || "0%",
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
      // Sử dụng giá trị từ form nếu đã được chỉnh sửa thủ công
      total_before_tax: formData.is_invoice_totals_manually_edited ? Number(formData.total_before_tax) : Number(processedDetails.reduce((sum: number, detail: any) => sum + (Number(detail.total_before_tax) || 0), 0)),
      total_tax: formData.is_invoice_totals_manually_edited ? Number(formData.total_tax) : Number(processedDetails.reduce((sum: number, detail: any) => sum + (Number(detail.tax_amount) || 0), 0)),
      total_after_tax: formData.is_invoice_totals_manually_edited ? Number(formData.total_after_tax) : Number(processedDetails.reduce((sum: number, detail: any) => sum + (Number(detail.total_after_tax) || 0), 0)),
      is_invoice_totals_manually_edited: formData.is_invoice_totals_manually_edited || false,
      details: processedDetails.map((detail: any) => ({
        ...detail,
        item_name: typeof detail.item_name === 'string' ? detail.item_name : String(detail.item_name || ''),
        unit: detail.unit || "",
        quantity: Number(detail.quantity) || 0,
        price_before_tax: Number(detail.price_before_tax) || 0,
        tax_rate: detail.tax_rate || "0%",
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

    // Reset form với dữ liệu mới để đảm bảo tất cả các trường được cập nhật đúng cách
    form.reset(updatedData);

    // Lấy lại dữ liệu form sau khi reset
    const finalData = form.getValues();
    // console.log("Final data for submit:", finalData);
    // console.log("Supplier and Customer IDs:", {
    //   supplier_id: finalData.supplier_id,
    //   customer_id: finalData.customer_id,
    //   seller_name: finalData.seller_name,
    //   seller_tax_code: finalData.seller_tax_code,
    //   buyer_name: finalData.buyer_name,
    //   buyer_tax_code: finalData.buyer_tax_code
    // });
    // console.log("Manual edit flags:", {
    //   is_invoice_totals_manually_edited: finalData.is_invoice_totals_manually_edited,
    //   total_before_tax: finalData.total_before_tax,
    //   total_tax: finalData.total_tax,
    //   total_after_tax: finalData.total_after_tax
    // });
    onSubmit(finalData);
  };

  // Hàm xử lý khi submit form không hợp lệ
  const handleInvalidSubmit = (errors: any) => {
    // console.log("Form validation errors:", errors);
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
    <form
      onSubmit={(e) => {
        // Đặt isSubmitted = true khi form được submit
        setIsSubmitted(true);
        form.handleSubmit(handleFormSubmit, handleInvalidSubmit)(e);
      }}
      className="space-y-3 md:space-y-4 w-full overflow-x-hidden max-w-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Hàng 1: Số hóa đơn, ngày lập hóa đơn, mô tả */}
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



      {/* Hàng 1: Thông tin người bán và người mua */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-full">
        {/* Thông tin người bán */}
        <div className="max-w-full">
          <Label className="text-sm md:text-base mb-1 md:mb-2 block">Thông tin người bán</Label>
          <div className="p-3 border rounded-md bg-blue-50 space-y-2 max-w-full min-h-[180px] flex flex-col">
            <div className="flex flex-col space-y-2">
              {/* Trường nhập liệu tên người bán */}
              <div className="flex-1">
                <Label htmlFor="default_seller_name" className="text-xs font-medium mb-1 block">Tên người bán:</Label>
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

                      // Set seller name at invoice level instead of detail level
                      form.setValue("seller_name", value);

                      // Clear supplier_id khi user thay đổi seller name manually
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

                            // Set supplier info at invoice level instead of detail level
                            form.setValue("supplier_id", supplier.id);
                            form.setValue("seller_name", supplier.name);
                            form.setValue("seller_tax_code", supplier.tax_code || "");
                            form.setValue("seller_address", supplier.address || "");

                            // Ẩn dropdown sau khi chọn
                            setShowSellerDropdown(false);

                            // Focus vào input sau khi chọn
                            setTimeout(() => {
                              if (sellerInputRef.current) {
                                sellerInputRef.current.focus();
                              }
                            }, 10);
                          }}
                        >
                          <div className="text-sm font-medium">{supplier.name}</div>
                          <div className="text-xs text-gray-500">
                            {supplier.tax_code && `MST: ${supplier.tax_code}`}
                          </div>
                        </div>
                      ))}
                    </DropdownPortal>
                  )}
                </div>
              </div>

              {/* Trường nhập liệu mã số thuế */}
              <div className="flex-1">
                <Label htmlFor="default_seller_tax_code" className="text-xs font-medium mb-1 block">Mã số thuế:</Label>
                <Input
                  id="default_seller_tax_code"
                  type="text"
                  placeholder="Nhập mã số thuế"
                  value={defaultSellerTaxCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDefaultSellerTaxCode(value);

                    // Set seller tax code at invoice level
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

            {/* Thông báo về việc tự động áp dụng */}
            <div className="text-xs text-blue-600 italic mt-1">
              Thông tin người bán sẽ tự động áp dụng cho tất cả hàng hóa. Người bán mới sẽ tự động được thêm vào hệ thống khi lưu hóa đơn.
            </div>
          </div>
        </div>

        {/* Thông tin người mua */}
        <div className="max-w-full">
          <Label className="text-sm md:text-base mb-1 md:mb-2 block">Thông tin người mua</Label>
          <div className="p-3 border rounded-md bg-green-50 space-y-2 max-w-full min-h-[180px] flex flex-col">
            <div className="flex flex-col space-y-2">
              {/* Trường nhập liệu tên người mua */}
              <div className="flex-1">
                <Label htmlFor="default_buyer_name" className="text-xs font-medium mb-1 block">Tên người mua:</Label>
                <div className="relative">
                  <Input
                    id="default_buyer_name"
                    type="text"
                    placeholder="Nhập tên người mua"
                    value={form.watch("buyer_name") || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      form.setValue("buyer_name", value);

                      // Clear customer_id khi user thay đổi buyer name manually
                      if (form.getValues("customer_id")) {
                        form.setValue("customer_id", null);
                      }

                      // Tìm kiếm khách hàng phù hợp
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
                      const buyerName = form.watch("buyer_name") || "";
                      if (buyerName.length > 0 && filteredCustomers.length > 0) {
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

                  {/* Dropdown hiển thị danh sách khách hàng */}
                  {showBuyerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredCustomers.slice(0, 5).map((customer) => (
                        <div
                          key={customer.id}
                          className="px-3 py-2 hover:bg-green-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // Cập nhật thông tin khách hàng
                            form.setValue("customer_id", customer.id);
                            form.setValue("buyer_name", customer.name);
                            form.setValue("buyer_tax_code", customer.tax_code || "");

                            // Ẩn dropdown sau khi chọn
                            setShowBuyerDropdown(false);
                          }}
                        >
                          <div className="text-sm font-medium">{customer.name}</div>
                          <div className="text-xs text-gray-500">
                            {customer.tax_code && `MST: ${customer.tax_code}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Trường nhập liệu mã số thuế */}
              <div className="flex-1">
                <Label htmlFor="default_buyer_tax_code" className="text-xs font-medium mb-1 block">Mã số thuế:</Label>
                <Input
                  id="default_buyer_tax_code"
                  type="text"
                  placeholder="Nhập mã số thuế"
                  value={form.watch("buyer_tax_code") || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    form.setValue("buyer_tax_code", value);

                    // Clear customer_id khi user thay đổi buyer tax code manually
                    if (form.getValues("customer_id")) {
                      form.setValue("customer_id", null);
                    }
                  }}
                  className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                  disabled={isViewMode}
                />
              </div>


            </div>

            {/* Thông báo về việc tự động áp dụng */}
            <div className="text-xs text-green-600 italic mt-1">
              Thông tin người mua sẽ được lưu vào hệ thống. Khách hàng mới sẽ tự động được thêm khi lưu hóa đơn.
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 1.5: Tổng tiền */}
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
                    // Xử lý khi người dùng hoàn tất nhập liệu
                    let value = e.target.value.replace(/[^\d,]/g, '');

                    // Xử lý dấu phẩy
                    const commaCount = (value.match(/,/g) || []).length;
                    if (commaCount > 1) {
                      const parts = value.split(',');
                      value = parts[0] + ',' + parts.slice(1).join('');
                    }

                    // Chuyển đổi sang số sử dụng parseVietnameseNumber
                    const numValue = parseVietnameseNumber(value);

                    // Định dạng lại giá trị hiển thị
                    setTotalBeforeTaxDisplay(formatCurrencyInput(numValue));

                    // Cập nhật giá trị tổng tiền trước thuế trong form
                    form.setValue("total_before_tax", numValue);
                    form.setValue("is_invoice_totals_manually_edited", true);

                    // Không tự động cập nhật các ô khác hoặc phân bổ tỷ lệ
                    // Chỉ tính toán khi người dùng nhấn "Tính toán lại tất cả"
                  }}
                />
              )}
            </div>
            {/* Tổng tiền thuế */}
            <div className="flex-1">
              <Label htmlFor="total_tax" className="text-sm font-medium text-gray-700 mb-1 block">Tổng tiền thuế:</Label>
              {isViewMode ? (
                <span className="text-sm font-bold">
                  {(() => {
                    const totalTaxFromInitial = initialData && initialData.total_tax ? initialData.total_tax : null;
                    const totalTaxFromDetails = form.getValues("details")?.reduce(
                      (sum, detail) => sum + (Number(detail.tax_amount || 0)),
                      0
                    ) || 0;

                    console.log('Total tax display debug:', {
                      initialData_total_tax: totalTaxFromInitial,
                      calculated_from_details: totalTaxFromDetails,
                      using_value: totalTaxFromInitial || totalTaxFromDetails
                    });

                    return formatCurrency(totalTaxFromInitial || totalTaxFromDetails);
                  })()}
                </span>
              ) : (
                <Input
                  id="total_tax"
                  type="text"
                  inputMode="decimal"
                  className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                  value={totalTaxDisplay}
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
                    // Xử lý khi người dùng hoàn tất nhập liệu
                    let value = e.target.value.replace(/[^\d,]/g, '');

                    // Xử lý dấu phẩy
                    const commaCount = (value.match(/,/g) || []).length;
                    if (commaCount > 1) {
                      const parts = value.split(',');
                      value = parts[0] + ',' + parts.slice(1).join('');
                    }

                    // Chuyển đổi sang số sử dụng parseVietnameseNumber
                    const numValue = parseVietnameseNumber(value);

                    // Định dạng lại giá trị hiển thị
                    setTotalTaxDisplay(formatCurrencyInput(numValue));

                    // Cập nhật giá trị tổng tiền thuế trong form
                    form.setValue("total_tax", numValue);
                    form.setValue("is_invoice_totals_manually_edited", true);

                    // Không tự động cập nhật các ô khác hoặc phân bổ tỷ lệ
                    // Chỉ tính toán khi người dùng nhấn "Tính toán lại tất cả"
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
                  id="total_payment"
                  type="text"
                  inputMode="decimal"
                  className="h-8 text-sm rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300 font-bold"
                  value={totalAfterTaxDisplay}
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
                    // Xử lý khi người dùng hoàn tất nhập liệu
                    let value = e.target.value.replace(/[^\d,]/g, '');

                    // Xử lý dấu phẩy
                    const commaCount = (value.match(/,/g) || []).length;
                    if (commaCount > 1) {
                      const parts = value.split(',');
                      value = parts[0] + ',' + parts.slice(1).join('');
                    }

                    // Chuyển đổi sang số sử dụng parseVietnameseNumber
                    const numValue = parseVietnameseNumber(value);

                    // Định dạng lại giá trị hiển thị
                    setTotalAfterTaxDisplay(formatCurrencyInput(numValue));

                    // Cập nhật giá trị tổng thanh toán trong form
                    form.setValue("total_after_tax", numValue);
                    form.setValue("is_invoice_totals_manually_edited", true);

                    // Không tự động cập nhật các ô khác hoặc phân bổ tỷ lệ
                    // Chỉ tính toán khi người dùng nhấn "Tính toán lại tất cả"
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 2: Chi tiết hàng hóa */}
      <div className="max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-1 sm:gap-0 max-w-full">
          <h3 className="text-sm md:text-base font-medium">Chi tiết hàng hóa</h3>
          {!isViewMode && (
            <div className="flex flex-col sm:flex-row gap-1">
              <Button
                type="button"
                onClick={() => {
                  // Thêm dòng mới vào form (supplier info now at invoice level)
                  append({
                    category: "HH",
                    item_name: "",
                    unit: "",
                    quantity: 0,
                    price_before_tax: 0,
                    tax_rate: "0%",
                    inventory_id: null,
                    total_before_tax: 0,
                    tax_amount: 0,
                    total_after_tax: 0,
                    is_manually_edited: false,
                    // Removed supplier_id, seller_name, seller_tax_code - now at invoice level
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
                className="px-3 md:px-4 h-7 md:h-8 text-xs w-full sm:w-auto"
              >
                <FaPlus className="mr-1 h-2.5 w-2.5" /> Thêm hàng hóa
              </Button>

              {/* Nút tính toán thủ công */}
              <Button
                type="button"
                variant="secondary"
                onClick={handleManualCalculation}
                disabled={isCalculating}
                title="Tính toán lại tất cả tổng tiền từ số lượng và đơn giá (sẽ ghi đè các giá trị đã chỉnh sửa thủ công)"
                className="px-3 md:px-4 h-7 md:h-8 text-xs w-full sm:w-auto bg-green-100 hover:bg-green-200 border-green-200 text-green-700"
              >
                {isCalculating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1 h-2.5 w-2.5 text-green-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang tính...
                  </>
                ) : (
                  <>
                    <svg className="mr-1 h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Tính toán lại tất cả
                  </>
                )}
              </Button>

              {/* <div className="flex flex-col sm:flex-row gap-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOcrModalOpen(true)}
                  className="px-3 md:px-4 h-7 md:h-8 text-xs w-full sm:w-auto"
                >
                  <svg className="mr-1 h-2.5 w-2.5" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                  </svg>
                  Trích xuất từ PDF
                </Button> */}

                {/* Nút xem kết quả OCR chung cho toàn bộ hóa đơn */}
                {/* {fields.some(field => form.getValues(`details.${fields.indexOf(field)}.ocrTaskId`)) && (
                  <OcrResultViewer
                    ocrResult={getOriginalOcrResult(
                      fields.find(field => form.getValues(`details.${fields.indexOf(field)}.ocrTaskId`))
                        ? form.getValues(`details.${fields.indexOf(fields.find(field =>
                            form.getValues(`details.${fields.indexOf(field)}.ocrTaskId`)) || fields[0])}.ocrTaskId`) || ""
                        : ""
                    )}
                    buttonVariant="outline"
                    buttonSize="sm"
                    buttonLabel="Xem kết quả OCR"
                    buttonClassName="px-3 md:px-4 h-7 md:h-8 text-xs w-full sm:w-auto bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700"
                  />
                )} */}
              {/* </div> */}
            </div>
          )}
        </div>

        <div className="w-full border rounded-sm max-w-full relative" style={{ overflow: 'visible' }}>
          <ScrollArea className="w-full h-[250px] md:h-[300px] overflow-x-auto">
            <div className="relative w-full min-w-[800px]" style={{ overflow: 'visible' }}>
            <Table className="w-full min-w-[800px]" style={{ overflow: 'visible' }}>
              <TableHeader className="bg-destructive rounded-t-sm sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-white font-bold text-center text-xs md:text-sm rounded-tl-sm w-[4%] min-w-[40px]">
                    Loại
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-xs md:text-sm w-[25%] min-w-[120px]">
                    Tên hàng
                  </TableHead>
                  <TableHead className="text-white font-bold text-center text-xs md:text-sm w-[6%]">
                    Đơn vị
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
              <TableBody style={{ overflow: 'visible' }}>
                {currentItems.map((field, index) => {
                  const actualIndex = indexOfFirstItem + index;
                  return (
                    <TableRow key={field.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"} style={{ overflow: 'visible' }}>
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
                                <SelectItem value="CP" className="text-sm">CP</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 text-sm md:text-base" style={{ overflow: 'visible' }}>
                        <div className="flex flex-col md:space-y-2" style={{ overflow: 'visible' }}>
                          <div className="flex space-x-1" style={{ overflow: 'visible' }}>
                            <div className="w-full flex-1" style={{ overflow: 'visible' }}>
                              <div className="flex flex-col" style={{ overflow: 'visible' }}>
                                <div className="flex space-x-2" style={{ overflow: 'visible' }}>
                                  <div className="flex-1" style={{ overflow: 'visible' }}>
                                    <div className="relative w-full" style={{ position: 'relative' }}>
                                      {/* Import FlatInput từ components/ui/flat-input */}
                                      <Input
                                        type="text"
                                        placeholder="Nhập tên hàng hóa"
                                        value={form.getValues(`details.${actualIndex}.item_name`) || ""}
                                        disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                                        className="h-10 text-sm w-full px-3 rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                                        ref={(el) => {
                                          inputRefs.current[actualIndex] = el;
                                        }}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          console.log(`Input onChange called with value:`, value);
                                          // Cập nhật giá trị vào form
                                          form.setValue(`details.${actualIndex}.item_name`, value);

                                          // ✅ Trigger lazy loading search khi user gõ
                                          searchInventoryItems(value);

                                          // Nếu có hàng hóa trùng tên, tự động gán inventory_id
                                          const matchedByName = inventoryItems.find(
                                            item => item.item_name.toLowerCase() === value.toLowerCase()
                                          );

                                          if (matchedByName) {
                                            console.log(`Matched existing inventory item by name:`, matchedByName);
                                            // Nếu tìm thấy hàng hóa theo tên, sử dụng thông tin của hàng hóa đó
                                            form.setValue(`details.${actualIndex}.inventory_id`, matchedByName.id);
                                            form.setValue(`details.${actualIndex}.unit`, matchedByName.unit);
                                            form.setValue(`details.${actualIndex}.category`, matchedByName.category);
                                            // Đóng dropdown khi tìm thấy kết quả chính xác

                                            // Ẩn dropdown khi có kết quả trùng khớp chính xác
                                            const input = document.activeElement as HTMLElement;
                                            if (input) {
                                              input.blur();
                                            }
                                          } else {
                                            // Nếu không tìm thấy, đặt inventory_id = null
                                            form.setValue(`details.${actualIndex}.inventory_id`, null);
                                          }

                                          handleDetailFieldChange(actualIndex);
                                        }}

                                        onBlur={() => {
                                          // Ẩn dropdown sau một khoảng thời gian ngắn để cho phép click vào dropdown
                                          setTimeout(() => {
                                            // Kiểm tra lại một lần nữa xem có hàng hóa trùng khớp không
                                            const currentValue = form.getValues(`details.${actualIndex}.item_name`) || "";
                                            const exactMatch = inventoryItems.find(
                                              item => item.item_name.toLowerCase() === currentValue.toLowerCase()
                                            );

                                            if (exactMatch) {
                                              // Nếu có kết quả trùng khớp chính xác, tự động chọn
                                              form.setValue(`details.${actualIndex}.inventory_id`, exactMatch.id);
                                              form.setValue(`details.${actualIndex}.item_name`, exactMatch.item_name);
                                              form.setValue(`details.${actualIndex}.unit`, exactMatch.unit);
                                              form.setValue(`details.${actualIndex}.category`, exactMatch.category);
                                              handleDetailFieldChange(actualIndex);
                                            }
                                          }, 200);
                                        }}
                                      />

                                      {/* Dropdown gợi ý hàng hóa tương tự với lazy loading */}
                                      {form.getValues(`details.${actualIndex}.item_name`) &&
                                        !isViewMode &&
                                        (mode !== "edit" || editingRowIndex === actualIndex) &&
                                        (form.getValues(`details.${actualIndex}.item_name`) || "").length >= 2 &&
                                        (inventoryLoading || (
                                          // Chỉ hiển thị dropdown khi không có kết quả trùng khớp chính xác
                                          !inventoryItems.some(item =>
                                            item.item_name.toLowerCase() === (form.getValues(`details.${actualIndex}.item_name`) || "").toLowerCase()
                                          ) &&
                                          inventoryItems.filter(item =>
                                            item.item_name.toLowerCase().includes(
                                              (form.getValues(`details.${actualIndex}.item_name`) || "").toLowerCase()
                                            )
                                          ).length > 0
                                        )) && (
                                        <DropdownPortal
                                          targetRef={{ current: inputRefs.current[actualIndex] }}
                                          isOpen={true}
                                          onClose={closeDropdown}
                                        >
                                          {inventoryLoading ? (
                                            <div className="px-3 py-2 text-gray-500 text-sm">
                                              🔍 Đang tìm kiếm...
                                            </div>
                                          ) : (
                                            inventoryItems
                                              .filter(item =>
                                                item.item_name.toLowerCase().includes(
                                                  (form.getValues(`details.${actualIndex}.item_name`) || "").toLowerCase()
                                                )
                                              )
                                              .slice(0, 10) // Hiển thị tối đa 10 gợi ý
                                              .map(item => (
                                              <div
                                                key={item.id}
                                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                                                onMouseDown={(e) => {
                                                  // Ngăn sự kiện mousedown lan truyền
                                                  e.stopPropagation();

                                                  // Chỉ ngăn sự kiện mặc định nếu là click chuột trái
                                                  // để cho phép cuộn chuột hoạt động
                                                  if (e.button === 0) { // 0 là chuột trái
                                                    e.preventDefault();

                                                    // Khi người dùng chọn một hàng hóa từ dropdown
                                                    form.setValue(`details.${actualIndex}.inventory_id`, item.id);
                                                    form.setValue(`details.${actualIndex}.item_name`, item.item_name);
                                                    form.setValue(`details.${actualIndex}.unit`, item.unit);
                                                    form.setValue(`details.${actualIndex}.category`, item.category);
                                                    handleDetailFieldChange(actualIndex);

                                                    // Đóng dropdown sau khi chọn
                                                    closeDropdown();

                                                    // Focus vào input sau khi chọn
                                                    setTimeout(() => {
                                                      if (inputRefs.current[actualIndex]) {
                                                        inputRefs.current[actualIndex]?.focus();
                                                      }
                                                    }, 10);
                                                  }
                                                }}
                                              >
                                                <div className="text-sm font-medium">{item.item_name}</div>
                                                <div className="text-xs text-gray-500">
                                                  {item.category === 'HH' ? 'Hàng hóa' : 'Chi phí'} | Đơn vị: {item.unit}
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </DropdownPortal>
                                      )}
                                    </div>
                                  </div>

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
                        <Input
                          type="text"
                          placeholder="Đơn vị"
                          defaultValue={form.getValues(`details.${actualIndex}.unit`) || ""}
                          disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                          className="h-10 text-sm w-full px-3 rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300"
                          onChange={(e) => {
                            form.setValue(`details.${actualIndex}.unit`, e.target.value);
                            handleDetailFieldChange(actualIndex);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 text-sm md:text-base">
                        {/* Hiển thị số lượng cho cả hàng hóa và chi phí */}
                        <Input
                          type="text"
                          inputMode="decimal"
                          defaultValue={(() => {
                            const value = form.getValues(`details.${actualIndex}.quantity`);
                            return (value === 0 || value === null || value === undefined) ? "" : formatVietnameseNumber(value);
                          })()}
                          disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                          className={`h-10 text-sm w-full px-3 rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300 ${isSubmitted && form.formState.errors.details?.[actualIndex]?.quantity ? "border-red-500" : ""}`}
                          onChange={(e) => {
                            handleVietnameseNumberInput(e, (value) => {
                              form.setValue(`details.${actualIndex}.quantity`, value);
                              handleDetailFieldChange(actualIndex);
                            }, 3);
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            if (value === "" || value === ",") {
                              e.target.value = "";
                              form.setValue(`details.${actualIndex}.quantity`, 0);
                            } else {
                              const numValue = parseVietnameseNumber(value);
                              form.setValue(`details.${actualIndex}.quantity`, numValue);
                              e.target.value = formatVietnameseNumber(numValue);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 hidden md:table-cell text-sm md:text-base">
                        <Input
                          type="text"
                          inputMode="decimal"
                          defaultValue={(() => {
                            const value = form.getValues(`details.${actualIndex}.price_before_tax`);
                            return (value === 0 || value === null || value === undefined) ? "" : formatVietnameseNumber(value);
                          })()}
                          // Sử dụng formatPrice để hiển thị đơn giá với số thập phân
                          disabled={isViewMode || (mode === "edit" && editingRowIndex !== actualIndex)}
                          className={`h-10 text-sm w-full px-3 rounded-none border-0 border-b shadow-none focus-visible:ring-0 focus-visible:border-blue-300 ${isSubmitted && form.formState.errors.details?.[actualIndex]?.price_before_tax ? "border-red-500" : ""}`}
                          onChange={(e) => {
                            handleVietnameseNumberInput(e, (value) => {
                              // Làm tròn đến 3 chữ số thập phân cho đơn giá
                              const roundedValue = Math.round(value * 1000) / 1000;
                              form.setValue(`details.${actualIndex}.price_before_tax`, roundedValue);
                              handleDetailFieldChange(actualIndex);
                            }, 3);
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            if (value === "" || value === ",") {
                              e.target.value = "";
                              form.setValue(`details.${actualIndex}.price_before_tax`, 0);
                            } else {
                              const numValue = parseVietnameseNumber(value);
                              // Làm tròn đến 3 chữ số thập phân cho đơn giá
                              const roundedValue = Math.round(numValue * 1000) / 1000;
                              form.setValue(`details.${actualIndex}.price_before_tax`, roundedValue);
                              e.target.value = formatVietnameseNumber(roundedValue);
                            }
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
                                // Chỉ clear errors, không tính toán tự động
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
                          <span className="text-sm md:text-base">
                            {formatCurrency(
                              form.getValues(`details.${actualIndex}.total_before_tax`) || 0
                            )}
                          </span>
                        ) : (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={(() => {
                              const value = form.watch(`details.${actualIndex}.total_before_tax`);
                              return (value === 0 || value === null || value === undefined) ? "" : formatVietnameseNumber(value);
                            })()}
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
                                e.target.value = "";
                                form.setValue(`details.${actualIndex}.total_before_tax`, 0);
                              } else {
                                const numValue = parseIntegerNumber(value);
                                form.setValue(`details.${actualIndex}.total_before_tax`, numValue);
                                e.target.value = formatVietnameseNumber(numValue);

                                // Khi đã chỉnh sửa thủ công tổng tiền trước thuế,
                                // cần tính lại thuế và tổng tiền sau thuế
                                const detail = form.getValues(`details.${actualIndex}`);
                                let taxRate = 0;
                                if (detail.tax_rate !== "KCT") {
                                  taxRate = Number(detail.tax_rate?.replace("%", "") || 0);
                                }
                                const taxAmount = Math.round((numValue * taxRate) / 100);
                                const totalAfterTax = numValue + taxAmount;

                                form.setValue(`details.${actualIndex}.tax_amount`, taxAmount);
                                form.setValue(`details.${actualIndex}.total_after_tax`, totalAfterTax);
                              }
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell className="px-1 md:px-2 py-2 md:py-3 text-right font-medium">
                        {isViewMode || (mode === "edit" && editingRowIndex !== actualIndex) ? (
                          <span className="text-sm md:text-base">
                            {formatCurrency(
                              form.getValues(`details.${actualIndex}.total_after_tax`) || 0
                            )}
                          </span>
                        ) : (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={(() => {
                              const value = form.watch(`details.${actualIndex}.total_after_tax`);
                              return (value === 0 || value === null || value === undefined) ? "" : formatVietnameseNumber(value);
                            })()}
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

                                // Đánh dấu đã chỉnh sửa thủ công
                                form.setValue(`details.${actualIndex}.is_manually_edited`, true);

                                // Khi thay đổi giá trị sau thuế, cập nhật ngược lại các giá trị khác
                                const detail = form.getValues(`details.${actualIndex}`);
                                let taxRate = 0;
                                if (detail.tax_rate !== "KCT") {
                                  taxRate = Number(detail.tax_rate?.replace("%", "") || 0);
                                }

                                // Nếu thuế suất là 0, toàn bộ số tiền là tổng trước thuế
                                if (taxRate === 0) {
                                  form.setValue(`details.${actualIndex}.total_before_tax`, numValue);
                                  form.setValue(`details.${actualIndex}.tax_amount`, 0);
                                } else {
                                  // Tính ngược lại tổng tiền trước thuế: total_before_tax = total_after_tax / (1 + taxRate/100)
                                  const totalBeforeTax = Math.round(numValue / (1 + taxRate/100));
                                  form.setValue(`details.${actualIndex}.total_before_tax`, totalBeforeTax);

                                  // Tính lại thuế = tổng sau thuế - tổng trước thuế
                                  const taxAmount = numValue - totalBeforeTax;
                                  form.setValue(`details.${actualIndex}.tax_amount`, taxAmount);
                                }
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
                                    // Nếu đang chỉnh sửa hàng này, lưu thay đổi (setEditingRowIndex(null) đã được gọi trong handleUpdateDetailInEditMode)
                                    handleUpdateDetailInEditMode(actualIndex);
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

                                  // Nếu đã xóa hàng cuối cùng, thêm một hàng mới trống
                                  setTimeout(() => {
                                    if (form.getValues("details")?.length === 0) {
                                      append({
                                        category: "HH",
                                        item_name: "",
                                        unit: "",
                                        quantity: 0,
                                        price_before_tax: 0,
                                        tax_rate: "10%",
                                        // Removed supplier_id - now at invoice level
                                        is_manually_edited: false,
                                        inventory_id: null,
                                        total_before_tax: 0,
                                        tax_amount: 0,
                                        total_after_tax: 0,
                                        ocrTaskId: "",
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



      {/* Modal tải lên tập tin PDF */}
      {/* <Dialog open={isOcrModalOpen} onOpenChange={setIsOcrModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-3 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Trích xuất dữ liệu từ PDF</DialogTitle>
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
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="pdf-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Nhấp để tải lên</span> hoặc kéo thả tập tin</p>
                      <p className="text-xs text-gray-500">PDF (Tối đa 10MB)</p>
                    </div>
                    <input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handlePdfUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Tải lên tập tin PDF hóa đơn để trích xuất thông tin hàng hóa và người bán.
                </p>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2 md:gap-4">
              <Button
                type="button"
                variant="outline"
                className="h-10 md:h-12 px-4 md:px-8 text-sm md:text-base w-full sm:w-auto"
                onClick={() => setIsOcrModalOpen(false)}
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
