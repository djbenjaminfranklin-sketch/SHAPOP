import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
})

import { signRapydRequest, signRapydWebhook, rapydBody, verifyRapydWebhook, rapydConfig } from '../payments/rapyd'
import { providerForCountry } from '../payments/provider'

// Valeurs attendues calculées À PART en Python (hmac sha256 → hex → base64), pas avec ce code.
describe('signature Rapyd', () => {
  it('requête sans corps (corps vide = "")', () => {
    expect(signRapydRequest({ method: 'GET', path: '/v1/data/countries', salt: 'abcd1234efgh', timestamp: '1700000000', accessKey: 'AK_TEST', secretKey: 'SK_TEST', body: '' }))
      .toBe('ZjFmMmQ5ZmE2NTMwYzNlYzc4MzIwOTE2YjE0ODU0Y2UwMGEwMThlNjA1MjNjY2IxMTE5ZjYyOTQ0ZGFhNTBiZA==')
  })
  it('requête avec corps JSON sans espaces', () => {
    const body = rapydBody({ amount: 12.5, currency: 'ILS' })
    expect(body).toBe('{"amount":12.5,"currency":"ILS"}')
    expect(signRapydRequest({ method: 'POST', path: '/v1/payments', salt: 'salt5678salt', timestamp: '1700000001', accessKey: 'AK_TEST', secretKey: 'SK_TEST', body }))
      .toBe('Nzk1NGNmNGRmNzQ1ZjZjYjlkZWZhMjY4NmNjNmVjMzg4ZjY1NjNlNzBhMTM3YzU2MjNkYTYwNjE2MzJjN2M0NA==')
  })
  it('webhook : adresse complète, sans méthode', () => {
    expect(signRapydWebhook({ url: 'https://x.test/hook', salt: 's1', timestamp: '1700000002', accessKey: 'AK_TEST', secretKey: 'SK_TEST', body: '{"id":"wh_1"}' }))
      .toBe('YWRkMzE2ZmQzYmVlZWNlNGVkMzEwNWNjNzBlZGQ5YjU3MTA2YzIyZTNjNjFkNDkwNDk2YTJmZTQyODAwZDYxYQ==')
  })
  it('corps absent → chaîne vide', () => {
    expect(rapydBody(undefined)).toBe('')
  })
})

describe('vérification des webhooks Rapyd', () => {
  const env = { ...process.env }
  beforeEach(() => { process.env.RAPYD_ACCESS_KEY = 'AK_TEST'; process.env.RAPYD_SECRET_KEY = 'SK_TEST' })
  afterEach(() => { process.env = { ...env } })
  it('accepte une signature valide et récente, refuse le reste', () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const body = '{"id":"wh_2","type":"PAYMENT_CAPTURED"}'
    const sig = signRapydWebhook({ url: 'https://x.test/hook', salt: 'abc', timestamp: ts, accessKey: 'AK_TEST', secretKey: 'SK_TEST', body })
    expect(verifyRapydWebhook({ url: 'https://x.test/hook', salt: 'abc', timestamp: ts, signature: sig, body })).toBe(true)
    expect(verifyRapydWebhook({ url: 'https://x.test/hook', salt: 'abc', timestamp: ts, signature: sig, body: body + ' ' })).toBe(false)
    expect(verifyRapydWebhook({ url: 'https://x.test/hook', salt: 'abc', timestamp: '1000', signature: sig, body })).toBe(false)
  })
})

describe('aiguillage Israël → Rapyd, autres pays → Stripe', () => {
  const env = { ...process.env }
  afterEach(() => { process.env = { ...env } })
  it('tout reste sur Stripe tant que Rapyd est éteint', () => {
    delete process.env.RAPYD_ENABLED
    expect(rapydConfig().enabled).toBe(false)
    expect(providerForCountry('IL')).toBe('stripe')
    expect(providerForCountry('FR')).toBe('stripe')
  })
  it('Rapyd activé : Israël → Rapyd, le reste → Stripe', () => {
    process.env.RAPYD_ENABLED = 'true'; process.env.RAPYD_ACCESS_KEY = 'AK'; process.env.RAPYD_SECRET_KEY = 'SK'
    expect(providerForCountry('IL')).toBe('rapyd')
    expect(providerForCountry('il')).toBe('rapyd')
    expect(providerForCountry('FR')).toBe('stripe')
    expect(providerForCountry('ES')).toBe('stripe')
    expect(providerForCountry(null)).toBe('stripe')
  })
  it('activé sans clés → reste éteint', () => {
    process.env.RAPYD_ENABLED = 'true'; delete process.env.RAPYD_ACCESS_KEY; delete process.env.RAPYD_SECRET_KEY
    expect(providerForCountry('IL')).toBe('stripe')
  })
})
