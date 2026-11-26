// Articles de luxe (26/11/2026) : case « article de marque de luxe » et certification d'authenticité.
// Sans la certification, le serveur (et la base) refusent la mise en vente d'un article de luxe.
import { luxuryText } from '../../lib/luxury'

type Props = {
  luxury: boolean
  declared: boolean
  onDeclared: (v: boolean) => void
  certified: boolean
  onCertified: (v: boolean) => void
}

const row = { display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' } as const
const box = { width: '20px', height: '20px', marginTop: '1px', flexShrink: 0, accentColor: '#00E5FF' } as const

export default function LuxuryCertification({ luxury, declared, onDeclared, certified, onCertified }: Props) {
  const t = luxuryText()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
      <label style={row}>
        <input type="checkbox" checked={declared} onChange={e => onDeclared(e.target.checked)} style={box} />
        <span style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0' }}>{t.declare}</span>
      </label>
      {luxury && (
        <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.35)', backgroundColor: 'rgba(0,229,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: 'calc(13px * var(--fs, 1))', color: '#ddd', lineHeight: 1.45 }}>{t.notice}</p>
          <label style={row}>
            <input type="checkbox" checked={certified} onChange={e => onCertified(e.target.checked)} style={box} />
            <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#fff', fontWeight: 600, lineHeight: 1.45 }}>{t.certify}</span>
          </label>
        </div>
      )}
    </div>
  )
}
