import { describe, it, expect, vi } from 'vitest'
vi.mock('../config', () => ({ supabase: {}, livekitRoomService: null }))
import { shouldEndLive } from '../services/abandonedLives'

describe('lives abandonnés', () => {
  it('vendeur présent : on ne termine pas et on remet le compteur à zéro', () => {
    expect(shouldEndLive(['seller-abc', 'viewer-x'], 1)).toEqual({ end: false, misses: 0 })
  })
  it('co-hôte présent : le live continue', () => {
    expect(shouldEndLive(['cohost-abc'], 1)).toEqual({ end: false, misses: 0 })
  })
  it('vendeur absent moins de 10 min (4 contrôles) : le live continue', () => {
    expect(shouldEndLive(['viewer-x'], 0)).toEqual({ end: false, misses: 1 })
    expect(shouldEndLive(['viewer-x'], 3)).toEqual({ end: false, misses: 4 })
  })
  it('vendeur absent 5 contrôles de suite (10 min, ou salle supprimée) : on termine', () => {
    expect(shouldEndLive(['viewer-x'], 4)).toEqual({ end: true, misses: 5 })
    expect(shouldEndLive(null, 4)).toEqual({ end: true, misses: 5 })
  })
})
