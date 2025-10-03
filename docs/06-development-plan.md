# 开发计划

## 🎯 项目阶段划分

### 阶段0: 准备工作（3天）
- [ ] 技术选型确认
- [ ] 开发环境搭建
- [ ] 项目脚手架初始化
- [ ] Git仓库配置
- [ ] 云服务账号申请（阿里云/腾讯云）
- [ ] LLM API账号注册（OpenRouter）
- [ ] **⚠️ 代理配置**（必须完成，详见[代理配置文档](08-proxy-setup.md)）
  - [ ] 本地开发：配置Clash/V2Ray代理
  - [ ] 验证代理可访问OpenRouter
  - [ ] 生产环境：搭建海外代理服务器或配置CloudFlare Workers
  - [ ] 环境变量配置（HTTPS_PROXY）
  - [ ] 运行测试脚本确认连接成功

---

## 📅 MVP开发计划（2周）

### Week 1: 后端核心 + 前端框架

#### Day 1-2: 用户系统
**后端**:
- [x] NestJS项目初始化
- [ ] PostgreSQL数据库设计
- [ ] User模块：注册/登录/JWT
- [ ] 积分表设计 + 初始化100积分逻辑
- [ ] Redis连接配置

**前端**:
- [x] React + Vite项目初始化
- [ ] TailwindCSS配置
- [ ] 路由配置（React Router）
- [ ] 登录/注册页面UI

**测试**:
```bash
# 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Pass123!"}'

# 验证积分到账
psql -d paper_db -c "SELECT credits FROM users WHERE email='test@test.com';"
# 应输出: credits = 100
```

---

#### Day 3-4: 富文本编辑器
**前端**:
- [ ] 安装Tiptap + 扩展
- [ ] 编辑器组件封装
- [ ] 字数统计显示
- [ ] 自动保存逻辑（debounce 2秒）

**后端**:
- [ ] Paper模块：CRUD接口
- [ ] 论文内容存储（JSONB格式）
- [ ] 字数统计触发器

**测试**:
- [ ] 创建论文并编辑
- [ ] 验证自动保存
- [ ] 检查字数统计准确性

---

#### Day 5-7: AI功能 + 积分扣费
**后端**:
- [ ] 通义千问SDK集成
- [ ] AI Service：段落润色接口
- [ ] 积分扣费逻辑（分布式锁）
- [ ] 流水表记录
- [ ] 错误处理 + 退款逻辑

**核心代码**:
```typescript
// src/modules/ai/ai.service.ts
async polishText(userId: string, text: string, type: string) {
  const cost = this.calculateCost(text, type)

  // 1. 分布式锁
  const lock = await this.redis.lock(`lock:credits:${userId}`, 10000)

  try {
    // 2. 检查余额
    const user = await this.userService.findOne(userId)
    if (user.credits < cost) {
      throw new InsufficientCreditsException()
    }

    // 3. 预扣积分
    await this.creditsService.deduct(userId, cost, '段落润色')

    // 4. 调用LLM
    const result = await this.tongyi.complete({
      prompt: this.buildPrompt(text, type),
      max_tokens: 2000
    })

    // 5. 记录日志
    await this.aiLogService.create({
      user_id: userId,
      action_type: `polish_${type}`,
      input_tokens: result.usage.prompt_tokens,
      output_tokens: result.usage.completion_tokens,
      cost_yuan: result.usage.total_tokens * 0.00002
    })

    return result.text
  } catch (err) {
    // 失败退款
    await this.creditsService.refund(userId, cost, 'AI调用失败')
    throw err
  } finally {
    await lock.release()
  }
}
```

**前端**:
- [ ] 选中文本弹出润色按钮
- [ ] 调用AI接口
- [ ] 显示润色结果对比
- [ ] 积分余额实时更新
- [ ] 积分不足提示弹窗

**测试**:
```bash
# 测试扣费逻辑
curl -X POST http://localhost:3000/api/ai/polish \
  -H "Authorization: Bearer <token>" \
  -d '{"text":"测试文本","type":"grammar"}'

# 验证流水表
SELECT * FROM credit_transactions WHERE user_id='xxx' ORDER BY created_at DESC LIMIT 5;
```

---

### Week 2: 支付系统 + 测试优化

#### Day 8-10: 充值系统
**后端**:
- [ ] Order模块：创建订单
- [ ] 支付宝SDK集成（沙箱环境）
- [ ] 支付回调处理
- [ ] 积分到账逻辑
- [ ] 订单状态查询

**支付宝对接流程**:
```typescript
// 1. 创建订单
const order = await this.orderService.create({
  user_id: userId,
  amount_yuan: 29.9,
  credits: 2000,
  status: 'pending'
})

// 2. 生成支付链接
const formData = new AlipayFormData()
formData.setMethod('get')
formData.addField('notifyUrl', 'https://api.yourproject.com/payment/callback')
formData.addField('returnUrl', 'https://app.yourproject.com/payment/success')

const result = await alipaySdk.exec('alipay.trade.page.pay', {
  out_trade_no: order.id,
  total_amount: order.amount_yuan,
  subject: `充值${order.credits}积分`
})

// 3. 返回支付URL
return result
```

**前端**:
- [ ] 充值页面（3个档位卡片）
- [ ] 点击后跳转支付宝
- [ ] 支付成功回调页面
- [ ] 订单查询页面

