import { clsx } from 'clsx'
import { Activity, AlertTriangle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, HelpCircle, Map as MapIcon, Pause, Play, RotateCcw, Settings, Shield, X, Zap, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MapView from './MapView'
import { useTranslation, Lang } from './i18n'

// Kinetic UI Components
import { MagneticButton } from './components/MagneticButton'
import { DynamicContainer } from './components/DynamicContainer'
import { ReactiveOrchestrator, TriggerButton, ReactiveCard, GlobalRipple } from './components/ReactiveOrchestrator'
import { useIsMobile } from './utils/motionUtils'

// Types
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

// Toast notification type
interface Toast {
  id: string
  message: string
  type: 'attack' | 'defense' | 'block'
  timestamp: number
}

const DEFENSE_LEVEL_COLOR: Record<string, string> = {
  low: 'text-red-400',
  medium: 'text-yellow-400',
  high: 'text-emerald-400',
}

// Dynamic API base URLs for production deployment
const API_BASE = `${window.location.origin}/api`
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`

// Vehicle type emoji icons
const VEHICLE_TYPE_ICON: Record<string, string> = {
  passenger: '\u{1F697}',
  truck: '\u{1F69B}',
  bus: '\u{1F68C}',
  emergency: '\u{1F691}',
  hacker: '\u{1F480}',
}

// Attack name map for narrator
const ATTACK_NAME_KEY: Record<string, string> = {
  sybil: 'attacks.sybil',
  message_replay: 'attacks.replay',
  position_falsification: 'attacks.bogus',
  dos_flooding: 'DOS',
  gps_spoofing: 'GPS Spoofing',
}

function App() {
  const [connected, setConnected] = useState(false)
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showParams, setShowParams] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [currentLang, setCurrentLang] = useState<Lang>('ru')
  const [presets, setPresets] = useState<Preset[]>([])
  const [activeAlerts, setActiveAlerts] = useState<Anomaly[]>([])
  const [logTab, setLogTab] = useState<'attacks' | 'defenses' | 'outcomes'>('attacks')
  const [attackSophistication, setAttackSophistication] = useState<'low' | 'medium' | 'high'>('medium')

  // i18n hook
  const { t } = useTranslation(currentLang)

  // Floating panel states
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([])
  const seenAnomalyIdsRef = useRef<Set<string>>(new Set())

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)

  // Performance: WS throttle refs
  const latestWsDataRef = useRef<SimulationState | null>(null)
  const wsThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Motion preferences for accessibility
  const isMobile = useIsMobile()

  // Default params
  const [localParams, setLocalParams] = useState({
    global_speed_multiplier: 2.0,
    message_frequency: 1.0,
    detection_sensitivity: 0.7,
    communication_range: 0.005
  })

  // i18n helper for defense levels
  const defenseLabel = useCallback((level: string) => {
    const key = `defense.${level}` as const
    return t(key)
  }, [t])

  // i18n helper for status
  const statusLabel = useCallback((status: string) => {
    const key = `status.${status}` as const
    return t(key)
  }, [t])

  // i18n helper for sophistication
  const sophisticationLabel = useCallback((level: string) => {
    const key = `sophistication.${level}` as const
    return t(key)
  }, [t])

  // Add toast helper
  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setToasts(prev => [...prev.slice(-4), { id, message, type, timestamp: Date.now() }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    connectWebSocket()
    loadPresets()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (wsThrottleRef.current) {
        clearTimeout(wsThrottleRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (simulationState?.anomalies) {
      setActiveAlerts(prev => [...simulationState.anomalies, ...prev].slice(0, 20))

      // Generate toast notifications for new anomalies
      for (const anomaly of simulationState.anomalies) {
        if (!seenAnomalyIdsRef.current.has(anomaly.id)) {
          seenAnomalyIdsRef.current.add(anomaly.id)
          const type: Toast['type'] = anomaly.severity === 'high' ? 'attack'
            : anomaly.reason?.includes('ОТРАЖЕНА') ? 'block' : 'defense'
          addToast(anomaly.reason, type)
        }
      }
    }
    if (simulationState?.params) {
      setLocalParams(simulationState.params)
    }
  }, [simulationState, addToast])

  const loadPresets = async (lang: Lang = currentLang) => {
    try {
      const res = await fetch(`${API_BASE}/presets?lang=${lang}`)
      const data = await res.json()
      setPresets(data.scenarios || [])
    } catch (e) {
      console.error('Failed to load presets')
    }
  }

  // Reload presets when language changes
  useEffect(() => {
    loadPresets(currentLang)
  }, [currentLang])

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL)
    ws.onopen = () => {
      console.log('Connected to WebSocket')
      setConnected(true)
      reconnectAttemptRef.current = 0
    }
    ws.onclose = () => {
      console.log('Disconnected from WebSocket')
      setConnected(false)
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000)
      reconnectAttemptRef.current += 1
      console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})...`)
      setTimeout(connectWebSocket, delay)
    }
    ws.onerror = () => {
      console.error('WebSocket error')
    }
    // Performance: Throttle WS updates to ~5 FPS (200ms)
    ws.onmessage = (event) => {
      try {
        latestWsDataRef.current = JSON.parse(event.data)
        if (!wsThrottleRef.current) {
          wsThrottleRef.current = setTimeout(() => {
            if (latestWsDataRef.current) {
              setSimulationState(latestWsDataRef.current)
            }
            wsThrottleRef.current = null
          }, 200)
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
    wsRef.current = ws
  }

  const apiFetch = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options)
      if (!res.ok) console.error(`API error: ${res.status} ${res.statusText}`)
      return res
    } catch (e) {
      console.error(`Network error calling ${url}:`, e)
      return null
    }
  }

  const startSimulation = async () => {
    await apiFetch(`${API_BASE}/control/start`, { method: 'POST' })
    setIsRunning(true)
  }

  const stopSimulation = async () => {
    await apiFetch(`${API_BASE}/control/stop`, { method: 'POST' })
    setIsRunning(false)
  }

  const resetSimulation = async () => {
    await apiFetch(`${API_BASE}/control/reset`, { method: 'POST' })
    setIsRunning(false)
    setSimulationState(null)
    setActiveAlerts([])
    seenAnomalyIdsRef.current.clear()
  }

  const triggerAttack = async (type: string) => {
    const attackTypeMap: Record<string, string> = {
      'sybil': 'sybil',
      'replay': 'message_replay',
      'bogus': 'position_falsification',
      'dos': 'dos_flooding',
      'gps_spoof': 'gps_spoofing'
    }
    const backendAttackType = attackTypeMap[type] || type
    await apiFetch(`${API_BASE}/control/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: backendAttackType, sophistication: attackSophistication })
    })
    // Auto-open right drawer for educational flow
    setRightDrawerOpen(true)
  }

  const clearAttack = async () => {
    await apiFetch(`${API_BASE}/control/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: null, sophistication: 'medium' })
    })
  }

  const updateParams = async (params: Partial<SimulationState['params']>) => {
    setLocalParams(prev => ({ ...prev, ...params }))
    await apiFetch(`${API_BASE}/control/params`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params })
    })
  }

  const updateVehicle = async (vehicleId: string, updates: Partial<Vehicle>) => {
    await apiFetch(`${API_BASE}/control/vehicle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_id: vehicleId, updates })
    })
  }

  const loadPreset = async (presetId: string) => {
    await apiFetch(`${API_BASE}/presets/${presetId}`, { method: 'POST' })
  }

  // Helper to get display name for a vehicle
  const vName = (v: Vehicle) => v.name || v.id

  // ===== NARRATOR: Real-time educational message =====
  const narratorMessage = useMemo(() => {
    if (!simulationState && !isRunning) {
      return { icon: '\u{25B6}\u{FE0F}', text: t('narrator.pressStart'), color: 'text-slate-300', bg: 'bg-slate-800/50 border-slate-700' }
    }
    if (!simulationState) {
      return { icon: '\u{25B6}\u{FE0F}', text: t('narrator.pressStart'), color: 'text-slate-300', bg: 'bg-slate-800/50 border-slate-700' }
    }

    const vehicles = simulationState.vehicles
    const attacker = vehicles.find(v => v.is_attacker)
    const activeAttack = simulationState.active_attack

    // Check if any vehicle was recently hacked (stopped by hack)
    const hackedVehicle = vehicles.find(v => v.status === 'stopped' && v.hack_progress !== undefined && v.hack_progress >= 100)
    // Check for defense blocked (latest outcome)
    const latestOutcome = simulationState.outcome_logs?.length ? simulationState.outcome_logs[simulationState.outcome_logs.length - 1] : null

    if (hackedVehicle) {
      return {
        icon: '\u{1F6A8}',
        text: t('narrator.hackSucceeded', { target: vName(hackedVehicle) }),
        color: 'text-red-300',
        bg: 'bg-red-500/10 border-red-500/30'
      }
    }

    if (latestOutcome && latestOutcome.result === 'blocked') {
      const targetName = simulationState.attack_logs?.find(a => a.id === latestOutcome.attack_id)?.target_ids[0] || '?'
      const targetVehicle = vehicles.find(v => v.id === targetName)
      return {
        icon: '\u{1F6E1}\u{FE0F}',
        text: t('narrator.defenseBlocked', { target: targetVehicle ? vName(targetVehicle) : targetName }),
        color: 'text-emerald-300',
        bg: 'bg-emerald-500/10 border-emerald-500/30'
      }
    }

    if (activeAttack && attacker?.target_vehicle) {
      const target = vehicles.find(v => v.id === attacker.target_vehicle)
      if (target && attacker.hack_progress !== undefined && attacker.hack_progress > 0) {
        return {
          icon: '\u{26A1}',
          text: t('narrator.hackingInProgress', {
            target: vName(target),
            defense: target.defense_level ? defenseLabel(target.defense_level) : '?',
            progress: Math.round(attacker.hack_progress)
          }),
          color: 'text-yellow-300',
          bg: 'bg-yellow-500/10 border-yellow-500/30'
        }
      }
    }

    if (activeAttack && attacker) {
      const attackNameKey = ATTACK_NAME_KEY[activeAttack]
      const attackName = attackNameKey?.startsWith('attacks.') ? t(attackNameKey) : (simulationState.available_attacks?.[activeAttack]?.name || activeAttack)
      return {
        icon: '\u{1F50D}',
        text: t('narrator.searchingTarget', { attack: attackName }),
        color: 'text-orange-300',
        bg: 'bg-orange-500/10 border-orange-500/30'
      }
    }

    if (isRunning) {
      return {
        icon: '\u{2705}',
        text: t('narrator.allSafe', { count: vehicles.length }),
        color: 'text-emerald-300',
        bg: 'bg-emerald-500/5 border-emerald-500/20'
      }
    }

    return { icon: '\u{25B6}\u{FE0F}', text: t('narrator.pressStart'), color: 'text-slate-300', bg: 'bg-slate-800/50 border-slate-700' }
  }, [simulationState, isRunning, t, defenseLabel])

  return (
    <ReactiveOrchestrator>
      <GlobalRipple />
      <div className="relative h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">

      {/* ============ FULL-SCREEN MAP (base layer) ============ */}
      <div className="absolute inset-0 z-0">
        <MapView
          simulationState={simulationState}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={setSelectedVehicle}
          lang={currentLang}
        />
      </div>

      {/* ============ CONTEXT HINT BAR (top center) ============ */}
      <div className="absolute top-0 left-0 right-0 z-[1001] px-4 py-2.5 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 text-center pointer-events-none">
        {!isRunning && !simulationState?.active_attack && (
          <span className="text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: t('hint.pressStart') }} />
        )}
        {isRunning && !simulationState?.active_attack && (
          <span className="text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: t('hint.selectAttack') }} />
        )}
        {simulationState?.active_attack && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-red-300 font-bold">
              {simulationState.active_attack === 'sybil' && `\u{1F3AD} ${t('hint.sybilActive')}`}
              {simulationState.active_attack === 'message_replay' && `\u{1F501} ${t('hint.replayActive')}`}
              {simulationState.active_attack === 'position_falsification' && `\u{1F4E1} ${t('hint.bogusActive')}`}
              {!['sybil', 'message_replay', 'position_falsification'].includes(simulationState.active_attack) &&
                t('hint.attackGeneric', { name: (simulationState.available_attacks?.[simulationState.active_attack]?.name || simulationState.active_attack).toUpperCase() })}
            </span>
            <span className="text-xs text-slate-400 border-l border-slate-700 pl-3">{t('hint.attackLogLink')}</span>
          </div>
        )}
      </div>

      {/* ============ TOGGLE BUTTONS (always visible) ============ */}
      <div className="absolute top-14 left-4 z-[1002] flex flex-col gap-2">
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className={clsx(
            "p-2 rounded-lg border shadow-lg backdrop-blur-sm transition-colors",
            leftPanelOpen ? "bg-emerald-600/80 border-emerald-500 text-white" : "bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800"
          )}
          title={t('controls.panelTitle')}
        >
          {leftPanelOpen ? <ChevronLeft className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
          className={clsx(
            "p-2 rounded-lg border shadow-lg backdrop-blur-sm transition-colors",
            bottomSheetOpen ? "bg-cyan-600/80 border-cyan-500 text-white" : "bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800"
          )}
          title={t('controls.vehicleList')}
        >
          {bottomSheetOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      <div className="absolute top-14 right-4 z-[1002] flex flex-col gap-2">
        <button
          onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
          className={clsx(
            "p-2 rounded-lg border shadow-lg backdrop-blur-sm transition-colors",
            rightDrawerOpen ? "bg-emerald-600/80 border-emerald-500 text-white" : "bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800"
          )}
          title={t('controls.logTitle')}
        >
          {rightDrawerOpen ? <ChevronRight className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setShowHelp(true)}
          className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-emerald-400 rounded-lg shadow-lg backdrop-blur-sm transition-colors"
          title={t('controls.help')}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* ============ LEGEND (top right, below toggle buttons) ============ */}
      <div className="absolute top-[120px] right-4 z-[1001] bg-slate-900/90 backdrop-blur-md p-3 rounded-xl text-xs border border-slate-700/50 shadow-xl pointer-events-none">
        <div className="font-bold text-slate-400 mb-2 uppercase tracking-wider text-[10px]">{t('legend.title')}</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /><span>{t('legend.passenger')}</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-green-500 rounded-full" /><span>{t('legend.truck')}</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full" /><span>{t('legend.bus')}</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-purple-500 rounded-full" /><span>{t('legend.emergency')}</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-full" /><span className="font-bold text-red-400">{t('legend.hacker')}</span></div>
          <div className="border-t border-slate-700 my-1.5" />
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-[10px]">{t('legend.defenseLow')}</span>
            <span className="text-yellow-400 text-[10px]">{t('legend.defenseMid')}</span>
            <span className="text-emerald-400 text-[10px]">{t('legend.defenseHigh')}</span>
            <span className="text-slate-500 text-[10px]">{t('legend.defenseLabel')}</span>
          </div>
          <div className="border-t border-slate-700 my-1.5" />
          {/* Educational legend entries */}
          <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-slate-400 rounded" /><span className="text-slate-400">{t('legend.roadNetwork')}</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-cyan-400/60 border-dashed" /><span className="text-slate-400">{t('legend.commRange')}</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-red-500 rounded" /><span className="text-slate-400">{t('legend.attackBeam')}</span></div>
        </div>
      </div>

      {/* ============ FLOATING LEFT PANEL ============ */}
      <AnimatePresence>
        {leftPanelOpen && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute left-0 top-10 bottom-0 w-96 z-[1001] bg-slate-900/90 backdrop-blur-md border-r border-slate-700/50 flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-7 h-7 text-emerald-500" />
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      {t('app.title')}
                    </h1>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{t('app.subtitle')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Language Toggle */}
                  <div className="flex rounded-lg overflow-hidden border border-slate-700">
                    {(['ru', 'en', 'tk'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setCurrentLang(lang)}
                        className={clsx(
                          "px-2 py-1 text-[10px] font-bold transition-colors",
                          currentLang === lang
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-500 hover:text-slate-300"
                        )}
                        title={lang === 'ru' ? 'Русский' : lang === 'en' ? 'English' : 'Türkmen dili'}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setLeftPanelOpen(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 text-xs bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                <div className={clsx("w-2 h-2 rounded-full", connected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]")} />
                <span className="font-mono text-slate-400">{connected ? t('app.systemOnline') : t('app.noConnection')}</span>
                {simulationState?.active_attack && (
                  <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-200 rounded text-[10px] font-bold border-l-2 border-red-500">
                    {t('app.attack')}
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {/* Controls */}
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> {t('controls.title')}
                </h2>
                <div className="flex gap-2 mb-2">
                  {!isRunning ? (
                    <MagneticButton
                      onClick={startSimulation}
                      strength={isMobile ? 0 : 0.3}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg transition-all shadow-lg shadow-emerald-900/20 font-medium text-sm"
                    >
                      <Play className="w-4 h-4 fill-current" /> {t('controls.start')}
                    </MagneticButton>
                  ) : (
                    <MagneticButton
                      onClick={stopSimulation}
                      strength={isMobile ? 0 : 0.3}
                      className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg transition-all shadow-lg shadow-amber-900/20 font-medium text-sm"
                    >
                      <Pause className="w-4 h-4 fill-current" /> {t('controls.pause')}
                    </MagneticButton>
                  )}
                  <MagneticButton
                    onClick={resetSimulation}
                    strength={isMobile ? 0 : 0.2}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600 text-xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </MagneticButton>
                  <MagneticButton
                    onClick={() => setShowParams(!showParams)}
                    strength={isMobile ? 0 : 0.2}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors border text-xs",
                      showParams ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-700 border-slate-600 hover:bg-slate-600"
                    )}
                  >
                    <Settings className="w-4 h-4" />
                  </MagneticButton>
                </div>
              </div>

              {/* Simulation Parameters */}
              <DynamicContainer
                title={t('settings.title')}
                icon={<Settings className="w-3 h-3 text-emerald-400" />}
                defaultExpanded={showParams}
                onExpand={setShowParams}
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-slate-300">{t('settings.speed')}</label>
                      <span className="text-xs font-mono text-emerald-400">{localParams.global_speed_multiplier.toFixed(1)}x</span>
                    </div>
                    <input type="range" min="0.1" max="10" step="0.1"
                      value={localParams.global_speed_multiplier}
                      onChange={(e) => updateParams({ global_speed_multiplier: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-slate-300" title={t('settings.idsSensitivityTooltip')}>{t('settings.idsSensitivity')}</label>
                      <span className="text-xs font-mono text-emerald-400">{(localParams.detection_sensitivity * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.1"
                      value={localParams.detection_sensitivity}
                      onChange={(e) => updateParams({ detection_sensitivity: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-slate-300" title={t('settings.v2vRangeTooltip')}>{t('settings.v2vRange')}</label>
                      <span className="text-xs font-mono text-emerald-400">{(localParams.communication_range * 1000).toFixed(0)}m</span>
                    </div>
                    <input type="range" min="0.001" max="0.01" step="0.001"
                      value={localParams.communication_range}
                      onChange={(e) => updateParams({ communication_range: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </DynamicContainer>

              {/* Presets */}
              <DynamicContainer
                title={t('presets.title')}
                icon={<MapIcon className="w-3 h-3 text-blue-400" />}
                defaultExpanded={false}
              >
                <div className="text-[11px] text-slate-400 mb-2">{t('presets.description')}</div>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map(preset => (
                    <MagneticButton
                      key={preset.id}
                      onClick={() => loadPreset(preset.id)}
                      strength={isMobile ? 0 : 0.2}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors text-left text-slate-300 hover:text-white"
                    >
                      {preset.name}
                    </MagneticButton>
                  ))}
                </div>
              </DynamicContainer>

              {/* Attack Controls */}
              <DynamicContainer
                title={t('attacks.title')}
                icon={<Zap className="w-3 h-3 text-red-400" />}
                defaultExpanded={true}
              >
                <div className="text-[11px] text-slate-400 mb-2">{t('attacks.description')}</div>

                {/* Sophistication Selector */}
                <div className="mb-3">
                  <div className="text-[11px] text-slate-400 mb-1.5 font-medium">{t('attacks.sophisticationLabel')}</div>
                  <div className="flex gap-1">
                    {(['low', 'medium', 'high'] as const).map(level => (
                      <MagneticButton
                        key={level}
                        onClick={() => setAttackSophistication(level)}
                        strength={isMobile ? 0 : 0.15}
                        className={clsx(
                          "flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all border",
                          attackSophistication === level
                            ? level === 'low' ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                            : level === 'medium' ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                            : "bg-red-500/20 border-red-500/50 text-red-300"
                            : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {sophisticationLabel(level)}
                      </MagneticButton>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <TriggerButton
                    triggerType="attack"
                    onClick={() => triggerAttack('sybil')}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 p-2.5 rounded-lg text-xs transition-all hover:border-red-500/40 text-left group"
                  >
                    <div className="font-bold mb-0.5 group-hover:text-red-100">{'\u{1F3AD}'} {t('attacks.sybil')}</div>
                    <div className="text-[11px] text-red-300/60">{t('attacks.sybilDesc')}</div>
                  </TriggerButton>
                  <TriggerButton
                    triggerType="attack"
                    onClick={() => triggerAttack('replay')}
                    className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-200 p-2.5 rounded-lg text-xs transition-all hover:border-orange-500/40 text-left group"
                  >
                    <div className="font-bold mb-0.5 group-hover:text-orange-100">{'\u{1F501}'} {t('attacks.replay')}</div>
                    <div className="text-[11px] text-orange-300/60">{t('attacks.replayDesc')}</div>
                  </TriggerButton>
                  <TriggerButton
                    triggerType="attack"
                    onClick={() => triggerAttack('bogus')}
                    className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-200 p-2.5 rounded-lg text-xs transition-all hover:border-yellow-500/40 text-left group"
                  >
                    <div className="font-bold mb-0.5 group-hover:text-yellow-100">{'\u{1F4E1}'} {t('attacks.bogus')}</div>
                    <div className="text-[11px] text-yellow-300/60">{t('attacks.bogusDesc')}</div>
                  </TriggerButton>
                  <MagneticButton
                    onClick={clearAttack}
                    strength={isMobile ? 0 : 0.2}
                    className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 p-2.5 rounded-lg text-xs transition-all text-center flex items-center justify-center font-medium"
                  >
                    {t('attacks.stop')}
                  </MagneticButton>
                </div>
              </DynamicContainer>

              {/* Stats */}
              <DynamicContainer
                title={t('stats.title')}
                icon={<Activity className="w-3 h-3 text-cyan-400" />}
                defaultExpanded={true}
              >
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <div className="text-xs text-slate-400">{t('stats.vehicles')}</div>
                    <div className="text-lg font-mono">{simulationState?.vehicles.length || 0}</div>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <div className="text-xs text-slate-400">{t('stats.step')}</div>
                    <div className="text-lg font-mono">{simulationState?.step || 0}</div>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <div className="text-xs text-slate-400">{t('stats.v2v')}</div>
                    <div className="text-lg font-mono">{simulationState?.v2v_communications?.length || 0}</div>
                  </div>
                </div>
              </DynamicContainer>

              {/* Vehicle Details */}
              <AnimatePresence>
                {selectedVehicle && (
                  <motion.div
                    key={selectedVehicle.id}
                    initial={{ opacity: 0, x: 30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -30, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm"
                  >
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="text-base">{VEHICLE_TYPE_ICON[selectedVehicle.type] || '\u{1F697}'}</span>
                      {vName(selectedVehicle)}
                      <span className="font-mono text-[10px] text-slate-500 ml-auto">{selectedVehicle.id}</span>
                    </h2>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('vehicle.type')}</span>
                        <span className="capitalize">{selectedVehicle.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('vehicle.status')}</span>
                        <span className={clsx(
                          "font-bold",
                          selectedVehicle.status === 'moving' ? "text-emerald-400" :
                            selectedVehicle.status === 'stopped' ? "text-red-400" : "text-blue-400"
                        )}>
                          {statusLabel(selectedVehicle.status).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('vehicle.speed')}</span>
                        <span>{selectedVehicle.speed.toFixed(1)} {t('vehicle.kmh')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('vehicle.trust')}</span>
                        <span>{(selectedVehicle.trust_score * 100).toFixed(0)}%</span>
                      </div>
                      {selectedVehicle.defense_level && !selectedVehicle.is_attacker && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">{t('vehicle.defense')}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={clsx("h-full rounded-full", selectedVehicle.defense_level === 'high' ? 'bg-emerald-500' : selectedVehicle.defense_level === 'low' ? 'bg-red-500' : 'bg-yellow-500')}
                                style={{ width: selectedVehicle.defense_level === 'high' ? '100%' : selectedVehicle.defense_level === 'medium' ? '66%' : '33%' }}
                              />
                            </div>
                            <span className={DEFENSE_LEVEL_COLOR[selectedVehicle.defense_level]}>{defenseLabel(selectedVehicle.defense_level)}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('vehicle.anomalies')}</span>
                        <span className="text-red-400">{selectedVehicle.anomalies_detected}</span>
                      </div>

                      {/* Editable speed */}
                      <div className="pt-2 border-t border-slate-700 mt-2">
                        <label className="text-slate-400 block mb-1">{t('vehicle.speedAdjust')}</label>
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Alerts */}
              <DynamicContainer
                title={t('alerts.title')}
                icon={<AlertTriangle className="w-3 h-3 text-yellow-400" />}
                defaultExpanded={true}
                className="flex-1 flex flex-col min-h-[150px]"
              >
                <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar max-h-[250px]">
                  {activeAlerts.slice(0, 10).map((alert, idx) => (
                    <div
                      key={`${alert.id}-${idx}`}
                      className={clsx(
                        "p-2.5 rounded-lg text-xs border",
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
                    <div className="flex flex-col items-center justify-center text-slate-600 gap-2 py-6">
                      <Shield className="w-8 h-8 opacity-20" />
                      <span className="text-xs">{t('alerts.systemSafe')}</span>
                    </div>
                  )}
                </div>
              </DynamicContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ FLOATING RIGHT DRAWER ============ */}
      <AnimatePresence>
        {rightDrawerOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute right-0 top-10 bottom-0 w-[380px] z-[1001] bg-slate-900/90 backdrop-blur-md border-l border-slate-700/50 flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-3 border-b border-slate-800/50">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {t('log.title')}
                </h2>
                <button onClick={() => setRightDrawerOpen(false)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{t('log.monitoring')}</p>
            </div>

            {/* ===== NARRATOR CARD ===== */}
            <div className={clsx("mx-3 mt-3 p-3 rounded-lg border text-sm flex items-start gap-2.5", narratorMessage.bg)}>
              <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
              <span className={clsx("leading-relaxed text-xs", narratorMessage.color)}>{narratorMessage.text}</span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 relative mt-2">
              {(['attacks', 'defenses', 'outcomes'] as const).map((tab) => {
                const labels = { attacks: t('log.attacks'), defenses: t('log.defenses'), outcomes: t('log.outcomes') }
                const counts = {
                  attacks: simulationState?.attack_logs?.length || 0,
                  defenses: simulationState?.defense_logs?.length || 0,
                  outcomes: simulationState?.outcome_logs?.length || 0,
                }
                const activeText = { attacks: 'text-red-300', defenses: 'text-blue-300', outcomes: 'text-emerald-300' }
                const activeBg = { attacks: 'bg-red-500', defenses: 'bg-blue-500', outcomes: 'bg-emerald-500' }
                return (
                  <button
                    key={tab}
                    onClick={() => setLogTab(tab)}
                    className={clsx(
                      "relative flex-1 px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-800/50",
                      logTab === tab ? activeText[tab] : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {labels[tab]} ({counts[tab]})
                    {logTab === tab && (
                      <div className={clsx("absolute bottom-0 left-0 right-0 h-0.5 transition-all", activeBg[tab])} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Log Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              <AnimatePresence mode="wait">

              {/* ===== ATTACKS TAB ===== */}
              {logTab === 'attacks' && (
                <motion.div key="attacks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="space-y-2">
                  {simulationState?.attack_logs && simulationState.attack_logs.length > 0 ? (
                    simulationState.attack_logs.slice().reverse().map((attack, index) => (
                      <ReactiveCard
                        key={attack.id}
                        reactTo="attack"
                        delay={index * 30}
                        className={clsx(
                          "p-3 rounded-lg border transition-all",
                          attack.status === 'blocked' && "bg-emerald-500/5 border-emerald-500/20",
                          attack.status === 'succeeded' && "bg-red-500/10 border-red-500/30",
                          attack.status === 'initiated' && "bg-yellow-500/5 border-l-2 border-yellow-400"
                        )}
                      >
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
                            {sophisticationLabel(attack.sophistication)}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed mb-2">{attack.description}</p>
                        <div className="flex gap-2 text-[9px]">
                          <div className="bg-slate-800/50 px-2 py-1 rounded flex-1">
                            <span className="text-slate-500">{t('log.bypass')}</span>{' '}
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
                            {attack.status === 'blocked' && t('log.blocked')}
                            {attack.status === 'succeeded' && t('log.succeeded')}
                            {attack.status === 'initiated' && t('log.active')}
                          </div>
                        </div>
                        <details className="mt-2">
                          <summary className="text-[9px] text-emerald-400 cursor-pointer hover:text-emerald-300 select-none">
                            {t('log.moreDetails')}
                          </summary>
                          <p className="text-[9px] text-slate-400 mt-1 leading-relaxed pl-4">
                            {attack.educational_context}
                          </p>
                        </details>
                      </ReactiveCard>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 gap-2 py-8">
                      <AlertTriangle className="w-8 h-8 opacity-20" />
                      <span className="text-xs">{t('log.noAttacks')}</span>
                      <span className="text-[11px] text-center px-4">
                        {t('log.launchAttack')}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ===== DEFENSES TAB ===== */}
              {logTab === 'defenses' && (
                <motion.div key="defenses" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="space-y-2">
                  {simulationState?.defense_logs && simulationState.defense_logs.length > 0 ? (
                    simulationState.defense_logs.slice().reverse().map((defense) => (
                      <div
                        key={defense.id}
                        className={clsx(
                          "p-3 rounded-lg border text-xs",
                          defense.success ? "bg-blue-500/5 border-blue-500/20" : "bg-red-500/5 border-red-500/20"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{defense.icon}</span>
                          <div className="flex-1">
                            <div className="font-bold text-white text-[11px]">
                              {simulationState.available_defenses?.[defense.defense_type]?.name || defense.defense_type}
                            </div>
                            <div className="text-[10px] text-slate-400">vs {defense.attacker_id}</div>
                          </div>
                          <div className={clsx(
                            "px-2 py-0.5 rounded text-[9px] font-bold",
                            defense.success ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                          )}>
                            {defense.success ? t('log.success') : t('log.failure')}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-300 mb-2">{defense.action_taken}</div>
                        <div className="flex gap-2 text-[9px]">
                          <div className="bg-slate-800/50 px-2 py-1 rounded">
                            <span className="text-slate-500">{t('log.confidence')}</span>{' '}
                            <span className="font-mono text-blue-400">{(defense.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="bg-slate-800/50 px-2 py-1 rounded">
                            <span className="text-slate-500">{t('log.time')}</span>{' '}
                            <span className="font-mono text-cyan-400">{defense.detection_time}s</span>
                          </div>
                        </div>
                        <details className="mt-2">
                          <summary className="text-[9px] text-blue-400 cursor-pointer hover:text-blue-300 select-none">
                            {t('log.howItWorks')}
                          </summary>
                          <p className="text-[9px] text-slate-400 mt-1 leading-relaxed pl-4">
                            {defense.explanation}
                          </p>
                        </details>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 gap-2 py-8">
                      <Shield className="w-8 h-8 opacity-20" />
                      <span className="text-xs">{t('log.noDefenses')}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ===== OUTCOMES TAB ===== */}
              {logTab === 'outcomes' && (
                <motion.div key="outcomes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="space-y-2">
                  {simulationState?.outcome_logs && simulationState.outcome_logs.length > 0 ? (
                    simulationState.outcome_logs.slice().reverse().map((outcome) => (
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
                            <span className="text-emerald-400">{t('log.attackBlocked')}</span>
                          ) : (
                            <span className="text-red-400">{t('log.attackPassed')}</span>
                          )}
                          <span className="ml-auto text-[9px] text-slate-500 font-normal">
                            {outcome.defenses_triggered} {t('log.defensesCount')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 mb-2">{outcome.impact_description}</p>
                        <div className="bg-slate-800/50 p-2 rounded text-[9px]">
                          <div className="text-emerald-400 font-bold mb-1">{t('log.conclusion')}</div>
                          <div className="text-slate-400 leading-relaxed">{outcome.learning_points}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 gap-2 py-8">
                      <Activity className="w-8 h-8 opacity-20" />
                      <span className="text-xs">{t('log.noOutcomes')}</span>
                    </div>
                  )}
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* Stats Footer */}
            <div className="p-3 border-t border-slate-800/50">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-red-500/10 p-1.5 rounded">
                  <div className="text-base font-bold text-red-400">{simulationState?.active_attacks_count || 0}</div>
                  <div className="text-[9px] text-slate-500">{t('logStats.active')}</div>
                </div>
                <div className="bg-blue-500/10 p-1.5 rounded">
                  <div className="text-base font-bold text-blue-400">{simulationState?.defense_logs?.filter(d => d.success).length || 0}</div>
                  <div className="text-[9px] text-slate-500">{t('logStats.blocked')}</div>
                </div>
                <div className="bg-emerald-500/10 p-1.5 rounded">
                  <div className="text-base font-bold text-emerald-400">
                    {simulationState?.outcome_logs?.filter(o => o.result === 'blocked').length || 0}
                  </div>
                  <div className="text-[9px] text-slate-500">{t('logStats.successful')}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ BOTTOM VEHICLE SHEET (Performance: plain divs, no motion) ============ */}
      <AnimatePresence>
        {bottomSheetOpen && (
          <motion.div
            initial={{ y: 260, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 260, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={clsx(
              "absolute bottom-0 left-0 right-0 h-56 z-[1001] bg-slate-900/90 backdrop-blur-md border-t border-slate-700/50 shadow-2xl",
              leftPanelOpen && "left-96",
              rightDrawerOpen && "right-[380px]"
            )}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('vehicle.activeVehicles')}</h3>
              <button onClick={() => setBottomSheetOpen(false)} className="p-1 hover:bg-slate-800 rounded transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="px-4 pb-3 h-[calc(100%-2.5rem)] overflow-auto custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {simulationState?.vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicle(selectedVehicle?.id === v.id ? null : v)}
                    className={clsx(
                      "p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                      "bg-slate-800/60 border-slate-700/50 hover:border-slate-600",
                      selectedVehicle?.id === v.id && "ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
                      v.is_attacker && "border-red-500/40"
                    )}
                  >
                    {/* Row 1: icon + name */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{VEHICLE_TYPE_ICON[v.type] || '\u{1F697}'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate text-white">{v.name || v.id}</div>
                        <div className="text-[9px] font-mono text-slate-500">{v.id}</div>
                      </div>
                      {v.is_attacker && (
                        <div className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                          !!!
                        </div>
                      )}
                    </div>
                    {/* Row 2: status + speed */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx(
                        "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold",
                        v.status === 'moving' ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                      )}>
                        {statusLabel(v.status)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 ml-auto">{v.speed.toFixed(0)} {t('vehicle.kmh')}</span>
                    </div>
                    {/* Row 3: defense bar */}
                    {v.defense_level && !v.is_attacker && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={clsx("h-full rounded-full", v.defense_level === 'high' ? 'bg-emerald-500' : v.defense_level === 'low' ? 'bg-red-500' : 'bg-yellow-500')}
                            style={{ width: v.defense_level === 'high' ? '100%' : v.defense_level === 'medium' ? '66%' : '33%' }}
                          />
                        </div>
                        <span className={clsx("text-[9px] font-bold", DEFENSE_LEVEL_COLOR[v.defense_level])}>
                          {defenseLabel(v.defense_level)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ TOAST NOTIFICATIONS (bottom right of map) ============ */}
      <div className="absolute bottom-4 right-4 z-[1001] flex flex-col gap-2 pointer-events-none max-w-xs">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={clsx(
                "px-3 py-2 rounded-lg border text-xs font-medium shadow-lg backdrop-blur-sm pointer-events-auto",
                toast.type === 'attack' && "bg-red-900/80 border-red-500/50 text-red-200",
                toast.type === 'defense' && "bg-blue-900/80 border-blue-500/50 text-blue-200",
                toast.type === 'block' && "bg-emerald-900/80 border-emerald-500/50 text-emerald-200"
              )}
            >
              <span className="mr-1.5">
                {toast.type === 'attack' ? '\u{26A0}' : toast.type === 'block' ? '\u{1F6E1}' : '\u{1F50D}'}
              </span>
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ============ WELCOME SCREEN ============ */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-8 shadow-2xl"
            >
            {/* Language selector on welcome */}
            <div className="flex justify-end mb-4">
              <div className="flex rounded-lg overflow-hidden border border-slate-700">
                {(['ru', 'en', 'tk'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setCurrentLang(lang)}
                    className={clsx(
                      "px-3 py-1.5 text-xs font-bold transition-colors",
                      currentLang === lang
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-10 h-10 text-emerald-500" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  {t('welcome.title')}
                </h1>
                <p className="text-sm text-slate-400">{t('welcome.subtitle')}</p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 mb-6 border border-slate-700/50">
              <h3 className="text-sm font-bold text-emerald-400 mb-2">{t('welcome.whatIsV2x')}</h3>
              <p className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('welcome.v2xExplanation') }} />
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-bold text-emerald-400 mb-3">{t('welcome.howToUse')}</h3>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-400 font-bold text-sm">1</div>
                  <div>
                    <div className="text-sm font-medium text-white">{t('welcome.step1Title')}</div>
                    <div className="text-xs text-slate-400">{t('welcome.step1Desc')}</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-center text-red-400 font-bold text-sm">2</div>
                  <div>
                    <div className="text-sm font-medium text-white">{t('welcome.step2Title')}</div>
                    <div className="text-xs text-slate-400">{t('welcome.step2Desc')}</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 font-bold text-sm">3</div>
                  <div>
                    <div className="text-sm font-medium text-white">{t('welcome.step3Title')}</div>
                    <div className="text-xs text-slate-400">{t('welcome.step3Desc')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-3 mb-6 border border-slate-700/30">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm" /> {t('welcome.legendPassenger')}</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-sm" /> {t('welcome.legendTruck')}</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-sm" /> {t('welcome.legendHacker')}</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-yellow-500 rounded-full" /> {t('welcome.legendLight')}</div>
              </div>
            </div>

            <MagneticButton
              onClick={() => setShowWelcome(false)}
              strength={isMobile ? 0 : 0.3}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/30"
            >
              {t('welcome.startButton')}
            </MagneticButton>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* ============ HELP MODAL ============ */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-emerald-400">
              <HelpCircle className="w-8 h-8" />
              {t('help.title')}
            </h2>

            <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
              <section>
                <h3 className="text-base font-semibold text-white mb-2">{t('help.whatOnMap')}</h3>
                <p className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('help.mapExplanation') }} />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-blue-500 rounded-sm" /> <span className="text-slate-300">{t('help.legendPassenger')}</span></div>
                  <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-green-500 rounded-sm" /> <span className="text-slate-300">{t('help.legendTruck')}</span></div>
                  <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-red-500 rounded-sm" /> <span className="text-red-400 font-bold">{t('help.legendHacker')}</span></div>
                  <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-yellow-500 rounded-full" /> <span className="text-slate-300">{t('help.legendLight')}</span></div>
                </div>
              </section>

              <div className="border-t border-slate-800" />

              <section>
                <h3 className="text-base font-semibold text-white mb-3">{t('help.attackTypes')}</h3>
                <div className="space-y-3">
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    <div className="font-bold text-red-300 text-sm mb-1">{t('help.sybilTitle')}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {t('help.sybilDesc')}
                      <br />
                      <span className="text-slate-400 italic">{t('help.sybilAnalogy')}</span>
                    </p>
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
                    <div className="font-bold text-orange-300 text-sm mb-1">{t('help.replayTitle')}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {t('help.replayDesc')}
                      <br />
                      <span className="text-slate-400 italic">{t('help.replayAnalogy')}</span>
                    </p>
                  </div>
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                    <div className="font-bold text-yellow-300 text-sm mb-1">{t('help.bogusTitle')}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {t('help.bogusDesc')}
                      <br />
                      <span className="text-slate-400 italic">{t('help.bogusAnalogy')}</span>
                    </p>
                  </div>
                </div>
              </section>

              <div className="border-t border-slate-800" />

              <section>
                <h3 className="text-base font-semibold text-white mb-2">{t('help.idsTitle')}</h3>
                <p className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('help.idsExplanation') }} />
              </section>

              <div className="border-t border-slate-800" />

              <section>
                <h3 className="text-base font-semibold text-white mb-2">{t('help.controlsTitle')}</h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>{t('help.controlsLeft')}</div>
                  <div>{t('help.controlsRight')}</div>
                  <div>{t('help.controlsBottom')}</div>
                  <div>{t('help.controlsMap')}</div>
                </div>
              </section>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <MagneticButton
                onClick={() => setShowHelp(false)}
                strength={isMobile ? 0 : 0.3}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {t('help.gotIt')}
              </MagneticButton>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

    </div>
    </ReactiveOrchestrator>
  )
}

export default App
