# API设计

## 🌐 接口规范

### Base URL
```
开发环境: http://localhost:3000/api
生产环境: https://api.yourproject.com/api
```

### 通用响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "积分不足",
    "details": {
      "required": 15,
      "current": 5
    }
  }
}
```

### 认证方式

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 📋 接口列表

### 1. 用户认证

#### 1.1 注册
```http
POST /auth/register
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "StrongPass123!",
  "phone": "13800138000" // 可选
}

Response 201:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@university.edu",
      "credits": 100
    },
    "tokens": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_in": 604800
    }
  }
}
```

#### 1.2 登录
```http
POST /auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "StrongPass123!"
}

Response 200:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... }
  }
}
```

#### 1.3 刷新Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}

Response 200:
{
  "success": true,
  "data": {
    "access_token": "new_token",
    "expires_in": 604800
  }
}
```

---

### 2. 积分管理

#### 2.1 查询余额
```http
GET /credits/balance
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "credits": 285,
    "is_vip": false
  }
}
```

#### 2.2 积分流水
```http
GET /credits/transactions?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "consume",
        "amount": -15,
        "balance_after": 285,
        "description": "段落润色",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20
    }
  }
}
```

---

### 3. 论文管理

#### 3.1 创建论文
```http
POST /papers
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "人工智能伦理研究",
  "content": {
    "type": "doc",
    "content": []
  }
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "人工智能伦理研究",
    "word_count": 0,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

#### 3.2 论文列表
```http
GET /papers?page=1&limit=10&tag=毕业论文
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "...",
        "word_count": 3500,
        "tags": ["毕业论文"],
        "updated_at": "2025-01-15T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

#### 3.3 获取论文详情
```http
GET /papers/:id
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "...",
    "content": { ... },
    "word_count": 3500,
    "tags": [],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### 3.4 更新论文
```http
PATCH /papers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "新标题",
  "content": { ... },
  "tags": ["毕业论文", "AI伦理"]
}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "updated_at": "2025-01-15T11:00:00Z"
  }
}
```

#### 3.5 删除论文
```http
DELETE /papers/:id
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "论文已删除"
}
```

---

### 4. AI功能（核心）

#### 4.1 段落润色
```http
POST /ai/polish
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "本文探讨了人工智能在教育领域的应用...",
  "type": "grammar" // 'grammar' | 'logic' | 'style'
}

Response 200:
{
  "success": true,
  "data": {
    "original": "本文探讨了...",
    "polished": "本研究系统分析了...",
    "changes": [
      {
        "type": "grammar",
        "position": [0, 10],
        "suggestion": "学术用语建议使用'研究'代替'探讨'"
      }
    ],
    "credits_cost": 15,
    "credits_remaining": 285
  }
}

Error 402: // 积分不足
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "积分不足，请充值",
    "details": {
      "required": 15,
      "current": 5
    }
  }
}
```

#### 4.2 生成大纲
```http
POST /ai/generate-outline
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "人工智能伦理",
  "paper_type": "research" // 'research' | 'review' | 'thesis'
}

Response 200:
{
  "success": true,
  "data": {
    "outline": {
      "title": "人工智能伦理研究",
      "sections": [
        {
          "heading": "引言",
          "subsections": [
            "研究背景",
            "研究意义"
          ]
        },
        {
          "heading": "文献综述",
          "subsections": [ ... ]
        }
      ]
    },
    "credits_cost": 10,
    "credits_remaining": 290
  }
}
```

#### 4.3 语法检查
```http
POST /ai/check-grammar
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "全文内容...",
  "level": "strict" // 'basic' | 'standard' | 'strict'
}

Response 200:
{
  "success": true,
  "data": {
    "errors": [
      {
        "type": "spelling",
        "position": [120, 125],
        "original": "artifical",
        "suggestion": "artificial",
        "severity": "error"
      },
      {
        "type": "grammar",
        "position": [340, 360],
        "original": "这些技术被应用于各个领域",
        "suggestion": "这些技术应用于各个领域",
        "severity": "warning"
      }
    ],
    "credits_cost": 20,
    "credits_remaining": 280
  }
}
```

#### 4.4 参考文献生成
```http
POST /ai/generate-references
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "深度学习",
  "count": 10,
  "format": "gb7714" // 'gb7714' | 'apa' | 'mla'
}

Response 200:
{
  "success": true,
  "data": {
    "references": [
      {
        "authors": ["Goodfellow, I.", "Bengio, Y.", "Courville, A."],
        "title": "Deep Learning",
        "year": 2016,
        "publisher": "MIT Press",
        "formatted": "Goodfellow I, Bengio Y, Courville A. Deep Learning[M]. MIT Press, 2016."
      }
    ],
    "credits_cost": 10,
    "credits_remaining": 290
  }
}
```

#### 4.5 降重改写
```http
POST /ai/rewrite
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "需要降重的段落...",
  "similarity_threshold": 0.3 // 目标相似度
}

