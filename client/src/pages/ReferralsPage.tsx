import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'

const content = {
  fr: { title: 'Parrainages', subtitle: 'Invite tes amis sur ShaPop !', howTitle: 'Comment ca marche', step1: 'Partage ton lien de parrainage', step2: "Ton ami s'inscrit sur ShaPop", step3: 'Les recompenses arrivent bientot !', yourCode: 'Ton code de parrainage', share: 'Partager le lien', copied: 'Copie !', comingSoon: 'Bientot disponible', rewardsNote: 'Les recompenses de parrainage seront disponibles prochainement.' },
  en: { title: 'Referrals', subtitle: 'Invite your friends to ShaPop!', howTitle: 'How it works', step1: 'Share your referral link', step2: 'Friend signs up on ShaPop', step3: 'Rewards are coming soon!', yourCode: 'Your referral code', share: 'Share link', copied: 'Copied!', comingSoon: 'Coming soon', rewardsNote: 'Referral rewards will be available soon.' },
  he: { title: '\u05D4\u05E4\u05E0\u05D9\u05D5\u05EA', subtitle: '\u05D4\u05D6\u05DE\u05D9\u05E0\u05D5 \u05D7\u05D1\u05E8\u05D9\u05DD \u05DC-ShaPop!', howTitle: '\u05D0\u05D9\u05DA \u05D6\u05D4 \u05E2\u05D5\u05D1\u05D3', step1: '\u05E9\u05EA\u05E4\u05D5 \u05D0\u05EA \u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D4\u05E4\u05E0\u05D9\u05D4', step2: '\u05D7\u05D1\u05E8 \u05E0\u05E8\u05E9\u05DD \u05D1-ShaPop', step3: '\u05D4\u05EA\u05D2\u05DE\u05D5\u05DC\u05D9\u05DD \u05D1\u05E7\u05E8\u05D5\u05D1!', yourCode: '\u05E7\u05D5\u05D3 \u05D4\u05D4\u05E4\u05E0\u05D9\u05D4 \u05E9\u05DC\u05DA', share: '\u05E9\u05EA\u05E4\u05D5 \u05E7\u05D9\u05E9\u05D5\u05E8', copied: '\u05D4\u05D5\u05E2\u05EA\u05E7!', comingSoon: '\u05D1\u05E7\u05E8\u05D5\u05D1', rewardsNote: '\u05EA\u05D2\u05DE\u05D5\u05DC\u05D9 \u05D4\u05E4\u05E0\u05D9\u05D4 \u05D9\u05D4\u05D9\u05D5 \u05D6\u05DE\u05D9\u05E0\u05D9\u05DD \u05D1\u05E7\u05E8\u05D5\u05D1.' },
  es: { title: 'Referidos', subtitle: 'Invita a tus amigos a ShaPop!', howTitle: 'Como funciona', step1: 'Comparte tu enlace de referido', step2: 'Tu amigo se registra en ShaPop', step3: 'Las recompensas llegan pronto!', yourCode: 'Tu codigo de referido', share: 'Compartir enlace', copied: 'Copiado!', comingSoon: 'Proximamente', rewardsNote: 'Las recompensas por referidos estaran disponibles pronto.' },
}

export default function ReferralsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = getLang()
  const c = content[lang] || content.fr
  const [copied, setCopied] = useState(false)

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const code = user.id.slice(0, 8).toUpperCase() || 'SHAPOP'
  const link = `https://shapop.app/ref/${code}`

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ShaPop', text: `${c.subtitle}\n${link}`, url: link })
        return
      }
    } catch {
      // share cancelled or failed — fall through to clipboard
    }
    // Fallback: copy to clipboard (works in WKWebView)
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Double fallback for older WKWebView
      const textarea = document.createElement('textarea')
      textarea.value = link
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px' }}>
        {/* Stats — Coming soon */}
        <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '24px', opacity: 0.6 }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0908A', marginBottom: '4px' }}>{c.comingSoon}</p>
          <p style={{ fontSize: '12px', color: '#888' }}>{c.rewardsNote}</p>
        </div>

        {/* How it works */}
        <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>{c.howTitle}</h2>
          {[c.step1, c.step2, c.step3].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 2 ? '14px' : 0 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F0908A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.5, paddingTop: '3px' }}>{step}</p>
            </div>
          ))}
        </div>

        {/* Code */}
        <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{c.yourCode}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '4px' }}>{code}</p>
        </div>

        <button onClick={handleShare} style={{ width: '100%', padding: '14px', backgroundColor: '#F0908A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          {copied ? c.copied : c.share}
        </button>
      </div>
    </div>
  )
}
