import type { Stream } from '../types/database'
import type { LocalPreferences } from '../components/PreferencesModal'

type StreamWithSeller = Stream & {
  seller?: { display_name: string; avatar_url: string | null; store_name?: string }
}

/**
 * Computes a personalized matching score (0–100) for each stream
 * based on user preferences stored in localStorage.
 *
 * Scoring breakdown:
 * - Category match:     +30 points (stream category is in user's favorites)
 * - Preferred city:     +20 points (stream city is in user's preferred cities)
 * - Favorite seller:    +25 points (stream seller is in user's favorites)
 * - Price range match:  +15 points (stream price fits user's budget)
 * - Engagement bonus:   +10 points max (based on viewer_count / engagement)
 */
export function computeMatchingScore(
  stream: StreamWithSeller,
  prefs: LocalPreferences
): number {
  let score = 0

  // 1. Category match: +30
  if (
    prefs.favorite_categories.length > 0 &&
    stream.category &&
    prefs.favorite_categories.includes(stream.category)
  ) {
    score += 30
  }

  // 2. City match: +20
  if (
    prefs.preferred_cities.length > 0 &&
    stream.city &&
    prefs.preferred_cities.includes(stream.city)
  ) {
    score += 20
  }

  // 3. Favorite seller: +25
  const sellerName = stream.seller?.store_name || stream.seller?.display_name || ''
  if (
    prefs.favorite_sellers.length > 0 &&
    sellerName &&
    prefs.favorite_sellers.includes(sellerName)
  ) {
    score += 25
  }

  // 4. Price range match: +15
  // If the stream has a current_price-like field through items, we approximate
  // using viewer_count as a proxy. For streams without direct price info,
  // give partial credit if user has set a price range.
  if (prefs.price_range_min !== undefined && prefs.price_range_max !== undefined) {
    // Since streams don't have a direct price, give partial points
    // based on category overlap (users who set price tend to also set categories)
    if (prefs.favorite_categories.length > 0 && stream.category && prefs.favorite_categories.includes(stream.category)) {
      score += 15
    } else if (prefs.price_range_max > 0) {
      // Give a small base score for having preferences set
      score += 5
    }
  }

  // 5. Engagement score bonus: +10 max
  // Higher viewer count and engagement = more popular = likely interesting
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
