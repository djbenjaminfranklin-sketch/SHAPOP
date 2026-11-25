// Bandeau « Ton live est en cours » : le vendeur qui quitte l'écran de son live (accueil, messages…)
// sait toujours que son live tourne et y revient d'un geste.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDir, tr, type Localized } from '../lib/i18n'

const TEXT: Localized<{ title: string; back: string }> = {
  en: { title: 'Your live is on', back: 'Back to my live' },
  fr: { title: 'Ton live est en cours', back: 'Revenir au live' },
  es: { title: 'Tu directo está en curso', back: 'Volver al directo' },
  ru: { title: 'Твой эфир идёт', back: 'Вернуться в эфир' },
  he: { title: 'השידור החי שלך פעיל', back: 'חזרה לשידור' },
}

/** Live en cours du vendeur (null s'il n'y en a pas). Vérifié à chaque changement d'écran et toutes les 30 s. */
export function useMyActiveLive(userId: string, path: string): { id: string; title: string } | null {
  const [live, setLive] = useState<{ id: string; title: string } | null>(null)
  useEffect(() => {
    let alive = true
    const load = async () => {
      const { data } = await supabase.from('streams').select('id, title')
        .eq('seller_id', userId).eq('status', 'live')
        .order('started_at', { ascending: false }).limit(1).maybeSingle()
      if (alive) setLive(data ? { id: data.id, title: data.title } : null)
    }
    load().catch(() => {})
    const t = setInterval(() => { load().catch(() => {}) }, 30_000)
    return () => { alive = false; clearInterval(t) }
  }, [userId, path])
  return live
}

export default function LiveReturnBar({ live }: { live: { id: string; title: string } }) {
  const navigate = useNavigate()
  const t = tr(TEXT)
  useEffect(() => {
    // même espace en bas de page que le bandeau de commande
    document.documentElement.classList.add('has-order-bar')
    return () => document.documentElement.classList.remove('has-order-bar')
  }, [])
  return (
    <button
      dir={getDir()}
      className="no-theme-invert"
      onClick={() => navigate(`/live-seller/${live.id}`)}
      style={{
        position: 'fixed', left: 0, right: 0, zIndex: 49,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)', margin: '0 10px', borderRadius: '14px',
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        background: 'linear-gradient(135deg, #E8344E 0%, #F0908A 100%)', border: 'none', color: '#fff',
        textAlign: 'start', cursor: 'pointer', boxShadow: '0 -4px 18px rgba(232,52,78,0.35)',
      }}
    >
      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0, animation: 'liveDot 1.2s ease-in-out infinite' }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800 }}>{t.title}</span>
        <span style={{ display: 'block', fontSize: 'calc(13px * var(--fs, 1))', opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{live.title}</span>
      </span>
      <span style={{ flexShrink: 0, fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 800, backgroundColor: '#fff', color: '#E8344E', padding: '8px 12px', borderRadius: '999px' }}>{t.back}</span>
      <style>{`@keyframes liveDot { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
    </button>
  )
}
