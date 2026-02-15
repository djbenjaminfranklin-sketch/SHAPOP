import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'

interface SellPopupProps {
  isOpen: boolean
  onClose: () => void
}

const popupContent = {
  fr: {
    createTitle: 'Creer',
    iaExpress: 'IA Express',
    iaDescription: "L'IA cree ton annonce",
    newBadge: 'Nouveau',
    scheduleLive: 'Planifier un live',
    scheduleDesc: 'Programme ton prochain live',
    startLive: 'Demarrer un live',
    startLiveDesc: 'Passe en direct maintenant',
    createListing: 'Creer une annonce',
    createListingDesc: 'Vends un produit',
  },
  en: {
    createTitle: 'Create',
    iaExpress: 'IA Express',
    iaDescription: 'AI creates your listing',
    newBadge: 'New',
    scheduleLive: 'Schedule a live',
    scheduleDesc: 'Schedule your next live',
    startLive: 'Start a live',
    startLiveDesc: 'Go live now',
    createListing: 'Create a listing',
    createListingDesc: 'Sell a product',
  },
  he: {
    createTitle: 'יצירה',
    iaExpress: 'IA Express',
    iaDescription: 'הבינה המלאכותית יוצרת את המודעה',
    newBadge: 'חדש',
    scheduleLive: 'תזמן שידור חי',
    scheduleDesc: 'תזמן את השידור הבא',
    startLive: 'התחל שידור חי',
    startLiveDesc: 'עבור לשידור חי עכשיו',
    createListing: 'צור מודעה',
    createListingDesc: 'מכור מוצר',
  },
  es: {
    createTitle: 'Crear',
    iaExpress: 'IA Express',
    iaDescription: 'La IA crea tu anuncio',
    newBadge: 'Nuevo',
    scheduleLive: 'Programar un live',
    scheduleDesc: 'Programa tu próximo live',
    startLive: 'Iniciar un live',
    startLiveDesc: 'Transmite en vivo ahora',
    createListing: 'Crear un anuncio',
    createListingDesc: 'Vende un producto',
  },
}

export default function SellPopup({ isOpen, onClose }: SellPopupProps) {
  const navigate = useNavigate()
  const lang = getLang()
  const c = popupContent[lang] || popupContent.fr

  const actions = [
    {
      label: c.iaExpress,
      description: c.iaDescription,
      gradient: 'linear-gradient(135deg, #F0908A, #E8344E)',
      route: '/ai-listing',
      featured: true,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="white" stroke="white" strokeWidth="1"/>
        </svg>
      ),
    },
    {
      label: c.scheduleLive,
      description: c.scheduleDesc,
      gradient: 'linear-gradient(135deg, #F0908A, #E8344E)',
      route: null,
      featured: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: c.startLive,
      description: c.startLiveDesc,
      gradient: 'linear-gradient(135deg, #E8344E, #F0908A)',
      route: '/go-live',
      featured: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: c.createListing,
      description: c.createListingDesc,
      gradient: 'linear-gradient(135deg, #F0908A, #E8344E)',
      route: null,
      featured: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  if (!isOpen) return null

  const handleAction = (route: string | null) => {
    onClose()
    navigate(route || '/dashboard')
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#0D0D0D',
          borderRadius: '24px 24px 0 0',
          padding: '24px',
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '40px',
            height: '4px',
            backgroundColor: '#333',
            borderRadius: '2px',
          }} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 20px 0',
        }}>
          {c.createTitle}
        </h2>

        {/* Featured AI button - full width */}
        {actions.filter(a => a.featured).map((action) => (
          <button
            key={action.label}
            onClick={() => handleAction(action.route)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(240,144,138,0.12), rgba(232,52,78,0.06))',
              border: '1px solid rgba(240,144,138,0.3)',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              textAlign: 'left',
              marginBottom: '16px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: '-15px', right: '-15px',
              width: '60px', height: '60px', borderRadius: '50%',
              backgroundColor: 'rgba(240,144,138,0.08)',
            }} />
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: action.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(240,144,138,0.3)',
            }}>
              {action.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {action.label}
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#F0908A',
                  backgroundColor: 'rgba(240,144,138,0.15)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {c.newBadge}
                </span>
              </div>
              <div style={{
                fontSize: '13px',
                color: '#999',
              }}>
                {action.description}
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ))}

        {/* 2x2 Grid for other actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}>
          {actions.filter(a => !a.featured).map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.route)}
              style={{
                background: '#111',
                border: '1px solid #222',
                borderRadius: '14px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '10px',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: action.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {action.icon}
              </div>
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '4px',
                }}>
                  {action.label}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#888',
                }}>
                  {action.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
