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
    .replace(/[̀-ͯ]/g, '')        // accents latins
    .replace(/[֑-ׇ]/g, '')        // te'amim et niqqud hébreux
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')         // ponctuation, espaces, émojis
}

export function isCorrect(given: string, expected: string): boolean {
  const g = normalizeAnswer(given)
  return g.length > 0 && g === normalizeAnswer(expected)
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
