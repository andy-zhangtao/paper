import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { paperCreationApi } from '@/lib/api'
import type {
  PaperCreationChatMessage,
  PaperCreationStageCode,
  PaperCreationState,
  PromptTemplateSummary,
} from '@/types/prompt'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PaperEditor } from './PaperEditor'
import { usePaperCreationState } from './usePaperCreationState'

type CreationStage = PaperCreationStageCode
const CREATION_STAGES: CreationStage[] = ['idea', 'outline']
type Step = CreationStage | 'editor'
type Message = PaperCreationChatMessage

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
    description: '生成章节正文内容',
  },
}

const STEP_ORDER: Step[] = ['idea', 'outline', 'editor']

const STEP_TITLES: Record<Step, string> = {
  idea: '选择创意',
  outline: '生成大纲',
  content: '填充内容',
  editor: '编辑正文',
}

const STEP_INTRO_MESSAGES: Record<Step, string> = {
  idea:
    '你好！我是你的AI写作助手。让我们一起创作一篇优质论文吧！\n\n**第一步：选择创意**\n\n请告诉我：\n1. 你想写什么主题的论文？\n2. 你的研究方向是什么？\n3. 有什么特定的角度或想法吗？',
  outline:
    '**第二步：生成大纲**\n\n现在我将为你生成详细的论文大纲。你对大纲有什么具体要求吗？（如章节数量、重点内容等）\n\n如果没有特殊要求，请直接回复「生成大纲」。',
  content:
    '**第三步：填充内容**\n\n现在为每个章节生成正文内容。',
  editor:
    '**进入编辑器**\n\n已为你整理章节大纲，点击任意章节即可自动生成正文，也可以手动编辑。编辑完成后可导出Markdown。',
}

const STEP_NEXT_LABEL: Record<CreationStage, string> = {
  idea: '生成论文大纲',
  outline: '进入编辑正文',
  content: '进入编辑器',
}

const STEP_RESULT_TITLES: Record<CreationStage, string> = {
  idea: '创意草稿预览',
  outline: '论文大纲预览',
  content: '内容预览',
}

const STEP_QUICK_REPLIES: Partial<Record<CreationStage, string[]>> = {
  idea: ['我想写关于人工智能的论文', '研究方向是教育科技', '帮我提供几个创新的论文选题'],
  outline: ['生成一个标准五章大纲', '突出研究方法部分', '请增加相关工作章节'],
  content: [],
}

interface StatusCardProps {
  state: PaperCreationState | null
  onReset: () => void
  currentStage: Step
}

