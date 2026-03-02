import { useState, useRef, useEffect } from 'react'
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
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number>(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  })

  useEffect(() => {
    setIsExpanded(defaultExpanded)
  }, [defaultExpanded])

  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onExpand?.(newState)
  }

  return (
    <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm overflow-hidden ${className}`}>
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <div>{icon}</div>}
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {title}
          </h2>
        </div>
        <div
          className="transition-transform duration-200"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
      </button>

      <div
        className="transition-all duration-200 overflow-hidden"
        style={{ maxHeight: isExpanded ? contentHeight + 20 : 0, opacity: isExpanded ? 1 : 0 }}
      >
        <div ref={contentRef} className="p-4 pt-0 border-t border-slate-700/30">
          {children}
        </div>
      </div>
    </div>
  )
}
