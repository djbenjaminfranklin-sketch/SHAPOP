import { describe, it, expect } from 'vitest'
import { reserveOfferRefusal } from '../services/reserveOffer'

const END = Date.parse('2026-11-25T10:00:00Z')
const item = { status: 'unsold', stream_id: 's1', min_price: '15', ended_at: '2026-11-25T10:00:00Z' }
const top = { bidder_id: 'acheteur', amount: 7 }

describe('offre « acheter au prix minimum » après un invendu', () => {
  it('autorisée pour le meilleur enchérisseur dans les 60 s', () => {
    expect(reserveOfferRefusal(item, top, 'acheteur', END + 30_000)).toBeNull()
  })
  it('refusée à quelqu’un qui n’est pas le meilleur enchérisseur', () => {
    expect(reserveOfferRefusal(item, top, 'autre', END + 5_000)).toBe('not_top_bidder')
    expect(reserveOfferRefusal(item, null, 'acheteur', END + 5_000)).toBe('not_top_bidder')
  })
  it('refusée après le délai', () => {
    expect(reserveOfferRefusal(item, top, 'acheteur', END + 75_000)).toBe('offer_expired')
  })
  it('refusée si le lot est déjà vendu, sans prix minimum, ou hors live', () => {
    expect(reserveOfferRefusal({ ...item, status: 'sold' }, top, 'acheteur', END)).toBe('offer_unavailable')
    expect(reserveOfferRefusal({ ...item, min_price: null }, top, 'acheteur', END)).toBe('offer_unavailable')
    expect(reserveOfferRefusal({ ...item, stream_id: null }, top, 'acheteur', END)).toBe('offer_unavailable')
  })
})
