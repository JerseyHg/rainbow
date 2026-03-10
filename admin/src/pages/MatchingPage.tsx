import { useState, useEffect } from 'react'
import { COLORS } from '../theme'
import { Card, Button, Modal, Empty } from '../components/UI'
import { api } from '../api'
import type { ToastType, ProfileSummary, MatchCandidate, MatchAnalysis } from '../types'

interface MatchingPageProps {
  showToast: (message: string, type?: ToastType) => void
}

export function MatchingPage({ showToast }: MatchingPageProps) {
  // User selection
  const [users, setUsers] = useState<ProfileSummary[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [targetUser, setTargetUser] = useState<any>(null)

  // Candidates
  const [candidates, setCandidates] = useState<MatchCandidate[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  // Embedding
  const [generatingEmbedding, setGeneratingEmbedding] = useState(false)
  const [batchGenerating, setBatchGenerating] = useState(false)

  // AI analysis modal
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null)
  const [analysisTarget, setAnalysisTarget] = useState<MatchCandidate | null>(null)

  // Load approved + published users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const [res1, res2] = await Promise.all([
          api.getProfilesByStatus('approved', 1, 200),
          api.getProfilesByStatus('published', 1, 200),
        ])
        const approved = res1.data?.list || []
        const published = res2.data?.list || []
        // Deduplicate by id
        const map = new Map<number, ProfileSummary>()
        for (const u of [...approved, ...published]) map.set(u.id, u)
        setUsers(Array.from(map.values()))
      } catch (e: any) {
        showToast(e.message, 'error')
      }
    }
    loadUsers()
  }, [])

  // Load candidates when user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setCandidates([])
      setTargetUser(null)
      return
    }
    setLoadingCandidates(true)
    api.getMatchingCandidates(selectedUserId)
      .then(res => {
        if (res.data) {
          setTargetUser(res.data.target)
          setCandidates(res.data.candidates || [])
        }
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoadingCandidates(false))
  }, [selectedUserId])

  const handleAnalyze = async (candidate: MatchCandidate) => {
    if (!selectedUserId) return
    setAnalysisTarget(candidate)
    setAnalyzing(true)
    setAnalysis(null)
    try {
      const res = await api.analyzeMatch(selectedUserId, candidate.id)
      if (res.success && res.data) {
        setAnalysis(res.data)
      } else {
        showToast(res.message || 'AI 分析失败', 'error')
      }
    } catch (e: any) {
      showToast(e.message || '分析失败', 'error')
    }
    setAnalyzing(false)
  }

  const reloadCandidates = (uid: number) => {
    setLoadingCandidates(true)
    api.getMatchingCandidates(uid)
      .then(res => {
        if (res.data) {
          setTargetUser(res.data.target)
          setCandidates(res.data.candidates || [])
        }
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoadingCandidates(false))
  }

  const handleGenerateEmbedding = async () => {
    if (!selectedUserId) return
    setGeneratingEmbedding(true)
    try {
      const res = await api.generateEmbedding(selectedUserId)
      if (res.success) {
        showToast('Embedding 生成成功')
        reloadCandidates(selectedUserId)
      } else {
        showToast(res.message || '生成失败', 'error')
      }
    } catch (e: any) {
      showToast(e.message || '生成失败', 'error')
    }
    setGeneratingEmbedding(false)
  }

  const handleBatchGenerate = async () => {
    setBatchGenerating(true)
    try {
      const res = await api.batchGenerateEmbeddings()
      if (res.success) {
        const d = res.data || {}
        showToast(`批量生成完成：成功 ${d.success || 0}，跳过 ${d.skipped || 0}，失败 ${d.failed || 0}`)
      } else {
        showToast(res.message || '批量生成失败', 'error')
      }
    } catch (e: any) {
      showToast(e.message || '批量生成失败', 'error')
    }
    setBatchGenerating(false)
  }

  const filteredUsers = searchText.trim()
    ? users.filter(u =>
        u.name.includes(searchText) ||
        (u.serial_number && u.serial_number.includes(searchText))
      )
    : users

  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.success
    if (score >= 60) return COLORS.warning
    if (score >= 40) return COLORS.info
    return COLORS.textMuted
  }

  const getPhotoUrl = (url: string) =>
    url.startsWith('http') ? url : `${window.location.origin}${url}`

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>匹配度分析</h2>
          <p style={{ fontSize: 14, color: COLORS.textSec }}>
            选择一位用户，查看 AI 推荐的匹配对象
          </p>
        </div>
        <Button
          onClick={handleBatchGenerate}
          disabled={batchGenerating}
          style={{ fontSize: 13, padding: '8px 16px', whiteSpace: 'nowrap' }}
        >
          {batchGenerating ? '批量生成中...' : '批量生成 Embedding'}
        </Button>
      </div>

      {/* User Search/Select */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textSec, marginBottom: 12 }}>
          选择目标用户
        </div>
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="搜索姓名或编号..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${COLORS.border}`, background: COLORS.bg,
            color: COLORS.text, fontSize: 14, marginBottom: 12,
            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{
          maxHeight: 200, overflowY: 'auto', display: 'flex',
          flexWrap: 'wrap', gap: 8,
        }}>
          {filteredUsers.slice(0, 50).map(u => (
            <div
              key={u.id}
              onClick={() => {
                setSelectedUserId(u.id)
                setSearchText('')
              }}
              style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                background: selectedUserId === u.id ? COLORS.accentDim : COLORS.bg,
                color: selectedUserId === u.id ? COLORS.accent : COLORS.textSec,
                border: `1px solid ${selectedUserId === u.id ? COLORS.accent : COLORS.border}`,
              }}
            >
              {u.serial_number || '#'} {u.name} ({u.gender}/{u.age}岁)
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div style={{ fontSize: 13, color: COLORS.textMuted, padding: 8 }}>
              暂无匹配用户
            </div>
          )}
        </div>
      </Card>

      {/* Target User Summary */}
      {targetUser && (
        <Card style={{ marginBottom: 24, borderLeft: `3px solid ${COLORS.accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: COLORS.gradient, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff',
              backgroundSize: '200% 200%',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {targetUser.serial_number || '?'}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>
                {targetUser.name}
              </div>
              <div style={{ fontSize: 13, color: COLORS.textSec }}>
                {targetUser.gender} · {targetUser.age}岁 · {targetUser.work_location || '-'}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              {targetUser.has_embedding ? (
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 10,
                  background: COLORS.successDim, color: COLORS.success, fontWeight: 600,
                }}>
                  Embedding 已生成
                </span>
              ) : (
                <Button
                  onClick={handleGenerateEmbedding}
                  disabled={generatingEmbedding}
                  style={{ fontSize: 12, padding: '4px 12px' }}
                >
                  {generatingEmbedding ? '生成中...' : '生成 Embedding'}
                </Button>
              )}
              <span style={{ fontSize: 13, color: COLORS.textMuted }}>
                找到 {candidates.length} 位候选人
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Candidates Grid */}
      {loadingCandidates ? (
        <div style={{ textAlign: 'center', padding: 60, color: COLORS.textMuted }}>
          <div style={{ animation: 'pulse 1.2s infinite', fontSize: 16 }}>
            正在计算匹配度...
          </div>
        </div>
      ) : !selectedUserId ? (
        <Empty text="请先选择一位用户" />
      ) : candidates.length === 0 ? (
        <Empty text="暂无匹配候选人" />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {candidates.map((c, i) => (
            <Card
              key={c.id}
              hover
              onClick={() => handleAnalyze(c)}
              style={{
                cursor: 'pointer', padding: 0, overflow: 'hidden',
                animation: 'slideIn 0.3s ease forwards',
                animationDelay: `${i * 0.03}s`,
                opacity: 0,
              }}
            >
              <div style={{ padding: '16px 18px' }}>
                {/* Score + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  {/* Avatar or Score */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, overflow: 'hidden',
                    background: c.avatar ? COLORS.bg : `${getScoreColor(c.basic_score)}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    border: `1px solid ${c.avatar ? COLORS.border : getScoreColor(c.basic_score)}`,
                  }}>
                    {c.avatar ? (
                      <img
                        src={getPhotoUrl(c.avatar)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt=""
                      />
                    ) : (
                      <span style={{
                        fontSize: 16, fontWeight: 800,
                        color: getScoreColor(c.basic_score),
                      }}>
                        {c.basic_score}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2,
                    }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>
                        {c.serial_number || '#'} {c.name}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 8,
                        background: `${getScoreColor(c.basic_score)}18`,
                        color: getScoreColor(c.basic_score),
                      }}>
                        {c.basic_score}分
                      </span>
                      {c.embedding_score != null && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 8,
                          background: `${COLORS.accent}18`,
                          color: COLORS.accent,
                        }}>
                          AI {c.embedding_score}%
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textSec }}>
                      {c.gender} · {c.age}岁 · {c.height}cm · {c.work_location || '-'}
                    </div>
                  </div>
                </div>

                {/* Match Reasons Tags */}
                {c.match_reasons.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {c.match_reasons.map((r, ri) => (
                      <span key={ri} style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 11,
                        background: COLORS.successDim, color: COLORS.success,
                        fontWeight: 500,
                      }}>
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                padding: '8px 18px', fontSize: 12, color: COLORS.accent,
                borderTop: `1px solid ${COLORS.border}`, fontWeight: 500,
                textAlign: 'center',
              }}>
                点击查看 AI 详细分析
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* AI Analysis Modal */}
      <Modal
        open={!!analysisTarget}
        onClose={() => { setAnalysisTarget(null); setAnalysis(null) }}
        title="AI 匹配分析"
        width={660}
      >
        {analyzing ? (
          <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.2s infinite' }}>
              💘
            </div>
            <div>AI 正在分析匹配度，请稍候...</div>
          </div>
        ) : analysis ? (
          <div>
            {/* Score Circle */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 80, height: 80, borderRadius: '50%',
                background: `${getScoreColor(analysis.score)}18`,
                border: `3px solid ${getScoreColor(analysis.score)}`,
              }}>
                <span style={{
                  fontSize: 28, fontWeight: 800,
                  color: getScoreColor(analysis.score),
                }}>
                  {analysis.score}
                </span>
              </div>
              <div style={{
                fontSize: 15, color: COLORS.textSec, marginTop: 12,
                fontWeight: 500,
              }}>
                {analysis.summary}
              </div>
              <div style={{
                fontSize: 12, color: COLORS.textMuted, marginTop: 6,
              }}>
                {analysis.profile_a.serial_number || '#'} {analysis.profile_a.name}
                {' '}⇄{' '}
                {analysis.profile_b.serial_number || '#'} {analysis.profile_b.name}
              </div>
            </div>

            {/* Strengths & Concerns */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 16, marginBottom: 24,
            }}>
              <div style={{ padding: 16, background: COLORS.successDim, borderRadius: 12 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: COLORS.success,
                  marginBottom: 8,
                }}>
                  匹配优势
                </div>
                {analysis.strengths.map((s, i) => (
                  <div key={i} style={{
                    fontSize: 13, color: COLORS.textSec, marginBottom: 4,
                    lineHeight: 1.6,
                  }}>
                    + {s}
                  </div>
                ))}
              </div>
              <div style={{ padding: 16, background: COLORS.warningDim, borderRadius: 12 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: COLORS.warning,
                  marginBottom: 8,
                }}>
                  潜在顾虑
                </div>
                {analysis.concerns.map((c, i) => (
                  <div key={i} style={{
                    fontSize: 13, color: COLORS.textSec, marginBottom: 4,
                    lineHeight: 1.6,
                  }}>
                    - {c}
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Analysis */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(analysis.analysis).map(([key, value]) => {
                const labels: Record<string, string> = {
                  basic_compatibility: '基本条件',
                  expectation_alignment: '期望匹配',
                  lifestyle_compatibility: '生活方式',
                  personality_fit: '性格匹配',
                }
                return (
                  <div key={key} style={{
                    padding: 14, background: COLORS.bg, borderRadius: 10,
                  }}>
                    <div style={{
                      fontSize: 12, color: COLORS.textMuted, marginBottom: 6,
                      fontWeight: 600, textTransform: 'uppercase',
                    }}>
                      {labels[key] || key}
                    </div>
                    <div style={{
                      fontSize: 14, color: COLORS.textSec, lineHeight: 1.7,
                    }}>
                      {value}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted }}>
            分析结果将在此显示
          </div>
        )}
      </Modal>
    </div>
  )
}
