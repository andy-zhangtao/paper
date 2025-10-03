import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PaperList } from '@/features/papers/PaperList'
import { NewPaperPage } from '@/pages/NewPaper'
import { mockPapers } from '@/lib/mock'

type View = 'list' | 'new-paper'

function App() {
  const [currentView, setCurrentView] = useState<View>('list')

  // 转换 mock 数据格式（archived 字段）
  const papers = mockPapers.map(p => ({
    ...p,
    archived: p.isArchived
  }))

  const handleCreatePaper = () => {
    setCurrentView('new-paper')
  }

  const handleEditPaper = (id: string) => {
    alert(`编辑论文 ${id}`)
  }

  const handleDeletePaper = (id: string) => {
    alert(`删除论文 ${id}`)
  }

  if (currentView === 'new-paper') {
    return <NewPaperPage />
  }

  return (
    <AppLayout>
      <PaperList
        papers={papers}
        onCreatePaper={handleCreatePaper}
        onEditPaper={handleEditPaper}
        onDeletePaper={handleDeletePaper}
      />
    </AppLayout>
  )
}

export default App
