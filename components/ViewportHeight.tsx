'use client'

import { useEffect } from 'react'

/**
 * Component to set dynamic viewport height CSS variable
 * This fixes mobile browser viewport issues (address bar hiding/showing)
 * Similar to Apple's approach - viewport expands when scrolling up
 */
export default function ViewportHeight() {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let rafId: number | null = null

    const setVh = () => {
      // Get actual viewport height (including browser chrome)
      const vh = window.innerHeight * 0.01
      // Set CSS variable --vh to 1% of actual viewport height
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    const debouncedSetVh = () => {
      // Отменяем предыдущий таймер и RAF
      if (timeoutId) clearTimeout(timeoutId)
      if (rafId) cancelAnimationFrame(rafId)

      // Используем debounce + RAF для оптимизации
      timeoutId = setTimeout(() => {
        rafId = requestAnimationFrame(setVh)
      }, 150) // Задержка 150мс - достаточно для избежания спама
    }

    // Set initial value
    setVh()

    // Update on resize (including when address bar shows/hides)
    window.addEventListener('resize', debouncedSetVh, { passive: true })

    // Also update on orientationchange for mobile devices
    window.addEventListener('orientationchange', setVh)

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', debouncedSetVh)
      window.removeEventListener('orientationchange', setVh)
    }
  }, [])

  return null
}
