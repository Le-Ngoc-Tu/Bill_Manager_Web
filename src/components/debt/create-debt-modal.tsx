"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InvoiceSearchDropdown } from "@/components/ui/invoice-search-dropdown"
import { AvailableInvoice, createDebtFromInvoice, CreateDebtFromInvoiceRequest } from "@/lib/api/debts"
import { formatCurrency, formatDate } from "@/lib/api/debts"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CreateDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDebtModal({ isOpen, onClose, onSuccess }: CreateDebtModalProps) {
  const [invoiceType, setInvoiceType] = useState<'import' | 'export' | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<AvailableInvoice | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleClose = () => {
    if (loading) return;
    
    // Reset form
    setInvoiceType(null);
    setSelectedInvoice(null);
    setDueDate('');
    setDescription('');
    setError(null);
    setSuccess(false);
    
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInvoice) {
      setError('Vui lòng chọn hóa đơn');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestData: CreateDebtFromInvoiceRequest = {
        invoice_type: selectedInvoice.type,
        invoice_id: selectedInvoice.id,
        due_date: dueDate || undefined,
        description: description || undefined,
      };

      const response = await createDebtFromInvoice(requestData);
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1500);
      } else {
        setError(response.message || 'Đã xảy ra lỗi khi tạo công nợ');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi tạo công nợ');
      console.error('Error creating debt:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getDebtTypeLabel = (debtType: 'payable' | 'receivable') => {
    return debtType === 'payable' ? 'Công nợ phải trả' : 'Công nợ phải thu';
  };

  const getInvoiceTypeLabel = (type: 'import' | 'export') => {
    return type === 'import' ? 'Hóa đơn nhập kho' : 'Hóa đơn xuất kho';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Thêm công nợ từ hóa đơn</DialogTitle>
          <DialogDescription>
            Chọn hóa đơn nhập/xuất kho để tạo công nợ tương ứng
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              Tạo công nợ thành công!
            </h3>
            <p className="text-gray-600">
              Công nợ đã được tạo và sẽ xuất hiện trong danh sách
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Invoice Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="invoice-type">Loại hóa đơn *</Label>
              <Select value={invoiceType || ''} onValueChange={(value) => setInvoiceType(value as 'import' | 'export')}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại hóa đơn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="import">Hóa đơn nhập kho</SelectItem>
                  <SelectItem value="export">Hóa đơn xuất kho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Selection */}
            <div className="space-y-2">
              <Label htmlFor="invoice">Chọn hóa đơn *</Label>
              <InvoiceSearchDropdown
                invoiceType={invoiceType}
                selectedInvoice={selectedInvoice}
                onInvoiceSelect={setSelectedInvoice}
                placeholder="Tìm kiếm và chọn hóa đơn..."
                disabled={!invoiceType}
              />
            </div>

            {/* Selected Invoice Info */}
            {selectedInvoice && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Thông tin hóa đơn đã chọn:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Số hóa đơn:</span>
                    <div className="font-medium">{selectedInvoice.invoice_number}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Ngày hóa đơn:</span>
                    <div className="font-medium">{formatDate(selectedInvoice.invoice_date)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Tổng tiền:</span>
                    <div className="font-medium text-blue-600">{formatCurrency(selectedInvoice.total_after_tax)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Loại công nợ:</span>
                    <div className="font-medium">{getDebtTypeLabel(selectedInvoice.debt_type)}</div>
                  </div>
                  {selectedInvoice.supplier_name && (
                    <div>
                      <span className="text-gray-600">Công ty:</span>
                      <div className="font-medium">{selectedInvoice.supplier_name}</div>
                    </div>
                  )}
                  {selectedInvoice.customer_name && (
                    <div>
                      <span className="text-gray-600">Đối tác:</span>
                      <div className="font-medium">{selectedInvoice.customer_name}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due-date">Hạn thanh toán</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={getTodayDate()}
                className="h-10"
              />
              <p className="text-xs text-gray-500">
                Để trống nếu không có hạn thanh toán cụ thể
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Ghi chú</Label>
              <Textarea
                id="description"
                placeholder="Nhập ghi chú về công nợ này (tùy chọn)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading || !selectedInvoice}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo công nợ
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
