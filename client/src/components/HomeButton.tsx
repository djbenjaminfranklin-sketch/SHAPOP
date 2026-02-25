import { useLocation, useNavigate } from 'react-router-dom'
import { rtlPos, rtlFlip } from '../lib/rtl'

export default function HomeButton() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  // Don't show on home, login/register, streams, or creation wizards (have their own back button)
  if (path === '/') return null
  if (path === '/login' || path === '/register') return null
  if (path.startsWith('/stream/')) return null
  if (path.startsWith('/live-seller/')) return null
  if (path.startsWith('/prepare-live/')) return null
  if (path === '/go-live') return null
  if (path === '/schedule-live') return null
  if (path === '/ai-listing') return null
  if (path.startsWith('/conversation/')) return null
  if (path === '/messages') return null
  if (path === '/shipments') return null

  return (
    <>
      {/* Spacer to push page content below the buttons */}
      <div style={{ height: '48px' }} />
      {/* Fixed back button — left */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 12px) + 10px)',
          ...rtlPos('left', '14px'),
          zIndex: 90,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'rgba(30,30,30,0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ ...rtlFlip() }}>
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {/* Fixed home button — center */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 12px) + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 90,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'rgba(30,30,30,0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </>
  )
}
