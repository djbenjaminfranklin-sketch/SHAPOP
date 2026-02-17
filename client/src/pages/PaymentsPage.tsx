import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { showToast } from '../lib/toast'
import { Browser } from '@capacitor/browser'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

type Lang = 'fr' | 'en' | 'he' | 'es'

const content = {
  fr: {
    title: 'Paiements et livraison',
    payTitle: 'Moyens de paiement',
    securePayments: 'Connectez Stripe pour recevoir vos paiements',
    secureDesc: 'Stripe gere vos paiements de maniere securisee. Les acheteurs paient, et vous recevez votre argent automatiquement.',
    setupPayment: 'Connecter avec Stripe',
    paymentConfigured: 'Stripe connecte',
    configuredDesc: 'Votre compte Stripe est actif. Vous pouvez recevoir des paiements et consulter votre tableau de bord.',
    openDashboard: 'Ouvrir mon dashboard Stripe',
    pendingDesc: 'Votre compte Stripe est en cours de verification. Completez les informations manquantes.',
    completSetup: 'Completer la configuration',
    loading: 'Chargement...',
    connecting: 'Connexion a Stripe...',
    shipTitle: 'Preferences de livraison',
    defaultShip: 'Livraison par defaut',
    standard: 'Standard (La Poste)',
    express: 'Express (coursier)',
    pickup: 'Retrait en main propre',
    feesTitle: 'Vos frais',
    feesDesc: 'Commission 8% + Stripe 2,9% + 0,30\u20AC + TVA 20%',
    feesExample: 'Exemple : vente de 50\u20AC \u2192 vous recevez 43,10\u20AC',
    pending: 'En attente',
    notSellerMsg: 'Devenez vendeur pour connecter Stripe et recevoir des paiements.',
    savedLocally: 'Sauvegarde sur cet appareil',
    errorConnect: 'Erreur de connexion a Stripe',
    errorDashboard: 'Impossible d\'ouvrir le dashboard Stripe',
    errorLoad: 'Erreur de chargement du statut Stripe',
    buyerCardTitle: 'Carte bancaire',
    buyerCardDesc: 'Ajoutez une carte pour encherir en live',
    buyerCardSaved: 'Carte enregistree',
    buyerCardLast4: 'se terminant par',
    buyerChangeCard: 'Changer de carte',
    buyerAddCard: 'Ajouter une carte',
    buyerSaveCard: 'Enregistrer la carte',
    buyerCardSuccess: 'Carte enregistree avec succes !',
    buyerCardError: 'Erreur lors de l\'enregistrement',
    buyerNoCard: 'Aucune carte enregistree',
    buyerNoCardDesc: 'Ajoutez une carte bancaire pour pouvoir encherir sur les lives',
  },
  en: {
    title: 'Payments & Shipping',
    payTitle: 'Payment Methods',
    securePayments: 'Connect Stripe to receive payments',
    secureDesc: 'Stripe securely manages your payments. Buyers pay, and you receive your money automatically.',
    setupPayment: 'Connect with Stripe',
    paymentConfigured: 'Stripe connected',
    configuredDesc: 'Your Stripe account is active. You can receive payments and access your dashboard.',
    openDashboard: 'Open my Stripe dashboard',
    pendingDesc: 'Your Stripe account is being verified. Complete missing information.',
    completSetup: 'Complete setup',
    loading: 'Loading...',
    connecting: 'Connecting to Stripe...',
    shipTitle: 'Shipping Preferences',
    defaultShip: 'Default shipping',
    standard: 'Standard (postal)',
    express: 'Express (courier)',
    pickup: 'Self pickup',
    feesTitle: 'Your fees',
    feesDesc: 'Commission 8% + Stripe 2.9% + \u20AC0.30 + VAT 20%',
    feesExample: 'Example: \u20AC50 sale \u2192 you receive \u20AC43.10',
    pending: 'Pending',
    notSellerMsg: 'Become a seller to connect Stripe and receive payments.',
    savedLocally: 'Saved on this device',
    errorConnect: 'Failed to connect to Stripe',
    errorDashboard: 'Failed to open Stripe dashboard',
    errorLoad: 'Failed to load Stripe status',
    buyerCardTitle: 'Payment card',
    buyerCardDesc: 'Add a card to bid on live streams',
    buyerCardSaved: 'Card saved',
    buyerCardLast4: 'ending in',
    buyerChangeCard: 'Change card',
    buyerAddCard: 'Add a card',
    buyerSaveCard: 'Save card',
    buyerCardSuccess: 'Card saved successfully!',
    buyerCardError: 'Error saving card',
    buyerNoCard: 'No card saved',
    buyerNoCardDesc: 'Add a payment card to bid on live streams',
  },
  he: {
    title: '\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D5\u05DE\u05E9\u05DC\u05D5\u05D7',
    payTitle: '\u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD',
    securePayments: '\u05D7\u05D1\u05E8 \u05D0\u05EA Stripe \u05DC\u05E7\u05D1\u05DC\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD',
    secureDesc: 'Stripe \u05DE\u05E0\u05D4\u05DC \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D1\u05D0\u05D5\u05E4\u05DF \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7.',
    setupPayment: '\u05D4\u05EA\u05D7\u05D1\u05E8 \u05E2\u05DD Stripe',
    paymentConfigured: 'Stripe \u05DE\u05D7\u05D5\u05D1\u05E8',
    configuredDesc: '\u05D7\u05E9\u05D1\u05D5\u05DF Stripe \u05E9\u05DC\u05DA \u05E4\u05E2\u05D9\u05DC. \u05D0\u05EA\u05D4 \u05D9\u05DB\u05D5\u05DC \u05DC\u05E7\u05D1\u05DC \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD.',
    openDashboard: '\u05E4\u05EA\u05D7 \u05D3\u05E9\u05D1\u05D5\u05E8\u05D3 Stripe',
    pendingDesc: '\u05D7\u05E9\u05D1\u05D5\u05DF Stripe \u05D1\u05D0\u05D9\u05DE\u05D5\u05EA. \u05D4\u05E9\u05DC\u05DD \u05D0\u05EA \u05D4\u05DE\u05D9\u05D3\u05E2 \u05D4\u05D7\u05E1\u05E8.',
    completSetup: '\u05D4\u05E9\u05DC\u05DD \u05D4\u05D2\u05D3\u05E8\u05D4',
    loading: '...\u05D8\u05D5\u05E2\u05DF',
    connecting: '...\u05DE\u05EA\u05D7\u05D1\u05E8 \u05DC-Stripe',
    shipTitle: '\u05D4\u05E2\u05D3\u05E4\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7',
    defaultShip: '\u05DE\u05E9\u05DC\u05D5\u05D7 \u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC',
    standard: '\u05E8\u05D2\u05D9\u05DC (\u05D3\u05D5\u05D0\u05E8)',
    express: '\u05DE\u05D4\u05D9\u05E8 (\u05E9\u05DC\u05D9\u05D7)',
    pickup: '\u05D0\u05D9\u05E1\u05D5\u05E3 \u05E2\u05E6\u05DE\u05D9',
    feesTitle: '\u05D4\u05E2\u05DE\u05DC\u05D5\u05EA \u05E9\u05DC\u05DA',
    feesDesc: '\u05E2\u05DE\u05DC\u05D4 8% + Stripe 2.9% + 0.30\u20AC + \u05DE\u05E2"\u05DE 20%',
    feesExample: '\u05D3\u05D5\u05D2\u05DE\u05D4: \u05DE\u05DB\u05D9\u05E8\u05D4 50\u20AC \u2192 \u05DE\u05E7\u05D1\u05DC\u05D9\u05DD 43.10\u20AC',
    pending: '\u05D1\u05D4\u05DE\u05EA\u05E0\u05D4',
    notSellerMsg: '\u05D4\u05E4\u05D5\u05DA \u05DC\u05DE\u05D5\u05DB\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D7\u05D1\u05E8 Stripe \u05D5\u05DC\u05E7\u05D1\u05DC \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD.',
    savedLocally: '\u05E0\u05E9\u05DE\u05E8 \u05D1\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D6\u05D4',
    errorConnect: '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DC-Stripe',
    errorDashboard: '\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E4\u05EA\u05D5\u05D7 \u05D0\u05EA \u05D3\u05E9\u05D1\u05D5\u05E8\u05D3 Stripe',
    errorLoad: '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E1\u05D8\u05D8\u05D5\u05E1 Stripe',
    buyerCardTitle: '\u05DB\u05E8\u05D8\u05D9\u05E1 \u05EA\u05E9\u05DC\u05D5\u05DD',
    buyerCardDesc: '\u05D4\u05D5\u05E1\u05E3 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05DC\u05D4\u05E6\u05D9\u05E2 \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05D7\u05D9\u05D9\u05DD',
    buyerCardSaved: '\u05DB\u05E8\u05D8\u05D9\u05E1 \u05E0\u05E9\u05DE\u05E8',
    buyerCardLast4: '\u05DE\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1',
    buyerChangeCard: '\u05D4\u05D7\u05DC\u05E3 \u05DB\u05E8\u05D8\u05D9\u05E1',
    buyerAddCard: '\u05D4\u05D5\u05E1\u05E3 \u05DB\u05E8\u05D8\u05D9\u05E1',
    buyerSaveCard: '\u05E9\u05DE\u05D5\u05E8 \u05DB\u05E8\u05D8\u05D9\u05E1',
    buyerCardSuccess: '!\u05DB\u05E8\u05D8\u05D9\u05E1 \u05E0\u05E9\u05DE\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4',
    buyerCardError: '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05DB\u05E8\u05D8\u05D9\u05E1',
    buyerNoCard: '\u05D0\u05D9\u05DF \u05DB\u05E8\u05D8\u05D9\u05E1 \u05E9\u05DE\u05D5\u05E8',
    buyerNoCardDesc: '\u05D4\u05D5\u05E1\u05E3 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05DC\u05D4\u05E6\u05D9\u05E2 \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05D7\u05D9\u05D9\u05DD',
  },
  es: {
    title: 'Pagos y Envio',
    payTitle: 'Metodos de Pago',
    securePayments: 'Conecta Stripe para recibir pagos',
    secureDesc: 'Stripe gestiona tus pagos de forma segura. Los compradores pagan y tu recibes tu dinero automaticamente.',
    setupPayment: 'Conectar con Stripe',
    paymentConfigured: 'Stripe conectado',
    configuredDesc: 'Tu cuenta Stripe esta activa. Puedes recibir pagos y acceder a tu panel.',
    openDashboard: 'Abrir mi panel de Stripe',
    pendingDesc: 'Tu cuenta Stripe esta en verificacion. Completa la informacion faltante.',
    completSetup: 'Completar configuracion',
    loading: 'Cargando...',
    connecting: 'Conectando a Stripe...',
    shipTitle: 'Preferencias de Envio',
    defaultShip: 'Envio predeterminado',
    standard: 'Estandar (Correos)',
    express: 'Express (mensajero)',
    pickup: 'Recoger en persona',
    feesTitle: 'Tus comisiones',
    feesDesc: 'Comision 8% + Stripe 2,9% + 0,30\u20AC + IVA 20%',
    feesExample: 'Ejemplo: venta de 50\u20AC \u2192 recibes 43,10\u20AC',
    pending: 'Pendiente',
    notSellerMsg: 'Conviertete en vendedor para conectar Stripe y recibir pagos.',
    savedLocally: 'Guardado en este dispositivo',
    errorConnect: 'Error al conectar con Stripe',
    errorDashboard: 'No se pudo abrir el panel de Stripe',
    errorLoad: 'Error al cargar el estado de Stripe',
    buyerCardTitle: 'Tarjeta bancaria',
    buyerCardDesc: 'Agrega una tarjeta para pujar en directo',
    buyerCardSaved: 'Tarjeta guardada',
    buyerCardLast4: 'terminada en',
    buyerChangeCard: 'Cambiar tarjeta',
    buyerAddCard: 'Agregar tarjeta',
    buyerSaveCard: 'Guardar tarjeta',
    buyerCardSuccess: 'Tarjeta guardada correctamente!',
    buyerCardError: 'Error al guardar la tarjeta',
    buyerNoCard: 'Sin tarjeta guardada',
    buyerNoCardDesc: 'Agrega una tarjeta bancaria para poder pujar en los directos',
  },
}

