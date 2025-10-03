# API设计总结

## ✅ 已完成

### 1. OpenAPI 3.0规范文档
- **文件**: `api/openapi.yaml`
- **内容**: 21个核心接口的完整定义
- **特点**:
  - 完整的Schema定义
  - 请求/响应示例
  - 错误码规范
  - 支持Swagger/Apifox导入

### 2. API使用文档
- **文件**: `api/README.md`
- **包含**:
  - 接口清单
  - 认证流程
  - 业务流程图
  - 测试用例
  - Mock配置
  - 代码生成指南

### 3. 测试工具
- **Shell脚本**: `api/test-api.sh`
  - 一键测试核心流程
  - 自动化验证
  - 彩色输出

- **REST Client**: `api/examples/auth.http`
  - VSCode插件支持
  - 20+接口示例

### 4. 环境配置
- `api/environments/local.json` - 本地开发
- `api/environments/production.json` - 生产环境

---

## 📊 接口统计

| 模块 | 接口数 | 说明 |
|------|--------|------|
| 认证 | 3 | 注册、登录、刷新Token |
| 积分 | 2 | 余额查询、流水记录 |
| 论文 | 5 | CRUD + 列表 |
| AI服务 | 5 | 润色、大纲、语法、文献、降重 |
| 支付 | 3 | 订单、查询、回调 |
| 运营 | 3 | 签到、邀请 |
| **总计** | **21** | - |

---

## 🔑 核心设计

### 1. 认证机制
```yaml
方案: JWT Bearer Token
流程:
  1. 注册/登录 → 获取 access_token + refresh_token
  2. 请求接口 → Header: Authorization: Bearer <token>
  3. Token过期 → 使用refresh_token刷新

Token配置:
  - access_token: 7天有效期
  - refresh_token: 30天有效期
```

### 2. 积分扣费流程
```yaml
核心逻辑:
  1. 检查余额（带分布式锁）
  2. 预扣积分
  3. 调用LLM API（通过代理）
  4. 成功 → 记录日志
  5. 失败 → 自动退款

防并发:
  - Redis分布式锁
  - 数据库CHECK约束（credits >= 0）
  - 乐观锁（version字段）
```

### 3. 错误码体系
```yaml
401 UNAUTHORIZED: 未登录/Token失效
402 INSUFFICIENT_CREDITS: 积分不足
403 FORBIDDEN: 无权限
404 NOT_FOUND: 资源不存在
409 CONFLICT: 冲突（如重复签到）
429 RATE_LIMIT_EXCEEDED: 限流
500 INTERNAL_ERROR: 服务器错误
503 AI_SERVICE_ERROR: LLM服务不可用
```

### 4. 响应格式
```json
// 成功
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

// 失败
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "积分不足",
    "details": { ... }
  }
}
```

---

## 🧪 如何使用

### 方式1: Apifox（推荐）
```bash
1. 下载Apifox
2. 新建项目 → 导入数据 → 选择 api/openapi.yaml
3. 自动生成Mock服务器
4. 配置环境变量（使用 api/environments/local.json）
5. 开始测试
```

### 方式2: Swagger UI
```bash
# 安装
npm install -g swagger-ui-watcher

# 启动
swagger-ui-watcher api/openapi.yaml

# 访问
http://localhost:8080
```

### 方式3: VSCode REST Client
```bash
1. 安装插件: REST Client
2. 打开文件: api/examples/auth.http
3. 点击"Send Request"按钮
```

### 方式4: Shell脚本
```bash
# 一键测试所有流程
./api/test-api.sh

# 输出:
# ✓ 注册成功，获得100初始积分
# ✓ 积分余额正确
# ✓ 论文创建成功
# ✓ AI润色成功，消耗15积分
```

---

## 📋 前端对接清单

### 必须实现的接口
- [x] POST /auth/register - 注册
- [x] POST /auth/login - 登录
- [x] GET /credits/balance - 查询积分
- [x] POST /papers - 创建论文
- [x] PATCH /papers/:id - 保存论文
- [x] POST /ai/polish - AI润色
- [x] POST /payment/orders - 创建订单

### 可选接口
- [ ] POST /user/checkin - 签到
- [ ] GET /user/invite-code - 邀请
- [ ] POST /ai/generate-outline - 生成大纲
- [ ] POST /ai/check-grammar - 语法检查

