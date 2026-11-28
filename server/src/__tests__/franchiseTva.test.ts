import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
})
vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>()
  const { fakeDb } = await import('./helpers/fakeSupabase')
  return { ...actual, supabase: fakeDb, resend: null }
})

import { calculateFees } from '../utils'
import { VAT_MENTION } from '../config'

describe('frais vendeur sans TVA : auto-entrepreneur en franchise (28/11/2026)', () => {
  it('vente de 100 : commission 8, frais de paiement 3,20, vendeur reçoit 88,80', () => {
    expect(calculateFees(100)).toEqual({ platformFee: 8, processingFee: 3.2, totalFees: 11.2, sellerPayout: 88.8 })
  })
  it('mention légale à afficher', () => {
    expect(VAT_MENTION).toBe('TVA non applicable, art. 293 B du CGI')
  })
})
