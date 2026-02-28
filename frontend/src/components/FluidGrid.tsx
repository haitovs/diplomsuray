import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface GridItem {
  id: string
  content: React.ReactNode
  priority?: number // Higher priority = appears first
}

interface FluidGridProps {
  items: GridItem[]
  columns?: number
  gap?: number
  onItemClick?: (id: string) => void
}

export function FluidGrid({
  items,
  columns = 3,
  gap = 16,
  onItemClick
}: FluidGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <motion.div
      layout
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`
      }}
    >
      <AnimatePresence mode="popLayout">
        {items
          .sort((a, b) => (b.priority || 0) - (a.priority || 0))
          .map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                layout: { type: 'spring', damping: 25, stiffness: 300 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
              }}
              whileHover={{
                scale: 1.05,
                zIndex: 10,
                transition: { type: 'spring', damping: 15, stiffness: 400 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onItemClick?.(item.id)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative bg-slate-800/50 border border-slate-700 rounded-xl p-4 cursor-pointer overflow-hidden"
            >
              {/* Ripple effect on hover */}
              <AnimatePresence>
                {hoveredId === item.id && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.6 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full bg-emerald-500/30 pointer-events-none"
                    style={{
                      transformOrigin: 'center'
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Content */}
              <motion.div
                layout="position"
                className="relative z-10"
              >
                {item.content}
              </motion.div>

              {/* Stagger animation for child elements */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-mono"
              >
                #{index + 1}
              </motion.div>
            </motion.div>
          ))}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * ADVANCED: Grid that reorganizes based on state
 */
interface AdaptiveGridProps {
  items: GridItem[]
  sortBy?: 'priority' | 'id' | 'recent'
  filterBy?: string
}

export function AdaptiveGrid({ items, sortBy = 'priority', filterBy }: AdaptiveGridProps) {
  const [activeFilter, setActiveFilter] = useState(filterBy)

  const filteredItems = items.filter(item => {
    if (!activeFilter) return true
    return item.id.toLowerCase().includes(activeFilter.toLowerCase())
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'priority') return (b.priority || 0) - (a.priority || 0)
    if (sortBy === 'id') return a.id.localeCompare(b.id)
    return 0
  })

  return (
    <motion.div layout className="space-y-4">
      {/* Filter controls */}
      <motion.div layout className="flex gap-2">
        {['all', 'car', 'truck'].map(filter => (
          <motion.button
            key={filter}
            layout
            onClick={() => setActiveFilter(filter === 'all' ? undefined : filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === filter
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {filter}
          </motion.button>
        ))}
      </motion.div>

      {/* Grid */}
      <FluidGrid items={sortedItems} columns={3} gap={12} />
    </motion.div>
  )
}

/**
 * USAGE EXAMPLE:
 *
 * const vehicles = simulationState?.vehicles.map(v => ({
 *   id: v.id,
 *   priority: v.is_attacker ? 100 : v.trust_score * 10,
 *   content: (
 *     <div>
 *       <div className="font-bold">{v.id}</div>
 *       <div className="text-xs text-slate-400">{v.speed} km/h</div>
 *     </div>
 *   )
 * })) || []
 *
 * <FluidGrid
 *   items={vehicles}
 *   columns={4}
 *   gap={16}
 *   onItemClick={(id) => setSelectedVehicle(vehicles.find(v => v.id === id))}
 * />
 */
