import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, BookOpen, Download, FileText, Sparkles } from 'lucide-react'

interface TutorialPageProps {
  onBack: () => void
}

export const TutorialPage = ({ onBack }: TutorialPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2 text-gray-600 hover:text-purple-600"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">使用教程</h1>
          <p className="text-lg text-gray-600">
            快速了解如何使用 AI 论文生成器，让您的学术写作更高效
          </p>
        </div>

        {/* 教程内容 */}
        <div className="space-y-8">
          {/* 步骤 1 */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-purple-600" />
                  创建新论文
                </h2>
                <div className="space-y-3 text-gray-700">
                  <p>点击首页的"新建论文"按钮开始创建您的论文。</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>输入论文主题和关键词</li>
                    <li>选择论文类型（研究论文、综述等）</li>
                    <li>设置论文长度和章节结构</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* 步骤 2 */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  AI 智能生成
                </h2>
                <div className="space-y-3 text-gray-700">
                  <p>系统将使用 AI 技术为您生成论文内容：</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>自动生成论文大纲</li>
                    <li>智能撰写各章节内容</li>
                    <li>引用相关学术文献</li>
                    <li>确保内容连贯性和学术性</li>
                  </ul>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                    <p className="text-yellow-800">
                      💡 <strong>提示：</strong>生成过程可能需要几分钟时间，请耐心等待。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 步骤 3 */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Download className="w-6 h-6 text-purple-600" />
                  下载和编辑
                </h2>
                <div className="space-y-3 text-gray-700">
                  <p>论文生成完成后，您可以：</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>在线预览完整内容</li>
                    <li>下载为 Word 或 PDF 格式</li>
                    <li>根据需要进一步编辑和完善</li>
                    <li>保存到"我的论文"列表中</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* 注意事项 */}
          <Card className="p-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📌 注意事项</h2>
            <div className="space-y-3 text-gray-700">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>每次生成论文会消耗一定积分，请确保账户有足够余额</li>
                <li>AI 生成的内容仅供参考，请务必进行人工审核和修改</li>
                <li>建议结合实际研究数据和文献，完善论文内容</li>
                <li>确保最终论文符合学术规范和原创性要求</li>
              </ul>
            </div>
          </Card>

          {/* 常见问题 */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">❓ 常见问题</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  Q: 生成一篇论文需要多长时间？
                </h3>
                <p className="text-gray-700">
                  A: 通常需要 3-5 分钟，具体时间取决于论文长度和复杂度。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  Q: 如果对生成的内容不满意怎么办？
                </h3>
                <p className="text-gray-700">
                  A: 您可以调整论文参数后重新生成，或者在生成的基础上手动编辑。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  Q: 生成的论文是否可以直接提交？
                </h3>
                <p className="text-gray-700">
                  A: 不建议直接提交。AI 生成的内容需要人工审核、修改和补充实际研究数据。
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* 底部操作 */}
        <div className="mt-12 text-center">
          <Button
            size="lg"
            onClick={onBack}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8"
          >
            开始使用
          </Button>
        </div>
      </div>
    </div>
  )
}
