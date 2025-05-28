"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Portal } from "./portal"

interface DropdownPortalProps {
  children: React.ReactNode
  targetRef: { current: HTMLElement | null }
  isOpen: boolean
  onClose?: () => void
}

export function DropdownPortal({
  children,
  targetRef,
  isOpen,
  onClose
}: DropdownPortalProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cập nhật vị trí của dropdown dựa trên vị trí của input
  const updatePosition = useCallback(() => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [targetRef])

  // Cập nhật vị trí khi component được mount và khi isOpen thay đổi
  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)

      return () => {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }
  }, [isOpen, updatePosition])

  // Xử lý click bên ngoài dropdown để đóng dropdown
  useEffect(() => {
    if (isOpen && onClose) {
      const handleClickOutside = (event: MouseEvent) => {
        // Kiểm tra xem click có phải là bên ngoài dropdown và input không
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          targetRef.current &&
          !targetRef.current.contains(event.target as Node)
        ) {
          onClose()
        }
      }

      // Sử dụng mousedown thay vì click để bắt sự kiện sớm hơn
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose, targetRef])

  if (!isOpen) return null

  return (
    <Portal>
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-white border rounded-md shadow-lg"
        style={{
          position: 'fixed', // Sử dụng fixed thay vì absolute để tránh bị ảnh hưởng bởi các phần tử cha
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          maxHeight: '200px',
          overflow: 'auto',
          zIndex: 9999,
          pointerEvents: 'auto', // Đảm bảo sự kiện click hoạt động
        }}
        onMouseDown={(e) => {
          // Chỉ ngăn sự kiện lan truyền, không ngăn sự kiện mặc định
          // để cho phép cuộn chuột hoạt động
          e.stopPropagation();

          // Chỉ ngăn sự kiện mặc định nếu không phải là sự kiện wheel
          if (e.button !== 1) { // button 1 là middle mouse button (bánh xe chuột)
            e.preventDefault();
          }
        }}
        onWheel={(e) => {
          // Cho phép sự kiện wheel (cuộn chuột) hoạt động
          // nhưng ngăn nó lan truyền lên các phần tử cha
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </Portal>
  )
}
