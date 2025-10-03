# OpenRouter API代理配置指南

## ⚠️ 为什么需要代理

OpenRouter API（`https://openrouter.ai`）在国内无法直接访问，必须通过代理才能调用。

---

## 🔧 本地开发环境配置

### 方案1: 使用Clash/ClashX（推荐）

**步骤**:
1. 启动Clash，开启系统代理
2. 查看代理端口（默认7890）
3. 配置环境变量

```bash
# .env.development
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
OPENROUTER_API_KEY=your_api_key_here
APP_URL=http://localhost:5173
```

**验证代理可用**:
```bash
# 测试代理连接
curl -x http://127.0.0.1:7890 https://openrouter.ai/api/v1/models

# 应返回模型列表JSON
```

---

### 方案2: 使用V2Ray

**步骤**:
1. 启动V2Ray客户端
2. 开启HTTP代理模式
3. 记录端口号（如10809）

```bash
# .env.development
HTTPS_PROXY=http://127.0.0.1:10809
HTTP_PROXY=http://127.0.0.1:10809
```

---

### 方案3: 全局代理（不推荐）

```bash
# macOS/Linux 全局代理
export HTTPS_PROXY=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890

# Windows PowerShell
$env:HTTPS_PROXY="http://127.0.0.1:7890"
$env:HTTP_PROXY="http://127.0.0.1:7890"
```

**缺点**: 影响所有网络请求，可能导致国内API变慢

---

## 🚀 生产环境配置

### 方案1: 自建海外代理服务器（推荐）

**架构**:
```
国内服务器 → 海外VPS代理 → OpenRouter API
```

**步骤**:

#### 1. 在海外VPS搭建Squid代理

```bash
# 使用腾讯云香港/AWS新加坡等节点
# SSH登录海外VPS

# 安装Squid
apt update && apt install squid -y

# 配置Squid
cat > /etc/squid/squid.conf <<EOF
# 监听端口
http_port 3128

# 允许的IP（你的国内服务器IP）
acl allowed_ips src 123.45.67.89/32

# 只允许HTTPS连接
acl SSL_ports port 443
acl CONNECT method CONNECT

# 访问规则
http_access allow allowed_ips
http_access allow localhost
http_access deny all

# 日志
access_log /var/log/squid/access.log
EOF

# 启动Squid
systemctl restart squid
systemctl enable squid
```

#### 2. 国内服务器配置

```bash
# .env.production
HTTPS_PROXY=http://your-overseas-vps-ip:3128
HTTP_PROXY=http://your-overseas-vps-ip:3128
OPENROUTER_API_KEY=your_api_key
APP_URL=https://yourapp.com
```

#### 3. 防火墙配置

```bash
# 海外VPS开放3128端口（仅允许国内服务器IP）
ufw allow from 123.45.67.89 to any port 3128
```

**优点**:
- 稳定可控
- 延迟低（选择临近节点）
- 成本可控（轻量VPS约$5/月）

---

### 方案2: 使用CloudFlare Workers转发

**架构**:
```
国内服务器 → CloudFlare Worker → OpenRouter API
```

**步骤**:

#### 1. 创建CloudFlare Worker

```javascript
// worker.js
export default {
  async fetch(request, env) {
    // 验证请求来源
    const authHeader = request.headers.get('X-API-Key')
    if (authHeader !== env.SECRET_KEY) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 转发到OpenRouter
    const url = new URL(request.url)
    const targetUrl = `https://openrouter.ai${url.pathname}${url.search}`

    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })

    return fetch(modifiedRequest)
  }
}
```

#### 2. 部署Worker

```bash
# 安装wrangler
npm install -g wrangler

# 登录
wrangler login

# 部署
wrangler publish
```

#### 3. 国内服务器配置

```typescript
// src/modules/ai/openrouter.service.ts
export class OpenRouterService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: 'https://your-worker.workers.dev', // CloudFlare Worker地址
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'X-API-Key': process.env.WORKER_SECRET_KEY
      },
      timeout: 60000
      // 不需要httpsAgent，直接访问Worker
    })
  }
}
```

**优点**:
- 完全免费
- 全球CDN加速
- 无需维护服务器

**缺点**:
- 有请求次数限制（免费版10万次/天）
- 冷启动延迟

---

### 方案3: 阿里云/腾讯云海外节点

**架构**:
```
国内ECS → 海外ECS → OpenRouter API
```

**步骤**:

#### 1. 购买海外轻量服务器
- 阿里云香港/新加坡节点
- 配置：1核1G即可（约¥24/月）

#### 2. 配置内网穿透（可选）
```bash
# 使用frp等工具打通内网
# 或直接公网IP + 安全组限制
```

#### 3. 参考方案1配置Squid

---

## 🔒 代理安全配置

### 1. IP白名单

```bash
# Squid配置
acl allowed_ips src 123.45.67.89/32  # 只允许你的服务器
http_access allow allowed_ips
http_access deny all
```

### 2. 认证（可选）

```bash
# 创建密码文件
htpasswd -c /etc/squid/passwd proxyuser

# Squid配置
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
acl authenticated proxy_auth REQUIRED
http_access allow authenticated
```

```bash
# .env配置
HTTPS_PROXY=http://proxyuser:password@proxy-ip:3128
```

### 3. 流量监控

```bash
# 定期检查代理日志
tail -f /var/log/squid/access.log

# 异常流量告警
grep "TCP_DENIED" /var/log/squid/access.log | wc -l
```

---

## 🧪 代理测试脚本

### 测试连接

```typescript
// scripts/test-proxy.ts
import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'

