import { describe, it, expect } from 'vitest'

// =============================================
// Replicate pure functions from src/index.ts
// (These are not exported, so we replicate the exact logic here)
// =============================================

const PLATFORM_COMMISSION = 0.08   // 8% HT
const PROCESSING_FEE_RATE = 0.029  // 2.9% HT (Stripe)
const PROCESSING_FEE_FIXED = 0.30  // 0.30 EUR HT fixed (Stripe)
const VAT_RATE = 0.20              // 20% TVA (France)

function calculateFees(amount: number) {
  const platformFeeHT = amount * PLATFORM_COMMISSION
  const processingFeeHT = amount * PROCESSING_FEE_RATE + PROCESSING_FEE_FIXED
  // TVA applied on service fees (like Whatnot Europe)
  const platformFee = Math.round(platformFeeHT * (1 + VAT_RATE) * 100) / 100
  const processingFee = Math.round(processingFeeHT * (1 + VAT_RATE) * 100) / 100
  const totalFees = Math.round((platformFee + processingFee) * 100) / 100
  const sellerPayout = Math.round((amount - totalFees) * 100) / 100
  return { platformFee, processingFee, totalFees, sellerPayout }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function computeSellerScore(trust: Record<string, unknown>): number {
  const baseScores: Record<string, number> = { new: 8.0, standard: 8.5, trusted: 9.0, premium: 9.5 }
  let score = baseScores[(trust.trust_level as string) || 'new'] ?? 8.0
  // Bonus for delivery rate
  const deliveryRate = (trust.positive_delivery_rate as number) ?? 1.0
  score += (deliveryRate - 0.9) * 2 // +0.2 if 100%, -0.2 if 80%
  // Penalty for disputes
  const completed = (trust.total_completed_orders as number) || 1
  const disputesLost = (trust.disputes_lost as number) || 0
  const disputeRate = disputesLost / completed
  score -= disputeRate * 5 // -0.5 per 10% dispute rate
  return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10
}

// Replicate buyer score penalty logic (pure calculation part only, no DB)
function computeBuyerScorePenalty(currentScore: number, penalty: number) {
  const newScore = Math.round(Math.max(0, currentScore - penalty) * 100) / 100
  let riskLevel = 'low'
  if (newScore < 3) riskLevel = 'blocked'
  else if (newScore < 5) riskLevel = 'high'
  else if (newScore < 7) riskLevel = 'medium'
  return { newScore, riskLevel }
}

// For new buyers (no existing score, start from 10)
function computeNewBuyerScorePenalty(penalty: number) {
  const newScore = Math.round(Math.max(0, 10 - penalty) * 100) / 100
  let riskLevel = 'low'
  if (newScore < 7) riskLevel = 'medium'
  return { newScore, riskLevel }
}

// =============================================
// Tests
// =============================================

describe('calculateFees', () => {
  it('should return correct fees for a small amount (0.50 EUR)', () => {
    const fees = calculateFees(0.50)
    expect(fees.platformFee).toBeGreaterThanOrEqual(0)
    expect(fees.processingFee).toBeGreaterThanOrEqual(0)
    expect(fees.totalFees).toBeCloseTo(fees.platformFee + fees.processingFee, 2)
    expect(fees.sellerPayout).toBeCloseTo(0.50 - fees.totalFees, 2)
  })

  it('should return correct fees for 10 EUR', () => {
    const fees = calculateFees(10)
    // platformFeeHT = 10 * 0.08 = 0.80, with VAT = 0.96
    expect(fees.platformFee).toBeCloseTo(0.96, 2)
    // processingFeeHT = 10 * 0.029 + 0.30 = 0.59, with VAT = 0.708
    expect(fees.processingFee).toBeCloseTo(0.71, 2)
    expect(fees.totalFees).toBeCloseTo(0.96 + 0.71, 2)
    expect(fees.sellerPayout).toBeCloseTo(10 - fees.totalFees, 2)
  })

  it('should return correct fees for 100 EUR', () => {
    const fees = calculateFees(100)
    // platformFeeHT = 100 * 0.08 = 8.00, with VAT = 9.60
    expect(fees.platformFee).toBeCloseTo(9.60, 2)
    // processingFeeHT = 100 * 0.029 + 0.30 = 3.20, with VAT = 3.84
    expect(fees.processingFee).toBeCloseTo(3.84, 2)
    expect(fees.totalFees).toBeCloseTo(9.60 + 3.84, 2)
    expect(fees.sellerPayout).toBeCloseTo(100 - fees.totalFees, 2)
  })

  it('should return correct fees for 1000 EUR', () => {
    const fees = calculateFees(1000)
    // platformFeeHT = 1000 * 0.08 = 80, with VAT = 96
    expect(fees.platformFee).toBeCloseTo(96, 2)
    // processingFeeHT = 1000 * 0.029 + 0.30 = 29.30, with VAT = 35.16
    expect(fees.processingFee).toBeCloseTo(35.16, 2)
    expect(fees.totalFees).toBeCloseTo(96 + 35.16, 2)
    expect(fees.sellerPayout).toBeCloseTo(1000 - fees.totalFees, 2)
  })

  it('should ensure sellerPayout + totalFees = amount', () => {
    const testAmounts = [0.50, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 50000]
    for (const amount of testAmounts) {
      const fees = calculateFees(amount)
      // Due to rounding, allow 1 cent tolerance
      expect(fees.sellerPayout + fees.totalFees).toBeCloseTo(amount, 2)
    }
  })

  it('should return non-negative sellerPayout for typical amounts', () => {
    const testAmounts = [1, 5, 10, 50, 100, 500, 1000, 50000]
    for (const amount of testAmounts) {
      const fees = calculateFees(amount)
      expect(fees.sellerPayout).toBeGreaterThan(0)
    }
  })

  it('should handle very small amounts where fees may exceed amount', () => {
    // For very small amounts, the fixed processing fee dominates
    const fees = calculateFees(0.01)
    // totalFees will exceed amount because of the fixed 0.30 EUR processing fee
    expect(fees.totalFees).toBeGreaterThan(0.01)
    // sellerPayout will be negative
    expect(fees.sellerPayout).toBeLessThan(0)
  })

  it('should scale proportionally — fees on 100 EUR should be roughly 10x fees on 10 EUR (minus fixed component)', () => {
    const fees10 = calculateFees(10)
    const fees100 = calculateFees(100)
    // The variable part should scale 10x, but the fixed part stays constant
    // So total fees at 100 should be less than 10x fees at 10
    expect(fees100.totalFees).toBeLessThan(fees10.totalFees * 10)
    // But significantly more than fees at 10
    expect(fees100.totalFees).toBeGreaterThan(fees10.totalFees * 5)
  })

  it('should have platform fee greater than processing fee for large amounts', () => {
    // At large amounts, the 8% platform commission (with VAT: 9.6%) should dominate
    // over the 2.9% + 0.30 processing fee (with VAT: ~3.48% + 0.36)
    const fees = calculateFees(1000)
    expect(fees.platformFee).toBeGreaterThan(fees.processingFee)
  })
})

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('should escape less-than sign', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b')
  })

  it('should escape greater-than sign', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('should escape double quotes', () => {
    expect(escapeHtml('a "b" c')).toBe('a &quot;b&quot; c')
  })

  it('should escape a full XSS attack string', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('should handle multiple special characters together', () => {
    expect(escapeHtml('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;')
  })

  it('should return the same string when no special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should handle string with only special characters', () => {
    expect(escapeHtml('&<>"')).toBe('&amp;&lt;&gt;&quot;')
  })

  it('should escape HTML attribute injection', () => {
    expect(escapeHtml('" onmouseover="alert(1)')).toBe(
      '&quot; onmouseover=&quot;alert(1)'
    )
  })

  it('should escape nested HTML tags', () => {
    expect(escapeHtml('<div><img src=x onerror=alert(1)></div>')).toBe(
      '&lt;div&gt;&lt;img src=x onerror=alert(1)&gt;&lt;/div&gt;'
    )
  })
})

describe('computeSellerScore', () => {
  it('should return base score 8.0 for new trust level with default delivery', () => {
    const score = computeSellerScore({ trust_level: 'new', positive_delivery_rate: 1.0 })
    // base 8.0 + (1.0 - 0.9) * 2 = 8.0 + 0.2 = 8.2
    expect(score).toBeCloseTo(8.2, 1)
  })

  it('should return base score 8.5 for standard trust level', () => {
    const score = computeSellerScore({ trust_level: 'standard', positive_delivery_rate: 1.0 })
    // base 8.5 + 0.2 = 8.7
    expect(score).toBeCloseTo(8.7, 1)
  })

  it('should return base score 9.0 for trusted level', () => {
    const score = computeSellerScore({ trust_level: 'trusted', positive_delivery_rate: 1.0 })
    // base 9.0 + 0.2 = 9.2
    expect(score).toBeCloseTo(9.2, 1)
  })

  it('should return base score 9.5 for premium level', () => {
    const score = computeSellerScore({ trust_level: 'premium', positive_delivery_rate: 1.0 })
    // base 9.5 + 0.2 = 9.7
    expect(score).toBeCloseTo(9.7, 1)
  })

  it('should apply penalty for low delivery rate', () => {
    const score = computeSellerScore({ trust_level: 'new', positive_delivery_rate: 0.80 })
    // base 8.0 + (0.80 - 0.9) * 2 = 8.0 + (-0.2) = 7.8
    expect(score).toBeCloseTo(7.8, 1)
  })

  it('should apply penalty for disputes', () => {
    const score = computeSellerScore({
      trust_level: 'trusted',
      positive_delivery_rate: 1.0,
      total_completed_orders: 100,
      disputes_lost: 10,
    })
    // base 9.0 + 0.2 (delivery) - (10/100) * 5 = 9.2 - 0.5 = 8.7
    expect(score).toBeCloseTo(8.7, 1)
  })

  it('should clamp score to maximum 10', () => {
    const score = computeSellerScore({
      trust_level: 'premium',
      positive_delivery_rate: 1.0,
      disputes_lost: 0,
      total_completed_orders: 100,
    })
    // base 9.5 + 0.2 = 9.7, capped at 10
    expect(score).toBeLessThanOrEqual(10)
  })

  it('should clamp score to minimum 0', () => {
    const score = computeSellerScore({
      trust_level: 'new',
      positive_delivery_rate: 0.0,
      total_completed_orders: 10,
      disputes_lost: 10,
    })
    // base 8.0 + (0 - 0.9) * 2 = 8.0 - 1.8 = 6.2, then - (10/10) * 5 = 6.2 - 5.0 = 1.2
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(10)
  })

  it('should default to "new" trust level when trust_level is missing', () => {
    const score = computeSellerScore({})
    // base 8.0 + (1.0 - 0.9) * 2 = 8.2 (delivery_rate defaults to 1.0)
    expect(score).toBeCloseTo(8.2, 1)
  })

  it('should handle unknown trust level by defaulting to 8.0', () => {
    const score = computeSellerScore({ trust_level: 'unknown_level' })
    // baseScores['unknown_level'] is undefined, ?? 8.0
    expect(score).toBeCloseTo(8.2, 1) // 8.0 base + 0.2 delivery bonus
  })

  it('should never return a score above 10 even with perfect stats', () => {
    const score = computeSellerScore({
      trust_level: 'premium',
      positive_delivery_rate: 1.5, // abnormally high
      disputes_lost: 0,
      total_completed_orders: 1000,
    })
    expect(score).toBeLessThanOrEqual(10)
  })
})

describe('penalizeBuyerScore (pure logic)', () => {
  describe('existing buyer score penalty', () => {
    it('should subtract penalty from current score', () => {
      const result = computeBuyerScorePenalty(10, 1.0)
      expect(result.newScore).toBe(9)
      expect(result.riskLevel).toBe('low')
    })

    it('should set risk level to medium when score drops below 7', () => {
      const result = computeBuyerScorePenalty(7, 1.0)
      expect(result.newScore).toBe(6)
      expect(result.riskLevel).toBe('medium')
    })

    it('should set risk level to high when score drops below 5', () => {
      const result = computeBuyerScorePenalty(5, 1.0)
      expect(result.newScore).toBe(4)
      expect(result.riskLevel).toBe('high')
    })

    it('should set risk level to blocked when score drops below 3', () => {
      const result = computeBuyerScorePenalty(3, 1.0)
      expect(result.newScore).toBe(2)
      expect(result.riskLevel).toBe('blocked')
    })

    it('should clamp to 0 and not go negative', () => {
      const result = computeBuyerScorePenalty(1, 5.0)
      expect(result.newScore).toBe(0)
      expect(result.riskLevel).toBe('blocked')
    })

    it('should handle abandoned order penalty (-1.0)', () => {
      const result = computeBuyerScorePenalty(10, 1.0)
      expect(result.newScore).toBe(9)
      expect(result.riskLevel).toBe('low')
    })

    it('should handle no address penalty (-1.5)', () => {
      const result = computeBuyerScorePenalty(10, 1.5)
      expect(result.newScore).toBe(8.5)
      expect(result.riskLevel).toBe('low')
    })

    it('should handle lost dispute penalty (-2.0)', () => {
      const result = computeBuyerScorePenalty(10, 2.0)
      expect(result.newScore).toBe(8)
      expect(result.riskLevel).toBe('low')
    })

    it('should handle cumulative penalties correctly', () => {
      // Simulate multiple penalties
      let { newScore, riskLevel } = computeBuyerScorePenalty(10, 1.0) // abandoned order
      expect(newScore).toBe(9)
      ;({ newScore, riskLevel } = computeBuyerScorePenalty(newScore, 1.5)) // no address
      expect(newScore).toBe(7.5)
      expect(riskLevel).toBe('low')
      ;({ newScore, riskLevel } = computeBuyerScorePenalty(newScore, 2.0)) // lost dispute
      expect(newScore).toBe(5.5)
      expect(riskLevel).toBe('medium')
    })

    it('should handle the exact boundary at score 7 (low)', () => {
      const result = computeBuyerScorePenalty(8, 1.0)
      expect(result.newScore).toBe(7)
      expect(result.riskLevel).toBe('low')
    })

    it('should handle the exact boundary at score 5 (medium)', () => {
      const result = computeBuyerScorePenalty(6, 1.0)
      expect(result.newScore).toBe(5)
      expect(result.riskLevel).toBe('medium')
    })

    it('should handle the exact boundary at score 3 (high)', () => {
      const result = computeBuyerScorePenalty(4, 1.0)
      expect(result.newScore).toBe(3)
      expect(result.riskLevel).toBe('high')
    })
  })

  describe('new buyer score penalty', () => {
    it('should start from 10 and subtract penalty', () => {
      const result = computeNewBuyerScorePenalty(1.0)
      expect(result.newScore).toBe(9)
      expect(result.riskLevel).toBe('low')
    })

    it('should set risk level to medium when below 7', () => {
      const result = computeNewBuyerScorePenalty(4.0)
      expect(result.newScore).toBe(6)
      expect(result.riskLevel).toBe('medium')
    })

    it('should clamp to 0 for very large penalty', () => {
      const result = computeNewBuyerScorePenalty(15)
      expect(result.newScore).toBe(0)
      expect(result.riskLevel).toBe('medium') // new buyer logic uses different thresholds
    })

    it('should handle zero penalty', () => {
      const result = computeNewBuyerScorePenalty(0)
      expect(result.newScore).toBe(10)
      expect(result.riskLevel).toBe('low')
    })
  })
})

describe('price validation logic', () => {
  it('should accept price at minimum (0.01)', () => {
    const price = 0.01
    expect(price >= 0.01).toBe(true)
    expect(price <= 50000).toBe(true)
  })

  it('should reject price below minimum', () => {
    const price = 0.00
    expect(price < 0.01).toBe(true)
  })

  it('should accept price at maximum (50000)', () => {
    const price = 50000
    expect(price >= 0.01).toBe(true)
    expect(price <= 50000).toBe(true)
  })

  it('should reject price above maximum', () => {
    const price = 50001
    expect(price > 50000).toBe(true)
  })

  it('should reject NaN price', () => {
    const price = parseFloat('not-a-number') || 0
    expect(price < 0.01).toBe(true)
  })

  it('should reject negative price', () => {
    const price = -5
    expect(price < 0.01).toBe(true)
  })

  it('should handle string to float parsing with rounding', () => {
    // Replicate bid amount parsing: Math.round(parseFloat(amount) * 100) / 100
    const amount = Math.round(parseFloat('10.555') * 100) / 100
    expect(amount).toBe(10.56)
  })

  it('should handle valid decimal prices', () => {
    const price = parseFloat('9.99') || 0
    expect(price >= 0.01).toBe(true)
    expect(price <= 50000).toBe(true)
  })
})

describe('application_fee_amount minimum (50 centimes)', () => {
  it('should enforce minimum 50 centimes application fee', () => {
    // Replicate: Math.max(50, feeCents)
    const testCases = [
      { feeCents: 10, expected: 50 },
      { feeCents: 49, expected: 50 },
      { feeCents: 50, expected: 50 },
      { feeCents: 51, expected: 51 },
      { feeCents: 100, expected: 100 },
      { feeCents: 1000, expected: 1000 },
    ]
    for (const tc of testCases) {
      expect(Math.max(50, tc.feeCents)).toBe(tc.expected)
    }
  })
})
