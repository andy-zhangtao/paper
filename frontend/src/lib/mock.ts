import type { User, AuthResponse } from '@/types/user'
import type { Paper } from '@/types/paper'
import type { CreditBalance, CreditTransaction, RechargePackage } from '@/types/credit'

// Mock 用户数据
export const mockUser: User = {
  id: '1',
  email: 'demo@example.com',
  username: '演示用户',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
  createdAt: '2024-01-01T00:00:00Z'
}

// Mock 认证响应
export const mockAuthResponse: AuthResponse = {
  user: mockUser,
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token'
}

// Mock 论文数据
export const mockPapers: Paper[] = [
  {
    id: '1',
    userId: '1',
    title: '基于深度学习的图像识别技术研究',
    content: '本文研究了深度学习在图像识别领域的应用...',
    wordCount: 5234,
    isArchived: false,
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-02T15:30:00Z'
  },
  {
    id: '2',
    userId: '1',
    title: '人工智能伦理问题探讨',
    content: '随着人工智能技术的快速发展，伦理问题日益凸显...',
    wordCount: 8120,
    isArchived: false,
    createdAt: '2024-02-15T14:20:00Z',
    updatedAt: '2024-02-20T09:45:00Z'
  },
  {
    id: '3',
    userId: '1',
    title: '区块链技术在供应链管理中的应用',
    content: '区块链技术具有去中心化、不可篡改等特性...',
    wordCount: 6890,
    isArchived: true,
    createdAt: '2024-01-10T08:15:00Z',
    updatedAt: '2024-01-25T16:00:00Z'
  }
]

// Mock 积分余额
export const mockCreditBalance: CreditBalance = {
  balance: 2580,
  totalEarned: 5000,
  totalConsumed: 2420
}

// Mock 积分流水
export const mockTransactions: CreditTransaction[] = [
  {
    id: '1',
    userId: '1',
    type: 'recharge',
    amount: 1000,
    balanceBefore: 1580,
    balanceAfter: 2580,
    orderId: 'ORD-20240301-001',
    description: '充值1000积分',
    createdAt: '2024-03-01T10:00:00Z'
  },
  {
    id: '2',
    userId: '1',
    type: 'consume',
    amount: -50,
    balanceBefore: 1630,
    balanceAfter: 1580,
    aiTaskId: 'TASK-20240228-015',
    description: 'AI润色 - 深度学习研究论文',
    createdAt: '2024-02-28T15:30:00Z'
  },
  {
    id: '3',
    userId: '1',
    type: 'consume',
    amount: -80,
    balanceBefore: 1710,
    balanceAfter: 1630,
    aiTaskId: 'TASK-20240228-014',
    description: 'AI翻译 - 中文翻译英文',
    createdAt: '2024-02-28T14:20:00Z'
  },
  {
    id: '4',
    userId: '1',
    type: 'reward',
    amount: 100,
    balanceBefore: 1610,
    balanceAfter: 1710,
    description: '首次充值奖励',
    createdAt: '2024-02-25T09:00:00Z'
  }
]

// Mock 充值套餐
export const mockRechargePackages: RechargePackage[] = [
  {
    id: 'pkg-1',
    credits: 1000,
    price: 10,
    bonus: 100,
    isPopular: false
  },
  {
    id: 'pkg-2',
    credits: 3000,
    price: 30,
    bonus: 500,
    isPopular: true
  },
  {
    id: 'pkg-3',
    credits: 5000,
    price: 50,
    bonus: 1000,
    isPopular: false
  },
  {
    id: 'pkg-4',
    credits: 10000,
    price: 100,
    bonus: 3000,
    isPopular: false
  }
]

// Mock API 延迟
export const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms))

// Mock API 响应包装器
export const mockApiResponse = async <T>(data: T, delayMs: number = 500): Promise<T> => {
  await delay(delayMs)
  return data
}

// Mock 错误响应
export const mockApiError = async (message: string, delayMs: number = 500): Promise<never> => {
  await delay(delayMs)
  throw new Error(message)
}
