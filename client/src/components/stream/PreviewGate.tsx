// Aperçu gratuit d'un direct pour un spectateur sans carte enregistrée :
// petit compte à rebours, puis écran « Ajoute ta carte pour continuer à regarder ».
// La durée vient du serveur (réponse du jeton LiveKit), seule source de vérité.
import { useEffect, useState } from 'react'
import { tr, type Localized } from '../../lib/i18n'

const previewText = {
  en: {
    countdown: 'Free preview: {t}',
    wallTitle: 'Add your card to keep watching',
    wallDesc: 'Your free preview of this live is over. Adding a card charges you nothing.',
    addCard: 'Add my card',
    leave: 'Leave',
  },
  fr: {
    countdown: 'Aperçu gratuit : {t}',
    wallTitle: 'Ajoute ta carte pour continuer à regarder',
    wallDesc: 'Ton aperçu gratuit de ce direct est terminé. Ajouter une carte ne te débite rien.',
    addCard: 'Ajouter ma carte',
    leave: 'Quitter',
  },
  es: {
    countdown: 'Vista previa gratis: {t}',
    wallTitle: 'Añade tu tarjeta para seguir viendo',
    wallDesc: 'Tu vista previa gratuita de este directo ha terminado. Añadir una tarjeta no te cobra nada.',
    addCard: 'Añadir mi tarjeta',
    leave: 'Salir',
  },
  ru: {
    countdown: 'Бесплатный просмотр: {t}',
    wallTitle: 'Добавь карту, чтобы продолжить просмотр',
    wallDesc: 'Бесплатный просмотр этого эфира закончился. За добавление карты ничего не списывается.',
    addCard: 'Добавить карту',
    leave: 'Выйти',
  },
  he: {
    countdown: 'צפייה חינם: {t}',
    wallTitle: 'הוסף כרטיס כדי להמשיך לצפות',
    wallDesc: 'הצפייה החינמית בשידור הזה הסתיימה. הוספת כרטיס לא כרוכה בשום חיוב.',
    addCard: 'הוספת הכרטיס שלי',
    leave: 'יציאה',
  },
} satisfies Localized<Record<string, string>>

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Petit compte à rebours discret en haut du direct (ne capte pas les gestes). */
export function PreviewCountdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [endsAt])
  const remaining = (endsAt - now) / 1000
  const label = tr(previewText).countdown.split('{t}')
  return (
    <div style={{
      position: 'fixed', insetInline: 0,
      top: 'calc(env(safe-area-inset-top, 0px) + 64px)',
      display: 'flex', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 150,
    }}>
      <div role="timer" aria-live="off" style={{
        padding: '4px 10px', borderRadius: '999px',
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.9)', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600,
      }}>
        {label[0]}<bdi dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatClock(remaining)}</bdi>{label[1] ?? ''}
      </div>
    </div>
  )
}

/** Écran plein par-dessus le direct (et le chat) une fois l'aperçu terminé. */
export function PreviewCardWall({ onAddCard, onLeave }: { onAddCard: () => void; onLeave: () => void }) {
  const t = tr(previewText)
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 250,
      backgroundColor: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, rgba(240,144,138,0.2), rgba(240,144,138,0.05))',
          border: '1px solid rgba(240,144,138,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" aria-hidden="true">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>{t.wallTitle}</h2>
        <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#aaa', margin: '0 0 24px', lineHeight: 1.45 }}>{t.wallDesc}</p>
        <button
          onClick={onAddCard}
          style={{
            width: '100%', padding: '16px', border: 'none', borderRadius: '14px',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {t.addCard}
        </button>
        <button
          onClick={onLeave}
          style={{
            width: '100%', marginTop: '12px', padding: '12px',
            backgroundColor: 'transparent', border: '1px solid #333', borderRadius: '12px',
            color: '#888', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t.leave}
        </button>
      </div>
    </div>
  )
}
