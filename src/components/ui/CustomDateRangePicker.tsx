'use client'

import React, { useState, useRef, useEffect } from 'react'
import { CalendarIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears } from 'date-fns'
import { vi } from 'date-fns/locale'

interface CustomDateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange: (date: Date | undefined) => void
  onEndDateChange: (date: Date | undefined) => void
  onRangeChange?: (startDate: Date | undefined, endDate: Date | undefined) => void
  className?: string
  placeholder?: string
}

const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRangeChange,
  className = "",
  placeholder = "Chọn khoảng thời gian"
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<string>(
    startDate ? format(startDate, 'yyyy-MM-dd') : ''
  )
  const [tempEndDate, setTempEndDate] = useState<string>(
    endDate ? format(endDate, 'yyyy-MM-dd') : ''
  )
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Cập nhật temp values khi props thay đổi
  useEffect(() => {
    setTempStartDate(startDate ? format(startDate, 'yyyy-MM-dd') : '')
    setTempEndDate(endDate ? format(endDate, 'yyyy-MM-dd') : '')
  }, [startDate, endDate])

  // Format hiển thị
  const formatDisplayValue = () => {
    if (startDate && endDate) {
      const start = format(startDate, 'dd/MM/yyyy', { locale: vi })
      const end = format(endDate, 'dd/MM/yyyy', { locale: vi })
      return `${start} - ${end}`
    }
    return placeholder
  }

  // Xử lý khi thay đổi start date
  const handleTempStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value
    setTempStartDate(newStartDate)
    
    // Nếu end date nhỏ hơn start date, tự động cập nhật
    if (tempEndDate && tempEndDate < newStartDate) {
      setTempEndDate(newStartDate)
    }
  }

  // Xử lý khi thay đổi end date
  const handleTempEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value
    
    // Chỉ cho phép end date >= start date
    if (!tempStartDate || newEndDate >= tempStartDate) {
      setTempEndDate(newEndDate)
    }
  }

  // Áp dụng thay đổi
  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      const newStartDate = new Date(tempStartDate)
      const newEndDate = new Date(tempEndDate)
      
      onStartDateChange(newStartDate)
      onEndDateChange(newEndDate)
      setIsOpen(false)
    }
  }

  // Áp dụng ngay khi chọn quick select
  const handleQuickSelectAndApply = (quickSelect: { start: Date, end: Date }) => {
    const { start, end } = quickSelect
    
    // Set temp values trước
    setTempStartDate(format(start, 'yyyy-MM-dd'))
    setTempEndDate(format(end, 'yyyy-MM-dd'))

    // Sử dụng onRangeChange nếu có hoặc fallback về individual handlers
    if (onRangeChange) {
      onRangeChange(start, end)
    } else {
      onStartDateChange(start)
      onEndDateChange(end)
    }
    setIsOpen(false)
  }

  // Hủy thay đổi
  const handleCancel = () => {
    setTempStartDate(startDate ? format(startDate, 'yyyy-MM-dd') : '')
    setTempEndDate(endDate ? format(endDate, 'yyyy-MM-dd') : '')
    setIsOpen(false)
  }

  // Quick select options
  const quickSelects = [
    {
      label: 'Hôm nay',
      getValue: () => {
        const today = new Date()
        return { start: startOfDay(today), end: endOfDay(today) }
      }
    },
    {
      label: 'Hôm qua',
      getValue: () => {
        const yesterday = subDays(new Date(), 1)
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
      }
    },
    {
      label: '7 ngày qua',
      getValue: () => {
        const today = new Date()
        const start = subDays(today, 6)
        return { start: startOfDay(start), end: endOfDay(today) }
      }
    },
    {
      label: '30 ngày qua',
      getValue: () => {
        const today = new Date()
        const start = subDays(today, 29)
        return { start: startOfDay(start), end: endOfDay(today) }
      }
    },
    {
      label: 'Tháng này',
      getValue: () => {
        const today = new Date()
        return { start: startOfMonth(today), end: endOfMonth(today) }
      }
    },
    {
      label: 'Tháng trước',
      getValue: () => {
        const lastMonth = subMonths(new Date(), 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      }
    },
    {
      label: 'Quý này',
      getValue: () => {
        const today = new Date()
        return { start: startOfQuarter(today), end: endOfQuarter(today) }
      }
    },
    {
      label: 'Quý trước',
      getValue: () => {
        const lastQuarter = subQuarters(new Date(), 1)
        return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) }
      }
    },
    {
      label: 'Năm này',
      getValue: () => {
        const today = new Date()
        return { start: startOfYear(today), end: endOfYear(today) }
      }
    },
    {
      label: 'Năm trước',
      getValue: () => {
        const lastYear = subYears(new Date(), 1)
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) }
      }
    }
  ]

  return (
    <div className={`relative w-64 ${className}`} ref={dropdownRef}>
      {/* Input Display */}
      <div
        className="flex items-center h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white cursor-pointer hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
        <span className={`flex-1 text-sm ${!startDate || !endDate ? 'text-gray-400' : 'text-gray-900'}`}>
          {formatDisplayValue()}
        </span>
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] w-full min-w-[400px] max-w-[500px]">
          <div className="p-4">
            {/* Quick Select */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Chọn nhanh:</div>
              <div className="grid grid-cols-2 gap-2">
                {quickSelects.map((quick, index) => (
                  <button
                    key={index}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-left"
                    onClick={() => handleQuickSelectAndApply(quick.getValue())}
                  >
                    {quick.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={handleTempStartDateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={handleTempEndDateChange}
                    min={tempStartDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <button
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  onClick={handleCancel}
                >
                  Hủy
                </button>
                <button
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={handleApply}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomDateRangePicker
