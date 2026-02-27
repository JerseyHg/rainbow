import { useState, useEffect } from 'react'
import { COLORS } from '../theme'
import { Card, Badge, Button } from '../components/UI'
import { api } from '../api'
import type { ToastType } from '../types'

interface InvitationItem {
  code: string
  is_used: boolean
  created_by_type: string
  notes: string | null
  created_at: string | null
  used_at: string | null
}

interface InvitationsPageProps {
  showToast: (message: string, type?: ToastType) => void
}

export function InvitationsPage({ showToast }: InvitationsPageProps) {
  const [count, setCount] = useState(10)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(-1)

  // 已有邀请码列表
  const [allCodes, setAllCodes] = useState<InvitationItem[]>([])
  const [listLoading, setListLoading] = useState(true)

  // 加载已有邀请码
  const loadCodes = async () => {
    setListLoading(true)
    try {
      const res = await api.getInvitationList(1, 200)
      setAllCodes(res.data?.list || [])
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setListLoading(false)
  }

  useEffect(() => { loadCodes() }, [])

  const generate = async () => {
    if (count < 1 || count > 100) return
    setLoading(true)
    try {
      await api.generateCodes(count, notes)
      showToast(`成功生成 ${count} 个邀请码`, 'success')
      // 重新加载列表
      loadCodes()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setLoading(false)
  }

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard?.writeText(code)
    setCopied(idx)
    setTimeout(() => setCopied(-1), 1500)
  }

  const copyUnused = () => {
    const unused = allCodes.filter(c => !c.is_used).map(c => c.code)
    if (unused.length === 0) {
      showToast('没有未使用的邀请码', 'warning')
      return
    }
    navigator.clipboard?.writeText(unused.join('\n'))
    showToast(`已复制 ${unused.length} 个未使用的邀请码`, 'success')
  }

  const usedCount = allCodes.filter(c => c.is_used).length
  const unusedCount = allCodes.filter(c => !c.is_used).length

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>邀请码管理</h2>
        <p style={{ fontSize: 14, color: COLORS.textSec }}>
          共 {allCodes.length} 个 · 已使用 {usedCount} · 未使用 {unusedCount}
        </p>
      </div>

      {/* Generator */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
          ➕ 生成邀请码
        </h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 140px' }}>
            <label style={{
              display: 'block', fontSize: 12, color: COLORS.textMuted,
              marginBottom: 8, fontWeight: 500,
            }}>数量</label>
            <input
              type="number"
              value={count}
              onChange={e => setCount(Math.min(100, Math.max(1, +e.target.value)))}
              min={1}
              max={100}
              style={{ width: '100%', height: 42 }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{
              display: 'block', fontSize: 12, color: COLORS.textMuted,
              marginBottom: 8, fontWeight: 500,
            }}>备注（可选）</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="例：线下活动用"
              style={{ width: '100%', height: 42 }}
              onKeyDown={e => e.key === 'Enter' && generate()}
            />
          </div>
          <Button onClick={generate} loading={loading} style={{ height: 42 }}>
            🎫 生成
          </Button>
        </div>
      </Card>

      {/* Invitation List */}
      <Card>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>
            📋 邀请码列表
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={copyUnused} size="sm">📋 复制未使用</Button>
            <Button variant="ghost" onClick={loadCodes} size="sm">🔄 刷新</Button>
          </div>
        </div>

        {listLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted }}>
            加载中...
          </div>
        ) : allCodes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
            <p style={{ color: COLORS.textMuted, fontSize: 14 }}>暂无邀请码，点击上方生成</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 8,
          }}>
            {allCodes.map((item, i) => (
              <div
                key={item.code}
                onClick={() => copyCode(item.code, i)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: COLORS.bg, borderRadius: 10,
                  cursor: 'pointer',
                  border: `1px solid ${copied === i ? COLORS.success : COLORS.border}`,
                  transition: 'all 0.2s',
                  opacity: item.is_used ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (copied !== i) e.currentTarget.style.borderColor = COLORS.borderLight
                }}
                onMouseLeave={e => {
                  if (copied !== i) e.currentTarget.style.borderColor = COLORS.border
                }}
              >
                <div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 15, fontWeight: 600, letterSpacing: '0.12em',
                    color: copied === i ? COLORS.success : COLORS.text,
                  }}>
                    {item.code}
                  </span>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
                    {item.created_by_type === 'admin' ? '管理员' : '用户'} · {item.created_at?.split(' ')[0] || ''}
                    {item.notes ? ` · ${item.notes}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {item.is_used ? (
                    <Badge variant="approved">已使用</Badge>
                  ) : copied === i ? (
                    <span style={{ fontSize: 12, color: COLORS.success }}>✓ 已复制</span>
                  ) : (
                    <Badge variant="pending">未使用</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
