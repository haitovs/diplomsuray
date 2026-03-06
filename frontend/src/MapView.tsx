import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation, Lang } from './i18n'

// ===== TYPES =====
interface Vehicle {
  id: string
  name?: string
  type: string
  lat: number
  lon: number
  speed: number
  heading: number
  trust_score: number
  is_attacker: boolean
  max_speed: number
  color: string
  messages_sent: number
  messages_received: number
  anomalies_detected: number
  status: string
  destination: string
  path?: string[]
  hack_progress?: number
  target_vehicle?: string | null
  waiting_at_light?: boolean
  defense_level?: string
}

interface SimulationState {
  vehicles: Vehicle[]
  bounds: { lat_min: number; lat_max: number; lon_min: number; lon_max: number }
  roads: {
    nodes: Record<string, [number, number]>
    edges: [string, string][]
    lights?: Record<string, { state: string; timer: number }>
  }
  active_attack: string | null
  attack_sophistication?: string
  params?: {
    communication_range?: number
  }
}

interface MapViewProps {
  simulationState: SimulationState | null
  selectedVehicle: Vehicle | null
  onSelectVehicle: (v: Vehicle | null) => void
  lang?: Lang
}

// ===== SIMPLE, FAST VEHICLE ICONS =====
// Key insight: NO heading rotation in icon HTML. Heading changes every tick
// and would invalidate the cache. Icons are top-down silhouettes that look
// fine without rotation.

function vehicleSvg(type: string, isHacker: boolean): string {
  if (isHacker) {
    return `<svg width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="10" rx="3" fill="#ef4444"/><rect x="5" y="2" width="10" height="6" rx="2" fill="#ef4444"/><circle cx="6" cy="8" r="1.5" fill="#1e293b"/><circle cx="14" cy="8" r="1.5" fill="#1e293b"/></svg>`
  }
  const colors: Record<string, string> = { passenger: '#3b82f6', truck: '#22c55e', bus: '#f97316', emergency: '#a855f7' }
  const c = colors[type] || '#3b82f6'
  if (type === 'truck') {
    return `<svg width="22" height="14" viewBox="0 0 22 14"><rect x="1" y="1" width="15" height="11" rx="2" fill="${c}"/><rect x="16" y="3" width="5" height="9" rx="1" fill="${c}" opacity="0.7"/></svg>`
  }
  if (type === 'bus') {
    return `<svg width="24" height="10" viewBox="0 0 24 10"><rect x="1" y="1" width="22" height="8" rx="3" fill="${c}"/><rect x="3" y="2" width="3" height="2" rx="0.5" fill="#1e293b" opacity="0.3"/><rect x="8" y="2" width="3" height="2" rx="0.5" fill="#1e293b" opacity="0.3"/><rect x="13" y="2" width="3" height="2" rx="0.5" fill="#1e293b" opacity="0.3"/></svg>`
  }
  // Default: car
  return `<svg width="18" height="12" viewBox="0 0 18 12"><rect x="1" y="3" width="16" height="7" rx="2.5" fill="${c}"/><rect x="3" y="1" width="10" height="5" rx="1.5" fill="${c}"/></svg>`
}

// ===== ICON CACHE =====
const iconCache = new Map<string, L.DivIcon>()

