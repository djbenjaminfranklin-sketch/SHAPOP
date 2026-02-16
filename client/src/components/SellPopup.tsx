import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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
    becomeSellerTitle: 'Devenir vendeur',
    becomeSellerDesc: 'Pour vendre sur WhatFor, tu dois d\'abord completer ton profil vendeur.',
    becomeSellerStep1: 'Accepter les regles de la communaute',
    becomeSellerStep2: 'Choisir ta categorie de vente',
    becomeSellerStep3: 'Configurer ton adresse de retour',
    becomeSellerStep4: 'Definir ta politique de retour',
    becomeSellerStep5: 'Configurer ton moyen de paiement',
    becomeSellerCta: 'Commencer l\'inscription',
    becomeSellerTime: 'Environ 2 minutes',
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
    becomeSellerTitle: 'Become a seller',
    becomeSellerDesc: 'To sell on WhatFor, you need to complete your seller profile first.',
    becomeSellerStep1: 'Accept community rules',
    becomeSellerStep2: 'Choose your selling category',
    becomeSellerStep3: 'Set up your return address',
    becomeSellerStep4: 'Define your return policy',
    becomeSellerStep5: 'Set up your payment method',
    becomeSellerCta: 'Start registration',
    becomeSellerTime: 'About 2 minutes',
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
    becomeSellerTitle: 'הפוך למוכר',
    becomeSellerDesc: 'כדי למכור ב-WhatFor, עליך להשלים את פרופיל המוכר שלך.',
    becomeSellerStep1: 'קבל את כללי הקהילה',
    becomeSellerStep2: 'בחר את קטגוריית המכירה',
    becomeSellerStep3: 'הגדר כתובת החזרה',
    becomeSellerStep4: 'הגדר מדיניות החזרות',
    becomeSellerStep5: 'הגדר אמצעי תשלום',
    becomeSellerCta: 'התחל הרשמה',
    becomeSellerTime: 'כ-2 דקות',
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
    becomeSellerTitle: 'Convertirte en vendedor',
    becomeSellerDesc: 'Para vender en WhatFor, primero debes completar tu perfil de vendedor.',
    becomeSellerStep1: 'Aceptar las reglas de la comunidad',
    becomeSellerStep2: 'Elegir tu categoria de venta',
    becomeSellerStep3: 'Configurar tu direccion de devolucion',
    becomeSellerStep4: 'Definir tu politica de devolucion',
    becomeSellerStep5: 'Configurar tu metodo de pago',
    becomeSellerCta: 'Empezar el registro',
    becomeSellerTime: 'Aproximadamente 2 minutos',
  },
}

export default function SellPopup({ isOpen, onClose }: SellPopupProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const lang = getLang()
  const c = popupContent[lang] || popupContent.fr

  const isSeller = !!profile?.is_seller

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

  const handleBecomeSeller = () => {
    onClose()
    navigate('/dashboard')
  }

  const steps = [
    c.becomeSellerStep1,
    c.becomeSellerStep2,
    c.becomeSellerStep3,
    c.becomeSellerStep4,
    c.becomeSellerStep5,
  ]

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
          {isSeller ? c.createTitle : c.becomeSellerTitle}
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
        {!isSeller ? (
          /* ═══ NON-SELLER: Become a seller screen ═══ */
          <>
            {/* Hero icon */}
            <div style={{
              display: 'flex', justifyContent: 'center', marginTop: '8px', marginBottom: '4px',
            }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 60%, #B91C3C 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '40px',
                boxShadow: '0 8px 32px rgba(240,144,138,0.25), 0 0 0 6px rgba(240,144,138,0.08)',
              }}>
                {'\u{1F6CD}\u{FE0F}'}
              </div>
            </div>

            {/* Description */}
            <p style={{
              fontSize: '15px', color: '#888', textAlign: 'center',
              lineHeight: 1.6, margin: '0 0 8px',
            }}>
              {c.becomeSellerDesc}
            </p>

            {/* Steps checklist */}
            <div style={{
              background: 'linear-gradient(135deg, #0F0F0F 0%, #141418 50%, #0F0F0F 100%)',
              borderRadius: '20px',
              border: '1px solid #1A1A1A',
              padding: '6px 0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}>
              {steps.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px 20px',
                  borderBottom: i < steps.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.08))',
                    border: '1px solid rgba(240,144,138,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '13px', fontWeight: 700, color: '#F0908A',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '14px', color: '#D4D4D4', fontWeight: 500, lineHeight: 1.4 }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* Time estimate */}
            <p style={{
              fontSize: '13px', color: '#666', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              margin: '4px 0 0',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {c.becomeSellerTime}
            </p>

            {/* CTA button */}
            <button
              onClick={handleBecomeSeller}
              style={{
                width: '100%', padding: '18px', marginTop: '8px',
                background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 50%, #B91C3C 100%)',
                borderRadius: '16px', border: 'none',
                color: '#fff', fontSize: '17px', fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(240,144,138,0.35), 0 2px 8px rgba(232,52,78,0.3)',
                letterSpacing: '0.3px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              }} />
              {c.becomeSellerCta}
            </button>
          </>
        ) : (
          /* ═══ SELLER: Normal sell actions ═══ */
          <>
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
          </>
        )}
      </div>
      </div>
    </div>
  )
}
