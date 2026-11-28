import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { tr, type Localized } from '../../lib/i18n'
import { rtlTextAlign, rtlFlip } from '../../lib/rtl'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import { DIRECT_SALES_ENABLED } from '../../lib/directSales'

interface SellPopupProps {
  isOpen: boolean
  onClose: () => void
}

const popupContent = {
  en: {
    createTitle: 'Create',
    iaExpress: 'AI Express',
    iaDescription: 'AI writes your listing',
    newBadge: 'New',
    scheduleLive: 'Schedule a live',
    scheduleDesc: 'Pick your date and time',
    startLive: 'Start a live',
    startLiveDesc: 'Go live now',
    directSale: 'Direct sale',
    directSaleDesc: 'Sell at a fixed price, no live',
    createListing: 'Create a listing',
    createListingDesc: 'Sell a product',
    becomeSellerTitle: 'Become a seller',
    becomeSellerDesc: 'To sell on ShaPop, first complete your seller profile.',
    becomeSellerStep1: 'Accept the community rules',
    becomeSellerStep2: 'Choose your selling category',
    becomeSellerStep3: 'Set up your return address',
    becomeSellerStep4: 'Set your return policy',
    becomeSellerStep5: 'Set up your payout method',
    becomeSellerCta: 'Start sign-up',
    becomeSellerTime: 'About 2 minutes',
    stripeRequiredTitle: 'Connect your Stripe account',
    stripeRequiredDesc: 'To sell on ShaPop, first connect your Stripe account so you can get paid.',
    stripeRequiredCta: 'Connect Stripe',
    stripeRequiredLoading: 'Checking...',
    ilBankTitle: 'Add your bank account',
    ilBankDesc: 'To sell in Israel, add the Israeli bank account where you will receive your sales.',
    ilBankCta: 'Add my bank account',
  },
  fr: {
    createTitle: 'Créer',
    iaExpress: 'IA Express',
    iaDescription: 'L\'IA rédige ton annonce',
    newBadge: 'Nouveau',
    scheduleLive: 'Programmer un live',
    scheduleDesc: 'Choisis ta date et ton heure',
    startLive: 'Démarrer un live',
    startLiveDesc: 'Passe en direct maintenant',
    directSale: 'Vente directe',
    directSaleDesc: 'Vends à prix fixe, sans live',
    createListing: 'Créer une annonce',
    createListingDesc: 'Vends un produit',
    becomeSellerTitle: 'Devenir vendeur',
    becomeSellerDesc: 'Pour vendre sur ShaPop, complète d\'abord ton profil vendeur.',
    becomeSellerStep1: 'Accepter les règles de la communauté',
    becomeSellerStep2: 'Choisir ta catégorie de vente',
    becomeSellerStep3: 'Configurer ton adresse de retour',
    becomeSellerStep4: 'Définir ta politique de retour',
    becomeSellerStep5: 'Configurer ton moyen de paiement',
    becomeSellerCta: 'Commencer l\'inscription',
    becomeSellerTime: 'Environ 2 minutes',
    stripeRequiredTitle: 'Connecte ton compte Stripe',
    stripeRequiredDesc: 'Pour vendre sur ShaPop, connecte d\'abord ton compte Stripe pour recevoir tes paiements.',
    stripeRequiredCta: 'Connecter Stripe',
    stripeRequiredLoading: 'Vérification...',
    ilBankTitle: 'Ajoute ton compte bancaire',
    ilBankDesc: 'Pour vendre en Israël, ajoute le compte bancaire israélien sur lequel tu recevras tes ventes.',
    ilBankCta: 'Ajouter mon compte bancaire',
  },
  es: {
    createTitle: 'Crear',
    iaExpress: 'IA Express',
    iaDescription: 'La IA redacta tu anuncio',
    newBadge: 'Nuevo',
    scheduleLive: 'Programar un directo',
    scheduleDesc: 'Elige fecha y hora',
    startLive: 'Iniciar un directo',
    startLiveDesc: 'Emite en directo ahora',
    directSale: 'Venta directa',
    directSaleDesc: 'Vende a precio fijo, sin directo',
    createListing: 'Crear un anuncio',
    createListingDesc: 'Vende un producto',
    becomeSellerTitle: 'Hazte vendedor',
    becomeSellerDesc: 'Para vender en ShaPop, primero completa tu perfil de vendedor.',
    becomeSellerStep1: 'Aceptar las normas de la comunidad',
    becomeSellerStep2: 'Elegir tu categoría de venta',
    becomeSellerStep3: 'Configurar tu dirección de devolución',
    becomeSellerStep4: 'Definir tu política de devoluciones',
    becomeSellerStep5: 'Configurar tu método de cobro',
    becomeSellerCta: 'Empezar el registro',
    becomeSellerTime: 'Unos 2 minutos',
    stripeRequiredTitle: 'Conecta tu cuenta de Stripe',
    stripeRequiredDesc: 'Para vender en ShaPop, primero conecta tu cuenta de Stripe para recibir tus pagos.',
    stripeRequiredCta: 'Conectar Stripe',
    stripeRequiredLoading: 'Comprobando...',
    ilBankTitle: 'Añade tu cuenta bancaria',
    ilBankDesc: 'Para vender en Israel, añade la cuenta bancaria israelí donde recibirás tus ventas.',
    ilBankCta: 'Añadir mi cuenta bancaria',
  },
  ru: {
    createTitle: 'Создать',
    iaExpress: 'ИИ Экспресс',
    iaDescription: 'ИИ составит объявление за тебя',
    newBadge: 'Новое',
    scheduleLive: 'Запланировать эфир',
    scheduleDesc: 'Выбери дату и время',
    startLive: 'Начать эфир',
    startLiveDesc: 'Выйти в эфир прямо сейчас',
    directSale: 'Прямая продажа',
    directSaleDesc: 'Продавай по фиксированной цене, без эфира',
    createListing: 'Создать объявление',
    createListingDesc: 'Продай товар',
    becomeSellerTitle: 'Стать продавцом',
    becomeSellerDesc: 'Чтобы продавать на ShaPop, сначала заполни профиль продавца.',
    becomeSellerStep1: 'Принять правила сообщества',
    becomeSellerStep2: 'Выбрать категорию товаров',
    becomeSellerStep3: 'Указать адрес для возвратов',
    becomeSellerStep4: 'Задать условия возврата',
    becomeSellerStep5: 'Настроить способ получения выплат',
    becomeSellerCta: 'Начать регистрацию',
    becomeSellerTime: 'Около 2 минут',
    stripeRequiredTitle: 'Подключи аккаунт Stripe',
    stripeRequiredDesc: 'Чтобы продавать на ShaPop, сначала подключи аккаунт Stripe для получения выплат.',
    stripeRequiredCta: 'Подключить Stripe',
    stripeRequiredLoading: 'Проверяем...',
    ilBankTitle: 'Добавь банковский счёт',
    ilBankDesc: 'Чтобы продавать в Израиле, добавь израильский банковский счёт для получения денег за продажи.',
    ilBankCta: 'Добавить счёт',
  },
  he: {
    createTitle: 'יצירה',
    iaExpress: 'AI אקספרס',
    iaDescription: 'הבינה המלאכותית כותבת את המודעה',
    newBadge: 'חדש',
    scheduleLive: 'תזמון שידור חי',
    scheduleDesc: 'בחר/י תאריך ושעה',
    startLive: 'התחלת שידור חי',
    startLiveDesc: 'עולים לשידור עכשיו',
    directSale: 'מכירה ישירה',
    directSaleDesc: 'מכירה במחיר קבוע, בלי שידור',
    createListing: 'יצירת מודעה',
    createListingDesc: 'מכירת מוצר',
    becomeSellerTitle: 'להפוך למוכר/ת',
    becomeSellerDesc: 'כדי למכור ב-ShaPop, צריך קודם להשלים את פרופיל המוכר/ת.',
    becomeSellerStep1: 'אישור כללי הקהילה',
    becomeSellerStep2: 'בחירת קטגוריית מכירה',
    becomeSellerStep3: 'הגדרת כתובת להחזרות',
    becomeSellerStep4: 'הגדרת מדיניות החזרות',
    becomeSellerStep5: 'הגדרת אמצעי לקבלת תשלומים',
    becomeSellerCta: 'להתחיל בהרשמה',
    becomeSellerTime: 'כ-2 דקות',
    stripeRequiredTitle: 'חיבור חשבון Stripe',
    stripeRequiredDesc: 'כדי למכור ב-ShaPop, צריך קודם לחבר חשבון Stripe כדי לקבל תשלומים.',
    stripeRequiredCta: 'חיבור Stripe',
    stripeRequiredLoading: 'בודקים...',
    ilBankTitle: 'הוספת חשבון בנק',
    ilBankDesc: 'כדי למכור בישראל, הוסיפו את חשבון הבנק הישראלי שאליו יועברו כספי המכירות.',
    ilBankCta: 'הוספת חשבון הבנק שלי',
  },
} satisfies Localized<Record<string, string>>

