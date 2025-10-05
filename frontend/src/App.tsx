import { AppLayout } from '@/components/layout/AppLayout'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { CreditProvider, useCredit } from '@/contexts/CreditContext'
import { PaperList } from '@/features/papers/PaperList'
import { mockPapers } from '@/lib/mock'
import { LoginPage } from '@/pages/LoginPage'
import { NewPaperPage } from '@/pages/NewPaper'
import { TutorialPage } from '@/pages/TutorialPage'
import { useEffect, useState } from 'react'

type View = 'list' | 'new-paper' | 'tutorial'

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('list')
  const [showLogin, setShowLogin] = useState(false)
  const { isAuthenticated } = useAuth()
  const { refreshBalance } = useCredit()

  // 每次进入首页时刷新积分
  useEffect(() => {
    if (currentView === 'list' && isAuthenticated) {
      refreshBalance()
    }
  }, [currentView, isAuthenticated, refreshBalance])

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

  if (currentView === 'tutorial') {
    return <TutorialPage onBack={handleBackToHome} />
  }

  if (currentView === 'new-paper') {
    return <NewPaperPage onBack={handleBackToHome} />
  }

  return (
    <>
      <AppLayout 
        onLoginClick={() => setShowLogin(true)}
        onNavigate={setCurrentView}
      >
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
      <CreditProvider>
        <AppContent />
      </CreditProvider>
    </AuthProvider>
  )
}

export default App
