import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
})

vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>()
  const { fakeDb } = await import('./helpers/fakeSupabase')
  return { ...actual, supabase: fakeDb, resend: null }
})

import { fakeDb } from './helpers/fakeSupabase'
import {
  LANGS, MESSAGES, clearLangCache, getUserLang, getUsersLangs, localized, money, msg, normalizeLang, type MsgKey,
} from '../i18n'
import { buildOrderConfirmationEmail, buildPaymentReminderEmail } from '../utils'

const placeholders = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]))

describe('dictionnaire des notifications et e-mails', () => {
  it('a les 5 langues dans l’ordre en, fr, es, ru, he', () => {
    expect([...LANGS]).toEqual(['en', 'fr', 'es', 'ru', 'he'])
    expect(Object.keys(MESSAGES)).toEqual(['en', 'fr', 'es', 'ru', 'he'])
  })

  it('chaque clé existe, non vide, dans les 5 langues', () => {
    const allKeys = new Set(LANGS.flatMap(l => Object.keys(MESSAGES[l])))
    for (const lang of LANGS) {
      for (const key of allKeys) {
        const value = (MESSAGES[lang] as Record<string, string>)[key]
        expect(value, `${lang} : clé « ${key} » manquante`).toBeTypeOf('string')
        expect(value.trim().length, `${lang} : clé « ${key} » vide`).toBeGreaterThan(0)
      }
    }
  })

  it('chaque paramètre {x} est le même dans les 5 langues', () => {
    for (const key of Object.keys(MESSAGES.en) as MsgKey[]) {
      const ref = [...placeholders(MESSAGES.en[key])].sort()
      for (const lang of LANGS) {
        expect([...placeholders(MESSAGES[lang][key])].sort(), `${lang} : paramètres de « ${key} »`).toEqual(ref)
      }
    }
  })

  it('aucun montant en dur (€ / EUR / ₪) dans les textes', () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(MESSAGES[lang])) {
        expect(/€|EUR|₪|\$/.test(value), `${lang} : « ${key} » contient une devise en dur`).toBe(false)
      }
    }
  })

  it('msg remplace les paramètres, formate les montants dans la locale et traduit les replis', () => {
    expect(msg('en', 'itemSold.body', { item: 'Jacket', amount: money(12.5, 'USD') })).toBe('“Jacket” was bought for $12.50.')
    expect(msg('fr', 'itemSold.body', { item: 'Veste', amount: money(12.5, 'EUR') })).toMatch(/^« Veste » a été acheté pour 12,50\s€\.$/)
    expect(msg('he', 'message.body', { name: localized('fallback.someone') })).toContain('מישהו')
    expect(msg('es', 'orderPaid.title', { ref: 'AB12CD34' })).toBe('Pedido AB12CD34 pagado')
  })
})

describe('langue du destinataire', () => {
  beforeEach(() => {
    fakeDb.reset()
    clearLangCache()
  })

  it('normalizeLang : codes régionaux, ancien code hébreu, inconnu → anglais', () => {
    expect(normalizeLang('fr-FR')).toBe('fr')
    expect(normalizeLang('RU')).toBe('ru')
    expect(normalizeLang('iw')).toBe('he')
    expect(normalizeLang('de')).toBe('en')
    expect(normalizeLang('')).toBe('en')
    expect(normalizeLang(null)).toBe('en')
  })

  it('getUserLang lit profiles.language et retombe sur l’anglais', async () => {
    fakeDb.table('profiles').push(
      { id: 'u-he', language: 'he' },
      { id: 'u-es', language: 'es-ES' },
      { id: 'u-none', language: null },
      { id: 'u-de', language: 'de' },
    )
    expect(await getUserLang('u-he')).toBe('he')
    expect(await getUserLang('u-es')).toBe('es')
    expect(await getUserLang('u-none')).toBe('en')
    expect(await getUserLang('u-de')).toBe('en')
    expect(await getUserLang('inconnu')).toBe('en')
  })

  it('getUsersLangs renvoie une langue pour chaque id', async () => {
    fakeDb.table('profiles').push({ id: 'a', language: 'ru' }, { id: 'b', language: 'fr' })
    const langs = await getUsersLangs(['a', 'b', 'c'])
    expect(langs.get('a')).toBe('ru')
    expect(langs.get('b')).toBe('fr')
    expect(langs.get('c')).toBe('en')
  })
})

describe('e-mails', () => {
  it('hébreu : dir="rtl" + lang, données utilisateur échappées, montant dans la devise de la commande', () => {
    const { subject, html } = buildOrderConfirmationEmail('he', {
      id: 'abcdef12-0000', itemTitle: '<b>תיק</b>', amount: 100, currency: 'ILS', sellerName: 'Dana & Co',
    })
    expect(subject).toContain('ההזמנה אושרה')
    expect(html).toContain('lang="he" dir="rtl"')
    expect(html).toContain('&lt;b&gt;תיק&lt;/b&gt;')
    expect(html).toContain('Dana &amp; Co')
    expect(html).toContain('₪')
    expect(html).not.toContain('EUR')
  })

  it('autres langues : lang sans rtl', () => {
    const { html } = buildPaymentReminderEmail('es', { orderId: 'abcdef12', itemTitle: null, amount: 9, currency: 'EUR' })
    expect(html).toContain('lang="es"')
    expect(html).not.toContain('rtl')
    expect(html).toContain('Artículo')
    expect(html).toContain('Recordatorio de pago')
  })
})
