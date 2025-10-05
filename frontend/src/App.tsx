import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PaperList } from '@/features/papers/PaperList'
import { NewPaperPage } from '@/pages/NewPaper'
import { LoginPage } from '@/pages/LoginPage'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { mockPapers } from '@/lib/mock'

type View = 'list' | 'new-paper'

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('list')
  const [showLogin, setShowLogin] = useState(false)
  const { isAuthenticated } = useAuth()

  // 转换 mock 数据格式（archived 字段）
  const papers = mockPapers.map(p => ({
    ...p,
    archived: p.isArchived
  }))

  const handleCreatePaper = () => {
    if (!isAuthenticated) {
      setShowLogin(true)
      return
    }
    setCurrentView('new-paper')
  }

  const handleEditPaper = (id: string) => {
    if (!isAuthenticated) {
      setShowLogin(true)
      return
    }
    alert(`编辑论文 ${id}`)
  }

  const handleDeletePaper = (id: string) => {
    if (!isAuthenticated) {
      setShowLogin(true)
      return
    }
    alert(`删除论文 ${id}`)
  }

  const handleBackToHome = () => {
    setCurrentView('list')
  }

  if (currentView === 'new-paper') {
    return <NewPaperPage onBack={handleBackToHome} />
  }

  return (
    <>
      <AppLayout onLoginClick={() => setShowLogin(true)}>
        <PaperList
          papers={papers}
          onCreatePaper={handleCreatePaper}
          onEditPaper={handleEditPaper}
          onDeletePaper={handleDeletePaper}
        />
      </AppLayout>
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
