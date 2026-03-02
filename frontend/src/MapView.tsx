import { useEffect, useRef, useMemo, useState } from 'react'
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

// ===== SVG VEHICLE SILHOUETTES =====
function svgCar(fill: string): string {
  return `<svg width="24" height="14" viewBox="0 0 24 14" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="22" height="8" rx="3" fill="${fill}" opacity="0.9"/>
    <rect x="4" y="1" width="14" height="6" rx="2" fill="${fill}"/>
    <circle cx="6" cy="12" r="2" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
    <circle cx="18" cy="12" r="2" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
  </svg>`
}

function svgTruck(fill: string): string {
  return `<svg width="28" height="14" viewBox="0 0 28 14" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="20" height="10" rx="2" fill="${fill}" opacity="0.9"/>
    <rect x="21" y="4" width="6" height="8" rx="1.5" fill="${fill}" opacity="0.7"/>
    <circle cx="7" cy="12" r="2" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
    <circle cx="16" cy="12" r="2" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
    <circle cx="25" cy="12" r="1.5" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
  </svg>`
}

function svgBus(fill: string): string {
  return `<svg width="32" height="12" viewBox="0 0 32 12" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="30" height="9" rx="3" fill="${fill}" opacity="0.9"/>
    <rect x="3" y="2" width="4" height="3" rx="1" fill="#1e293b" opacity="0.4"/>
    <rect x="9" y="2" width="4" height="3" rx="1" fill="#1e293b" opacity="0.4"/>
    <rect x="15" y="2" width="4" height="3" rx="1" fill="#1e293b" opacity="0.4"/>
    <rect x="21" y="2" width="4" height="3" rx="1" fill="#1e293b" opacity="0.4"/>
    <circle cx="7" cy="11" r="1.5" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
    <circle cx="25" cy="11" r="1.5" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
  </svg>`
}

function svgEmergency(fill: string): string {
  return `<svg width="24" height="14" viewBox="0 0 24 14" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="22" height="8" rx="3" fill="${fill}" opacity="0.9"/>
    <rect x="4" y="1" width="14" height="6" rx="2" fill="${fill}"/>
    <line x1="12" y1="2" x2="12" y2="6" stroke="#ef4444" stroke-width="2"/>
    <line x1="10" y1="4" x2="14" y2="4" stroke="#ef4444" stroke-width="2"/>
    <circle cx="6" cy="12" r="2" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
    <circle cx="18" cy="12" r="2" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
  </svg>`
}

function svgHacker(fill: string): string {
  return `<svg width="24" height="14" viewBox="0 0 24 14" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="22" height="8" rx="3" fill="${fill}" opacity="0.9"/>
    <rect x="4" y="1" width="14" height="6" rx="2" fill="${fill}"/>
    <circle cx="9" cy="5" r="1.5" fill="#1e293b"/>
    <circle cx="15" cy="5" r="1.5" fill="#1e293b"/>
    <path d="M8 8 L12 10 L16 8" stroke="#1e293b" stroke-width="1" fill="none"/>
    <circle cx="6" cy="12" r="2" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
    <circle cx="18" cy="12" r="2" fill="#1e293b" stroke="${fill}" stroke-width="0.5"/>
  </svg>`
}

// ===== DEFENSE ARC SVG =====
function defenseArc(defLevel: string): string {
  const size = 30
  const r = 13
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  let color = '#eab308'
  let dashLen = circumference * 0.5 // medium: 180deg
  if (defLevel === 'low') { color = '#ef4444'; dashLen = circumference * 0.25 } // 90deg
  else if (defLevel === 'high') { color = '#22c55e'; dashLen = circumference } // 360deg

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="position:absolute;top:-8px;left:-3px;pointer-events:none">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="${dashLen} ${circumference}" stroke-linecap="round" opacity="0.6"/>
  </svg>`
}

// ===== HACK PROGRESS RING SVG =====
function hackProgressRing(progress: number): string {
  const size = 34
  const r = 15
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const dashLen = (progress / 100) * circumference

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="position:absolute;top:-10px;left:-5px;pointer-events:none" class="hack-ring-pulse">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="${dashLen} ${circumference}" stroke-linecap="round" opacity="0.8" transform="rotate(-90 ${cx} ${cy})"/>
  </svg>`
}

// ===== ICON CACHE for performance =====
const iconCache = new Map<string, L.DivIcon>()

