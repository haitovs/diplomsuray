import { clsx } from 'clsx'
import { Activity, AlertTriangle, HelpCircle, Map as MapIcon, Move, Pause, Play, RotateCcw, Settings, Shield, X, Zap, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// Types
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
}

interface Message {
  id: string
  sender_id: string
  type: string
  timestamp: number
  is_anomaly: boolean
  anomaly_reason?: string
  attack_type?: string
  lat: number
  lon: number
  speed: number
  heading: number
}

interface V2VMessage {
  from: string
  to: string
  type: string
  distance: number
}

interface Anomaly {
  id: string
  timestamp: number
  sender: string
  type: string
  reason: string
  severity: string
}

interface TrafficLight {
  state: 'red' | 'green'
  timer: number
}

interface RoadData {
  nodes: Record<string, [number, number]>
  edges: [string, string][]
  lights?: Record<string, TrafficLight>
}

interface Preset {
  id: string
  name: string
  description: string
}


// NEW: Attack/Defense Logging Interfaces
interface AttackLog {
  id: string
  timestamp: number
  attack_type: string
  attacker_id: string
  target_ids: string[]
  sophistication: 'low' | 'medium' | 'high'
  status: 'initiated' | 'detected' | 'blocked' | 'succeeded' | 'failed' | 'cancelled'
  description: string
  severity: string
  icon: string
  attack_data: {
    bypass_chance: number
    sophistication_desc: string
  }
  educational_context: string
}

interface DefenseLog {
  id: string
  timestamp: number
  defense_type: string
  attack_id: string
  attacker_id: string
  action_taken: string
  success: boolean
  detection_time: number
  confidence: number
  explanation: string
  icon: string
}

interface AttackOutcome {
  id: string
  timestamp: number
  attack_id: string
  defense_ids: string[]
  result: 'blocked' | 'partial_success' | 'full_success'
  impact_description: string
  learning_points: string
  attack_succeeded: boolean
  defenses_triggered: number
}

interface AttackMetadata {
  name: string
  icon: string
  severity: string
  description: string
}

interface DefenseMetadata {
  name: string
  icon: string
  type: string
  description: string
}

interface DefenseConfig {
  enabled: boolean
  strength: number
}

// Updated SimulationState with new fields
interface SimulationState {
  step: number
  vehicles: Vehicle[]
  messages: Message[]
  v2v_communications: V2VMessage[]
  anomalies: Anomaly[]
  active_attack: string | null
  params: {
    global_speed_multiplier: number
    message_frequency: number
    detection_sensitivity: number
    communication_range: number
  }
  bounds: {
    lat_min: number
    lat_max: number
    lon_min: number
    lon_max: number
  }
  roads: RoadData
  // NEW fields from backend
  attack_logs?: AttackLog[]
  defense_logs?: DefenseLog[]
  outcome_logs?: AttackOutcome[]
  active_attacks_count?: number
  defense_config?: Record<string, DefenseConfig>
  attack_sophistication?: string
  available_attacks?: Record<string, AttackMetadata>
  available_defenses?: Record<string, DefenseMetadata>
}


// SVG Paths for Icons (Oriented Right -> 0 degrees)
const ICONS = {
  car: new Path2D("M-10,-6 L5,-6 L8,-3 L8,3 L5,6 L-10,6 L-11,3 L-11,-3 Z M-6,-4 L2,-4 L4,-2 L4,2 L2,4 L-6,4 Z"),
  truck: new Path2D("M-14,-7 L10,-7 L10,7 L-14,7 Z M11,-6 L14,-6 L14,6 L11,6 Z M-10,-5 L6,-5 L6,5 L-10,5 Z"),
  hacker: new Path2D("M-10,-6 L5,-6 L8,-3 L8,3 L5,6 L-10,6 L-11,3 L-11,-3 Z M-4,-2 L2,-2 L2,2 L-4,2 Z"),
}

// Particle System
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

