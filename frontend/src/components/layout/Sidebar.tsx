import { Home, FileText, Coins, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  isOpen?: boolean
}

const navItems = [
  { icon: Home, label: '首页', path: '/' },
  { icon: FileText, label: '我的论文', path: '/papers' },
  { icon: Coins, label: '积分管理', path: '/credits' },
  { icon: Settings, label: '设置', path: '/settings' },
]

export const Sidebar = ({ isOpen = true }: SidebarProps) => {
  return (
    <aside
      className={`
        fixed lg:sticky top-16 left-0 bottom-0
        w-60 bg-white border-r border-gray-200
        transition-transform duration-300 z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="h-full flex flex-col p-4">
        {/* 导航菜单 */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Button>
          ))}
        </nav>

        {/* 底部：退出按钮 */}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          <span>退出登录</span>
        </Button>
      </div>
    </aside>
  )
}
