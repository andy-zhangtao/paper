# 前端设计文档

## 🎨 设计风格定位

### 整体风格
**现代极简学术风** - 类似 Notion、Overleaf 的专业感，但更轻量

### 色彩方案

**主色调**：
- **蓝灰色系**（专业、冷静）- Tailwind的 `slate`
- **强调色**：紫色（创新、AI感）- `purple-600`
- **背景**：纯白 + 浅灰分层 - `bg-white` / `bg-gray-50`
- **文字**：深灰色 - `text-gray-900` / `text-gray-600`

**Tailwind配置**：
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7c3aed',  // purple-600
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        secondary: {
          DEFAULT: '#64748b',  // slate-500
        }
      }
    }
  }
}
```

### 设计原则

1. **留白优先**：大量空白，避免拥挤感（学术工具要让人静下心）
2. **无干扰编辑**：编辑器占满屏，工具栏半透明悬浮
3. **数据可视化**：积分消耗用渐变卡片+动效，让用户"看见钱在哪"
4. **响应式但桌面优先**：写论文场景99%在电脑，移动端做基础适配即可

---

## 🧩 核心组件设计

### 1. 布局组件

#### AppLayout
```
┌─────────────────────────────────────┐
│  Navbar (固定顶部, backdrop-blur)   │ ← 半透明毛玻璃
├─────────┬───────────────────────────┤
│ Sidebar │  Main Content             │
│ (可收起) │  (编辑器/论文列表)          │
│         │                           │
│ 导航图标  │  充值按钮悬浮右下角         │
└─────────┴───────────────────────────┘
```

**技术实现**：
- 响应式：`lg:grid-cols-[240px_1fr]`（桌面）+ `fixed drawer`（移动端）
- 动画：Framer Motion的 `<motion.aside>` 展开/收起
- 状态：Zustand `useSidebarStore()`

**Navbar组件**：
- 高度：`h-16`
- 背景：`backdrop-blur-md bg-white/80`（毛玻璃效果）
- 阴影：`shadow-sm`
- 内容：Logo + 积分余额 + 用户菜单

**Sidebar组件**：
- 宽度：`240px`（展开）/ `0px`（收起）
- 导航项：图标 + 文字，hover时背景色变化
- 动画：`transition-all duration-300`

---

### 2. 编辑器组件（核心）

#### PaperEditor
基于 **Tiptap** 富文本编辑器，参考 Notion 的交互体验。

**组件结构**：
```tsx
<div className="h-screen flex flex-col">
  {/* 工具栏 - 悬浮 */}
  <BubbleMenu className="rounded-full shadow-lg bg-white px-2 py-1">
    <Button size="sm" variant="ghost">
      <Bold className="w-4 h-4" />
    </Button>
    <Separator orientation="vertical" />
    <Button size="sm" variant="gradient" onClick={aiPolish}>
      ✨ AI润色
    </Button>
    <Button size="sm" onClick={aiTranslate}>
      🌐 翻译
    </Button>
  </BubbleMenu>

  {/* 编辑区域 */}
  <EditorContent
    className="flex-1 prose prose-lg max-w-none p-8"
    editor={editor}
  />

  {/* 底部状态栏 */}
  <div className="fixed bottom-4 left-4 flex gap-4">
    <CharacterCount />
    <SaveStatus />
  </div>
</div>
```

**样式特点**：
- 编辑区：`prose-lg`（大字体18px，行高1.75，易读）
- 工具栏：`rounded-full shadow-lg`（胶囊形状，现代感）
- AI按钮：`bg-gradient-to-r from-purple-600 to-blue-600 text-white`
- 字数统计：`text-sm text-gray-500`

**AI交互动效**：
```tsx
// 点击"AI润色"后
<Button disabled className="relative">
  <Loader2 className="w-4 h-4 animate-spin" />
  <span className="ml-2">AI思考中...</span>

  {/* 进度条 */}
  <motion.div
    className="absolute bottom-0 left-0 h-0.5 bg-purple-500"
    initial={{ width: 0 }}
    animate={{ width: '100%' }}
    transition={{ duration: 2 }}
  />
