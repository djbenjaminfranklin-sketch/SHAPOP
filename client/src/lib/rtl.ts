import { getLang } from './i18n'
import type { CSSProperties } from 'react'

export function isRTL(): boolean {
  return getLang() === 'he'
}

export function getDir(): 'rtl' | 'ltr' {
  return isRTL() ? 'rtl' : 'ltr'
}

/**
 * Returns a style object that flips left/right based on direction.
 * Usage: style={{ position: 'absolute', ...rtlPos('left', '14px') }}
 * In LTR: { left: '14px' }
 * In RTL: { right: '14px' }
 */
export function rtlPos(side: 'left' | 'right', value: string | number): CSSProperties {
  const rtl = isRTL()
  if (side === 'left') return rtl ? { right: value } : { left: value }
  return rtl ? { left: value } : { right: value }
}

/**
 * Returns a style object with directional margin
 */
export function rtlMargin(side: 'left' | 'right', value: string | number): CSSProperties {
  const rtl = isRTL()
  if (side === 'left') return rtl ? { marginRight: value } : { marginLeft: value }
  return rtl ? { marginLeft: value } : { marginRight: value }
}

/**
 * Returns a style object with directional padding
 */
export function rtlPadding(side: 'left' | 'right', value: string | number): CSSProperties {
  const rtl = isRTL()
  if (side === 'left') return rtl ? { paddingRight: value } : { paddingLeft: value }
  return rtl ? { paddingLeft: value } : { paddingRight: value }
}

/**
 * Returns transform to flip an element horizontally for RTL (e.g., arrow icons)
 */
export function rtlFlip(): CSSProperties {
  return isRTL() ? { transform: 'scaleX(-1)' } : {}
}

/**
 * Returns text-align based on direction
 */
export function rtlTextAlign(align: 'left' | 'right'): CSSProperties {
  const rtl = isRTL()
  if (align === 'left') return { textAlign: rtl ? 'right' : 'left' }
  return { textAlign: rtl ? 'left' : 'right' }
}

/**
 * Returns borderRadius that flips left/right for RTL
 * e.g., rtlBorderRadius('12px 0 0 12px') in RTL becomes '0 12px 12px 0'
 */
export function rtlBorderRadius(tl: string, tr: string, br: string, bl: string): CSSProperties {
  if (isRTL()) return { borderRadius: `${tr} ${tl} ${bl} ${br}` }
  return { borderRadius: `${tl} ${tr} ${br} ${bl}` }
}

/**
 * Returns flexDirection that flips row for RTL
 */
export function rtlRow(): CSSProperties {
  return isRTL() ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const }
}
