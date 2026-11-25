import { supabase, livekitRoomService } from '../config'

/** Nombre de contrôles consécutifs sans vendeur dans la salle avant de terminer le live. */
export const MISSES_BEFORE_END = 2

/**
 * Décide si un live doit être terminé : le vendeur (ou le co-hôte) n'est plus dans la salle vidéo
 * depuis MISSES_BEFORE_END contrôles. Fonction pure, testée.
 */
export function shouldEndLive(identities: string[] | null, previousMisses: number): { end: boolean; misses: number } {
  const sellerPresent = !!identities && identities.some(id => id.startsWith('seller-') || id.startsWith('cohost-'))
  if (sellerPresent) return { end: false, misses: 0 }
  const misses = previousMisses + 1
  return { end: misses >= MISSES_BEFORE_END, misses }
}

const misses = new Map<string, number>()

/**
 * Lives « fantômes » : l'appli du vendeur a planté ou a été fermée sans « Terminer ».
 * Le signal de fin de LiveKit n'arrive pas sur ce serveur, donc on vérifie nous-mêmes la salle.
 */
export async function endAbandonedLives(): Promise<number> {
  if (!livekitRoomService) return 0
  const { data: lives } = await supabase.from('streams').select('id, livekit_room_name').eq('status', 'live')
  let ended = 0
  for (const live of lives || []) {
    let identities: string[] | null = null
    if (live.livekit_room_name) {
      try {
        const participants = await livekitRoomService.listParticipants(live.livekit_room_name)
        identities = participants.map(p => p.identity)
      } catch {
        identities = null // salle supprimée = plus personne
      }
    }
    const verdict = shouldEndLive(identities, misses.get(live.id) || 0)
    misses.set(live.id, verdict.misses)
    if (!verdict.end) continue
    const { data } = await supabase.from('streams')
      .update({ status: 'ended', ended_at: new Date().toISOString(), viewer_count: 0 })
      .eq('id', live.id).eq('status', 'live').select('id')
    misses.delete(live.id)
    if (data && data.length > 0) ended++
  }
  return ended
}
