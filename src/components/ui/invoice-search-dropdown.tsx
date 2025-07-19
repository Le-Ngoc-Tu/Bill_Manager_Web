"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Search, Loader2 } from "lucide-react"
import { AvailableInvoice, getAvailableInvoices } from "@/lib/api/debts"
import { formatCurrency, formatDate } from "@/lib/api/debts"

interface InvoiceSearchDropdownProps {
  invoiceType: 'import' | 'export' | null;
  selectedInvoice: AvailableInvoice | null;
  onInvoiceSelect: (invoice: AvailableInvoice | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function InvoiceSearchDropdown({
  invoiceType,
  selectedInvoice,
  onInvoiceSelect,
  placeholder = "Chọn hóa đơn...",
  disabled = false
}: InvoiceSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [invoices, setInvoices] = useState<AvailableInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (type: 'import' | 'export', search: string) => {
      if (!type) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await getAvailableInvoices(type, search);
        if (response.success) {
          setInvoices(response.data);
        } else {
          setError('Không thể tải danh sách hóa đơn');
        }
      } catch (err) {
        setError('Đã xảy ra lỗi khi tải danh sách hóa đơn');
        console.error('Error fetching invoices:', err);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Load invoices when invoice type changes or search term changes
  useEffect(() => {
    if (invoiceType) {
      debouncedSearch(invoiceType, searchTerm);
    } else {
      setInvoices([]);
    }
  }, [invoiceType, searchTerm, debouncedSearch]);

  // Reset when invoice type changes
  useEffect(() => {
    if (invoiceType !== selectedInvoice?.type) {
      onInvoiceSelect(null);
      setSearchTerm('');
    }
  }, [invoiceType, selectedInvoice, onInvoiceSelect]);

  const handleInvoiceSelect = (invoice: AvailableInvoice) => {
    onInvoiceSelect(invoice);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onInvoiceSelect(null);
    setSearchTerm('');
  };

  const getDisplayText = () => {
    if (selectedInvoice) {
      return `${selectedInvoice.invoice_number} - ${formatCurrency(selectedInvoice.total_after_tax)}`;
    }
    if (!invoiceType) {
      return "Vui lòng chọn loại hóa đơn trước";
    }
    return placeholder;
  };

  const getInvoiceTypeLabel = (type: 'import' | 'export') => {
    return type === 'import' ? 'Nhập kho' : 'Xuất kho';
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-between"
          disabled={disabled || !invoiceType}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="p-0" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}>
        {/* Search Input */}
        <div className="p-3 border-b">
          <div className="relative">
            <Input
              placeholder={`Tìm theo số hóa đơn, công ty hoặc đối tác...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-4 text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Đang tải...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && invoices.length === 0 && invoiceType && (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">
              {searchTerm ? 'Không tìm thấy hóa đơn phù hợp' : 'Không có hóa đơn khả dụng'}
            </p>
          </div>
        )}

        {/* Invoice List */}
        {!loading && !error && invoices.length > 0 && (
          <div className="max-h-60 overflow-y-auto">
            {selectedInvoice && (
              <DropdownMenuItem onClick={handleClear} className="text-red-600">
                Bỏ chọn
              </DropdownMenuItem>
            )}
            
            {invoices.map((invoice) => (
              <DropdownMenuItem
                key={`${invoice.type}-${invoice.id}`}
                onClick={() => handleInvoiceSelect(invoice)}
                className="p-3 cursor-pointer"
              >
                <div className="w-full">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{invoice.invoice_number}</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {formatCurrency(invoice.total_after_tax)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Ngày: {formatDate(invoice.invoice_date)}</div>
                    {invoice.supplier_name && (
                      <div>Công ty: {invoice.supplier_name}</div>
                    )}
                    {invoice.customer_name && (
                      <div>Đối tác: {invoice.customer_name}</div>
                    )}
                    <div className="inline-block px-2 py-1 bg-gray-100 rounded text-xs">
                      {getInvoiceTypeLabel(invoice.type)} → {invoice.debt_type === 'payable' ? 'Phải trả' : 'Phải thu'}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
