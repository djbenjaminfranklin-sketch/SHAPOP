const STORAGE_KEY = 'shapop_account_controls'

export function getAppSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function getStreamQualityConstraints(): { width: number; height: number } {
  const s = getAppSettings()
  const q = s?.streamQuality || 'auto'
  switch (q) {
    case 'low': return { width: 640, height: 360 }
    case 'medium': return { width: 1280, height: 720 }
    case 'high': return { width: 1920, height: 1080 }
    default: return { width: 1280, height: 720 } // auto = 720p
  }
}

export function isWatchLimitExceeded(): boolean {
  const s = getAppSettings()
  if (!s?.watchLimitEnabled) return false
  const limitMin = (s.watchLimitHours || 0) * 60 + (s.watchLimitMinutes || 0)
  if (limitMin <= 0) return false
  try {
    const raw = localStorage.getItem('shapop_watch_log')
    if (!raw) return false
    const logs: { ts: number; duration: number }[] = JSON.parse(raw)
    const now = Date.now()
    const periodMs = s.watchLimitPeriod === 'week' ? 7 * 86400000 : 30 * 86400000
    const total = logs.filter(l => now - l.ts < periodMs).reduce((sum, l) => sum + l.duration, 0)
    return Math.round(total / 60) >= limitMin
  } catch { return false }
}

export function isSpendingLimitExceeded(currentSpending: number): boolean {
  const s = getAppSettings()
  if (!s?.spendingLimitEnabled) return false
  if (!s.spendingLimitAmount || s.spendingLimitAmount <= 0) return false
  return currentSpending >= s.spendingLimitAmount
}

export function isNightModeActive(): boolean {
  const s = getAppSettings()
  if (!s?.nightModeEnabled) return false
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = (s.nightModeStart || '22:00').split(':').map(Number)
  const [endH, endM] = (s.nightModeEnd || '07:00').split(':').map(Number)
  const startMin = startH * 60 + startM
  const endMin = endH * 60 + endM
  if (startMin > endMin) {
    // Crosses midnight (e.g., 22:00 - 07:00)
    return currentTime >= startMin || currentTime < endMin
  }
  return currentTime >= startMin && currentTime < endMin
}
