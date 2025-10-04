import axios from 'axios'
import {
  mockAuthResponse,
  mockPapers,
  mockCreditBalance,
  mockTransactions,
  mockRechargePackages,
  mockApiResponse,
  mockApiError,
  delay
} from './mock'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse
} from '@/types/user'
import type {
  Paper,
  CreatePaperRequest,
  UpdatePaperRequest
} from '@/types/paper'
import type {
  CreditBalance,
  CreditTransaction,
  RechargePackage,
  CreateOrderRequest,
  CreateOrderResponse,
  AIPolishRequest,
  AIPolishResponse,
  AITranslateRequest,
  AITranslateResponse
} from '@/types/credit'

// 是否使用 Mock 数据（开发阶段使用）
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// API 客户端配置
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
})

// 请求拦截器：添加 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理错误
api.interceptors.response.use(
  response => response.data,
  error => {
    // 401错误不在拦截器中跳转,由各组件自行处理
    // 其他错误统一处理
    if (error.response?.status === 500) {
      console.error('服务器错误:', error.response.data)
    }
    return Promise.reject(error)
  }
)

// ===================
// 认证相关 API
// ===================

export const authApi = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    if (USE_MOCK) {
      // Mock: 任意邮箱密码都能登录
      return mockApiResponse(mockAuthResponse)
    }
    return api.post('/auth/login', data)
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    if (USE_MOCK) {
      return mockApiResponse(mockAuthResponse)
    }
    return api.post('/auth/register', data)
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    if (USE_MOCK) {
      return mockApiResponse({ accessToken: 'new-mock-token' })
    }
    const refreshToken = localStorage.getItem('refreshToken')
    return api.post('/auth/refresh', { refreshToken })
  },

  async logout(): Promise<void> {
    if (USE_MOCK) {
      await delay(300)
      return
    }
    return api.post('/auth/logout')
  }
}

// ===================
// 论文相关 API
// ===================

let mockPapersStore = [...mockPapers]

