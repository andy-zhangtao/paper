import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { RechargeCard } from './RechargeCard'

interface RechargePackage {
  id: string
  amount: number
  price: number
  bonus: number
  isPopular?: boolean
}

const packages: RechargePackage[] = [
  { id: '1', amount: 1000, price: 10, bonus: 0 },
  { id: '2', amount: 5000, price: 45, bonus: 500, isPopular: true },
  { id: '3', amount: 10000, price: 80, bonus: 2000 },
  { id: '4', amount: 50000, price: 350, bonus: 15000 },
]

interface RechargeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const RechargeDialog = ({ open, onOpenChange, onSuccess }: RechargeDialogProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)

  const selectedPackage = packages.find((pkg) => pkg.id === selectedId)

  const handlePay = async () => {
    if (!selectedPackage) return

    setIsPaying(true)
    // 模拟支付流程
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsPaying(false)
    onOpenChange(false)
    alert(`支付成功！获得 ${selectedPackage.amount + selectedPackage.bonus} 积分`)
    
    // 调用成功回调刷新积分
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader onClose={() => onOpenChange(false)}>
          <DialogTitle>购买积分</DialogTitle>
          <DialogDescription>
            选择套餐，支付后积分立即到账
          </DialogDescription>
        </DialogHeader>

        {/* 套餐卡片 */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {packages.map((pkg) => (
              <RechargeCard
                key={pkg.id}
                amount={pkg.amount}
                price={pkg.price}
                bonus={pkg.bonus}
                isPopular={pkg.isPopular}
                selected={selectedId === pkg.id}
                onClick={() => setSelectedId(pkg.id)}
              />
            ))}
          </div>

          {/* 支付按钮 */}
          {selectedPackage && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-600">
                    {selectedPackage.amount} 积分
                    {selectedPackage.bonus > 0 && (
                      <span className="text-green-600 ml-1">
                        + {selectedPackage.bonus} 赠送
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    ¥{selectedPackage.price}
                  </div>
                </div>
                <Button
                  size="lg"
                  variant="gradient"
                  onClick={handlePay}
                  disabled={isPaying}
                  className="min-w-[120px]"
                >
                  {isPaying ? '处理中...' : '立即支付'}
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                支付后积分自动到账，如有问题请联系客服
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