interface StripeStatus {
  connected: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
  details_submitted?: boolean
}

interface CardInfo {
  has_card: boolean
  brand?: string
  last4?: string
  exp_month?: number
  exp_year?: number
}

// Stripe Elements loader
let stripePromise: Promise<Stripe | null> | null = null
function getStripePromise() {
  if (!stripePromise) {
    stripePromise = apiFetch('/api/stripe/config')
      .then(r => r.json())
      .then(({ publishable_key }) => loadStripe(publishable_key))
      .catch(() => null)
  }
  return stripePromise
}

function SetupCardFormInner({ clientSecret, onSuccess, onError, loading, setLoading, saveLabel }: {
  clientSecret: string
  onSuccess: () => void
  onError: (msg: string) => void
  loading: boolean
  setLoading: (v: boolean) => void
  saveLabel: string
}) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return
    setLoading(true)

    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    })

    if (error) {
      onError(error.message || 'Failed to save card')
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        padding: '14px', borderRadius: '10px',
        backgroundColor: '#0D0D0D', border: '1px solid #333',
      }}>
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#fff',
              '::placeholder': { color: '#555' },
              iconColor: '#F0908A',
            },
            invalid: { color: '#E8344E' },
          },
        }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%', marginTop: '16px', padding: '16px',
          background: loading ? '#555' : 'linear-gradient(135deg, #F0908A, #E8344E)',
          borderRadius: '14px', border: 'none',
          color: '#fff', fontSize: '16px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '...' : saveLabel}
      </button>
    </form>
  )
}

