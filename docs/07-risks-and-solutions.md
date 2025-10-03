# 风险与应对方案

## ⚠️ 产品风险

### 风险1: 需求伪命题 - 用户不愿付费

**风险描述**:
- ChatGPT/Kimi等免费工具已能润色论文
- 大学生付费意愿低
- 产品差异化不足

**验证方法**:
```
MVP上线后前2周关键指标:
- 注册用户 >50人 → 有需求
- 免费积分消耗率 >80% → 功能有价值
- 付费转化率 >3% → 愿意付费
```

**应对方案**:

**方案A: 转化率1-3%（及格线）**
- 优化定价：降低门槛至¥4.9/500积分
- 增加新手优惠：首充双倍
- 改进功能：增加"查重报告"等刚需

**方案B: 转化率<1%（危险）**
- 立即转向B端：联系学校图书馆/写作中心
- 打包销售：¥500/年/席位（50个学生起）
- 提供管理后台：老师可查看学生写作进度

**方案C: 完全没人用**
- 项目暂停，止损
- 技术栈复用到其他方向（如简历优化、公文写作）

---

### 风险2: 学术诚信争议

**风险描述**:
- "AI写论文"被学校视为作弊
- 用户滥用导致抄袭率过高
- 平台被举报/封禁

**预防措施**:

**产品设计层面**:
```
❌ 不提供功能:
- 一键生成全文
- 直接抄袭检测（避免帮助作弊）

✅ 只提供辅助:
- 语法检查
- 逻辑建议
- 表达优化
```

**法律免责**:
```
用户协议明确说明:
1. 本平台仅为辅助工具，不承担学术诚信责任
2. 用户需遵守所在学校的学术规范
3. AI生成内容仅供参考，需自行核实
```

**技术限制**:
```typescript
// 限制单次生成长度
if (text.length > 1000) {
  throw new Error('单次润色不超过1000字')
}

// 降重功能添加水印（防滥用）
const watermark = `\n\n<!-- 本段由AI辅助改写，请自行审核 -->\n`
```

---

### 风险3: 被大厂降维打击

**风险描述**:
- WPS/石墨文档推出类似功能
- 免费提供，直接碾压

**应对策略**:

**短期（6个月内）**:
- 快速迭代，建立用户习惯
- 做垂直场景（只做学术论文，不做通用文档）
- 积累学术语料库（专业领域优势）

**长期**:
- 转向B端（学校采购不看价格，看服务）
- 建立护城河：
  - 论文模板库（各学校格式）
  - 导师审阅功能（差异化）
  - 学术数据库对接（知网/万方）

---

## 🛠️ 技术风险

### 风险4: LLM API不稳定

**可能问题**:
- 通义千问服务宕机
- API限流
- 响应超时

**应对方案**:

**多LLM备份**:
```typescript
class AIService {
  async complete(prompt: string) {
    try {
      // 主力：通义千问
      return await this.tongyi.complete(prompt)
    } catch (err) {
      // 备用1: 智谱GLM
      return await this.zhipu.complete(prompt)
    } catch (err) {
      // 备用2: 本地小模型（降级方案）
      return await this.localModel.complete(prompt)
    }
  }
}
```

**缓存策略**:
```typescript
// 相同内容直接返回缓存
const cacheKey = md5(text + type)
const cached = await redis.get(`ai:${cacheKey}`)
if (cached) return cached
```

**超时重试**:
```typescript
const result = await pRetry(
  () => tongyi.complete(prompt),
  {
    retries: 3,
    minTimeout: 2000,
    onFailedAttempt: (err) => {
      console.log(`第${err.attemptNumber}次重试...`)
    }
  }
)
```

---

### 风险5: 并发扣费Bug（超卖问题）

**场景**:
```
用户剩余10积分
同时发起3个请求（每个消耗15积分）
如果没有锁，可能扣费3次 → 余额变成-35
```

**解决方案**:

**分布式锁（Redlock算法）**:
```typescript
async deductCredits(userId: string, amount: number) {
  const lock = await this.redis.lock(
    `lock:credits:${userId}`,
    10000 // 锁10秒
  )

  try {
    // 1. 查询余额
    const user = await this.db.users.findOne(userId)

    // 2. 检查余额
    if (user.credits < amount) {
      throw new InsufficientCreditsException()
    }

    // 3. 扣费
    await this.db.users.update(userId, {
      credits: user.credits - amount
    })

    // 4. 记录流水
    await this.db.creditTransactions.create({
      user_id: userId,
      amount: -amount,
      balance_after: user.credits - amount
    })

    // 5. 删除缓存
    await this.redis.del(`user:credits:${userId}`)

  } finally {
    await lock.release() // 确保释放锁
  }
}
```

**数据库级别防护**:
```sql
-- 余额不能为负
ALTER TABLE users ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);

-- 乐观锁（version字段）
UPDATE users
SET credits = credits - 15, version = version + 1
WHERE id = $1 AND version = $2 AND credits >= 15;
-- 如果version不匹配，说明有并发修改，UPDATE失败
```

