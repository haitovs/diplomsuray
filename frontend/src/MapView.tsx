import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
}

interface MapViewProps {
  simulationState: SimulationState | null
  selectedVehicle: Vehicle | null
  onSelectVehicle: (v: Vehicle | null) => void
}

// ===== Defense level labels =====
const DEFENSE_LABEL: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

// ===== Vehicle type labels =====
const VTYPE_LABEL: Record<string, string> = {
  hacker: 'ХАКЕР',
  truck: 'Грузовик',
  bus: 'Автобус',
  passenger: 'Авто',
  emergency: 'Экстренная',
}

// ===== Create custom vehicle icons =====
function createVehicleIcon(v: Vehicle, isTarget: boolean, hackProgressOnTarget: number): L.DivIcon {
  const isHacker = v.is_attacker
  const isStopped = v.status === 'stopped'

  let color = '#3b82f6' // blue - passenger
  let label = v.name || 'Авто'
  if (isHacker) { color = '#ef4444'; label = v.name || 'ХАКЕР' }
  else if (v.type === 'truck') { color = '#22c55e'; label = v.name || 'Грузовик' }
  else if (v.type === 'bus') { color = '#f97316'; label = v.name || 'Автобус' }
  else if (v.type === 'emergency') { color = '#a855f7'; label = v.name || 'Экстренная' }

  const defLevel = v.defense_level || 'medium'
  const defColor = defLevel === 'high' ? '#22c55e' : defLevel === 'low' ? '#ef4444' : '#eab308'
  const defLabel = DEFENSE_LABEL[defLevel] || defLevel

  const pulseRing = isHacker && v.hack_progress && v.hack_progress > 0
    ? `<div style="position:absolute;top:-12px;left:-12px;width:36px;height:36px;border:2px solid ${color};border-radius:50%;animation:pulseRing 1.5s ease-out infinite;opacity:0.6"></div>`
    : ''

  const hackBar = isHacker && v.hack_progress && v.hack_progress > 0
    ? `<div style="position:absolute;top:-20px;left:-15px;width:42px;height:5px;background:#334155;border-radius:2px;overflow:hidden">
        <div style="width:${v.hack_progress}%;height:100%;background:#ef4444;transition:width 0.3s"></div>
       </div>
       <div style="position:absolute;top:-30px;left:-15px;width:42px;text-align:center;font-size:7px;color:#fca5a5;font-weight:bold">АТАКА ${Math.round(v.hack_progress)}%</div>`
    : ''

  // Target vehicle hack progress bar (shown on the victim)
  const targetHackBar = isTarget && hackProgressOnTarget > 0
    ? `<div style="position:absolute;top:-20px;left:-15px;width:42px;height:5px;background:#334155;border-radius:2px;overflow:hidden;border:1px solid #ef4444">
        <div style="width:${hackProgressOnTarget}%;height:100%;background:#f87171;transition:width 0.3s"></div>
       </div>
       <div style="position:absolute;top:-30px;left:-15px;width:42px;text-align:center;font-size:7px;color:#fca5a5;font-weight:bold">ВЗЛОМ ${Math.round(hackProgressOnTarget)}%</div>`
    : ''

  const stoppedBadge = isStopped && !isHacker
    ? `<div style="position:absolute;bottom:-18px;left:-10px;font-size:7px;color:#ef4444;font-weight:bold;background:rgba(239,68,68,0.15);padding:1px 4px;border-radius:3px;white-space:nowrap">ОСТАНОВЛЕН</div>`
    : ''

  // Red-tinted border for targeted vehicles
  const borderColor = isTarget ? '#ef4444' : (isStopped ? '#ef4444' : 'white')

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center">
      ${hackBar}
      ${targetHackBar}
      ${pulseRing}
      <div style="
        width:12px;height:12px;
        background:${color};
        border:2px solid ${borderColor};
        border-radius:50%;
        box-shadow:0 0 6px ${color}60${isTarget ? ', 0 0 12px rgba(239,68,68,0.4)' : ''};
        position:relative;z-index:2;
      "></div>
      <div style="font-size:8px;font-weight:bold;color:${color};margin-top:2px;white-space:nowrap;text-shadow:0 0 3px rgba(0,0,0,0.8);max-width:60px;overflow:hidden;text-overflow:ellipsis">${label}</div>
      ${!isHacker ? `<div style="font-size:7px;font-weight:bold;color:${defColor};white-space:nowrap;margin-top:1px;background:rgba(0,0,0,0.5);padding:0 3px;border-radius:2px">${defLabel}</div>` : ''}
      ${stoppedBadge}
    </div>
  `

  return L.divIcon({
    html,
    className: 'vehicle-marker',
    iconSize: [40, 50],
    iconAnchor: [20, 8],
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
export default function MapView({ simulationState, selectedVehicle, onSelectVehicle }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)

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

  // Attack line: from hacker to target (multi-layer)
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

  // Compute hack progress by target (for showing progress on victim vehicles)
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

  if (!simulationState) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-slate-500 text-sm">Ожидание данных симуляции...</div>
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
        @keyframes pulseRing { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2); opacity: 0; } }
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

        {/* Auto-fit to simulation bounds */}
        <FitBounds bounds={simulationState.bounds} />

        {/* ===== ROAD NETWORK EDGES ===== */}
        {roadSegments.map((positions, i) => (
          <Polyline
            key={`road-${i}`}
            positions={positions}
            pathOptions={{ color: '#475569', weight: 2, opacity: 0.4 }}
          />
        ))}

        {/* ===== SELECTED VEHICLE ROUTE ===== */}
        {selectedRoute && (
          <Polyline
            positions={selectedRoute}
            pathOptions={{ color: '#06b6d4', weight: 3, opacity: 0.6, dashArray: '6 4' }}
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

        {/* ===== MULTI-LAYER ATTACK LINE ===== */}
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
              pathOptions={{ color: '#ef4444', weight: 3, dashArray: '12 6', opacity: 0.9 }}
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
          const radius = 10 + (progress / 100) * 20 // grows from 10 to 30
          return (
            <CircleMarker
              key={`target-ring-${targetId}`}
              center={[target.lat, target.lon]}
              radius={radius}
              pathOptions={{ color: '#ef4444', weight: 2, fillOpacity: 0.05, opacity: 0.4 + (progress / 100) * 0.4 }}
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

        {/* Vehicle markers */}
        {simulationState.vehicles.map(v => {
          const isTarget = hackProgressByTarget.has(v.id)
          const targetProgress = hackProgressByTarget.get(v.id) || 0
          return (
            <Marker
              key={v.id}
              position={[v.lat, v.lon]}
              icon={createVehicleIcon(v, isTarget, targetProgress)}
              eventHandlers={{
                click: () => onSelectVehicle(selectedVehicle?.id === v.id ? null : v),
              }}
            >
              <Popup>
                <div style={{ minWidth: 170 }}>
                  <strong style={{ fontSize: '13px' }}>{v.name || v.id}</strong>
                  {v.name && <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 6, fontFamily: 'monospace' }}>{v.id}</span>}
                  <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>{VTYPE_LABEL[v.type] || v.type}</span>
                  <br />
                  <span style={{ color: v.status === 'moving' ? '#22c55e' : '#ef4444' }}>
                    {v.status === 'moving' ? 'В движении' : 'Остановлен'}
                  </span>
                  <br />
                  <span>Скорость: {v.speed?.toFixed(1)} км/ч</span>
                  <br />
                  {v.defense_level && !v.is_attacker && (
                    <span style={{ color: v.defense_level === 'high' ? '#22c55e' : v.defense_level === 'low' ? '#ef4444' : '#eab308' }}>
                      Защита: {DEFENSE_LABEL[v.defense_level] || v.defense_level}
                    </span>
                  )}
                  {v.is_attacker && v.hack_progress !== undefined && v.hack_progress > 0 && (
                    <>
                      <br />
                      <span style={{ color: '#ef4444' }}>Взлом: {Math.round(v.hack_progress)}%</span>
                    </>
                  )}
                  {isTarget && targetProgress > 0 && (
                    <>
                      <br />
                      <span style={{ color: '#f87171', fontWeight: 'bold' }}>Цель атаки: {Math.round(targetProgress)}%</span>
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
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/80 backdrop-blur border border-red-500/50 rounded-lg px-4 py-2 text-center pointer-events-none shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          <span className="text-red-200 text-sm font-bold">
            АТАКА АКТИВНА: {simulationState.active_attack.toUpperCase()}
            {simulationState.attack_sophistication && ` (${simulationState.attack_sophistication})`}
          </span>
        </div>
      )}
    </div>
  )
}
