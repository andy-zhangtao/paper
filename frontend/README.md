# Paper AI Assistant - 前端项目

基于 AI 的智能论文写作助手 - 前端应用

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

开发服务器默认运行在: http://localhost:5173

## 📦 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: Tailwind CSS
- **路由**: React Router v6
- **状态管理**: Zustand
- **数据请求**: React Query + Axios
- **UI组件**: shadcn/ui（手动复制组件）
- **动画**: Framer Motion
- **图标**: lucide-react

## 📁 项目结构

```
frontend/
├── src/
│   ├── components/          # UI组件
│   │   ├── ui/             # 基础UI组件（Button, Card等）
│   │   ├── layout/         # 布局组件
│   │   └── common/         # 通用组件
│   │
│   ├── features/           # 业务功能模块
│   │   ├── editor/         # 富文本编辑器
│   │   ├── credits/        # 积分系统
│   │   ├── papers/         # 论文管理
│   │   └── auth/           # 认证相关
│   │
│   ├── hooks/              # 自定义 Hooks
│   ├── stores/             # Zustand 状态管理
│   ├── lib/                # 工具库
│   │   ├── api.ts         # API 客户端
│   │   ├── mock.ts        # Mock 数据
│   │   └── utils.ts       # 工具函数
│   │
│   ├── types/              # TypeScript 类型定义
│   ├── pages/              # 页面组件
│   └── styles/             # 全局样式
│
├── .env                    # 环境变量（本地）
├── .env.example            # 环境变量示例
├── tailwind.config.js      # Tailwind 配置
└── vite.config.ts          # Vite 配置
```

## 🎨 设计风格

- **整体风格**: 现代极简学术风（类似 Notion、Overleaf）
- **主色调**: 蓝灰色系（专业、冷静）
- **强调色**: 紫色（AI、创新感）
- **背景**: 纯白 + 浅灰分层
- **字体**: 系统默认字体栈

详见: [前端设计文档](../docs/09-frontend-design.md)

## 🔧 已完成功能

### ✅ 基础配置
- [x] Vite + React + TypeScript 项目搭建
- [x] Tailwind CSS 样式系统
- [x] 路径别名 `@/*` 配置
- [x] 环境变量配置

### ✅ Mock 数据层
- [x] 类型定义（User, Paper, Credit）
- [x] Mock 数据（用户、论文、积分）
- [x] API 模拟服务（支持完整CRUD）
- [x] 本地状态存储（模拟真实交互）

### ✅ UI 组件
- [x] Button（7种变体 + 3种尺寸）
- [x] Card（完整卡片组件套件）

## 🚧 开发中功能

### 下一步计划
1. [ ] Layout 组件（Navbar + Sidebar）
2. [ ] 富文本编辑器（Tiptap集成）
3. [ ] 积分系统组件（余额显示、充值弹窗）
4. [ ] 论文列表页面
5. [ ] 路由配置（React Router）
6. [ ] 状态管理（Zustand stores）

## 📝 环境变量

创建 `.env` 文件：

```bash
# API 配置
VITE_API_URL=http://localhost:3000/api/v1

# 是否使用 Mock 数据
VITE_USE_MOCK=true
```

**开发阶段**: `VITE_USE_MOCK=true` （使用 Mock 数据）
**生产环境**: `VITE_USE_MOCK=false` （连接真实 API）

## 🎯 Mock 数据说明

当前所有 API 调用都使用 Mock 数据模拟：

### 支持的功能
- ✅ 用户登录/注册（任意邮箱密码）
- ✅ 论文CRUD（创建、读取、更新、删除）
- ✅ 积分查询（余额、流水记录）
- ✅ 充值模拟（支持模拟支付成功）
- ✅ AI功能（润色、翻译，自动扣积分）

### Mock 特性
- 500ms 延迟模拟网络请求
- 本地状态持久化（页面刷新数据重置）
- 完整的错误处理模拟
- 支持乐观更新（积分消耗实时反馈）

## 🛠️ 开发指南

### 添加新组件
```bash
# 在 src/components/ui/ 下创建新组件
touch src/components/ui/dialog.tsx
```

### 添加新页面
```bash
# 在 src/pages/ 下创建新页面
touch src/pages/Dashboard.tsx
```

### 添加 API 接口
```typescript
// 在 src/lib/api.ts 中扩展
export const someApi = {
  async getData(): Promise<Data> {
    if (USE_MOCK) {
      return mockApiResponse(mockData)
    }
    return api.get('/endpoint')
  }
}
```

## 📚 相关文档

- [项目概述](../docs/01-project-overview.md)
- [技术栈](../docs/03-tech-stack.md)
- [前端设计文档](../docs/09-frontend-design.md)
- [API设计](../docs/05-api-design.md)

## 🐛 常见问题

### Q: 为什么页面样式没生效？
A: 确保 `src/index.css` 中导入了 Tailwind：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Q: 路径别名 `@/` 报错？
A: 检查 `tsconfig.app.json` 和 `vite.config.ts` 中的路径配置。

### Q: Mock 数据如何切换到真实 API？
A: 修改 `.env` 文件，将 `VITE_USE_MOCK=false` 并确保后端服务已启动。

## 📄 License

MIT