**压力测试**:
```bash
# 使用Apache Bench测试并发
ab -n 1000 -c 100 -H "Authorization: Bearer <token>" \
   -p polish.json \
   http://localhost:3000/api/ai/polish

# 验证：
# 1. 成功请求数 * 15 = 实际扣除积分
# 2. 流水表记录数 = 成功请求数
# 3. 余额不为负数
```

---

### 风险6: 数据库性能瓶颈

**慢查询场景**:
```sql
-- 查询用户的所有论文（数据量大时变慢）
SELECT * FROM papers WHERE user_id = $1 ORDER BY updated_at DESC;
```

**优化方案**:

**1. 索引优化**:
```sql
-- 复合索引
CREATE INDEX idx_papers_user_updated
ON papers(user_id, updated_at DESC)
WHERE is_deleted = FALSE;

-- 部分索引（只索引未删除的）
CREATE INDEX idx_papers_active
ON papers(user_id)
WHERE is_deleted = FALSE;
```

**2. 分页优化**:
```sql
-- ❌ 慢查询（OFFSET大数值时扫描很多行）
SELECT * FROM papers
WHERE user_id = $1
ORDER BY created_at DESC
OFFSET 10000 LIMIT 10;

-- ✅ 游标分页
SELECT * FROM papers
WHERE user_id = $1
  AND created_at < $2 -- 上一页最后一条的时间
ORDER BY created_at DESC
LIMIT 10;
```

**3. 读写分离**:
```typescript
// 主库（写操作）
await masterDB.users.update(userId, { credits: 100 })

// 从库（读操作）
const papers = await slaveDB.papers.find({ user_id: userId })
```

**4. 连接池配置**:
```typescript
{
  type: 'postgres',
  poolSize: 20, // 连接池大小
  extra: {
    max: 20,
    min: 5,
    idle: 10000, // 空闲连接10秒后释放
    acquire: 30000, // 获取连接超时时间
  }
}
```

---

### 风险7: 支付回调丢失

**场景**:
- 用户付款成功
- 支付宝回调因网络问题未到达
- 用户积分未到账 → 投诉

**预防措施**:

**1. 主动查询**:
```typescript
// 创建订单5分钟后，如果还是pending状态
@Cron('*/5 * * * *') // 每5分钟执行
async checkPendingOrders() {
  const orders = await this.db.orders.find({
    status: 'pending',
    created_at: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
  })

  for (const order of orders) {
    // 主动查询支付宝订单状态
    const result = await this.alipay.query(order.id)

    if (result.trade_status === 'TRADE_SUCCESS') {
      // 补单
      await this.processPayment(order.id)
    }
  }
}
```

**2. 幂等性保证**:
```typescript
async processPayment(orderId: string) {
  // 使用分布式锁防止重复处理
  const lock = await redis.lock(`lock:order:${orderId}`)

  try {
    const order = await this.db.orders.findOne(orderId)

    // 已处理过，直接返回
    if (order.status === 'paid') {
      return
    }

    // 标记已支付
    await this.db.orders.update(orderId, {
      status: 'paid',
      paid_at: new Date()
    })

    // 积分到账
    await this.creditsService.recharge(
      order.user_id,
      order.credits,
      `充值¥${order.amount_yuan}`
    )

  } finally {
    await lock.release()
  }
}
```

**3. 用户自助查询**:
```typescript
// 提供"未到账？点击查询"按钮
@Get('orders/:id/check')
async checkOrder(@Param('id') id: string) {
  const result = await this.alipay.query(id)

  if (result.trade_status === 'TRADE_SUCCESS') {
    await this.processPayment(id)
    return { message: '已到账' }
  }

  return { message: '支付未完成' }
}
```

---

## 💰 业务风险

### 风险8: LLM成本失控

**场景**:
- 恶意用户刷接口
- 定价过低，入不敷出
- 免费积分给太多

**监控指标**:
```typescript
// 每日成本告警
@Cron('0 0 * * *') // 每天凌晨
async checkDailyCost() {
  const today = new Date().toISOString().slice(0, 10)

  // LLM成本
  const llmCost = await this.db.aiLogs.sum('cost_yuan', {
    created_at: { $gte: today }
  })

  // 营收
  const revenue = await this.db.orders.sum('amount_yuan', {
    status: 'paid',
    paid_at: { $gte: today }
  })

  const costRatio = llmCost / revenue

  if (costRatio > 0.3) {
    // 成本超过营收30%
    await this.alert('成本预警！', {
      llmCost,
      revenue,
      ratio: costRatio
    })

    // 自动限流
    await this.enableRateLimit()
  }
}
```

**应对措施**:

**立即限流**:
```typescript
// 免费用户每天限10次AI调用
@UseGuards(DailyLimitGuard)
@Post('ai/polish')
async polish() {}

// 实现
class DailyLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest().user

    const todayCount = await redis.get(`daily:${user.id}`)

    if (!user.is_vip && todayCount >= 10) {
      throw new RateLimitException('今日免费次数已用完')
    }

    await redis.incr(`daily:${user.id}`)
    await redis.expire(`daily:${user.id}`, 86400)

    return true
  }
}
```

