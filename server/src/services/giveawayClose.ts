import { supabase } from '../config'

/**
 * Cadeaux restés ouverts sur un live terminé (28/11/2026) : personne n'a donné la bonne réponse à temps,
 * le cadeau est ANNULÉ. Plus jamais de tirage au hasard (loterie interdite en Israël, même gratuite).
 * Renvoie le nombre de cadeaux clôturés.
 */
export async function closeGiveawaysOfEndedLives(): Promise<number> {
  const { data: open } = await supabase.from('giveaways')
    .select('id, streams!inner(status)')
    .eq('status', 'active').eq('streams.status', 'ended')
  let closed = 0
  for (const g of (open || []) as Array<{ id: string }>) {
    const { data } = await supabase.from('giveaways').update({ status: 'cancelled' }).eq('id', g.id).eq('status', 'active').select('id')
    if (data?.length) closed++
  }
  return closed
}
