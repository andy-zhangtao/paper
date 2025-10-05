# 配置说明文档

本项目已将所有业务参数统一管理在配置文件中,避免硬编码,方便灵活调整。

## 📁 配置文件位置

- **代码配置**: [src/config/constants.ts](src/config/constants.ts) - 所有业务常量定义
- **环境变量**: [.env](.env) 或 [.env.example](.env.example) - 运行时配置

---

## 🎯 核心配置项

### 1. 积分扣费比例 (TOKEN_TO_CREDIT_RATIO)

系统按「Token × 比例」扣除积分，管理员可在后台随时调整。

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| Token积分换算 | `DEFAULT_TOKEN_TO_CREDIT_RATIO` | 1 | 用于初始化 `credit_settings` 表的默认比例 |

**说明**:
- 管理后台 → 积分设置 支持图形界面调整，保存后立即生效。
- 接口会返回 `token_usage` 和 `token_to_credit_ratio`，便于前端明细展示。
- 若需要按功能区分倍率，可在业务层基于 Token 使用量再附加系数。

---

### 2. 运营奖励 (REWARDS)

| 奖励类型 | 环境变量 | 默认值 | 说明 |
|----------|----------|--------|------|
| 注册奖励 | `REWARD_REGISTRATION` | 100 | 新用户注册 |
| 每日签到 | `REWARD_DAILY_CHECKIN` | 5 | 每天签到 |
| 邀请人奖励 | `REWARD_INVITER` | 100 | 邀请好友 |
| 被邀请人奖励 | `REWARD_INVITEE` | 50 | 使用邀请码 |

**调整建议**:
- 冷启动期可提高注册/邀请奖励
- 活跃用户培养期可提高签到奖励
- 连续签到N天可增加额外奖励(见签到配置)

---

### 3. AI模型配置 (AI_MODELS)

| 模型类型 | 环境变量 | 默认值 | 适用场景 |
|----------|----------|--------|----------|
| 默认模型 | `OPENROUTER_MODEL_DEFAULT` | `openai/gpt-3.5-turbo` | 日常任务 |
| 高级模型 | `OPENROUTER_MODEL_PREMIUM` | `openai/gpt-4-turbo` | 降重、参考文献 |
| 廉价模型 | `OPENROUTER_MODEL_CHEAP` | `openai/gpt-3.5-turbo` | 预留 |

**调整建议**:
- 可替换为更便宜的模型如 `anthropic/claude-3-haiku`
- 高级功能使用premium模型保证质量
- 根据OpenRouter支持的模型列表选择

---

### 4. AI调用参数 (AI_PARAMS)

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| Temperature | `AI_TEMPERATURE` | 0.7 | 创造性(0-1) |
| 最大Token | `AI_MAX_TOKENS` | 2000 | 单次输出上限 |
| 超时时间 | `AI_TIMEOUT` | 30000 | 30秒(毫秒) |

---

### 5. 限流配置 (RATE_LIMITS)

#### 免费用户
```env
RATE_LIMIT_FREE_AI=10        # AI接口 10次/分钟
RATE_LIMIT_FREE_UPLOAD=5     # 上传 5次/分钟
RATE_LIMIT_FREE_PAPER=20     # 创建论文 20次/小时
```

#### VIP用户
```env
RATE_LIMIT_VIP_AI=30         # AI接口 30次/分钟
RATE_LIMIT_VIP_UPLOAD=20     # 上传 20次/分钟
RATE_LIMIT_VIP_PAPER=-1      # 创建论文 无限制
```

---

### 6. 文本长度限制 (TEXT_LIMITS)

防止恶意请求,控制成本:

```env
LIMIT_PAPER_TITLE=200          # 论文标题 200字
LIMIT_POLISH_TEXT=5000         # 润色段落 5000字
LIMIT_GRAMMAR_TEXT=10000       # 语法检查 10000字
LIMIT_REWRITE_TEXT=3000        # 降重改写 3000字
LIMIT_DISCUSSION_Q=500         # 讨论问题 500字
LIMIT_DISCUSSION_CTX=2000      # 讨论上下文 2000字
```

---

### 7. 邀请码配置 (INVITE_CODE)

```env
INVITE_CODE_LENGTH=9                                      # 邀请码长度(不含分隔符)
INVITE_CODE_SEPARATOR=-                                   # 分隔符
INVITE_CODE_SEGMENT=3                                     # 每段长度
INVITE_CODE_CHARS=ABCDEFGHJKLMNPQRSTUVWXYZ23456789       # 可用字符(去掉易混淆的)
```

生成格式: `ABC-123-XYZ`

---

### 8. 密码策略 (PASSWORD_POLICY)

