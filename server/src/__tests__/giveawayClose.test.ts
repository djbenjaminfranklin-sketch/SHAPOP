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
import { normalizeAnswer, isCorrect, submitAnswer, MAX_ATTEMPTS } from '../services/giveawayQuiz'

describe('cadeau en question-réponse : comparaison des réponses', () => {
  it('ignore majuscules, accents, ponctuation et espaces', () => {
    expect(isCorrect('  Rouge !', 'rouge')).toBe(true)
    expect(isCorrect('ÉTÉ', 'ete')).toBe(true)
    expect(isCorrect('Tel-Aviv', 'tel aviv')).toBe(true)
  })
  it('ignore les points-voyelles hébreux', () => {
    expect(normalizeAnswer('אָדֹם')).toBe(normalizeAnswer('אדם'))
  })
  it('une réponse vide ou différente est fausse', () => {
    expect(isCorrect('', 'rouge')).toBe(false)
    expect(isCorrect('!!!', '')).toBe(false)
    expect(isCorrect('bleu', 'rouge')).toBe(false)
  })
})

describe('cadeau en question-réponse : le premier juste gagne, jamais de hasard', () => {
  beforeEach(() => {
    fakeDb.reset()
    fakeDb.table('giveaways').push({ id: 'G', status: 'active', stream_id: 'S', seller_id: 'V', title: 'Cadeau', entry_count: 0 })
    fakeDb.table('giveaway_answers').push({ giveaway_id: 'G', answer: 'Rouge' })
    fakeDb.table('profiles').push({ id: 'A', display_name: 'Alice' }, { id: 'B', display_name: 'Bob' })
  })
  it('mauvaise réponse : pas de gagnant, essais décomptés', async () => {
    expect(await submitAnswer('G', 'A', 'bleu')).toEqual({ status: 'wrong', attempts_left: MAX_ATTEMPTS - 1 })
    expect(fakeDb.table('giveaways')[0].status).toBe('active')
  })
  it('bonne réponse : gagne, puis le suivant arrive trop tard', async () => {
    expect(await submitAnswer('G', 'A', ' rouge ')).toEqual({ status: 'won' })
    expect(fakeDb.table('giveaways')[0]).toMatchObject({ status: 'drawn', winner_id: 'A', winner_name: 'Alice' })
    expect(await submitAnswer('G', 'B', 'rouge')).toEqual({ status: 'closed' })
  })
  it(`${MAX_ATTEMPTS} essais au maximum par personne`, async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) await submitAnswer('G', 'A', 'non')
    expect(await submitAnswer('G', 'A', 'rouge')).toEqual({ status: 'no_attempts_left' })
    expect(fakeDb.table('giveaways')[0].status).toBe('active')
  })
})

describe('question toute prête pour le vendeur (28/11/2026)', () => {
  it('variantes de réponse acceptées (chiffre ou lettres)', async () => {
    const { isCorrect } = await import('../services/giveawayQuiz')
    expect(isCorrect('7', '7|sept')).toBe(true)
    expect(isCorrect('Sept', '7|sept')).toBe(true)
    expect(isCorrect('huit', '7|sept')).toBe(false)
  })
  it('sans IA : une question de la liste, dans la langue demandée, avec sa réponse', async () => {
    const { suggestQuestion, QUESTION_BANK } = await import('../services/giveawayQuiz')
    const saved = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    const s = await suggestQuestion('he')
    process.env.ANTHROPIC_API_KEY = saved
    expect(s.source).toBe('bank')
    expect(QUESTION_BANK.he.map(q => q.question)).toContain(s.question)
    expect(s.answer.length).toBeGreaterThan(0)
  })
})
