import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useRef } from 'react'

interface MagneticButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  strength?: number // Magnetic pull strength (default: 0.4)
}

export function MagneticButton({
  children,
  onClick,
  className = '',
  strength = 0.4
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Motion values for smooth tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring physics for smooth, natural movement
  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  // Scale on hover
  const scale = useMotionValue(1)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Calculate distance from center
    const distanceX = e.clientX - centerX
    const distanceY = e.clientY - centerY

    // Apply magnetic pull (reduced strength for subtlety)
    mouseX.set(distanceX * strength)
    mouseY.set(distanceY * strength)
  }

  const handleMouseLeave = () => {
    // Smooth return to center with spring physics
    mouseX.set(0)
    mouseY.set(0)
    scale.set(1)
  }

  const handleMouseEnter = () => {
    scale.set(1.05)
  }

  return (
    <motion.button
      ref={buttonRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{ x, y, scale }}
      whileTap={{ scale: 0.95 }}
      className={`relative cursor-pointer ${className}`}
    >
      {children}

      {/* Glow effect that follows cursor */}
      <motion.div
        className="absolute inset-0 rounded-lg opacity-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.3), transparent 70%)',
        }}
        animate={{
          opacity: [0, 0.6, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.button>
  )
}

/**
 * USAGE EXAMPLE:
 *
 * <MagneticButton
 *   onClick={startSimulation}
 *   strength={0.3}
 *   className="bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-6 rounded-lg"
 * >
 *   <Play className="w-4 h-4 mr-2" /> Старт
 * </MagneticButton>
 */
