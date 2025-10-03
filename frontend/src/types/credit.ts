export interface CreditBalance {
  balance: number
  totalEarned: number
  totalConsumed: number
}

export interface CreditTransaction {
  id: string
  userId: string
  type: 'recharge' | 'consume' | 'refund' | 'reward'
  amount: number
  balanceBefore: number
  balanceAfter: number
  orderId?: string
  aiTaskId?: string
  description: string
  createdAt: string
}

export interface RechargePackage {
  id: string
  credits: number
  price: number
  bonus: number
  isPopular?: boolean
}

export interface CreateOrderRequest {
  packageId: string
  paymentMethod: 'alipay' | 'wechat'
}

export interface CreateOrderResponse {
  orderId: string
  paymentUrl: string
  qrCode: string
}

export interface AIPolishRequest {
  text: string
}

export interface AIPolishResponse {
  polishedText: string
  costCredits: number
}

export interface AITranslateRequest {
  text: string
  targetLanguage: 'en' | 'zh'
}

export interface AITranslateResponse {
  translatedText: string
  costCredits: number
}
