import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* 内容 */}
      <div className="relative z-50">{children}</div>
    </div>
  )
}

interface DialogContentProps {
  children: ReactNode
  className?: string
}

export const DialogContent = ({ children, className }: DialogContentProps) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>
  )
}

interface DialogHeaderProps {
  children: ReactNode
  onClose?: () => void
}

export const DialogHeader = ({ children, onClose }: DialogHeaderProps) => {
  return (
    <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-200">
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

interface DialogTitleProps {
  children: ReactNode
}

export const DialogTitle = ({ children }: DialogTitleProps) => {
  return <h2 className="text-xl font-semibold text-gray-900">{children}</h2>
}

interface DialogDescriptionProps {
  children: ReactNode
}

export const DialogDescription = ({ children }: DialogDescriptionProps) => {
  return <p className="text-sm text-gray-600 mt-1">{children}</p>
}

interface DialogFooterProps {
  children: ReactNode
  className?: string
}

export const DialogFooter = ({ children, className }: DialogFooterProps) => {
  return (
    <div className={cn('flex gap-3 p-6 pt-4 border-t border-gray-200', className)}>
      {children}
    </div>
  )
}