export default function PaymentsPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const lang = (getLang() || 'fr') as Lang
  const c = content[lang] || content.fr

  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  // Buyer card state
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null)
  const [cardLoading, setCardLoading] = useState(true)
  const [showCardSetup, setShowCardSetup] = useState(false)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupSuccess, setSetupSuccess] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [shippingPref, setShippingPref] = useState<number>(() => {
    const saved = localStorage.getItem('shippingPref')
    return saved !== null ? Number(saved) : 0
  })

  const fetchStatus = useCallback(async () => {
    // Only fetch Stripe status if user is a seller
    if (!profile?.is_seller) {
      setLoading(false)
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const res = await apiFetch('/api/stripe/account-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      } else {
        // Don't show error toast for 404 (no Stripe account yet) or 500 (server issue)
        // Silently fail — the UI will show "Connect Stripe" which is correct
        console.warn('Stripe status check failed:', res.status)
      }
    } catch {
      // Network error — don't show toast, just fail gracefully
      console.warn('Stripe status check failed: network error')
    }
    setLoading(false)
  }, [profile?.is_seller])

  // Fetch buyer card info
  const fetchCardInfo = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCardLoading(false); return }
      const res = await apiFetch('/api/stripe/card-info', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCardInfo(data)
      }
    } catch {
      console.warn('Card info check failed')
    }
    setCardLoading(false)
  }, [])

  const openCardSetup = async () => {
    setSetupError(null)
    setSetupSuccess(false)
    setSetupLoading(false)
    setSetupClientSecret(null)
    setShowCardSetup(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const resp = await apiFetch('/api/stripe/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        setSetupError(err.error || c.buyerCardError)
        return
      }
      const data = await resp.json()
      if (data.client_secret) {
        setSetupClientSecret(data.client_secret)
      }
    } catch {
      setSetupError(c.buyerCardError)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    fetchCardInfo()
  }, [fetchCardInfo])

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (searchParams.get('stripe') === 'success') {
      fetchStatus()
    }
  }, [searchParams, fetchStatus])

  // Refetch Stripe status when in-app browser closes (user returns from Stripe onboarding)
  useEffect(() => {
    let listener: { remove: () => void } | undefined
    Browser.addListener('browserFinished', () => {
      fetchStatus()
    }).then(l => { listener = l })
    return () => { listener?.remove() }
  }, [fetchStatus])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country: profile?.country || 'FR' }),
      })
      const data = await res.json()
      if (data.url) {
        await Browser.open({ url: data.url })
      } else if (data.error) {
        showToast(data.error, 'error')
      }
    } catch (err) {
      console.error('Stripe connect error:', err)
      showToast(c.errorConnect, 'error')
    }
    setConnecting(false)
  }

  const handleDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/stripe/dashboard-link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      if (data.url) {
        await Browser.open({ url: data.url })
      } else if (data.error) {
        showToast(data.error, 'error')
      }
    } catch {
      showToast(c.errorDashboard, 'error')
    }
  }

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const isFullyConnected = status?.connected && status?.charges_enabled && status?.payouts_enabled
  const isPending = status?.connected && !isFullyConnected

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Payment Methods */}
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{c.payTitle}</h2>

        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '24px',
          textAlign: 'center', marginBottom: '16px',
        }}>
          {loading ? (
            <p style={{ fontSize: '14px', color: '#888' }}>{c.loading}</p>
          ) : isFullyConnected ? (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E', marginBottom: '8px' }}>
                {c.paymentConfigured}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '20px' }}>
                {c.configuredDesc}
              </p>
              <button
                onClick={handleDashboard}
                style={{
                  padding: '12px 24px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6772E5, #4F46E5)',
                  border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.openDashboard}
              </button>
            </>
          ) : isPending ? (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B', marginBottom: '8px' }}>
                Stripe - {c.pending}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '20px' }}>
                {c.pendingDesc}
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                style={{
                  padding: '12px 24px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', opacity: connecting ? 0.6 : 1,
                }}
              >
                {connecting ? c.connecting : c.completSetup}
              </button>
            </>
          ) : (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                {c.securePayments}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '20px', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
                {c.secureDesc}
              </p>
              {profile?.is_seller ? (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  style={{
                    padding: '14px 28px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6772E5, #4F46E5)',
                    border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                    cursor: 'pointer', opacity: connecting ? 0.6 : 1,
                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  }}
                >
                  {connecting ? c.connecting : c.setupPayment}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px 0', marginTop: '4px',
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#F59E0B', textDecoration: 'underline' }}>
                    {c.notSellerMsg}
                  </p>
                </button>
              )}
            </>
          )}
        </div>

        {/* Buyer card section */}
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px', marginTop: '24px' }}>
          {c.buyerCardTitle}
        </h2>
        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '20px',
          marginBottom: '16px',
        }}>
          {cardLoading ? (
            <p style={{ fontSize: '14px', color: '#888', textAlign: 'center' }}>{c.loading}</p>
          ) : showCardSetup ? (
            <div>
              {setupSuccess ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                    border: '2px solid rgba(34,197,94,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E', margin: '0 0 8px' }}>
                    {c.buyerCardSuccess}
                  </p>
                  <button
                    onClick={() => { setShowCardSetup(false); setSetupSuccess(false); fetchCardInfo() }}
                    style={{
                      padding: '12px 24px', marginTop: '12px',
                      background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                      borderRadius: '12px', border: 'none',
                      color: '#fff', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <>
                  {setupError && (
                    <div style={{
                      padding: '10px 14px', marginBottom: '12px',
                      backgroundColor: 'rgba(232,52,78,0.1)',
                      border: '1px solid rgba(232,52,78,0.3)',
                      borderRadius: '10px',
                    }}>
                      <p style={{ fontSize: '13px', color: '#E8344E', margin: 0 }}>{setupError}</p>
                    </div>
                  )}

                  {setupClientSecret ? (
                    <Elements stripe={getStripePromise()}>
                      <SetupCardFormInner
                        clientSecret={setupClientSecret}
                        onSuccess={() => { setSetupSuccess(true); setSetupLoading(false) }}
                        onError={(msg) => { setSetupError(msg); setSetupLoading(false) }}
                        loading={setupLoading}
                        setLoading={setSetupLoading}
                        saveLabel={c.buyerSaveCard}
                      />
                    </Elements>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                      <div style={{
                        width: '32px', height: '32px', margin: '0 auto',
                        border: '3px solid #333', borderTopColor: '#F0908A',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      }} />
                    </div>
                  )}

                  <button
                    onClick={() => { setShowCardSetup(false); setSetupError(null) }}
                    style={{
                      width: '100%', marginTop: '12px', padding: '10px',
                      backgroundColor: 'transparent',
                      border: '1px solid #333', borderRadius: '10px',
                      color: '#888', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {lang === 'fr' ? 'Fermer' : lang === 'es' ? 'Cerrar' : lang === 'he' ? '\u05E1\u05D2\u05D5\u05E8' : 'Close'}
                  </button>
                </>
              )}
            </div>
          ) : cardInfo?.has_card ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#22C55E', margin: '0 0 2px' }}>
                  {c.buyerCardSaved}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  {(cardInfo.brand || 'Card').toUpperCase()} {c.buyerCardLast4} {cardInfo.last4}
                </p>
              </div>
              <button
                onClick={openCardSetup}
                style={{
                  padding: '8px 16px', borderRadius: '10px',
                  background: 'transparent', border: '1px solid #333',
                  color: '#aaa', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.buyerChangeCard}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(240,144,138,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                {c.buyerNoCard}
              </p>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto' }}>
                {c.buyerNoCardDesc}
              </p>
              <button
                onClick={openCardSetup}
                style={{
                  padding: '14px 28px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(240,144,138,0.3)',
                }}
              >
                {c.buyerAddCard}
              </button>
            </div>
          )}
        </div>

        {/* Fees summary */}
        {profile?.is_seller && (
          <div style={{
            backgroundColor: '#111', borderRadius: '14px', padding: '16px 20px',
            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>
              {'\u{1F4B0}'}
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{c.feesTitle}</p>
              <p style={{ fontSize: '12px', color: '#888' }}>{c.feesDesc}</p>
              <p style={{ fontSize: '12px', color: '#F59E0B', marginTop: '2px' }}>{c.feesExample}</p>
            </div>
          </div>
        )}

        {/* Shipping Preferences */}
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{c.shipTitle}</h2>
        <div style={{ backgroundColor: '#111', borderRadius: '14px', overflow: 'hidden' }}>
          <p style={{ fontSize: '12px', color: '#888', padding: '16px 16px 8px' }}>{c.defaultShip}</p>
          {[c.standard, c.express, c.pickup].map((opt, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: i < 2 ? '1px solid #1A1A1A' : 'none', cursor: 'pointer' }}>
              <input type="radio" name="shipping" checked={shippingPref === i} onChange={() => { setShippingPref(i); localStorage.setItem('shippingPref', String(i)) }} style={{ accentColor: '#F0908A' }} />
              <span style={{ fontSize: '15px', color: '#fff' }}>{opt}</span>
            </label>
          ))}
          <p style={{ fontSize: '11px', color: '#555', padding: '8px 16px 12px', textAlign: 'right' }}>{c.savedLocally}</p>
        </div>
      </div>
    </div>
  )
}
