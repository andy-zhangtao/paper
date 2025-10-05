import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ChapterCard } from './ChapterCard'
import { useChapterGenerate } from './useChapterGenerate'

interface Chapter {
  heading: string
  summary?: string
  content: string
}

interface PaperData {
  topic: string
  outline: Array<{ heading: string; summary?: string }>
  chapters: Chapter[]
  createdAt: string
}

export const PaperEditor = () => {
  const [paperData, setPaperData] = useState<PaperData | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({})
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null)
  const { generateChapter } = useChapterGenerate()

  // 从 localStorage 加载数据
  useEffect(() => {
    const stored = localStorage.getItem('paper-editor-data')
    if (stored) {
      try {
        const data = JSON.parse(stored) as PaperData
        setPaperData(data)
        // 默认展开第一章
        setExpandedChapters({ 0: true })
      } catch (error) {
        console.error('加载论文数据失败:', error)
      }
    }
  }, [])

  // 保存数据到 localStorage
  const saveToLocalStorage = (data: PaperData) => {
    localStorage.setItem('paper-editor-data', JSON.stringify(data))
  }

  // 切换章节展开/折叠
  const handleToggleChapter = (index: number) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  // 生成章节内容
  const handleGenerateChapter = async (index: number, instruction?: string) => {
    if (!paperData || generatingChapter !== null) return

    setGeneratingChapter(index)
    setExpandedChapters((prev) => ({ ...prev, [index]: true })) // 自动展开

    try {
      const previousChapters = paperData.chapters
        .slice(0, index)
        .filter((ch) => ch.content.trim().length > 0)

      let generatedContent = ''

      await generateChapter(
        {
          topic: paperData.topic,
          outline: paperData.outline,
          currentChapterIndex: index,
          previousChapters,
        },
        instruction,
        (chunk) => {
          generatedContent += chunk
          // 实时更新内容
          setPaperData((prev) => {
            if (!prev) return prev
            const updated = { ...prev }
            updated.chapters[index] = {
              ...updated.chapters[index],
              content: generatedContent,
            }
            return updated
          })
        },
      )

      // 生成完成后保存
      setPaperData((prev) => {
        if (!prev) return prev
        const updated = { ...prev }
        saveToLocalStorage(updated)
        return updated
      })
    } catch (error) {
      console.error('生成章节失败:', error)
      alert(error instanceof Error ? error.message : '生成失败，请稍后重试')
    } finally {
      setGeneratingChapter(null)
    }
  }

  // 更新章节内容
  const handleUpdateChapter = (index: number, newContent: string) => {
    setPaperData((prev) => {
      if (!prev) return prev
      const updated = { ...prev }
      updated.chapters[index] = {
        ...updated.chapters[index],
        content: newContent,
      }
      saveToLocalStorage(updated)
      return updated
    })
  }

  // 导出为 Markdown
  const handleExport = () => {
    if (!paperData) return

    let markdown = `# ${paperData.topic}\n\n`
    for (const chapter of paperData.chapters) {
      markdown += `## ${chapter.heading}\n\n`
      if (chapter.content) {
        markdown += `${chapter.content}\n\n`
      } else {
        markdown += `_[待生成内容]_\n\n`
      }
    }

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${paperData.topic}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 保存提示
  const handleSave = () => {
    if (paperData) {
      saveToLocalStorage(paperData)
      alert('保存成功！')
    }
  }

  if (!paperData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">未找到论文数据，请先完成大纲生成。</p>
            <Button className="mt-4" onClick={() => window.history.back()}>
              返回上一步
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalWords = paperData.chapters.reduce((sum, ch) => sum + ch.content.length, 0)
  const completedChapters = paperData.chapters.filter((ch) => ch.content.trim().length > 0).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部标题栏 */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{paperData.topic}</h1>
              <p className="mt-1 text-sm text-gray-500">
                已完成 {completedChapters}/{paperData.chapters.length} 章 · 共 {totalWords} 字
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="mr-1 h-4 w-4" />
                保存
              </Button>
              <Button size="sm" onClick={handleExport}>
                <Download className="mr-1 h-4 w-4" />
                导出 Markdown
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 章节列表 */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="space-y-4">
          {paperData.chapters.map((chapter, index) => (
            <ChapterCard
              key={index}
              heading={chapter.heading}
              summary={chapter.summary}
              content={chapter.content}
              isExpanded={expandedChapters[index] ?? false}
              isGenerating={generatingChapter === index}
              onToggle={() => handleToggleChapter(index)}
              onGenerate={(instruction) => handleGenerateChapter(index, instruction)}
              onChange={(newContent) => handleUpdateChapter(index, newContent)}
            />
          ))}
        </div>

        {/* 底部提示 */}
        <Card className="mt-8 border-purple-100 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-sm text-purple-700">使用提示</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-purple-600">
            <ul className="list-inside list-disc space-y-1">
              <li>点击章节标题可展开/折叠内容</li>
              <li>在输入框填写生成要求（可选），点击「生成」按钮即可让 AI 创作内容</li>
              <li>生成的内容可直接编辑修改，所有更改会自动保存到本地</li>
              <li>完成后点击「导出 Markdown」下载论文文件</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
