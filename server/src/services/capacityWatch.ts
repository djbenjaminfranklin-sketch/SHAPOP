// Surveillance de capacité (demande de Benjamin, 26/11/2026) : dès qu'on atteint la MOITIÉ d'une
// limite de nos offres, un e-mail d'alerte part aux admins pour passer à l'offre au-dessus.
// Limites réglables sur Render sans redéployer (CAP_*). Une alerte par limite et par jour au plus.
import { supabase, livekitRoomService } from '../config'
import { alertAdmins } from './orderLifecycle'

const num = (v: string | undefined, d: number) => (Number(v) > 0 ? Number(v) : d)
export const CAPS = {
  livekitParticipants: num(process.env.CAP_LIVEKIT_PARTICIPANTS, 100), // LiveKit Build (gratuit)
  livekitMinutes: num(process.env.CAP_LIVEKIT_MINUTES, 5000),           // minutes de connexion / mois
  realtime: num(process.env.CAP_REALTIME, 500),                         // Supabase Pro
  memoryMb: num(process.env.CAP_MEMORY_MB, 512),                        // Render Starter
  cpu: num(process.env.CAP_CPU, 0.5),                                   // Render Starter
}
export const ALERT_RATIO = 0.5

/** Les mesures qui ont atteint la moitié de leur limite. Pur, testable. */
export function overHalf(m: Record<keyof typeof CAPS | 'dbConnections' | 'dbMax', number>) {
  const out: { key: string; label: string; value: number; cap: number }[] = []
  const check = (key: string, label: string, value: number, cap: number) => {
    if (cap > 0 && value >= cap * ALERT_RATIO) out.push({ key, label, value, cap })
  }
  check('livekitParticipants', 'Personnes connectées à la vidéo (LiveKit)', m.livekitParticipants, CAPS.livekitParticipants)
  check('livekitMinutes', 'Minutes vidéo LiveKit ce mois-ci', m.livekitMinutes, CAPS.livekitMinutes)
  check('realtime', 'Abonnements temps réel Supabase (chat, enchères)', m.realtime, CAPS.realtime)
  check('dbConnections', 'Connexions à la base Supabase', m.dbConnections, m.dbMax)
  check('memoryMb', 'Mémoire du serveur Render (Mo)', m.memoryMb, CAPS.memoryMb)
  check('cpu', 'Processeur du serveur Render', m.cpu, CAPS.cpu)
  return out
}

let lastCpu = process.cpuUsage()
let lastAt = Date.now()
let cpuHighStreak = 0

export async function runCapacityWatch(): Promise<void> {
  // Vidéo : personnes connectées en ce moment (tous les directs) ; 1 minute de surveillance = minutes consommées
  let participants = 0
  if (livekitRoomService) {
    const rooms = await livekitRoomService.listRooms()
    participants = rooms.reduce((s, r) => s + (r.numParticipants || 0), 0)
  }
  const month = new Date().toISOString().slice(0, 7)
  const { data: row } = await supabase.from('capacity_usage').select('livekit_minutes, alerts').eq('month', month).maybeSingle()
  const minutes = Number(row?.livekit_minutes || 0) + participants
  const alerts: Record<string, string> = (row?.alerts as Record<string, string>) || {}

  const { data: stats } = await supabase.rpc('capacity_stats')
  const s = (stats || {}) as { db_connections?: number; db_max_connections?: number; realtime_subscriptions?: number }

  const now = Date.now()
  const cpuNow = process.cpuUsage()
  const cpu = ((cpuNow.user - lastCpu.user) + (cpuNow.system - lastCpu.system)) / 1000 / Math.max(1, now - lastAt)
  lastCpu = cpuNow; lastAt = now
  cpuHighStreak = cpu >= CAPS.cpu * ALERT_RATIO ? cpuHighStreak + 1 : 0 // pic ponctuel ignoré : 5 minutes d'affilée

  const hits = overHalf({
    livekitParticipants: participants, livekitMinutes: minutes,
    realtime: Number(s.realtime_subscriptions || 0),
    dbConnections: Number(s.db_connections || 0), dbMax: Number(s.db_max_connections || 0),
    memoryMb: Math.round(process.memoryUsage().rss / 1048576),
    cpu: cpuHighStreak >= 5 ? Math.round(cpu * 100) / 100 : 0,
  })

  const today = new Date().toISOString().slice(0, 10)
  const fresh = hits.filter((h) => alerts[h.key] !== today)
  for (const h of fresh) alerts[h.key] = today
  await supabase.from('capacity_usage').upsert({ month, livekit_minutes: minutes, alerts })

  if (fresh.length) {
    const lines = fresh.map((h) => `${h.label} : ${h.value} sur ${h.cap} (${Math.round((h.value / h.cap) * 100)} %)`)
    await alertAdmins('Moitié de la capacité atteinte — passer à l\'offre au-dessus',
      `${lines.join(' · ')}. Il est temps de passer à l'offre supérieure pour ce service.`)
  }
}
