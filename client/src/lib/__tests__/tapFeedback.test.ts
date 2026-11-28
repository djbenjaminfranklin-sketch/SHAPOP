import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installTapFeedback } from '../tapFeedback'

function touch(type: string, target: Element, x: number, y: number) {
  const ev = new Event(type, { bubbles: true }) as Event & { touches: { clientX: number; clientY: number }[] }
  Object.defineProperty(ev, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] })
  target.dispatchEvent(ev)
}

describe("retour d'appui : jamais pendant un défilement (28/11/2026)", () => {
  let btn: HTMLButtonElement, haptic: ReturnType<typeof vi.fn>, off: () => void
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div class="app-scroll"><button id="b">Carte</button></div>'
    btn = document.getElementById('b') as HTMLButtonElement
    haptic = vi.fn()
    off = installTapFeedback(document, haptic)
  })
  afterEach(() => { off(); vi.useRealTimers() })

  it('défilement qui commence sur une carte : ni vibration ni effet enfoncé', () => {
    touch('touchstart', btn, 100, 300)
    expect(haptic).not.toHaveBeenCalled()
    touch('touchmove', btn, 100, 250)
    vi.advanceTimersByTime(200)
    expect(btn.classList.contains('tap-active')).toBe(false)
    touch('touchend', btn, 100, 250)
    expect(haptic).not.toHaveBeenCalled()
  })

  it('vrai appui : effet enfoncé puis une vibration au lever du doigt', () => {
    touch('touchstart', btn, 100, 300)
    vi.advanceTimersByTime(100)
    expect(btn.classList.contains('tap-active')).toBe(true)
    touch('touchend', btn, 100, 300)
    expect(haptic).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    expect(btn.classList.contains('tap-active')).toBe(false)
  })
})