function getVehicleIcon(v: Vehicle, isTarget: boolean, hp: number, lang: string): L.DivIcon {
  const key = `${v.id}|${v.status}|${Math.round(v.hack_progress || 0)}|${v.defense_level}|${isTarget}|${Math.round(hp)}|${v.is_attacker}|${lang}`
  const cached = iconCache.get(key)
  if (cached) return cached
  const icon = createVehicleIcon(v, isTarget, hp)
  iconCache.set(key, icon)
  if (iconCache.size > 200) {
    const firstKey = iconCache.keys().next().value
    if (firstKey !== undefined) iconCache.delete(firstKey)
  }
  return icon
}

// ===== Create custom vehicle icons with SVG silhouettes =====
function createVehicleIcon(v: Vehicle, isTarget: boolean, hackProgressOnTarget: number): L.DivIcon {
  const isHacker = v.is_attacker
  const isStopped = v.status === 'stopped'

  let color = '#3b82f6' // blue - passenger
  if (isHacker) { color = '#ef4444' }
  else if (v.type === 'truck') { color = '#22c55e' }
  else if (v.type === 'bus') { color = '#f97316' }
  else if (v.type === 'emergency') { color = '#a855f7' }

  // Select SVG shape
  let svgShape: string
  if (isHacker) svgShape = svgHacker(color)
  else if (v.type === 'truck') svgShape = svgTruck(color)
  else if (v.type === 'bus') svgShape = svgBus(color)
  else if (v.type === 'emergency') svgShape = svgEmergency(color)
  else svgShape = svgCar(color)

  const defLevel = v.defense_level || 'medium'

  // Defense level arc (non-hackers only)
  const defArc = !isHacker ? defenseArc(defLevel) : ''

  // Hack progress ring on attacker
  const hackRing = isHacker && v.hack_progress && v.hack_progress > 0
    ? hackProgressRing(v.hack_progress)
    : ''

  // Target hack progress bar
  const targetHackBar = isTarget && hackProgressOnTarget > 0
    ? `<div style="position:absolute;top:-18px;left:-8px;width:40px;height:4px;background:#334155;border-radius:2px;overflow:hidden;border:1px solid #ef4444">
        <div style="width:${hackProgressOnTarget}%;height:100%;background:#f87171;transition:width 0.3s"></div>
       </div>`
    : ''

  const stoppedBadge = isStopped && !isHacker
    ? `<div style="position:absolute;bottom:-14px;left:-6px;font-size:7px;color:#ef4444;font-weight:bold;background:rgba(239,68,68,0.15);padding:1px 4px;border-radius:3px;white-space:nowrap">STOP</div>`
    : ''

  // Label: vehicle name
  const label = v.name || v.id
  const labelColor = isHacker ? '#ef4444' : color

  // Hacker red glow filter
  const hackerGlow = isHacker
    ? 'filter:drop-shadow(0 0 4px rgba(239,68,68,0.6));'
    : ''

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;${hackerGlow}transform:rotate(${v.heading}deg)">
      ${hackRing}
      ${defArc}
      ${targetHackBar}
      <div style="position:relative;z-index:2">${svgShape}</div>
      ${stoppedBadge}
    </div>
    <div style="font-size:8px;font-weight:bold;color:${labelColor};white-space:nowrap;text-align:center;margin-top:1px;text-shadow:0 0 3px rgba(0,0,0,0.9);max-width:60px;overflow:hidden;text-overflow:ellipsis;transform:rotate(-${v.heading}deg)">${label}</div>
  `

  return L.divIcon({
    html,
    className: 'vehicle-marker',
    iconSize: [40, 50],
    iconAnchor: [20, 8],
  })
}

// ===== Ghost vehicle icon for Sybil attack =====
function createGhostIcon(heading: number): L.DivIcon {
  const ghostSvg = svgCar('#ef4444')
  return L.divIcon({
    html: `<div style="opacity:0.3;transform:rotate(${heading}deg);filter:drop-shadow(0 0 3px rgba(239,68,68,0.4))">
      <div style="position:relative;border:1px dashed #ef4444;border-radius:4px;padding:1px">${ghostSvg}</div>
    </div>
    <div style="font-size:7px;font-weight:bold;color:#ef4444;text-align:center;opacity:0.5;text-shadow:0 0 2px rgba(0,0,0,0.8);transform:rotate(-${heading}deg)">FAKE</div>`,
    className: 'vehicle-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 8],
  })
}

// ===== Map annotation label =====
function createMapLabel(text: string, color: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="font-size:10px;font-weight:bold;color:${color};white-space:nowrap;text-shadow:0 0 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);letter-spacing:0.5px;pointer-events:none;animation:labelPulse 1.5s ease-in-out infinite">${text}</div>`,
    className: 'map-label-marker',
    iconSize: [80, 16],
    iconAnchor: [40, 8],
  })
}

