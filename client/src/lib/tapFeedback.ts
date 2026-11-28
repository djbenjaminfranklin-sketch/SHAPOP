// Retour d'appui (vibration légère + effet « enfoncé ») façon appli native (28/11/2026).
// Avant : vibration et carte rétrécie DÈS que le doigt touchait l'écran -> chaque défilement commençait
// par un à-coup (« très robotique », Benjamin). Maintenant :
// - effet visuel seulement si le doigt reste immobile 90 ms (comme iOS), annulé dès qu'il bouge ;
// - vibration seulement pour un VRAI appui (doigt levé sans avoir bougé), jamais pendant un défilement.

export const TAP_SLOP_PX = 10        // au-delà, c'est un défilement, pas un appui
export const PRESS_DELAY_MS = 90     // délai avant l'effet « enfoncé »

const TAPPABLE = 'button, a, [role="button"], [data-tap], div[style*="cursor"], [onclick]'

export function installTapFeedback(doc: Document, haptic: () => void): () => void {
  let el: HTMLElement | null = null
  let x0 = 0, y0 = 0
  let moved = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const release = () => {
    if (timer) { clearTimeout(timer); timer = null }
    const e = el
    if (e) setTimeout(() => e.classList.remove('tap-active'), 60)
    el = null
  }

  const onStart = (e: TouchEvent) => {
    release()
    const t = e.touches[0]
    const target = e.target as HTMLElement | null
    const tappable = target?.closest?.(TAPPABLE) as HTMLElement | null
    if (!t || !tappable) return
    el = tappable
    x0 = t.clientX; y0 = t.clientY
    moved = false
    timer = setTimeout(() => { if (!moved && el) el.classList.add('tap-active') }, PRESS_DELAY_MS)
  }

  const onMove = (e: TouchEvent) => {
    if (!el || moved) return
    const t = e.touches[0]
    if (!t) return
    if (Math.abs(t.clientX - x0) > TAP_SLOP_PX || Math.abs(t.clientY - y0) > TAP_SLOP_PX) {
      moved = true
      if (timer) { clearTimeout(timer); timer = null }
      el.classList.remove('tap-active')
    }
  }

  const onEnd = () => {
    if (el && !moved) haptic()
    release()
  }

  doc.addEventListener('touchstart', onStart, { passive: true })
  doc.addEventListener('touchmove', onMove, { passive: true })
  doc.addEventListener('touchend', onEnd, { passive: true })
  doc.addEventListener('touchcancel', release, { passive: true })
  return () => {
    doc.removeEventListener('touchstart', onStart)
    doc.removeEventListener('touchmove', onMove)
    doc.removeEventListener('touchend', onEnd)
    doc.removeEventListener('touchcancel', release)
    release()
  }
}
