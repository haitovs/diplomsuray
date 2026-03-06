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

// ===== VEHICLE ICONS — bold top-down silhouettes for dark map =====
// Clean shapes with minimal elements — readable at zoom 15-17.
// Defense = border color. Few SVG nodes = fast rendering.

const W = 16, H = 22  // base car size

function vehicleSvg(type: string, isHacker: boolean, defLevel: string): string {
  const dc = defLevel === 'high' ? '#22c55e' : defLevel === 'low' ? '#ef4444' : '#eab308'

  if (isHacker) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<path d="M4,3 Q4,1 6,1 L10,1 Q12,1 12,3 L13,7 L13,17 Q13,20 11,20 L5,20 Q3,20 3,17 L3,7 Z" fill="#991b1b" stroke="#ef4444" stroke-width="1.2"/>
<rect x="5" y="3" width="6" height="4" rx="1" fill="#450a0a" opacity=".8"/>
<rect x="5" y="15" width="6" height="3" rx="1" fill="#450a0a" opacity=".7"/>
<rect x="2" y="5" width="2" height="4" rx=".8" fill="#1c1917"/>
<rect x="12" y="5" width="2" height="4" rx=".8" fill="#1c1917"/>
<rect x="2" y="14" width="2" height="4" rx=".8" fill="#1c1917"/>
<rect x="12" y="14" width="2" height="4" rx=".8" fill="#1c1917"/>
</svg>`
  }

  if (type === 'truck') {
    const tw = 16, th = 28
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${th}" viewBox="0 0 ${tw} ${th}">
<rect x="3" y="11" width="10" height="15" rx="1.5" fill="#059669" stroke="${dc}" stroke-width="1"/>
<path d="M4,3 Q4,1 6,1 L10,1 Q12,1 12,3 L12,11 L4,11 Z" fill="#10b981" stroke="${dc}" stroke-width="1"/>
<rect x="5" y="2" width="6" height="4" rx="1" fill="#065f46" opacity=".7"/>
<rect x="2" y="4" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="12" y="4" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="2" y="14" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="12" y="14" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="2" y="21" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="12" y="21" width="2" height="4" rx=".8" fill="#374151"/>
</svg>`
  }

  if (type === 'bus') {
    const bw = 14, bh = 30
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" viewBox="0 0 ${bw} ${bh}">
<rect x="3" y="1" width="8" height="28" rx="3.5" fill="#d97706" stroke="${dc}" stroke-width="1"/>
<rect x="4" y="3" width="6" height="3" rx="1" fill="#92400e" opacity=".65"/>
<rect x="4" y="8" width="6" height="2.5" rx=".8" fill="#78350f" opacity=".4"/>
<rect x="4" y="12" width="6" height="2.5" rx=".8" fill="#78350f" opacity=".4"/>
<rect x="4" y="16" width="6" height="2.5" rx=".8" fill="#78350f" opacity=".4"/>
<rect x="4" y="20" width="6" height="2.5" rx=".8" fill="#78350f" opacity=".4"/>
<rect x="4" y="25" width="6" height="2.5" rx="1" fill="#92400e" opacity=".6"/>
<rect x="1.5" y="5" width="2" height="3.5" rx=".8" fill="#374151"/>
<rect x="10.5" y="5" width="2" height="3.5" rx=".8" fill="#374151"/>
<rect x="1.5" y="14" width="2" height="3.5" rx=".8" fill="#374151"/>
<rect x="10.5" y="14" width="2" height="3.5" rx=".8" fill="#374151"/>
<rect x="1.5" y="22" width="2" height="3.5" rx=".8" fill="#374151"/>
<rect x="10.5" y="22" width="2" height="3.5" rx=".8" fill="#374151"/>
</svg>`
  }

  if (type === 'emergency') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<path d="M4,3 Q4,1 6,1 L10,1 Q12,1 12,3 L13,7 L13,17 Q13,20 11,20 L5,20 Q3,20 3,17 L3,7 Z" fill="#e2e8f0" stroke="${dc}" stroke-width="1"/>
<rect x="5" y="3" width="6" height="4" rx="1" fill="#94a3b8" opacity=".5"/>
<rect x="5" y="15" width="6" height="3" rx="1" fill="#94a3b8" opacity=".4"/>
<rect x="4" y="9" width="3.5" height="2.5" rx=".8" fill="#3b82f6"/>
<rect x="8.5" y="9" width="3.5" height="2.5" rx=".8" fill="#ef4444"/>
<rect x="2" y="5" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="12" y="5" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="2" y="14" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="12" y="14" width="2" height="4" rx=".8" fill="#374151"/>
</svg>`
  }

  // ── Passenger car ── blue body, dark windshield, 4 wheels
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<path d="M4,3 Q4,1 6,1 L10,1 Q12,1 12,3 L13,7 L13,17 Q13,20 11,20 L5,20 Q3,20 3,17 L3,7 Z" fill="#2563eb" stroke="${dc}" stroke-width="1"/>
<rect x="5" y="3" width="6" height="4" rx="1" fill="#1e3a5f" opacity=".8"/>
<rect x="5" y="15" width="6" height="3" rx="1" fill="#1e3a5f" opacity=".7"/>
<rect x="2" y="5" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="12" y="5" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="2" y="14" width="2" height="4" rx=".8" fill="#374151"/>
<rect x="12" y="14" width="2" height="4" rx=".8" fill="#374151"/>
</svg>`
}

// ===== ICON CACHE =====
const iconCache = new Map<string, L.DivIcon>()

function getVehicleIcon(v: Vehicle): L.DivIcon {
  const defLevel = v.defense_level || 'medium'
  const key = `${v.type}|${v.is_attacker}|${defLevel}`

  let icon = iconCache.get(key)
  if (icon) return icon

  const svg = vehicleSvg(v.type, v.is_attacker, defLevel)

  const size: [number, number] =
    v.type === 'bus'  ? [14, 30] :
    v.type === 'truck' ? [16, 28] : [W, H]

  icon = L.divIcon({
    html: svg,
    className: 'v-car',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  })

  iconCache.set(key, icon)
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
        .v-car { background: transparent !important; border: none !important; transition: transform 0.25s linear !important; }
        .leaflet-container { background: #0f172a !important; }
        .leaflet-popup-content-wrapper { background: #1e293b !important; color: #e2e8f0 !important; border: 1px solid #334155 !important; border-radius: 8px !important; }
        .leaflet-popup-tip { background: #1e293b !important; }
        .leaflet-popup-content { margin: 8px 12px !important; }
        .leaflet-control-zoom a { background: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important; }
        .leaflet-control-zoom a:hover { background: #334155 !important; }
        @keyframes dash-flow { to { stroke-dashoffset: -24; } }
        .attack-dash { animation: dash-flow 1s linear infinite; }
        @keyframes pulse-glow { 0%,100% { opacity: 0.3; } 50% { opacity: 0.7; } }
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

        {/* Target rings — small, pulsing */}
        {Array.from(hackByTarget.entries()).map(([tid, p]) => {
          const tv = simulationState.vehicles.find(v => v.id === tid)
          if (!tv) return null
          return <CircleMarker key={`tr${tid}`} center={[tv.lat, tv.lon]} radius={6 + (p / 100) * 6}
            pathOptions={{ color: '#ef4444', weight: 1, fillOpacity: 0.05, opacity: 0.3 + (p / 100) * 0.4 }} />
        })}

        {/* Sybil ghosts */}
        {ghosts.map((pos, i) => (
          <CircleMarker key={`g${i}`} center={pos} radius={4}
            pathOptions={{ color: '#ef4444', weight: 1, fillColor: '#ef4444', fillOpacity: 0.12, opacity: 0.25, dashArray: '3 3' }} />
        ))}

        {/* Vehicles — small clean icons with CSS-smoothed movement */}
        {simulationState.vehicles.map(v => {
          const hp = hackByTarget.get(v.id) || 0
          return (
            <Marker key={v.id} position={[v.lat, v.lon]} icon={getVehicleIcon(v)}
              eventHandlers={{ click: () => onSelectVehicle(selectedVehicle?.id === v.id ? null : v) }}>
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <strong style={{ fontSize: 11 }}>{v.name || v.id}</strong>
                  <br />
                  <span style={{ color: v.status === 'moving' ? '#22c55e' : '#ef4444', fontSize: 10 }}>
                    {v.status === 'moving' ? t('map.inMotion') : t('map.stoppedLabel')}
                  </span>
                  <span style={{ fontSize: 10, marginLeft: 6 }}>{v.speed?.toFixed(0)} {t('vehicle.kmh')}</span>
                  {v.defense_level && !v.is_attacker && (
                    <><br /><span style={{ fontSize: 10, color: v.defense_level === 'high' ? '#22c55e' : v.defense_level === 'low' ? '#ef4444' : '#eab308' }}>
                      {t(`defense.${v.defense_level}`)}
                    </span></>
                  )}
                  {v.is_attacker && (v.hack_progress || 0) > 0 && (
                    <><br /><span style={{ color: '#ef4444', fontSize: 10 }}>{t('map.hackProgress')} {Math.round(v.hack_progress || 0)}%</span></>
                  )}
                  {hp > 0 && (
                    <><br /><span style={{ color: '#f87171', fontWeight: 'bold', fontSize: 10 }}>{t('map.targetProgress')} {Math.round(hp)}%</span></>
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
