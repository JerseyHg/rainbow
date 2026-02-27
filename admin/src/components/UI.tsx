import React, { useEffect, CSSProperties, ReactNode } from 'react'
import { COLORS, STATUS_MAP } from '../theme'
import type { ToastType } from '../types'

// ============================================================
// Badge
// ============================================================
interface BadgeProps {
  children: ReactNode
  variant?: string
  style?: CSSProperties
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const c = STATUS_MAP[variant] || { bg: COLORS.accentDim, color: COLORS.accent }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: c.bg, color: c.color, letterSpacing: '0.02em', ...style,
    }}>
      {children}
    </span>
  )
}

// ============================================================
// Button
// ============================================================
type ButtonVariant = 'primary' | 'ghost' | 'success' | 'danger' | 'soft'
type ButtonSize = 'sm' | 'md'

interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  style?: CSSProperties
}

const buttonVariants: Record<ButtonVariant, CSSProperties> = {
  primary: { background: COLORS.accent, color: '#fff' },
  ghost: { background: 'transparent', color: COLORS.textSec, border: `1px solid ${COLORS.border}` },
  success: { background: COLORS.success, color: '#0F0F12' },
  danger: { background: COLORS.danger, color: '#fff' },
  soft: { background: COLORS.accentDim, color: COLORS.accent },
}

export function Button({ children, variant = 'primary', size = 'md', icon, loading, disabled, onClick, style }: ButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', fontWeight: 600, borderRadius: 10,
    transition: 'all 0.2s', opacity: disabled ? 0.5 : 1,
    fontSize: size === 'sm' ? 13 : 14,
    padding: size === 'sm' ? '8px 14px' : '10px 20px',
    letterSpacing: '0.01em',
  }

  return (
    <button
      style={{ ...base, ...buttonVariants[variant], ...style }}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={e => { if (!disabled) (e.target as HTMLElement).style.filter = 'brightness(1.15)' }}
      onMouseLeave={e => { (e.target as HTMLElement).style.filter = 'none' }}
    >
      {loading ? <span style={{ animation: 'pulse 1s infinite' }}>⏳</span> : icon}
      {children}
    </button>
  )
}

// ============================================================
// Card
// ============================================================
interface CardProps {
  children: ReactNode
  style?: CSSProperties
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, style, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 16, padding: 24, cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s', ...style,
      }}
      onMouseEnter={e => {
        if (hover || onClick) {
          e.currentTarget.style.borderColor = COLORS.borderLight
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={e => {
        if (hover || onClick) {
          e.currentTarget.style.borderColor = COLORS.border
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {children}
    </div>
  )
}

// ============================================================
// Modal
// ============================================================
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
}

export function Modal({ open, onClose, title, children, width = 560 }: ModalProps) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 20, padding: 32, width, maxWidth: '92vw', maxHeight: '85vh',
          overflow: 'auto', animation: 'fadeIn 0.25s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: COLORS.textMuted,
              cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex', fontSize: 18,
            }}
          >✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ============================================================
// StatCard
// ============================================================
interface StatCardProps {
  label: string
  value: number | string
  icon: ReactNode
  color: string
  sub?: string
}

export function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <Card style={{ display: 'flex', gap: 16, alignItems: 'center' }} hover>
      <div style={{
        width: 48, height: 48, borderRadius: 14, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: `${color}18`, color, fontSize: 22,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 12, color: COLORS.textMuted, fontWeight: 500, marginBottom: 4,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: COLORS.textSec, marginTop: 4 }}>{sub}</div>}
      </div>
    </Card>
  )
}

// ============================================================
// Empty
// ============================================================
export function Empty({ text = '暂无数据' }: { text?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  )
}

// ============================================================
// Toast
// ============================================================
interface ToastProps {
  message: string
  type?: ToastType
  onDone: () => void
}

export function Toast({ message, type = 'success', onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  const bg = type === 'success' ? COLORS.success : type === 'error' ? COLORS.danger : COLORS.warning

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 2000,
      background: bg,
      color: type === 'success' || type === 'warning' ? '#0F0F12' : '#fff',
      padding: '12px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14,
      animation: 'fadeIn 0.3s ease', boxShadow: `0 8px 32px ${bg}44`,
    }}>
      {type === 'success' ? '✓ ' : type === 'error' ? '✗ ' : '⚠ '}{message}
    </div>
  )
}
