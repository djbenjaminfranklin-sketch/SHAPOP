import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { t, getLang, tr, type Localized } from '../lib/i18n'
import { rtlTextAlign, rtlFlip } from '../lib/rtl'
import ActiveOrderBar from './ActiveOrderBar'
import LiveReturnBar, { useMyActiveLive } from './LiveReturnBar'
import SellPopup from './seller/SellPopup'
import CartoonAvatar from './CartoonAvatar'

type NavText = {
  myProfile: string
  dashboard: string
  myAccount: string
  payments: string
  addresses: string
  notifications: string
  verification: string
  settings: string
  security: string
  messages: string
  referrals: string
  rules: string
  viewProfile: string
  signOut: string
  user: string
  mainNav: string
}

const navText: Localized<NavText> = {
  en: {
    myProfile: 'My profile',
    dashboard: 'Dashboard',
    myAccount: 'My account',
    payments: 'Payments & handover',
    addresses: 'Addresses',
    notifications: 'Notifications',
    verification: 'Identity verification',
    settings: 'Settings',
    security: 'Security',
    messages: 'Messages',
    referrals: 'Referrals',
    rules: 'Buying and selling rules',
    viewProfile: 'View my profile',
    signOut: 'Sign out',
    user: 'User',
    mainNav: 'Main navigation',
  },
  fr: {
    myProfile: 'Mon profil',
    dashboard: 'Tableau de bord',
    myAccount: 'Mon compte',
    payments: 'Paiements et remise',
    addresses: 'Adresses',
    notifications: 'Notifications',
    verification: 'Vérification d\'identité',
    settings: 'Paramètres',
    security: 'Sécurité',
    messages: 'Messages',
    referrals: 'Parrainages',
    rules: 'Règles d’achat et de vente',
    viewProfile: 'Voir mon profil',
    signOut: 'Déconnexion',
    user: 'Utilisateur',
    mainNav: 'Navigation principale',
  },
  es: {
    myProfile: 'Mi perfil',
    dashboard: 'Panel de control',
    myAccount: 'Mi cuenta',
    payments: 'Pagos y entrega',
    addresses: 'Direcciones',
    notifications: 'Notificaciones',
    verification: 'Verificación de identidad',
    settings: 'Ajustes',
    security: 'Seguridad',
    messages: 'Mensajes',
    referrals: 'Invitaciones',
    rules: 'Reglas de compra y venta',
    viewProfile: 'Ver mi perfil',
    signOut: 'Cerrar sesión',
    user: 'Usuario',
    mainNav: 'Navegación principal',
  },
  ru: {
    myProfile: 'Мой профиль',
    dashboard: 'Панель продавца',
    myAccount: 'Мой аккаунт',
    payments: 'Оплата и передача',
    addresses: 'Адреса',
    notifications: 'Уведомления',
    verification: 'Подтверждение личности',
    settings: 'Настройки',
    security: 'Безопасность',
    messages: 'Сообщения',
    referrals: 'Приглашения',
    rules: 'Правила покупки и продажи',
    viewProfile: 'Открыть мой профиль',
    signOut: 'Выйти',
    user: 'Пользователь',
    mainNav: 'Основная навигация',
  },
  he: {
    myProfile: 'הפרופיל שלי',
    dashboard: 'לוח בקרה',
    myAccount: 'החשבון שלי',
    payments: 'תשלומים ומסירה',
    addresses: 'כתובות',
    notifications: 'התראות',
    verification: 'אימות זהות',
    settings: 'הגדרות',
    security: 'אבטחה',
    messages: 'הודעות',
    referrals: 'הזמנת חברים',
    rules: 'כללי קנייה ומכירה',
    viewProfile: 'לצפייה בפרופיל שלי',
    signOut: 'התנתקות',
    user: 'משתמש',
    mainNav: 'ניווט ראשי',
  },
}

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const path = location.pathname
  const lang = getLang()
  const nt = tr(navText, lang)
  const [showSell, setShowSell] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const myLive = useMyActiveLive(user?.id || '', path)
  // Barre du bas affichée : on réserve sa hauteur en bas de page, pour que les derniers boutons ne soient jamais cachés
  const navShown = !!user && !['/stream/', '/live-seller/', '/prepare-live/', '/conversation/'].some(p => path.startsWith(p))
    && !['/go-live', '/schedule-live', '/ai-listing'].includes(path)
  useEffect(() => {
    if (!navShown) return
    const html = document.documentElement
    html.classList.add('has-bottom-nav')
    return () => html.classList.remove('has-bottom-nav')
  }, [navShown])

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
      to: '/',
      labelKey: 'home_tab' as const,
      active: path === '/',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'rgba(0,229,255,0.18)' : 'none'} stroke={active ? '#00E5FF' : 'rgba(255,255,255,0.6)'} strokeWidth="2">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      to: '/explore',
      labelKey: 'categories_tab' as const,
      active: path === '/explore',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00E5FF' : 'rgba(255,255,255,0.6)'} strokeWidth="2">
          <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round"/>
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
          backgroundColor: '#06060a', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(0,229,255,0.55)', border: '2px solid #00E5FF'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2.8">
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'rgba(0,229,255,0.18)' : 'none'} stroke={active ? '#00E5FF' : 'rgba(255,255,255,0.6)'} strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  // ── Profile menu items ──
  const menuItems: { icon: React.JSX.Element; label: string; to: string; color?: string }[] = [
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      label: nt.myProfile,
      to: `/seller/${user.id}`,
    },
    // « Règles » en 2e : la 1re entrée (Mon profil) est affichée à part, en tête de la feuille
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M9 7h7M9 11h7"/></svg>,
      label: nt.rules,
      to: '/rules',
    },
    ...(profile?.is_seller ? [{
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
      label: nt.dashboard,
      to: '/dashboard',
    }] : []),
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
      label: nt.myAccount,
      to: '/profile',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
      label: nt.payments,
      to: '/payments',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
      label: nt.addresses,
      to: '/addresses',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
      label: nt.notifications,
      to: '/notifications',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>,
      label: nt.verification,
      to: '/verification',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
      label: nt.settings,
      to: '/account-controls',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
      label: nt.security,
      to: '/security',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>,
      label: nt.messages,
      to: '/messages',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
      label: nt.referrals,
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
      {/* Live en cours : priorité sur le bandeau de commande */}
      {myLive ? <LiveReturnBar live={myLive} /> : <ActiveOrderBar userId={user.id} path={path} />}

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
                backgroundColor: '#00E5FF', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <CartoonAvatar seed={user.id} size={52} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.display_name || profile?.username || nt.user}
                </div>
                <div style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', marginTop: '2px' }}>
                  {nt.viewProfile}
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ ...rtlFlip() }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>

            {/* Menu items */}
            <div style={{ padding: '8px 0' }}>
              {menuItems.slice(1).map((item) => (
                <button
                  key={item.to}
                  onClick={() => handleMenuNavigate(item.to)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    width: '100%', padding: '14px 20px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    ...rtlTextAlign('left'),
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    backgroundColor: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: 'calc(15px * var(--fs, 1))', color: '#E5E5E5', fontWeight: 500, flex: 1 }}>
                    {item.label}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ ...rtlFlip() }}>
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
                  ...rtlTextAlign('left'),
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
                <span style={{ fontSize: 'calc(15px * var(--fs, 1))', color: '#EF4444', fontWeight: 600 }}>
                  {nt.signOut}
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
        aria-label={nt.mainNav}
        className="no-theme-invert"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#070709', borderTop: '1px solid rgba(0,229,255,0.28)', zIndex: 50,
          boxShadow: '0 -6px 22px rgba(0,229,255,0.12)',
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
                    fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 500,
                    color: '#f0f0f0',
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
                  fontSize: 'calc(10px * var(--fs, 1))', fontWeight: tab.active ? 700 : 500,
                  color: tab.active ? '#00E5FF' : 'rgba(255,255,255,0.6)',
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
              backgroundColor: '#00E5FF',
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <CartoonAvatar seed={user.id} size={26} />
              )}
            </div>
            <span style={{
              fontSize: 'calc(10px * var(--fs, 1))', fontWeight: isProfileActive ? 700 : 500,
              color: isProfileActive ? '#fff' : 'rgba(255,255,255,0.8)',
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
