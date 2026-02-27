import { useState, useEffect, useCallback } from 'react'
import { GlobalStyles } from './components/GlobalStyles'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/UI'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilesPage } from './pages/ProfilesPage'
import { InvitationsPage } from './pages/InvitationsPage'
import { api } from './api'
import type { PageKey, DashboardStats, ToastInfo, ToastType } from './types'
import { NetworkPage } from './pages/NetworkPage'
import { MapPage } from './pages/MapPage'

// 启动时从 localStorage 恢复 token
const savedToken = localStorage.getItem('admin_token')
if (savedToken) {
  api.setToken(savedToken)
}

export default function App() {
  const [token, setToken] = useState<string | null>(savedToken)
  const [page, setPage] = useState<PageKey>('dashboard')
  const [toast, setToast] = useState<ToastInfo | null>(null)
  const [profileFilter, setProfileFilter] = useState<string>('pending')
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    approved: 0,
    published: 0,
    totalCodes: 0,
    usedCodes: 0,
  })

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, key: Date.now() })
  }, [])

  useEffect(() => {
    if (!token) return
    api.getDashboardStats().then(res => {
      if (res.data) setStats(res.data)
    }).catch((e) => {
      // token 过期则自动登出
      if (e.message === 'AUTH_EXPIRED') {
        handleLogout()
      }
    })
  }, [token, page])

  const handleLogin = (t: string) => {
    api.setToken(t)
    setToken(t)
    localStorage.setItem('admin_token', t)
  }

  const handleLogout = () => {
    api.setToken(null)
    setToken(null)
    localStorage.removeItem('admin_token')
    setPage('dashboard')
  }

  const navToProfiles = (status: string) => {
    setProfileFilter(status)
    setPage('profiles')
  }

  if (!token) {
    return (
      <>
        <GlobalStyles />
        <LoginPage onLogin={handleLogin} />
      </>
    )
  }

  return (
    <>
      <GlobalStyles />
      <Sidebar active={page} onNav={setPage} onLogout={handleLogout} />

      <div style={{ marginLeft: 240, minHeight: '100vh', padding: '32px 40px' }}>
        {page === 'dashboard' && (
            <DashboardPage stats={stats} onNav={setPage} onFilterProfiles={navToProfiles} showToast={showToast} />
        )}
        {page === 'profiles' && (
          <ProfilesPage showToast={showToast} initialFilter={profileFilter} />
        )}
        {page === 'invitations' && (
          <InvitationsPage showToast={showToast} />
        )}
        {page === 'network' && (
            <NetworkPage showToast={showToast} />
        )}
        {page === 'map' && (
            <MapPage showToast={showToast} />
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </>
  )
}
