import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'

// Flèche « retour » dans le flux de la page (jamais flottante), au même style
// que les en-têtes existants (Paiements et remise, Contrôles du compte…).
// Revient à la page précédente ; s'il n'y a pas d'historique (lien ouvert
// directement), repli sur `fallback`.

const backLabel: Localized<string> = {
  en: 'Back',
  fr: 'Retour',
  es: 'Atrás',
  ru: 'Назад',
  he: 'חזרה',
}

function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return () => {
    if (window.history.length <= 1) navigate(fallback, { replace: true })
    else navigate(-1)
  }
}

/** Le bouton seul, à glisser dans un en-tête qui existe déjà. */
export function BackArrowButton({ fallback = '/', color = '#fff' }: { fallback?: string; color?: string }) {
  const goBack = useGoBack(fallback)
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={tr(backLabel)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ ...rtlFlip() }}>
        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/** Barre d'en-tête complète : flèche + titre facultatif, sous la zone sûre. */
export default function PageBackButton({ title, fallback = '/', style }: { title?: string; fallback?: string; style?: CSSProperties }) {
  return (
    <div style={{
      padding: '12px 16px',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
      display: 'flex', alignItems: 'center', gap: '12px',
      ...style,
    }}>
      <BackArrowButton fallback={fallback} />
      {title ? <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h1> : null}
    </div>
  )
}
