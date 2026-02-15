/**
 * Behavioral tracking — learns user preferences from actual usage.
 * Tracks which categories/sellers the user views, and boosts those in the feed.
 * All data stored in localStorage, no server calls.
 */

const STORAGE_KEY = 'shapop_behavior'

interface CategoryView {
  count: number
  lastViewed: number // timestamp
}

export interface BehaviorData {
  categoryViews: Record<string, CategoryView>
  sellerViews: Record<string, number>
  totalViews: number
}

function load(): BehaviorData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { categoryViews: {}, sellerViews: {}, totalViews: 0 }
    return JSON.parse(raw) as BehaviorData
  } catch {
    return { categoryViews: {}, sellerViews: {}, totalViews: 0 }
  }
}

function save(data: BehaviorData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Track when the user clicks/views a stream.
 * Call this when the user taps on a StreamCard.
 */
export function trackStreamView(category: string | null, sellerName?: string) {
  const data = load()
  data.totalViews++

  if (category) {
    if (!data.categoryViews[category]) {
      data.categoryViews[category] = { count: 0, lastViewed: 0 }
    }
    data.categoryViews[category].count++
    data.categoryViews[category].lastViewed = Date.now()
  }

  if (sellerName) {
    data.sellerViews[sellerName] = (data.sellerViews[sellerName] || 0) + 1
  }

  save(data)
}

/**
 * Get the user's top categories ranked by view count.
 * Returns category names sorted by frequency.
 */
export function getTopCategories(limit = 5): string[] {
  const data = load()
  return Object.entries(data.categoryViews)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([cat]) => cat)
}

/**
 * Get a behavioral score (0–40) for a stream based on the user's viewing history.
 * Higher score = the user has viewed this category/seller more often.
 */
export function getBehaviorScore(category: string | null, sellerName?: string): number {
  const data = load()
  if (data.totalViews === 0) return 0

  let score = 0

  // Category affinity: up to 30 points
  if (category && data.categoryViews[category]) {
    const catViews = data.categoryViews[category].count
    // Ratio of this category vs total views
    const ratio = catViews / data.totalViews
    // Scale: if user spends 50%+ on this category, max points
    score += Math.min(Math.round(ratio * 60), 30)

    // Recency bonus: +5 if viewed in the last hour
    const hourAgo = Date.now() - 3600000
    if (data.categoryViews[category].lastViewed > hourAgo) {
      score += 5
    }
  }

  // Seller affinity: up to 10 points
  if (sellerName && data.sellerViews[sellerName]) {
    const sellerViews = data.sellerViews[sellerName]
    score += Math.min(sellerViews * 3, 10)
  }

  return Math.min(score, 40)
}

/**
 * Get full behavior data for debugging or display.
 */
export function getBehaviorData(): BehaviorData {
  return load()
}
