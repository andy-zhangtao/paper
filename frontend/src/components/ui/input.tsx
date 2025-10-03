import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
