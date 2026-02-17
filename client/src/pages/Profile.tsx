import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { showToast } from '../lib/toast'
import CartoonAvatar from '../components/CartoonAvatar'

type Lang = ReturnType<typeof getLang>

const tx = (fr: string, en: string, he: string, es: string, lang: Lang) => {
  if (lang === 'en') return en
  if (lang === 'he') return he
  if (lang === 'es') return es
  return fr
}

interface MyStream {
  id: string
  title: string
  category: string
  status: 'scheduled' | 'live' | 'ended'
  created_at: string
  item_count?: number
}

export default function Profile() {
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [myStreams, setMyStreams] = useState<MyStream[]>([])
  const [streamsLoaded, setStreamsLoaded] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
  }, [profile])

  // Fetch seller's streams
  useEffect(() => {
    if (!user || !profile?.is_seller) return
    const fetchStreams = async () => {
      const { data } = await supabase
        .from('streams')
        .select('id, title, category, status, created_at')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
      if (data) {
        const withCounts = await Promise.all(
          data.map(async (s) => {
            const { count } = await supabase
              .from('items')
              .select('*', { count: 'exact', head: true })
              .eq('stream_id', s.id)
            return { ...s, item_count: count || 0 } as MyStream
          })
        )
        setMyStreams(withCounts)
      }
      setStreamsLoaded(true)
    }
    fetchStreams()
  }, [user, profile?.is_seller])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleAvatarTap = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast(tx('Seuls JPEG, PNG et WebP sont acceptes.', 'Only JPEG, PNG, and WebP images are allowed.', 'רק תמונות JPEG, PNG ו-WebP מותרות.', 'Solo se permiten imagenes JPEG, PNG y WebP.', lang), 'error')
      return
    }
    if (file.size > MAX_SIZE) {
      showToast(tx("L'image doit faire moins de 5 Mo.", 'Image must be smaller than 5MB.', 'התמונה חייבת להיות קטנה מ-5MB.', 'La imagen debe pesar menos de 5MB.', lang), 'error')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const newUrl = urlData.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', user.id)
      setAvatarUrl(newUrl)
    } catch {
      // Avatar upload failed
    }
    setUploading(false)
  }

  // ── Animation helper ──
  const entrance = (delay: string): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.45s ease ${delay}, transform 0.45s ease ${delay}`,
  })

  // ════════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════════
  if (authLoading || (user && !profile)) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #333', borderTopColor: '#F0908A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════
  // NOT LOGGED IN
  // ════════════════════════════════════════════════════════════════════
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))', paddingLeft: '32px', paddingRight: '32px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <img src="/logo.png" alt="ShaPop" style={{ height: '40px', marginBottom: '32px', objectFit: 'contain' }} />
        <div style={{
          width: '96px', height: '96px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(240,144,138,0.15) 0%, rgba(232,52,78,0.1) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px', boxShadow: '0 0 40px rgba(240,144,138,0.1)',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
          {tx('Connecte-toi a ShaPop', 'Sign in to ShaPop', '\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DC-ShaPop', 'Inicia sesion en ShaPop', lang)}
        </h1>
        <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', marginBottom: '32px', lineHeight: 1.5, maxWidth: '280px' }}>
          {tx('Achete, vends et participe aux lives en direct', 'Buy, sell and join live streams', '\u05E7\u05E0\u05D4, \u05DE\u05DB\u05D5\u05E8 \u05D5\u05D4\u05E6\u05D8\u05E8\u05E3 \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05D7\u05D9\u05D9\u05DD', 'Compra, vende y unete a los lives', lang)}
        </p>
        <Link to="/login" style={{
          display: 'block', width: '100%', maxWidth: '320px', padding: '16px', borderRadius: '14px',
          textDecoration: 'none', background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
          color: '#fff', fontSize: '16px', fontWeight: 700, textAlign: 'center',
          boxShadow: '0 6px 24px rgba(240,144,138,0.35)', marginBottom: '12px',
        }}>
          {tx('Se connecter', 'Sign in', '\u05D4\u05EA\u05D7\u05D1\u05E8', 'Iniciar sesion', lang)}
        </Link>
        <Link to="/register" style={{
          display: 'block', width: '100%', maxWidth: '320px', padding: '16px', borderRadius: '14px',
          textDecoration: 'none', backgroundColor: 'transparent', border: '1.5px solid #333',
          color: '#ccc', fontSize: '16px', fontWeight: 700, textAlign: 'center',
        }}>
          {tx('Creer un compte', 'Create account', '\u05E6\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF', 'Crear cuenta', lang)}
        </Link>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════
  // ICONS
  // ════════════════════════════════════════════════════════════════════
  const ico = {
    shield: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    affiliate: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    card: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    pin: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    verified: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
      </svg>
    ),
    bell: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
    controls: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
    mail: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
      </svg>
    ),
    lock: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
    key: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    ),
    gear: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
    chat: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/>
      </svg>
    ),
    warning: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    tax: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/>
      </svg>
    ),
    doc: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
      </svg>
    ),
    help: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    crown: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14"/>
      </svg>
    ),
    logout: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
  }

  const chevron = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  )

  const externalIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )

  // ════════════════════════════════════════════════════════════════════
  // MENU DATA
  // ════════════════════════════════════════════════════════════════════

  type MenuItem = {
    icon: React.JSX.Element
    label: string
    sub?: string
    external?: boolean
    to?: string
  }

  const accountItems: MenuItem[] = [
    { icon: ico.shield, label: tx('Etat du compte', 'Account status', '\u05DE\u05E6\u05D1 \u05D7\u05E9\u05D1\u05D5\u05DF', 'Estado de cuenta', lang), to: '/account-status' },
    { icon: ico.card, label: tx('Paiements et livraison', 'Payments & shipping', '\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D5\u05DE\u05E9\u05DC\u05D5\u05D7', 'Pagos y envio', lang), to: '/payments' },
    { icon: ico.pin, label: tx('Adresses', 'Addresses', '\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA', 'Direcciones', lang), to: '/addresses' },
    { icon: ico.bell, label: tx('Notifications', 'Notifications', '\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA', 'Notificaciones', lang), to: '/notifications' },
    { icon: ico.controls, label: tx('Controles de compte', 'Account controls', '\u05D1\u05E7\u05E8\u05D5\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF', 'Controles de cuenta', lang), to: '/preferences' },
    { icon: ico.mail, label: tx("Modifier l'adresse e-mail", 'Change email', '\u05E9\u05E0\u05D4 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC', 'Cambiar e-mail', lang), sub: user.email || '', to: '/change-email' },
    { icon: ico.lock, label: tx('Modifier le mot de passe', 'Change password', '\u05E9\u05E0\u05D4 \u05E1\u05D9\u05E1\u05DE\u05D4', 'Cambiar contrasena', lang), to: '/change-password' },
    { icon: ico.key, label: tx("Cle d'acces", 'Passkey', '\u05DE\u05E4\u05EA\u05D7 \u05D2\u05D9\u05E9\u05D4', 'Clave de acceso', lang), to: '/security' },
  ]

  // Admin link — only for admin email
  const ADMIN_EMAIL = 'djbenjaminfranklin@gmail.com'
  const adminItems: MenuItem[] = user.email?.toLowerCase() === ADMIN_EMAIL ? [
    { icon: ico.gear, label: tx('Administration', 'Administration', 'ניהול', 'Administracion', lang), to: '/admin' },
  ] : []

  const supportItems: MenuItem[] = [
    { icon: ico.chat, label: tx('Nous contacter', 'Contact us', '\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8', 'Contactanos', lang), to: '/contact' },
    { icon: ico.warning, label: tx('Rapports des utilisateurs', 'User reports', '\u05D3\u05D9\u05D5\u05D5\u05D7\u05D9 \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD', 'Reportes de usuarios', lang), to: '/contact' },
    { icon: ico.tax, label: tx('Exoneration de la taxe de vente', 'Sales tax exemption', '\u05E4\u05D8\u05D5\u05E8 \u05DE\u05DE\u05E1 \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA', 'Exencion de impuestos', lang), to: '/contact' },
    { icon: ico.doc, label: tx('Politique de confidentialite', 'Privacy policy', '\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA', 'Politica de privacidad', lang), external: true, to: '/privacy' },
    { icon: ico.doc, label: tx('Conditions generales', 'Terms of Service', '\u05EA\u05E0\u05D0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9', 'Terminos de servicio', lang), external: true, to: '/terms' },
    { icon: ico.doc, label: tx('CLUF', 'EULA', '\u05D4\u05E1\u05DB\u05DD \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF', 'CLUF', lang), external: true, to: '/eula' },
    { icon: ico.help, label: 'FAQ', external: true, to: '/faq' },
  ]

  // ── Render a single menu row ──
  const renderRow = (item: MenuItem, isLast: boolean, idx: number) => (
    <button
      key={idx}
      onClick={() => item.to && navigate(item.to)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        width: '100%', padding: '15px 16px',
        background: 'none', border: 'none',
        borderBottom: isLast ? 'none' : '1px solid #1A1A1A',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '15px', color: '#E5E5E5', fontWeight: 500, display: 'block', lineHeight: 1.3 }}>
          {item.label}
        </span>
        {item.sub && (
          <span style={{ fontSize: '13px', color: '#666', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.sub}
          </span>
        )}
      </div>
      {item.external ? externalIcon : chevron}
    </button>
  )

  // ════════════════════════════════════════════════════════════════════
  // LOGGED IN RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

        {/* ── HEADER: Avatar + Username + "Afficher le profil" ──────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '24px 20px 16px',
          ...entrance('0ms'),
        }}>
          {/* Tappable avatar */}
          <div
            onClick={handleAvatarTap}
            style={{
              position: 'relative', width: '80px', height: '80px', flexShrink: 0, cursor: 'pointer',
            }}
          >
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              backgroundColor: '#E8344E', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: uploading ? 0.5 : 1, transition: 'opacity 0.3s',
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <CartoonAvatar seed={user.id} size={80} />
              )}
            </div>
            {/* Camera badge */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: '26px', height: '26px', borderRadius: '50%',
              backgroundColor: '#333', border: '2px solid #000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Name + button */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{
                fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile?.display_name || profile?.username}
              </h1>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            <button
              onClick={() => navigate('/preferences')}
              style={{
                marginTop: '8px', padding: '8px 20px', borderRadius: '8px',
                backgroundColor: 'transparent', border: '1.5px solid #444',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', letterSpacing: '0.01em',
              }}
            >
              {tx('Modifier le profil', 'Edit profile', '\u05E2\u05E8\u05D5\u05DA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC', 'Editar perfil', lang)}
            </button>
          </div>
        </div>

        {/* ── "Compte" header ─────────────────────────────────────── */}
        <div style={{ padding: '4px 20px 12px', ...entrance('40ms') }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 }}>
            {tx('Compte', 'Account', '\u05D7\u05E9\u05D1\u05D5\u05DF', 'Cuenta', lang)}
          </h2>
        </div>

        {/* ── Mes lives card (seller only) ──────────────────────── */}
        {profile?.is_seller && (
          <div style={{
            padding: '0 16px 20px',
            ...entrance('100ms'),
          }}>
            <button onClick={() => navigate('/go-live?manage=true')} style={{
              width: '100%',
              backgroundColor: '#1A1A1A', border: 'none', borderRadius: '14px',
              padding: '16px 14px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(232,52,78,0.2), rgba(240,144,138,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5">
                  <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: 0 }}>
                  {tx('Mes lives', 'My lives', 'השידורים שלי', 'Mis directos', lang)}
                </p>
                {streamsLoaded && myStreams.length > 0 && (
                  <p style={{ color: '#888', fontSize: '13px', margin: '2px 0 0' }}>
                    {myStreams.length} {tx('lives', 'lives', 'שידורים', 'directos', lang)}
                  </p>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Account menu items ──────────────────────────────────── */}
        <div style={{ padding: '0 0 8px', ...entrance('120ms') }}>
          {accountItems.map((item, i) => renderRow(item, i === accountItems.length - 1, i))}
        </div>

        {/* ── Admin menu (only for admin) ──────────────────────── */}
        {adminItems.length > 0 && (
          <>
            <div style={{ height: '8px', backgroundColor: '#111', ...entrance('140ms') }} />
            <div style={{ padding: '8px 0', ...entrance('150ms') }}>
              {adminItems.map((item, i) => renderRow(item, i === adminItems.length - 1, i + accountItems.length + 100))}
            </div>
          </>
        )}

        {/* ── Separator ───────────────────────────────────────────── */}
        <div style={{ height: '8px', backgroundColor: '#111', ...entrance('160ms') }} />

        {/* ── Support menu items ──────────────────────────────────── */}
        <div style={{ padding: '8px 0 0', ...entrance('200ms') }}>
          {supportItems.map((item, i) => renderRow(item, i === supportItems.length - 1, i + accountItems.length))}
        </div>

        {/* ── Sign out button ─────────────────────────────────────── */}
        <div style={{ padding: '20px 16px 12px', ...entrance('240ms') }}>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              width: '100%', padding: '15px',
              backgroundColor: '#222', border: 'none', borderRadius: '12px',
              color: '#ccc', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {ico.logout}
            {tx('Se deconnecter', 'Sign out', '\u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA', 'Cerrar sesion', lang)}
          </button>
        </div>

        {/* ── Version ─────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', paddingBottom: '24px', ...entrance('280ms') }}>
          <p style={{ fontSize: '12px', color: '#444', margin: 0 }}>v1.0.0 (1)</p>
          <p style={{ fontSize: '12px', color: '#444', margin: '2px 0 0' }}>&copy; 2026 ShaPop</p>
        </div>

      </div>
    </div>
  )
}
