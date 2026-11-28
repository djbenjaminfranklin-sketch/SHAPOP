// Cadeaux en question-réponse (28/11/2026). Le premier spectateur qui donne la bonne réponse gagne :
// c'est l'habileté et la rapidité qui décident, pas le hasard (les loteries sont interdites en Israël,
// même gratuites). Participation gratuite, sans achat. 3 essais par personne.
import { supabase } from '../config'

export const MAX_ATTEMPTS = 3
export const MAX_TEXT = 200

/** Réponse comparable : minuscules, sans accents ni points-voyelles hébreux, sans ponctuation ni espaces. */
export function normalizeAnswer(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')        // accents latins
    .replace(/[\u0591-\u05C7]/g, '')        // te'amim et niqqud hébreux
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')         // ponctuation, espaces, émojis
}

/** La bonne réponse peut avoir des variantes séparées par « | » (ex. « 7|sept »). */
export function isCorrect(given: string, expected: string): boolean {
  const g = normalizeAnswer(given)
  return g.length > 0 && expected.split('|').some(e => normalizeAnswer(e) === g)
}

// ---------------------------------------------------------------------------------------------
// Question toute prête pour le vendeur (28/11/2026) : en direct, il n'a pas le temps d'en écrire une.
// L'IA propose une question FACILE de la vie de tous les jours, réponse d'un mot ou d'un chiffre.
// Si l'IA ne répond pas, une liste de questions toutes prêtes prend le relais.
// ---------------------------------------------------------------------------------------------
export type QuizLang = 'en' | 'fr' | 'es' | 'ru' | 'he'
export type Suggestion = { question: string; answer: string }
const LANG_NAMES: Record<QuizLang, string> = { en: 'English', fr: 'French', es: 'Spanish', ru: 'Russian', he: 'Hebrew' }

export const QUESTION_BANK: Record<QuizLang, Suggestion[]> = {
  en: [
    { question: 'How many days are there in a week?', answer: '7|seven' },
    { question: 'What colour is a banana?', answer: 'yellow' },
    { question: 'How many legs does a cat have?', answer: '4|four' },
    { question: 'Which animal says "meow"?', answer: 'cat|a cat' },
    { question: 'What do bees make?', answer: 'honey' },
    { question: 'How many hours are there in a day?', answer: '24|twenty-four|twenty four' },
    { question: 'What colour is the sky on a sunny day?', answer: 'blue' },
    { question: 'How many months are there in a year?', answer: '12|twelve' },
  ],
  fr: [
    { question: 'Combien y a-t-il de jours dans une semaine ?', answer: '7|sept' },
    { question: 'De quelle couleur est une banane ?', answer: 'jaune' },
    { question: 'Combien de pattes a un chat ?', answer: '4|quatre' },
    { question: 'Quel animal fait « miaou » ?', answer: 'chat|le chat|un chat' },
    { question: 'Que fabriquent les abeilles ?', answer: 'miel|du miel|le miel' },
    { question: 'Combien y a-t-il d’heures dans une journée ?', answer: '24|vingt-quatre|vingt quatre' },
    { question: 'De quelle couleur est le ciel quand il fait beau ?', answer: 'bleu' },
    { question: 'Combien y a-t-il de mois dans une année ?', answer: '12|douze' },
  ],
  es: [
    { question: '¿Cuántos días tiene una semana?', answer: '7|siete' },
    { question: '¿De qué color es un plátano?', answer: 'amarillo' },
    { question: '¿Cuántas patas tiene un gato?', answer: '4|cuatro' },
    { question: '¿Qué animal dice «miau»?', answer: 'gato|el gato|un gato' },
    { question: '¿Qué fabrican las abejas?', answer: 'miel|la miel' },
    { question: '¿Cuántas horas tiene un día?', answer: '24|veinticuatro' },
    { question: '¿De qué color es el cielo en un día soleado?', answer: 'azul' },
    { question: '¿Cuántos meses tiene un año?', answer: '12|doce' },
  ],
  ru: [
    { question: 'Сколько дней в неделе?', answer: '7|семь' },
    { question: 'Какого цвета банан?', answer: 'желтый|жёлтый' },
    { question: 'Сколько лап у кошки?', answer: '4|четыре' },
    { question: 'Какое животное говорит «мяу»?', answer: 'кошка|кот' },
    { question: 'Что делают пчёлы?', answer: 'мед|мёд' },
    { question: 'Сколько часов в сутках?', answer: '24|двадцать четыре' },
    { question: 'Какого цвета небо в солнечный день?', answer: 'голубой|синий' },
    { question: 'Сколько месяцев в году?', answer: '12|двенадцать' },
  ],
  he: [
    { question: 'כמה ימים יש בשבוע?', answer: '7|שבעה|שבע' },
    { question: 'באיזה צבע הבננה?', answer: 'צהוב|צהובה' },
    { question: 'כמה רגליים יש לחתול?', answer: '4|ארבע|ארבעה' },
    { question: 'איזו חיה אומרת "מיאו"?', answer: 'חתול|החתול|חתולה' },
    { question: 'מה הדבורים מייצרות?', answer: 'דבש' },
    { question: 'כמה שעות יש ביממה?', answer: '24|עשרים וארבע' },
    { question: 'באיזה צבע השמיים ביום שמשי?', answer: 'כחול|תכלת' },
    { question: 'כמה חודשים יש בשנה?', answer: '12|שנים עשר|שנים-עשר' },
  ],
}

