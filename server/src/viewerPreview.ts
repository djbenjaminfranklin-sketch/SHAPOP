// =============================================
// Aperçu gratuit des directs pour les spectateurs sans carte enregistrée.
// - Avec une carte (même critère que /api/stripe/check-card et les enchères :
//   profiles.stripe_customer_id + au moins un moyen de paiement « card » chez Stripe) : rien ne change.
// - Sans carte : FREE_PREVIEW_SECONDS par (spectateur, direct), comptées depuis le PREMIER jeton
//   (table stream_preview_views), donc pas de remise à zéro en quittant / rouvrant le direct.
// =============================================
import { supabase, stripe, livekitRoomService, FREE_PREVIEW_SECONDS } from './config'
import { rapydConfig, getCustomer } from './payments/rapyd'

/** Même règle que /api/stripe/check-card et la vérification avant enchère. */
export async function userHasSavedCard(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, rapyd_customer_id')
    .eq('id', userId)
    .single()
  if (profile?.stripe_customer_id) {
    const pms = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id as string,
      type: 'card',
      limit: 1,
    })
    if (pms.data.length > 0) return true
  }
  // Israël : carte enregistrée chez Rapyd (seulement quand Rapyd est activé)
  if (profile?.rapyd_customer_id && rapydConfig().enabled) {
    try {
      const c = await getCustomer(profile.rapyd_customer_id as string)
      return !!c?.default_payment_method
    } catch { return false }
  }
  return false
}

/** Secondes d'aperçu restantes à partir de la date de début (jamais négatif). */
export function previewRemainingSeconds(startedAtIso: string, nowMs = Date.now(), totalSeconds = FREE_PREVIEW_SECONDS): number {
  const started = new Date(startedAtIso).getTime()
  if (!Number.isFinite(started)) return 0
  const elapsed = (nowMs - started) / 1000
  return Math.max(0, Math.ceil(totalSeconds - elapsed))
}

/**
 * Lit (ou crée au premier passage) le début de l'aperçu pour ce spectateur et ce direct.
 * Renvoie les secondes restantes, ou null si la base est injoignable / la table absente
 * (on laisse alors passer comme avant plutôt que de bloquer tous les spectateurs).
 */
export async function getOrStartPreview(userId: string, streamId: string, nowMs = Date.now()): Promise<number | null> {
  const read = async () => supabase
    .from('stream_preview_views')
    .select('started_at')
    .eq('user_id', userId)
    .eq('stream_id', streamId)
    .maybeSingle()

  const first = await read()
  if (first.error) {
    console.error('[preview] lecture impossible:', (first.error as { message?: string }).message)
    return null
  }
  if (first.data?.started_at) return previewRemainingSeconds(first.data.started_at as string, nowMs)

  const startedAt = new Date(nowMs).toISOString()
  const { error: insertError } = await supabase
    .from('stream_preview_views')
    .insert({ user_id: userId, stream_id: streamId, started_at: startedAt })
  if (insertError) {
    // Deux demandes simultanées : l'autre a créé la ligne, on relit la sienne.
    const again = await read()
    if (again.data?.started_at) return previewRemainingSeconds(again.data.started_at as string, nowMs)
    console.error('[preview] création impossible:', (insertError as { message?: string }).message)
    return null
  }
  return previewRemainingSeconds(startedAt, nowMs)
}

/** Identités LiveKit possibles d'un spectateur (lecteur principal + mini-lecteur). */
export function viewerIdentities(userId: string): string[] {
  return [`viewer-${userId}`, `viewer-pip-${userId}`]
}

const pendingKicks = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * À la fin de l'aperçu, retire réellement le spectateur de la salle LiveKit
 * (un jeton expiré n'éjecte pas un participant déjà connecté).
 * Minuterie en mémoire : perdue si le serveur redémarre ; le lecteur coupe aussi de son côté.
 */
export function schedulePreviewKick(
  roomName: string,
  userId: string,
  delayMs: number,
  roomService: { removeParticipant: (room: string, identity: string) => Promise<unknown> } | null = livekitRoomService,
): void {
  if (!roomService) return
  const key = `${roomName}:${userId}`
  const previous = pendingKicks.get(key)
  if (previous) clearTimeout(previous)
  const timer = setTimeout(() => {
    pendingKicks.delete(key)
    for (const identity of viewerIdentities(userId)) {
      // Le participant peut déjà être parti : erreur « not found » sans importance.
      roomService.removeParticipant(roomName, identity).catch(() => { /* absent de la salle */ })
    }
  }, Math.max(0, delayMs))
  timer.unref?.()
  pendingKicks.set(key, timer)
}

/** Annule la coupure prévue (ex. : carte ajoutée pendant l'aperçu). */
export function cancelPreviewKick(roomName: string, userId: string): void {
  const key = `${roomName}:${userId}`
  const t = pendingKicks.get(key)
  if (t) { clearTimeout(t); pendingKicks.delete(key) }
}

/** Pour les tests. */
export function clearPreviewKicks(): void {
  for (const t of pendingKicks.values()) clearTimeout(t)
  pendingKicks.clear()
}