</Button>
```

---

### 3. 积分系统组件

#### CreditBalance（顶部常驻）
```tsx
<Card className="bg-gradient-to-br from-purple-500 to-blue-600 text-white px-4 py-2">
  <div className="flex items-center gap-3">
    <Coins className="w-5 h-5" />
    <div>
      <div className="text-xs opacity-80">积分余额</div>
      <AnimatedNumber
        value={balance}
        className="text-lg font-bold"
      />
    </div>
  </div>
  <Button
    size="sm"
    variant="secondary"
    className="bg-white text-purple-600 hover:bg-gray-100"
    onClick={openRecharge}
  >
    + 充值
  </Button>
</Card>
```

#### RechargeDialog（充值弹窗）
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>购买积分</DialogTitle>
      <DialogDescription>
        选择套餐，支付宝扫码支付
      </DialogDescription>
    </DialogHeader>

    {/* 套餐卡片 */}
    <div className="grid grid-cols-2 gap-4">
      {packages.map(pkg => (
        <RechargeCard
          key={pkg.id}
          amount={pkg.credits}
          price={pkg.price}
          bonus={pkg.bonus}
          isPopular={pkg.isPopular}
          onClick={() => handleSelect(pkg)}
        />
      ))}
    </div>

    {/* 支付二维码（选中套餐后显示）*/}
    {selectedPackage && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="border-t pt-4"
      >
        <QRCodeSVG value={paymentUrl} size={200} />
        <p className="text-sm text-gray-500 text-center mt-2">
          请使用支付宝扫码支付 ¥{selectedPackage.price}
        </p>
      </motion.div>
    )}
  </DialogContent>
</Dialog>
```

#### RechargeCard（套餐卡片）
```tsx
<Card
  className={cn(
    "relative cursor-pointer transition-all hover:scale-105",
    isPopular && "ring-2 ring-purple-500"
  )}
  onClick={onClick}
>
  {/* 推荐标签 */}
  {isPopular && (
    <Badge className="absolute -top-2 -right-2 bg-purple-500">
      🔥 热门
    </Badge>
  )}

  <CardContent className="p-4 text-center">
    <div className="text-3xl font-bold text-gray-900">
      {amount}
    </div>
    <div className="text-xs text-gray-500">积分</div>

    {bonus > 0 && (
      <Badge variant="secondary" className="mt-2">
        +{bonus} 赠送
      </Badge>
    )}

    <div className="mt-4 text-xl font-bold text-purple-600">
      ¥{price}
    </div>
  </CardContent>
</Card>
```

#### TransactionHistory（消费记录）
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>时间</TableHead>
      <TableHead>类型</TableHead>
      <TableHead>积分变化</TableHead>
      <TableHead>余额</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {transactions.map(tx => (
      <TableRow key={tx.id}>
        <TableCell>{formatDate(tx.createdAt)}</TableCell>
        <TableCell>
          <Badge variant={tx.type === 'consume' ? 'destructive' : 'default'}>
            {getTypeLabel(tx.type)}
          </Badge>
        </TableCell>
        <TableCell className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
          {tx.amount > 0 ? '+' : ''}{tx.amount}
        </TableCell>
        <TableCell>{tx.balanceAfter}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### 4. 论文列表组件

#### PaperList
```tsx
<div className="p-6">
  {/* 头部：搜索 + 新建按钮 */}
  <div className="flex justify-between items-center mb-6">
    <Input
      placeholder="搜索论文..."
      className="max-w-sm"
      icon={<Search />}
    />
    <Button onClick={createPaper}>
      <Plus className="w-4 h-4 mr-2" />
      新建论文
    </Button>
  </div>

  {/* 标签页 */}
  <Tabs defaultValue="all">
    <TabsList>
      <TabsTrigger value="all">全部</TabsTrigger>
      <TabsTrigger value="archived">已归档</TabsTrigger>
    </TabsList>
  </Tabs>

  {/* 论文卡片网格 */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
    {papers.map(paper => (
      <PaperCard key={paper.id} paper={paper} />
    ))}
  </div>
</div>
```

#### PaperCard
```tsx
<Card className="hover:shadow-lg transition-shadow cursor-pointer">
  <CardHeader>
    <CardTitle className="line-clamp-2">{paper.title}</CardTitle>
    <CardDescription>
      {formatDate(paper.updatedAt)}
    </CardDescription>
  </CardHeader>

  <CardContent>
    <p className="text-sm text-gray-600 line-clamp-3">
      {paper.content}
    </p>
  </CardContent>

  <CardFooter className="justify-between">
    <Badge variant="outline">
      {paper.wordCount} 字
    </Badge>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleArchive(paper.id)}>
          归档
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(paper.id)}>
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </CardFooter>
</Card>
```

---

### 5. UI组件库（shadcn/ui）

#### 使用的组件清单

| 组件 | 用途 | 变体 |
|------|------|------|
| Button | 所有交互按钮 | default / outline / ghost / link / destructive |
| Dialog | 充值弹窗、确认删除 | - |
| DropdownMenu | 用户头像菜单、论文操作菜单 | - |
| Tabs | 论文列表的"全部/已归档" | - |
| Toast | 操作反馈 | default / success / error |
| Card | 论文卡片、积分卡片 | - |
| Badge | 标签、状态标识 | default / secondary / destructive / outline |
| Input | 搜索框、表单输入 | - |
| Separator | 分隔线 | horizontal / vertical |
| Skeleton | 加载占位 | - |
| Table | 消费记录列表 | - |

#### 自定义变体

**Button with Gradient**：
```tsx
// components/ui/button.tsx
const buttonVariants = cva(
  "...", // 基础样式
  {
    variants: {
      variant: {
        // ...其他变体
        gradient: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700",
      }
    }
  }
)
```

---

### 6. 动效方案（Framer Motion）

#### 关键动效配置

**1. 充值弹窗**：
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 20 }}
  transition={{ duration: 0.2 }}
>
  {/* 弹窗内容 */}
</motion.div>
```

**2. 积分数字变化**：
```tsx
const AnimatedNumber = ({ value }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {value}
    </motion.span>
  )
}
```

**3. 积分消耗闪烁**（心理暗示）：
```tsx
const CreditBalance = ({ balance, isConsuming }) => {
  return (
    <motion.div
      animate={isConsuming ? {
        backgroundColor: ['#7c3aed', '#ef4444', '#7c3aed'],
      } : {}}
      transition={{ duration: 0.5 }}
    >
      {balance}
    </motion.div>
  )
}
```

**4. AI处理进度条**：
```tsx
<motion.div
  className="h-1 bg-purple-500"
  initial={{ width: 0 }}
  animate={{ width: '100%' }}
  transition={{ duration: 2, ease: 'easeInOut' }}
