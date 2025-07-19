"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FaUpload, FaFilePdf, FaFileCode, FaTimes, FaSpinner } from "react-icons/fa"
import { toast } from "sonner"
import { useDropzone } from "react-dropzone"

interface AttachmentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  recordId: number
  recordType: 'import' | 'export'
  fileType: 'pdf' | 'xml'
  currentFileName?: string
}

export function AttachmentUploadModal({
  isOpen,
  onClose,
  onSuccess,
  recordId,
  recordType,
  fileType,
  currentFileName
}: AttachmentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const acceptedFileTypes = fileType === 'pdf'
    ? { 'application/pdf': ['.pdf'] }
    : { 'application/xml': ['.xml'], 'text/xml': ['.xml'] }
  const maxSize = 10 * 1024 * 1024 // 10MB

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptedFileTypes as any,
    maxSize,
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0])
      }
    },
    onDropRejected: (rejectedFiles) => {
      const error = rejectedFiles[0]?.errors[0]
      if (error?.code === 'file-too-large') {
        toast.error('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB')
      } else if (error?.code === 'file-invalid-type') {
        toast.error(`Chỉ chấp nhận file ${fileType.toUpperCase()}`)
      } else {
        toast.error('File không hợp lệ')
      }
    }
  })

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file')
      return
    }

    setIsUploading(true)
    try {
      let result;

      if (recordType === 'import') {
        const { uploadImportAttachment } = await import('@/lib/api/imports')
        result = await uploadImportAttachment(recordId, selectedFile)
      } else {
        const { uploadExportAttachment } = await import('@/lib/api/exports')
        result = await uploadExportAttachment(recordId, selectedFile)
      }

      if (result.success) {
        toast.success(result.message)
        onSuccess()
        handleClose()
      } else {
        toast.error(result.message || 'Upload thất bại')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.response?.data?.message || error.message || 'Lỗi upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    onClose()
  }

  const getFileIcon = () => {
    return fileType === 'pdf' ? <FaFilePdf className="h-8 w-8 text-red-500" /> : <FaFileCode className="h-8 w-8 text-blue-500" />
  }

  const getTitle = () => {
    const action = currentFileName ? 'Thay thế' : 'Tải lên'
    const type = fileType === 'pdf' ? 'PDF' : 'XML'
    return `${action} file ${type}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current file info */}
          {currentFileName && (
            <Card className="bg-gray-50">
              <CardContent className="p-3">
                <div className="text-sm text-gray-600">
                  <strong>File hiện tại:</strong> {currentFileName}
                </div>
              </CardContent>
            </Card>
          )}

          {/* File upload area */}
          <Card>
            <CardContent className="p-4">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  ${selectedFile ? 'border-green-400 bg-green-50' : ''}
                `}
              >
                <input {...getInputProps()} />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    {getFileIcon()}
                    <div>
                      <p className="font-medium text-green-700">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FaUpload className="h-8 w-8 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-gray-600">
                        {isDragActive 
                          ? `Thả file ${fileType.toUpperCase()} vào đây` 
                          : `Kéo thả hoặc click để chọn file ${fileType.toUpperCase()}`
                        }
                      </p>
                      <p className="text-sm text-gray-400">Tối đa 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              <FaTimes className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <FaUpload className="h-4 w-4 mr-2" />
                  Tải lên
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
