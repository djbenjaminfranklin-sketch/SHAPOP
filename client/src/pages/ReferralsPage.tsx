import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'

const content = {
  fr: {
    title: 'Parrainages',
    subtitle: 'Invite tes amis sur ShaPop !',
    howTitle: 'Comment ca marche',
    step1: 'Partage ton lien de parrainage',
    step2: "Ton ami s'inscrit avec ton code",
    step3: 'Vous recevez chacun un code promo -5% !',
    yourCode: 'Ton code de parrainage',
    share: 'Partager le lien',
    copied: 'Copie !',
    stats: 'Tes statistiques',
    totalReferrals: 'Filleuls',
    rewardsEarned: 'Recompenses',
    yourCodes: 'Tes codes promo gagnes',
    noRewardsYet: 'Invite des amis pour gagner des codes promo !',
    welcomeCode: 'Ton code de bienvenue',
  },
  en: {
    title: 'Referrals',
    subtitle: 'Invite your friends to ShaPop!',
    howTitle: 'How it works',
    step1: 'Share your referral link',
    step2: 'Friend signs up with your code',
    step3: 'You both get a 5% promo code!',
    yourCode: 'Your referral code',
    share: 'Share link',
    copied: 'Copied!',
    stats: 'Your stats',
    totalReferrals: 'Referrals',
    rewardsEarned: 'Rewards',
    yourCodes: 'Your earned promo codes',
    noRewardsYet: 'Invite friends to earn promo codes!',
    welcomeCode: 'Your welcome code',
  },
  he: {
    title: '\u05D4\u05E4\u05E0\u05D9\u05D5\u05EA',
    subtitle: '\u05D4\u05D6\u05DE\u05D9\u05E0\u05D5 \u05D7\u05D1\u05E8\u05D9\u05DD \u05DC-ShaPop!',
    howTitle: '\u05D0\u05D9\u05DA \u05D6\u05D4 \u05E2\u05D5\u05D1\u05D3',
    step1: '\u05E9\u05EA\u05E4\u05D5 \u05D0\u05EA \u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D4\u05E4\u05E0\u05D9\u05D4',
    step2: '\u05D7\u05D1\u05E8 \u05E0\u05E8\u05E9\u05DD \u05E2\u05DD \u05D4\u05E7\u05D5\u05D3 \u05E9\u05DC\u05DA',
    step3: '\u05E9\u05E0\u05D9\u05DB\u05DD \u05DE\u05E7\u05D1\u05DC\u05D9\u05DD \u05E7\u05D5\u05D3 \u05D4\u05E0\u05D7\u05D4 5%!',
    yourCode: '\u05E7\u05D5\u05D3 \u05D4\u05D4\u05E4\u05E0\u05D9\u05D4 \u05E9\u05DC\u05DA',
    share: '\u05E9\u05EA\u05E4\u05D5 \u05E7\u05D9\u05E9\u05D5\u05E8',
    copied: '\u05D4\u05D5\u05E2\u05EA\u05E7!',
    stats: '\u05D4\u05E1\u05D8\u05D8\u05D9\u05E1\u05D8\u05D9\u05E7\u05D5\u05EA \u05E9\u05DC\u05DA',
    totalReferrals: '\u05D4\u05E4\u05E0\u05D9\u05D5\u05EA',
    rewardsEarned: '\u05EA\u05D2\u05DE\u05D5\u05DC\u05D9\u05DD',
    yourCodes: '\u05E7\u05D5\u05D3\u05D9 \u05D4\u05E0\u05D7\u05D4 \u05E9\u05D4\u05E8\u05D5\u05D5\u05D7\u05EA',
    noRewardsYet: '\u05D4\u05D6\u05DE\u05D9\u05E0\u05D5 \u05D7\u05D1\u05E8\u05D9\u05DD \u05DC\u05E7\u05D1\u05DC\u05EA \u05E7\u05D5\u05D3\u05D9 \u05D4\u05E0\u05D7\u05D4!',
    welcomeCode: '\u05E7\u05D5\u05D3 \u05D4\u05D1\u05E8\u05DB\u05D4 \u05E9\u05DC\u05DA',
  },
  es: {
    title: 'Referidos',
    subtitle: 'Invita a tus amigos a ShaPop!',
    howTitle: 'Como funciona',
    step1: 'Comparte tu enlace de referido',
    step2: 'Tu amigo se registra con tu codigo',
    step3: 'Ambos reciben un codigo promo -5%!',
    yourCode: 'Tu codigo de referido',
    share: 'Compartir enlace',
    copied: 'Copiado!',
    stats: 'Tus estadisticas',
    totalReferrals: 'Referidos',
    rewardsEarned: 'Recompensas',
    yourCodes: 'Tus codigos promo ganados',
    noRewardsYet: 'Invita amigos para ganar codigos promo!',
    welcomeCode: 'Tu codigo de bienvenida',
  },
}

export default function ReferralsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = getLang()
  const c = (content as Record<string, typeof content.fr>)[lang] || content.fr
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<{ total_referrals: number; rewards_earned: number; reward_codes: string[]; my_welcome_code: string | null } | null>(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session.session) return
        const resp = await apiFetch('/api/referrals/stats', {
          headers: { 'Authorization': `Bearer ${session.session.access_token}` },
        })
        if (resp.ok) {
          const data = await resp.json()
          setStats(data)
        }
      } catch { /* ignore */ }
    })()
  }, [user])

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
    try {
      await navigator.clipboard.writeText(link)
    } catch {
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
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', fontWeight: 800, color: '#F0908A', margin: 0 }}>{stats?.total_referrals ?? 0}</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{c.totalReferrals}</p>
          </div>
          <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', fontWeight: 800, color: '#22C55E', margin: 0 }}>{stats?.rewards_earned ?? 0}</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{c.rewardsEarned}</p>
          </div>
        </div>

        {/* Reward codes */}
        {stats && (stats.reward_codes.length > 0 || stats.my_welcome_code) && (
          <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{c.yourCodes}</h2>
            {stats.my_welcome_code && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#0A0A0A', borderRadius: '10px', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{c.welcomeCode}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E', margin: '2px 0 0', letterSpacing: '2px' }}>{stats.my_welcome_code}</p>
                </div>
                <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: 600 }}>-5%</span>
              </div>
            )}
            {stats.reward_codes.map((code, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#0A0A0A', borderRadius: '10px', marginBottom: i < stats.reward_codes.length - 1 ? '8px' : 0 }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#F0908A', margin: 0, letterSpacing: '2px' }}>{code}</p>
                <span style={{ fontSize: '12px', color: '#F0908A', fontWeight: 600 }}>-5%</span>
              </div>
            ))}
          </div>
        )}

        {stats && stats.reward_codes.length === 0 && !stats.my_welcome_code && (
          <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: '#888' }}>{c.noRewardsYet}</p>
          </div>
        )}

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
