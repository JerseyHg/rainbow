import { useState, useEffect, useCallback, useRef } from 'react'
import { COLORS, STATUS_LABEL } from '../theme'
import { Card, Badge, StatCard, Button, Modal, Empty } from '../components/UI'
import { api } from '../api'
import type { ToastType } from '../types'

// ============================================================
// Types
// ============================================================
interface QualityInfo {
  invited_count: number
  approved_count: number
  rejected_count: number
  pending_count: number
  approval_rate: number | null
  quality_score: string | null
  quality_label: string
}

interface TreeNode {
  id: number
  serial_number: string | null
  name: string
  gender: string
  age: number
  work_location: string | null
  status: string
  create_time: string | null
  referred_by: string | null
  depth: number
  quality: QualityInfo
  descendant_count: number
  children: TreeNode[]
}

interface InviterRank {
  id: number
  name: string
  serial_number: string | null
  invited_count: number
  approved_count: number
  rejected_count: number
  approval_rate: number | null
  quality_score: string | null
  quality_label: string
}

interface NetworkStats {
  total_users: number
  total_approved: number
  total_rejected: number
  total_pending: number
  overall_approval_rate: number
  max_depth: number
  top_inviters: InviterRank[]
  worst_inviters: InviterRank[]
}

interface UserNetworkDetail {
  user: {
    id: number; name: string; serial_number: string | null
    gender: string; age: number; work_location: string | null
    status: string; create_time: string | null; referred_by: string | null
  }
  inviter: { id: number; name: string; serial_number: string | null; status: string } | null
  invitees: {
    id: number; name: string; serial_number: string | null
    gender: string; age: number; work_location: string | null
    status: string; create_time: string | null
  }[]
  quality: { invited_count: number; approved_count: number; rejected_count: number; approval_rate: number | null }
}

interface NetworkPageProps {
  showToast: (message: string, type?: ToastType) => void
}

// ============================================================
// Force Graph Types
// ============================================================
interface GraphNode {
  id: number
  name: string
  serial_number: string | null
  gender: string
  age: number
  status: string
  quality: QualityInfo
  depth: number
  descendant_count: number
  work_location: string | null
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
  radius: number
}

interface GraphLink {
  source: number
  target: number
}

// ============================================================
// Color helpers
// ============================================================
const STATUS_COLORS: Record<string, string> = {
  approved: '#34D399',
  published: '#60A5FA',
  rejected: '#F87171',
  pending: '#FBBF24',
}

const QUALITY_RING_COLORS: Record<string, string> = {
  A: '#34D399',
  B: '#60A5FA',
  C: '#FBBF24',
  D: '#F87171',
}

function getNodeColor(status: string): string {
  return STATUS_COLORS[status] || '#55556A'
}

function getQualityRing(score: string | null): string | null {
  if (!score) return null
  return QUALITY_RING_COLORS[score] || null
}

// ============================================================
// Flatten tree into nodes + links
// ============================================================
function flattenTree(tree: TreeNode[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const seen = new Set<number>()

  function walk(node: TreeNode, parentId: number | null) {
    if (seen.has(node.id)) return
    seen.add(node.id)

    const inviteCount = node.quality.invited_count
    const radius = Math.max(18, Math.min(40, 18 + inviteCount * 4 + node.descendant_count * 1.5))

    nodes.push({
      id: node.id,
      name: node.name,
      serial_number: node.serial_number,
      gender: node.gender,
      age: node.age,
      status: node.status,
      quality: node.quality,
      depth: node.depth,
      descendant_count: node.descendant_count,
      work_location: node.work_location,
      x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null,
      radius,
    })

    if (parentId !== null) {
      links.push({ source: parentId, target: node.id })
    }

    for (const child of node.children) {
      walk(child, node.id)
    }
  }

  for (const root of tree) {
    walk(root, null)
  }

  return { nodes, links }
}

// ============================================================
// Force simulation
// ============================================================
function initPositions(nodes: GraphNode[], width: number, height: number) {
  const cx = width / 2
  const cy = height / 2
  for (const node of nodes) {
    const angle = Math.random() * Math.PI * 2
    const dist = 60 + node.depth * 100 + Math.random() * 80
    node.x = cx + Math.cos(angle) * dist
    node.y = cy + Math.sin(angle) * dist
    node.vx = 0
    node.vy = 0
  }
}

function simulate(nodes: GraphNode[], links: GraphLink[], nodeMap: Map<number, GraphNode>, width: number, height: number) {
  const cx = width / 2
  const cy = height / 2
  const alpha = 0.3
  const repulsion = 2800
  const linkDist = 120
  const linkStrength = 0.06
  const centerPull = 0.01
  const damping = 0.7

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist = Math.sqrt(dx * dx + dy * dy) || 1
      const minDist = a.radius + b.radius + 20
      if (dist < minDist) dist = minDist
      const force = repulsion / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx -= fx * alpha
      a.vy -= fy * alpha
      b.vx += fx * alpha
      b.vy += fy * alpha
    }
  }

  for (const link of links) {
    const a = nodeMap.get(link.source)
    const b = nodeMap.get(link.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const displacement = dist - linkDist
    const force = displacement * linkStrength
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    a.vx += fx * alpha
    a.vy += fy * alpha
    b.vx -= fx * alpha
    b.vy -= fy * alpha
  }

  for (const node of nodes) {
    node.vx += (cx - node.x) * centerPull
    node.vy += (cy - node.y) * centerPull
  }

  for (const node of nodes) {
    if (node.fx !== null) { node.x = node.fx; node.vx = 0 }
    else { node.vx *= damping; node.x += node.vx }
    if (node.fy !== null) { node.y = node.fy; node.vy = 0 }
    else { node.vy *= damping; node.y += node.vy }
  }
}

