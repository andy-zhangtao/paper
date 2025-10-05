import { creditApi } from '@/lib/api'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

interface CreditContextType {
  balance: number
  isLoading: boolean
  error: string | null
  refreshBalance: () => Promise<void>
  updateBalance: (newBalance: number) => void
}

const CreditContext = createContext<CreditContextType | undefined>(undefined)

export const CreditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  const refreshBalance = useCallback(async () => {
    if (!isAuthenticated) {
      setBalance(0)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await creditApi.getBalance()
      console.log('API 响应:', response)
      
      // 后端返回格式: { success: true, data: { credits: ... } }
      // 响应拦截器已经返回了 response.data，所以这里收到的是整个对象
      let balanceValue = 0
      
      if (response && typeof response === 'object') {
        // 如果是 { success: true, data: { credits: ... } } 格式
        if ('success' in response && 'data' in response && response.data) {
          const data = response.data as any
          balanceValue = data.credits || data.balance || 0
        }
        // 如果直接是 { credits: ... } 或 { balance: ... } 格式
        else if ('credits' in response) {
          balanceValue = (response as any).credits || 0
        } else if ('balance' in response) {
          balanceValue = (response as any).balance || 0
        }
      }
      
      console.log('设置积分余额:', balanceValue)
      setBalance(balanceValue)
    } catch (err: any) {
      console.error('获取积分余额失败:', err)
      setError(err.message || '获取积分失败')
      // 发生错误时设置为 0 而不是 undefined
      setBalance(0)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  const updateBalance = useCallback((newBalance: number) => {
    setBalance(newBalance)
  }, [])

  // 用户登录后自动获取积分
  useEffect(() => {
    if (isAuthenticated) {
      refreshBalance()
    } else {
      setBalance(0)
    }
  }, [isAuthenticated, refreshBalance])

  return (
    <CreditContext.Provider
      value={{
        balance,
        isLoading,
        error,
        refreshBalance,
        updateBalance,
      }}
    >
      {children}
    </CreditContext.Provider>
  )
}

export const useCredit = () => {
  const context = useContext(CreditContext)
  if (context === undefined) {
    throw new Error('useCredit must be used within a CreditProvider')
  }
  return context
}
