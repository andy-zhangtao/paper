# 积分扣除问题修复总结

## 问题描述
用户每次与 LLM 进行交互（论文创建对话）时，应该计算输入/输出 token 所对应的积分消耗，并在积分 <= 0 时停止调用。但实际情况是：**用户每次调用积分都没有变化**。

## 根本原因
`paperCreationController.ts` 中的 `chatWithPrompt` 和 `chatWithPromptStream` 函数在调用 AI 服务后**完全没有积分扣除逻辑**。

### 具体问题点：

1. **`PaperCreationChatResult` 接口缺少必要字段**
   - 原接口只包含 `reply` 和 `state`
   - 缺少 `usage`（token 使用信息）和 `model` 字段
   
2. **`chatCompletion` 和 `chatCompletionStream` 没有返回 token 使用信息**
   - 虽然底层 `callOpenRouter` 函数返回了 `usage` 信息
   - 但这些信息在返回给控制器时被丢弃了

3. **控制器完全没有积分扣除代码**
   - 没有调用 `ensureCreditsActive` 检查积分状态
   - 没有调用 `deductCreditsByTokens` 扣除积分
   - 没有记录 AI 使用日志

### 对比参考
`discussionController.ts` 实现了完整的积分扣除流程：
- ✅ 调用前检查积分状态
- ✅ 调用后根据实际 token 使用扣除积分
- ✅ 记录 AI 使用日志
- ✅ 返回积分消耗信息给前端

## 解决方案

### 1. 修改 `aiService.ts`

#### 1.1 更新 `PaperCreationChatResult` 接口
```typescript
export interface PaperCreationChatResult {
  reply: string
  state?: PaperCreationState
  usage: TokenUsage      // ✅ 新增
  model: string          // ✅ 新增
}
```

#### 1.2 修复 `chatCompletionStream` 函数
- 修复了 `enhancedMessages` 变量声明问题（之前有重复声明）
- 添加 `streamUsage` 变量来捕获流式响应中的 token 使用信息
- 在解析 SSE 数据时捕获 `usage` 字段
- 如果没有 usage 信息，使用字符数估算 token（1 token ≈ 4 字符）
- 返回结果中包含 `usage` 和 `model`

#### 1.3 修复 `chatCompletion` 函数
- 返回结果中包含 `completion.usage` 和 `completion.model`

### 2. 修改 `paperCreationController.ts`

#### 2.1 导入必要的依赖
```typescript
import {
  TokenDeductionResult,
  deductCreditsByTokens,
  getUserCreditStatus,
} from './creditsController'
```

#### 2.2 添加辅助函数
- `handleDeductionFailure()`: 处理积分扣除失败的情况
- `ensureCreditsActive()`: 在调用 AI 前检查用户积分是否可用

#### 2.3 更新 `chatWithPrompt` 函数（非流式）
```typescript
// 1. 检查积分状态
await ensureCreditsActive(userId)

// 2. 调用 AI 服务
const aiResponse = await aiService.chatCompletion(...)

// 3. 扣除积分
const deduction = await deductCreditsByTokens(userId, {
  totalTokens: aiResponse.usage.totalTokens,
  promptTokens: aiResponse.usage.promptTokens,
  completionTokens: aiResponse.usage.completionTokens,
  serviceType: 'paper_creation',
  model: aiResponse.model,
}, '论文创建对话')

// 4. 返回结果（包含积分信息）
return res.json({
  success: true,
  data: {
    reply: aiResponse.reply,
    state: aiResponse.state,
    credits_cost: deduction.cost,           // ✅ 新增
    credits_remaining: deduction.remaining,  // ✅ 新增
    token_usage: aiResponse.usage,          // ✅ 新增
    token_to_credit_ratio: deduction.ratio, // ✅ 新增
  },
})
```

