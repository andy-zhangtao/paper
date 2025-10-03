import { useState } from 'react'
import { Menu, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreditBalance } from '@/features/credits/CreditBalance'
import { RechargeDialog } from '@/features/credits/RechargeDialog'

interface NavbarProps {
  onMenuClick?: () => void
}

export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const [rechargeOpen, setRechargeOpen] = useState(false)
  // TODO: 从状态管理中获取真实积分
  const balance = 1000

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          {/* 左侧：菜单按钮 + Logo */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                P
              </div>
              <span className="font-semibold text-lg hidden sm:block">Paper AI</span>
            </div>
          </div>

          {/* 右侧：积分余额 + 用户菜单 */}
          <div className="flex items-center gap-4">
            <CreditBalance
              balance={balance}
              onRecharge={() => setRechargeOpen(true)}
            />

            {/* 用户菜单 */}
            <Button variant="ghost" size="sm" className="rounded-full">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* 充值弹窗 */}
      <RechargeDialog
        open={rechargeOpen}
        onOpenChange={setRechargeOpen}
      />
    </>
  )
}
