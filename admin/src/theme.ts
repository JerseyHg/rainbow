// ============================================================
// 设计系统 - 颜色 & 主题常量
// ============================================================

export const COLORS = {
  bg: '#0F0F12',
  surface: '#1A1A22',
  surfaceHover: '#22222E',
  border: '#2A2A38',
  borderLight: '#35354A',
  text: '#E8E8F0',
  textSec: '#8888A0',
  textMuted: '#55556A',
  accent: '#E8457C',
  accentLight: '#FF6B9D',
  accentDim: 'rgba(232,69,124,0.12)',
  success: '#34D399',
  successDim: 'rgba(52,211,153,0.12)',
  warning: '#FBBF24',
  warningDim: 'rgba(251,191,36,0.12)',
  danger: '#F87171',
  dangerDim: 'rgba(248,113,113,0.12)',
  info: '#60A5FA',
  infoDim: 'rgba(96,165,250,0.12)',
  gradient: 'linear-gradient(135deg, #E8457C 0%, #A855F7 50%, #3B82F6 100%)',
} as const

export const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  pending:   { bg: COLORS.warningDim, color: COLORS.warning },
  approved:  { bg: COLORS.successDim, color: COLORS.success },
  published: { bg: COLORS.infoDim,    color: COLORS.info },
  rejected:  { bg: COLORS.dangerDim,  color: COLORS.danger },
  archived:  { bg: COLORS.accentDim,  color: COLORS.textMuted },
}

export const STATUS_LABEL: Record<string, string> = {
  pending:   '待审核',
  approved:  '已通过',
  published: '已发布',
  rejected:  '已拒绝',
  archived:  '已下架',
}
