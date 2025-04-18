"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { label: string; value: string; description?: string }[]
  value: string
  onChange: (value: string) => void
  onInputChange?: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  triggerClassName?: string
  contentClassName?: string
  allowCustomValue?: boolean
  style?: React.CSSProperties
}

export function Combobox({
  options,
  value,
  onChange,
  onInputChange,
  placeholder = "Chọn một mục...",
  emptyMessage = "Không tìm thấy kết quả.",
  className,
  disabled = false,
  triggerClassName,
  contentClassName,
  allowCustomValue = false,
  style,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // Tìm option hiện tại dựa trên value
  const selectedOption = React.useMemo(() => {
    return options.find((option) => option.value === value)
  }, [options, value])

  // Xử lý khi người dùng nhập vào ô tìm kiếm
  const handleInputChange = React.useCallback(
    (inputValue: string) => {
      setSearchValue(inputValue)
      if (onInputChange) {
        onInputChange(inputValue)
      }
    },
    [onInputChange]
  )

  // Xử lý khi người dùng chọn một option
  const handleSelect = React.useCallback(
    (currentValue: string) => {
      // Nếu chọn giá trị hiện tại, toggle trạng thái đóng/mở
      if (currentValue === value) {
        setOpen(false)
        return
      }

      onChange(currentValue)
      setOpen(false)
    },
    [onChange, value]
  )

  // Xử lý khi đóng popover mà có giá trị tìm kiếm
  React.useEffect(() => {
    if (!open && searchValue && allowCustomValue) {
      console.log('Combobox closed with search value:', searchValue);
      // Nếu không tìm thấy trong options và cho phép giá trị tùy chỉnh
      const matchedOption = options.find(
        option => option.label.toLowerCase() === searchValue.toLowerCase()
      )

      if (matchedOption) {
        console.log('Matched option found:', matchedOption);
        // Nếu tìm thấy, sử dụng giá trị của option đó
        onChange(matchedOption.value)
        // Cập nhật giá trị hiển thị
        setSelectedValue(matchedOption.label)
      } else {
        console.log('No matched option, using search value directly:', searchValue);
        // Nếu không tìm thấy, sử dụng giá trị nhập vào
        onChange(searchValue)
        // Cập nhật giá trị hiển thị
        setSelectedValue(searchValue)
      }
      setSearchValue("")
    }
  }, [open, searchValue, onChange, options, allowCustomValue])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-10 font-normal",
            disabled && "opacity-50 pointer-events-none",
            triggerClassName
          )}
          style={{ height: '40px', ...style }}
          disabled={disabled}
        >
          <span className="font-normal">
            {selectedOption
              ? selectedOption.label
              : value && allowCustomValue
                ? value
                : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", contentClassName)} style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <Command className={className}>
          <CommandInput
            placeholder={`Tìm kiếm ${placeholder.toLowerCase()}...`}
            value={searchValue}
            onValueChange={handleInputChange}
            className="font-normal"
          />
          <CommandEmpty className="font-normal">{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-y-auto font-normal overflow-auto" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label.toLowerCase()}
                onSelect={() => handleSelect(option.value)}
                className="font-normal"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col font-normal">
                  <span className="font-normal">{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-muted-foreground font-normal">{option.description}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