/>
```

**5. 列表项悬停**：
```tsx
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 300 }}
>
  {/* 论文卡片 */}
</motion.div>
```

---

## 📁 项目目录结构

```
frontend/
├── public/
│   └── logo.svg
│
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn组件
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── input.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx      # 主布局
│   │   │   ├── Navbar.tsx         # 顶部导航
│   │   │   └── Sidebar.tsx        # 侧边栏
│   │   │
│   │   └── common/
│   │       ├── AnimatedNumber.tsx # 数字动画
│   │       ├── LoadingSpinner.tsx # 加载动画
│   │       └── QRCode.tsx         # 二维码组件
│   │
│   ├── features/
│   │   ├── editor/
│   │   │   ├── PaperEditor.tsx    # 编辑器主组件
│   │   │   ├── BubbleMenu.tsx     # 悬浮工具栏
│   │   │   ├── CharacterCount.tsx # 字数统计
│   │   │   └── SaveStatus.tsx     # 保存状态
│   │   │
│   │   ├── credits/
│   │   │   ├── CreditBalance.tsx      # 积分余额
│   │   │   ├── RechargeDialog.tsx     # 充值弹窗
│   │   │   ├── RechargeCard.tsx       # 套餐卡片
│   │   │   └── TransactionHistory.tsx # 消费记录
│   │   │
│   │   ├── papers/
│   │   │   ├── PaperList.tsx      # 论文列表
│   │   │   └── PaperCard.tsx      # 论文卡片
│   │   │
│   │   └── auth/
│   │       ├── LoginForm.tsx      # 登录表单
│   │       └── RegisterForm.tsx   # 注册表单
│   │
│   ├── hooks/
│   │   ├── useAuth.ts             # 认证钩子
│   │   ├── useCredits.ts          # 积分查询
│   │   ├── usePapers.ts           # 论文CRUD
│   │   └── useAI.ts               # AI调用
│   │
│   ├── stores/
│   │   ├── authStore.ts           # 用户状态
│   │   ├── creditStore.ts         # 积分状态
│   │   └── sidebarStore.ts        # 侧边栏状态
│   │
│   ├── lib/
│   │   ├── api.ts                 # API客户端
│   │   ├── mock.ts                # Mock数据
│   │   └── utils.ts               # 工具函数
│   │
│   ├── types/
│   │   ├── paper.ts               # 论文类型
│   │   ├── user.ts                # 用户类型
│   │   └── credit.ts              # 积分类型
│   │
│   ├── pages/
│   │   ├── Home.tsx               # 首页（论文列表）
│   │   ├── Editor.tsx             # 编辑器页面
│   │   ├── Credits.tsx            # 积分管理页
│   │   └── Login.tsx              # 登录页
│   │
│   ├── styles/
│   │   └── globals.css            # 全局样式
│   │
│   ├── App.tsx                    # 根组件
│   └── main.tsx                   # 入口文件
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── components.json                # shadcn配置
```

---

## 🔄 数据流设计

### 状态管理（Zustand）

**authStore**：
```typescript
interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}
```

**creditStore**：
```typescript
interface CreditState {
  balance: number
  isLoading: boolean
  fetchBalance: () => Promise<void>
  consume: (amount: number) => void  // 乐观更新
}
```

### API层（React Query + Axios）

**API客户端**：
```typescript
// lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
})

