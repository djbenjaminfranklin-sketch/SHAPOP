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
    scheduleDesc: 'Choisis ta date et ton heure',
    startLive: 'Demarrer un live',
    startLiveDesc: 'Passe en direct maintenant',
    directSale: 'Vente directe',
    directSaleDesc: 'Vends au prix fixe, sans live',
    createListing: 'Creer une annonce',
    createListingDesc: 'Vends un produit',
  },
  en: {
    createTitle: 'Create',
    iaExpress: 'IA Express',
    iaDescription: 'AI creates your listing',
    newBadge: 'New',
    scheduleLive: 'Schedule a live',
    scheduleDesc: 'Pick your date and time',
    startLive: 'Start a live',
    startLiveDesc: 'Go live now',
    directSale: 'Direct sale',
    directSaleDesc: 'Sell at fixed price, no live',
    createListing: 'Create a listing',
    createListingDesc: 'Sell a product',
  },
  he: {
    createTitle: 'יצירה',
    iaExpress: 'IA Express',
    iaDescription: 'הבינה המלאכותית יוצרת את המודעה',
    newBadge: 'חדש',
    scheduleLive: 'תזמן שידור חי',
    scheduleDesc: 'בחר תאריך ושעה',
    startLive: 'התחל שידור חי',
    startLiveDesc: 'עבור לשידור חי עכשיו',
    directSale: 'מכירה ישירה',
    directSaleDesc: 'מכור במחיר קבוע, בלי שידור',
    createListing: 'צור מודעה',
    createListingDesc: 'מכור מוצר',
  },
  es: {
    createTitle: 'Crear',
    iaExpress: 'IA Express',
    iaDescription: 'La IA crea tu anuncio',
    newBadge: 'Nuevo',
    scheduleLive: 'Programar un live',
    scheduleDesc: 'Elige tu fecha y hora',
    startLive: 'Iniciar un live',
    startLiveDesc: 'Transmite en vivo ahora',
    directSale: 'Venta directa',
    directSaleDesc: 'Vende a precio fijo, sin live',
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
      route: '/schedule-live',
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
      label: c.directSale,
      description: c.directSaleDesc,
      gradient: 'linear-gradient(135deg, #10B981, #059669)',
      route: '/ai-listing?mode=direct',
      featured: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: c.createListing,
      description: c.createListingDesc,
      gradient: 'linear-gradient(135deg, #F0908A, #E8344E)',
      route: '/ai-listing?mode=manual',
      featured: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="none" stroke="white" strokeWidth="2"/>
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
      backgroundColor: '#000',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
          {c.createTitle}
        </h2>
        <button
          onClick={onClose}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: '#1A1A1A', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, padding: '12px 20px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        display: 'flex', flexDirection: 'column', gap: '16px',
        overflowY: 'auto',
      }}>
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
              padding: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
              touchAction: 'manipulation',
            }}
          >
            <div style={{
              position: 'absolute', top: '-15px', right: '-15px',
              width: '60px', height: '60px', borderRadius: '50%',
              backgroundColor: 'rgba(240,144,138,0.08)',
            }} />
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: action.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(240,144,138,0.3)',
            }}>
              {action.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '18px', fontWeight: 800, color: '#fff',
                marginBottom: '4px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                {action.label}
                <span style={{
                  fontSize: '10px', fontWeight: 700, color: '#F0908A',
                  backgroundColor: 'rgba(240,144,138,0.15)',
                  padding: '3px 10px', borderRadius: '100px',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {c.newBadge}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#999' }}>
                {action.description}
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ))}

        {/* Grid for other actions */}
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
                borderRadius: '16px',
                padding: '20px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '12px',
                textAlign: 'left',
                touchAction: 'manipulation',
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: action.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {action.icon}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                  {action.label}
                </div>
                <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.4 }}>
                  {action.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}
