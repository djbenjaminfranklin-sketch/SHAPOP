import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { t, getLang } from '../lib/i18n'
import SellPopup from './SellPopup'
import CartoonAvatar from './CartoonAvatar'

type Lang = ReturnType<typeof getLang>
const tx = (fr: string, en: string, he: string, es: string, lang: Lang) => {
  if (lang === 'en') return en
  if (lang === 'he') return he
  if (lang === 'es') return es
  return fr
}

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const path = location.pathname
  const lang = getLang()
  const [showSell, setShowSell] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  if (path.startsWith('/stream/')) return null
  if (path.startsWith('/live-seller/')) return null
  if (path.startsWith('/prepare-live/')) return null
  if (path.startsWith('/conversation/')) return null
  if (path === '/go-live') return null
  if (path === '/schedule-live') return null
  if (path === '/ai-listing') return null
  if (!user) return null

  const isProfileActive = path.startsWith('/seller/') || path === '/profile' || path === '/login' || path === '/register'
    || path === '/payments' || path === '/addresses' || path === '/account-controls'
    || path === '/verification' || path === '/security' || path === '/change-email'
    || path === '/change-password' || path === '/account-status' || path === '/notifications'
    || path === '/preferences' || path === '/referrals'

  const tabs = [
    {
      to: '/explore',
      labelKey: 'categories_tab' as const,
      active: path === '/explore',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'white' : '#666'} strokeWidth="2">
          <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      to: '/map',
      labelKey: 'map_tab' as const,
      active: path === '/map' || path === '/communities' || path.startsWith('/community/'),
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'white' : 'none'} stroke={active ? 'white' : '#666'} strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      to: '#sell',
      labelKey: 'sell_tab' as const,
      active: false,
      special: true,
      icon: () => (
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%', marginTop: '-16px',
          backgroundColor: '#F0908A', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(240,144,138,0.3)'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      ),
    },
    {
      to: '/activity',
      labelKey: 'activity_tab' as const,
      active: path === '/activity',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'white' : 'none'} stroke={active ? 'white' : '#666'} strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  // ── Profile menu items ──
  const menuItems: { icon: React.JSX.Element; label: string; to: string; color?: string }[] = [
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      label: tx('Mon profil', 'My profile', 'הפרופיל שלי', 'Mi perfil', lang),
      to: `/seller/${user.id}`,
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
      label: tx('Paiements et livraison', 'Payments & shipping', 'תשלומים ומשלוח', 'Pagos y envio', lang),
      to: '/payments',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
      label: tx('Adresses', 'Addresses', 'כתובות', 'Direcciones', lang),
      to: '/addresses',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
      label: tx('Notifications', 'Notifications', 'התראות', 'Notificaciones', lang),
      to: '/notifications',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>,
      label: tx('Verification d\'identite', 'Identity verification', 'אימות זהות', 'Verificacion de identidad', lang),
      to: '/verification',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
      label: tx('Parametres', 'Settings', 'הגדרות', 'Ajustes', lang),
      to: '/account-controls',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
      label: tx('Securite', 'Security', 'אבטחה', 'Seguridad', lang),
      to: '/security',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>,
      label: tx('Messages', 'Messages', 'הודעות', 'Mensajes', lang),
      to: '/messages',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
      label: tx('Parrainages', 'Referrals', 'הפניות', 'Referidos', lang),
      to: '/referrals',
    },
  ]

  const handleMenuNavigate = (to: string) => {
    setShowProfileMenu(false)
    navigate(to)
  }

  const handleSignOut = async () => {
    setShowProfileMenu(false)
    await signOut()
    navigate('/')
  }

  return (
    <>
      <SellPopup isOpen={showSell} onClose={() => setShowSell(false)} />

      {/* ── Profile menu bottom sheet ── */}
      {showProfileMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100 }}
          onClick={() => setShowProfileMenu(false)}
        >
          {/* Backdrop */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            animation: 'fadeIn 0.2s ease',
          }} />

          {/* Sheet */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: '#111', borderRadius: '20px 20px 0 0',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
              animation: 'profileSheetUp 0.3s ease',
              maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#333' }} />
            </div>

            {/* Header with avatar + name */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '8px 20px 20px', borderBottom: '1px solid #1A1A1A',
                cursor: 'pointer',
              }}
              onClick={() => handleMenuNavigate(`/seller/${user.id}`)}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden',
                backgroundColor: '#E8344E', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <CartoonAvatar seed={user.id} size={52} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.display_name || profile?.username || 'User'}
                </div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                  {tx('Voir mon profil', 'View my profile', 'צפה בפרופיל שלי', 'Ver mi perfil', lang)}
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>

            {/* Menu items */}
            <div style={{ padding: '8px 0' }}>
              {menuItems.slice(1).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMenuNavigate(item.to)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    width: '100%', padding: '14px 20px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    backgroundColor: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: '15px', color: '#E5E5E5', fontWeight: 500, flex: 1 }}>
                    {item.label}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              ))}
            </div>

            {/* Sign out button */}
            <div style={{ padding: '4px 20px 8px', borderTop: '1px solid #1A1A1A' }}>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  width: '100%', padding: '14px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </div>
                <span style={{ fontSize: '15px', color: '#EF4444', fontWeight: 600 }}>
                  {tx('Deconnexion', 'Sign out', 'התנתק', 'Cerrar sesion', lang)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes profileSheetUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>

      <nav
        aria-label="Main navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          backgroundColor: '#0A0A0A', borderTop: '1px solid #1A1A1A', zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'end', padding: '6px 0 4px' }}>
          {tabs.map(tab => {
            if (tab.special) {
              return (
                <button
                  key={tab.labelKey}
                  onClick={() => setShowSell(true)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    justifySelf: 'center', touchAction: 'manipulation',
                  }}
                >
                  {tab.icon()}
                  <span style={{
                    fontSize: '10px', fontWeight: 500,
                    color: '#666',
                    marginTop: '8px',
                  }}>
                    {t(lang, tab.labelKey)}
                  </span>
                </button>
              )
            }

            return (
              <Link
                key={tab.labelKey}
                to={tab.to}
                aria-current={tab.active ? 'page' : undefined}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textDecoration: 'none', justifySelf: 'center', touchAction: 'manipulation',
                }}
              >
                {tab.icon(tab.active)}
                <span style={{
                  fontSize: '10px', fontWeight: tab.active ? 700 : 500,
                  color: tab.active ? '#fff' : '#666',
                  marginTop: '4px',
                }}>
                  {t(lang, tab.labelKey)}
                </span>
              </Link>
            )
          })}

          {/* ── Profile tab with avatar ── */}
          <button
            onClick={() => setShowProfileMenu(true)}
            aria-label={t(lang, 'account_tab')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              justifySelf: 'center', touchAction: 'manipulation',
            }}
          >
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%', overflow: 'hidden',
              border: isProfileActive ? '2px solid #fff' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#E8344E',
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <CartoonAvatar seed={user.id} size={26} />
              )}
            </div>
            <span style={{
              fontSize: '10px', fontWeight: isProfileActive ? 700 : 500,
              color: isProfileActive ? '#fff' : '#666',
              marginTop: '4px',
            }}>
              {t(lang, 'account_tab')}
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
