import { COLORS } from '../theme'
import type { PageKey } from '../types'

interface SidebarProps {
  active: PageKey
  onNav: (key: PageKey) => void
  onLogout: () => void
}

const navItems: { key: PageKey; label: string; emoji: string }[] = [
  { key: 'dashboard',   label: '仪表盘',     emoji: '📊' },
  { key: 'profiles',    label: '资料审核',    emoji: '👥' },
  { key: 'invitations', label: '邀请码管理',  emoji: '🎫' },
  { key: 'network',     label: '邀请关系网',  emoji: '🔗' },
  { key: 'map',         label: '用户地图',    emoji: '🗺️' },
]

export function Sidebar({ active, onNav, onLogout }: SidebarProps) {
  return (
    <div style={{
      width: 240, minHeight: '100vh', background: COLORS.surface,
      borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ padding: '28px 24px 20px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: COLORS.gradient, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20,
            backgroundSize: '200% 200%', animation: 'gradientShift 4s ease infinite',
          }}>📋</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>信息登记</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 500 }}>管理后台</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, padding: '16px 12px' }}>
        {navItems.map(it => (
          <div
            key={it.key}
            onClick={() => onNav(it.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 10, marginBottom: 4,
              cursor: 'pointer', fontSize: 14,
              fontWeight: active === it.key ? 600 : 400,
              color: active === it.key ? COLORS.text : COLORS.textSec,
              background: active === it.key ? `${COLORS.accent}10` : 'transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (active !== it.key) (e.currentTarget as HTMLElement).style.background = '#f8f8f8'
            }}
            onMouseLeave={e => {
              if (active !== it.key) (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <span style={{ fontSize: 18 }}>{it.emoji}</span>
            <span>{it.label}</span>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{ padding: '16px 12px', borderTop: `1px solid ${COLORS.border}` }}>
        <div
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 10,
            cursor: 'pointer', fontSize: 14, color: COLORS.textMuted,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fff0f0'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <span style={{ fontSize: 18 }}>👋</span>
          <span>退出登录</span>
        </div>
      </div>
    </div>
  )
}
