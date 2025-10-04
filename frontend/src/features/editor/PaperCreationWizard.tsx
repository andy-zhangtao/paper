import { useEffect, useState } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { paperCreationApi } from '@/lib/api'
import type {
  PaperCreationStageCode,
  PromptTemplateSummary,
  PaperCreationChatMessage,
} from '@/types/prompt'

type CreationStage = PaperCreationStageCode
type Step = CreationStage | 'preview'
type Message = PaperCreationChatMessage

const CREATION_STAGES: CreationStage[] = ['idea', 'outline', 'content']

const STAGE_FALLBACK_INFO: Record<CreationStage, { title: string; description: string | null }> = {
  idea: {
    title: '选择创意',
    description: '帮助明确研究主题与论文创意',
  },
  outline: {
    title: '生成大纲',
    description: '梳理章节结构与核心逻辑',
  },
  content: {
    title: '填充内容',
    description: '扩展正文细节，完善段落内容',
  },
}

interface StagePromptInfo {
  displayName: string
  description: string | null
  prompts: PromptTemplateSummary[]
}

export const PaperCreationWizard = () => {
  const [step, setStep] = useState<Step>('idea')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '你好！我是你的AI写作助手。让我们一起创作一篇优质论文吧！\n\n**第一步：选择创意**\n\n请告诉我：\n1. 你想写什么主题的论文？\n2. 你的研究方向是什么？\n3. 有什么特定的角度或想法吗？',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedIdea, setGeneratedIdea] = useState('')
  const [generatedOutline, setGeneratedOutline] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [promptData, setPromptData] = useState<Record<CreationStage, StagePromptInfo>>(() => {
    const initial = {} as Record<CreationStage, StagePromptInfo>
    CREATION_STAGES.forEach((stage) => {
      initial[stage] = {
        displayName: STAGE_FALLBACK_INFO[stage].title,
        description: STAGE_FALLBACK_INFO[stage].description,
        prompts: [],
      }
    })
    return initial
  })
  const [selectedPromptIds, setSelectedPromptIds] = useState<Record<CreationStage, string | null>>({
    idea: null,
    outline: null,
    content: null,
  })
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [promptError, setPromptError] = useState<string | null>(null)

  const currentStage = step === 'preview' ? null : step
  const currentStageInfo = currentStage ? promptData[currentStage] : undefined
  const currentPromptId = currentStage ? selectedPromptIds[currentStage] : null
  const canSend = Boolean(currentStage && currentPromptId && input.trim())

  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoadingPrompts(true)
      setPromptError(null)
      try {
        const response = await paperCreationApi.getPrompts()
        const normalized = CREATION_STAGES.reduce((acc, code) => {
          const stageData = response.stages.find((item) => item.code === code)
          const systemPrompts = stageData?.prompts.filter((item) => item.scope === 'system') ?? []
          const userPrompts = stageData?.prompts.filter((item) => item.scope === 'user') ?? []

          const systemOption = systemPrompts.length
            ? [{ ...systemPrompts[0], title: '[系统默认提示词]' }]
            : []

          acc[code] = {
            displayName: stageData?.displayName ?? STAGE_FALLBACK_INFO[code].title,
            description: stageData?.description ?? STAGE_FALLBACK_INFO[code].description,
            prompts: [...systemOption, ...userPrompts],
          }
          return acc
        }, {} as Record<CreationStage, StagePromptInfo>)

        setPromptData(normalized)
        setSelectedPromptIds((prev) => {
          const next = { ...prev }
          CREATION_STAGES.forEach((code) => {
            const availablePrompts = normalized[code].prompts
            if (!availablePrompts.length) {
              next[code] = null
              return
            }

            if (!next[code] || !availablePrompts.some((prompt) => prompt.id === next[code])) {
              next[code] = availablePrompts[0].id
            }
          })
          return next
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '加载提示词失败'
        setPromptError(message)
      } finally {
        setIsLoadingPrompts(false)
      }
    }

    fetchPrompts()
  }, [])

  const handleSend = async () => {
    if (!canSend || !currentStage || !currentPromptId) return

    const stageForRequest = currentStage
    const promptForRequest = currentPromptId
    const trimmedInput = input.trim()
    const userMessage: Message = { role: 'user', content: trimmedInput }
    const history = messages.map((item) => ({ role: item.role, content: item.content }))

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await paperCreationApi.chat({
        stage: stageForRequest,
        promptId: promptForRequest,
        message: trimmedInput,
        history,
      })

      const reply = response.reply
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])

      if (stageForRequest === 'idea') {
        setGeneratedIdea(reply)
      } else if (stageForRequest === 'outline') {
        setGeneratedOutline(reply)
      } else if (stageForRequest === 'content') {
        setGeneratedContent(reply)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI服务暂时不可用，请稍后再试。'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `抱歉，生成失败：${errorMessage}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptSelect = (stage: CreationStage, promptId: string) => {
    setSelectedPromptIds((prev) => ({
      ...prev,
      [stage]: promptId,
    }))
  }

  const renderPromptGroup = (
    stage: CreationStage,
    label: string,
    prompts: PromptTemplateSummary[],
    scope: 'system' | 'user',
  ) => {
    const selectedId = selectedPromptIds[stage]

    if (!prompts.length) {
      return (
        <div className="space-y-2">
          <div className="text-xs text-gray-500">{label}</div>
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400">
            暂无可用提示词
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="space-y-2">
          {prompts.map((prompt) => {
            const isSelected = selectedId === prompt.id
            const tooltip = scope === 'user' && prompt.content
              ? prompt.content
              : '系统提示词内容由后端托管，无法预览'

            return (
              <label
                key={prompt.id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                  isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}
                title={tooltip}
              >
                <input
                  type="radio"
                  name={`prompt-${stage}`}
                  value={prompt.id}
                  checked={isSelected}
                  onChange={() => handlePromptSelect(stage, prompt.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{prompt.title}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {scope === 'system' ? '系统' : '自定义'}
                    </span>
                  </div>
                  {scope === 'user' && prompt.content ? (
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-500">{prompt.content}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">内容由系统托管，无法查看</p>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      </div>
    )
  }

  const stageTitle = currentStage
    ? currentStageInfo?.displayName ?? STAGE_FALLBACK_INFO[currentStage].title
    : ''
  const stageDescription = currentStage
    ? currentStageInfo?.description ?? STAGE_FALLBACK_INFO[currentStage].description ?? ''
    : ''
  const systemPrompts = currentStage
    ? currentStageInfo?.prompts.filter((item) => item.scope === 'system') ?? []
    : []
  const userPrompts = currentStage
    ? currentStageInfo?.prompts.filter((item) => item.scope === 'user') ?? []
    : []

  const handleConfirm = () => {
    if (step === 'idea') {
      setStep('outline')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '**第二步：生成大纲**\n\n现在我将为你生成详细的论文大纲。你对大纲有什么具体要求吗？（如章节数量、重点内容等）\n\n如果没有特殊要求，请直接回复「生成大纲」。',
        },
      ])
    } else if (step === 'outline') {
      setStep('content')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '**第三步：填充内容**\n\n接下来我将为每个章节生成详细内容。你希望我：\n\n1. 自动生成所有章节内容\n2. 逐章节生成，你可以针对每章提出修改意见\n\n请告诉我你的选择，或直接回复「开始生成」。',
        },
      ])
    } else if (step === 'content') {
      setStep('preview')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '**第四步：预览与导出**\n\n论文内容已生成完成！下面是完整的Markdown格式预览。你可以：\n\n- 点击「编辑」进入富文本编辑器继续修改\n- 点击「导出」保存为文档\n- 点击「重新生成」从头开始',
        },
      ])
    }
  }

  const getFinalMarkdown = () => {
    return generatedContent || generatedOutline || generatedIdea || '# 论文标题\n\n内容生成中...'
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部进度指示 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm">
            <div className={`flex items-center gap-2 ${step === 'idea' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs">1</div>
              <span>选择创意</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'outline' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs">2</div>
              <span>生成大纲</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'content' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs">3</div>
              <span>填充内容</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs">4</div>
              <span>预览完成</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden flex">
        {step !== 'preview' ? (
          /* 对话式交互界面 */
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
            {currentStage && (
              <div className="px-6 pt-6">
                <Card className="border border-purple-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      提示词选择 · {stageTitle}
                    </CardTitle>
                    {stageDescription && (
                      <p className="mt-1 text-xs text-gray-500">{stageDescription}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingPrompts ? (
                      <div className="text-sm text-gray-500">提示词加载中...</div>
                    ) : promptError ? (
                      <div className="text-sm text-red-500">提示词加载失败：{promptError}</div>
                    ) : (
                      <>
                        {renderPromptGroup(currentStage, '系统提示词', systemPrompts, 'system')}
                        {renderPromptGroup(currentStage, '自定义提示词', userPrompts, 'user')}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <Card
                    className={`max-w-2xl ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white'
                    }`}
                  >
                    <CardContent className="p-4">
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <Card className="bg-white">
                    <CardContent className="p-4 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span className="text-sm text-gray-600">AI 思考中...</span>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* 输入区 */}
            <div className="border-t bg-white p-4">
              <div className="max-w-4xl mx-auto flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (!isLoading && canSend) {
                        handleSend()
                      }
                    }
                  }}
                  placeholder={currentStage ? '输入你的想法...' : '请先完成提示词选择'}
                  disabled={isLoading || !currentStage || !currentPromptId}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={isLoading || !canSend}>
                  <Send className="w-4 h-4" />
                </Button>
                {(generatedIdea || generatedOutline || generatedContent) && (
                  <Button onClick={handleConfirm} variant="gradient">
                    <Sparkles className="w-4 h-4 mr-2" />
                    下一步
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Markdown 预览界面 */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8">
              <Card>
                <CardHeader>
                  <CardTitle>论文预览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-lg max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {getFinalMarkdown()}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className="mt-6 flex gap-4 justify-center">
                <Button variant="outline" onClick={() => {
                  setStep('idea')
                  setMessages([{
                    role: 'assistant',
                    content: '让我们重新开始创作一篇新论文！请告诉我你的研究主题。'
                  }])
                }}>
                  重新生成
                </Button>
                <Button variant="gradient">
                  进入编辑器
                </Button>
                <Button variant="outline">
                  导出 Markdown
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
