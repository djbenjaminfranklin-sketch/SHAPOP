import { describe, it, expect } from 'vitest'
import { isAuctionExpired } from '../services/auctionExpiry'

const start = '2026-11-25T10:00:00Z'
const t = (s: number) => Date.parse(start) + s * 1000
describe('enchère échue (clôture par le serveur)', () => {
  it('pas avant la fin + 3 s de marge', () => {
    expect(isAuctionExpired(start, 60, t(60))).toBe(false)
    expect(isAuctionExpired(start, 60, t(63))).toBe(false)
  })
  it('échue au-delà', () => {
    expect(isAuctionExpired(start, 60, t(64))).toBe(true)
  })
  it('mort subite ou durée absente : jamais par le serveur', () => {
    expect(isAuctionExpired(start, -1, t(999))).toBe(false)
    expect(isAuctionExpired(null, 60, t(999))).toBe(false)
  })
})
