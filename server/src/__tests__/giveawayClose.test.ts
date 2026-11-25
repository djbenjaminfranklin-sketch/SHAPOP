import { describe, it, expect, vi } from 'vitest'
vi.mock('../config', () => ({ supabase: {} }))
import { eligibleEntries } from '../services/giveawayClose'

const entries = [{ user_id: 'a', display_name: 'A' }, { user_id: 'b', display_name: 'B' }]
describe('cadeau : participants éligibles', () => {
  it('cadeau ouvert à tous : tout le monde', () => {
    expect(eligibleEntries(entries, new Set(), false)).toHaveLength(2)
  })
  it('réservé aux acheteurs : seulement ceux qui ont acheté pendant le live', () => {
    expect(eligibleEntries(entries, new Set(['b']), true)).toEqual([{ user_id: 'b', display_name: 'B' }])
    expect(eligibleEntries(entries, new Set(), true)).toEqual([])
  })
})