// ============================================================
// Canvas Graph Component
// ============================================================
function NetworkGraph({
  tree,
  onSelectNode,
  width,
  height,
}: {
  tree: TreeNode[]
  onSelectNode: (id: number) => void
  width: number
  height: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<GraphNode[]>([])
  const linksRef = useRef<GraphLink[]>([])
  const nodeMapRef = useRef<Map<number, GraphNode>>(new Map())
  const animRef = useRef<number>(0)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ nodeId: number | null; startX: number; startY: number; isPan: boolean }>({
    nodeId: null, startX: 0, startY: 0, isPan: false,
  })
  const hoveredRef = useRef<number | null>(null)
  const tickRef = useRef(0)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const { nodes, links } = flattenTree(tree)
    initPositions(nodes, width, height)
    nodesRef.current = nodes
    linksRef.current = links
    const map = new Map<number, GraphNode>()
    for (const n of nodes) map.set(n.id, n)
    nodeMapRef.current = map
    transformRef.current = { x: 0, y: 0, scale: 1 }
    tickRef.current = 0
  }, [tree, width, height])

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const t = transformRef.current
    return { x: (sx - t.x) / t.scale, y: (sy - t.y) / t.scale }
  }, [])

  const findNodeAt = useCallback((wx: number, wy: number): GraphNode | null => {
    const nodes = nodesRef.current
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const dx = wx - n.x
      const dy = wy - n.y
      if (dx * dx + dy * dy <= n.radius * n.radius) return n
    }
    return null
  }, [])

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const t = transformRef.current
    ctx.clearRect(0, 0, width, height)

    // Background with subtle grid
    ctx.fillStyle = '#0c0c10'
    ctx.fillRect(0, 0, width, height)

    // Draw subtle radial gradient background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6)
    bgGrad.addColorStop(0, 'rgba(232,69,124,0.03)')
    bgGrad.addColorStop(0.5, 'rgba(168,85,247,0.02)')
    bgGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.scale(t.scale, t.scale)

    const nodes = nodesRef.current
    const links = linksRef.current
    const nodeMap = nodeMapRef.current
    const hovered = hoveredRef.current

    // Find connected nodes for highlighting
    const connectedToHovered = new Set<number>()
    if (hovered !== null) {
      connectedToHovered.add(hovered)
      for (const link of links) {
        if (link.source === hovered) connectedToHovered.add(link.target)
        if (link.target === hovered) connectedToHovered.add(link.source)
      }
    }

    // Draw links
    for (const link of links) {
      const a = nodeMap.get(link.source)
      const b = nodeMap.get(link.target)
      if (!a || !b) continue

      const isHighlighted = hovered !== null && (a.id === hovered || b.id === hovered)
      const isDimmed = hovered !== null && !isHighlighted

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)

      // Curved links for more organic feel
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      const dx = b.x - a.x
      const dy = b.y - a.y
      const perpX = -dy * 0.08
      const perpY = dx * 0.08
      ctx.quadraticCurveTo(midX + perpX, midY + perpY, b.x, b.y)

      ctx.strokeStyle = isHighlighted
        ? 'rgba(232,69,124,0.7)'
        : isDimmed
          ? 'rgba(42,42,56,0.3)'
          : 'rgba(42,42,56,0.6)'
      ctx.lineWidth = isHighlighted ? 2.5 : 1.2
      ctx.stroke()

      // Arrow
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const ux = dx / dist
      const uy = dy / dist
      const arrowX = b.x - ux * (b.radius + 5)
      const arrowY = b.y - uy * (b.radius + 5)
      const arrowSize = isHighlighted ? 8 : 5

      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(arrowX - ux * arrowSize + uy * arrowSize * 0.5, arrowY - uy * arrowSize - ux * arrowSize * 0.5)
      ctx.lineTo(arrowX - ux * arrowSize - uy * arrowSize * 0.5, arrowY - uy * arrowSize + ux * arrowSize * 0.5)
      ctx.closePath()
      ctx.fillStyle = isHighlighted ? 'rgba(232,69,124,0.7)' : isDimmed ? 'rgba(42,42,56,0.3)' : 'rgba(42,42,56,0.6)'
      ctx.fill()
    }

    // Draw nodes
    for (const node of nodes) {
      const isHovered = node.id === hovered
      const isConnected = connectedToHovered.has(node.id)
      const isDimmed = hovered !== null && !isConnected
      const nodeColor = getNodeColor(node.status)
      const qualityRing = getQualityRing(node.quality.quality_score)
      const alpha = isDimmed ? 0.3 : 1

      ctx.globalAlpha = alpha

      // Outer glow for hovered
      if (isHovered) {
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius + 12, 0, Math.PI * 2)
        const glow = ctx.createRadialGradient(node.x, node.y, node.radius, node.x, node.y, node.radius + 12)
        glow.addColorStop(0, `${nodeColor}55`)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.fill()
      }

      // Quality ring
      if (qualityRing) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2)
        ctx.strokeStyle = qualityRing
        ctx.lineWidth = 2.5
        ctx.stroke()
      }

      // Node body
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      const grad = ctx.createRadialGradient(
        node.x - node.radius * 0.3, node.y - node.radius * 0.3, 0,
        node.x, node.y, node.radius
      )
      grad.addColorStop(0, isHovered ? nodeColor : `${nodeColor}cc`)
      grad.addColorStop(1, `${nodeColor}55`)
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = isHovered ? '#fff' : `${nodeColor}66`
      ctx.lineWidth = isHovered ? 2.5 : 1
      ctx.stroke()

      // Name
      ctx.fillStyle = '#E8E8F0'
      ctx.font = `bold ${Math.max(10, node.radius * 0.55)}px "DM Sans", "Noto Sans SC", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const nameText = node.name.length > 4 ? node.name.slice(0, 4) : node.name
      ctx.fillText(nameText, node.x, node.y - 3)

      // Serial number
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = `${Math.max(8, node.radius * 0.36)}px "JetBrains Mono", monospace`
      ctx.fillText(`#${node.serial_number || '?'}`, node.x, node.y + node.radius * 0.42)

      // Quality badge
      if (node.quality.quality_score && node.radius >= 24) {
        const badgeX = node.x + node.radius * 0.65
        const badgeY = node.y - node.radius * 0.65
        const badgeR = 9
        ctx.beginPath()
        ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
        ctx.fillStyle = QUALITY_RING_COLORS[node.quality.quality_score] || '#555'
        ctx.fill()
        ctx.strokeStyle = '#0c0c10'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 9px "JetBrains Mono", monospace'
        ctx.fillText(node.quality.quality_score, badgeX, badgeY)
      }

      ctx.globalAlpha = 1
    }

    // Tooltip
    if (hovered !== null) {
      const node = nodeMap.get(hovered)
      if (node) {
        const tooltipX = node.x
        const tooltipY = node.y - node.radius - 18
        const lines = [
          `${node.name}  #${node.serial_number}`,
          `${node.gender} · ${node.age}岁 · ${node.work_location || '未填'}`,
          `状态: ${STATUS_LABEL[node.status] || node.status}`,
        ]
        if (node.quality.invited_count > 0) {
          lines.push(`邀请 ${node.quality.invited_count} 人 · 通过率 ${node.quality.approval_rate ?? '-'}%`)
        }

        const fontSize = 11
        ctx.font = `${fontSize}px "DM Sans", "Noto Sans SC", sans-serif`
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width))
        const padX = 12
        const padY = 8
        const lineH = fontSize + 5
        const boxW = maxWidth + padX * 2
        const boxH = lines.length * lineH + padY * 2
        const boxX = tooltipX - boxW / 2
        const boxY = tooltipY - boxH

        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 16
        ctx.shadowOffsetY = 4

        ctx.beginPath()
        ctx.roundRect(boxX, boxY, boxW, boxH, 10)
        ctx.fillStyle = 'rgba(15,15,18,0.95)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(232,69,124,0.3)'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0

        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        for (let i = 0; i < lines.length; i++) {
          ctx.font = i === 0
            ? `bold ${fontSize}px "DM Sans", "Noto Sans SC", sans-serif`
            : `${fontSize}px "DM Sans", "Noto Sans SC", sans-serif`
          ctx.fillStyle = i === 0 ? '#E8E8F0' : '#8888A0'
          ctx.fillText(lines[i], boxX + padX, boxY + padY + i * lineH)
        }
      }
    }

    ctx.restore()
  }, [width, height])

  // Animation loop
  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      tickRef.current++
      if (tickRef.current < 300 || dragRef.current.nodeId !== null) {
        simulate(nodesRef.current, linksRef.current, nodeMapRef.current, width, height)
      }
      draw()
      animRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [draw, width, height])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const wp = screenToWorld(sx, sy)
    const node = findNodeAt(wp.x, wp.y)

    if (node) {
      dragRef.current = { nodeId: node.id, startX: sx, startY: sy, isPan: false }
      node.fx = node.x
      node.fy = node.y
      tickRef.current = 0
    } else {
      dragRef.current = { nodeId: null, startX: sx, startY: sy, isPan: true }
    }
  }, [screenToWorld, findNodeAt])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    if (dragRef.current.nodeId !== null) {
      const wp = screenToWorld(sx, sy)
      const node = nodeMapRef.current.get(dragRef.current.nodeId)
      if (node) { node.fx = wp.x; node.fy = wp.y; tickRef.current = 0 }
    } else if (dragRef.current.isPan) {
      const dx = sx - dragRef.current.startX
      const dy = sy - dragRef.current.startY
      transformRef.current.x += dx
      transformRef.current.y += dy
      dragRef.current.startX = sx
      dragRef.current.startY = sy
    } else {
      const wp = screenToWorld(sx, sy)
      const node = findNodeAt(wp.x, wp.y)
      const newHovered = node ? node.id : null
      if (hoveredRef.current !== newHovered) {
        hoveredRef.current = newHovered
        if (canvasRef.current) {
          canvasRef.current.style.cursor = newHovered !== null ? 'pointer' : 'grab'
        }
      }
    }
  }, [screenToWorld, findNodeAt])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.nodeId !== null) {
      const rect = canvasRef.current!.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const movedDist = Math.abs(sx - dragRef.current.startX) + Math.abs(sy - dragRef.current.startY)
      const node = nodeMapRef.current.get(dragRef.current.nodeId)
      if (node) { node.fx = null; node.fy = null }
      if (movedDist < 5) onSelectNode(dragRef.current.nodeId)
    }
    dragRef.current = { nodeId: null, startX: 0, startY: 0, isPan: false }
  }, [onSelectNode])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9
    const t = transformRef.current
    const newScale = Math.max(0.2, Math.min(4, t.scale * scaleFactor))
    t.x = mx - (mx - t.x) * (newScale / t.scale)
    t.y = my - (my - t.y) * (newScale / t.scale)
    t.scale = newScale
  }, [])

  const resetView = useCallback(() => {
    transformRef.current = { x: 0, y: 0, scale: 1 }
    tickRef.current = 0
    initPositions(nodesRef.current, width, height)
    forceUpdate(n => n + 1)
  }, [width, height])

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width, height, borderRadius: 12, cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      {/* Controls */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
        <button onClick={resetView} style={{
          padding: '6px 14px', borderRadius: 8,
          background: 'rgba(15,15,18,0.85)', border: `1px solid ${COLORS.border}`,
          color: COLORS.textSec, fontSize: 12, cursor: 'pointer',
          fontFamily: 'inherit', backdropFilter: 'blur(8px)', transition: 'all 0.2s',
        }}>
          🔄 重置视图
        </button>
      </div>
      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        padding: '10px 16px', borderRadius: 10,
        background: 'rgba(15,15,18,0.88)', border: `1px solid ${COLORS.border}`,
        backdropFilter: 'blur(8px)',
        display: 'flex', gap: 20, fontSize: 11, color: COLORS.textMuted,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontWeight: 600, color: COLORS.textSec, marginBottom: 2 }}>节点颜色 = 状态</span>
          {[
            { label: '已通过', color: STATUS_COLORS.approved },
            { label: '已发布', color: STATUS_COLORS.published },
            { label: '待审核', color: STATUS_COLORS.pending },
            { label: '已拒绝', color: STATUS_COLORS.rejected },
          ].map(item => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontWeight: 600, color: COLORS.textSec, marginBottom: 2 }}>外圈 = 邀请质量</span>
          {[
            { label: 'A 优质 ≥80%', color: QUALITY_RING_COLORS.A },
            { label: 'B 良好 ≥60%', color: QUALITY_RING_COLORS.B },
            { label: 'C 一般 ≥40%', color: QUALITY_RING_COLORS.C },
            { label: 'D 较差 <40%', color: QUALITY_RING_COLORS.D },
          ].map(item => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontWeight: 600, color: COLORS.textSec, marginBottom: 2 }}>操作</span>
          <span>🖱️ 拖拽节点移动</span>
          <span>🖱️ 拖拽空白平移</span>
          <span>⚙️ 滚轮缩放</span>
          <span>👆 点击查看详情</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// InviterRankCard
