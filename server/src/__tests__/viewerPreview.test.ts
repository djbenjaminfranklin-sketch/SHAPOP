import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { AddressInfo } from 'net'
import type { Server } from 'http'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
  process.env.ADMIN_EMAILS = 'admin@test.dev'
  process.env.LIVEKIT_API_KEY = 'lk_key_test'
  process.env.LIVEKIT_API_SECRET = 'lk_secret_test_lk_secret_test_lk_secret_test'
  process.env.LIVEKIT_URL = 'wss://livekit.test'
})

// Clients Stripe ayant une carte enregistrée (même critère que /api/stripe/check-card)
const { cardCustomers, removeParticipant } = vi.hoisted(() => ({
  cardCustomers: new Set<string>(),
  removeParticipant: vi.fn(async (_room: string, _identity: string) => ({})),
}))

vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>()
  const { fakeDb } = await import('./helpers/fakeSupabase')
  return {
    ...actual,
    supabase: fakeDb,
    resend: null,
    livekitRoomService: { removeParticipant },
    stripe: {
      paymentMethods: {
        list: async ({ customer }: { customer: string }) => ({ data: cardCustomers.has(customer) ? [{ id: 'pm_test' }] : [] }),
      },
    },
  }
})

import express from 'express'
import { fakeDb } from './helpers/fakeSupabase'
import streamRoutes from '../routes/streams'
import { FREE_PREVIEW_SECONDS } from '../config'
import { clearPreviewKicks, previewRemainingSeconds, schedulePreviewKick } from '../viewerPreview'

const SELLER = 'seller-1'
const COHOST = 'cohost-1'
const VIEWER = 'viewer-1'
const CARD_VIEWER = 'viewer-card'
const ADMIN = 'admin-1'
const STREAM = '33333333-3333-4333-8333-333333333333'
const OTHER_STREAM = '44444444-4444-4444-8444-444444444444'

let server: Server
let base = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use(streamRoutes)
  server = app.listen(0)
  await new Promise(r => server.once('listening', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => { server?.close(); clearPreviewKicks() })

beforeEach(() => {
  clearPreviewKicks()
  removeParticipant.mockClear()
  cardCustomers.clear()
  cardCustomers.add('cus_card')
  fakeDb.reset()
  for (const [id, email] of [[SELLER, 'seller@test.dev'], [COHOST, 'cohost@test.dev'], [VIEWER, 'viewer@test.dev'], [CARD_VIEWER, 'card@test.dev'], [ADMIN, 'admin@test.dev']]) {
    fakeDb.users[id] = { id, email }
  }
  fakeDb.table('profiles').push(
    { id: SELLER, is_banned: false, stripe_customer_id: null },
    { id: COHOST, is_banned: false, stripe_customer_id: null },
    { id: VIEWER, is_banned: false, stripe_customer_id: 'cus_nocard' },
    { id: CARD_VIEWER, is_banned: false, stripe_customer_id: 'cus_card' },
    { id: ADMIN, is_banned: false, stripe_customer_id: null },
  )
  fakeDb.table('streams').push(
    { id: STREAM, seller_id: SELLER, cohost_id: COHOST, livekit_room_name: `stream-${STREAM}`, status: 'live' },
    { id: OTHER_STREAM, seller_id: SELLER, cohost_id: null, livekit_room_name: `stream-${OTHER_STREAM}`, status: 'live' },
  )
})

async function getToken(user: string, stream = STREAM) {
  const res = await fetch(`${base}/api/streams/${stream}/livekit-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user}`, 'Content-Type': 'application/json' },
  })
  return { status: res.status, body: await res.json() as Record<string, any> }
}

function jwtLifetime(jwt: string): number {
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
  return payload.exp - Math.floor(Date.now() / 1000)
}

function backdatePreview(user: string, stream: string, seconds: number) {
  const row = fakeDb.table('stream_preview_views').find(r => r.user_id === user && r.stream_id === stream)
  if (!row) throw new Error('aucun aperçu enregistré')
  row.started_at = new Date(Date.now() - seconds * 1000).toISOString()
}

