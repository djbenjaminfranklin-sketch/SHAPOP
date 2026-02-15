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

  const tabs = [
    {
      to: '/',
      labelKey: 'home_tab' as const,
      active: path === '/',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'white' : 'none'} stroke={active ? 'white' : '#666'} strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
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
      to: '/communities',
      labelKey: 'map_tab' as const,
      active: path === '/communities' || path.startsWith('/community/'),
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'white' : 'none'} stroke={active ? 'white' : '#666'} strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 8px 4px' }}>
          {tabs.map(tab => {
            if (tab.special) {
              return (
                <button
                  key={tab.labelKey}
                  onClick={() => setShowSell(true)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    minWidth: '56px',
                  }}
                >
                  {tab.icon(false)}
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
                  textDecoration: 'none', minWidth: '56px'
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
