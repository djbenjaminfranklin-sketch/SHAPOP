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
  it('vendeur absent une fois : on attend le contrôle suivant', () => {
    expect(shouldEndLive(['viewer-x'], 0)).toEqual({ end: false, misses: 1 })
  })
  it('vendeur absent deux fois de suite (ou salle supprimée) : on termine', () => {
    expect(shouldEndLive(['viewer-x'], 1)).toEqual({ end: true, misses: 2 })
    expect(shouldEndLive(null, 1)).toEqual({ end: true, misses: 2 })
  })
})
