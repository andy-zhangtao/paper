# 调试模式使用指南

## 快速进入编辑器页面

为了方便测试「编辑正文」功能，无需每次都完成「选择创意」和「生成大纲」两个步骤。

### 使用方法

访问以下 URL：

```
http://localhost:5174/new?debug=true
```

或在开发环境中：

```
http://localhost:5173/new?debug=true
```

### 效果

1. **自动跳过前两步**：直接进入「编辑正文」页面
2. **自动生成模拟数据**：在 localStorage 中生成以下模拟论文数据

```json
{
  "topic": "人工智能在教育领域的应用研究",
  "outline": [
    { "heading": "第一章 绪论", "summary": "介绍研究背景、意义和研究目标" },
    { "heading": "第二章 文献综述", "summary": "总结国内外相关研究成果" },
    { "heading": "第三章 研究方法", "summary": "阐述研究方法和技术路线" },
    { "heading": "第四章 实验与分析", "summary": "展示实验结果并进行分析" },
    { "heading": "第五章 结论与展望", "summary": "总结研究成果并提出未来方向" }
  ],
  "chapters": [
    { "heading": "第一章 绪论", "summary": "...", "content": "" },
    ...
  ],
  "createdAt": "2025-10-05T..."
}
```

3. **显示调试提示**：页面顶部显示黄色提示条

```
🐛 调试模式已启用 - 使用模拟数据 | 移除 URL 参数 ?debug=true 退出
```

### 退出调试模式

1. **方法一**：移除 URL 中的 `?debug=true` 参数，刷新页面
2. **方法二**：访问 `/new`（不带参数）

### 注意事项

- 调试模式会**覆盖** localStorage 中的 `paper-editor-data`
- 如果你之前有真实数据，建议先备份或在隐私模式下测试
- 调试模式仅用于开发测试，生产环境请勿使用

### 测试流程

```bash
# 1. 启动前端开发服务器
cd frontend
npm run dev

# 2. 在浏览器访问
http://localhost:5173/new?debug=true

# 3. 测试生成章节功能
# - 展开任意章节
# - 填写生成指令（可选）
# - 点击「生成」按钮
# - 观察 SSE 流式输出

# 4. 退出调试模式
# 访问 http://localhost:5173/new
```

## 实现细节

### PaperCreationWizard.tsx

```typescript
// 检测 URL 参数
const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'true'

// 直接跳到编辑器步骤
const [step, setStep] = useState<Step>(isDebugMode ? 'editor' : 'idea')

// 初始化模拟数据
useEffect(() => {
  if (isDebugMode) {
    const mockPaperData = { ... }
    localStorage.setItem('paper-editor-data', JSON.stringify(mockPaperData))
  }
}, [isDebugMode])
```

### PaperEditor.tsx

```typescript
// 检测调试模式
const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'true'

// 显示提示条
{isDebugMode && (
  <div className="bg-yellow-100 ...">
    🐛 调试模式已启用 - 使用模拟数据
  </div>
)}
```
