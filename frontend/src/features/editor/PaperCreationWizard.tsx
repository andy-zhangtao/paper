import { useState } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Step = 'idea' | 'outline' | 'content' | 'preview'

interface Message {
  role: 'user' | 'assistant'
  content: string
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

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // 模拟 AI 响应
    await simulateAIResponse(input)

    setIsLoading(false)
  }

  const simulateAIResponse = async (userInput: string) => {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 1500))

    let response = ''

    if (step === 'idea') {
      // 第一步：生成创意
      response = `太好了！基于你的输入「${userInput}」，我为你生成了以下论文创意：\n\n## 论文创意\n\n**标题**: 基于深度学习的图像识别技术在医疗诊断中的应用研究\n\n**研究背景**: 随着人工智能技术的快速发展，深度学习在医疗影像分析领域展现出巨大潜力...\n\n**研究意义**: \n- 提高诊断准确率\n- 降低医疗成本\n- 辅助医生决策\n\n**创新点**: 提出一种融合多模态医学影像的深度学习模型\n\n---\n\n这个创意符合你的期望吗？如果满意，请回复「确认」继续下一步生成大纲；如果需要调整，请告诉我你的想法。`
      setGeneratedIdea(response)
    } else if (step === 'outline') {
      // 第二步：生成大纲
      response = `很好！现在我为你生成论文大纲：\n\n## 论文大纲\n\n### 1. 引言\n- 1.1 研究背景\n- 1.2 研究现状\n- 1.3 研究目的与意义\n\n### 2. 相关工作\n- 2.1 深度学习在医疗影像中的应用\n- 2.2 现有方法的局限性\n\n### 3. 研究方法\n- 3.1 数据采集与预处理\n- 3.2 模型架构设计\n- 3.3 训练策略\n\n### 4. 实验与结果\n- 4.1 实验设置\n- 4.2 性能评估\n- 4.3 对比分析\n\n### 5. 讨论与分析\n- 5.1 结果讨论\n- 5.2 局限性分析\n\n### 6. 结论与展望\n- 6.1 研究总结\n- 6.2 未来工作\n\n---\n\n大纲是否符合要求？确认后我们将进入内容填充阶段。`
      setGeneratedOutline(response)
    } else if (step === 'content') {
      // 第三步：填充内容
      response = `完美！现在我为每个章节生成具体内容：\n\n# 基于深度学习的图像识别技术在医疗诊断中的应用研究\n\n## 1. 引言\n\n### 1.1 研究背景\n\n近年来，随着人工智能技术的飞速发展，特别是深度学习算法的突破性进展，医疗影像分析领域迎来了革命性的变革。传统的医疗诊断严重依赖医生的经验和主观判断，存在效率低下、误诊率高等问题。深度学习技术，特别是卷积神经网络（CNN）的出现，为自动化、智能化的医疗诊断提供了新的可能性。\n\n### 1.2 研究现状\n\n目前，深度学习在医疗影像识别领域已取得显著成果。例如，在肺结节检测、乳腺癌筛查、视网膜病变诊断等方面，基于深度学习的系统已经达到甚至超过了人类专家的水平。然而，现有研究主要集中在单一模态影像分析，缺乏对多模态数据的综合利用。\n\n### 1.3 研究目的与意义\n\n本研究旨在开发一种融合多模态医学影像的深度学习模型，通过整合CT、MRI、X光等不同成像技术的优势，提高疾病诊断的准确性和可靠性...\n\n## 2. 相关工作\n\n[继续生成...]\n\n---\n\n内容正在生成中...是否需要我继续完善其他章节？`
      setGeneratedContent(response)
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: response }])
  }

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
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                  placeholder="输入你的想法..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
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
