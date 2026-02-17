import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { t, getLang } from '../lib/i18n'
import SellPopup from './SellPopup'

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const path = location.pathname
  const lang = getLang()
  const [showSell, setShowSell] = useState(false)

  if (path.startsWith('/stream/')) return null
  if (path.startsWith('/live-seller/')) return null
  if (path.startsWith('/prepare-live/')) return null
  if (path.startsWith('/conversation/')) return null
  if (path === '/go-live') return null
  if (path === '/schedule-live') return null
  if (path === '/ai-listing') return null
  if (!user) return null

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
    {
      to: '/profile',
      labelKey: 'account_tab' as const,
      active: path === '/profile' || path === '/login' || path === '/register',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'white' : 'none'} stroke={active ? 'white' : '#666'} strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  return (
    <>
      <SellPopup isOpen={showSell} onClose={() => setShowSell(false)} />
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: '#0A0A0A', borderTop: '1px solid #1A1A1A', zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}>
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
        </div>
      </nav>
    </>
  )
}
