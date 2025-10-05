import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { BookOpen, ChevronLeft, ChevronRight, Home, LogIn, LogOut } from 'lucide-react'

type View = 'list' | 'new-paper' | 'tutorial'

interface SidebarProps {
  isOpen?: boolean
  onLoginClick?: () => void
  onNavigate?: (view: View) => void
  onToggle?: () => void
}

const navItems: Array<{ icon: typeof Home; label: string; view: View }> = [
  { icon: Home, label: '首页', view: 'list' },
  { icon: BookOpen, label: '使用教程', view: 'tutorial' },
]

export const Sidebar = ({ isOpen = true, onLoginClick, onNavigate, onToggle }: SidebarProps) => {
  const { isAuthenticated, logout } = useAuth()

  return (
    <>
      <aside
        className={`
          fixed lg:sticky top-16 left-0 bottom-0
          bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out z-40
          ${isOpen ? 'w-60 translate-x-0' : 'w-0 -translate-x-full lg:w-16 lg:translate-x-0'}
        `}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* 折叠按钮 - 桌面端 */}
          <div className="hidden lg:flex items-center justify-end p-2 border-b border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-600"
              title={isOpen ? '折叠侧边栏' : '展开侧边栏'}
            >
              {isOpen ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <Button
              key={item.view}
              variant="ghost"
              className={`w-full gap-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 ${
                isOpen ? 'justify-start' : 'justify-center px-2'
              }`}
              title={!isOpen ? item.label : undefined}
              onClick={() => onNavigate?.(item.view)}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>

        {/* 底部：登录/退出按钮 */}
        <div className="p-4 border-t border-gray-100">
        {isAuthenticated ? (
          <Button
            variant="ghost"
            className={`w-full gap-3 text-red-600 hover:bg-red-50 ${
              isOpen ? 'justify-start' : 'justify-center px-2'
            }`}
            onClick={logout}
            title={!isOpen ? '退出登录' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span>退出登录</span>}
          </Button>
        ) : (
          <Button
            variant="ghost"
            className={`w-full gap-3 text-purple-600 hover:bg-purple-50 ${
              isOpen ? 'justify-start' : 'justify-center px-2'
            }`}
            onClick={onLoginClick}
            title={!isOpen ? '登录' : undefined}
          >
            <LogIn className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span>登录</span>}
          </Button>
        )}
        </div>
      </div>
      </aside>
    </>
  )
}
