/**
 * Motion Utilities
 * Helper functions for accessible and performant animations
 */

import { useEffect, useState } from 'react'

/**
 * Detects if user prefers reduced motion (accessibility setting)
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }
    // Fallback for older browsers
    else {
      mediaQuery.addListener(listener)
      return () => mediaQuery.removeListener(listener)
    }
  }, [])

  return prefersReducedMotion
}

/**
 * Detects if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - for older browsers
    navigator.msMaxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  )
}

/**
 * Detects if device is mobile based on screen size
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < breakpoint
  })

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])

  return isMobile
}

/**
 * Returns optimal transition config based on device and user preferences
 */
export function useOptimalTransition() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const isMobile = useIsMobile()

  if (prefersReducedMotion) {
    return {
      duration: 0,
      type: 'tween' as const
    }
  }

  if (isMobile) {
    return {
      duration: 0.2,
      type: 'tween' as const,
      ease: 'easeOut' as const
    }
  }

  return {
    type: 'spring' as const,
    damping: 25,
    stiffness: 300
  }
}

/**
 * Throttle function for mouse events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall < delay) return
    lastCall = now
    return func(...args)
  }
}

/**
 * Debounce function for delayed actions
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Get safe animation variants based on user preferences
 */
export function getSafeVariants(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 }
    }
  }

  return {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  }
}

/**
 * Measure FPS for performance monitoring (development only)
 */
export function measureFPS(callback: (fps: number) => void) {
  let frameCount = 0
  let lastTime = performance.now()
  let animationFrameId: number

  const measure = () => {
    frameCount++
    const now = performance.now()

    if (now >= lastTime + 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastTime))
      callback(fps)
      frameCount = 0
      lastTime = now
    }

    animationFrameId = requestAnimationFrame(measure)
  }

  animationFrameId = requestAnimationFrame(measure)

  // Return cleanup function
  return () => cancelAnimationFrame(animationFrameId)
}

/**
 * Hook to monitor FPS in development
 */
export function useFPSMonitor(enabled: boolean = import.meta.env.DEV) {
  const [fps, setFps] = useState(60)

  useEffect(() => {
    if (!enabled) return

    const cleanup = measureFPS((currentFps) => {
      setFps(currentFps)
      if (currentFps < 50) {
        console.warn(`⚠️ Low FPS detected: ${currentFps}`)
      }
    })

    return cleanup
  }, [enabled])

  return fps
}

/**
 * Calculate distance between two points
 */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/**
 * Calculate angle between two points
 */
export function getAngle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t
}

/**
 * Map value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}
