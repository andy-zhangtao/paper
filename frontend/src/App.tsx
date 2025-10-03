import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Paper AI Assistant
          </h1>
          <p className="text-gray-600">
            基于 AI 的智能论文写作助手
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>欢迎使用前端开发环境</CardTitle>
            <CardDescription>
              项目已成功配置 Tailwind CSS + React + TypeScript
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant="default">默认按钮</Button>
              <Button variant="outline">边框按钮</Button>
              <Button variant="secondary">次要按钮</Button>
              <Button variant="ghost">幽灵按钮</Button>
              <Button variant="gradient">渐变按钮</Button>
              <Button variant="destructive">危险按钮</Button>
            </div>

            <div className="flex gap-2">
              <Button size="sm">小按钮</Button>
              <Button size="default">默认按钮</Button>
              <Button size="lg">大按钮</Button>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">✅ 配置完成</p>
              <ul className="mt-2 text-sm text-green-700 space-y-1">
                <li>• Vite + React 18 + TypeScript</li>
                <li>• Tailwind CSS 样式系统</li>
                <li>• 路径别名 @/* 配置</li>
                <li>• Mock 数据层已就绪</li>
                <li>• 基础 UI 组件（Button, Card）</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>下一步开发计划</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>实现 Layout 组件（Navbar + Sidebar）</li>
              <li>实现富文本编辑器（Tiptap）</li>
              <li>实现积分系统组件</li>
              <li>实现论文列表页面</li>
              <li>实现路由和状态管理</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
