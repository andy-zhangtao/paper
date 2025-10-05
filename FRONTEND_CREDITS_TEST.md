# 前端积分功能测试指南

## 快速验证步骤

### 1. 启动应用

```bash
cd frontend
npm run dev
```

### 2. 测试场景

#### ✅ 场景1：登录后自动获取积分

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 访问应用并登录
4. **预期结果**：
   - 看到 `GET /api/credits/balance` 请求
   - Navbar 右上角显示真实积分（不再是固定的 1000）
   - 如果是 Mock 模式，会看到 Mock 数据的积分值

#### ✅ 场景2：返回首页刷新积分

1. 与 LLM 进行对话（消耗积分）
2. 点击左侧导航或 Logo 返回首页
3. **预期结果**：
   - Network 标签看到新的 `GET /api/credits/balance` 请求
   - 积分数值更新（减少）
   - Console 中看到类似日志：
     ```
     获取积分余额成功: { balance: 997.5, ... }
     ```

#### ✅ 场景3：充值后刷新积分

1. 点击 Navbar 中的"充值"按钮
2. 选择充值套餐
3. 点击"确认支付"（Mock 模式会模拟成功）
4. **预期结果**：
   - 弹出提示："支付成功！获得 XXX 积分"
   - Network 标签看到 `GET /api/credits/balance` 请求
   - 积分数值更新（增加）

## 调试检查点

### Console 日志

成功的日志应该类似：

```javascript
// CreditContext 初始化
CreditContext: 用户已登录，获取积分余额

// API 调用
GET http://localhost:3000/api/credits/balance
Response: {
  success: true,
  data: {
    credits: 997.5,
    is_vip: false,
    credits_expire_at: null,
    token_to_credit_ratio: 0.005
  }
}

// 积分更新
CreditContext: 积分余额更新为 997.5
```

### Network 请求

**请求头**：
```
GET /api/credits/balance HTTP/1.1
Authorization: Bearer <token>
```

**响应体**：
```json
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

## 常见问题排查

### ❌ 问题1：积分一直显示 0

**可能原因**：
- 用户未登录
- Token 过期或无效
- 后端 API 不可用

**排查步骤**：
1. 检查 `localStorage` 中是否有 `token`
2. 检查 Network 标签是否有 401 错误
3. 检查后端服务是否正常运行

### ❌ 问题2：积分不更新

**可能原因**：
- `refreshBalance()` 未被调用
- API 请求失败但被吞掉

**排查步骤**：
1. 在 `CreditContext.tsx` 中添加 console.log：
   ```tsx
   const refreshBalance = async () => {
     console.log('refreshBalance called, isAuthenticated:', isAuthenticated)
     // ...
   }
   ```
2. 检查 Network 标签是否有请求
3. 检查 Console 是否有错误

### ❌ 问题3：积分显示为 1000（Mock 数据）

**可能原因**：
- 前端在使用 Mock 模式
- `VITE_USE_MOCK=true`

**解决方法**：
1. 检查 `.env` 文件：
   ```bash
   VITE_USE_MOCK=false
   VITE_API_URL=http://localhost:3000/api
   ```
2. 重启开发服务器

### ❌ 问题4：useCredit hook 报错

**错误信息**：
```
Error: useCredit must be used within a CreditProvider
```

**原因**：组件在 `CreditProvider` 外部使用了 `useCredit()`

**解决方法**：确保组件树结构正确：
```tsx
<AuthProvider>
  <CreditProvider>
    <YourComponent />  {/* 在这里可以使用 useCredit() */}
  </CreditProvider>
</AuthProvider>
```

## 代码检查清单

### ✅ App.tsx
- [ ] 导入了 `CreditProvider` 和 `useCredit`
- [ ] `<CreditProvider>` 包裹 `<AppContent />`
- [ ] `useEffect` 中调用 `refreshBalance()`

### ✅ Navbar.tsx
- [ ] 导入了 `useCredit`
- [ ] 使用 `const { balance, refreshBalance } = useCredit()`
- [ ] 不再有硬编码的 `const balance = 1000`
- [ ] `handleRechargeSuccess` 调用 `refreshBalance()`

### ✅ CreditContext.tsx
- [ ] 导出 `CreditProvider` 和 `useCredit`
- [ ] `refreshBalance` 调用 `creditApi.getBalance()`
- [ ] `useEffect` 监听 `isAuthenticated` 变化

### ✅ RechargeDialog.tsx
- [ ] `RechargeDialogProps` 包含 `onSuccess?: () => void`
- [ ] `handlePay` 成功后调用 `onSuccess()`

## Mock 模式测试

如果使用 Mock 模式（`VITE_USE_MOCK=true`）：

```typescript
// frontend/src/lib/api.ts
export const creditApi = {
  async getBalance(): Promise<CreditBalance> {
    if (USE_MOCK) {
      return mockApiResponse({
        balance: mockBalanceStore,  // 初始值：1000
        totalEarned: mockCreditBalance.totalEarned,
        totalConsumed: mockCreditBalance.totalConsumed
      })
    }
    return api.get('/credits/balance')
  }
}
```

**注意**：Mock 模式下积分不会真实扣除，但仍然会调用 API（返回 Mock 数据）

## 性能优化（可选）

### 1. 防抖刷新

避免频繁调用 API：

```tsx
import { debounce } from 'lodash'

const debouncedRefresh = useMemo(
  () => debounce(refreshBalance, 1000),
  [refreshBalance]
)
```

### 2. 缓存策略

添加时间戳判断是否需要刷新：

```tsx
const [lastRefresh, setLastRefresh] = useState(0)

const refreshBalance = async () => {
  const now = Date.now()
  if (now - lastRefresh < 5000) {
    console.log('5秒内已刷新，跳过')
    return
  }
  // ... 调用 API
  setLastRefresh(now)
}
```

## 下一步优化建议

1. **实时更新**：在 AI 对话返回后立即调用 `updateBalance(credits_remaining)`
2. **错误提示**：在 UI 中显示积分加载失败的提示
3. **Loading 状态**：显示积分加载中的骨架屏
4. **多标签同步**：使用 `localStorage` 事件同步多个标签页的积分
