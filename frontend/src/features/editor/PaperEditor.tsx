import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { paperCreationApi } from '@/lib/api'
import { Download, Save, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const [contentPromptId, setContentPromptId] = useState<string | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const { generateChapter } = useChapterGenerate()

  // 检测调试模式
  const isDebugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true'

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

  // 获取 content 阶段的系统提示词
  useEffect(() => {
    const fetchContentPrompt = async () => {
      setIsLoadingPrompt(true)
      try {
        const response = await paperCreationApi.getPrompts('content')
        const contentStage = response.stages.find((stage) => stage.code === 'content')
        const systemPrompts = contentStage?.prompts.filter((p) => p.scope === 'system') ?? []

        if (systemPrompts.length > 0) {
          setContentPromptId(systemPrompts[0].id)
        } else {
          console.error('未找到 content 阶段的系统提示词')
        }
      } catch (error) {
        console.error('加载提示词失败:', error)
      } finally {
        setIsLoadingPrompt(false)
      }
    }

    fetchContentPrompt()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
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

    // 检查是否有 promptId
    if (!contentPromptId) {
      alert('提示词加载中，请稍候...')
      return
    }

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
          promptId: contentPromptId,
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

  const getSafeFileName = (topic: string) => topic.replace(/[\\/:*?"<>|]/g, '_')

  // 导出为 Markdown
  const handleExportMarkdown = () => {
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
    link.download = `${getSafeFileName(paperData.topic)}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 导出为 DOCX
  const handleExportDocx = async () => {
    if (!paperData) return

    const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')
    type DocxParagraph = InstanceType<typeof Paragraph>

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: paperData.topic,
              heading: HeadingLevel.TITLE,
            }),
            ...paperData.chapters.flatMap((chapter) => {
              const paragraphs: DocxParagraph[] = []

              paragraphs.push(
                new Paragraph({
                  text: chapter.heading,
                  heading: HeadingLevel.HEADING_1,
                }),
              )

              if (chapter.summary) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: chapter.summary,
                        italics: true,
                        color: '6b7280',
                      }),
                    ],
                  }),
                )
              }

              const content = chapter.content.trim().length > 0 ? chapter.content : '[待生成内容]'
              const lines = content.split(/\r?\n/)

              if (lines.length === 0) {
                paragraphs.push(new Paragraph(' '))
              } else {
                for (const line of lines) {
                  paragraphs.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: line || ' ',
                        }),
                      ],
                    }),
                  )
                }
              }

              return [...paragraphs, new Paragraph(' ')]
            }),
          ],
        },
      ],
    })

    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `${getSafeFileName(paperData.topic)}.docx`
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

  if (!paperData || isLoadingPrompt) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            {!paperData ? (
              <>
                <p className="text-gray-600">未找到论文数据，请先完成大纲生成。</p>
                <Button className="mt-4" onClick={() => window.history.back()}>
                  返回上一步
                </Button>
              </>
            ) : (
              <p className="text-gray-600">加载提示词配置中...</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalWords = paperData.chapters.reduce((sum, ch) => sum + ch.content.length, 0)
  const completedChapters = paperData.chapters.filter((ch) => ch.content.trim().length > 0).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 调试模式提示 */}
      {isDebugMode && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-6 py-2 text-center text-sm text-yellow-800">
          🐛 调试模式已启用 - 使用模拟数据 | 移除 URL 参数 <code className="px-1 bg-yellow-200">?debug=true</code> 退出
        </div>
      )}

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
              <div className="relative" ref={exportMenuRef}>
                <Button
                  size="sm"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={isExportMenuOpen}
                >
                  <Download className="mr-1 h-4 w-4" />
                  导出
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
                {isExportMenuOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        setIsExportMenuOpen(false)
                        handleExportMarkdown()
                      }}
                    >
                      Markdown (.md)
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        setIsExportMenuOpen(false)
                        void handleExportDocx()
                      }}
                    >
                      Word (.docx)
                    </button>
                  </div>
                )}
              </div>
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
              <li>完成后点击右上角「导出」选择所需格式下载论文</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
