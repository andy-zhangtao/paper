import { Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreditBalanceProps {
  balance: number
  onRecharge: () => void
}

export const CreditBalance = ({ balance, onRecharge }: CreditBalanceProps) => {
  return (
    <div className="flex items-center gap-3">
      {/* 积分显示 */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-lg">
        <Coins className="w-4 h-4" />
        <div className="flex items-baseline gap-1">
          <span className="text-xs opacity-80">积分</span>
          <span className="text-sm font-bold">{balance.toLocaleString()}</span>
        </div>
      </div>

      {/* 充值按钮 */}
      <Button
        size="sm"
        variant="outline"
        onClick={onRecharge}
        className="hidden sm:flex text-purple-600 border-purple-300 hover:bg-purple-50"
      >
        充值
      </Button>
    </div>
  )
}
