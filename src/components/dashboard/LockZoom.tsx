'use client'

import { useEffect } from 'react'

/**
 * Bloqueia zoom acidental dentro do app autenticado.
 *
 * - Pinch-zoom: cancela touchstart/touchmove com 2+ dedos
 * - Double-tap zoom: tratado via CSS (`touch-action: manipulation`)
 * - iOS auto-zoom em input: tratado via CSS (font-size: 16px nos inputs)
 *
 * O componente em si não renderiza nada — só registra os listeners
 * passivamente quando montado.
 */
export function LockZoom() {
  useEffect(() => {
    function onTouch(e: TouchEvent) {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    document.addEventListener('touchstart', onTouch, { passive: false })
    document.addEventListener('touchmove',  onTouch, { passive: false })

    // Bloqueia gesturestart no iOS (zoom multi-touch)
    function onGesture(e: Event) { e.preventDefault() }
    document.addEventListener('gesturestart',  onGesture)
    document.addEventListener('gesturechange', onGesture)
    document.addEventListener('gestureend',    onGesture)

    // Anti double-tap zoom defensivo no iOS
    let lastTouchEnd = 0
    function onTouchEnd(e: TouchEvent) {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) e.preventDefault()
      lastTouchEnd = now
    }
    document.addEventListener('touchend', onTouchEnd, { passive: false })

    return () => {
      document.removeEventListener('touchstart', onTouch)
      document.removeEventListener('touchmove',  onTouch)
      document.removeEventListener('gesturestart',  onGesture)
      document.removeEventListener('gesturechange', onGesture)
      document.removeEventListener('gestureend',    onGesture)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return null
}