async function testProxy() {
  const proxyUrl = process.env.HTTPS_PROXY

  if (!proxyUrl) {
    console.error('❌ 未配置代理')
    process.exit(1)
  }

  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      timeout: 10000
    })

    console.log('✅ 代理连接成功！')
    console.log(`📊 可用模型数: ${response.data.data.length}`)
    console.log(`🌐 代理地址: ${proxyUrl}`)
  } catch (err) {
    console.error('❌ 代理连接失败:', err.message)
    process.exit(1)
  }
}

testProxy()
```

**运行测试**:
```bash
tsx scripts/test-proxy.ts
```

---

## 🛠️ 代理失败排查

### 问题1: Connection refused

**原因**: 代理服务未启动或端口错误

**解决**:
```bash
# 检查代理进程
ps aux | grep clash  # 或 squid/v2ray

# 检查端口
netstat -an | grep 7890

# 重启代理
systemctl restart squid
```

---

### 问题2: Timeout

**原因**: 防火墙/安全组限制

**解决**:
```bash
# 检查防火墙
ufw status

# 开放端口
ufw allow 3128

# 云服务器检查安全组规则
```

---

### 问题3: 407 Proxy Authentication Required

**原因**: 代理需要认证但未提供

**解决**:
```bash
# .env添加认证
HTTPS_PROXY=http://username:password@proxy-ip:3128
```

---

## 📊 成本对比

| 方案 | 月成本 | 稳定性 | 维护难度 | 推荐度 |
|------|--------|--------|----------|--------|
| 本地Clash | ¥0 | 中 | 低 | ⭐⭐⭐ (仅开发) |
| 海外VPS自建 | ¥30-50 | 高 | 中 | ⭐⭐⭐⭐⭐ |
| CloudFlare Workers | ¥0 | 高 | 低 | ⭐⭐⭐⭐ |
| 云服务商海外节点 | ¥50-100 | 高 | 低 | ⭐⭐⭐⭐ |

---

## ✅ 最佳实践

### 开发环境
```bash
# .env.development
HTTPS_PROXY=http://127.0.0.1:7890  # 本地Clash
OPENROUTER_API_KEY=sk-or-xxx
APP_URL=http://localhost:5173
```

### 生产环境
```bash
# .env.production
HTTPS_PROXY=http://your-vps-ip:3128  # 自建代理
OPENROUTER_API_KEY=sk-or-xxx
APP_URL=https://yourapp.com
```

### 代码中的代理配置

```typescript
// src/modules/ai/openrouter.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'

@Injectable()
export class OpenRouterService implements OnModuleInit {
  private client: AxiosInstance

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const proxyUrl = this.configService.get('HTTPS_PROXY')
    const apiKey = this.configService.get('OPENROUTER_API_KEY')
    const appUrl = this.configService.get('APP_URL')

    // 启动时检查配置
    if (!proxyUrl) {
      throw new Error('❌ 必须配置 HTTPS_PROXY 环境变量')
    }

    if (!apiKey) {
      throw new Error('❌ 必须配置 OPENROUTER_API_KEY')
    }

    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': appUrl,
        'X-Title': 'Paper Assistant'
      },
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      timeout: 60000
    })

    // 添加请求日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
      this.client.interceptors.request.use(config => {
        console.log(`📤 [OpenRouter] ${config.method.toUpperCase()} ${config.url}`)
        return config
      })

      this.client.interceptors.response.use(
        response => {
          console.log(`📥 [OpenRouter] ${response.status} ${response.config.url}`)
          return response
        },
        error => {
          console.error(`❌ [OpenRouter] ${error.message}`)
          throw error
        }
      )
    }
  }

  async complete(prompt: string, model = 'anthropic/claude-3.5-sonnet') {
    try {
      const response = await this.client.post('/chat/completions', {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000
      })

      return {
        text: response.data.choices[0].message.content,
        usage: response.data.usage
      }
    } catch (error) {
      // 代理错误特殊处理
      if (error.code === 'ECONNREFUSED') {
        throw new Error('代理连接失败，请检查 HTTPS_PROXY 配置')
      }
      throw error
    }
  }
}
```

---

## 🔄 代理自动切换（高级）

### 代理池配置

```typescript
// src/modules/ai/proxy-pool.service.ts
@Injectable()
export class ProxyPoolService {
  private proxies: string[]
  private currentIndex = 0

  constructor() {
    this.proxies = [
      process.env.PROXY_1,
      process.env.PROXY_2,
      process.env.PROXY_3
    ].filter(Boolean)
  }

  getNextProxy(): string {
    if (this.proxies.length === 0) {
      throw new Error('没有可用代理')
    }

    const proxy = this.proxies[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length

    return proxy
  }

  async testProxy(proxyUrl: string): Promise<boolean> {
    try {
      await axios.get('https://openrouter.ai', {
        httpsAgent: new HttpsProxyAgent(proxyUrl),
        timeout: 5000
      })
      return true
    } catch {
      return false
    }
  }

  async getHealthyProxy(): Promise<string> {
    for (const proxy of this.proxies) {
      if (await this.testProxy(proxy)) {
        return proxy
      }
    }
    throw new Error('所有代理不可用')
  }
}
```

---

## 📝 常见问题

**Q: 代理会影响性能吗？**
A: 会增加50-200ms延迟，选择临近节点（如香港）可降低延迟。

**Q: 代理配置错误会导致什么？**
A: 无法调用OpenRouter API，所有AI功能失效。

**Q: 如何监控代理状态？**
A: 使用定时任务定期请求OpenRouter健康检查接口。

**Q: 代理认证信息会泄露吗？**
A: 使用环境变量存储，不要提交到Git，生产环境使用密钥管理服务。