// 请求拦截器：添加token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理错误
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // token过期，跳转登录
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

**React Query钩子**：
```typescript
// hooks/useCredits.ts
export const useCredits = () => {
  return useQuery({
    queryKey: ['credits'],
    queryFn: () => api.get('/credits/balance'),
    refetchInterval: 5000,  // 5秒轮询
    staleTime: 3000,        // 3秒内使用缓存
  })
}

export const useAIPolish = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (text: string) => api.post('/ai/polish', { text }),
    onSuccess: () => {
      // 刷新积分余额
      queryClient.invalidateQueries(['credits'])
    },
  })
}
```

---

## 📱 响应式设计

### 断点规则

使用 Tailwind 默认断点：
```js
sm: '640px'   // 手机横屏
md: '768px'   // 平板
lg: '1024px'  // 小笔记本
xl: '1280px'  // 桌面
2xl: '1536px' // 大屏
```

### 关键适配

**布局**：
```tsx
<div className="flex flex-col lg:flex-row">
  {/* 移动端：垂直堆叠 */}
  {/* 桌面：水平布局 */}
</div>
```

**侧边栏**：
```tsx
{/* 桌面：固定侧边栏 */}
<aside className="hidden lg:block w-60">
  <Sidebar />
</aside>

{/* 移动端：抽屉式 */}
<Sheet>
  <SheetTrigger>
    <Menu className="lg:hidden" />
  </SheetTrigger>
  <SheetContent side="left">
    <Sidebar />
  </SheetContent>
</Sheet>
```

**充值卡片**：
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 移动端：单列 */}
  {/* 平板：两列 */}
  {/* 桌面：四列 */}
</div>
```

---

## 🎯 性能优化策略

### 1. 代码分割
```typescript
// 路由懒加载
const Editor = lazy(() => import('./pages/Editor'))
const Credits = lazy(() => import('./pages/Credits'))

// 组件懒加载
const RechargeDialog = lazy(() => import('./features/credits/RechargeDialog'))
```

### 2. 图片优化
- 使用 WebP 格式
- 图标使用 SVG（lucide-react）
- 头像使用 CDN + 缩略图

### 3. 缓存策略
- React Query 缓存 API 响应
- LocalStorage 缓存用户偏好（侧边栏状态、主题等）
- Service Worker 缓存静态资源（PWA）

### 4. 虚拟滚动
```typescript
// 论文列表超过100条时使用
import { useVirtualizer } from '@tanstack/react-virtual'
```

---

## 🚨 开发注意事项

### ✅ 推荐做法

1. **暗黑模式可以先不做** - 学术工具白色背景更专业，后期可加
2. **移动端做基础适配** - 重点保证桌面体验
3. **积分消耗要"痛"** - 动效+红色闪烁，提升充值转化率
4. **AI按钮要显眼** - 渐变色+图标，引导用户使用付费功能

### ⚠️ 避免的坑

1. **不要过度设计** - 参考 Google Docs 极简风格
2. **不要所有组件都用动画** - 只在关键交互（充值、AI调用）加动效
3. **不要用复杂状态管理** - Zustand + React Query 足够
4. **不要过早优化** - 先实现功能，再优化性能

---

## 🔗 参考设计

- **编辑器交互**：Notion、Craft
- **整体布局**：Overleaf、Linear
- **配色方案**：GitHub、Vercel
- **动效细节**：Framer、Arc浏览器