function getVehicleIcon(v: Vehicle, isTarget: boolean, hp: number): L.DivIcon {
  // Cache key: exclude heading (changes every tick), position (not in icon)
  const defLevel = v.defense_level || 'medium'
  const hackBucket = v.is_attacker ? Math.round((v.hack_progress || 0) / 10) * 10 : 0
  const key = `${v.type}|${v.is_attacker}|${v.status}|${defLevel}|${isTarget}|${Math.round(hp / 10) * 10}|${hackBucket}`

  let icon = iconCache.get(key)
  if (icon) return icon

  const isHacker = v.is_attacker
  const isStopped = v.status === 'stopped'
  const svg = vehicleSvg(v.type, isHacker)

  // Defense arc color
  const defColor = defLevel === 'high' ? '#22c55e' : defLevel === 'low' ? '#ef4444' : '#eab308'
  const defWidth = defLevel === 'high' ? '100%' : defLevel === 'medium' ? '66%' : '33%'

  // Hack bar for attacker
  const hackBar = isHacker && hackBucket > 0
    ? `<div style="width:30px;height:3px;background:#334155;border-radius:2px;overflow:hidden;margin-bottom:2px"><div style="width:${hackBucket}%;height:100%;background:#ef4444"></div></div>`
    : ''

  // Target indicator
  const targetBar = isTarget && hp > 0
    ? `<div style="width:30px;height:3px;background:#334155;border-radius:2px;overflow:hidden;border:1px solid #ef4444;margin-bottom:2px"><div style="width:${Math.round(hp)}%;height:100%;background:#f87171"></div></div>`
    : ''

  const stoppedDot = isStopped && !isHacker ? `<div style="width:4px;height:4px;background:#ef4444;border-radius:50%;margin-top:1px"></div>` : ''

  // Defense level bar (non-hackers only)
  const defBar = !isHacker
    ? `<div style="width:20px;height:2px;background:#334155;border-radius:1px;overflow:hidden;margin-top:1px"><div style="width:${defWidth};height:100%;background:${defColor}"></div></div>`
    : ''

  const glow = isHacker ? 'filter:drop-shadow(0 0 3px rgba(239,68,68,0.5));' : ''

  const html = `<div style="display:flex;flex-direction:column;align-items:center;${glow}">${hackBar}${targetBar}${svg}${defBar}${stoppedDot}</div>`

  icon = L.divIcon({
    html,
    className: 'v-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

  iconCache.set(key, icon)
  if (iconCache.size > 100) {
    const first = iconCache.keys().next().value
    if (first !== undefined) iconCache.delete(first)
  }
  return icon
}

// ===== Traffic light icon =====
const lightIconCache = new Map<string, L.DivIcon>()
function getLightIcon(state: string): L.DivIcon {
  let icon = lightIconCache.get(state)
  if (icon) return icon
  const c = state === 'red' ? '#ef4444' : '#22c55e'
  icon = L.divIcon({
    html: `<div style="width:7px;height:7px;background:${c};border-radius:50%;border:1px solid #000;box-shadow:0 0 3px ${c}"></div>`,
    className: 'v-marker',
    iconSize: [7, 7],
    iconAnchor: [3, 3],
  })
  lightIconCache.set(state, icon)
  return icon
}

// ===== Street labels =====
const STREET_LABELS: { name: string; position: [number, number] }[] = [
  { name: 'Greenwich St', position: [40.7090, -74.0134] },
  { name: 'W Broadway', position: [40.7114, -74.0113] },
  { name: 'Church St', position: [40.7103, -74.0108] },
  { name: 'Broadway', position: [40.7117, -74.0081] },
  { name: 'Fulton St', position: [40.7103, -74.0118] },
  { name: 'Rector St', position: [40.7074, -74.0131] },
]

const streetLabelCache = new Map<string, L.DivIcon>()
function getStreetLabel(name: string): L.DivIcon {
  let icon = streetLabelCache.get(name)
  if (icon) return icon
  icon = L.divIcon({
    html: `<div style="font-size:9px;color:#94a3b8;font-weight:600;white-space:nowrap;text-shadow:0 0 4px #000,0 0 8px #000;letter-spacing:0.5px;pointer-events:none">${name}</div>`,
    className: 'v-marker',
    iconSize: [80, 14],
    iconAnchor: [40, 7],
  })
  streetLabelCache.set(name, icon)
  return icon
}

// ===== Auto-fit bounds =====
function FitBounds({ bounds }: { bounds: SimulationState['bounds'] }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds([
      [bounds.lat_min, bounds.lon_min],
      [bounds.lat_max, bounds.lon_max],
    ], { padding: [30, 30] })
  }, [])
  return null
}

