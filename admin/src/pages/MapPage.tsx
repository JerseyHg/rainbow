import { useState, useEffect, useCallback, useRef } from 'react'
import { COLORS, STATUS_LABEL } from '../theme'
import { Card, Badge, StatCard, Button, Empty } from '../components/UI'
import { api } from '../api'
import type { ToastType } from '../types'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ============================================================
// Types
// ============================================================
interface CityUser {
  id: number
  name: string
  serial_number: string | null
  gender: string
  age: number
  status: string
  work_location: string | null
  industry: string | null
}

interface CityData {
  city: string
  lat: number | null
  lng: number | null
  count: number
  status_counts: { approved: number; published: number; pending: number; rejected: number }
  users: CityUser[]
}

interface MapStats {
  total_users: number
  total_cities: number
  top_city: string | null
  top_city_count: number
}

interface MapPageProps {
  showToast: (message: string, type?: ToastType) => void
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

function getStatusDot(status: string): string {
  return STATUS_COLORS[status] || '#55556A'
}

// Bubble color based on dominant status
function getBubbleColor(statusCounts: CityData['status_counts']): string {
  const approved = statusCounts.approved + statusCounts.published
  const total = approved + statusCounts.rejected + statusCounts.pending
  if (total === 0) return COLORS.accent
  const rate = approved / total
  if (rate >= 0.7) return '#34D399'
  if (rate >= 0.4) return '#60A5FA'
  return '#FBBF24'
}

// ============================================================
// CityDetailPanel - 侧边城市详情面板
// ============================================================
function CityDetailPanel({
  city,
  onClose,
}: {
  city: CityData | null
  onClose: () => void
}) {
  if (!city) return null

  const total = city.count
  const approved = city.status_counts.approved + city.status_counts.published

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 320, background: 'rgba(15,15,18,0.95)',
      borderLeft: `1px solid ${COLORS.border}`,
      backdropFilter: 'blur(12px)',
      zIndex: 1000, overflow: 'auto',
      animation: 'slideInRight 0.25s ease',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>📍 {city.city}</h3>
          <span style={{ fontSize: 13, color: COLORS.textSec }}>
            共 {total} 位用户
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: COLORS.textMuted,
            cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 8,
          }}
        >✕</button>
      </div>

      {/* Stats */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { label: '已通过', value: city.status_counts.approved, color: STATUS_COLORS.approved },
            { label: '已发布', value: city.status_counts.published, color: STATUS_COLORS.published },
            { label: '待审核', value: city.status_counts.pending, color: STATUS_COLORS.pending },
            { label: '已拒绝', value: city.status_counts.rejected, color: STATUS_COLORS.rejected },
          ].map(item => (
            <div key={item.label} style={{
              padding: '10px 12px', background: COLORS.bg, borderRadius: 8, textAlign: 'center',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 700, color: item.color,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{item.value}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* User list */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSec, marginBottom: 10 }}>
          用户列表
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {city.users.map(user => (
            <div key={user.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', background: COLORS.bg, borderRadius: 10,
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: getStatusDot(user.status), flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{user.name}</span>
                  <span style={{
                    fontSize: 11, color: COLORS.textMuted,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>#{user.serial_number}</span>
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  {user.gender} · {user.age}岁{user.industry ? ` · ${user.industry}` : ''}
                </div>
              </div>
              <Badge variant={user.status} style={{ fontSize: 10, padding: '2px 8px' }}>
                {STATUS_LABEL[user.status] || user.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CityRankList - 城市排行列表
// ============================================================
function CityRankList({ cities, onSelect }: { cities: CityData[]; onSelect: (city: CityData) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {cities.map((city, i) => {
        const bubbleColor = getBubbleColor(city.status_counts)
        const approved = city.status_counts.approved + city.status_counts.published
        return (
          <div
            key={city.city}
            onClick={() => onSelect(city)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', background: COLORS.bg, borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = COLORS.borderLight
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = COLORS.border
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {/* Rank */}
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: i < 3 ? COLORS.accentDim : COLORS.surfaceHover,
              color: i < 3 ? COLORS.accent : COLORS.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
            }}>
              {i + 1}
            </div>

            {/* City info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                📍 {city.city}
              </div>
              <div style={{ fontSize: 12, color: COLORS.textSec, marginTop: 3 }}>
                通过 {approved} · 待审 {city.status_counts.pending} · 拒绝 {city.status_counts.rejected}
              </div>
            </div>

            {/* Count bubble */}
            <div style={{
              minWidth: 44, height: 44, borderRadius: 14,
              background: `${bubbleColor}18`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 700, color: bubbleColor,
                fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
              }}>{city.count}</div>
              <div style={{ fontSize: 9, color: COLORS.textMuted }}>人</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// LeafletMap - 地图组件
// ============================================================
function LeafletMap({
  cities,
  onSelectCity,
  selectedCity,
  height,
}: {
  cities: CityData[]
  onSelectCity: (city: CityData) => void
  selectedCity: CityData | null
  height: number
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [35.0, 104.5],  // Center of China
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    })

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map)

    // Zoom control in top-left
    L.control.zoom({ position: 'topleft' }).addTo(map)

    // Attribution in bottom-right (small)
    L.control.attribution({ position: 'bottomright', prefix: '' }).addTo(map)
      .addAttribution('© <a href="https://carto.com/" style="color:#666">CARTO</a>')

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update markers when data changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const validCities = cities.filter(c => c.lat && c.lng)
    if (validCities.length === 0) return

    // Find max count for scaling
    const maxCount = Math.max(...validCities.map(c => c.count), 1)

    for (const city of validCities) {
      const bubbleColor = getBubbleColor(city.status_counts)
      const radius = Math.max(8, Math.min(35, 8 + (city.count / maxCount) * 27))
      const isSelected = selectedCity?.city === city.city

      const marker = L.circleMarker([city.lat!, city.lng!], {
        radius: isSelected ? radius + 4 : radius,
        fillColor: bubbleColor,
        fillOpacity: isSelected ? 0.9 : 0.65,
        color: isSelected ? '#fff' : bubbleColor,
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 1 : 0.8,
      })

      // Custom tooltip
      marker.bindTooltip(
        `<div style="font-family:'DM Sans','Noto Sans SC',sans-serif;font-size:12px;line-height:1.5;">
          <strong>${city.city}</strong><br/>
          <span style="color:${bubbleColor};font-weight:700;font-size:16px;">${city.count}</span> 位用户
        </div>`,
        {
          direction: 'top',
          offset: [0, -radius],
          className: 'dark-tooltip',
        }
      )

      marker.on('click', () => onSelectCity(city))

      // Hover effect
      marker.on('mouseover', () => {
        marker.setStyle({ fillOpacity: 0.9, weight: 2.5 })
      })
      marker.on('mouseout', () => {
        const sel = selectedCity?.city === city.city
        marker.setStyle({
          fillOpacity: sel ? 0.9 : 0.65,
          weight: sel ? 3 : 1.5,
        })
      })

      marker.addTo(map)
      markersRef.current.push(marker)

      // Count label for cities with 2+ users
      if (city.count >= 2) {
        const labelIcon = L.divIcon({
          className: 'city-count-label',
          html: `<span style="
            color:#fff; font-size:${Math.max(10, radius * 0.6)}px; font-weight:700;
            font-family:'JetBrains Mono',monospace;
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            pointer-events:none;
          ">${city.count}</span>`,
          iconSize: [radius * 2, radius * 2],
          iconAnchor: [radius, radius],
        })
        const label = L.marker([city.lat!, city.lng!], {
          icon: labelIcon,
          interactive: false,
        })
        label.addTo(map)
        markersRef.current.push(label as any)
      }
    }
  }, [cities, selectedCity, onSelectCity])

  // Fly to selected city
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedCity?.lat || !selectedCity?.lng) return
    map.flyTo([selectedCity.lat, selectedCity.lng], 8, { duration: 0.8 })
  }, [selectedCity])

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      <style>{`
        .dark-tooltip {
          background: rgba(15,15,18,0.92) !important;
          border: 1px solid rgba(42,42,56,0.8) !important;
          border-radius: 10px !important;
          padding: 8px 12px !important;
          color: #E8E8F0 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
          backdrop-filter: blur(8px);
        }
        .dark-tooltip::before {
          border-top-color: rgba(15,15,18,0.92) !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: rgba(15,15,18,0.92) !important;
        }
        .city-count-label {
          background: none !important;
          border: none !important;
          display: flex !important;
          align-items: center;
          justify-content: center;
        }
        .leaflet-control-zoom a {
          background: rgba(15,15,18,0.85) !important;
          color: #8888A0 !important;
          border-color: rgba(42,42,56,0.8) !important;
          backdrop-filter: blur(8px);
        }
        .leaflet-control-zoom a:hover {
          background: rgba(26,26,34,0.95) !important;
          color: #E8E8F0 !important;
        }
      `}</style>
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height, background: '#0c0c10' }}
      />
    </div>
  )
}

// ============================================================
// MapPage - Main
// ============================================================
export function MapPage({ showToast }: MapPageProps) {
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<CityData[]>([])
  const [stats, setStats] = useState<MapStats | null>(null)
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'ranking'>('map')
  const [mapHeight, setMapHeight] = useState(560)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getMapUsers()
      if (res.data) {
        setCities(res.data.cities || [])
        setStats(res.data.stats || null)
      }
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setLoading(false)
  }, [showToast])

  useEffect(() => { loadData() }, [loadData])

  // Responsive height
  useEffect(() => {
    const calc = () => setMapHeight(Math.max(480, Math.min(700, window.innerHeight - 300)))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  const handleSelectCity = (city: CityData) => {
    setSelectedCity(prev => prev?.city === city.city ? null : city)
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>用户地图</h2>
          <p style={{ fontSize: 14, color: COLORS.textSec }}>用户地理分布与城市分析 🗺️</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadData}>🔄 刷新</Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: COLORS.textMuted }}>
          <div style={{ animation: 'pulse 1.2s infinite', fontSize: 16 }}>加载中...</div>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12, marginBottom: 20,
            }}>
              <StatCard label="总用户" value={stats.total_users} icon="👥" color={COLORS.accent} />
              <StatCard label="覆盖城市" value={stats.total_cities} icon="🏙️" color={COLORS.info} />
              <StatCard
                label="最多城市"
                value={stats.top_city || '-'}
                icon="🏆"
                color={COLORS.success}
                sub={stats.top_city ? `${stats.top_city_count} 人` : undefined}
              />
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {([
              { key: 'map' as const, label: '🗺️ 地图视图' },
              { key: 'ranking' as const, label: '🏙️ 城市排行' },
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

          {/* Map View */}
          {viewMode === 'map' && (
            <Card style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
              {cities.length === 0 ? (
                <Empty text="暂无用户位置数据" />
              ) : (
                <>
                  <LeafletMap
                    cities={cities}
                    onSelectCity={handleSelectCity}
                    selectedCity={selectedCity}
                    height={mapHeight}
                  />
                  {/* City detail panel */}
                  <CityDetailPanel
                    city={selectedCity}
                    onClose={() => setSelectedCity(null)}
                  />
                </>
              )}
            </Card>
          )}

          {/* Ranking View */}
          {viewMode === 'ranking' && (
            <Card>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: COLORS.textSec, marginBottom: 16 }}>
                城市用户排行
              </h3>
              {cities.length === 0 ? (
                <Empty text="暂无数据" />
              ) : (
                <CityRankList cities={cities} onSelect={handleSelectCity} />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