---

#### Day 11-12: 压力测试
**并发扣费测试**:
```typescript
// 测试100个并发请求同时扣费
const promises = Array(100).fill(null).map(() =>
  axios.post('/ai/polish', { text: '测试', type: 'grammar' })
)

await Promise.all(promises)

// 验证：流水表记录数 = 成功请求数
// 验证：用户余额 = 初始余额 - (成功次数 * 15)
```

**性能优化**:
- [ ] API响应时间 <500ms（不含LLM调用）
- [ ] 前端首屏加载 <2s
- [ ] 编辑器打字延迟 <50ms

---

#### Day 13-14: 集成测试 + Bug修复
**测试用例**:
- [ ] 新用户注册 → 获得100积分
- [ ] 使用AI功能 → 积分扣除 → 流水记录正确
- [ ] 积分不足 → 无法调用AI → 提示充值
- [ ] 充值成功 → 积分到账 → 可继续使用
- [ ] 同时多个请求 → 积分不超卖

**关键指标**:
```
注册流程完成率: >90%
AI调用成功率: >95%
充值成功率: >98%
支付回调延迟: <5秒
```

---

## 🚀 P1功能开发（Week 3-4）

### Week 3: 版本管理 + 讨论区

#### Day 15-17: 版本管理
**后端**:
- [ ] PaperVersion模块
- [ ] 保存版本接口
- [ ] 版本列表接口
- [ ] 版本对比接口（diff算法）
- [ ] AI生成修改摘要

**前端**:
- [ ] 版本历史侧边栏
- [ ] 版本对比视图（高亮差异）
- [ ] 回滚版本确认弹窗

---

#### Day 18-20: 讨论区
**后端**:
- [ ] Discussion模块
- [ ] 提问接口（调用LLM分析）
- [ ] 讨论列表接口

**前端**:
- [ ] 右侧讨论面板
- [ ] 提问输入框
- [ ] AI回复展示

---

### Week 4: 运营功能 + 上线准备

#### Day 21-23: 运营功能
- [ ] 每日签到
- [ ] 邀请奖励
- [ ] 首充优惠

#### Day 24-26: 部署上线
**服务器配置**:
```bash
# 阿里云ECS 2核4G
# 安装Docker + Nginx
apt update && apt install docker.io nginx -y

# 拉取代码
git clone <repo>

# 启动服务
docker-compose up -d

# Nginx配置
server {
  listen 443 ssl;
  server_name api.yourproject.com;

  ssl_certificate /etc/letsencrypt/live/yourproject.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourproject.com/privkey.pem;

  location /api {
    proxy_pass http://localhost:3000;
  }
}
```

**前端部署**:
```bash
# Vercel自动部署
vercel --prod

# 或阿里云OSS
pnpm build
ossutil cp -r dist/ oss://your-bucket/
```

---

#### Day 27-28: 冷启动运营
**找种子用户**:
- [ ] 在豆瓣/知乎发帖：免费AI论文辅助工具
- [ ] 大学生QQ群/微信群推广
- [ ] 朋友圈扩散

**收集反馈**:
- [ ] 安装Sentry监控错误
- [ ] Google Analytics追踪用户行为
- [ ] 建立用户反馈群

**关键指标**:
```
目标: 50个注册用户
付费转化率: >3%（至少2个付费用户）
日活: >10人
```

---

## 📊 开发进度追踪

### 看板（建议使用GitHub Projects）

**Todo**:
- [ ] 用户注册/登录
- [ ] 富文本编辑器
- [ ] AI段落润色
- [ ] ...

**In Progress**:
- [ ] 积分扣费逻辑

**Done**:
- [x] 项目初始化
- [x] 数据库设计

---

## ⚠️ 风险管理

### 技术风险
| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| LLM API不稳定 | 中 | 高 | 降级方案：缓存结果 + 重试机制 |
| 并发扣费Bug | 高 | 高 | 分布式锁 + 充分测试 |
| 支付回调丢失 | 低 | 高 | 定时任务补单 + 手动审核 |
| 数据库性能瓶颈 | 中 | 中 | 索引优化 + 读写分离 |

### 业务风险
| 风险 | 应对 |
|------|------|
| 无人付费 | MVP上线1周内必须验证，转化率<1%立即调整 |
| 成本失控 | 每日监控LLM成本，超过营收30%立即限流 |
| 学术不端争议 | 明确标注"辅助工具"，不提供全文生成 |

---

## 🎯 里程碑

```
✅ M0: 项目启动（Day 0）
⏳ M1: MVP上线（Day 14）
⏳ M2: 50个用户（Day 21）
⏳ M3: 首个付费用户（Day 28）
⏳ M4: 月营收>¥1000（Month 2）
```

---

## 📈 成功标准

**MVP阶段（前2周）**:
- [ ] 核心功能可用（编辑器 + AI润色 + 充值）
- [ ] 无重大Bug
- [ ] 至少10个真实用户试用

**运营阶段（第1个月）**:
- [ ] 注册用户 >100
- [ ] 付费转化率 >3%
- [ ] 月营收 >成本
- [ ] 用户留存率 >20%（7日留存）

**如果第1个月数据不达标，考虑:**
1. 调整定价策略
2. 优化核心功能
3. 转向B端（找学校合作）
4. 项目暂停/转型