const StatusCard = ({ state, onReset, currentStage }: StatusCardProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [position, setPosition] = useState({ x: 40, y: 40 })
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('paper-creation-status-position') : null
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition({
            x: Math.max(16, parsed.x),
            y: Math.max(16, parsed.y),
          })
        }
      } catch (error) {
        console.warn('解析状态卡片位置失败:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('paper-creation-status-position', JSON.stringify(position))
  }, [position])

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const cardEl = cardRef.current
    if (!cardEl) return
    event.preventDefault()
    const rect = cardEl.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const offset = dragOffsetRef.current
      if (!offset || !cardRef.current) return

      const nextX = moveEvent.clientX - offset.x
      const nextY = moveEvent.clientY - offset.y

      const cardWidth = cardRef.current.offsetWidth
      const cardHeight = cardRef.current.offsetHeight

      setPosition(() => {
        const maxX = window.innerWidth - cardWidth - 16
        const maxY = window.innerHeight - cardHeight - 16
        return {
          x: Math.min(Math.max(16, nextX), Math.max(16, maxX)),
          y: Math.min(Math.max(16, nextY), Math.max(16, maxY)),
        }
      })
    }

    const handleMouseUp = () => {
      dragOffsetRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const topicText = state?.topic && state.topic.trim().length
    ? state.topic
    : 'AI 暂未确定论文方向，可继续与助手交流。'
  const outlineItems = state?.outline?.filter((item) => item?.heading?.trim().length) ?? []
  const confidence = typeof state?.confidence === 'number' ? Math.round(state.confidence * 100) : null
  const stageLabel = state?.stage ? STEP_TITLES[state.stage] : '未判定'
  const contentSections = state?.contentSections ?? []

  const updatedLabel = state?.updatedAt
    ? new Date(state.updatedAt).toLocaleString()
    : null

  return (
    <aside
      ref={cardRef}
      className="fixed z-40 hidden w-80 max-w-[90vw] flex-col rounded-xl border border-emerald-200 bg-white/95 shadow-xl backdrop-blur lg:flex"
      style={{ left: position.x, top: position.y, maxHeight: '70vh' }}
    >
      <div
        className="cursor-move select-none border-b p-4 active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">创作状态</h3>
            <p className="mt-1 text-xs text-gray-500">AI 根据对话实时推断关键信息</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600"
            onClick={() => setIsCollapsed((prev) => !prev)}
          >
            {isCollapsed ? '展开' : '收起'}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>当前阶段</span>
            <span className="text-gray-700">{STEP_TITLES[currentStage]}</span>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="text-xs text-gray-500">AI 推测阶段</div>
            <div className="mt-1 text-sm font-medium text-gray-900">{stageLabel}</div>
            {confidence !== null && (
              <div className="mt-1 text-xs text-gray-500">置信度约 {confidence}%</div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-xs font-semibold text-gray-500">论文方向</div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 text-sm text-gray-800 whitespace-pre-wrap">
            {topicText}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>章节结构</span>
            <span>{outlineItems.length > 0 ? `${outlineItems.length} 个节点` : '未生成'}</span>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3">
            {outlineItems.length > 0 ? (
              <ol className="space-y-2 text-sm text-gray-800">
                {outlineItems.map((item, index) => (
                  <li key={`${item.heading}-${index}`} className="space-y-1">
                    <div className="font-medium text-gray-900">
                      {index + 1}. {item.heading}
                    </div>
                    {item.summary && (
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{item.summary}</p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-gray-500">等待AI生成大纲或继续补充需求。</p>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>正文章节</span>
            <span>
              {state?.contentApproved && contentSections.length
                ? `${contentSections.length} 个章节`
                : '未完成'}
            </span>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 max-h-48 overflow-y-auto">
            {contentSections.length > 0 ? (
              <ol className="space-y-3 text-sm text-gray-800">
                {contentSections.map((section, index) => (
                  <li key={`${section.heading}-${index}`} className="space-y-1">
                    <div className="font-medium text-gray-900">
                      {index + 1}. {section.heading}
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">
                      {section.content.slice(0, 200)}
                      {section.content.length > 200 ? '...' : ''}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-gray-500">当你确认正文满意后，这里将展示章节内容。</p>
            )}
          </div>
        </section>

        {updatedLabel && (
          <p className="text-[10px] text-gray-400">最近更新：{updatedLabel}</p>
        )}
        </div>
      )}
      <div className="border-t p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onReset}
          disabled={!state}
        >
          清除状态
        </Button>
      </div>
    </aside>
  )
}

interface StagePromptInfo {
  displayName: string
  description: string | null
  prompts: PromptTemplateSummary[]
}

export const PaperCreationWizard = () => {
  const { state: paperState, updateState, resetState } = usePaperCreationState()
  const assistantMessageIndexRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 调试模式：通过 URL 参数 ?debug=true 直接进入编辑器
  const isDebugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true'
  const [step, setStep] = useState<Step>(isDebugMode ? 'editor' : 'idea')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: STEP_INTRO_MESSAGES.idea,
    },
  ])

  // 调试模式：初始化模拟数据
  useEffect(() => {
    if (isDebugMode && typeof window !== 'undefined') {
      const mockPaperData = {
        topic: '人工智能在教育领域的应用研究',
        outline: [
          { heading: '第一章 绪论', summary: '介绍研究背景、意义和研究目标' },
          { heading: '第二章 文献综述', summary: '总结国内外相关研究成果' },
          { heading: '第三章 研究方法', summary: '阐述研究方法和技术路线' },
          { heading: '第四章 实验与分析', summary: '展示实验结果并进行分析' },
          { heading: '第五章 结论与展望', summary: '总结研究成果并提出未来方向' },
        ],
        chapters: [
          { heading: '第一章 绪论', summary: '介绍研究背景、意义和研究目标', content: '' },
          { heading: '第二章 文献综述', summary: '总结国内外相关研究成果', content: '' },
          { heading: '第三章 研究方法', summary: '阐述研究方法和技术路线', content: '' },
          { heading: '第四章 实验与分析', summary: '展示实验结果并进行分析', content: '' },
          { heading: '第五章 结论与展望', summary: '总结研究成果并提出未来方向', content: '' },
        ],
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem('paper-editor-data', JSON.stringify(mockPaperData))
      console.log('🐛 调试模式：已生成模拟论文数据')
    }
  }, [isDebugMode])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedIdea, setGeneratedIdea] = useState('')
  const [generatedOutline, setGeneratedOutline] = useState('')
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
  const [collapsedPreviewStages, setCollapsedPreviewStages] = useState<Record<CreationStage, boolean>>({
    idea: false,
    outline: false,
    content: false,
  })

  const currentStage = step === 'editor' ? null : step
  const currentStageInfo = currentStage ? promptData[currentStage] : undefined
  const currentPromptId = currentStage ? selectedPromptIds[currentStage] : null
  const canSend = Boolean(currentStage && currentPromptId && input.trim())
  const currentStepIndex = STEP_ORDER.indexOf(step)
  const previousStep = currentStepIndex > 0 ? STEP_ORDER[currentStepIndex - 1] : null
  const stageResults: Record<CreationStage, string> = {
    idea: generatedIdea,
    outline: generatedOutline,
    content: '',
  }
  const currentStageResult = currentStage ? stageResults[currentStage] : ''
  const hasResultForCurrentStage = currentStage ? Boolean(currentStageResult) : false

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

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
    if (isLoading || !canSend || !currentStage || !currentPromptId) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    const stageForRequest = currentStage
    const promptForRequest = currentPromptId
    const trimmedInput = input.trim()
    const userMessage: Message = { role: 'user', content: trimmedInput }
    const history = messages.map((item) => ({ role: item.role, content: item.content }))

    setMessages((prev) => {
      const assistantPlaceholder: Message = { role: 'assistant', content: '' }
      const next: Message[] = [...prev, userMessage, assistantPlaceholder]
      assistantMessageIndexRef.current = next.length - 1
      return next
    })

    setInput('')
    setIsLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await paperCreationApi.chatStream(
        {
          stage: stageForRequest,
          promptId: promptForRequest,
          message: trimmedInput,
          history,
          stateSnapshot: paperState ?? undefined,
        },
        {
          signal: controller.signal,
          onDelta: (chunk) => {
            if (!chunk) return
            const index = assistantMessageIndexRef.current
            if (index === null) return
            setMessages((prev) => {
              const next = [...prev]
              const currentMessage = next[index]
              if (currentMessage) {
                next[index] = {
                  ...currentMessage,
                  content: (currentMessage.content || '') + chunk,
                }
              }
              return next
            })
          },
        },
      )

      const reply = response.reply
      const index = assistantMessageIndexRef.current
      if (index !== null) {
        setMessages((prev) => {
          const next = [...prev]
          const currentMessage = next[index]
          if (currentMessage) {
            next[index] = {
              ...currentMessage,
              content: reply || currentMessage.content,
            }
          }
          return next
        })
      }

      if (response.state && Object.keys(response.state).length > 0) {
        updateState(response.state)
      }

      if (stageForRequest === 'idea') {
        setGeneratedIdea(reply)
      } else if (stageForRequest === 'outline') {
        setGeneratedOutline(reply)
      }
    } catch (error) {
      if (error instanceof Error && error.message === '请求已被取消') {
        return
      }
      const index = assistantMessageIndexRef.current
      const errorMessage = error instanceof Error ? error.message : 'AI服务暂时不可用，请稍后再试。'
      setMessages((prev) => {
        if (index !== null && prev[index]?.role === 'assistant') {
          const next = [...prev]
          next[index] = {
            role: 'assistant',
            content: `抱歉，生成失败：${errorMessage}`,
          }
          return next
        }

        return [
          ...prev,
          {
            role: 'assistant',
            content: `抱歉，生成失败：${errorMessage}`,
          },
        ]
      })
    } finally {
      assistantMessageIndexRef.current = null
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setIsLoading(false)
    }
  }

  const appendIntroForStep = (targetStep: Step) => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1]
      if (lastMessage?.role === 'assistant' && lastMessage.content === STEP_INTRO_MESSAGES[targetStep]) {
        return prev
      }
      return [
        ...prev,
        {
          role: 'assistant',
          content: STEP_INTRO_MESSAGES[targetStep],
        },
      ]
    })
  }

  const handlePromptSelect = (stage: CreationStage, promptId: string) => {
    setSelectedPromptIds((prev) => ({
      ...prev,
      [stage]: promptId,
    }))
  }

  const handleQuickReply = (text: string) => {
    setInput(text)
  }

  const handleGoBack = () => {
    if (!previousStep) return
    setStep(previousStep)
    appendIntroForStep(previousStep)
  }

  const handleStepSelect = (targetStep: Step) => {
    const targetIndex = STEP_ORDER.indexOf(targetStep)
    if (targetIndex === -1 || targetIndex >= currentStepIndex) {
      return
    }
    setStep(targetStep)
    appendIntroForStep(targetStep)
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
      appendIntroForStep('outline')
    } else if (step === 'outline') {
      // 保存数据到 localStorage
      if (paperState && paperState.outline) {
        const paperData = {
          topic: paperState.topic || '未命名论文',
          outline: paperState.outline,
          chapters: paperState.outline.map((item) => ({
            heading: item.heading,
            summary: item.summary || '',
            content: '',
          })),
          createdAt: new Date().toISOString(),
        }
        localStorage.setItem('paper-editor-data', JSON.stringify(paperData))
      }
      setStep('editor')
      appendIntroForStep('editor')
    }
  }

  const handleTogglePreview = (stage: CreationStage) => {
    setCollapsedPreviewStages((prev) => ({
      ...prev,
      [stage]: !prev[stage],
    }))
  }

  // 如果进入编辑器模式，直接渲染 PaperEditor
  if (step === 'editor') {
    return <PaperEditor />
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部进度指示 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm">
            {STEP_ORDER.map((item, index) => {
              const isActive = step === item
              const isPastStep = index < currentStepIndex
              const baseTextClass = isActive
                ? 'text-purple-600 font-semibold'
                : isPastStep
                  ? 'text-gray-600 hover:text-purple-600'
                  : 'text-gray-400'
              const circleClass = isActive
                ? 'bg-purple-100 text-purple-600'
                : isPastStep
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-gray-100 text-gray-400'

              return (
                <Fragment key={item}>
                  <button
                    type="button"
                    onClick={() => handleStepSelect(item)}
                    disabled={!isPastStep}
                    className={`flex items-center gap-2 focus:outline-none ${
                      isPastStep ? 'cursor-pointer' : 'cursor-default'
                    } ${baseTextClass}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${circleClass}`}>
                      {index + 1}
                    </div>
                    <span>{STEP_TITLES[item]}</span>
                  </button>
                  {index < STEP_ORDER.length - 1 && <div className="w-8 h-px bg-gray-300" />}
                </Fragment>
              )
            })}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {/* 对话式交互界面 */}
          <div className="flex-1 min-h-0 flex flex-col max-w-4xl mx-auto w-full">
              {currentStage && (
                <div className="px-6 pt-6 flex-none">
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
              {currentStage && currentStageResult && (
                <div className="px-6 pt-4 flex-none">
                  <Card className="border border-emerald-100 bg-emerald-50/40">
                  <CardHeader className="pb-1 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-emerald-700">
                      {STEP_RESULT_TITLES[currentStage]}
                    </CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                      onClick={() => handleTogglePreview(currentStage)}
                    >
                      {collapsedPreviewStages[currentStage] ? '展开' : '收起'}
                    </Button>
                  </CardHeader>
                  {!collapsedPreviewStages[currentStage] && (
                    <CardContent className="max-h-48 overflow-y-auto text-sm text-emerald-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentStageResult}
                      </ReactMarkdown>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}
            {/* 消息列表 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
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
            <div className="border-t bg-white p-4 flex-none">
              <div className="max-w-4xl mx-auto flex flex-col gap-3">
                <div className="flex gap-2">
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
                  {previousStep && (
                    <Button variant="outline" onClick={handleGoBack} disabled={isLoading}>
                      上一步
                    </Button>
                  )}
                    {hasResultForCurrentStage && currentStage && (
                      <Button onClick={handleConfirm} variant="gradient" disabled={isLoading}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {STEP_NEXT_LABEL[currentStage]}
                      </Button>
                    )}
                </div>
                {currentStage && STEP_QUICK_REPLIES[currentStage]?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {STEP_QUICK_REPLIES[currentStage]!.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        onClick={() => handleQuickReply(reply)}
                        className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs text-purple-600 transition hover:border-purple-400 hover:bg-purple-100"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <StatusCard state={paperState} onReset={resetState} currentStage={step} />
      </div>
    </div>
  )
}
