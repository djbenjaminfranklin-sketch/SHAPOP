import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { AddressInfo } from 'net'
import type { Server } from 'http'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
  process.env.ADMIN_EMAILS = 'admin@test.dev'
})

vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>()
  const { fakeDb } = await import('./helpers/fakeSupabase')
  return { ...actual, supabase: fakeDb, resend: null }
})

import express from 'express'
import { fakeDb } from './helpers/fakeSupabase'
import adminRoutes from '../routes/admin'
import itemRoutes from '../routes/items'

const ADMIN = 'admin-1'
const USER = 'user-1'
const SELLER = 'seller-1'
const ITEM = '22222222-2222-4222-8222-222222222222'
const REPORT = '33333333-3333-4333-8333-333333333333'

let server: Server
let base = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use(adminRoutes)
  app.use(itemRoutes)
  server = app.listen(0)
  await new Promise(r => server.once('listening', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => { server?.close() })

beforeEach(() => {
  fakeDb.reset()
  fakeDb.users[ADMIN] = { id: ADMIN, email: 'admin@test.dev' }
  fakeDb.users[USER] = { id: USER, email: 'user@test.dev' }
  fakeDb.users[SELLER] = { id: SELLER, email: 'seller@test.dev' }
  fakeDb.table('profiles').push(
    { id: ADMIN, display_name: 'Admin', is_banned: false, is_suspended: false },
    { id: USER, display_name: 'Client', is_banned: false, is_suspended: false },
    { id: SELLER, display_name: 'Vendeur', is_banned: false, is_suspended: false },
  )
  fakeDb.table('items').push({
    id: ITEM, seller_id: SELLER, title: '[ABCD] Veste', status: 'active', current_price: 10,
    stream_id: null, ai_generated: true, moderation_status: null, winner_id: null,
  })
  fakeDb.table('reports').push({ id: REPORT, reporter_id: USER, reported_id: SELLER, reason: 'Contrefaçon', item_id: ITEM, status: 'open' })
})

async function call(method: string, path: string, user: string | null, body?: unknown) {
  const resp = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: resp.status, body: await resp.json().catch(() => ({})) as Record<string, any> }
}

const NEW_ADMIN_ENDPOINTS: [string, string][] = [
  ['GET', '/api/admin/dashboard'],
  ['GET', '/api/admin/users-search'],
  ['GET', `/api/admin/users/${SELLER}/full`],
  ['GET', '/api/admin/reports'],
  ['POST', `/api/admin/reports/${REPORT}/resolve`],
  ['POST', '/api/admin/contact-messages/x/status'],
  ['GET', '/api/admin/items'],
  ['POST', `/api/admin/items/${ITEM}/hide`],
  ['POST', `/api/admin/items/${ITEM}/unhide`],
  ['POST', `/api/admin/items/${ITEM}/delete`],
  ['GET', '/api/admin/orders-search'],
  ['GET', '/api/admin/orders/44444444-4444-4444-8444-444444444444'],
  ['GET', '/api/admin/streams-history'],
  ['GET', '/api/admin/search?q=test'],
]

describe('Admin web : autorisation', () => {
  for (const [method, path] of NEW_ADMIN_ENDPOINTS) {
    it(`${method} ${path} → 401 sans jeton`, async () => {
      const r = await call(method, path, null, method === 'POST' ? { action: 'dismiss', reason: 'x' } : undefined)
      expect(r.status).toBe(401)
    })
    it(`${method} ${path} → 403 pour un non-admin`, async () => {
      const r = await call(method, path, USER, method === 'POST' ? { action: 'ban', reason: 'x', status: 'closed' } : undefined)
      expect(r.status).toBe(403)
    })
  }

  it('un non-admin ne peut pas masquer un article (rien ne change)', async () => {
    await call('POST', `/api/admin/items/${ITEM}/hide`, USER, { reason: 'test' })
    expect(fakeDb.table('items')[0].moderation_status).toBeNull()
    expect(fakeDb.table('admin_audit_log')).toHaveLength(0)
  })
})

describe('Admin web : modération des articles', () => {
  it('masquer exige une raison', async () => {
    const r = await call('POST', `/api/admin/items/${ITEM}/hide`, ADMIN, {})
    expect(r.status).toBe(400)
    expect(fakeDb.table('items')[0].moderation_status).toBeNull()
  })

  it('masquer → caché du public (vente directe, fiche, enchère), journalisé ; démasquer → revient', async () => {
    const before = await call('GET', '/api/items/direct-sales', null)
    expect(before.body.map((i: any) => i.id)).toContain(ITEM)

    const r = await call('POST', `/api/admin/items/${ITEM}/hide`, ADMIN, { reason: 'Photo trompeuse' })
    expect(r.status).toBe(200)
    expect(fakeDb.table('items')[0].moderation_status).toBe('hidden')
    expect(fakeDb.table('items')[0].moderation_reason).toBe('Photo trompeuse')
    expect(fakeDb.table('admin_audit_log').map(l => l.action)).toContain('hide_item')

    const list = await call('GET', '/api/items/direct-sales', null)
    expect(list.body.map((i: any) => i.id)).not.toContain(ITEM)
    expect((await call('GET', `/api/items/${ITEM}`, null)).status).toBe(404)
    expect((await call('GET', `/api/items/${ITEM}`, USER)).status).toBe(404)
    expect((await call('GET', `/api/items/${ITEM}`, SELLER)).status).toBe(200)
    expect((await call('POST', `/api/items/${ITEM}/bid`, USER, { amount: 20 })).status).toBe(404)
    expect((await call('POST', `/api/items/${ITEM}/buy-now`, USER, {})).status).toBe(404)

    const u = await call('POST', `/api/admin/items/${ITEM}/unhide`, ADMIN, {})
    expect(u.status).toBe(200)
    expect(fakeDb.table('items')[0].moderation_status).toBeNull()
    const after = await call('GET', '/api/items/direct-sales', null)
    expect(after.body.map((i: any) => i.id)).toContain(ITEM)
  })
})

describe('Admin web : signalements', () => {
  it('action inconnue refusée', async () => {
    const r = await call('POST', `/api/admin/reports/${REPORT}/resolve`, ADMIN, { action: 'nuke' })
    expect(r.status).toBe(400)
  })

  it('retirer l’article signalé : article supprimé (doux), signalement clos, journal', async () => {
    const r = await call('POST', `/api/admin/reports/${REPORT}/resolve`, ADMIN, { action: 'remove_item', note: 'Contrefaçon avérée' })
    expect(r.status).toBe(200)
    expect(fakeDb.table('items')[0].moderation_status).toBe('removed')
    const rep = fakeDb.table('reports')[0]
    expect(rep.status).toBe('resolved')
    expect(rep.resolution_action).toBe('remove_item')
    expect(fakeDb.table('items')).toHaveLength(1) // jamais supprimé physiquement
    expect(fakeDb.table('admin_audit_log').map(l => l.action)).toEqual(expect.arrayContaining(['remove_item', 'resolve_report_remove_item']))
  })

  it('classer sans suite ne touche pas l’utilisateur', async () => {
    const r = await call('POST', `/api/admin/reports/${REPORT}/resolve`, ADMIN, { action: 'dismiss', note: 'RAS' })
    expect(r.status).toBe(200)
    expect(fakeDb.table('reports')[0].status).toBe('dismissed')
    expect(fakeDb.table('profiles').find(p => p.id === SELLER)!.is_suspended).toBe(false)
  })
})
