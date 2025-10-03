import { AppLayout } from '@/components/layout/AppLayout'
import { PaperList } from '@/features/papers/PaperList'
import { mockPapers } from '@/lib/mock'

function App() {
  // 转换 mock 数据格式（archived 字段）
  const papers = mockPapers.map(p => ({
    ...p,
    archived: p.isArchived
  }))

  const handleCreatePaper = () => {
    alert('创建论文功能待实现')
  }

  const handleEditPaper = (id: string) => {
    alert(`编辑论文 ${id}`)
  }

  const handleDeletePaper = (id: string) => {
    alert(`删除论文 ${id}`)
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
