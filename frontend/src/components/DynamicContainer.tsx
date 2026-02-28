import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface DynamicContainerProps {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
  defaultExpanded?: boolean
  className?: string
  onExpand?: (expanded: boolean) => void
}

export function DynamicContainer({
  title,
  children,
  icon,
  defaultExpanded = false,
  className = '',
  onExpand
}: DynamicContainerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onExpand?.(newState)
  }

  return (
    <motion.div
      layout // Automatically animates size/position changes
      className={`bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header - Always visible */}
      <motion.button
        onClick={handleToggle}
        className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <motion.div
              animate={{ rotate: isExpanded ? 360 : 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            >
              {icon}
            </motion.div>
          )}
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {title}
          </h2>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </motion.div>
      </motion.button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { type: 'spring', damping: 25, stiffness: 300 },
              opacity: { duration: 0.2 }
            }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              exit={{ y: -10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="p-4 pt-0 border-t border-slate-700/30"
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * USAGE EXAMPLE:
 *
 * <DynamicContainer
 *   title="Настройки симуляции"
 *   icon={<Settings className="w-4 h-4 text-emerald-400" />}
 *   defaultExpanded={true}
 *   onExpand={(expanded) => console.log('Container expanded:', expanded)}
 * >
 *   <div className="space-y-4">
 *     <label>Скорость: {speed}x</label>
 *     <input type="range" />
 *   </div>
 * </DynamicContainer>
 */
