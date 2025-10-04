import axios from 'axios'
import {
  mockAuthResponse,
  mockPapers,
  mockCreditBalance,
  mockTransactions,
  mockRechargePackages,
  mockApiResponse,
  mockApiError,
  delay,
  mockPaperCreationPrompts,
  mockPaperCreationChat
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
import type {
  PaperCreationPromptsResponse,
  PaperCreationStageCode,
  PaperCreationChatRequest,
  PaperCreationChatResponse
} from '@/types/prompt'

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

export const paperCreationApi = {
  async getPrompts(stage?: PaperCreationStageCode): Promise<PaperCreationPromptsResponse> {
    if (USE_MOCK) {
      if (stage) {
        const matched = mockPaperCreationPrompts.stages.find(item => item.code === stage)
        return mockApiResponse({ stages: matched ? [matched] : [] })
      }
      return mockApiResponse(mockPaperCreationPrompts)
    }

    const result = await api.get('/paper-creation/prompts', stage ? { params: { stage } } : undefined)

    if (result && typeof result === 'object' && 'success' in result) {
      const typedResult = result as {
        success: boolean
        data?: PaperCreationPromptsResponse
        error?: { message?: string }
      }

      if (!typedResult.success) {
        const message = typedResult.error?.message || '加载提示词失败'
        throw new Error(message)
      }

      return typedResult.data ?? { stages: [] }
    }

    return result
  },

  async chatStream(
    data: PaperCreationChatRequest,
    options: {
      signal?: AbortSignal
      onDelta?: (chunk: string) => void
    } = {},
  ): Promise<PaperCreationChatResponse> {
    if (USE_MOCK) {
      const mockResult = await mockPaperCreationChat(data)
      if (options.onDelta) {
        options.onDelta(mockResult.reply)
      }
      return mockResult
    }

    const baseURL = api.defaults.baseURL || ''
    const normalizedBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    const endpoint = `${normalizedBase}/paper-creation/chat/stream`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    }

    const token = localStorage.getItem('token')
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: options.signal,
      credentials: 'include',
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'AI服务调用失败')
    }

    if (!response.body) {
      throw new Error('浏览器不支持流式响应')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let finalResult: PaperCreationChatResponse | null = null
    let streamError: Error | null = null
    let ended = false

    const processEvent = (rawEvent: string) => {
      const trimmed = rawEvent.trim()
      if (!trimmed) return

      const lines = trimmed.split('\n')
      let eventType = 'message'
      let dataPayload = ''

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          dataPayload += line.slice(5).trim()
        }
      }

      if (!dataPayload) {
        return
      }

      if (eventType === 'delta') {
        try {
          const payload = JSON.parse(dataPayload) as { content?: string }
          if (payload.content && options.onDelta) {
            options.onDelta(payload.content)
          }
        } catch (error) {
          console.warn('解析delta事件失败:', error)
        }
        return
      }

      if (eventType === 'complete') {
        try {
          finalResult = JSON.parse(dataPayload) as PaperCreationChatResponse
        } catch (error) {
          streamError = new Error('解析AI响应失败')
        }
        return
      }

      if (eventType === 'error') {
        try {
          const payload = JSON.parse(dataPayload) as { message?: string }
          streamError = new Error(payload?.message || 'AI服务暂时不可用')
        } catch (error) {
          streamError = new Error('AI服务暂时不可用')
        }
        return
      }

      if (eventType === 'end') {
        ended = true
      }
    }

    const processBuffer = (isFinal = false) => {
      let normalized = buffer.replace(/\r/g, '')
      let boundary = normalized.indexOf('\n\n')

      while (boundary !== -1) {
        const rawEvent = normalized.slice(0, boundary)
        buffer = normalized.slice(boundary + 2)
        processEvent(rawEvent)
        normalized = buffer
        boundary = normalized.indexOf('\n\n')
      }

      if (isFinal && buffer.trim()) {
        processEvent(buffer)
        buffer = ''
      }
    }

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }
        buffer += decoder.decode(value, { stream: true })
        processBuffer()

        if (ended) {
          await reader.cancel()
          break
        }
      }
      buffer += decoder.decode()
      processBuffer(true)
    } finally {
      reader.releaseLock()
    }

    if (streamError) {
      throw streamError
    }

    if (!finalResult) {
      throw new Error('AI服务返回数据不完整')
    }

    return finalResult
  },

  async chat(data: PaperCreationChatRequest): Promise<PaperCreationChatResponse> {
    let combined = ''
    const result = await paperCreationApi.chatStream(data, {
      onDelta: (chunk) => {
        combined += chunk
      },
    })

    if (!result.reply && combined) {
      return {
        ...result,
        reply: combined.trim(),
      }
    }

    return result
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