---

## 🔧 后端实现清单

### Day 1-2: 基础框架
- [ ] NestJS项目初始化
- [ ] TypeORM配置
- [ ] Redis配置
- [ ] JWT认证模块
- [ ] 全局异常过滤器
- [ ] 响应拦截器

### Day 3-4: 认证+积分
- [ ] User模块（注册/登录）
- [ ] Credits模块（查询/扣费/流水）
- [ ] 分布式锁实现
- [ ] 单元测试

### Day 5-7: 论文+AI
- [ ] Paper模块（CRUD）
- [ ] OpenRouter Service（含代理）
- [ ] AI模块（润色/大纲/语法）
- [ ] 成本日志记录

### Day 8-10: 支付+运营
- [ ] Payment模块（支付宝）
- [ ] 支付回调处理
- [ ] Checkin模块（签到）
- [ ] Invite模块（邀请）

### Day 11-14: 测试+优化
- [ ] 接口自动化测试
- [ ] 并发测试（积分扣费）
- [ ] 性能优化
- [ ] API文档部署

---

## 🚀 下一步

### 1. 生成代码（可选）
```bash
# 生成TypeScript客户端
npx @openapitools/openapi-generator-cli generate \
  -i api/openapi.yaml \
  -g typescript-axios \
  -o frontend/src/api/generated

# 生成NestJS DTO
npx @nestjs/swagger-codegen \
  --spec api/openapi.yaml \
  --output backend/src/generated
```

### 2. 部署文档
```bash
# 方式1: Swagger UI
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/api/openapi.yaml \
  -v $(pwd)/api:/api \
  swaggerapi/swagger-ui

# 方式2: Redoc
npx @redocly/cli build-docs api/openapi.yaml \
  --output docs/api.html
```

### 3. Mock服务器
```bash
# 使用Prism
npx @stoplight/prism-cli mock api/openapi.yaml

# Mock地址
http://localhost:4010
```

---

## 📝 注意事项

### 1. 代理配置
**国内开发必须配置代理访问OpenRouter API**
- 本地: Clash/V2Ray (端口7890)
- 生产: 自建Squid代理
- 详见: `docs/08-proxy-setup.md`

### 2. 积分扣费
**必须使用分布式锁防止并发超卖**
```typescript
const lock = await redis.lock(`lock:credits:${userId}`)
try {
  // 扣费逻辑
} finally {
  await lock.release()
}
```

### 3. 错误处理
**AI调用失败必须退款**
```typescript
try {
  await deductCredits(15)
  const result = await llm.complete()
  return result
} catch (err) {
  await refundCredits(15, 'AI调用失败')
  throw err
}
```

### 4. 支付回调
**必须验签 + 幂等性**
```typescript
// 验签
const isValid = verifyAlipaySign(params)
if (!isValid) return

// 幂等性（防止重复处理）
const lock = await redis.lock(`lock:order:${orderId}`)
if (order.status === 'paid') return 'success'
```

---

## 🎯 验收标准

### 功能验收
- [ ] 所有21个接口可正常调用
- [ ] 积分扣费正确（无超卖）
- [ ] AI调用成功（通过代理）
- [ ] 支付流程完整（含回调）
- [ ] 错误处理完善

### 性能验收
- [ ] 查询类接口 <200ms
- [ ] AI接口 <5s
- [ ] 支付接口 <1s
- [ ] 并发100无异常

### 文档验收
- [ ] Swagger可访问
- [ ] Apifox可导入
- [ ] 示例可运行
- [ ] Mock可用

---

## 📊 进度追踪

```
✅ API设计完成（100%）
⏳ 后端实现（0%）
⏳ 前端对接（0%）
⏳ 测试验收（0%）
```

**当前状态**: API设计已完成，可开始后端开发

**下一步**: 初始化NestJS项目 + TypeORM配置

---

## 🔗 相关链接

- [OpenAPI规范](api/openapi.yaml)
- [使用文档](api/README.md)
- [测试脚本](api/test-api.sh)
- [环境配置](api/environments/)
- [请求示例](api/examples/auth.http)
- [项目文档](../docs/)

---

**最后更新**: 2025-01-XX
**提交记录**: `git log --oneline feature/api-implementation`
