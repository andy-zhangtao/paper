import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

export const Toast = ({ message, type = 'info', duration = 3000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // 等待淡出动画完成
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  }

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  }

  return (
    <div
      className={`
        fixed top-20 right-6 z-[100]
        flex items-center gap-3
        px-4 py-3 rounded-lg border shadow-lg
        transition-all duration-300
        ${colors[type]}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      {icons[type]}
      <span className="font-medium">{message}</span>
      <button
        onClick={handleClose}
        className="ml-2 hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Toast Container Hook
export const useToast = () => {
  const [toast, setToast] = useState<{
    message: string
    type: ToastType
  } | null>(null)

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type })
  }

  const ToastContainer = () => {
    if (!toast) return null

    return (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )
  }

  return {
    showToast,
    ToastContainer
  }
}
