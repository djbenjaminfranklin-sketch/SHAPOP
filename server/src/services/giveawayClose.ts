import { supabase } from '../config'

type Entry = { user_id: string; display_name: string | null }

/** Participants éligibles : tous, ou seulement ceux qui ont acheté pendant le live si le cadeau est réservé aux acheteurs. */
export function eligibleEntries(entries: Entry[], buyerIds: Set<string>, buyersOnly: boolean): Entry[] {
  return buyersOnly ? entries.filter(e => buyerIds.has(e.user_id)) : entries
}

/**
 * Cadeaux restés ouverts sur un live terminé : tirage automatique (sinon les participants n'ont jamais de réponse).
 * Sans participant éligible, le cadeau est annulé. Renvoie le nombre de cadeaux clôturés.
 */
export async function closeGiveawaysOfEndedLives(): Promise<number> {
  const { data: open } = await supabase.from('giveaways')
    .select('id, stream_id, seller_id, title, buyers_only, streams!inner(status)')
    .eq('status', 'active').eq('streams.status', 'ended')
  let closed = 0
  for (const g of (open || []) as Array<{ id: string; stream_id: string; seller_id: string; title: string | null; buyers_only: boolean }>) {
    const { data: entries } = await supabase.from('giveaway_entries').select('user_id, display_name').eq('giveaway_id', g.id)
    let buyerIds = new Set<string>()
    if (g.buyers_only) {
      const { data: orders } = await supabase.from('orders').select('buyer_id').eq('stream_id', g.stream_id)
      buyerIds = new Set((orders || []).map((o: { buyer_id: string }) => o.buyer_id))
    }
    const eligible = eligibleEntries(entries || [], buyerIds, !!g.buyers_only)
    if (eligible.length === 0) {
      const { data } = await supabase.from('giveaways').update({ status: 'cancelled' }).eq('id', g.id).eq('status', 'active').select('id')
      if (data?.length) closed++
      continue
    }
    const winner = eligible[Math.floor(Math.random() * eligible.length)]
    let winnerName = winner.display_name
    if (!winnerName) {
      const { data: wp } = await supabase.from('profiles').select('display_name, username').eq('id', winner.user_id).single()
      winnerName = wp?.display_name || wp?.username || 'Unknown'
    }
    const { data } = await supabase.from('giveaways').update({
      status: 'drawn', winner_id: winner.user_id, winner_name: winnerName, drawn_at: new Date().toISOString(),
    }).eq('id', g.id).eq('status', 'active').select('id')
    if (data?.length) {
      closed++
      await supabase.from('chat_messages').insert({
        stream_id: g.stream_id, user_id: g.seller_id, type: 'system',
        message: `__system:gift_won:${encodeURIComponent(winnerName || '')}:${encodeURIComponent(g.title || '')}__`,
      })
    }
  }
  return closed
}
