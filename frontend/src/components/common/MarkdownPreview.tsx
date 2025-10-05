import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

interface MarkdownPreviewProps {
  content: string
  className?: string
  emptyFallback?: ReactNode
}

const normalizeTexDelimiters = (raw: string) => {
  const displayMathPattern = /(?<!\\)\\\[(.*?)(?<!\\)\\\]/gs
  const inlineMathPattern = /(?<!\\)\\\((.*?)(?<!\\)\\\)/gs

  return raw
    .replace(displayMathPattern, (_, expression: string) => `\n\n$$${expression.trim()}$$\n\n`)
    .replace(inlineMathPattern, (_, expression: string) => `$${expression.trim()}$`)
}

export const MarkdownPreview = ({ content, className, emptyFallback }: MarkdownPreviewProps) => {
  const normalized = useMemo(() => normalizeTexDelimiters(content), [content])
  const trimmed = normalized.trim()

  if (!trimmed.length) {
    return (
      <div className={clsx('text-sm italic text-gray-400', className)}>
        {emptyFallback ?? '暂无内容'}
      </div>
    )
  }

  return (
    <div className={clsx('prose prose-sm max-w-none break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
