import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

interface LoginPageProps {
  onClose: () => void
}

export const LoginPage = ({ onClose }: LoginPageProps) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const { showToast, ToastContainer } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const response = await authApi.login({ email, password })
        const { user, tokens } = response.data
        login(user, tokens.access_token)
        showToast('登录成功', 'success')
        setTimeout(onClose, 500)
      } else {
        const response = await authApi.register({ email, password, username })
        const { user, tokens } = response.data
        login(user, tokens.access_token)
        showToast('注册成功', 'success')
        setTimeout(onClose, 500)
      }
    } catch (err: any) {
      const status = err.response?.status
      const errorData = err.response?.data?.error
      const message = errorData?.message || err.response?.data?.message

      if (status === 401) {
        showToast(message || '用户名或密码错误', 'error')
      } else if (status === 400) {
        // 400错误直接显示后端返回的具体错误信息
        showToast(message || '请求参数错误', 'error')
      } else if (status === 409) {
        showToast(message || '该邮箱已被注册', 'error')
      } else if (status === 500) {
        showToast('服务器错误,请稍后重试', 'error')
      } else {
        showToast(message || '操作失败,请重试', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? '登录' : '注册'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2">用户名</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">邮箱</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:underline"
          >
            {isLogin ? '没有账号?去注册' : '已有账号?去登录'}
          </button>
        </div>
      </Card>
      </div>
    </>
  )
}
