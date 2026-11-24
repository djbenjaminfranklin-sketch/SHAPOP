import { describe, it, expect, vi, afterEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
})

import { signAirwallexWebhook, verifyAirwallexWebhook, normalizeIsraeliIban, airwallexConfig } from '../payments/airwallex'
import { providerForCountry } from '../payments/provider'

const env = { ...process.env }
afterEach(() => { process.env = { ...env } })

describe('Airwallex : signature des webhooks', () => {
  it('hex(HMAC-SHA256(secret, timestamp + corps)) — valeur calculée à part en Python', () => {
    expect(signAirwallexWebhook('whsec_test', '1700000000000', '{"id":"evt_1"}'))
      .toBe('fd578f61dc320098a71f161935b1f994e1c60cf54968efd6c6e533566b8cb503')
  })
  it('accepte une signature récente et refuse corps modifié ou vieux message', () => {
    process.env.AIRWALLEX_WEBHOOK_SECRET = 'whsec_test'
    const ts = String(Date.now())
    const body = '{"id":"evt_2","name":"payment_intent.succeeded"}'
    const sig = signAirwallexWebhook('whsec_test', ts, body)
    expect(verifyAirwallexWebhook({ timestamp: ts, signature: sig, body })).toBe(true)
    expect(verifyAirwallexWebhook({ timestamp: ts, signature: sig, body: body + ' ' })).toBe(false)
    expect(verifyAirwallexWebhook({ timestamp: '1700000000000', signature: signAirwallexWebhook('whsec_test', '1700000000000', body), body })).toBe(false)
  })
})

describe('IBAN israélien', () => {
  it('accepte un IBAN valide (avec espaces / minuscules)', () => {
    expect(normalizeIsraeliIban('il62 0108 0000 0009 9999 999')).toBe('IL620108000000099999999')
  })
  it('refuse une clé de contrôle fausse, un autre pays ou une longueur fausse', () => {
    expect(normalizeIsraeliIban('IL630108000000099999999')).toBeNull()
    expect(normalizeIsraeliIban('FR7630006000011234567890189')).toBeNull()
    expect(normalizeIsraeliIban('IL62010800000009999999')).toBeNull()
  })
})

describe('aiguillage : Israël → Airwallex quand il est activé', () => {
  it('éteint → Stripe partout', () => {
    delete process.env.AIRWALLEX_ENABLED; delete process.env.RAPYD_ENABLED
    expect(airwallexConfig().enabled).toBe(false)
    expect(providerForCountry('IL')).toBe('stripe')
  })
  it('activé → IL sur Airwallex (même si Rapyd est aussi activé), le reste sur Stripe', () => {
    process.env.AIRWALLEX_ENABLED = 'true'; process.env.AIRWALLEX_CLIENT_ID = 'c'; process.env.AIRWALLEX_API_KEY = 'k'
    process.env.RAPYD_ENABLED = 'true'; process.env.RAPYD_ACCESS_KEY = 'a'; process.env.RAPYD_SECRET_KEY = 's'
    expect(providerForCountry('IL')).toBe('airwallex')
    expect(providerForCountry('FR')).toBe('stripe')
  })
})
