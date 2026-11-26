// Visuel d'une communauté : tuile néon (nom de la ville + drapeau) au lieu d'une photo d'illustration.
import { COUNTRIES } from '../lib/data/communitiesData'

export default function CommunityCover({ country, size = 'card' }: { city?: string; country: string; size?: 'card' | 'banner' }) {
  const flag = COUNTRIES.find(c => c.code === country)?.flag || ''
  const big = size === 'banner'
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: big ? '10px' : '6px',
      background: 'radial-gradient(circle at 50% 40%, rgba(0,229,255,0.22), rgba(0,229,255,0) 60%), #06080c',
      boxShadow: 'inset 0 0 0 1.5px rgba(0,229,255,0.35)',
    }}>
      {/* Drapeau seul : le nom de la ville est déjà écrit juste en dessous */}
      <span aria-hidden="true" className="no-theme-invert" style={{ fontSize: big ? '56px' : '40px', lineHeight: 1, filter: 'drop-shadow(0 0 10px rgba(0,229,255,0.45))' }}>{flag}</span>
    </div>
  )
}
