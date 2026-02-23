import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getLang } from '../../lib/i18n'
import { rtlTextAlign, rtlFlip } from '../../lib/rtl'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'

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
    becomeSellerDesc: 'Pour vendre sur Shapop, tu dois d\'abord completer ton profil vendeur.',
    becomeSellerStep1: 'Accepter les regles de la communaute',
    becomeSellerStep2: 'Choisir ta categorie de vente',
    becomeSellerStep3: 'Configurer ton adresse de retour',
    becomeSellerStep4: 'Definir ta politique de retour',
    becomeSellerStep5: 'Configurer ton moyen de paiement',
    becomeSellerCta: 'Commencer l\'inscription',
    becomeSellerTime: 'Environ 2 minutes',
    stripeRequiredTitle: 'Connecte ton compte Stripe',
    stripeRequiredDesc: 'Pour vendre sur Shapop, tu dois d\'abord connecter ton compte Stripe pour recevoir tes paiements.',
    stripeRequiredCta: 'Connecter Stripe',
    stripeRequiredLoading: 'Verification...',
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
    becomeSellerDesc: 'To sell on Shapop, you need to complete your seller profile first.',
    becomeSellerStep1: 'Accept community rules',
    becomeSellerStep2: 'Choose your selling category',
    becomeSellerStep3: 'Set up your return address',
    becomeSellerStep4: 'Define your return policy',
    becomeSellerStep5: 'Set up your payment method',
    becomeSellerCta: 'Start registration',
    becomeSellerTime: 'About 2 minutes',
    stripeRequiredTitle: 'Connect your Stripe account',
    stripeRequiredDesc: 'To sell on Shapop, you must first connect your Stripe account to receive payments.',
    stripeRequiredCta: 'Connect Stripe',
    stripeRequiredLoading: 'Checking...',
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
    becomeSellerDesc: 'כדי למכור ב-Shapop, עליך להשלים את פרופיל המוכר שלך.',
    becomeSellerStep1: 'קבל את כללי הקהילה',
    becomeSellerStep2: 'בחר את קטגוריית המכירה',
    becomeSellerStep3: 'הגדר כתובת החזרה',
    becomeSellerStep4: 'הגדר מדיניות החזרות',
    becomeSellerStep5: 'הגדר אמצעי תשלום',
    becomeSellerCta: 'התחל הרשמה',
    becomeSellerTime: 'כ-2 דקות',
    stripeRequiredTitle: 'חבר את חשבון Stripe שלך',
    stripeRequiredDesc: 'כדי למכור ב-Shapop, עליך לחבר את חשבון Stripe שלך כדי לקבל תשלומים.',
    stripeRequiredCta: 'חבר Stripe',
    stripeRequiredLoading: '...בודק',
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
    becomeSellerDesc: 'Para vender en Shapop, primero debes completar tu perfil de vendedor.',
    becomeSellerStep1: 'Aceptar las reglas de la comunidad',
    becomeSellerStep2: 'Elegir tu categoria de venta',
    becomeSellerStep3: 'Configurar tu direccion de devolucion',
    becomeSellerStep4: 'Definir tu politica de devolucion',
    becomeSellerStep5: 'Configurar tu metodo de pago',
    becomeSellerCta: 'Empezar el registro',
    becomeSellerTime: 'Aproximadamente 2 minutos',
    stripeRequiredTitle: 'Conecta tu cuenta Stripe',
    stripeRequiredDesc: 'Para vender en Shapop, primero debes conectar tu cuenta Stripe para recibir pagos.',
    stripeRequiredCta: 'Conectar Stripe',
    stripeRequiredLoading: 'Verificando...',
  },
}

export default function SellPopup({ isOpen, onClose }: SellPopupProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const lang = getLang()
  const c = popupContent[lang] || popupContent.fr

  const isSeller = !!profile?.is_seller
  const [paymentConnected, setPaymentConnected] = useState<boolean | null>(null) // null = loading

  // Check payment connection status when popup opens and user is a seller
  useEffect(() => {
    if (!isOpen || !isSeller) return
    setPaymentConnected(null) // reset to loading
    const checkPayment = async () => {
      try {
        // First check if seller uses PayPal (no need to call server)
        const { data: seller } = await supabase
          .from('sellers')
          .select('bank_choice, paypal_email, stripe_account_id')
          .eq('id', profile!.id)
          .single()

        if (seller?.bank_choice === 'paypal' && seller?.paypal_email) {
          setPaymentConnected(true)
          return
        }

        // Otherwise check Stripe via API
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        if (!token) { setPaymentConnected(false); return }
        const resp = await apiFetch('/api/stripe/account-status', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await resp.json()
        setPaymentConnected(data.connected && data.charges_enabled)
      } catch {
        setPaymentConnected(false)
      }
    }
    checkPayment()
  }, [isOpen, isSeller])

  const actions = [
    {
      label: c.directSale,
      description: c.iaDescription,
      gradient: 'linear-gradient(135deg, #F0908A, #E8344E)',
      route: '/ai-listing',
      featured: true,
      badge: c.iaExpress,
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
          {!isSeller ? c.becomeSellerTitle : paymentConnected === false ? c.stripeRequiredTitle : c.createTitle}
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
                <div key={step} style={{
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
        ) : paymentConnected === null ? (
          /* ═══ SELLER: Loading Stripe status ═══ */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '3px solid #333', borderTopColor: '#F0908A',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : paymentConnected === false ? (
          /* ═══ SELLER: Stripe not connected ═══ */
          <>
            <div style={{
              display: 'flex', justifyContent: 'center', marginTop: '8px', marginBottom: '4px',
            }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #635BFF 0%, #7A73FF 60%, #0A2540 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '40px',
                boxShadow: '0 8px 32px rgba(99,91,255,0.25), 0 0 0 6px rgba(99,91,255,0.08)',
              }}>
                {'\u{1F4B3}'}
              </div>
            </div>
            <p style={{
              fontSize: '15px', color: '#888', textAlign: 'center',
              lineHeight: 1.6, margin: '0 0 16px',
            }}>
              {c.stripeRequiredDesc}
            </p>
            <button
              onClick={() => { onClose(); navigate('/payments') }}
              style={{
                width: '100%', padding: '18px', marginTop: '8px',
                background: 'linear-gradient(135deg, #635BFF 0%, #7A73FF 50%, #0A2540 100%)',
                borderRadius: '16px', border: 'none',
                color: '#fff', fontSize: '17px', fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(99,91,255,0.35), 0 2px 8px rgba(99,91,255,0.3)',
                letterSpacing: '0.3px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              }} />
              {c.stripeRequiredCta}
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
                  ...rtlTextAlign('left'),
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
                    {'badge' in action && action.badge && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, color: '#F0908A',
                        backgroundColor: 'rgba(240,144,138,0.15)',
                        padding: '3px 10px', borderRadius: '100px',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#999' }}>
                    {action.description}
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
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
                    ...rtlTextAlign('left'),
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
