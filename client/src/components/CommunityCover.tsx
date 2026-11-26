// Visuel d'une communauté : tuile néon (nom de la ville + drapeau) au lieu d'une photo d'illustration.
import { COUNTRIES } from '../lib/data/communitiesData'

export default function CommunityCover({ city, country, size = 'card' }: { city: string; country: string; size?: 'card' | 'banner' }) {
  const flag = COUNTRIES.find(c => c.code === country)?.flag || ''
  const big = size === 'banner'
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: big ? '10px' : '6px',
      background: 'radial-gradient(circle at 50% 40%, rgba(0,229,255,0.22), rgba(0,229,255,0) 60%), #06080c',
      boxShadow: 'inset 0 0 0 1.5px rgba(0,229,255,0.35)',
    }}>
      <span aria-hidden="true" className="no-theme-invert" style={{ fontSize: big ? '40px' : '26px', lineHeight: 1 }}>{flag}</span>
      <span style={{
        color: '#00E5FF', fontWeight: 900, letterSpacing: '0.5px', textAlign: 'center', padding: '0 8px',
        fontSize: big ? 'calc(28px * var(--fs, 1))' : 'calc(17px * var(--fs, 1))',
        textShadow: '0 0 12px rgba(0,229,255,0.6)',
      }}>{city}</span>
    </div>
  )
}
