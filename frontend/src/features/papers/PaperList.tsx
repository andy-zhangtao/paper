import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaperCard } from './PaperCard'
import type { Paper } from '@/types/paper'

interface PaperListProps {
  papers: Paper[]
  onCreatePaper?: () => void
  onEditPaper?: (id: string) => void
  onDeletePaper?: (id: string) => void
}

export const PaperList = ({
  papers,
  onCreatePaper,
  onEditPaper,
  onDeletePaper,
}: PaperListProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'archived'>('all')

  const filteredPapers = papers.filter((paper) => {
    // 筛选条件：全部/已归档
    if (filter === 'archived' && !paper.archived) return false
    if (filter === 'all' && paper.archived) return false

    // 搜索条件
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        paper.title.toLowerCase().includes(query) ||
        paper.content.toLowerCase().includes(query)
      )
    }

    return true
  })

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部：搜索 + 新建按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索论文..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button onClick={onCreatePaper} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            新建论文
          </Button>
        </div>

        {/* 筛选标签 */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            全部 ({papers.filter((p) => !p.archived).length})
          </Button>
          <Button
            variant={filter === 'archived' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('archived')}
          >
            已归档 ({papers.filter((p) => p.archived).length})
          </Button>
        </div>

        {/* 论文卡片网格 */}
        {filteredPapers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPapers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                onEdit={onEditPaper}
                onDelete={onDeletePaper}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">
              {searchQuery ? '未找到匹配的论文' : '还没有论文'}
            </p>
            {!searchQuery && (
              <Button onClick={onCreatePaper} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                创建第一篇论文
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
