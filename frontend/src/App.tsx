import { clsx } from 'clsx'
import { Activity, AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, Pause, Play, RotateCcw, Settings, Shield, X, Zap, BookOpen } from 'lucide-react'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import MapView from './MapView'
import { useTranslation, Lang } from './i18n'
import { DynamicContainer } from './components/DynamicContainer'

// ===== Types =====
interface Vehicle {
  id: string; name?: string; type: string; lat: number; lon: number; speed: number
  heading: number; trust_score: number; is_attacker: boolean; max_speed: number
  color: string; messages_sent: number; messages_received: number; anomalies_detected: number
  status: string; destination: string; path?: string[]; hack_progress?: number
  target_vehicle?: string | null; waiting_at_light?: boolean; defense_level?: string
}

interface AttackLog {
  id: string; timestamp: number; attack_type: string; attacker_id: string; target_ids: string[]
  sophistication: string; status: string; description: string; severity: string; icon: string
  attack_data: { bypass_chance: number; sophistication_desc: string }; educational_context: string
}

interface DefenseLog {
  id: string; timestamp: number; defense_type: string; attack_id: string; attacker_id: string
  action_taken: string; success: boolean; detection_time: number; confidence: number
  explanation: string; icon: string
}

interface AttackOutcome {
  id: string; timestamp: number; attack_id: string; defense_ids: string[]
  result: string; impact_description: string; learning_points: string
  attack_succeeded: boolean; defenses_triggered: number
}

interface SimulationState {
  step: number
  vehicles: Vehicle[]
  messages: unknown[]
  v2v_communications: { from: string; to: string; type: string; distance: number }[]
  anomalies: { id: string; timestamp: number; sender: string; type: string; reason: string; severity: string }[]
  active_attack: string | null
  params: { global_speed_multiplier: number; message_frequency: number; detection_sensitivity: number; communication_range: number }
  bounds: { lat_min: number; lat_max: number; lon_min: number; lon_max: number }
  roads: { nodes: Record<string, [number, number]>; edges: [string, string][]; lights?: Record<string, { state: string; timer: number }> }
  attack_logs?: AttackLog[]
  defense_logs?: DefenseLog[]
  outcome_logs?: AttackOutcome[]
  active_attacks_count?: number
  attack_sophistication?: string
  available_attacks?: Record<string, { name: string; icon: string; severity: string; description: string }>
  available_defenses?: Record<string, { name: string; icon: string; type: string; description: string }>
}

