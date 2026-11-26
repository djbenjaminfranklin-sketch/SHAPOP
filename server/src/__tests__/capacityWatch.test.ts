import { describe, it, expect, vi } from 'vitest'
vi.mock('../config', () => ({ supabase: {}, livekitRoomService: null }))
vi.mock('../services/orderLifecycle', () => ({ alertAdmins: vi.fn() }))
import { overHalf } from '../services/capacityWatch'

const base = { livekitParticipants: 0, livekitMinutes: 0, realtime: 0, memoryMb: 150, cpu: 0, dbConnections: 15, dbMax: 60 }
describe('overHalf (alerte à la moitié de la capacité)', () => {
  it('rien en dessous de la moitié', () => {
    expect(overHalf({ ...base, livekitParticipants: 49 })).toEqual([])
  })
  it('alerte dès la moitié exacte', () => {
    expect(overHalf({ ...base, livekitParticipants: 50 }).map((h) => h.key)).toEqual(['livekitParticipants'])
  })
  it('chaque limite est surveillée', () => {
    const keys = overHalf({ livekitParticipants: 60, livekitMinutes: 2600, realtime: 300, memoryMb: 300, cpu: 0.3, dbConnections: 31, dbMax: 60 }).map((h) => h.key)
    expect(keys).toEqual(['livekitParticipants', 'livekitMinutes', 'realtime', 'dbConnections', 'memoryMb', 'cpu'])
  })
})
