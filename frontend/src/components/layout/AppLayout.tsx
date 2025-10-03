import { useState, ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* 主布局：侧边栏 + 内容区 */}
      <div className="pt-16 flex">
        {/* 侧边栏 */}
        <Sidebar isOpen={sidebarOpen} />

        {/* 主内容区 */}
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
