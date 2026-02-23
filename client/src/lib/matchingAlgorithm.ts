import type { Stream } from '../types/database'
import type { LocalPreferences } from '../types/preferences'
import { getBehaviorScore } from './behaviorTracker'

type StreamWithSeller = Stream & {
  seller?: { display_name: string; avatar_url: string | null; store_name?: string }
}

/**
 * Computes a personalized matching score (0–100) for each stream
 * based on user preferences AND behavioral tracking.
 *
 * Scoring breakdown:
 * - Behavioral affinity: +40 points max (based on actual viewing history)
 * - Category match:      +20 points (stream category is in user's explicit favorites)
 * - Preferred city:      +15 points (stream city is in user's preferred cities)
 * - Favorite seller:     +15 points (stream seller is in user's favorites)
 * - Engagement bonus:    +10 points max (based on viewer_count / engagement)
 *
 * Behavioral data is the strongest signal — it reflects what the user
 * actually watches, not just what they said they like.
 */
export function computeMatchingScore(
  stream: StreamWithSeller,
  prefs: LocalPreferences
): number {
  let score = 0
  const sellerName = stream.seller?.store_name || stream.seller?.display_name || ''

  // 1. BEHAVIORAL AFFINITY: +40 max (strongest signal)
  // Based on actual viewing history — categories and sellers the user clicks on most
  score += getBehaviorScore(stream.category, sellerName)

  // 2. Explicit category match: +20
  if (
    prefs.favorite_categories.length > 0 &&
    stream.category &&
    prefs.favorite_categories.includes(stream.category)
  ) {
    score += 20
  }

  // 3. City match: +15
  if (
    prefs.preferred_cities.length > 0 &&
    stream.city &&
    prefs.preferred_cities.includes(stream.city)
  ) {
    score += 15
  }

  // 4. Favorite seller: +15
  if (
    prefs.favorite_sellers.length > 0 &&
    sellerName &&
    prefs.favorite_sellers.includes(sellerName)
  ) {
    score += 15
  }

  // 5. Engagement score bonus: +10 max
  const viewerScore = Math.min(stream.viewer_count / 100, 1) * 6
  const engagementBonus = Math.min(stream.engagement_score / 100, 1) * 4
  score += Math.min(Math.round(viewerScore + engagementBonus), 10)

  // Clamp to 0–100
  return Math.min(Math.max(Math.round(score), 0), 100)
}

/**
 * Scores and sorts streams by matching score (descending).
 * Attaches matching_score to each stream.
 */
export function sortStreamsByMatch(
  streams: StreamWithSeller[],
  prefs: LocalPreferences
): StreamWithSeller[] {
  return streams
    .map(stream => ({
      ...stream,
      matching_score: computeMatchingScore(stream, prefs),
    }))
    .sort((a, b) => (b.matching_score || 0) - (a.matching_score || 0))
}