// ===== MAIN =====
export default function MapView({ simulationState, selectedVehicle, onSelectVehicle, lang = 'ru' }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const { t } = useTranslation(lang)

  // Road edges (memoized — only changes if road network changes)
  const roadSegments = useMemo(() => {
    if (!simulationState?.roads) return []
    const seen = new Set<string>()
    const segs: [number, number][][] = []
    const nodes = simulationState.roads.nodes
    for (const [a, b] of simulationState.roads.edges) {
      const k = [a, b].sort().join('--')
      if (seen.has(k)) continue
      seen.add(k)
      const pA = nodes[a], pB = nodes[b]
      if (pA && pB) segs.push([[pA[0], pA[1]], [pB[0], pB[1]]])
    }
    return segs
  }, [simulationState?.roads])

  // Intersection dots
  const intersections = useMemo(() => {
    if (!simulationState?.roads) return []
    const counts = new Map<string, number>()
    for (const [a, b] of simulationState.roads.edges) {
      counts.set(a, (counts.get(a) || 0) + 1)
      counts.set(b, (counts.get(b) || 0) + 1)
    }
    const result: [number, number][] = []
    const nodes = simulationState.roads.nodes
    for (const [id, c] of counts) {
      if (c >= 3) {
        const pos = nodes[id]
        if (pos) result.push([pos[0], pos[1]])
      }
    }
    return result
  }, [simulationState?.roads])

  // Selected vehicle path
  const selectedPath = useMemo(() => {
    if (!selectedVehicle?.path || !simulationState?.roads) return null
    const nodes = simulationState.roads.nodes
    const pts: [number, number][] = []
    for (const id of selectedVehicle.path) {
      const pos = nodes[id]
      if (pos) pts.push([pos[0], pos[1]])
    }
    return pts.length > 1 ? pts : null
  }, [selectedVehicle?.path, simulationState?.roads])

  // Attack line
  const attackLine = useMemo(() => {
    if (!simulationState?.active_attack) return null
    const hacker = simulationState.vehicles.find(v => v.is_attacker)
    if (!hacker?.target_vehicle) return null
    const target = simulationState.vehicles.find(v => v.id === hacker.target_vehicle)
    if (!target) return null
    return [[hacker.lat, hacker.lon], [target.lat, target.lon]] as [number, number][]
  }, [simulationState?.vehicles, simulationState?.active_attack])

  // Hack progress per target
  const hackByTarget = useMemo(() => {
    const m = new Map<string, number>()
    if (!simulationState) return m
    for (const v of simulationState.vehicles) {
      if (v.is_attacker && v.target_vehicle && (v.hack_progress || 0) > 0) {
        m.set(v.target_vehicle, v.hack_progress || 0)
      }
    }
    return m
  }, [simulationState?.vehicles])

  // Sybil ghosts
  const ghosts = useMemo(() => {
    if (simulationState?.active_attack !== 'sybil') return []
    const hacker = simulationState.vehicles.find(v => v.is_attacker)
    if (!hacker) return []
    return [
      [hacker.lat + 0.0003, hacker.lon + 0.0004],
      [hacker.lat - 0.0004, hacker.lon + 0.0003],
      [hacker.lat + 0.0005, hacker.lon - 0.0002],
    ] as [number, number][]
  }, [simulationState?.active_attack, simulationState?.vehicles])

  // Comm range
  const commRange = useMemo(() => {
    const r = simulationState?.params?.communication_range || 0.005
    return r * 111000
  }, [simulationState?.params?.communication_range])

  if (!simulationState) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-slate-500 text-sm">{t('map.waitingData')}</div>
      </div>
    )
  }

  const center: [number, number] = [
    (simulationState.bounds.lat_min + simulationState.bounds.lat_max) / 2,
    (simulationState.bounds.lon_min + simulationState.bounds.lon_max) / 2,
  ]

  return (
    <div className="w-full h-full relative">
      <style>{`
        .v-marker { background: transparent !important; border: none !important; }
        .leaflet-container { background: #0f172a !important; }
        .leaflet-popup-content-wrapper { background: #1e293b !important; color: #e2e8f0 !important; border: 1px solid #334155 !important; border-radius: 8px !important; }
        .leaflet-popup-tip { background: #1e293b !important; }
        .leaflet-popup-content { margin: 8px 12px !important; }
        .leaflet-control-zoom a { background: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important; }
        .leaflet-control-zoom a:hover { background: #334155 !important; }
        @keyframes dash-flow { to { stroke-dashoffset: -24; } }
        .attack-dash { animation: dash-flow 1s linear infinite; }
      `}</style>

      <MapContainer center={center} zoom={15} className="w-full h-full" zoomControl={true} ref={mapRef}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <FitBounds bounds={simulationState.bounds} />

        {/* Roads */}
        {roadSegments.map((pos, i) => (
          <Polyline key={`r${i}`} positions={pos} pathOptions={{ color: '#475569', weight: 2, opacity: 0.5 }} />
        ))}

        {/* Intersections */}
        {intersections.map((pos, i) => (
          <CircleMarker key={`i${i}`} center={pos} radius={2.5}
            pathOptions={{ color: '#94a3b8', weight: 1, fillColor: '#64748b', fillOpacity: 0.7 }} />
        ))}

        {/* Street labels */}
        {STREET_LABELS.map(s => (
          <Marker key={s.name} position={s.position} icon={getStreetLabel(s.name)} interactive={false} />
        ))}

        {/* Selected path */}
        {selectedPath && <Polyline positions={selectedPath} pathOptions={{ color: '#06b6d4', weight: 2, opacity: 0.5, dashArray: '6 4' }} />}

        {/* Comm range */}
        {selectedVehicle && (
          <Circle center={[selectedVehicle.lat, selectedVehicle.lon]} radius={commRange}
            pathOptions={{ color: '#06b6d4', weight: 1, fillOpacity: 0.04, dashArray: '4 4' }} />
        )}

        {/* Traffic lights */}
        {simulationState.roads?.lights && Object.entries(simulationState.roads.lights).map(([id, light]) => {
          const pos = simulationState.roads.nodes[id]
          if (!pos) return null
          return <Marker key={`l${id}`} position={[pos[0], pos[1]]} icon={getLightIcon(light.state)} />
        })}

        {/* Attack beam */}
        {attackLine && (
          <>
            <Polyline positions={attackLine} pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.12 }} />
            <Polyline positions={attackLine} pathOptions={{ color: '#ef4444', weight: 2, opacity: 0.7, dashArray: '8 4', className: 'attack-dash' }} />
          </>
        )}

        {/* Target rings */}
        {Array.from(hackByTarget.entries()).map(([tid, p]) => {
          const tv = simulationState.vehicles.find(v => v.id === tid)
          if (!tv) return null
          return <CircleMarker key={`tr${tid}`} center={[tv.lat, tv.lon]} radius={8 + (p / 100) * 12}
            pathOptions={{ color: '#ef4444', weight: 1.5, fillOpacity: 0.03, opacity: 0.3 + (p / 100) * 0.5 }} />
        })}

        {/* Sybil ghosts */}
        {ghosts.map((pos, i) => (
          <CircleMarker key={`g${i}`} center={pos} radius={5}
            pathOptions={{ color: '#ef4444', weight: 1, fillColor: '#ef4444', fillOpacity: 0.15, opacity: 0.3, dashArray: '3 3' }} />
        ))}

        {/* Vehicles */}
        {simulationState.vehicles.map(v => {
          const isTarget = hackByTarget.has(v.id)
          const hp = hackByTarget.get(v.id) || 0
          return (
            <Marker key={v.id} position={[v.lat, v.lon]} icon={getVehicleIcon(v, isTarget, hp)}
              eventHandlers={{ click: () => onSelectVehicle(selectedVehicle?.id === v.id ? null : v) }}>
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <strong style={{ fontSize: 12 }}>{v.name || v.id}</strong>
                  {v.name && <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4, fontFamily: 'monospace' }}>{v.id}</span>}
                  <br />
                  <span style={{ color: v.status === 'moving' ? '#22c55e' : '#ef4444', fontSize: 11 }}>
                    {v.status === 'moving' ? t('map.inMotion') : t('map.stoppedLabel')}
                  </span>
                  <br />
                  <span style={{ fontSize: 11 }}>{t('map.speed')} {v.speed?.toFixed(0)} {t('vehicle.kmh')}</span>
                  {v.defense_level && !v.is_attacker && (
                    <><br /><span style={{ fontSize: 11, color: v.defense_level === 'high' ? '#22c55e' : v.defense_level === 'low' ? '#ef4444' : '#eab308' }}>
                      {t('map.defense')} {t(`defense.${v.defense_level}`)}
                    </span></>
                  )}
                  {v.is_attacker && (v.hack_progress || 0) > 0 && (
                    <><br /><span style={{ color: '#ef4444', fontSize: 11 }}>{t('map.hackProgress')} {Math.round(v.hack_progress || 0)}%</span></>
                  )}
                  {isTarget && hp > 0 && (
                    <><br /><span style={{ color: '#f87171', fontWeight: 'bold', fontSize: 11 }}>{t('map.targetProgress')} {Math.round(hp)}%</span></>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Attack banner */}
      {simulationState.active_attack && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/80 border border-red-500/50 rounded-lg px-4 py-2 text-center pointer-events-none">
          <span className="text-red-200 text-sm font-bold">
            {t('map.attackActive', { name: simulationState.active_attack.toUpperCase() })}
          </span>
        </div>
      )}
    </div>
  )
}
