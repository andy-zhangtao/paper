# 技术栈

## 🎨 前端技术栈

### 核心框架
```json
{
  "框架": "React 18 + TypeScript",
  "构建工具": "Vite",
  "样式方案": "TailwindCSS",
  "路由": "React Router v6"
}
```

### 关键库

**富文本编辑器**:
```bash
pnpm install @tiptap/react @tiptap/starter-kit
pnpm install @tiptap/extension-placeholder
pnpm install @tiptap/extension-character-count
```
- 选型理由: 轻量、可扩展、支持协作（预留能力）
- 替代方案: Slate（太底层）、Quill（不够现代）

**状态管理**:
```bash
pnpm install zustand
```
- 选型理由: 比Redux简单、比Context性能好
- 用途: 用户积分、编辑器状态

**数据请求**:
```bash
pnpm install @tanstack/react-query axios
```
- React Query: 缓存、自动重试、乐观更新
- 用途: 积分余额实时同步、AI调用结果缓存

**UI组件**:
```bash
pnpm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm install class-variance-authority clsx tailwind-merge
```
- shadcn/ui 方案（复制组件到项目）
- 优势: 完全可控、无额外依赖

**动画**:
```bash
pnpm install framer-motion
```
- 用途: 充值弹窗、积分消耗动效（提升转化率）

**支付**:
```bash
# 支付宝Web SDK
pnpm install alipay-sdk
```

### 部署方案

**方案A: Vercel（推荐）**
```bash
# 自动部署
vercel --prod

# 国内加速: 配置自定义域名 + 阿里云DNS
```

**方案B: 阿里云OSS + CDN**
```bash
pnpm build
# 上传 dist/ 到 OSS
# CDN域名指向OSS Bucket
```

---

## 🚀 后端技术栈

### 核心框架
```bash
pnpm install @nestjs/core @nestjs/common
pnpm install @nestjs/platform-express
```

**选型理由**:
- 企业级架构（依赖注入、模块化）
- TypeScript原生支持
- 前后端统一语言（降低学习成本）

### 数据库

**PostgreSQL 14**:
```bash
# Docker部署
docker run -d \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:14-alpine

# ORM
pnpm install @nestjs/typeorm typeorm pg
```

**Redis 7**:
```bash
# Docker部署
docker run -d \
  -p 6379:6379 \
  redis:7-alpine

# 客户端
pnpm install @nestjs/redis ioredis
```

**用途划分**:
| 数据库 | 存储内容 |
|--------|----------|
| PostgreSQL | 用户、论文、订单、积分流水 |
| Redis | 积分余额缓存、接口限流、分布式锁 |

### 核心依赖

**任务队列**:
```bash
pnpm install @nestjs/bull bull
pnpm install @types/bull -D
```
- 用途: 异步处理充值回调、发送邮件

**定时任务**:
```bash
pnpm install @nestjs/schedule
```
- 用途: 积分对账、成本统计

**限流**:
```bash
pnpm install @nestjs/throttler
```
- 防刷: 同IP每分钟限10次AI调用

**认证**:
```bash
pnpm install @nestjs/jwt @nestjs/passport
pnpm install passport-jwt bcrypt
```

**LLM SDK**:
```bash
# OpenRouter API (支持多模型)
pnpm install axios
pnpm install https-proxy-agent  # 代理支持
```

**⚠️ 重要：国内访问OpenRouter需要代理**

由于OpenRouter API在国内无法直接访问，所有AI调用必须通过HTTP/HTTPS代理：

```typescript
// src/modules/ai/openrouter.service.ts
import { HttpsProxyAgent } from 'https-proxy-agent'
import axios from 'axios'

export class OpenRouterService {
  private client: AxiosInstance

  constructor() {
    // 从环境变量读取代理配置
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY

    if (!proxyUrl) {
      throw new Error('必须配置代理！请设置 HTTPS_PROXY 环境变量')
    }

    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL,
        'X-Title': 'Paper Assistant'
      },
      httpsAgent: new HttpsProxyAgent(proxyUrl),  // 关键：使用代理
      timeout: 60000
    })
  }

  async complete(prompt: string, model = 'anthropic/claude-3.5-sonnet') {
    const response = await this.client.post('/chat/completions', {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000
    })
    return response.data
  }
}
```

