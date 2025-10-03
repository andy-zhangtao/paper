import { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-purple-100 text-purple-800 border border-purple-200',
        secondary: 'bg-gray-100 text-gray-800 border border-gray-200',
        destructive: 'bg-red-100 text-red-800 border border-red-200',
        success: 'bg-green-100 text-green-800 border border-green-200',
        outline: 'border border-gray-300 text-gray-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode
  className?: string
}

export const Badge = ({ children, variant, className }: BadgeProps) => {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {children}
    </span>
  )
}
