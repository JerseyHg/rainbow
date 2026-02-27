import { useState, useEffect, useCallback } from 'react'
import { COLORS, STATUS_LABEL } from '../theme'
import { Card, Badge, Button, Modal, Empty } from '../components/UI'
import { api } from '../api'
import type { ProfileSummary, ProfileDetail, PostPreview, ToastType } from '../types'

const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'pending', label: '⏳ 待审核' },
  { key: 'approved', label: '✅ 已通过' },
  { key: 'published', label: '📄 已发布' },
  { key: 'rejected', label: '❌ 已拒绝' },
  { key: 'all', label: '📋 全部' },
]

interface ProfilesPageProps {
  showToast: (message: string, type?: ToastType) => void
  initialFilter?: string
}

export function ProfilesPage({ showToast, initialFilter = 'pending' }: ProfilesPageProps) {
  const [filter, setFilter] = useState(initialFilter)
  const [profiles, setProfiles] = useState<ProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ProfileDetail | null>(null)
  const [postPreview, setPostPreview] = useState<PostPreview | null>(null)
  const [showPost, setShowPost] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [postGenerating, setPostGenerating] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<{
    html: string
    download_url: string | null
    title: string
    serial_number: string
  } | null>(null)

  // 当 initialFilter 从外部变化时同步
  useEffect(() => {
    setFilter(initialFilter)
  }, [initialFilter])

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getProfilesByStatus(filter)
      setProfiles(res.data?.list || [])
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setLoading(false)
  }, [showToast, filter])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  const openDetail = async (id: number) => {
    setSelectedId(id)
    try {
      const res = await api.getProfileDetail(id)
      setDetail(res.data || null)
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const openPost = async (id: number) => {
    try {
      const res = await api.previewPost(id)
      const data = res.data

      if (data?.post_url) {
        // ★ 有 AI 文案 → 调用 generate 拿 HTML 内容
        setPostGenerating(true)
        try {
          const genRes = await api.generateAiPost(id)
          if (genRes.data) {
            setGeneratedPost({
              html: genRes.data.html,
              download_url: genRes.data.download_url,
              title: genRes.data.title,
              serial_number: genRes.data.serial_number,
            })
          }
        } catch (e: any) {
          showToast(e.message || '加载失败', 'error')
        }
        setPostGenerating(false)
      } else {
        // 无 AI 文案 → 旧模板
        setPostPreview(data || null)
        setShowPost(true)
      }
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const handleApprove = async (id: number) => {
    setActionLoading('approve')
    try {
      await api.approveProfile(id, '管理员审核通过')
      showToast('审核通过！邀请码已生成', 'success')
      closeDetail()
      loadProfiles()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setActionLoading('')
  }

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) return
    setActionLoading('reject')
    try {
      await api.rejectProfile(id, rejectReason)
      showToast('已拒绝', 'warning')
      setRejectModal(false)
      setRejectReason('')
      closeDetail()
      loadProfiles()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setActionLoading('')
  }

  const handleGeneratePost = async (id: number) => {
    setPostGenerating(true)
    try {
      const res = await api.generateAiPost(id)
      if (res.data) {
        setGeneratedPost({
          html: res.data.html,
          download_url: res.data.download_url,
          title: res.data.title,
          serial_number: res.data.serial_number,
        })
        showToast(res.data.ai_generated ? 'AI文案生成成功！' : '模板文案已生成', 'success')
      }
    } catch (e: any) {
      showToast(e.message || '生成失败', 'error')
    }
    setPostGenerating(false)
  }

  const handlePreviewPost = () => {
    if (!generatedPost) return
    if (generatedPost.download_url) {
      window.open(generatedPost.download_url, '_blank')
    } else if (generatedPost.html) {
      const blob = new Blob([generatedPost.html], { type: 'text/html; charset=utf-8' })
      window.open(URL.createObjectURL(blob), '_blank')
    }
  }

  const handleDownloadPost = () => {
    if (!generatedPost) return
    if (generatedPost.download_url) {
      window.open(generatedPost.download_url, '_blank')
    } else if (generatedPost.html) {
      const blob = new Blob([generatedPost.html], { type: 'text/html; charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `文案_${generatedPost.serial_number}.html`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleCopyPostLink = () => {
    if (!generatedPost?.download_url) {
      showToast('COS链接不可用', 'warning')
      return
    }
    navigator.clipboard?.writeText(generatedPost.download_url)
    showToast('下载链接已复制，可分享给朋友', 'success')
  }

  const closeDetail = () => {
    setSelectedId(null)
    setDetail(null)
    setGeneratedPost(null)
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>资料管理</h2>
          <p style={{ fontSize: 14, color: COLORS.textSec }}>共 {profiles.length} 条记录</p>
        </div>
        <Button variant="ghost" onClick={loadProfiles} size="sm">🔄 刷新</Button>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap',
      }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '8px 18px',
              borderRadius: 20,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: filter === tab.key ? COLORS.accent : COLORS.bg,
              color: filter === tab.key ? '#fff' : COLORS.textSec,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: COLORS.textMuted }}>
          <div style={{ animation: 'pulse 1.2s infinite', fontSize: 16 }}>加载中...</div>
        </div>
      ) : profiles.length === 0 ? (
        <Empty text={`暂无${FILTER_TABS.find(t => t.key === filter)?.label.slice(2) || ''}资料`} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {profiles.map((p, i) => (
            <Card
              key={p.id}
              hover
              onClick={() => openDetail(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px',
                cursor: 'pointer',
                animationDelay: `${i * 0.05}s`,
                animation: 'slideIn 0.3s ease forwards',
                opacity: 0,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: COLORS.accentDim,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: COLORS.accent,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {p.serial_number || '#'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                  <Badge variant={p.status}>{STATUS_LABEL[p.status] || p.status}</Badge>
                </div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>
                  {p.gender} · {p.age}岁 · {p.work_location || '未填'}
                </div>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                {p.create_time?.split(' ')[0]}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ========== Detail Modal ========== */}
      <Modal
        open={!!selectedId && !!detail}
        onClose={closeDetail}
        title="资料详情"
        width={660}
      >
        {detail && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, background: COLORS.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: '#fff', backgroundSize: '200% 200%',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {detail.serial_number || '?'}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{detail.name}</div>
                <div style={{ fontSize: 13, color: COLORS.textSec }}>
                  {detail.gender} · {detail.age}岁 · {detail.height}cm / {detail.weight}kg
                </div>
              </div>
              <Badge variant={detail.status} style={{ marginLeft: 'auto' }}>
                {STATUS_LABEL[detail.status]}
              </Badge>
            </div>

            {/* Info Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
              background: COLORS.border, borderRadius: 12, overflow: 'hidden', marginBottom: 20,
            }}>
              {([
                ['婚姻状况', detail.marital_status],
                ['体型', detail.body_type],
                ['籍贯', detail.hometown],
                ['工作地', detail.work_location],
                ['行业', detail.industry],
                ['星座', detail.constellation],
                ['MBTI', detail.mbti],
                ['出柜状态', detail.coming_out_status],
                ['健康状况', detail.health_condition],
                ['住房', detail.housing_status],
                ['交友目的', detail.dating_purpose],
                ['孩子意愿', detail.want_children],
                ['微信号', detail.wechat_id],
                ['推荐人', detail.referred_by],
              ] as [string, string | null][])
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} style={{ padding: '12px 16px', background: COLORS.surface }}>
                    <div style={{
                      fontSize: 11, color: COLORS.textMuted, marginBottom: 4,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
            </div>

            {/* Hobbies */}
            {detail.hobbies && detail.hobbies.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 12, color: COLORS.textMuted, marginBottom: 8,
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>兴趣爱好</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {detail.hobbies.map(h => (
                    <span key={h} style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 13,
                      background: COLORS.accentDim, color: COLORS.accent, fontWeight: 500,
                    }}>{h}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Lifestyle */}
            {detail.lifestyle && (
              <div style={{
                marginBottom: 20, padding: 16, background: COLORS.bg, borderRadius: 10,
                fontSize: 14, lineHeight: 1.8, color: COLORS.textSec,
              }}>
                <div style={{
                  fontSize: 12, color: COLORS.textMuted, marginBottom: 8,
                  fontWeight: 600, textTransform: 'uppercase',
                }}>自我描述</div>
                {detail.lifestyle}
              </div>
            )}

            {/* Expectation */}
            {detail.expectation && Object.values(detail.expectation).some(v => v) && (
              <div style={{ marginBottom: 20, padding: 16, background: COLORS.bg, borderRadius: 10 }}>
                <div style={{
                  fontSize: 12, color: COLORS.textMuted, marginBottom: 10,
                  fontWeight: 600, textTransform: 'uppercase',
                }}>期待对象</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(detail.expectation)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                        <span style={{ color: COLORS.textMuted, minWidth: 80 }}>{k}</span>
                        <span style={{ color: COLORS.textSec }}>{v}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {detail.photos && detail.photos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 12, color: COLORS.textMuted, marginBottom: 8,
                  fontWeight: 600, textTransform: 'uppercase',
                }}>照片 ({detail.photos.length})</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {detail.photos.map((url, i) => (
                    <div key={i} style={{
                      width: 80, height: 80, borderRadius: 10, background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`, overflow: 'hidden',
                    }}>
                      <img
                        src={url.startsWith('http') ? url : `${window.location.origin}${url}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt=""
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons - 只有 pending 状态才显示审核按钮 */}
            {detail.status === 'pending' && (
              <div style={{
                display: 'flex', gap: 12, marginTop: 24,
                paddingTop: 20, borderTop: `1px solid ${COLORS.border}`,
              }}>
                <Button variant="ghost" onClick={() => openPost(detail.id)}>👁 预览文案</Button>
                <Button
                  variant="soft"
                  onClick={() => handleGeneratePost(detail.id)}
                  loading={postGenerating}
                >🤖 AI生成文案</Button>
                <div style={{ flex: 1 }} />
                <Button
                  variant="danger"
                  onClick={() => setRejectModal(true)}
                  loading={actionLoading === 'reject'}
                >✕ 拒绝</Button>
                <Button
                  variant="success"
                  onClick={() => handleApprove(detail.id)}
                  loading={actionLoading === 'approve'}
                >✓ 通过</Button>
                <Button
                    variant="ghost"
                    onClick={async () => {
                      setActionLoading('ai')
                      try {
                        const res = await api.aiReviewProfile(detail.id)
                        showToast(res.message || 'AI审核完成', 'success')
                        closeDetail()
                        loadProfiles()
                      } catch (e: any) {
                        showToast(e.message, 'error')
                      }
                      setActionLoading('')
                    }}
                    loading={actionLoading === 'ai'}
                >🤖 AI审核</Button>
              </div>
            )}

            {/* 非 pending 状态也可以预览文案 */}
            {detail.status !== 'pending' && (
              <div style={{
                display: 'flex', gap: 12, marginTop: 24,
                paddingTop: 20, borderTop: `1px solid ${COLORS.border}`,
              }}>
                <Button variant="ghost" onClick={() => openPost(detail.id)}>👁 预览文案</Button>
                <Button
                    variant="soft"
                    onClick={() => handleGeneratePost(detail.id)}
                    loading={postGenerating}
                >🤖 AI生成文案</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ========== Post Preview Modal ========== */}
      <Modal
        open={showPost && !!postPreview}
        onClose={() => { setShowPost(false); setPostPreview(null) }}
        title="公众号文案预览"
        width={500}
      >
        {postPreview && (
          <div>
            <div style={{
              padding: 20, background: COLORS.bg, borderRadius: 12, marginBottom: 16,
              border: `1px solid ${COLORS.border}`,
            }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: COLORS.accent, marginBottom: 16 }}>
                {postPreview.title}
              </h4>
              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontSize: 14, lineHeight: 2, color: COLORS.textSec,
                fontFamily: "'Noto Sans SC', 'DM Sans', sans-serif",
              }}>
                {postPreview.content}
              </pre>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(`${postPreview.title}\n\n${postPreview.content}`)
                showToast('已复制到剪贴板', 'success')
              }}
            >
              📋 复制文案
            </Button>
          </div>
        )}
      </Modal>

      {/* ========== AI Generated Post Modal ========== */}
      <Modal
          open={!!generatedPost}
          onClose={() => setGeneratedPost(null)}
          title="🤖 AI 文案"
          width={660}
      >
        {generatedPost && (
            <div>
              {generatedPost.html && (
                  <iframe
                      srcDoc={generatedPost.html}
                      style={{
                        width: '100%',
                        height: 500,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 12,
                        marginBottom: 16,
                        background: '#fff',
                      }}
                  />
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Button variant="ghost" onClick={handleDownloadPost}>
                  ⬇️ 下载 HTML
                </Button>
                {generatedPost.download_url && (
                    <Button variant="ghost" onClick={handleCopyPostLink}>
                      🔗 复制分享链接
                    </Button>
                )}
              </div>
            </div>
        )}
      </Modal>

      {/* ========== Reject Modal ========== */}
      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="拒绝原因"
        width={440}
      >
        <textarea
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          placeholder="请输入拒绝原因，用户将看到此内容..."
          style={{ width: '100%', minHeight: 120, resize: 'vertical', marginBottom: 20 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button variant="ghost" onClick={() => setRejectModal(false)}>取消</Button>
          <Button
            variant="danger"
            onClick={() => detail && handleReject(detail.id)}
            disabled={!rejectReason.trim()}
            loading={actionLoading === 'reject'}
          >
            确认拒绝
          </Button>
        </div>
      </Modal>
    </div>
  )
}