function App() {
  const [connected, setConnected] = useState(false)
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showParams, setShowParams] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [presets, setPresets] = useState<Preset[]>([])
  const [activeAlerts, setActiveAlerts] = useState<Anomaly[]>([])

  // Viewport State (Pan/Zoom)
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  const wsRef = useRef<WebSocket | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])

  // Default params
  const [localParams, setLocalParams] = useState({
    global_speed_multiplier: 5.0,
    message_frequency: 1.0,
    detection_sensitivity: 0.7,
    communication_range: 0.005
  })

  useEffect(() => {
    connectWebSocket()
    loadPresets()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (simulationState?.anomalies) {
      setActiveAlerts(prev => [...simulationState.anomalies, ...prev].slice(0, 20))
    }
    if (simulationState?.params) {
      setLocalParams(simulationState.params)
    }
  }, [simulationState])

  const loadPresets = async () => {
    try {
      const res = await fetch('http://localhost:8000/presets')
      const data = await res.json()
      setPresets(data.scenarios || [])
    } catch (e) {
      console.error('Failed to load presets')
    }
  }

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8000/ws')
    ws.onopen = () => {
      console.log('Connected to WebSocket')
      setConnected(true)
    }
    ws.onclose = () => {
      console.log('Disconnected from WebSocket')
      setConnected(false)
      setTimeout(connectWebSocket, 1000)
    }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setSimulationState(data)
    }
    wsRef.current = ws
  }

  const startSimulation = async () => {
    await fetch('http://localhost:8000/control/start', { method: 'POST' })
    setIsRunning(true)
  }

  const stopSimulation = async () => {
    await fetch('http://localhost:8000/control/stop', { method: 'POST' })
    setIsRunning(false)
  }

  const resetSimulation = async () => {
    await fetch('http://localhost:8000/control/reset', { method: 'POST' })
    setIsRunning(false)
    setSimulationState(null)
    setActiveAlerts([])
    particlesRef.current = []
  }

  const triggerAttack = async (type: string, sophistication: 'low' | 'medium' | 'high' = 'medium') => {
    // Map frontend attack names to backend ATTACK_TYPES keys
    const attackTypeMap: Record<string, string> = {
      'sybil': 'sybil',
      'replay': 'message_replay',
      'bogus': 'position_falsification',
      'dos': 'dos_flooding',
      'gps_spoof': 'gps_spoofing'
    }

    const backendAttackType = attackTypeMap[type] || type

    await fetch('http://localhost:8000/control/attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: backendAttackType, sophistication })
    })
  }

  const clearAttack = async () => {
    await fetch('http://localhost:8000/control/attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: null, sophistication: 'medium' })
    })
  }

  const updateParams = async (params: Partial<SimulationState['params']>) => {
    setLocalParams(prev => ({ ...prev, ...params }))
    await fetch('http://localhost:8000/control/params', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params })
    })
  }

  const updateVehicle = async (vehicleId: string, updates: Partial<Vehicle>) => {
    await fetch('http://localhost:8000/control/vehicle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_id: vehicleId, updates })
    })
  }

  const loadPreset = async (presetId: string) => {
    await fetch(`http://localhost:8000/presets/${presetId}`, { method: 'POST' })
  }

  const project = (lat: number, lon: number, bounds: any, width: number, height: number) => {
    if (!bounds) return { x: 0, y: 0 }
    const x = ((lon - bounds.lon_min) / (bounds.lon_max - bounds.lon_min)) * width
    const y = height - ((lat - bounds.lat_min) / (bounds.lat_max - bounds.lat_min)) * height
    return { x, y }
  }

  // Canvas Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.current.x
      const dy = e.clientY - lastMousePos.current.y
      setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    const scaleFactor = 1.1
    const direction = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor
    setViewState(prev => ({ ...prev, zoom: Math.max(0.5, Math.min(5, prev.zoom * direction)) }))
  }

  // Draw map on canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    ctx.save()

    // Apply Viewport Transform
    ctx.translate(width / 2 + viewState.x, height / 2 + viewState.y)
    ctx.scale(viewState.zoom, viewState.zoom)
    ctx.translate(-width / 2, -height / 2)

    // Draw Background Buildings (Decor)
    if (simulationState) {
      ctx.fillStyle = '#1e293b'
      // Simple grid of "buildings"
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          ctx.fillRect(i * 120 + 20, j * 80 + 20, 80, 50)
        }
      }
    }

    if (simulationState?.roads) {
      // Draw Roads
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 14
      ctx.lineCap = 'round'

      simulationState.roads.edges.forEach(([startId, endId]) => {
        const startNode = simulationState.roads.nodes[startId]
        const endNode = simulationState.roads.nodes[endId]

        if (startNode && endNode) {
          const p1 = project(startNode[0], startNode[1], simulationState.bounds, width, height)
          const p2 = project(endNode[0], endNode[1], simulationState.bounds, width, height)

          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()

          // Road markings
          ctx.save()
          ctx.strokeStyle = '#475569'
          ctx.lineWidth = 1
          ctx.setLineDash([8, 8])
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
          ctx.restore()
        }
      })

      // Draw Traffic Lights
      if (simulationState.roads.lights) {
        Object.entries(simulationState.roads.lights).forEach(([nodeId, light]) => {
          const pos = simulationState.roads.nodes[nodeId]
          if (pos) {
            const p = project(pos[0], pos[1], simulationState.bounds, width, height)

            // Traffic Light Box
            ctx.fillStyle = '#000'
            ctx.fillRect(p.x - 6, p.y - 12, 12, 24)

            // Red Light
            ctx.fillStyle = light.state === 'red' ? '#ef4444' : '#450a0a'
            ctx.beginPath()
            ctx.arc(p.x, p.y - 6, 4, 0, Math.PI * 2)
            ctx.fill()
            // Glow if red
            if (light.state === 'red') {
              ctx.shadowColor = '#ef4444'
              ctx.shadowBlur = 10
              ctx.fill()
              ctx.shadowBlur = 0
            }

            // Green Light
            ctx.fillStyle = light.state === 'green' ? '#10b981' : '#064e3b'
            ctx.beginPath()
            ctx.arc(p.x, p.y + 6, 4, 0, Math.PI * 2)
            ctx.fill()
            // Glow if green
            if (light.state === 'green') {
              ctx.shadowColor = '#10b981'
              ctx.shadowBlur = 10
              ctx.fill()
              ctx.shadowBlur = 0
            }
          }
        })
      }
    }

    // Draw Particles
    particlesRef.current.forEach((p, i) => {
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.05
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1)
      } else {
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    })

    // Draw V2V
    if (simulationState?.v2v_communications) {
      simulationState.v2v_communications.forEach(comm => {
        const from = simulationState.vehicles.find(v => v.id === comm.from)
        const to = simulationState.vehicles.find(v => v.id === comm.to)
        if (from && to) {
          const p1 = project(from.lat, from.lon, simulationState.bounds, width, height)
          const p2 = project(to.lat, to.lon, simulationState.bounds, width, height)

          ctx.strokeStyle = '#10b981'
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.3
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      })
    }

    // Draw vehicles
    simulationState?.vehicles.forEach(v => {
      const pos = project(v.lat, v.lon, simulationState.bounds, width, height)

      // Add particles if moving
      if (v.status === 'moving' && Math.random() < 0.3) {
        particlesRef.current.push({
          x: pos.x,
          y: pos.y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 1.0,
          color: '#94a3b8'
        })
      }

      ctx.save()
      ctx.translate(pos.x, pos.y)
      // Rotate 90 degrees to match SVG orientation (Right is 0)
      // Heading is 0=North, 90=East. 
      // Canvas 0=Right (East). 
      // So if heading is 0 (North), we want -90 deg rotation?
      // Actually: Heading 0 (North) -> needs to point Up.
      // SVG points Right. So rotate -90 deg (-PI/2).
      // Let's try: ctx.rotate((v.heading * Math.PI / 180) - Math.PI / 2)
      ctx.rotate((v.heading * Math.PI) / 180 - Math.PI / 2)

      let color = '#3b82f6'
      if (v.is_attacker) color = '#ef4444'
      else if (v.type === 'emergency') color = '#f59e0b'
      else if (v.type === 'truck') color = '#10b981'
      else if (v.type === 'bus') color = '#8b5cf6'

      if (v.is_attacker && simulationState.active_attack) {
        const pulse = Math.sin(Date.now() / 200) * 5 + 15
        ctx.shadowBlur = pulse
        ctx.shadowColor = color
      }

      ctx.fillStyle = color
      ctx.scale(1.5, 1.5)

      if (v.type === 'truck' || v.type === 'bus') {
        ctx.fill(ICONS.truck)
      } else if (v.is_attacker) {
        ctx.fill(ICONS.hacker)
      } else {
        ctx.fill(ICONS.car)
      }

      if (v.is_attacker) {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 8px sans-serif'
        ctx.fillText('!', -1, 3)
      }

      ctx.restore()

      // Status Indicators (Non-rotated)
      if (v.status === 'stopped') {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(pos.x - 6, pos.y - 6)
        ctx.lineTo(pos.x + 6, pos.y + 6)
        ctx.moveTo(pos.x + 6, pos.y - 6)
        ctx.lineTo(pos.x - 6, pos.y + 6)
        ctx.stroke()
      }

      if (v.waiting_at_light) {
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Hacking Progress Bar
      if (v.is_attacker && v.hack_progress && v.hack_progress > 0) {
        ctx.fillStyle = '#334155'
        ctx.fillRect(pos.x - 10, pos.y - 20, 20, 4)
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(pos.x - 10, pos.y - 20, 20 * (v.hack_progress / 100), 4)
      }

      // Vehicle ID
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '9px monospace'
      ctx.fillText(v.id, pos.x - 12, pos.y - 24)

    })

    ctx.restore()
  }, [simulationState, viewState])

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-emerald-400">
              <HelpCircle className="w-8 h-8" />
              Как пользоваться симулятором?
            </h2>

            <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
              <section>
                <h3 className="text-lg font-semibold text-white mb-2">🚗 Что происходит на карте?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Вы видите симуляцию движения автомобилей по дорогам.
                  <br />
                  <span className="text-blue-400 font-bold">Синие</span> — Легковые авто.
                  <br />
                  <span className="text-green-400 font-bold">Зеленые</span> — Грузовики.
                  <br />
                  <span className="text-red-500 font-bold">Красная</span> — Хакер.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">🚦 Светофоры</h3>
                <p className="text-slate-400 leading-relaxed">
                  На перекрестках работают светофоры. Машины останавливаются на красный свет.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">⚔️ Атаки (Attacks)</h3>
                <p className="text-slate-400 leading-relaxed">
                  Хакер пытается взломать машины. Вы увидите <b>красную полоску прогресса</b> над хакером. Когда она заполнится, машина-жертва остановится.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">🎮 Управление картой</h3>
                <p className="text-slate-400 leading-relaxed">
                  - <b>Левая кнопка мыши</b>: Перемещение карты (Pan).
                  <br />
                  - <b>Колесико мыши</b>: Масштаб (Zoom).
                </p>
              </section>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Понятно! (Got it)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-96 border-r border-slate-800 bg-slate-900 flex flex-col overflow-hidden shadow-xl z-10">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-emerald-500" />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  V2X Security
                </h1>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Simulation Lab</div>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-full transition-all hover:scale-110 shadow-lg border border-slate-700"
              title="Help / Помощь"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-xs bg-slate-950/50 p-2 rounded-lg border border-slate-800">
            <div className={clsx("w-2 h-2 rounded-full animate-pulse", connected ? "bg-emerald-500" : "bg-red-500")} />
            <span className="font-mono text-slate-400">{connected ? "SYSTEM ONLINE" : "DISCONNECTED"}</span>
            {simulationState?.active_attack && (
              <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-200 rounded text-[10px] font-bold border border-red-500/30 animate-pulse">
                ⚠ ATTACK: {simulationState.active_attack.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Controls */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Simulation Control
            </h2>
            <div className="flex gap-2 mb-3">
              {!isRunning ? (
                <button
                  onClick={startSimulation}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-900/20 font-medium text-sm"
                  title="Start Simulation"
                >
                  <Play className="w-4 h-4 fill-current" /> Start
                </button>
              ) : (
                <button
                  onClick={stopSimulation}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-lg transition-all shadow-lg shadow-amber-900/20 font-medium text-sm"
                  title="Pause Simulation"
                >
                  <Pause className="w-4 h-4 fill-current" /> Pause
                </button>
              )}
              <button
                onClick={resetSimulation}
                className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
                title="Reset Simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowParams(!showParams)}
                className={clsx(
                  "p-2.5 rounded-lg transition-colors border",
                  showParams ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-700 border-slate-600 hover:bg-slate-600"
                )}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Simulation Parameters */}
          {showParams && (
            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Settings</h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-300">Speed</label>
                    <span className="text-xs font-mono text-emerald-400">{localParams.global_speed_multiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={localParams.global_speed_multiplier}
                    onChange={(e) => updateParams({ global_speed_multiplier: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-300">IDS Sensitivity</label>
                    <span className="text-xs font-mono text-emerald-400">{(localParams.detection_sensitivity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={localParams.detection_sensitivity}
                    onChange={(e) => updateParams({ detection_sensitivity: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-300">V2V Range</label>
                    <span className="text-xs font-mono text-emerald-400">{(localParams.communication_range * 1000).toFixed(0)}m</span>
                  </div>
                  <input
                    type="range"
                    min="0.001"
                    max="0.01"
                    step="0.001"
                    value={localParams.communication_range}
                    onChange={(e) => updateParams({ communication_range: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Presets */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapIcon className="w-3 h-3" /> Map Scenarios
            </h2>
            <div className="text-[10px] text-slate-500 mb-2">Pre-configured map layouts and traffic patterns.</div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset.id)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors text-left text-slate-300 hover:text-white"
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Attack Controls */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Cyber Attacks
            </h2>
            <div className="text-[10px] text-slate-500 mb-2">Trigger specific attacks on the current simulation.</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => triggerAttack('sybil')}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 p-2.5 rounded-lg text-xs transition-all hover:border-red-500/40 text-left group"
              >
                <div className="font-bold mb-0.5 group-hover:text-red-100">Sybil Attack</div>
                <div className="text-[10px] text-red-300/60">Fake identities</div>
              </button>
              <button
                onClick={() => triggerAttack('replay')}
                className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-200 p-2.5 rounded-lg text-xs transition-all hover:border-orange-500/40 text-left group"
              >
                <div className="font-bold mb-0.5 group-hover:text-orange-100">Replay Attack</div>
                <div className="text-[10px] text-orange-300/60">Old messages</div>
              </button>
              <button
                onClick={() => triggerAttack('bogus')}
                className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-200 p-2.5 rounded-lg text-xs transition-all hover:border-yellow-500/40 text-left group"
              >
                <div className="font-bold mb-0.5 group-hover:text-yellow-100">Bogus Info</div>
                <div className="text-[10px] text-yellow-300/60">Fake speed data</div>
              </button>
              <button
                onClick={clearAttack}
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 p-2.5 rounded-lg text-xs transition-all text-center flex items-center justify-center font-medium"
              >
                Stop Attack
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Live Stats
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                <div className="text-xs text-slate-400">Vehicles</div>
                <div className="text-lg font-mono">{simulationState?.vehicles.length || 0}</div>
              </div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                <div className="text-xs text-slate-400">Step</div>
                <div className="text-lg font-mono">{simulationState?.step || 0}</div>
              </div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                <div className="text-xs text-slate-400">V2V</div>
                <div className="text-lg font-mono">{simulationState?.v2v_communications?.length || 0}</div>
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          {selectedVehicle && (
            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm animate-in slide-in-from-right-2 duration-200">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Vehicle: {selectedVehicle.id}
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="capitalize">{selectedVehicle.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={clsx(
                    "font-bold",
                    selectedVehicle.status === 'moving' ? "text-emerald-400" :
                      selectedVehicle.status === 'stopped' ? "text-red-400" : "text-blue-400"
                  )}>
                    {selectedVehicle.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination:</span>
                  <span className="font-mono">{selectedVehicle.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Speed:</span>
                  <span>{selectedVehicle.speed.toFixed(1)} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trust:</span>
                  <span>{(selectedVehicle.trust_score * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Messages Sent:</span>
                  <span>{selectedVehicle.messages_sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Anomalies Detected:</span>
                  <span className="text-red-400">{selectedVehicle.anomalies_detected}</span>
                </div>

                {/* Editable speed */}
                <div className="pt-2 border-t border-slate-700 mt-2">
                  <label className="text-slate-400 block mb-1">Adjust Speed:</label>
                  <input
                    type="range"
                    min="0"
                    max={selectedVehicle.max_speed}
                    value={selectedVehicle.speed}
                    onChange={(e) => updateVehicle(selectedVehicle.id, { speed: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm flex-1 flex flex-col min-h-[200px]">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Live Alerts (IDS)
            </h2>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {activeAlerts.slice(0, 10).map((alert, idx) => (
                <div
                  key={`${alert.id}-${idx}`}
                  className={clsx(
                    "p-3 rounded-lg text-xs border animate-in slide-in-from-left-2 duration-300",
                    alert.severity === 'high' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
                  )}
                >
                  <div className="flex justify-between mb-1">
                    <span className={clsx("font-bold font-mono", alert.severity === 'high' ? "text-red-400" : "text-yellow-400")}>
                      {alert.sender}
                    </span>
                    <span className="text-slate-500">{new Date(alert.timestamp * 1000).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-300 font-medium">{alert.reason}</div>
                </div>
              ))}
              {activeAlerts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2 py-8">
                  <Shield className="w-8 h-8 opacity-20" />
                  <span className="text-xs">System Secure</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualization */}
      <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
        {/* Map Canvas */}
        <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={(e) => {
              if (!simulationState || !canvasRef.current || isDragging) return
              const rect = canvasRef.current.getBoundingClientRect()
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top

              // Transform click to world coordinates
              const worldX = (x - canvasRef.current.width / 2 - viewState.x) / viewState.zoom + canvasRef.current.width / 2
              const worldY = (y - canvasRef.current.height / 2 - viewState.y) / viewState.zoom + canvasRef.current.height / 2

              // Find clicked vehicle
              for (const v of simulationState.vehicles) {
                const pos = project(v.lat, v.lon, simulationState.bounds, canvasRef.current.width, canvasRef.current.height)
                const dist = Math.sqrt((pos.x - worldX) ** 2 + (pos.y - worldY) ** 2)
                if (dist < 20) {
                  setSelectedVehicle(v)
                  break
                }
              }
            }}
          />

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }))}
              className="p-2 bg-slate-800/90 backdrop-blur hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 shadow-xl"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom / 1.2) }))}
              className="p-2 bg-slate-800/90 backdrop-blur hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 shadow-xl"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewState({ x: 0, y: 0, zoom: 1 })}
              className="p-2 bg-slate-800/90 backdrop-blur hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 shadow-xl"
              title="Reset View"
            >
              <Move className="w-5 h-5" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur p-4 rounded-xl text-xs border border-slate-700/50 shadow-xl pointer-events-none">
            <div className="font-bold text-slate-400 mb-3 uppercase tracking-wider">Legend</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span>Passenger Car</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm" />
                <span>Truck</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm" />
                <span className="font-bold text-red-400">Attacker (Hacker)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span>Traffic Light</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-emerald-500/50" />
                <span>V2V Connection</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom vehicle list */}
        <div className="h-40 border-t border-slate-800 bg-slate-900 p-4 overflow-x-auto">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Vehicles</h3>
          <div className="flex gap-3">
            {simulationState?.vehicles.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className={clsx(
                  "flex-shrink-0 w-36 p-3 rounded-xl border cursor-pointer transition-all hover:-translate-y-1",
                  selectedVehicle?.id === v.id
                    ? "bg-slate-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800",
                  v.is_attacker && "border-red-500/50 bg-red-500/5"
                )}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="font-mono font-bold text-xs">{v.id}</div>
                  {v.is_attacker && <div className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">HACKER</div>}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Speed</span>
                    <span className="font-mono text-emerald-400">{v.speed.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Status</span>
                    <span className={clsx("font-mono", v.status === 'stopped' ? "text-red-400" : "text-blue-400")}>
                      {v.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW: Educational Log Panel (Right Side) */}
      <div className="w-[30%] border-l border-slate-800 bg-slate-900 flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
          <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Attack/Defense Log
          </h2>
          <p className="text-[10px] text-slate-500 mt-1">Educational security monitoring</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button className="flex-1 px-3 py-2 text-xs font-medium border-b-2 border-red-500 text-red-300 bg-red-500/5">
            Attacks ({simulationState?.attack_logs?.length || 0})
          </button>
          <button className="flex-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800/50">
            Defenses ({simulationState?.defense_logs?.length || 0})
          </button>
          <button className="flex-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800/50">
            Outcomes ({simulationState?.outcome_logs?.length || 0})
          </button>
        </div>

        {/* Log Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {/* Attack Logs */}
          {simulationState?.attack_logs && simulationState.attack_logs.length > 0 ? (
            simulationState.attack_logs.slice().reverse().map((attack) => (
              <div
                key={attack.id}
                className={clsx(
                  "p-3 rounded-lg border transition-all",
                  attack.status === 'blocked' && "bg-emerald-500/5 border-emerald-500/20",
                  attack.status === 'succeeded' && "bg-red-500/10 border-red-500/30",
                  attack.status === 'initiated' && "bg-yellow-500/5 border-yellow-500/20 animate-pulse"
                )}
              >
                {/* Attack Header */}
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{attack.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {simulationState.available_attacks?.[attack.attack_type]?.name || attack.attack_type}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {attack.attacker_id} → {attack.target_ids.slice(0, 2).join(', ')}
                      {attack.target_ids.length > 2 && ` +${attack.target_ids.length - 2}`}
                    </div>
                  </div>
                  <div className={clsx(
                    "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                    attack.sophistication === 'high' && "bg-red-500/20 text-red-300",
                    attack.sophistication === 'medium' && "bg-yellow-500/20 text-yellow-300",
                    attack.sophistication === 'low' && "bg-blue-500/20 text-blue-300"
                  )}>
                    {attack.sophistication}
                  </div>
                </div>

                {/* Attack Description */}
                <p className="text-[10px] text-slate-300 leading-relaxed mb-2">
                  {attack.description}
                </p>

                {/* Attack Data */}
                <div className="flex gap-2 text-[9px]">
                  <div className="bg-slate-800/50 px-2 py-1 rounded flex-1">
                    <span className="text-slate-500">Bypass:</span>{' '}
                    <span className="font-mono text-orange-400">
                      {(attack.attack_data.bypass_chance * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className={clsx(
                    "px-2 py-1 rounded font-bold",
                    attack.status === 'blocked' && "bg-emerald-500/20 text-emerald-300",
                    attack.status === 'succeeded' && "bg-red-500/20 text-red-300",
                    attack.status === 'initiated' && "bg-yellow-500/20 text-yellow-300"
                  )}>
                    {attack.status === 'blocked' && '✓ BLOCKED'}
                    {attack.status === 'succeeded' && '✗ SUCCEEDED'}
                    {attack.status === 'initiated' && '⏳ ACTIVE'}
                  </div>
                </div>

                {/* Educational Context (Expandable) */}
                <details className="mt-2">
                  <summary className="text-[9px] text-emerald-400 cursor-pointer hover:text-emerald-300 select-none">
                    📚 Learn More
                  </summary>
                  <p className="text-[9px] text-slate-400 mt-1 leading-relaxed pl-4">
                    {attack.educational_context}
                  </p>
                </details>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2 py-8">
              <AlertTriangle className="w-8 h-8 opacity-20" />
              <span className="text-xs">No attacks detected</span>
              <span className="text-[10px] text-center px-4">
                Trigger an attack from the left panel to see real-time attack detection
              </span>
            </div>
          )}

          {/* Defense Logs */}
          {simulationState?.defense_logs && simulationState.defense_logs.slice(-5).reverse().map((defense) => (
            <div
              key={defense.id}
              className={clsx(
                "p-2 rounded border text-[10px]",
                defense.success ? "bg-blue-500/5 border-blue-500/20" : "bg-slate-800/50 border-slate-700"
              )}
            >
              <div className="flex items-center gap-2">
                <span>{defense.icon}</span>
                <span className="font-mono text-blue-300 flex-1">{defense.action_taken}</span>
              </div>
            </div>
          ))}

          {/* Outcome Logs */}
          {simulationState?.outcome_logs && simulationState.outcome_logs.slice(-3).reverse().map((outcome) => (
            <div
              key={outcome.id}
              className={clsx(
                "p-3 rounded-lg border",
                outcome.result === 'blocked' && "bg-emerald-500/10 border-emerald-500/30",
                outcome.result === 'full_success' && "bg-red-500/10 border-red-500/30"
              )}
            >
              <div className="font-bold text-xs mb-1 flex items-center gap-2">
                {outcome.result === 'blocked' ? (
                  <>
                    <span className="text-emerald-400">✓ Attack Blocked</span>
                  </>
                ) : (
                  <>
                    <span className="text-red-400">✗ Attack Succeeded</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-300 mb-2">{outcome.impact_description}</p>
              <div className="bg-slate-800/50 p-2 rounded text-[9px]">
                <div className="text-emerald-400 font-bold mb-1">💡 Learning Point:</div>
                <div className="text-slate-400 leading-relaxed">{outcome.learning_points}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-red-500/10 p-2 rounded">
              <div className="text-lg font-bold text-red-400">{simulationState?.active_attacks_count || 0}</div>
              <div className="text-[9px] text-slate-500">Active</div>
            </div>
            <div className="bg-blue-500/10 p-2 rounded">
              <div className="text-lg font-bold text-blue-400">{simulationState?.defense_logs?.filter(d => d.success).length || 0}</div>
              <div className="text-[9px] text-slate-500">Blocked</div>
            </div>
            <div className="bg-emerald-500/10 p-2 rounded">
              <div className="text-lg font-bold text-emerald-400">
                {simulationState?.outcome_logs?.filter(o => o.result === 'blocked').length || 0}
              </div>
              <div className="text-[9px] text-slate-500">Success</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