Response 200:
{
  "success": true,
  "data": {
    "original": "...",
    "rewritten": "...",
    "similarity": 0.25, // 改写后与原文的相似度
    "credits_cost": 50,
    "credits_remaining": 250
  }
}
```

---

### 5. 讨论区

#### 5.1 提问
```http
POST /papers/:paperId/discussions
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "这段逻辑是否有问题？",
  "context_text": "选中的段落内容..." // 可选
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "question": "...",
    "ai_reply": "该段落逻辑清晰，但建议增加过渡句...",
    "credits_cost": 20,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

#### 5.2 讨论列表
```http
GET /papers/:paperId/discussions
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "question": "...",
      "ai_reply": "...",
      "created_at": "..."
    }
  ]
}
```

---

### 6. 版本管理

#### 6.1 保存版本
```http
POST /papers/:paperId/versions
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": { ... }, // 当前内容
  "manual": true // 手动保存还是自动保存
}

Response 201:
{
  "success": true,
  "data": {
    "version_id": "uuid",
    "change_summary": "修改了引言部分，优化了逻辑结构", // AI生成
    "created_at": "..."
  }
}
```

#### 6.2 版本列表
```http
GET /papers/:paperId/versions
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "change_summary": "...",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### 6.3 版本对比
```http
GET /papers/:paperId/versions/compare?from=uuid1&to=uuid2
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "diff": [
      {
        "type": "add",
        "content": "新增段落..."
      },
      {
        "type": "delete",
        "content": "删除的内容..."
      },
      {
        "type": "modify",
        "old": "原内容",
        "new": "新内容"
      }
    ]
  }
}
```

#### 6.4 回滚版本
```http
POST /papers/:paperId/versions/:versionId/restore
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "已回滚至该版本"
}
```

---

### 7. 充值支付

#### 7.1 创建订单
```http
POST /payment/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "package": "standard" // 'basic' | 'standard' | 'premium'
}

Response 201:
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "amount_yuan": 29.9,
    "credits": 2000,
    "payment_url": "https://openapi.alipay.com/...", // 支付宝支付链接
    "qr_code": "data:image/png;base64,..." // 二维码（可选）
  }
}
```

#### 7.2 查询订单状态
```http
GET /payment/orders/:orderId
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "status": "paid", // 'pending' | 'paid' | 'failed'
    "amount_yuan": 29.9,
    "credits": 2000,
    "paid_at": "2025-01-15T10:05:00Z"
  }
}
```

#### 7.3 支付回调（支付宝通知）
```http
POST /payment/callback/alipay
Content-Type: application/x-www-form-urlencoded

// 支付宝POST的参数
out_trade_no=order_uuid&trade_status=TRADE_SUCCESS&...

Response 200:
success // 返回固定字符串
```

---

### 8. 运营功能

#### 8.1 每日签到
```http
POST /user/checkin
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "credits_earned": 5,
    "credits_total": 305,
    "streak_days": 7 // 连续签到天数
  }
}

Error 409: // 今日已签到
{
  "success": false,
  "error": {
    "code": "ALREADY_CHECKED_IN",
    "message": "今日已签到"
  }
}
```

#### 8.2 生成邀请码
```http
GET /user/invite-code
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "code": "ABC123XYZ",
    "invite_url": "https://app.yourproject.com/register?invite=ABC123XYZ",
    "rewards": {
      "inviter": 100, // 邀请人奖励
      "invitee": 50   // 被邀请人奖励
    }
  }
}
```

#### 8.3 使用邀请码
```http
POST /user/redeem-invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "ABC123XYZ"
}

Response 200:
{
  "success": true,
  "data": {
    "credits_earned": 50,
    "credits_total": 150
  }
}
```

---

## 🔐 错误码规范

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| `UNAUTHORIZED` | 401 | 未登录或Token失效 |
| `FORBIDDEN` | 403 | 无权限访问 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `INSUFFICIENT_CREDITS` | 402 | 积分不足 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求过于频繁 |
| `VALIDATION_ERROR` | 400 | 参数校验失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `AI_SERVICE_ERROR` | 503 | LLM服务不可用 |
| `PAYMENT_FAILED` | 400 | 支付失败 |

---

## 🚀 接口限流策略

### 免费用户
```
AI接口: 10次/分钟
上传图片: 5次/分钟
创建论文: 20次/小时
```

### VIP用户
```
AI接口: 30次/分钟
上传图片: 20次/分钟
创建论文: 无限制
```

### 实现方式
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 60秒内限10次
async polishText() {}
```

---

## 📊 日志规范

每个请求记录:
```json
{
  "request_id": "uuid",
  "user_id": "uuid",
  "method": "POST",
  "path": "/ai/polish",
  "status": 200,
  "duration_ms": 1250,
  "ip": "123.45.67.89",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

AI调用额外记录:
```json
{
  "action_type": "polish_grammar",
  "input_tokens": 150,
  "output_tokens": 200,
  "cost_yuan": 0.007,
  "credits_cost": 15
}
```
