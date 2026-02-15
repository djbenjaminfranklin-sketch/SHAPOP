import { Haptics, ImpactStyle } from '@capacitor/haptics'

/**
 * Light haptic tap — call on button/menu press.
 * Silently fails on web (no vibration motor).
 */
export function hapticTap() {
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

/**
 * Medium haptic — for important actions (sold, start auction).
 */
export function hapticMedium() {
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
}