describe('aperçu gratuit des directs (spectateur sans carte)', () => {
  it('la durée par défaut est de 180 secondes', () => {
    expect(FREE_PREVIEW_SECONDS).toBe(180)
  })

  it('sans carte : jeton court + temps restant, aperçu enregistré au premier passage', async () => {
    const r = await getToken(VIEWER)
    expect(r.status).toBe(200)
    expect(r.body.token).toBeTruthy()
    expect(r.body.preview).toEqual({ remaining_seconds: 180, total_seconds: 180 })
    expect(jwtLifetime(r.body.token)).toBeLessThanOrEqual(180 + 30)
    expect(jwtLifetime(r.body.token)).toBeGreaterThan(180)
    expect(fakeDb.table('stream_preview_views')).toHaveLength(1)
  })

  it('sans carte : avant 3 minutes le temps continue (pas de remise à zéro en rouvrant)', async () => {
    await getToken(VIEWER)
    backdatePreview(VIEWER, STREAM, 100)
    const r = await getToken(VIEWER)
    expect(r.status).toBe(200)
    expect(r.body.preview.remaining_seconds).toBe(80)
    expect(fakeDb.table('stream_preview_views')).toHaveLength(1)
  })

  it('sans carte : refus 402 card_required après 3 minutes', async () => {
    await getToken(VIEWER)
    backdatePreview(VIEWER, STREAM, 181)
    const r = await getToken(VIEWER)
    expect(r.status).toBe(402)
    expect(r.body).toMatchObject({ error: 'card_required', remaining_seconds: 0 })
    expect(r.body.token).toBeUndefined()
  })

  it("l'aperçu est compté par direct", async () => {
    await getToken(VIEWER)
    backdatePreview(VIEWER, STREAM, 500)
    const r = await getToken(VIEWER, OTHER_STREAM)
    expect(r.status).toBe(200)
    expect(r.body.preview.remaining_seconds).toBe(180)
  })

  it('avec carte : toujours un jeton normal, même après 3 minutes', async () => {
    fakeDb.table('stream_preview_views').push({ user_id: CARD_VIEWER, stream_id: STREAM, started_at: new Date(Date.now() - 3600_000).toISOString() })
    const r = await getToken(CARD_VIEWER)
    expect(r.status).toBe(200)
    expect(r.body.preview).toBeUndefined()
    expect(jwtLifetime(r.body.token)).toBeGreaterThan(6 * 3600 - 5)
  })

  it('carte ajoutée après la fin de l’aperçu : le direct reprend', async () => {
    await getToken(VIEWER)
    backdatePreview(VIEWER, STREAM, 300)
    expect((await getToken(VIEWER)).status).toBe(402)
    cardCustomers.add('cus_nocard')
    const r = await getToken(VIEWER)
    expect(r.status).toBe(200)
    expect(r.body.preview).toBeUndefined()
  })

  it('vendeur, co-hôte et administrateur exemptés (sans carte)', async () => {
    for (const user of [SELLER, COHOST, ADMIN]) {
      fakeDb.table('stream_preview_views').push({ user_id: user, stream_id: STREAM, started_at: new Date(Date.now() - 3600_000).toISOString() })
      const r = await getToken(user)
      expect(r.status, user).toBe(200)
      expect(r.body.preview, user).toBeUndefined()
    }
  })
})

describe('coupure dans la salle LiveKit', () => {
  afterEach(() => { vi.useRealTimers() })

  it('retire le spectateur (lecteur et mini-lecteur) à la fin de l’aperçu', async () => {
    vi.useFakeTimers()
    const svc = { removeParticipant: vi.fn(async () => ({})) }
    schedulePreviewKick('room-1', VIEWER, 180_000, svc)
    await vi.advanceTimersByTimeAsync(179_000)
    expect(svc.removeParticipant).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(svc.removeParticipant).toHaveBeenCalledWith('room-1', `viewer-${VIEWER}`)
    expect(svc.removeParticipant).toHaveBeenCalledWith('room-1', `viewer-pip-${VIEWER}`)
  })

  it('la route programme la coupure, annulée si la carte est ajoutée entre-temps', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await getToken(VIEWER)
    cardCustomers.add('cus_nocard')
    await getToken(VIEWER)
    await vi.advanceTimersByTimeAsync(181_000)
    expect(removeParticipant).not.toHaveBeenCalled()
  })

  it('la route programme bien la coupure sans carte', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await getToken(VIEWER)
    await vi.advanceTimersByTimeAsync(181_000)
    expect(removeParticipant).toHaveBeenCalledWith(`stream-${STREAM}`, `viewer-${VIEWER}`)
  })

  it('calcul du temps restant', () => {
    const now = Date.parse('2026-11-23T12:00:00Z')
    expect(previewRemainingSeconds('2026-11-23T12:00:00Z', now, 180)).toBe(180)
    expect(previewRemainingSeconds('2026-11-23T11:58:00Z', now, 180)).toBe(60)
    expect(previewRemainingSeconds('2026-11-23T11:50:00Z', now, 180)).toBe(0)
    expect(previewRemainingSeconds('pas une date', now, 180)).toBe(0)
  })
})
