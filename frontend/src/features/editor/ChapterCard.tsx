import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MarkdownPreview } from '@/components/common/MarkdownPreview'
import { ChevronDown, ChevronRight, Loader2, Play } from 'lucide-react'
import { useState } from 'react'

interface ChapterCardProps {
  heading: string
  summary?: string
  content: string
  isExpanded: boolean
  isGenerating: boolean
  onToggle: () => void
  onGenerate: (instruction?: string) => void
  onChange: (newContent: string) => void
}

export const ChapterCard = ({
  heading,
  summary,
  content,
  isExpanded,
  isGenerating,
  onToggle,
  onGenerate,
  onChange,
}: ChapterCardProps) => {
  const [instruction, setInstruction] = useState('')

  const handleGenerate = () => {
    onGenerate(instruction.trim() || undefined)
    setInstruction('')
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader
        className="flex cursor-pointer flex-row items-center justify-between space-y-0 pb-3 pt-4"
        onClick={onToggle}
      >
        <div className="flex flex-1 items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">{heading}</h3>
            {summary && !isExpanded && (
              <p className="mt-1 text-xs text-gray-500">{summary}</p>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {summary && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <div className="text-xs font-medium text-gray-500">章节说明</div>
              <p className="mt-1">{summary}</p>
            </div>
          )}

          {/* 快捷生成输入框 */}
          <div className="flex gap-2">
            <Input
              placeholder="生成指令（可选，如：重点介绍XX，字数800字）"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={isGenerating}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isGenerating) {
                  handleGenerate()
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={(e) => {
                e.stopPropagation()
                handleGenerate()
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  生成中
                </>
              ) : (
                <>
                  <Play className="mr-1 h-4 w-4" />
                  生成
                </>
              )}
            </Button>
          </div>

          {/* 正文内容编辑区与 Markdown 预览 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={content}
                onChange={(e) => onChange(e.target.value)}
                disabled={isGenerating}
                className="min-h-[300px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-50"
                placeholder="点击上方「生成」按钮让 AI 为你创作内容，或直接在此编辑..."
              />
              {isGenerating && (
                <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  AI 创作中...
                </div>
              )}
            </div>

            <div
              className="min-h-[300px] rounded-lg border border-gray-200 bg-white p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-medium text-gray-500">Markdown 预览</div>
              <div className="mt-2 overflow-y-auto">
                <MarkdownPreview content={content} emptyFallback="暂无内容，生成后将在此实时预览。" />
              </div>
            </div>
          </div>

          {/* 字数统计 */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>当前字数：{content.length} 字</span>
            {isGenerating && <span>正在生成内容...</span>}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
