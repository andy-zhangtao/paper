import { paperCreationApi } from '@/lib/api'
import { useRef, useState } from 'react'

interface ChapterContext {
  topic: string
  outline: Array<{ heading: string; summary?: string }>
  currentChapterIndex: number
  previousChapters: Array<{ heading: string; content: string }>
}

export const useChapterGenerate = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateChapter = async (
    context: ChapterContext,
    instruction: string | undefined,
    onDelta: (chunk: string) => void,
  ): Promise<string> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsGenerating(true)

    try {
      const currentChapter = context.outline[context.currentChapterIndex]

      // 构建用户消息
      let userMessage = `请为论文「${context.topic}」生成「${currentChapter.heading}」章节的正文内容。\n\n`

      if (currentChapter.summary) {
        userMessage += `章节说明：${currentChapter.summary}\n\n`
      }

      if (instruction) {
        userMessage += `生成要求：${instruction}\n\n`
      }

      // 添加前文上下文（限制最多2章，避免token过多）
      if (context.previousChapters.length > 0) {
        userMessage += `前文章节摘要（供参考，保持内容连贯）：\n`
        const recentChapters = context.previousChapters.slice(-2)
        for (const chapter of recentChapters) {
          const summary = chapter.content.slice(0, 200)
          userMessage += `- ${chapter.heading}：${summary}...\n`
        }
        userMessage += '\n'
      }

      userMessage += `请直接输出章节正文内容，使用Markdown格式。`

      const response = await paperCreationApi.chatStream(
        {
          stage: 'outline', // 复用 outline 阶段的提示词（后续可以新增 content 阶段）
          promptId: 'default', // 使用默认提示词
          message: userMessage,
          history: [],
          stateSnapshot: {
            stage: 'outline',
            topic: context.topic,
            outline: context.outline,
            confidence: 1,
            updatedAt: new Date().toISOString(),
          },
        },
        {
          signal: controller.signal,
          onDelta,
        },
      )

      return response.reply
    } catch (error) {
      if (error instanceof Error && error.message === '请求已被取消') {
        throw new Error('生成已取消')
      }
      const errorMessage = error instanceof Error ? error.message : 'AI服务暂时不可用，请稍后再试。'
      throw new Error(errorMessage)
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setIsGenerating(false)
    }
  }

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  return {
    isGenerating,
    generateChapter,
    cancel,
  }
}
