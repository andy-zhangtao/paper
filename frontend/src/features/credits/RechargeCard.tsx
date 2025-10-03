import { Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RechargeCardProps {
  amount: number
  price: number
  bonus?: number
  isPopular?: boolean
  selected?: boolean
  onClick: () => void
}

export const RechargeCard = ({
  amount,
  price,
  bonus = 0,
  isPopular = false,
  selected = false,
  onClick,
}: RechargeCardProps) => {
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all hover:scale-105',
        selected && 'ring-2 ring-purple-500 shadow-lg',
        isPopular && !selected && 'ring-2 ring-purple-300'
      )}
      onClick={onClick}
    >
      {/* 推荐标签 */}
      {isPopular && (
        <Badge
          variant="default"
          className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0"
        >
          🔥 热门
        </Badge>
      )}

      {/* 选中标记 */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <CardContent className="p-6 text-center">
        {/* 积分数量 */}
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {amount.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 mb-3">积分</div>

        {/* 赠送标签 */}
        {bonus > 0 && (
          <Badge variant="success" className="mb-3">
            额外赠送 +{bonus}
          </Badge>
        )}

        {/* 价格 */}
        <div className="text-2xl font-bold text-purple-600 mt-2">
          ¥{price}
        </div>

        {/* 单价说明 */}
        <div className="text-xs text-gray-400 mt-1">
          ≈ ¥{(price / (amount + bonus)).toFixed(3)}/积分
        </div>
      </CardContent>
    </Card>
  )
}