export const paperApi = {
  async list(): Promise<Paper[]> {
    if (USE_MOCK) {
      return mockApiResponse(mockPapersStore)
    }
    return api.get('/papers')
  },

  async get(id: string): Promise<Paper> {
    if (USE_MOCK) {
      const paper = mockPapersStore.find(p => p.id === id)
      if (!paper) return mockApiError('论文不存在', 300)
      return mockApiResponse(paper)
    }
    return api.get(`/papers/${id}`)
  },

  async create(data: CreatePaperRequest): Promise<Paper> {
    if (USE_MOCK) {
      const newPaper: Paper = {
        id: Date.now().toString(),
        userId: '1',
        title: data.title,
        content: data.content || '',
        wordCount: data.content?.length || 0,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      mockPapersStore.unshift(newPaper)
      return mockApiResponse(newPaper)
    }
    return api.post('/papers', data)
  },

  async update(id: string, data: UpdatePaperRequest): Promise<Paper> {
    if (USE_MOCK) {
      const index = mockPapersStore.findIndex(p => p.id === id)
      if (index === -1) return mockApiError('论文不存在', 300)

      mockPapersStore[index] = {
        ...mockPapersStore[index],
        ...data,
        wordCount: data.content?.length || mockPapersStore[index].wordCount,
        updatedAt: new Date().toISOString()
      }
      return mockApiResponse(mockPapersStore[index])
    }
    return api.put(`/papers/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    if (USE_MOCK) {
      mockPapersStore = mockPapersStore.filter(p => p.id !== id)
      await delay(300)
      return
    }
    return api.delete(`/papers/${id}`)
  }
}

// ===================
// 积分相关 API
// ===================

let mockBalanceStore = mockCreditBalance.balance
let mockTransactionsStore = [...mockTransactions]

export const creditApi = {
  async getBalance(): Promise<CreditBalance> {
    if (USE_MOCK) {
      return mockApiResponse({
        balance: mockBalanceStore,
        totalEarned: mockCreditBalance.totalEarned,
        totalConsumed: mockCreditBalance.totalConsumed
      })
    }
    return api.get('/credits/balance')
  },

  async getTransactions(): Promise<CreditTransaction[]> {
    if (USE_MOCK) {
      return mockApiResponse(mockTransactionsStore)
    }
    return api.get('/credits/transactions')
  },

  async getPackages(): Promise<RechargePackage[]> {
    if (USE_MOCK) {
      return mockApiResponse(mockRechargePackages)
    }
    return api.get('/credits/packages')
  },

  async createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
    if (USE_MOCK) {
      const pkg = mockRechargePackages.find(p => p.id === data.packageId)
      if (!pkg) return mockApiError('套餐不存在', 300)

      return mockApiResponse({
        orderId: `ORD-${Date.now()}`,
        paymentUrl: 'https://qr.alipay.com/mock',
        qrCode: 'mock-qrcode-base64-data'
      }, 800)
    }
    return api.post('/credits/orders', data)
  },

  // Mock: 模拟支付成功
  async mockPaymentSuccess(orderId: string, packageId: string): Promise<void> {
    const pkg = mockRechargePackages.find(p => p.id === packageId)
    if (!pkg) return

    const totalCredits = pkg.credits + pkg.bonus
    const newTransaction: CreditTransaction = {
      id: Date.now().toString(),
      userId: '1',
      type: 'recharge',
      amount: totalCredits,
      balanceBefore: mockBalanceStore,
      balanceAfter: mockBalanceStore + totalCredits,
      orderId,
      description: `充值${pkg.credits}积分（含${pkg.bonus}赠送）`,
      createdAt: new Date().toISOString()
    }

    mockBalanceStore += totalCredits
    mockTransactionsStore.unshift(newTransaction)
    await delay(1000)
  }
}

// ===================
// AI 相关 API
// ===================

export const aiApi = {
  async polish(data: AIPolishRequest): Promise<AIPolishResponse> {
    if (USE_MOCK) {
      const costCredits = 50

      // 扣除积分
      mockBalanceStore -= costCredits
      mockTransactionsStore.unshift({
        id: Date.now().toString(),
        userId: '1',
        type: 'consume',
        amount: -costCredits,
        balanceBefore: mockBalanceStore + costCredits,
        balanceAfter: mockBalanceStore,
        aiTaskId: `TASK-${Date.now()}`,
        description: 'AI润色',
        createdAt: new Date().toISOString()
      })

      // 模拟润色效果（简单替换）
      const polished = data.text
        .replace(/很/g, '非常')
        .replace(/好/g, '优秀')
        .replace(/但是/g, '然而')
        .replace(/因为/g, '由于')
        .replace(/所以/g, '因此')

      return mockApiResponse({
        polishedText: polished,
        costCredits
      }, 1500)
    }
    return api.post('/ai/polish', data)
  },

  async translate(data: AITranslateRequest): Promise<AITranslateResponse> {
    if (USE_MOCK) {
      const costCredits = 80

      // 扣除积分
      mockBalanceStore -= costCredits
      mockTransactionsStore.unshift({
        id: Date.now().toString(),
        userId: '1',
        type: 'consume',
        amount: -costCredits,
        balanceBefore: mockBalanceStore + costCredits,
        balanceAfter: mockBalanceStore,
        aiTaskId: `TASK-${Date.now()}`,
        description: `AI翻译 - ${data.targetLanguage === 'en' ? '中译英' : '英译中'}`,
        createdAt: new Date().toISOString()
      })

      // Mock 翻译结果
      const translated = data.targetLanguage === 'en'
        ? '[Translated to English] ' + data.text
        : '[翻译为中文] ' + data.text

      return mockApiResponse({
        translatedText: translated,
        costCredits
      }, 2000)
    }
    return api.post('/ai/translate', data)
  }
}

export default api
