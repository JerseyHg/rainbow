import { useState, useEffect } from 'react'
import { COLORS } from '../theme'
import { Card, StatCard, Button } from '../components/UI'
import { api } from '../api'
import type { DashboardStats, PageKey, ToastType } from '../types'

interface DashboardPageProps {
  stats: DashboardStats
  onNav: (key: PageKey) => void
  onFilterProfiles: (status: string) => void
  showToast?: (msg: string, type?: ToastType) => void
}

export function DashboardPage({ stats, onNav, onFilterProfiles, showToast }: DashboardPageProps) {
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)

  useEffect(() => {
    api.getAiReviewStatus().then(res => {
      if (res.data) setAiEnabled(res.data.enabled)
    }).catch(() => {})
  }, [])

  const handleToggleAi = async () => {
    setAiLoading(true)
    try {
      const res = await api.toggleAiReview()
      if (res.data) {
        setAiEnabled(res.data.enabled)
        showToast?.(res.data.enabled ? 'AI 自动审核已开启' : 'AI 自动审核已关闭', 'success')
      }
    } catch (e: any) {
      showToast?.(e.message || '操作失败', 'error')
    }
    setAiLoading(false)
  }

  const handleBatchAiReview = async () => {
    if (!confirm('确定要对所有待审核资料执行 AI 审核吗？')) return
    setBatchLoading(true)
    try {
      const res = await api.batchAiReview()
      if (res.data) {
        const d = res.data
        showToast?.(`批量审核完成：${d.rejected}个拒绝，${d.passed}个通过，${d.errors}个异常`, 'success')
      }
    } catch (e: any) {
      showToast?.(e.message || '批量审核失败', 'error')
    }
    setBatchLoading(false)
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>仪表盘</h2>
        <p style={{ fontSize: 14, color: COLORS.textSec }}>欢迎回来，管理员 ✨</p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16, marginBottom: 32,
      }}>
        <div style={{ cursor: 'pointer' }} onClick={() => onFilterProfiles('pending')}>
          <StatCard label="待审核" value={stats.pending} icon="⏳" color={COLORS.warning} sub="点击查看" />
        </div>
        <div style={{ cursor: 'pointer' }} onClick={() => onFilterProfiles('approved')}>
          <StatCard label="已通过" value={stats.approved} icon="✅" color={COLORS.success} sub="点击查看" />
        </div>
        <div style={{ cursor: 'pointer' }} onClick={() => onFilterProfiles('published')}>
          <StatCard label="已发布" value={stats.published} icon="📄" color={COLORS.info} sub="点击查看" />
        </div>
        <div style={{ cursor: 'pointer' }} onClick={() => onNav('invitations')}>
          <StatCard label="邀请码" value={stats.totalCodes} icon="🎫" color={COLORS.accent} sub={`已使用 ${stats.usedCodes}`} />
        </div>
      </div>

      {/* ★ AI 审核控制面板 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: COLORS.textSec, margin: 0 }}>
            🤖 AI 自动审核
          </h3>
          <button
            onClick={handleToggleAi}
            disabled={aiLoading}
            style={{
              position: 'relative',
              width: 52,
              height: 28,
              borderRadius: 14,
              border: 'none',
              cursor: aiLoading ? 'not-allowed' : 'pointer',
              background: aiEnabled ? COLORS.success : '#ccc',
              transition: 'background 0.3s',
              padding: 0,
              opacity: aiLoading ? 0.6 : 1,
            }}
          >
            <span style={{
              display: 'block',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'transform 0.3s',
              transform: aiEnabled ? 'translateX(26px)' : 'translateX(3px)',
              marginTop: 3,
            }} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: COLORS.textSec, margin: '0 0 16px 0', lineHeight: 1.6 }}>
          {aiEnabled
            ? '✅ 已开启 — 用户提交资料后，AI 将自动检查缺失字段并给出补充提示'
            : '⏸ 已关闭 — 所有资料将直接进入待审核队列，由管理员手动审核'}
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="soft"
            onClick={handleBatchAiReview}
            loading={batchLoading}
          >
            🔄 批量 AI 审核待审资料
          </Button>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>
            （批量操作不受开关限制）
          </span>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: COLORS.textSec }}>快速操作</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="soft" onClick={() => onFilterProfiles('pending')}>👥 审核资料</Button>
          <Button variant="ghost" onClick={() => onFilterProfiles('published')}>📄 已发布</Button>
          <Button variant="ghost" onClick={() => onNav('invitations')}>🎫 邀请码管理</Button>
          <Button variant="ghost" onClick={() => onNav('network')}>🌐 邀请网络</Button>
        </div>
      </Card>
    </div>
  )
}