```env
PASSWORD_MIN_LENGTH=8            # 最小长度
PASSWORD_REQUIRE_UPPERCASE=true  # 需要大写字母
PASSWORD_REQUIRE_LOWERCASE=true  # 需要小写字母
PASSWORD_REQUIRE_NUMBER=true     # 需要数字
PASSWORD_REQUIRE_SPECIAL=false   # 需要特殊字符
```

---

### 9. 版本管理配置 (VERSION_CONFIG)

```env
MAX_VERSIONS_PER_PAPER=50      # 每篇论文最多保存版本数
AUTO_SAVE_INTERVAL=300         # 自动保存间隔(秒)
ENABLE_AUTO_SAVE=true          # 是否启用自动保存
```

---

### 10. 签到配置 (CHECKIN_CONFIG)

```env
MAX_STREAK_DAYS=365              # 最大连续签到天数
STREAK_BONUS_THRESHOLD=7         # 连续N天有额外奖励
STREAK_BONUS_CREDITS=10          # 连续签到奖励积分
```

**说明**: 连续签到7天可额外获得10积分

---

### 11. 业务规则 (BUSINESS_RULES)

```env
ALLOWED_EMAIL_DOMAINS=edu.cn     # 允许的邮箱后缀(逗号分隔)
MAX_PAPERS_PER_USER=100          # 免费用户论文数量限制
MAX_PAPERS_PER_VIP=-1            # VIP用户论文数量(-1表示无限制)
MAX_DISCUSSIONS_PER_PAPER=100    # 每篇论文最大讨论数
MIN_RECHARGE_CREDITS=100         # 最小充值积分
```

---

### 12. 支付套餐 (PAYMENT_CONFIG.packages)

```env
# 基础套餐
PACKAGE_BASIC_CREDITS=1000
PACKAGE_BASIC_PRICE=9.9

# 标准套餐
PACKAGE_STANDARD_CREDITS=2000
PACKAGE_STANDARD_PRICE=29.9

# 高级套餐
PACKAGE_PREMIUM_CREDITS=5000
PACKAGE_PREMIUM_PRICE=99.9
```

---

## 🔧 如何使用配置

### 在代码中引用

```typescript
import { REWARDS, AI_MODELS } from '../config/constants';
import { getCreditSettings } from '../services/creditSettingsService';

// 查询当前 Token 积分比例
const { token_to_credit_ratio } = await getCreditSettings();

// 使用奖励配置
const registrationReward = REWARDS.registration;

// 使用AI模型
const model = AI_MODELS.premium;
```

### 修改配置

1. **开发环境**: 修改 `.env` 文件
2. **生产环境**: 在服务器上设置环境变量
3. **代码默认值**: 修改 `src/config/constants.ts`

---

## 📊 配置优先级

1. **环境变量** (最高优先级) - 从 `.env` 文件或系统环境变量读取
2. **代码默认值** (兜底) - `constants.ts` 中的 fallback 值

示例:
```typescript
// 先读环境变量,如果没有则使用默认值100
REWARDS.registration = parseInt(process.env.REWARD_REGISTRATION || '100')
```

---

## 🎯 常见调整场景

### 场景1: 促销活动 - 降低AI消耗

```env
CREDITS_COST_POLISH=10        # 从15降到10
CREDITS_COST_OUTLINE=5        # 从10降到5
```

### 场景2: 拉新活动 - 提高奖励

```env
REWARD_REGISTRATION=200       # 从100提高到200
REWARD_INVITER=200            # 从100提高到200
REWARD_INVITEE=100            # 从50提高到100
```

### 场景3: 降低成本 - 更换模型

```env
OPENROUTER_MODEL_DEFAULT=anthropic/claude-3-haiku  # 更便宜的模型
OPENROUTER_MODEL_PREMIUM=anthropic/claude-3-sonnet
```

### 场景4: 防止滥用 - 收紧限制

```env
RATE_LIMIT_FREE_AI=5          # 从10降到5
LIMIT_POLISH_TEXT=3000        # 从5000降到3000
```

---

## ⚠️ 注意事项

1. **修改配置后需要重启服务**
2. **生产环境不要使用`.env`文件,应该在服务器上设置环境变量**
3. **敏感信息(API Key, 数据库密码)不要提交到Git**
4. **重大配置变更应该通知团队并测试**
5. **建议在灰度环境先测试配置变更**

---

## 🔍 查看当前配置

运行以下脚本可以查看当前生效的配置(开发环境):

```bash
node -e "require('dotenv').config(); const c = require('./dist/config/constants'); console.log(JSON.stringify(c, null, 2))"
```

---

## 📞 支持

配置相关问题请联系后端团队或查看代码注释。