// ===== Traffic light icon =====
function createLightIcon(state: string): L.DivIcon {
  const c = state === 'red' ? '#ef4444' : '#22c55e'
  return L.divIcon({
    html: `<div style="width:8px;height:8px;background:${c};border-radius:50%;border:1px solid #000;box-shadow:0 0 4px ${c}"></div>`,
    className: 'light-marker',
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  })
}

// ===== Street name labels for educational overlay =====
const STREET_LABELS: { name: string; position: [number, number] }[] = [
  { name: 'Greenwich St', position: [40.7100, -74.0106] },
  { name: 'W Broadway', position: [40.7112, -74.0085] },
  { name: 'Church St', position: [40.7110, -74.0065] },
  { name: 'Broadway', position: [40.7105, -74.0055] },
  { name: 'Fulton St', position: [40.7112, -74.0078] },
  { name: 'Vesey St', position: [40.7124, -74.0070] },
  { name: 'Rector St', position: [40.7076, -74.0090] },
]

function createStreetLabelIcon(name: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="font-size:9px;color:#94a3b8;font-weight:600;white-space:nowrap;text-shadow:0 0 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);letter-spacing:0.5px;pointer-events:none">${name}</div>`,
    className: 'street-label-marker',
    iconSize: [80, 14],
    iconAnchor: [40, 7],
  })
}

// ===== Component to auto-fit bounds on first render =====
function FitBounds({ bounds }: { bounds: SimulationState['bounds'] }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds([
      [bounds.lat_min, bounds.lon_min],
      [bounds.lat_max, bounds.lon_max],
    ], { padding: [30, 30] })
  }, []) // Only on mount
  return null
}

// ===== Main MapView Component =====
export default function MapView({ simulationState, selectedVehicle, onSelectVehicle, lang = 'ru' }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const { t } = useTranslation(lang)

  // Track recently defended vehicles for green flash
  const [defendedVehicles, setDefendedVehicles] = useState<Set<string>>(new Set())
  const defendedTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Track defense blocks from anomaly detections
  const prevAnomalyCountRef = useRef(0)
  useEffect(() => {
    if (!simulationState) return
    const anomalies = simulationState.vehicles.filter(v => !v.is_attacker && v.anomalies_detected > 0)
    // Detect new defenses: when a vehicle's hack_progress resets (defense kicked in)
    for (const v of simulationState.vehicles) {
      if (!v.is_attacker && v.status === 'moving' && v.anomalies_detected > 0) {
        // If we haven't already flashed this vehicle
        if (!defendedVehicles.has(v.id) && v.anomalies_detected > prevAnomalyCountRef.current) {
          setDefendedVehicles(prev => new Set(prev).add(v.id))
          // Clear after 2 seconds
          const timer = setTimeout(() => {
            setDefendedVehicles(prev => {
              const next = new Set(prev)
              next.delete(v.id)
              return next
            })
            defendedTimersRef.current.delete(v.id)
          }, 2000)
          const oldTimer = defendedTimersRef.current.get(v.id)
          if (oldTimer) clearTimeout(oldTimer)
          defendedTimersRef.current.set(v.id, timer)
        }
      }
    }
    prevAnomalyCountRef.current = anomalies.length
  }, [simulationState?.vehicles])

  // Deduplicated road edges for rendering
  const roadSegments = useMemo(() => {
    if (!simulationState?.roads) return []
    const seen = new Set<string>()
    const segments: [number, number][][] = []
    const nodes = simulationState.roads.nodes

    for (const [a, b] of simulationState.roads.edges) {
      const key = [a, b].sort().join('--')
      if (seen.has(key)) continue
      seen.add(key)
      const posA = nodes[a]
      const posB = nodes[b]
      if (posA && posB) {
        segments.push([[posA[0], posA[1]], [posB[0], posB[1]]])
      }
    }
    return segments
  }, [simulationState?.roads])

  // Unique road node positions for intersection dots
  const intersectionNodes = useMemo(() => {
    if (!simulationState?.roads) return []
    const nodes = simulationState.roads.nodes
    const connectionCount = new Map<string, number>()
    for (const [a, b] of simulationState.roads.edges) {
      connectionCount.set(a, (connectionCount.get(a) || 0) + 1)
      connectionCount.set(b, (connectionCount.get(b) || 0) + 1)
    }
    const result: [number, number][] = []
    for (const [nodeId, count] of connectionCount) {
      if (count >= 3) {
        const pos = nodes[nodeId]
        if (pos) result.push([pos[0], pos[1]])
      }
    }
    return result
  }, [simulationState?.roads])

  // Selected vehicle route
  const selectedRoute = useMemo(() => {
    if (!selectedVehicle?.path || !simulationState?.roads) return null
    const nodes = simulationState.roads.nodes
    const positions: [number, number][] = []
    for (const nodeId of selectedVehicle.path) {
      const pos = nodes[nodeId]
      if (pos) positions.push([pos[0], pos[1]])
    }
    return positions.length > 1 ? positions : null
  }, [selectedVehicle?.path, simulationState?.roads])

  // Attack line: from hacker to target
  const attackLine = useMemo(() => {
    if (!simulationState?.active_attack) return null
    const hacker = simulationState.vehicles.find(v => v.is_attacker)
    if (!hacker) return null
    const targetId = hacker.target_vehicle
    if (!targetId) return null
    const target = simulationState.vehicles.find(v => v.id === targetId)
    if (!target) return null
    return {
      positions: [[hacker.lat, hacker.lon], [target.lat, target.lon]] as [number, number][],
      hackerId: hacker.id,
      targetId: target.id,
    }
  }, [simulationState?.vehicles, simulationState?.active_attack])

  // Compute hack progress by target
  const hackProgressByTarget = useMemo(() => {
    const map = new Map<string, number>()
    if (!simulationState) return map
    for (const v of simulationState.vehicles) {
      if (v.is_attacker && v.target_vehicle && v.hack_progress && v.hack_progress > 0) {
        map.set(v.target_vehicle, v.hack_progress)
      }
    }
    return map
  }, [simulationState?.vehicles])

  // Sybil ghost vehicles
  const sybilGhosts = useMemo(() => {
    if (simulationState?.active_attack !== 'sybil') return []
    const hacker = simulationState?.vehicles.find(v => v.is_attacker)
    if (!hacker) return []
    // Generate 3-5 ghost positions near the attacker
    const ghosts: { lat: number; lon: number; heading: number }[] = []
    const offsets = [
      [0.0003, 0.0004], [-0.0004, 0.0003], [0.0005, -0.0002],
      [-0.0003, -0.0004], [0.0002, 0.0005],
    ]
    for (const [dlat, dlon] of offsets) {
      ghosts.push({
        lat: hacker.lat + dlat,
        lon: hacker.lon + dlon,
        heading: Math.random() * 360,
      })
    }
    return ghosts
  }, [simulationState?.active_attack, simulationState?.vehicles])

  // Map annotation labels
  const mapLabels = useMemo(() => {
    const labels: { position: [number, number]; text: string; color: string }[] = []
    if (!simulationState) return labels

    // "HACKING..." label near target during hack
    for (const [targetId, progress] of hackProgressByTarget) {
      if (progress > 0) {
        const target = simulationState.vehicles.find(v => v.id === targetId)
        if (target) {
          labels.push({
            position: [target.lat + 0.0004, target.lon],
            text: `${t('mapLabels.hacking')} ${Math.round(progress)}%`,
            color: '#fca5a5',
          })
        }
      }
    }

    return labels
  }, [simulationState?.vehicles, hackProgressByTarget, t])

  // Communication range in meters
  const commRangeMeters = useMemo(() => {
    const rangeParam = simulationState?.params?.communication_range || 0.005
    return rangeParam * 111000
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
        .vehicle-marker { background: transparent !important; border: none !important; }
        .light-marker { background: transparent !important; border: none !important; }
        .street-label-marker { background: transparent !important; border: none !important; }
        .map-label-marker { background: transparent !important; border: none !important; }
        @keyframes pulseRing { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes labelPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes hackRingPulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.4; } }
        .hack-ring-pulse { animation: hackRingPulse 1.5s ease-in-out infinite; }
        .attack-beam-animate { animation: dashFlow 1s linear infinite; }
        @keyframes dashFlow { to { stroke-dashoffset: -24; } }
        .leaflet-container { background: #0f172a !important; }
        .leaflet-popup-content-wrapper { background: #1e293b !important; color: #e2e8f0 !important; border: 1px solid #334155 !important; border-radius: 8px !important; }
        .leaflet-popup-tip { background: #1e293b !important; }
        .leaflet-popup-content { margin: 8px 12px !important; }
        .leaflet-control-zoom a { background: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important; }
        .leaflet-control-zoom a:hover { background: #334155 !important; }
      `}</style>

      <MapContainer
        center={center}
        zoom={15}
        className="w-full h-full"
        zoomControl={true}
        ref={mapRef}
      >
        {/* Dark map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <FitBounds bounds={simulationState.bounds} />

        {/* ===== ROAD NETWORK EDGES ===== */}
        {roadSegments.map((positions, i) => (
          <Polyline
            key={`road-${i}`}
            positions={positions}
            pathOptions={{ color: '#64748b', weight: 3, opacity: 0.6 }}
          />
        ))}

        {/* ===== INTERSECTION NODE MARKERS ===== */}
        {intersectionNodes.map((pos, i) => (
          <CircleMarker
            key={`intersection-${i}`}
            center={pos}
            radius={3}
            pathOptions={{ color: '#94a3b8', weight: 1, fillColor: '#64748b', fillOpacity: 0.8 }}
          />
        ))}

        {/* ===== STREET NAME LABELS ===== */}
        {STREET_LABELS.map((street) => (
          <Marker
            key={`street-${street.name}`}
            position={street.position}
            icon={createStreetLabelIcon(street.name)}
            interactive={false}
          />
        ))}

        {/* ===== SELECTED VEHICLE ROUTE ===== */}
        {selectedRoute && (
          <Polyline
            positions={selectedRoute}
            pathOptions={{ color: '#06b6d4', weight: 3, opacity: 0.6, dashArray: '6 4' }}
          />
        )}

        {/* ===== V2V COMMUNICATION RANGE CIRCLE ===== */}
        {selectedVehicle && (
          <Circle
            center={[selectedVehicle.lat, selectedVehicle.lon]}
            radius={commRangeMeters}
            pathOptions={{ color: '#06b6d4', weight: 1, fillOpacity: 0.06, dashArray: '4 4' }}
          />
        )}

        {/* Traffic lights */}
        {simulationState.roads?.lights && Object.entries(simulationState.roads.lights).map(([nodeId, light]) => {
          const pos = simulationState.roads.nodes[nodeId]
          if (!pos) return null
          return (
            <Marker key={`light-${nodeId}`} position={[pos[0], pos[1]]} icon={createLightIcon(light.state)} />
          )
        })}

        {/* ===== MULTI-LAYER ATTACK BEAM ===== */}
        {attackLine && (
          <>
            {/* Layer 1: Wide soft glow */}
            <Polyline
              positions={attackLine.positions}
              pathOptions={{ color: '#ef4444', weight: 8, opacity: 0.15 }}
            />
            {/* Layer 2: Animated dashes */}
            <Polyline
              positions={attackLine.positions}
              pathOptions={{ color: '#ef4444', weight: 3, opacity: 0.8, dashArray: '8 4', className: 'attack-beam-animate' }}
            />
            {/* Layer 3: Bright core */}
            <Polyline
              positions={attackLine.positions}
              pathOptions={{ color: '#fca5a5', weight: 1, opacity: 0.8 }}
            />
          </>
        )}

        {/* ===== TARGET VEHICLE EXPANDING RING ===== */}
        {Array.from(hackProgressByTarget.entries()).map(([targetId, progress]) => {
          const target = simulationState.vehicles.find(v => v.id === targetId)
          if (!target) return null
          const radius = 10 + (progress / 100) * 20
          return (
            <CircleMarker
              key={`target-ring-${targetId}`}
              center={[target.lat, target.lon]}
              radius={radius}
              pathOptions={{ color: '#ef4444', weight: 2, fillOpacity: 0.05, opacity: 0.4 + (progress / 100) * 0.4 }}
            />
          )
        })}

        {/* ===== DEFENSE SHIELD FLASH (green pulse on defended vehicles) ===== */}
        {Array.from(defendedVehicles).map(vid => {
          const v = simulationState.vehicles.find(x => x.id === vid)
          if (!v) return null
          return (
            <CircleMarker
              key={`defense-flash-${vid}`}
              center={[v.lat, v.lon]}
              radius={18}
              pathOptions={{ color: '#22c55e', weight: 3, fillColor: '#22c55e', fillOpacity: 0.15, opacity: 0.7 }}
            />
          )
        })}

        {/* Hacker pulse ring */}
        {simulationState.vehicles
          .filter(v => v.is_attacker && simulationState.active_attack)
          .map(v => (
            <CircleMarker
              key={`pulse-${v.id}`}
              center={[v.lat, v.lon]}
              radius={25}
              pathOptions={{ color: '#ef4444', weight: 2, fillOpacity: 0.05, opacity: 0.5 }}
            />
          ))
        }

        {/* ===== SYBIL GHOST VEHICLES ===== */}
        {sybilGhosts.map((ghost, i) => (
          <Marker
            key={`ghost-${i}`}
            position={[ghost.lat, ghost.lon]}
            icon={createGhostIcon(ghost.heading)}
            interactive={false}
          />
        ))}
        {/* Ghost attack lines to target (thinner) */}
        {sybilGhosts.length > 0 && attackLine && sybilGhosts.map((ghost, i) => (
          <Polyline
            key={`ghost-line-${i}`}
            positions={[[ghost.lat, ghost.lon], attackLine.positions[1]]}
            pathOptions={{ color: '#ef4444', weight: 1, opacity: 0.2, dashArray: '4 4' }}
          />
        ))}

        {/* ===== MAP ANNOTATION LABELS ===== */}
        {mapLabels.map((label, i) => (
          <Marker
            key={`label-${i}`}
            position={label.position}
            icon={createMapLabel(label.text, label.color)}
            interactive={false}
          />
        ))}

        {/* Vehicle markers (using cached icons with SVG silhouettes) */}
        {simulationState.vehicles.map(v => {
          const isTarget = hackProgressByTarget.has(v.id)
          const targetProgress = hackProgressByTarget.get(v.id) || 0
          return (
            <Marker
              key={v.id}
              position={[v.lat, v.lon]}
              icon={getVehicleIcon(v, isTarget, targetProgress, lang)}
              eventHandlers={{
                click: () => onSelectVehicle(selectedVehicle?.id === v.id ? null : v),
              }}
            >
              <Popup>
                <div style={{ minWidth: 170 }}>
                  <strong style={{ fontSize: '13px' }}>{v.name || v.id}</strong>
                  {v.name && <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 6, fontFamily: 'monospace' }}>{v.id}</span>}
                  <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>{t(`vtype.${v.type}`)}</span>
                  <br />
                  <span style={{ color: v.status === 'moving' ? '#22c55e' : '#ef4444' }}>
                    {v.status === 'moving' ? t('map.inMotion') : t('map.stoppedLabel')}
                  </span>
                  <br />
                  <span>{t('map.speed')} {v.speed?.toFixed(1)} {t('vehicle.kmh')}</span>
                  <br />
                  {v.defense_level && !v.is_attacker && (
                    <span style={{ color: v.defense_level === 'high' ? '#22c55e' : v.defense_level === 'low' ? '#ef4444' : '#eab308' }}>
                      {t('map.defense')} {t(`defense.${v.defense_level}`)}
                    </span>
                  )}
                  {v.is_attacker && v.hack_progress !== undefined && v.hack_progress > 0 && (
                    <>
                      <br />
                      <span style={{ color: '#ef4444' }}>{t('map.hackProgress')} {Math.round(v.hack_progress)}%</span>
                    </>
                  )}
                  {isTarget && targetProgress > 0 && (
                    <>
                      <br />
                      <span style={{ color: '#f87171', fontWeight: 'bold' }}>{t('map.targetProgress')} {Math.round(targetProgress)}%</span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Attack overlay banner */}
      {simulationState.active_attack && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/80 border border-red-500/50 rounded-lg px-4 py-2 text-center pointer-events-none shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          <span className="text-red-200 text-sm font-bold">
            {t('map.attackActive', { name: simulationState.active_attack.toUpperCase() })}
            {simulationState.attack_sophistication && ` (${simulationState.attack_sophistication})`}
          </span>
        </div>
      )}
    </div>
  )
}