const API_BASE = `${window.location.origin}/api`
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`

const VEHICLE_ICON: Record<string, string> = {
  passenger: '🚗', truck: '🚛', bus: '🚌', emergency: '🚑', hacker: '💀',
}

const ATTACK_I18N: Record<string, string> = {
  sybil: 'sybil', message_replay: 'replay', position_falsification: 'bogus',
}

function App() {
  const [connected, setConnected] = useState(false)
  const [sim, setSim] = useState<SimulationState | null>(null)
  const [running, setRunning] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [lang, setLang] = useState<Lang>('ru')
  const [logTab, setLogTab] = useState<'attacks' | 'defenses' | 'outcomes'>('attacks')
  const [sophistication, setSophistication] = useState<'low' | 'medium' | 'high'>('medium')
  const [expandedAttack, setExpandedAttack] = useState<string | null>(null)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const { t } = useTranslation(lang)

  // WS refs
  const wsRef = useRef<WebSocket | null>(null)
  const reconnRef = useRef(0)
  const latestRef = useRef<SimulationState | null>(null)
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const paramsInitRef = useRef(false)

  // Cached metadata from first WS message
  const metadataRef = useRef<{ available_attacks?: SimulationState['available_attacks']; available_defenses?: SimulationState['available_defenses'] }>({})

  const [params, setParams] = useState({
    global_speed_multiplier: 1.0,
    message_frequency: 1.0,
    detection_sensitivity: 0.7,
    communication_range: 0.005,
  })

  const defLabel = useCallback((l: string) => t(`defense.${l}`), [t])
  const sophLabel = useCallback((l: string) => t(`sophistication.${l}`), [t])
  const vName = (v: Vehicle) => v.name || v.id

  // === WebSocket ===
  useEffect(() => {
    connect()
    return () => { wsRef.current?.close(); throttleRef.current && clearTimeout(throttleRef.current) }
  }, [])

  function connect() {
    const ws = new WebSocket(WS_URL)
    ws.onopen = () => { setConnected(true); reconnRef.current = 0 }
    ws.onclose = () => {
      setConnected(false)
      setTimeout(connect, Math.min(1000 * 2 ** reconnRef.current, 30000))
      reconnRef.current++
    }
    ws.onerror = () => {}
    ws.onmessage = (e) => {
      try {
        const data: SimulationState = JSON.parse(e.data)
        // Cache metadata from first message
        if (data.available_attacks) metadataRef.current.available_attacks = data.available_attacks
        if (data.available_defenses) metadataRef.current.available_defenses = data.available_defenses
        latestRef.current = data
        if (!throttleRef.current) {
          throttleRef.current = setTimeout(() => {
            if (latestRef.current) setSim(latestRef.current)
            throttleRef.current = null
          }, 250) // 4 updates/sec — matches CSS transition duration
        }
      } catch {}
    }
    wsRef.current = ws
  }

  // Sync params from first WS message only
  useEffect(() => {
    if (sim?.params && !paramsInitRef.current) {
      setParams(sim.params)
      paramsInitRef.current = true
    }
  }, [sim])

  // === API ===
  const api = async (url: string, opts?: RequestInit) => {
    try { await fetch(url, opts) } catch {}
  }
  const start = () => { api(`${API_BASE}/control/start`, { method: 'POST' }); setRunning(true) }
  const stop = () => { api(`${API_BASE}/control/stop`, { method: 'POST' }); setRunning(false) }
  const reset = () => { api(`${API_BASE}/control/reset`, { method: 'POST' }); setRunning(false); setSim(null); paramsInitRef.current = false }

  const attack = async (type: string) => {
    const map: Record<string, string> = { sybil: 'sybil', replay: 'message_replay', bogus: 'position_falsification' }
    await api(`${API_BASE}/control/attack`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: map[type] || type, sophistication })
    })
    setRightOpen(true)
  }
  const stopAttack = () => {
    api(`${API_BASE}/control/attack`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: null, sophistication: 'medium' })
    })
  }
  const updateParam = (key: string, val: number) => {
    setParams(p => ({ ...p, [key]: val }))
    api(`${API_BASE}/control/params`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: { [key]: val } })
    })
  }

  // === Lesson state ===
  const lesson = useMemo(() => {
    if (!sim) return null
    const attacker = sim.vehicles.find(v => v.is_attacker)
    const activeAtk = sim.active_attack
    const key = activeAtk ? ATTACK_I18N[activeAtk] : null
    if (!key) return null

    const hacked = sim.vehicles.find(v => v.status === 'stopped' && !v.is_attacker && (v.hack_progress || 0) >= 100)
    const lastOutcome = sim.outcome_logs?.length ? sim.outcome_logs[sim.outcome_logs.length - 1] : null

    if (hacked) return { type: 'compromised' as const, key, vehicle: hacked, attacker }

    if (lastOutcome?.result === 'blocked') {
      const tid = sim.attack_logs?.find(a => a.id === lastOutcome.attack_id)?.target_ids[0]
      return {
        type: 'blocked' as const, key,
        vehicle: sim.vehicles.find(v => v.id === tid) || null, attacker,
        blocked: sim.outcome_logs?.filter(o => o.result === 'blocked').length || 0,
        passed: sim.outcome_logs?.filter(o => o.result !== 'blocked').length || 0,
      }
    }

    if (attacker?.target_vehicle && (attacker.hack_progress || 0) > 0) {
      return {
        type: 'attacking' as const, key,
        vehicle: sim.vehicles.find(v => v.id === attacker.target_vehicle) || null,
        attacker, progress: attacker.hack_progress || 0,
      }
    }

    return { type: 'searching' as const, key, attacker }
  }, [sim])

  // === Narrator ===
  const narrator = useMemo(() => {
    if (!sim) return { text: t('narrator.pressStart'), color: 'text-slate-400' }
    const attacker = sim.vehicles.find(v => v.is_attacker)
    const hacked = sim.vehicles.find(v => v.status === 'stopped' && !v.is_attacker && (v.hack_progress || 0) >= 100)
    const lastOut = sim.outcome_logs?.length ? sim.outcome_logs[sim.outcome_logs.length - 1] : null

    if (hacked) return { text: t('narrator.hackSucceeded', { target: vName(hacked) }), color: 'text-red-400' }
    if (lastOut?.result === 'blocked') return { text: t('narrator.defenseBlocked', { target: '...' }), color: 'text-emerald-400' }
    if (attacker?.target_vehicle && (attacker.hack_progress || 0) > 0) {
      const tgt = sim.vehicles.find(v => v.id === attacker.target_vehicle)
      if (tgt) return { text: t('narrator.hackingInProgress', { target: vName(tgt), defense: tgt.defense_level ? defLabel(tgt.defense_level) : '?', progress: Math.round(attacker.hack_progress || 0) }), color: 'text-yellow-400' }
    }
    if (sim.active_attack) return { text: t('narrator.searchingTarget', { attack: sim.active_attack }), color: 'text-orange-400' }
    if (running) return { text: t('narrator.allSafe', { count: sim.vehicles.length }), color: 'text-emerald-400' }
    return { text: t('narrator.pressStart'), color: 'text-slate-400' }
  }, [sim, running, t, defLabel])

  return (
    <div className="relative h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">

      {/* MAP */}
      <div className="absolute inset-0 z-0">
        <MapView simulationState={sim} selectedVehicle={selectedVehicle} onSelectVehicle={setSelectedVehicle} lang={lang} />
      </div>

      {/* TOP BAR — narrator + status */}
      <div className="absolute top-0 left-0 right-0 z-[1001] h-10 bg-slate-900/95 border-b border-slate-800 flex items-center px-4 gap-3">
        <div className={clsx("w-2 h-2 rounded-full flex-shrink-0", connected ? "bg-emerald-500" : "bg-red-500")} />
        <span className={clsx("text-xs flex-1 truncate", narrator.color)}>{narrator.text}</span>
        <div className="flex gap-1">
          {(['ru', 'en', 'tk'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={clsx("px-2 py-0.5 text-[10px] font-bold rounded transition-colors",
                lang === l ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-500 hover:text-slate-300"
              )}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* LEFT TOGGLE */}
      <button onClick={() => setLeftOpen(!leftOpen)}
        className={clsx("absolute top-12 left-3 z-[1002] p-2 rounded-lg border shadow-lg transition-colors",
          leftOpen ? "bg-emerald-600/80 border-emerald-500 text-white" : "bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800")}>
        {leftOpen ? <ChevronLeft className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
      </button>

      {/* RIGHT TOGGLE */}
      <button onClick={() => setRightOpen(!rightOpen)}
        className={clsx("absolute top-12 right-3 z-[1002] p-2 rounded-lg border shadow-lg transition-colors",
          rightOpen ? "bg-emerald-600/80 border-emerald-500 text-white" : "bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800")}>
        {rightOpen ? <ChevronRight className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
      </button>

      {/* HELP BUTTON */}
      <button onClick={() => setShowHelp(true)}
        className="absolute top-12 right-14 z-[1002] p-2 bg-slate-900/90 border border-slate-700 text-slate-400 hover:text-emerald-400 rounded-lg shadow-lg transition-colors">
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* ===== LEFT PANEL ===== */}
      <div className={clsx(
        "absolute left-0 top-10 bottom-0 w-80 z-[1001] bg-slate-900/95 border-r border-slate-700/50 flex flex-col overflow-hidden shadow-2xl transition-transform duration-200",
        leftOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="p-3 border-b border-slate-800/50 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-emerald-400 truncate">{t('app.title')}</h1>
            <div className="text-[9px] text-slate-500 uppercase tracking-widest">{t('app.subtitle')}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
          {/* Controls */}
          <div className="flex gap-2">
            {!running ? (
              <button onClick={start} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                <Play className="w-4 h-4 fill-current" /> {t('controls.start')}
              </button>
            ) : (
              <button onClick={stop} className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                <Pause className="w-4 h-4 fill-current" /> {t('controls.pause')}
              </button>
            )}
            <button onClick={reset} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className={clsx("px-3 py-2 rounded-lg border transition-colors",
                showSettings ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-700 border-slate-600 hover:bg-slate-600")}>
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Settings */}
          {showSettings && (
            <div className="bg-slate-800/40 rounded-lg border border-slate-700/50 p-3 space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{t('settings.speed')}</span>
                  <span className="font-mono text-emerald-400">{params.global_speed_multiplier.toFixed(1)}x</span>
                </div>
                <input type="range" min="0.1" max="5" step="0.1" value={params.global_speed_multiplier}
                  onChange={e => updateParam('global_speed_multiplier', +e.target.value)}
                  className="w-full accent-emerald-500 h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{t('settings.idsSensitivity')}</span>
                  <span className="font-mono text-emerald-400">{(params.detection_sensitivity * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0.1" max="1" step="0.1" value={params.detection_sensitivity}
                  onChange={e => updateParam('detection_sensitivity', +e.target.value)}
                  className="w-full accent-emerald-500 h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{t('settings.v2vRange')}</span>
                  <span className="font-mono text-emerald-400">{(params.communication_range * 1000).toFixed(0)}m</span>
                </div>
                <input type="range" min="0.001" max="0.01" step="0.001" value={params.communication_range}
                  onChange={e => updateParam('communication_range', +e.target.value)}
                  className="w-full accent-emerald-500 h-1.5" />
              </div>
            </div>
          )}

          {/* Attacks */}
          <DynamicContainer title={t('attacks.title')} icon={<Zap className="w-3 h-3 text-red-400" />} defaultExpanded={true}>
            {/* Sophistication */}
            <div className="mb-2.5">
              <div className="text-[10px] text-slate-400 mb-1">{t('attacks.sophisticationLabel')}</div>
              <div className="flex gap-1">
                {(['low', 'medium', 'high'] as const).map(l => (
                  <button key={l} onClick={() => setSophistication(l)}
                    className={clsx("flex-1 py-1 rounded text-[10px] font-bold uppercase border transition-all",
                      sophistication === l
                        ? l === 'low' ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : l === 'medium' ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                        : "bg-red-500/20 border-red-500/50 text-red-300"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300"
                    )}>{sophLabel(l)}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <AttackCard name={t('attacks.sybil')} desc={t('attacks.sybilDesc')} icon="🎭" color="red"
                expanded={expandedAttack === 'sybil'} onExpand={() => setExpandedAttack(expandedAttack === 'sybil' ? null : 'sybil')}
                onLaunch={() => attack('sybil')} t={t} learnContent={t('attackInfo.sybil.whatIsIt')} learnDetail={t('attackInfo.sybil.howItWorks')} />

              <AttackCard name={t('attacks.replay')} desc={t('attacks.replayDesc')} icon="🔁" color="orange"
                expanded={expandedAttack === 'replay'} onExpand={() => setExpandedAttack(expandedAttack === 'replay' ? null : 'replay')}
                onLaunch={() => attack('replay')} t={t} learnContent={t('attackInfo.replay.whatIsIt')} learnDetail={t('attackInfo.replay.howItWorks')} />

              <AttackCard name={t('attacks.bogus')} desc={t('attacks.bogusDesc')} icon="📡" color="yellow"
                expanded={expandedAttack === 'bogus'} onExpand={() => setExpandedAttack(expandedAttack === 'bogus' ? null : 'bogus')}
                onLaunch={() => attack('bogus')} t={t} learnContent={t('attackInfo.bogus.whatIsIt')} learnDetail={t('attackInfo.bogus.howItWorks')} />

              <button onClick={stopAttack}
                className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 p-2 rounded-lg text-xs transition-colors">
                {t('attacks.stop')}
              </button>
            </div>
          </DynamicContainer>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('stats.vehicles'), val: sim?.vehicles.length || 0 },
              { label: t('stats.step'), val: sim?.step || 0 },
              { label: t('stats.v2v'), val: sim?.v2v_communications?.length || 0 },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/50 p-2 rounded border border-slate-700 text-center">
                <div className="text-[10px] text-slate-500">{s.label}</div>
                <div className="text-sm font-mono">{s.val}</div>
              </div>
            ))}
          </div>

          {/* Selected vehicle */}
          {selectedVehicle && (
            <div className="bg-slate-800/40 rounded-lg border border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{VEHICLE_ICON[selectedVehicle.type] || '\u{1F697}'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{vName(selectedVehicle)}</div>
                  <div className="text-[9px] font-mono text-slate-500">{selectedVehicle.id}</div>
                </div>
              </div>
              <div className="space-y-1 text-[11px]">
                <Row label={t('vehicle.status')} value={<span className={selectedVehicle.status === 'moving' ? "text-emerald-400" : "text-red-400"}>{t(`status.${selectedVehicle.status}`)}</span>} />
                <Row label={t('vehicle.speed')} value={`${selectedVehicle.speed.toFixed(0)} ${t('vehicle.kmh')}`} />
                <Row label={t('vehicle.trust')} value={`${(selectedVehicle.trust_score * 100).toFixed(0)}%`} />
                {selectedVehicle.defense_level && !selectedVehicle.is_attacker && (
                  <Row label={t('vehicle.defense')} value={<span className={selectedVehicle.defense_level === 'high' ? 'text-emerald-400' : selectedVehicle.defense_level === 'low' ? 'text-red-400' : 'text-yellow-400'}>{defLabel(selectedVehicle.defense_level)}</span>} />
                )}
                <Row label={t('vehicle.anomalies')} value={<span className="text-red-400">{selectedVehicle.anomalies_detected}</span>} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className={clsx(
        "absolute right-0 top-10 bottom-0 w-[360px] z-[1001] bg-slate-900/95 border-l border-slate-700/50 flex flex-col overflow-hidden shadow-2xl transition-transform duration-200",
        rightOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="p-3 border-b border-slate-800/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <Shield className="w-4 h-4" /> {t('log.title')}
          </h2>
          <button onClick={() => setRightOpen(false)} className="p-1 hover:bg-slate-800 rounded transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Lesson Panel */}
        {lesson && (
          <div className="mx-2.5 mt-2.5 rounded-lg border overflow-hidden text-[11px]">
            {lesson.type === 'attacking' && (
              <div className="bg-yellow-500/5 border-yellow-500/20 p-3 space-y-2">
                <div className="font-bold text-yellow-300 text-xs">{t(`attacks.${lesson.key}`)}</div>
                <div><span className="font-bold text-slate-300">{t('lesson.whatIsIt')}</span><p className="text-slate-400 mt-0.5">{t(`attackInfo.${lesson.key}.whatIsIt`)}</p></div>
                <div><span className="font-bold text-slate-300">{t('lesson.howItWorks')}</span><p className="text-slate-400 mt-0.5">{t(`attackInfo.${lesson.key}.howItWorks`)}</p></div>
                {'progress' in lesson && (
                  <div>
                    <span className="font-bold text-slate-300">{t('lesson.currentProgress')}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${Math.min(lesson.progress, 100)}%` }} />
                      </div>
                      <span className="text-red-400 font-mono text-[10px]">{Math.round(lesson.progress)}%</span>
                    </div>
                    {lesson.vehicle && <div className="text-[9px] text-slate-500 mt-0.5">{vName(lesson.vehicle)} ({defLabel(lesson.vehicle.defense_level || 'medium')})</div>}
                  </div>
                )}
                <div><span className="font-bold text-slate-300">{t('lesson.ifSucceeds')}</span><p className="text-slate-400 mt-0.5">{t(`attackInfo.${lesson.key}.consequences`)}</p></div>
                <details>
                  <summary className="text-[9px] text-yellow-400 cursor-pointer font-bold">{t('lesson.technicalDetails')}</summary>
                  <p className="text-[9px] text-slate-400 mt-1 pl-2">{t(`attackInfo.${lesson.key}.technicalDetail`)}</p>
                </details>
              </div>
            )}

            {lesson.type === 'searching' && (
              <div className="bg-orange-500/5 border-orange-500/20 p-3 space-y-2">
                <div className="font-bold text-orange-300 text-xs">{t(`attacks.${lesson.key}`)}</div>
                <p className="text-slate-400">{t(`attackInfo.${lesson.key}.whatIsIt`)}</p>
                <p className="text-slate-400">{t(`attackInfo.${lesson.key}.realWorldUsage`)}</p>
              </div>
            )}

            {lesson.type === 'blocked' && (
              <div className="bg-emerald-500/5 border-emerald-500/20 p-3 space-y-2">
                <div className="font-bold text-emerald-300 text-xs flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> {t('lesson.attackBlocked')}</div>
                <div><span className="font-bold text-slate-300">{t('lesson.whoBlocked')}</span><p className="text-slate-400 mt-0.5">{t('defenseInfo.ids.howItDetects')}</p></div>
                <div><span className="font-bold text-slate-300">{t('lesson.realWorldParallel')}</span><p className="text-slate-400 mt-0.5">{t('defenseInfo.ids.realDeployment')}</p></div>
                {'blocked' in lesson && (
                  <div className="text-[10px] text-slate-500">{t('lesson.blocked')}: {lesson.blocked} | {t('lesson.passed')}: {lesson.passed}</div>
                )}
              </div>
            )}

            {lesson.type === 'compromised' && (
              <div className="bg-red-500/10 border-red-500/20 p-3 space-y-2">
                <div className="font-bold text-red-300 text-xs flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {t('lesson.vehicleCompromised')}</div>
                <div><span className="font-bold text-slate-300">{t('lesson.whatHappened')}</span><p className="text-slate-400 mt-0.5">{lesson.vehicle ? vName(lesson.vehicle) : '?'} — {t(`attackInfo.${lesson.key}.consequences`)}</p></div>
                <div><span className="font-bold text-slate-300">{t('lesson.whyFailed')}</span>
                  <p className="text-slate-400 mt-0.5">{lesson.vehicle?.defense_level && t('lesson.defenseExplain', {
                    level: defLabel(lesson.vehicle.defense_level),
                    mult: lesson.vehicle.defense_level === 'low' ? '0.5' : lesson.vehicle.defense_level === 'medium' ? '1.0' : '3.0',
                    chance: lesson.vehicle.defense_level === 'low' ? '0' : lesson.vehicle.defense_level === 'medium' ? '15' : '40',
                  })}</p>
                </div>
                <div><span className="font-bold text-emerald-400">{t('lesson.lessonLearned')}</span><p className="text-slate-400 mt-0.5">{t('lesson.nhtsa')}</p></div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800 mt-2">
          {(['attacks', 'defenses', 'outcomes'] as const).map(tab => {
            const labels = { attacks: t('log.attacks'), defenses: t('log.defenses'), outcomes: t('log.outcomes') }
            const counts = {
              attacks: sim?.attack_logs?.length || 0,
              defenses: sim?.defense_logs?.length || 0,
              outcomes: sim?.outcome_logs?.length || 0,
            }
            return (
              <button key={tab} onClick={() => setLogTab(tab)}
                className={clsx("flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors relative",
                  logTab === tab ? "text-emerald-300" : "text-slate-500 hover:text-slate-300")}>
                {labels[tab]} ({counts[tab]})
                {logTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </button>
            )
          })}
        </div>

        {/* Log content — clickable entries with educational detail */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {logTab === 'attacks' && (sim?.attack_logs?.length ? (
            sim.attack_logs.slice().reverse().map(a => {
              const attackerV = sim.vehicles.find(v => v.id === a.attacker_id)
              const targetVs = a.target_ids.map(tid => sim.vehicles.find(v => v.id === tid)).filter(Boolean) as Vehicle[]
              const atkKey = ATTACK_I18N[a.attack_type]
              return (
                <details key={a.id} className={clsx("rounded-lg border text-[11px] group",
                  a.status === 'blocked' ? "bg-emerald-500/5 border-emerald-500/20" : a.status === 'succeeded' ? "bg-red-500/10 border-red-500/30" : "bg-yellow-500/5 border-yellow-400/30")}>
                  <summary className="p-2.5 cursor-pointer select-none list-none">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span>{a.icon}</span>
                      <span className="font-bold text-white flex-1 truncate">{metadataRef.current.available_attacks?.[a.attack_type]?.name || a.attack_type}</span>
                      <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded",
                        a.status === 'blocked' ? "bg-emerald-500/20 text-emerald-300" : a.status === 'succeeded' ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300")}>
                        {a.status === 'blocked' ? t('log.blocked') : a.status === 'succeeded' ? t('log.succeeded') : t('log.active')}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-slate-500">
                      {attackerV && <span>💀 {vName(attackerV)}</span>}
                      {targetVs.length > 0 && <span>🎯 {targetVs.map(v => vName(v)).join(', ')}</span>}
                    </div>
                  </summary>
                  <div className="px-2.5 pb-2.5 space-y-2 border-t border-slate-700/50 pt-2">
                    <p className="text-slate-400 leading-relaxed">{a.description}</p>
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-slate-500">{t('log.bypass')}: <span className="text-yellow-400">{Math.round(a.attack_data.bypass_chance * 100)}%</span></span>
                      <span className="text-slate-500">{a.attack_data.sophistication_desc}</span>
                    </div>
                    {atkKey && (
                      <div className="bg-slate-800/60 rounded p-2 space-y-1.5">
                        <div className="text-[10px] font-bold text-cyan-400">{t('lesson.whatIsIt')}</div>
                        <p className="text-[10px] text-slate-400">{t(`attackInfo.${atkKey}.whatIsIt`)}</p>
                        <div className="text-[10px] font-bold text-cyan-400">{t('lesson.howItWorks')}</div>
                        <p className="text-[10px] text-slate-400">{t(`attackInfo.${atkKey}.howItWorks`)}</p>
                        <div className="text-[10px] font-bold text-orange-400">{t('lesson.realWorldParallel')}</div>
                        <p className="text-[10px] text-slate-400">{t(`attackInfo.${atkKey}.realWorldUsage`)}</p>
                      </div>
                    )}
                    {a.educational_context && <p className="text-[9px] text-slate-500 italic">{a.educational_context}</p>}
                  </div>
                </details>
              )
            })
          ) : <Empty icon={<AlertTriangle className="w-6 h-6 opacity-20" />} text={t('log.noAttacks')} sub={t('log.launchAttack')} />)}

          {logTab === 'defenses' && (sim?.defense_logs?.length ? (
            sim.defense_logs.slice().reverse().map(d => {
              const attackerV = sim.vehicles.find(v => v.id === d.attacker_id)
              const defKey = d.defense_type
              const defMeta = metadataRef.current.available_defenses?.[defKey]
              // Find matching i18n key for defense info
              const defI18n = defKey === 'ids' ? 'ids' : defKey === 'pki' ? 'pki' : defKey === 'misbehavior_detection' ? 'misbehavior' : defKey === 'trust_scoring' ? 'trust'
                : defKey === 'rate_limiting' ? 'ids' : defKey === 'cooperative_verification' ? 'trust' : defKey === 'signature_verification' ? 'pki' : 'ids'
              return (
                <details key={d.id} className={clsx("rounded-lg border text-[11px] group",
                  d.success ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                  <summary className="p-2.5 cursor-pointer select-none list-none">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span>{d.icon}</span>
                      <span className="font-bold text-white flex-1 truncate">{defMeta?.name || d.defense_type}</span>
                      <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded",
                        d.success ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>
                        {d.success ? t('log.success') : t('log.failure')}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-slate-500">
                      {attackerV && <span>💀 {t('log.attacker')}: {vName(attackerV)}</span>}
                      <span>{t('log.confidence')}: {Math.round(d.confidence * 100)}%</span>
                      <span>{t('log.time')}: {d.detection_time}ms</span>
                    </div>
                  </summary>
                  <div className="px-2.5 pb-2.5 space-y-2 border-t border-slate-700/50 pt-2">
                    <p className="text-slate-400">{d.action_taken}</p>
                    <p className="text-slate-400">{d.explanation}</p>
                    <div className="bg-slate-800/60 rounded p-2 space-y-1.5">
                      <div className="text-[10px] font-bold text-cyan-400">{t('lesson.whatIsIt')}</div>
                      <p className="text-[10px] text-slate-400">{t(`defenseInfo.${defI18n}.whatIsIt`)}</p>
                      <div className="text-[10px] font-bold text-cyan-400">{t('lesson.howItWorks')}</div>
                      <p className="text-[10px] text-slate-400">{t(`defenseInfo.${defI18n}.howItDetects`)}</p>
                      <div className="text-[10px] font-bold text-emerald-400">{t('lesson.realWorldParallel')}</div>
                      <p className="text-[10px] text-slate-400">{t(`defenseInfo.${defI18n}.realDeployment`)}</p>
                    </div>
                  </div>
                </details>
              )
            })
          ) : <Empty icon={<Shield className="w-6 h-6 opacity-20" />} text={t('log.noDefenses')} />)}

          {logTab === 'outcomes' && (sim?.outcome_logs?.length ? (
            sim.outcome_logs.slice().reverse().map(o => (
              <details key={o.id} className={clsx("rounded-lg border text-[11px] group",
                o.result === 'blocked' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
                <summary className="p-2.5 cursor-pointer select-none list-none">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base">{o.result === 'blocked' ? '🛡️' : '💥'}</span>
                    <span className={clsx("font-bold flex-1", o.result === 'blocked' ? "text-emerald-400" : "text-red-400")}>
                      {o.result === 'blocked' ? t('log.attackBlocked') : t('log.attackPassed')}
                    </span>
                    <span className="text-[9px] text-slate-500">{o.defenses_triggered} {t('log.defensesCount')}</span>
                  </div>
                  <p className="text-slate-400 text-[10px]">{o.impact_description}</p>
                </summary>
                <div className="px-2.5 pb-2.5 space-y-2 border-t border-slate-700/50 pt-2">
                  <div className="bg-slate-800/60 rounded p-2">
                    <div className="text-[10px] font-bold text-emerald-400 mb-1">{t('log.conclusion')}</div>
                    <p className="text-[10px] text-slate-400">{o.learning_points}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-slate-800/40 rounded p-1.5 text-center">
                      <div className="text-emerald-400 font-bold">{o.defenses_triggered}</div>
                      <div className="text-slate-500">{t('logStats.blocked')}</div>
                    </div>
                    <div className="bg-slate-800/40 rounded p-1.5 text-center">
                      <div className={o.attack_succeeded ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                        {o.attack_succeeded ? t('log.succeeded') : t('log.blocked')}
                      </div>
                      <div className="text-slate-500">{t('log.result')}</div>
                    </div>
                  </div>
                </div>
              </details>
            ))
          ) : <Empty icon={<Activity className="w-6 h-6 opacity-20" />} text={t('log.noOutcomes')} />)}
        </div>

        {/* Stats footer */}
        <div className="p-2.5 border-t border-slate-800/50 grid grid-cols-3 gap-2 text-center">
          <div className="bg-red-500/10 p-1.5 rounded">
            <div className="text-sm font-bold text-red-400">{sim?.active_attacks_count || 0}</div>
            <div className="text-[9px] text-slate-500">{t('logStats.active')}</div>
          </div>
          <div className="bg-blue-500/10 p-1.5 rounded">
            <div className="text-sm font-bold text-blue-400">{sim?.defense_logs?.filter(d => d.success).length || 0}</div>
            <div className="text-[9px] text-slate-500">{t('logStats.blocked')}</div>
          </div>
          <div className="bg-emerald-500/10 p-1.5 rounded">
            <div className="text-sm font-bold text-emerald-400">{sim?.outcome_logs?.filter(o => o.result === 'blocked').length || 0}</div>
            <div className="text-[9px] text-slate-500">{t('logStats.successful')}</div>
          </div>
        </div>
      </div>

      {/* LEGEND (small, top-right, below buttons) */}
      <div className={clsx("absolute top-24 z-[1000] bg-slate-900/90 p-2 rounded-lg text-[9px] border border-slate-700/50 pointer-events-none space-y-1",
        rightOpen ? "right-[375px]" : "right-3")}>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-blue-500 rounded-full" /><span className="text-slate-400">{t('legend.passenger')}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-slate-400">{t('legend.truck')}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full" /><span className="text-red-400 font-bold">{t('legend.hacker')}</span></div>
      </div>

      {/* ===== WELCOME ===== */}
      {showWelcome && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/95 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-emerald-500" />
              <div>
                <h1 className="text-xl font-bold text-emerald-400">{t('welcome.title')}</h1>
                <p className="text-xs text-slate-400">{t('welcome.subtitle')}</p>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700/50">
              <h3 className="text-sm font-bold text-emerald-400 mb-1">{t('welcome.whatIsV2x')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('welcome.v2xExplanation') }} />
            </div>
            <div className="mb-4 space-y-2">
              <h3 className="text-sm font-bold text-emerald-400">{t('welcome.howToUse')}</h3>
              {[t('welcome.step1Title'), t('welcome.step2Title'), t('welcome.step3Title')].map((title, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-6 h-6 bg-emerald-500/20 border border-emerald-500/30 rounded flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">{i + 1}</div>
                  <span className="text-xs text-slate-300">{title}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowWelcome(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-bold text-sm transition-colors">
              {t('welcome.startButton')}
            </button>
          </div>
        </div>
      )}

      {/* ===== HELP ===== */}
      {showHelp && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowHelp(false)} className="absolute top-3 right-3 p-1.5 hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <h2 className="text-lg font-bold mb-4 text-emerald-400 flex items-center gap-2"><HelpCircle className="w-5 h-5" /> {t('help.title')}</h2>
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold text-white mb-1">{t('help.whatOnMap')}</h3>
                <p className="text-slate-300 text-xs" dangerouslySetInnerHTML={{ __html: t('help.mapExplanation') }} />
              </section>
              <section>
                <h3 className="font-semibold text-white mb-2">{t('help.attackTypes')}</h3>
                <div className="space-y-2">
                  <div className="bg-red-500/5 border border-red-500/20 rounded p-2">
                    <div className="font-bold text-red-300 text-xs">{t('help.sybilTitle')}</div>
                    <p className="text-[11px] text-slate-300">{t('help.sybilDesc')}</p>
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded p-2">
                    <div className="font-bold text-orange-300 text-xs">{t('help.replayTitle')}</div>
                    <p className="text-[11px] text-slate-300">{t('help.replayDesc')}</p>
                  </div>
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded p-2">
                    <div className="font-bold text-yellow-300 text-xs">{t('help.bogusTitle')}</div>
                    <p className="text-[11px] text-slate-300">{t('help.bogusDesc')}</p>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="font-semibold text-white mb-1">{t('help.idsTitle')}</h3>
                <p className="text-xs text-slate-300" dangerouslySetInnerHTML={{ __html: t('help.idsExplanation') }} />
              </section>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button onClick={() => setShowHelp(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-1.5 rounded-lg font-medium text-sm transition-colors">{t('help.gotIt')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Small components =====
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span>{value}</span></div>
}

function Empty({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-slate-600 gap-1.5 py-6">
      {icon}<span className="text-xs">{text}</span>{sub && <span className="text-[10px] text-center px-4">{sub}</span>}
    </div>
  )
}

function AttackCard({ name, desc, icon, color, expanded, onExpand, onLaunch, t, learnContent, learnDetail }: {
  name: string; desc: string; icon: string; color: string; expanded: boolean
  onExpand: () => void; onLaunch: () => void; t: (k: string) => string
  learnContent: string; learnDetail: string
}) {
  const bg = color === 'red' ? 'bg-red-500/10 border-red-500/20' : color === 'orange' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
  const btnBg = color === 'red' ? 'bg-red-600/30 hover:bg-red-600/50 border-red-500/30 text-red-200' : color === 'orange' ? 'bg-orange-600/30 hover:bg-orange-600/50 border-orange-500/30 text-orange-200' : 'bg-yellow-600/30 hover:bg-yellow-600/50 border-yellow-500/30 text-yellow-200'
  const borderExp = color === 'red' ? 'border-red-500/10' : color === 'orange' ? 'border-orange-500/10' : 'border-yellow-500/10'
  return (
    <div className={`${bg} border rounded-lg overflow-hidden`}>
      <div className="p-2 text-xs">
        <div className="font-bold text-slate-200 mb-0.5">{icon} {name}</div>
        <div className="text-[10px] text-slate-400 mb-1.5">{desc}</div>
        <div className="flex items-center gap-2">
          <button onClick={onLaunch}
            className={`px-2.5 py-1 ${btnBg} border rounded text-[10px] font-bold transition-colors`}>
            {t('attacks.launch')}
          </button>
          <button onClick={onExpand}
            className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {t('attacks.learnMore')}
          </button>
        </div>
      </div>
      {expanded && (
        <div className={`px-2 pb-2 text-[10px] text-slate-400 space-y-1 border-t ${borderExp} pt-1.5`}>
          <p>{learnContent}</p>
          <p className="text-slate-500">{learnDetail}</p>
        </div>
      )}
    </div>
  )
}

export default App