export default function SellPopup({ isOpen, onClose }: SellPopupProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const c = tr(popupContent)

  const isSeller = !!profile?.is_seller
  const isIsraeli = profile?.country === 'IL'
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
          .select('bank_choice, paypal_email, stripe_account_id, airwallex_beneficiary_id, payout_iban')
          .eq('id', profile!.id)
          .maybeSingle()

        // Israël : compte bancaire enregistré chez Airwallex = paiement configuré
        if (seller?.airwallex_beneficiary_id || (profile?.country === 'IL' && seller?.payout_iban)) {
          setPaymentConnected(true)
          return
        }
        if (profile?.country === 'IL') {
          // Vendeur israélien sans compte bancaire : l'encart le renvoie vers « Être payé en Israël »
          const { data: session } = await supabase.auth.getSession()
          const t = session?.session?.access_token
          const pr = t ? await apiFetch('/api/payments/provider', { headers: { 'Authorization': `Bearer ${t}` } }) : null
          const prov = pr && pr.ok ? await pr.json() : null
          if (prov?.provider === 'airwallex') { setPaymentConnected(false); return }
        }

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
    ...(DIRECT_SALES_ENABLED ? [{
      label: c.directSale,
      description: c.iaDescription,
      gradient: 'linear-gradient(135deg, #00E5FF, #0091EA)',
      route: '/ai-listing',
      featured: true,
      badge: c.iaExpress,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#001014" stroke="#001014" strokeWidth="1"/>
        </svg>
      ),
    }] : []),
    {
      label: c.scheduleLive,
      description: c.scheduleDesc,
      gradient: 'linear-gradient(135deg, #00E5FF, #0091EA)',
      route: '/schedule-live',
      featured: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#001014" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: c.startLive,
      description: c.startLiveDesc,
      gradient: 'linear-gradient(135deg, #0091EA, #00E5FF)',
      route: '/go-live',
      featured: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#001014" strokeWidth="2">
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
        <h2 style={{ fontSize: 'calc(24px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0 }}>
          {!isSeller ? c.becomeSellerTitle : paymentConnected === false ? (isIsraeli ? c.ilBankTitle : c.stripeRequiredTitle) : c.createTitle}
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
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)) + 24px)',
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
                background: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 60%, #0091EA 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(40px * var(--fs, 1))',
                boxShadow: '0 8px 32px rgba(0, 229, 255,0.25), 0 0 0 6px rgba(0, 229, 255,0.08)',
              }}>
                {'\u{1F6CD}\u{FE0F}'}
              </div>
            </div>

            {/* Description */}
            <p style={{
              fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center',
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
                    background: 'linear-gradient(135deg, rgba(0, 229, 255,0.15), rgba(0,229,255,0.08))',
                    border: '1px solid rgba(0, 229, 255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#D4D4D4', fontWeight: 500, lineHeight: 1.4 }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* Time estimate */}
            <p style={{
              fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center',
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
                background: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 50%, #0091EA 100%)',
                borderRadius: '16px', border: 'none',
                color: '#001014', fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(0, 229, 255,0.35), 0 2px 8px rgba(0,229,255,0.3)',
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
              border: '3px solid #333', borderTopColor: '#00E5FF',
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
                background: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 60%, #006F80 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(40px * var(--fs, 1))',
                boxShadow: '0 8px 32px rgba(99,91,255,0.25), 0 0 0 6px rgba(99,91,255,0.08)',
              }}>
                {'\u{1F4B3}'}
              </div>
            </div>
            <p style={{
              fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center',
              lineHeight: 1.6, margin: '0 0 16px',
            }}>
              {isIsraeli ? c.ilBankDesc : c.stripeRequiredDesc}
            </p>
            <button
              onClick={() => { onClose(); navigate(isIsraeli ? '/payouts-israel' : '/payments') }}
              style={{
                width: '100%', padding: '18px', marginTop: '8px',
                background: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 50%, #006F80 100%)',
                borderRadius: '16px', border: 'none',
                color: '#001014', fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 800,
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
              {isIsraeli ? c.ilBankCta : c.stripeRequiredCta}
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
                  background: 'linear-gradient(135deg, rgba(0, 229, 255,0.12), rgba(0,229,255,0.06))',
                  border: '1px solid rgba(0, 229, 255,0.3)',
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
                  position: 'absolute', top: '-15px', insetInlineEnd: '-15px',
                  width: '60px', height: '60px', borderRadius: '50%',
                  backgroundColor: 'rgba(0, 229, 255,0.08)',
                }} />
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: action.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 16px rgba(0, 229, 255,0.3)',
                }}>
                  {action.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff',
                    marginBottom: '4px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    {action.label}
                    {'badge' in action && action.badge && (
                      <span style={{
                        fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF',
                        backgroundColor: 'rgba(0, 229, 255,0.15)',
                        padding: '3px 10px', borderRadius: '100px',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0' }}>
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
                    <div style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                      {action.label}
                    </div>
                    <div style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.4 }}>
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