export function bankSuggestion(lang: QuizLang, avoid: string[] = []): Suggestion {
  const list = QUESTION_BANK[lang] || QUESTION_BANK.en
  const fresh = list.filter(q => !avoid.includes(q.question))
  const pool = fresh.length ? fresh : list
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Question facile proposée par l'IA (réponse : un mot ou un chiffre, avec variantes « | »). */
export async function suggestQuestion(lang: QuizLang, avoid: string[] = []): Promise<Suggestion & { source: 'ai' | 'bank' }> {
  const key = process.env.ANTHROPIC_API_KEY
  if (key) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 6000)
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: process.env.AI_QUIZ_MODEL || 'claude-haiku-5-5',
          max_tokens: 200,
          messages: [{ role: 'user', content: `Write ONE very easy everyday quiz question for a friendly live-shopping game, in ${LANG_NAMES[lang]}. Anyone (adults, any country) must know the answer instantly: daily life, food, colours, animals, numbers, calendar. No politics, religion, brands, people, trick questions or anything offensive. The answer must be ONE short word or a number. Give accepted variants of the answer separated by "|" (e.g. the number in digits and in words, with and without article).${avoid.length ? ` Do not repeat these questions: ${avoid.slice(-10).join(' / ')}.` : ''}
Return ONLY JSON: {"question": "...", "answer": "variant1|variant2"}` }],
        }),
      })
      clearTimeout(timer)
      const data = await resp.json() as { content?: { text?: string }[] }
      const m = (data.content?.[0]?.text || '').match(/\{[\s\S]*\}/)
      if (m) {
        const j = JSON.parse(m[0]) as { question?: unknown; answer?: unknown }
        const question = String(j.question || '').trim().slice(0, MAX_TEXT)
        const answer = String(j.answer || '').trim().slice(0, MAX_TEXT)
        if (question && answer && answer.split('|').some(a => normalizeAnswer(a))) return { question, answer, source: 'ai' }
      }
    } catch { /* IA indisponible : liste toute prête */ }
  }
  return { ...bankSuggestion(lang, avoid), source: 'bank' }
}

export type AnswerResult =
  | { status: 'not_found' | 'closed' | 'no_attempts_left' | 'empty' }
  | { status: 'wrong'; attempts_left: number }
  | { status: 'won' }
  | { status: 'too_late' }

/** Traite une réponse. Le gagnant est fixé de façon atomique : un seul « won » même si deux bonnes réponses arrivent ensemble. */
export async function submitAnswer(giveawayId: string, userId: string, answer: string): Promise<AnswerResult> {
  if (!answer || !answer.trim()) return { status: 'empty' }
  const { data: gw } = await supabase.from('giveaways')
    .select('id, status, stream_id, seller_id, title, entry_count').eq('id', giveawayId).maybeSingle()
  if (!gw) return { status: 'not_found' }
  if (gw.status !== 'active') return { status: 'closed' }

  // Essais : une ligne par participant
  const { data: entry } = await supabase.from('giveaway_entries')
    .select('id, attempts').eq('giveaway_id', giveawayId).eq('user_id', userId).maybeSingle()
  const used = entry?.attempts || 0
  if (used >= MAX_ATTEMPTS) return { status: 'no_attempts_left' }
  const { data: profile } = await supabase.from('profiles').select('display_name, username').eq('id', userId).maybeSingle()
  const name = profile?.display_name || profile?.username || 'Unknown'
  if (entry) {
    await supabase.from('giveaway_entries').update({ attempts: used + 1 }).eq('id', entry.id)
  } else {
    await supabase.from('giveaway_entries').insert({ giveaway_id: giveawayId, user_id: userId, display_name: name, attempts: 1 })
    await supabase.from('giveaways').update({ entry_count: (gw.entry_count || 0) + 1 }).eq('id', giveawayId)
  }

  const { data: ans } = await supabase.from('giveaway_answers').select('answer').eq('giveaway_id', giveawayId).maybeSingle()
  if (!ans || !isCorrect(answer, ans.answer)) return { status: 'wrong', attempts_left: MAX_ATTEMPTS - (used + 1) }

  const { data: won } = await supabase.from('giveaways').update({
    status: 'drawn', winner_id: userId, winner_name: name, drawn_at: new Date().toISOString(),
  }).eq('id', giveawayId).eq('status', 'active').select('id')
  if (!won?.length) return { status: 'too_late' }

  await supabase.from('chat_messages').insert({
    stream_id: gw.stream_id, user_id: gw.seller_id, type: 'system',
    // Code traduit par l'app dans la langue de chaque spectateur (client/src/lib/chatSystem.ts)
    message: `__system:gift_won:${encodeURIComponent(name)}:${encodeURIComponent(gw.title || '')}__`,
  })
  return { status: 'won' }
}
