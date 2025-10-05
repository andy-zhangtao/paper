# 前端积分实时更新功能实现总结

## 问题描述

虽然后端积分扣除功能已经正常工作，但前端用户界面一直显示固定的积分值（1000），没有调用后端 API 获取最新的积分数据。

### 具体问题

1. **硬编码积分值**：`Navbar.tsx` 中 `const balance = 1000` 是硬编码的
2. **缺少状态管理**：没有全局的积分状态管理
3. **不调用 API**：从未调用 `creditApi.getBalance()` 获取真实数据
4. **不刷新数据**：用户与 LLM 交互后积分变化，前端不知道

## 解决方案

### 1. 创建积分上下文（CreditContext）

**文件**：`/frontend/src/contexts/CreditContext.tsx`

```tsx
interface CreditContextType {
  balance: number              // 当前积分余额
  isLoading: boolean           // 是否正在加载
  error: string | null         // 错误信息
  refreshBalance: () => Promise<void>  // 刷新积分
  updateBalance: (newBalance: number) => void  // 直接更新积分
}
```

**核心功能**：
- ✅ 自动检测用户登录状态
- ✅ 登录后自动获取积分余额
- ✅ 提供 `refreshBalance()` 手动刷新
- ✅ 提供 `updateBalance()` 乐观更新（用于 AI 调用后立即更新）

**实现逻辑**：
```tsx
// 用户登录/登出时自动获取/清空积分
useEffect(() => {
  if (isAuthenticated) {
    refreshBalance()  // 调用 creditApi.getBalance()
  } else {
    setBalance(0)
  }
}, [isAuthenticated])
```

### 2. 修改 App.tsx

**添加 CreditProvider 包裹应用**：
```tsx
function App() {
  return (
    <AuthProvider>
      <CreditProvider>   {/* 新增 */}
        <AppContent />
      </CreditProvider>
    </AuthProvider>
  )
}
```

**在进入首页时刷新积分**：
```tsx
function AppContent() {
  const { refreshBalance } = useCredit()
  
  // 每次回到首页时刷新积分
  useEffect(() => {
    if (currentView === 'list' && isAuthenticated) {
      refreshBalance()
    }
  }, [currentView, isAuthenticated])
  // ...
}
```

### 3. 修改 Navbar.tsx

**使用真实积分数据**：
```tsx
export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { balance, refreshBalance } = useCredit()  // 从 context 获取
  
  // 充值成功后刷新积分
  const handleRechargeSuccess = () => {
    refreshBalance()
  }
  
  return (
    <>
      {/* 显示真实积分 */}
      <CreditBalance balance={balance} onRecharge={...} />
      
      {/* 充值成功后刷新 */}
      <RechargeDialog 
        onSuccess={handleRechargeSuccess}
      />
    </>
  )
}
```

### 4. 修改 RechargeDialog.tsx

**添加 onSuccess 回调**：
```tsx
interface RechargeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void  // 新增
}

const handlePay = async () => {
  // ... 支付逻辑
  
  // 调用成功回调刷新积分
  if (onSuccess) {
    onSuccess()
  }
}
```

## 数据流

### 1. 应用启动流程

```
用户打开页面
  ↓
AuthContext 检查 localStorage 中的 token
  ↓
CreditContext 检测到 isAuthenticated = true
  ↓
自动调用 creditApi.getBalance()
  ↓
更新 balance 状态
  ↓
Navbar 显示真实积分
```

### 2. 用户交互流程

```
用户与 LLM 对话
  ↓
后端扣除积分
  ↓
返回 credits_remaining 给前端
  ↓
前端可以选择：
  - 调用 updateBalance(credits_remaining) 立即更新
  - 或等待用户返回首页时 refreshBalance()
```

### 3. 充值成功流程

```
用户点击充值按钮
  ↓
选择套餐并支付
  ↓
支付成功后调用 onSuccess()
  ↓
Navbar 中的 handleRechargeSuccess() 执行
  ↓
调用 refreshBalance()
  ↓
重新获取最新积分
  ↓
UI 更新显示新积分
```

## API 调用时机

| 场景 | 时机 | 方法 |
|------|------|------|
| 用户登录 | 登录成功后 | 自动调用 `refreshBalance()` |
| 进入首页 | `currentView === 'list'` | 自动调用 `refreshBalance()` |
| 充值成功 | 支付完成后 | 手动调用 `refreshBalance()` |
| AI 交互后 | 可选 | 可调用 `updateBalance()` 或等待返回首页 |

## 测试验证

### 1. 测试登录后获取积分

```bash
# 1. 打开浏览器控制台
# 2. 登录系统
# 3. 观察 Network 标签，应该看到：
GET /api/credits/balance

# 4. 检查响应数据
{
  "success": true,
  "data": {
    "credits": 997.5,
    "is_vip": false,
    "credits_expire_at": null,
    "token_to_credit_ratio": 0.005
  }
}
```

### 2. 测试 AI 交互后积分变化

```bash
# 1. 查看当前积分（例如 1000）
# 2. 与 LLM 进行对话
# 3. 点击左侧导航返回首页
# 4. 观察积分是否更新（例如变成 997.5）
# 5. Network 标签应该看到新的 GET /api/credits/balance 请求
```

### 3. 测试充值后积分刷新

```bash
# 1. 点击充值按钮
# 2. 选择套餐并支付（Mock 模式会模拟成功）
# 3. 支付成功后观察积分是否增加
# 4. Network 标签应该看到 GET /api/credits/balance 请求
```

## 优化建议（可选）

### 1. 乐观更新

在 AI 调用返回后立即更新积分，无需等待返回首页：

```tsx
// 在 PaperCreationWizard 中
const handleAIResponse = (response) => {
  const { credits_remaining } = response.data
  
  // 立即更新积分
  if (credits_remaining !== undefined) {
    updateBalance(credits_remaining)
  }
}
```

### 2. 定期轮询（可选）

如果需要实时同步多设备的积分变化：

```tsx
// 在 CreditContext 中
useEffect(() => {
  if (!isAuthenticated) return
  
  // 每 30 秒刷新一次
  const interval = setInterval(refreshBalance, 30000)
  return () => clearInterval(interval)
}, [isAuthenticated, refreshBalance])
```

### 3. 错误处理

显示积分加载失败的提示：

```tsx
// 在 Navbar 中
const { balance, isLoading, error } = useCredit()

{error && (
  <div className="text-red-500 text-xs">
    积分获取失败
  </div>
)}
```

## 相关文件

- ✅ `/frontend/src/contexts/CreditContext.tsx` - 新增积分上下文
- ✅ `/frontend/src/App.tsx` - 添加 CreditProvider
- ✅ `/frontend/src/components/layout/Navbar.tsx` - 使用真实积分
- ✅ `/frontend/src/features/credits/RechargeDialog.tsx` - 添加成功回调
- 📝 `/frontend/src/lib/api.ts` - API 客户端（已存在）

## 注意事项

1. **Mock 模式**：如果 `VITE_USE_MOCK=true`，API 会返回 Mock 数据
2. **Token 验证**：如果 token 过期，API 会返回 401，需要重新登录
3. **并发更新**：多个标签页可能导致积分显示不一致，建议使用 localStorage 事件同步

## 部署检查清单

- [ ] 确认后端 `/api/credits/balance` 接口正常
- [ ] 确认前端环境变量 `VITE_API_URL` 正确
- [ ] 测试登录后积分是否正确显示
- [ ] 测试 AI 交互后返回首页积分是否更新
- [ ] 测试充值成功后积分是否刷新
- [ ] 检查浏览器控制台是否有错误
