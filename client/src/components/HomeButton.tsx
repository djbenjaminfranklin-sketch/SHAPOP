import { useLocation, useNavigate } from 'react-router-dom'

export default function HomeButton() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  // Don't show on home page or during streams (has its own UI)
  if (path === '/') return null
  if (path.startsWith('/stream/')) return null

  return (
    <>
      {/* Spacer to push page content below the button */}
      <div style={{ height: '48px' }} />
      {/* Fixed home button */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 12px) + 10px)',
          left: '14px',
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </>
  )
}