**调整定价**:
```typescript
// 成本倒推定价
const avgTokens = 2000 // 平均每次消耗
const apiCost = avgTokens * 0.00002 // ¥0.04
const targetMargin = 0.8 // 目标80%毛利

const price = apiCost / (1 - targetMargin) // ¥0.2
const credits = Math.ceil(price / 0.02) // 10积分

// 如果亏损，提高到15积分
```

---

### 风险9: 用户薅羊毛

**手段**:
- 批量注册账号领100积分
- 刷邀请奖励
- 恶意退款

**防御方案**:

**1. 注册限制**:
```typescript
// 手机验证码
@Post('auth/send-code')
async sendCode(@Body('phone') phone: string) {
  // 同手机号每天限5次
  const count = await redis.get(`sms:${phone}`)
  if (count >= 5) throw new Error('今日验证码次数已达上限')

  // 发送验证码
  await sms.send(phone, code)
  await redis.setex(`sms:${phone}`, 86400, count + 1)
}

// 同IP限制
@Post('auth/register')
@Throttle(3, 86400) // 每天限3次
async register() {}
```

**2. 设备指纹**:
```typescript
// 前端收集
import FingerprintJS from '@fingerprintjs/fingerprintjs'

const fp = await FingerprintJS.load()
const result = await fp.get()
const deviceId = result.visitorId

// 后端验证
const deviceCount = await db.users.count({ device_id: deviceId })
if (deviceCount >= 3) {
  throw new Error('该设备注册账号过多')
}
```

**3. 邀请限制**:
```typescript
// 被邀请人必须有实际消费才给奖励
async redeemInvite(userId: string, code: string) {
  const inviter = await db.users.findOne({ invite_code: code })

  // 记录邀请关系
  await db.invites.create({
    inviter_id: inviter.id,
    invitee_id: userId,
    status: 'pending' // 待激活
  })

  // 被邀请人先得50积分
  await this.credits.reward(userId, 50, '邀请奖励')
}

// 被邀请人首次充值后，邀请人才得100积分
async onFirstRecharge(userId: string) {
  const invite = await db.invites.findOne({
    invitee_id: userId,
    status: 'pending'
  })

  if (invite) {
    await this.credits.reward(invite.inviter_id, 100, '邀请返利')
    await db.invites.update(invite.id, { status: 'activated' })
  }
}
```

---

### 风险10: 数据泄露

**敏感数据**:
- 用户论文内容
- 账号密码
- 支付信息

**防护措施**:

**1. 加密存储**:
```typescript
// 论文内容加密（可选）
import { createCipheriv, createDecipheriv } from 'crypto'

class PaperService {
  encrypt(content: string): string {
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    return cipher.update(content, 'utf8', 'hex') + cipher.final('hex')
  }

  decrypt(encrypted: string): string {
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
  }
}
```

**2. 权限控制**:
```sql
-- 数据库只读账号（给监控系统用）
CREATE USER readonly WITH PASSWORD 'xxx';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- 应用账号（禁止DROP/TRUNCATE）
CREATE USER appuser WITH PASSWORD 'xxx';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES TO appuser;
```

**3. 日志脱敏**:
```typescript
// 不记录完整论文内容
await logger.info('用户润色', {
  user_id: userId,
  text_preview: text.slice(0, 50) + '...', // 只记录前50字
  word_count: text.length
})
```

**4. HTTPS强制**:
```nginx
# Nginx配置
server {
  listen 80;
  server_name api.yourproject.com;
  return 301 https://$host$request_uri; # 强制跳转HTTPS
}
```

---

## 🚨 应急预案

### 服务器宕机
```bash
# 1. 立即切换到备用服务器
# DNS改到备用IP

# 2. 数据恢复
pg_restore -d paper_db /backup/latest.sql

# 3. 发公告
echo "服务正在恢复，预计10分钟内恢复" | mail -s "紧急通知" users@list
```

### 数据库误删
```sql
-- 软删除设计，可恢复
UPDATE papers SET is_deleted = FALSE WHERE id = $1;

-- 如果真的DELETE了，从备份恢复
pg_restore -t papers -d paper_db /backup/yesterday.sql
```

### 恶意攻击
```bash
# 封禁IP
iptables -A INPUT -s 123.45.67.89 -j DROP

# 限流
# Nginx配置
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20;
```

---

## 📊 风险优先级

| 风险 | 概率 | 影响 | 优先级 |
|------|------|------|--------|
| 需求伪命题 | 高 | 致命 | P0 |
| 并发扣费Bug | 高 | 高 | P0 |
| LLM成本失控 | 中 | 高 | P1 |
| 学术诚信争议 | 中 | 高 | P1 |
| 支付回调丢失 | 低 | 高 | P1 |
| 数据库性能 | 中 | 中 | P2 |
| 用户薅羊毛 | 中 | 中 | P2 |
| LLM API不稳定 | 低 | 中 | P2 |
| 数据泄露 | 低 | 致命 | P1 |

**P0（立即处理）**: MVP阶段必须解决
**P1（重点关注）**: 上线前必须有预案
**P2（监控即可）**: 上线后根据情况优化