#### 2.4 更新 `chatWithPromptStream` 函数（流式）
```typescript
// 1. 检查积分状态
await ensureCreditsActive(userId)

// 2. 调用 AI 服务并保存结果
const aiResult = await aiService.chatCompletionStream(...)

// 3. 扣除积分
const deduction = await deductCreditsByTokens(...)

// 4. 通过 SSE 发送积分信息
if (!deduction.ok) {
  sendEvent('error', { ... })
} else {
  sendEvent('credits', {
    cost: deduction.cost,
    remaining: deduction.remaining,
    ratio: deduction.ratio,
    usage: aiResult.usage,
  })
}
```

## 修复效果

### 修复前
- ❌ 用户与 LLM 交互后积分不变
- ❌ 没有积分不足检查
- ❌ 没有记录 AI 使用日志
- ❌ 前端无法显示本次消耗和剩余积分

### 修复后
- ✅ 每次交互根据实际 token 使用扣除积分
- ✅ 积分不足或过期时返回 402 错误，阻止调用
- ✅ 自动记录到 `ai_usage_logs` 表
- ✅ 自动记录到 `credit_transactions` 表
- ✅ 前端可以显示：
  - `credits_cost`: 本次消耗的积分
  - `credits_remaining`: 剩余积分
  - `token_usage`: token 使用详情
  - `token_to_credit_ratio`: token 到积分的转换比率

## 错误码说明

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `INSUFFICIENT_CREDITS` | 402 | 积分不足，无法调用 |
| `CREDITS_EXPIRED` | 402 | 积分已过期，需联系管理员 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `AI_SERVICE_ERROR` | 503 | AI 服务不可用 |

## 测试建议

### 1. 正常流程测试
```bash
# 调用论文创建对话 API
curl -X POST http://localhost:3000/api/paper-creation/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "idea",
    "promptId": "<prompt_id>",
    "message": "帮我生成一个关于AI的论文大纲"
  }'

# 检查返回的 credits_cost 和 credits_remaining
# 查询积分余额确认已扣除
curl -X GET http://localhost:3000/api/credits/balance \
  -H "Authorization: Bearer <token>"
```

### 2. 积分不足测试
```sql
-- 将用户积分设为 0
UPDATE users SET credits = 0 WHERE id = '<user_id>';
```
再次调用应返回 402 错误。

### 3. 积分过期测试
```sql
-- 设置积分过期时间为昨天
UPDATE users SET credits_expire_at = NOW() - INTERVAL '1 day' WHERE id = '<user_id>';
```
调用应返回 402 CREDITS_EXPIRED 错误。

### 4. 流水记录测试
```bash
# 查询积分流水
curl -X GET http://localhost:3000/api/credits/transactions \
  -H "Authorization: Bearer <token>"

# 应该看到 type='consume' 的记录
```

### 5. AI 使用日志测试
```sql
-- 查询 AI 使用日志
SELECT * FROM ai_usage_logs 
WHERE user_id = '<user_id>' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 相关文件

- ✅ `/backend/src/services/aiService.ts`
- ✅ `/backend/src/controllers/paperCreationController.ts`
- 📝 `/backend/src/controllers/creditsController.ts`（已存在，未修改）
- 📝 `/backend/src/controllers/discussionController.ts`（参考实现）

## 注意事项

1. **Token 估算**：如果 OpenRouter API 没有返回 usage 信息（在流式响应中可能发生），代码会使用字符数估算：
   - 1 token ≈ 4 字符（英文）
   - 中文可能略有偏差，但足够用于计费

2. **事务一致性**：积分扣除使用数据库事务，确保扣款和记录流水的原子性

3. **日志容错**：AI 使用日志写入失败不会影响主流程（已 try-catch）

4. **流式响应**：流式响应会在 AI 调用完成后才扣除积分，这是合理的，因为只有完成后才知道实际消耗的 token

## 部署建议

1. 先在测试环境验证
2. 检查现有用户的积分余额和过期时间
3. 部署后监控 `ai_usage_logs` 表的写入情况
4. 观察用户反馈，确认积分扣除准确性