// ============================================================
function InviterRankCard({ inviter, rank, variant }: { inviter: InviterRank; rank: number; variant: 'good' | 'bad' }) {
  const ringColor = QUALITY_RING_COLORS[inviter.quality_score || ''] || COLORS.textMuted
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', background: COLORS.bg, borderRadius: 10,
      border: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: variant === 'good' ? COLORS.successDim : COLORS.dangerDim,
        color: variant === 'good' ? COLORS.success : COLORS.danger,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
      }}>
        {rank}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {inviter.name}
          <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            #{inviter.serial_number}
          </span>
        </div>
        <div style={{ fontSize: 12, color: COLORS.textSec, marginTop: 2 }}>
          邀请 {inviter.invited_count} 人 · 通过 {inviter.approved_count} · 拒绝 {inviter.rejected_count}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: ringColor, fontFamily: "'JetBrains Mono', monospace" }}>
          {inviter.approval_rate !== null ? `${inviter.approval_rate}%` : '-'}
        </div>
        <div style={{ fontSize: 11, color: COLORS.textMuted }}>通过率</div>
      </div>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================
export function NetworkPage({ showToast }: NetworkPageProps) {
  const [loading, setLoading] = useState(true)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [viewMode, setViewMode] = useState<'graph' | 'ranking'>('graph')
  const containerRef = useRef<HTMLDivElement>(null)
  const [graphSize, setGraphSize] = useState({ w: 900, h: 560 })

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [userDetail, setUserDetail] = useState<UserNetworkDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getNetworkTree()
      if (res.data) {
        setTree(res.data.tree || [])
        setStats(res.data.stats || null)
      }
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setLoading(false)
  }, [showToast])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth
        setGraphSize({ w: Math.max(600, w), h: Math.max(480, Math.min(700, window.innerHeight - 320)) })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const handleSelectNode = async (id: number) => {
    setSelectedUserId(id)
    setDetailLoading(true)
    try {
      const res = await api.getNetworkUserDetail(id)
      setUserDetail(res.data || null)
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setDetailLoading(false)
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }} ref={containerRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>邀请关系网络</h2>
          <p style={{ fontSize: 14, color: COLORS.textSec }}>用户邀请链路与质量分析 🔗</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadData}>🔄 刷新</Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: COLORS.textMuted }}>
          <div style={{ animation: 'pulse 1.2s infinite', fontSize: 16 }}>加载中...</div>
        </div>
      ) : (
        <>
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12, marginBottom: 20,
            }}>
              <StatCard label="总用户" value={stats.total_users} icon="👥" color={COLORS.accent} />
              <StatCard label="已通过" value={stats.total_approved} icon="✅" color={COLORS.success} />
              <StatCard label="已拒绝" value={stats.total_rejected} icon="❌" color={COLORS.danger} />
              <StatCard label="总通过率" value={`${stats.overall_approval_rate}%`} icon="📊" color={COLORS.info} />
              <StatCard label="最大深度" value={stats.max_depth} icon="🌳" color={COLORS.warning} sub="邀请层级" />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {([
              { key: 'graph' as const, label: '🕸️ 关系网络' },
              { key: 'ranking' as const, label: '🏆 质量排行' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  fontFamily: 'inherit', transition: 'all 0.2s',
                  background: viewMode === tab.key ? COLORS.accent : COLORS.surface,
                  color: viewMode === tab.key ? '#fff' : COLORS.textSec,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {viewMode === 'graph' && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {tree.length === 0 ? (
                <Empty text="暂无邀请关系数据" />
              ) : (
                <NetworkGraph
                  tree={tree}
                  onSelectNode={handleSelectNode}
                  width={graphSize.w}
                  height={graphSize.h}
                />
              )}
            </Card>
          )}

          {viewMode === 'ranking' && stats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: COLORS.success, marginBottom: 16 }}>
                  🌟 优质邀请人 TOP 5
                </h3>
                {stats.top_inviters.length === 0 ? <Empty text="暂无数据" /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.top_inviters.map((inv, i) => (
                      <InviterRankCard key={inv.id} inviter={inv} rank={i + 1} variant="good" />
                    ))}
                  </div>
                )}
              </Card>
              <Card>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: COLORS.danger, marginBottom: 16 }}>
                  ⚠️ 需关注的邀请人
                </h3>
                {stats.worst_inviters.length === 0 ? <Empty text="暂无数据" /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.worst_inviters.map((inv, i) => (
                      <InviterRankCard key={inv.id} inviter={inv} rank={i + 1} variant="bad" />
                    ))}
                  </div>
                )}
                <div style={{
                  marginTop: 16, padding: '10px 14px', borderRadius: 8,
                  background: COLORS.dangerDim, fontSize: 12, color: COLORS.danger, lineHeight: 1.6,
                }}>
                  💡 这些用户邀请的人被拒绝比例较高，建议关注其邀请码使用情况。
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* User Detail Modal */}
      <Modal
        open={selectedUserId !== null}
        onClose={() => { setSelectedUserId(null); setUserDetail(null) }}
        title="用户邀请详情"
        width={600}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted }}>加载中...</div>
        ) : userDetail ? (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 20px', background: COLORS.bg, borderRadius: 12, marginBottom: 20,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, background: COLORS.gradient,
                backgroundSize: '200% 200%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: '#fff',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {userDetail.user.serial_number || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{userDetail.user.name}</span>
                  <Badge variant={userDetail.user.status}>
                    {STATUS_LABEL[userDetail.user.status] || userDetail.user.status}
                  </Badge>
                </div>
                <div style={{ fontSize: 13, color: COLORS.textSec, marginTop: 4 }}>
                  {userDetail.user.gender} · {userDetail.user.age}岁 · {userDetail.user.work_location || '未填'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSec, marginBottom: 8 }}>邀请来源</div>
              <div style={{ padding: '10px 14px', background: COLORS.bg, borderRadius: 8, fontSize: 13 }}>
                {userDetail.inviter ? (
                  <span>由 <strong>{userDetail.inviter.name}</strong>
                    <span style={{ color: COLORS.textMuted }}> (#{userDetail.inviter.serial_number})</span> 邀请</span>
                ) : (
                  <span style={{ color: COLORS.textMuted }}>{userDetail.user.referred_by || '管理员直接邀请'}</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSec, marginBottom: 8 }}>邀请质量</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { label: '邀请人数', value: userDetail.quality.invited_count, color: COLORS.accent },
                  { label: '已通过', value: userDetail.quality.approved_count, color: COLORS.success },
                  { label: '已拒绝', value: userDetail.quality.rejected_count, color: COLORS.danger },
                  { label: '通过率', value: userDetail.quality.approval_rate !== null ? `${userDetail.quality.approval_rate}%` : '-', color: COLORS.info },
                ].map(item => (
                  <div key={item.label} style={{ padding: 12, background: COLORS.bg, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {userDetail.invitees.length > 0 ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSec, marginBottom: 8 }}>
                  邀请的用户 ({userDetail.invitees.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                  {userDetail.invitees.map(inv => (
                    <div key={inv.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', background: COLORS.bg, borderRadius: 10,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: getNodeColor(inv.status), flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{inv.name}</span>
                        <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                          #{inv.serial_number}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textSec }}>{inv.gender} · {inv.age}岁</div>
                      <Badge variant={inv.status}>{STATUS_LABEL[inv.status] || inv.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: COLORS.textMuted, background: COLORS.bg, borderRadius: 10, fontSize: 13 }}>
                该用户暂未邀请任何人
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
