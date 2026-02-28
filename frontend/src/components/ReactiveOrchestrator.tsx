import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, createContext, useContext, ReactNode } from 'react'

/**
 * REACTIVE ORCHESTRATOR
 * Allows one button click to trigger animations across multiple UI elements
 */

interface OrchestratorContextType {
  triggerWave: () => void
  triggerPulse: () => void
  triggerAttackAnimation: () => void
}

const OrchestratorContext = createContext<OrchestratorContextType | null>(null)

export function ReactiveOrchestrator({ children }: { children: ReactNode }) {
  const triggerWave = () => {
    // Broadcast custom event that other components can listen to
    window.dispatchEvent(new CustomEvent('ui:wave'))
  }

  const triggerPulse = () => {
    window.dispatchEvent(new CustomEvent('ui:pulse'))
  }

  const triggerAttackAnimation = () => {
    window.dispatchEvent(new CustomEvent('ui:attack'))
  }

  return (
    <OrchestratorContext.Provider value={{ triggerWave, triggerPulse, triggerAttackAnimation }}>
      {children}
    </OrchestratorContext.Provider>
  )
}

export function useOrchestrator() {
  const context = useContext(OrchestratorContext)
  if (!context) throw new Error('useOrchestrator must be used within ReactiveOrchestrator')
  return context
}

/**
 * REACTIVE CARD
 * Reacts to global events triggered by buttons
 */
interface ReactiveCardProps {
  children: ReactNode
  className?: string
  reactTo?: 'wave' | 'pulse' | 'attack'
  delay?: number
}

export function ReactiveCard({
  children,
  className = '',
  reactTo = 'wave',
  delay = 0
}: ReactiveCardProps) {
  const controls = useAnimationControls()

  useEffect(() => {
    const eventMap = {
      wave: 'ui:wave',
      pulse: 'ui:pulse',
      attack: 'ui:attack'
    }

    const handleEvent = async () => {
      await new Promise(resolve => setTimeout(resolve, delay))

      if (reactTo === 'wave') {
        controls.start({
          x: [0, -10, 10, -5, 5, 0],
          transition: { duration: 0.5, ease: 'easeInOut' }
        })
      } else if (reactTo === 'pulse') {
        controls.start({
          scale: [1, 1.05, 1],
          transition: { duration: 0.3 }
        })
      } else if (reactTo === 'attack') {
        controls.start({
          backgroundColor: ['rgba(15, 23, 42, 0.4)', 'rgba(239, 68, 68, 0.2)', 'rgba(15, 23, 42, 0.4)'],
          borderColor: ['rgba(51, 65, 85, 0.5)', 'rgba(239, 68, 68, 0.5)', 'rgba(51, 65, 85, 0.5)'],
          transition: { duration: 0.6 }
        })
      }
    }

    window.addEventListener(eventMap[reactTo], handleEvent)
    return () => window.removeEventListener(eventMap[reactTo], handleEvent)
  }, [controls, reactTo, delay])

  return (
    <motion.div
      animate={controls}
      className={`bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 ${className}`}
    >
      {children}
    </motion.div>
  )
}

/**
 * TRIGGER BUTTON
 * When clicked, triggers animations across all ReactiveCards
 */
interface TriggerButtonProps {
  children: ReactNode
  triggerType: 'wave' | 'pulse' | 'attack'
  onClick?: () => void
  className?: string
}

export function TriggerButton({
  children,
  triggerType,
  onClick,
  className = ''
}: TriggerButtonProps) {
  const orchestrator = useOrchestrator()

  const handleClick = () => {
    if (triggerType === 'wave') orchestrator.triggerWave()
    else if (triggerType === 'pulse') orchestrator.triggerPulse()
    else if (triggerType === 'attack') orchestrator.triggerAttackAnimation()

    onClick?.()
  }

  return (
    <motion.button
      onClick={handleClick}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        boxShadow: [
          '0 0 0 0 rgba(16, 185, 129, 0)',
          '0 0 0 10px rgba(16, 185, 129, 0)',
        ]
      }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      {children}
    </motion.button>
  )
}

/**
 * USAGE EXAMPLE IN App.tsx:
 *
 * // Wrap your app
 * <ReactiveOrchestrator>
 *   <div className="flex gap-4">
 *     {/* Trigger button *\/}
 *     <TriggerButton
 *       triggerType="attack"
 *       onClick={() => triggerAttack('sybil')}
 *       className="bg-red-500 text-white px-4 py-2 rounded-lg"
 *     >
 *       🎭 Запустить атаку
 *     </TriggerButton>
 *
 *     {/* Reactive cards - they will animate when button is clicked *\/}
 *     <ReactiveCard reactTo="attack" delay={0}>
 *       <h3>Панель 1</h3>
 *     </ReactiveCard>
 *
 *     <ReactiveCard reactTo="attack" delay={100}>
 *       <h3>Панель 2</h3>
 *     </ReactiveCard>
 *
 *     <ReactiveCard reactTo="attack" delay={200}>
 *       <h3>Панель 3</h3>
 *     </ReactiveCard>
 *   </div>
 * </ReactiveOrchestrator>
 */

/**
 * ADVANCED: Ripple effect that propagates across the screen
 */
export function GlobalRipple() {
  const controls = useAnimationControls()

  useEffect(() => {
    const handleAttack = () => {
      controls.start({
        scale: [0, 2],
        opacity: [0.8, 0],
        transition: { duration: 1.2, ease: 'easeOut' }
      })
    }

    window.addEventListener('ui:attack', handleAttack)
    return () => window.removeEventListener('ui:attack', handleAttack)
  }, [controls])

  return (
    <motion.div
      animate={controls}
      className="fixed inset-0 pointer-events-none z-50 rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2), transparent 70%)',
        transformOrigin: 'center'
      }}
    />
  )
}
