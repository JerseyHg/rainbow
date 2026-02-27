import { useState } from 'react'
import { COLORS } from '../theme'
import { Card, Button } from '../components/UI'
import { api } from '../api'

interface LoginPageProps {
  onLogin: (token: string) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await api.login(username, password)
      if (res.success && res.token) {
        api.setToken(res.token)
        onLogin(res.token)
      } else {
        setError(res.message || '登录失败')
      }
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `
        radial-gradient(ellipse at 30% 20%, rgba(232,69,124,0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.06) 0%, transparent 50%),
        ${COLORS.bg}`,
    }}>
      <div style={{ width: 420, maxWidth: '92vw', animation: 'fadeIn 0.5s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px',
            background: COLORS.gradient, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 36,
            boxShadow: '0 12px 40px rgba(232,69,124,0.3)',
            backgroundSize: '200% 200%', animation: 'gradientShift 4s ease infinite',
          }}>🌈</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>
            彩虹注册管理后台
          </h1>
          <p style={{ fontSize: 14, color: COLORS.textMuted }}>Rainbow Register Admin</p>
        </div>

        {/* Form */}
        <Card style={{ padding: 32 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.textSec, marginBottom: 8 }}>
              管理员用户名
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoFocus
              style={{ width: '100%', height: 46 }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.textSec, marginBottom: 8 }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={{ width: '100%', height: 46 }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <div style={{
              color: COLORS.danger, fontSize: 13, marginBottom: 16,
              padding: '10px 14px', background: COLORS.dangerDim, borderRadius: 8,
            }}>
              ⚠ {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!username || !password}
            style={{ width: '100%', height: 48, fontSize: 15, borderRadius: 12 }}
          >
            {loading ? '登录中...' : '登 录'}
          </Button>
        </Card>

        <p style={{ textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 24 }}>
          Rainbow Register Backend v1.0.0
        </p>
      </div>
    </div>
  )
}
