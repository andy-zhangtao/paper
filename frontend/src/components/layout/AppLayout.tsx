import type { ReactNode } from 'react'
import { useState } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

type View = 'list' | 'new-paper' | 'tutorial'

interface AppLayoutProps {
  children: ReactNode
  onLoginClick?: () => void
  onNavigate?: (view: View) => void
}

export const AppLayout = ({ children, onLoginClick, onNavigate }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <Navbar onMenuClick={toggleSidebar} />

      {/* 主布局:侧边栏 + 内容区 */}
      <div className="pt-16 flex relative">
        {/* 侧边栏 */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onLoginClick={onLoginClick}
          onNavigate={onNavigate}
          onToggle={toggleSidebar}
        />

        {/* 主内容区 */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] transition-all duration-300">
          {children}
        </main>
      </div>

      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden pt-16 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
