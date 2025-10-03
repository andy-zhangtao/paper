import { MoreVertical, FileText, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Paper } from '@/types/paper'

interface PaperCardProps {
  paper: Paper
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export const PaperCard = ({ paper, onEdit, onDelete }: PaperCardProps) => {
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return new Date(date).toLocaleDateString('zh-CN')
  }

  const getWordCount = () => {
    const content = paper.content || ''
    return content.length
  }

  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onEdit?.(paper.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="line-clamp-2 text-lg group-hover:text-purple-600 transition-colors">
              {paper.title || '无标题论文'}
            </CardTitle>
          </div>

          {/* 更多操作 */}
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              // TODO: 实现下拉菜单
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* 内容预览 */}
        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
          {paper.content || '暂无内容'}
        </p>

        {/* 元信息 */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>{getWordCount()} 字</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(paper.updatedAt)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-between border-t pt-4">
        <Badge variant={paper.archived ? 'secondary' : 'default'}>
          {paper.archived ? '已归档' : '进行中'}
        </Badge>
      </CardFooter>
    </Card>
  )
}