**环境变量配置**（.env文件）:
```bash
# OpenRouter API
OPENROUTER_API_KEY=your_api_key
APP_URL=https://yourapp.com

# 代理配置（必须）
HTTPS_PROXY=http://127.0.0.1:7890  # 本地代理
# 或使用服务器代理
# HTTPS_PROXY=http://proxy.example.com:8080
```

**本地开发代理方案**:
1. **Clash/ClashX**: 开启系统代理，端口通常为7890
2. **V2Ray**: 配置HTTP代理端口
3. **验证代理**:
   ```bash
   curl -x http://127.0.0.1:7890 https://openrouter.ai
   ```

**生产环境代理方案**:
1. **服务器自建代理**: 在海外VPS搭建Squid/Tinyproxy
2. **云服务商代理**: 使用阿里云/腾讯云的海外节点转发
3. **代理池**: 配置多个代理地址，自动切换

**对象存储**:
```bash
pnpm install ali-oss
```

### 部署方案

**阿里云ECS**:
```yaml
配置: 2核4G（起步）
系统: Ubuntu 22.04
Docker: 容器化部署
Nginx: 反向代理 + SSL
PM2: Node进程管理
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  app:
    image: node:18-alpine
    volumes:
      - ./:/app
    ports:
      - "3000:3000"

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine
```

---

## 🛠️ DevOps工具链

### 代码质量
```bash
# ESLint + Prettier
pnpm install -D eslint prettier
pnpm install -D @typescript-eslint/parser

# Git Hooks
pnpm install -D husky lint-staged
```

### 监控告警

**错误追踪**:
```bash
pnpm install @sentry/node @sentry/react
```

**日志**:
```bash
pnpm install winston
# 推送到阿里云SLS
```

**性能监控**:
```bash
# 自建Prometheus + Grafana
# 或使用阿里云ARMS
```

---

## 📦 项目结构

```
paper/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── components/      # UI组件
│   │   ├── features/        # 业务模块
│   │   │   ├── editor/      # 编辑器
│   │   │   ├── credits/     # 积分系统
│   │   │   └── payment/     # 充值
│   │   ├── hooks/           # 自定义Hooks
│   │   ├── stores/          # Zustand状态
│   │   └── utils/           # 工具函数
│   └── package.json
│
├── backend/                  # 后端项目
│   ├── src/
│   │   ├── modules/
│   │   │   ├── user/        # 用户模块
│   │   │   ├── paper/       # 论文模块
│   │   │   ├── credits/     # 积分模块
│   │   │   ├── ai/          # AI服务
│   │   │   └── payment/     # 支付模块
│   │   ├── common/          # 公共模块
│   │   │   ├── guards/      # 守卫
│   │   │   ├── filters/     # 异常过滤
│   │   │   └── interceptors/# 拦截器
│   │   └── config/          # 配置
│   └── package.json
│
├── docs/                     # 文档
└── docker-compose.yml       # 本地开发环境
```

---

## 🔐 安全方案

### 密码加密
```typescript
import * as bcrypt from 'bcrypt'

// 注册时
const hash = await bcrypt.hash(password, 10)

// 登录时
const isMatch = await bcrypt.compare(password, user.password_hash)
```

### JWT认证
```typescript
// 生成Token
const payload = { sub: user.id, email: user.email }
const access_token = jwt.sign(payload, 'secret', { expiresIn: '7d' })
const refresh_token = jwt.sign(payload, 'secret', { expiresIn: '30d' })
```

### 敏感数据加密（论文内容）
```typescript
import * as crypto from 'crypto'

// AES-256-GCM加密
const algorithm = 'aes-256-gcm'
const key = crypto.scryptSync(process.env.ENCRYPT_KEY, 'salt', 32)
```

### 接口防刷
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 60秒内限10次
@Post('ai/polish')
async polish() {}
```

---

## 📊 性能优化

### 前端
- **代码分割**: React.lazy() + Suspense
- **图片优化**: WebP格式 + CDN
- **缓存策略**: React Query缓存AI结果
- **虚拟滚动**: 论文列表用react-window

### 后端
- **数据库索引**: user_id、created_at
- **Redis缓存**: 用户积分（TTL 5分钟）
- **连接池**: PostgreSQL连接复用
- **CDN加速**: 静态资源、API响应（可缓存的）

### LLM调用优化
```typescript
// 缓存相同内容的结果
const cacheKey = `ai:${md5(text + type)}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// 调用后缓存24小时
await redis.setex(cacheKey, 86400, JSON.stringify(result))
```
