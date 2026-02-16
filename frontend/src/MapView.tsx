import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ===== TYPES =====
interface Vehicle {
  id: string
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
  low: '🛡️ Низкий',
  medium: '🛡️🛡️ Средний',
  high: '🛡️🛡🛡 Высокий',
}

// ===== Vehicle type labels =====
const VTYPE_LABEL: Record<string, string> = {
  hacker: '💀 ХАКЕР',
  truck: '🚛 Грузовик',
  bus: '🚌 Автобус',
  passenger: '🚗 Авто',
  emergency: '🚑 Экстренная',
}

// ===== Create custom vehicle icons =====
function createVehicleIcon(v: Vehicle): L.DivIcon {
  const isHacker = v.is_attacker
  const isStopped = v.status === 'stopped'
  
  let color = '#3b82f6' // blue - passenger
  let label = 'Авто'
  if (isHacker) { color = '#ef4444'; label = 'ХАКЕР' }
  else if (v.type === 'truck') { color = '#22c55e'; label = 'Грузовик' }
  else if (v.type === 'bus') { color = '#f97316'; label = 'Автобус' }
  else if (v.type === 'emergency') { color = '#a855f7'; label = 'Экстренная' }

  const defLevel = v.defense_level || 'medium'
  const defColor = defLevel === 'high' ? '#22c55e' : defLevel === 'low' ? '#ef4444' : '#eab308'
  const defLabel = defLevel === 'high' ? 'ВЫС' : defLevel === 'low' ? 'НИЗ' : 'СРЕ'
  
  const pulseRing = isHacker && v.hack_progress && v.hack_progress > 0
    ? `<div style="position:absolute;top:-12px;left:-12px;width:36px;height:36px;border:2px solid ${color};border-radius:50%;animation:pulse 1s infinite;opacity:0.6"></div>`
    : ''

  const hackBar = isHacker && v.hack_progress && v.hack_progress > 0
    ? `<div style="position:absolute;top:-20px;left:-15px;width:42px;height:5px;background:#334155;border-radius:2px;overflow:hidden">
        <div style="width:${v.hack_progress}%;height:100%;background:#ef4444"></div>
       </div>
       <div style="position:absolute;top:-30px;left:-15px;width:42px;text-align:center;font-size:7px;color:#fca5a5;font-weight:bold">АТАКА ${Math.round(v.hack_progress)}%</div>`
    : ''

  const stoppedBadge = isStopped && !isHacker
    ? `<div style="position:absolute;bottom:-18px;left:-10px;font-size:7px;color:#ef4444;font-weight:bold;background:rgba(239,68,68,0.15);padding:1px 4px;border-radius:3px;white-space:nowrap">ОСТАНОВЛЕН</div>`
    : ''

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center">
      ${hackBar}
      ${pulseRing}
      <div style="
        width:12px;height:12px;
        background:${color};
        border:2px solid ${isStopped ? '#ef4444' : 'white'};
        border-radius:50%;
        box-shadow:0 0 6px ${color}60;
        position:relative;z-index:2;
      "></div>
      <div style="font-size:8px;font-weight:bold;color:${color};margin-top:2px;white-space:nowrap;text-shadow:0 0 3px rgba(0,0,0,0.8)">${label}</div>
      ${!isHacker ? `<div style="font-size:7px;font-weight:bold;color:${defColor};white-space:nowrap;margin-top:1px;background:rgba(0,0,0,0.5);padding:0 3px;border-radius:2px">🛡️${defLabel}</div>` : ''}
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
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.5); opacity: 0.2; } }
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

        {/* Traffic lights */}
        {simulationState.roads?.lights && Object.entries(simulationState.roads.lights).map(([nodeId, light]) => {
          const pos = simulationState.roads.nodes[nodeId]
          if (!pos) return null
          return (
            <Marker key={`light-${nodeId}`} position={[pos[0], pos[1]]} icon={createLightIcon(light.state)} />
          )
        })}

        {/* Road edges as polylines */}
        {simulationState.roads?.edges?.map(([startId, endId], idx) => {
          const s = simulationState.roads.nodes[startId]
          const e = simulationState.roads.nodes[endId]
          if (!s || !e) return null
          return (
            <Polyline
              key={`road-${idx}`}
              positions={[[s[0], s[1]], [e[0], e[1]]]}
              pathOptions={{ color: '#475569', weight: 4, opacity: 0.5 }}
            />
          )
        })}

        {/* Attack line */}
        {attackLine && (
          <Polyline
            positions={attackLine.positions}
            pathOptions={{ color: '#ef4444', weight: 2, dashArray: '8 6', opacity: 0.7 }}
          />
        )}

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
        {simulationState.vehicles.map(v => (
          <Marker
            key={v.id}
            position={[v.lat, v.lon]}
            icon={createVehicleIcon(v)}
            eventHandlers={{
              click: () => onSelectVehicle(selectedVehicle?.id === v.id ? null : v),
            }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{v.id}</strong> — {VTYPE_LABEL[v.type] || v.type}
                <br />
                <span style={{ color: v.status === 'moving' ? '#22c55e' : '#ef4444' }}>
                  {v.status === 'moving' ? '🟢 В движении' : '🔴 Остановлен'}
                </span>
                <br />
                <span>Скорость: {v.speed?.toFixed(1)} км/ч</span>
                <br />
                {v.defense_level && (
                  <span style={{ color: v.defense_level === 'high' ? '#22c55e' : v.defense_level === 'low' ? '#ef4444' : '#eab308' }}>
                    {DEFENSE_LABEL[v.defense_level] || v.defense_level}
                  </span>
                )}
                {v.is_attacker && v.hack_progress !== undefined && v.hack_progress > 0 && (
                  <>
                    <br />
                    <span style={{ color: '#ef4444' }}>⚡ Взлом: {Math.round(v.hack_progress)}%</span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Attack overlay banner */}
      {simulationState.active_attack && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/80 backdrop-blur border border-red-500/50 rounded-lg px-4 py-2 text-center pointer-events-none animate-pulse">
          <span className="text-red-200 text-sm font-bold">
            ⚠️ АТАКА АКТИВНА: {simulationState.active_attack.toUpperCase()}
            {simulationState.attack_sophistication && ` (${simulationState.attack_sophistication})`}
          </span>
        </div>
      )}
    </div>
  )
}
