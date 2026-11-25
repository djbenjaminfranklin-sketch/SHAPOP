import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getLocale, tr, useLang, LANG_META } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { currencyForCountry } from '../lib/fulfillment'
import { showToast } from '../lib/toast'
import { apiFetch } from '../lib/api'
import CartoonAvatar from '../components/CartoonAvatar'
import { usePageTitle } from '../hooks/usePageTitle'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

interface MyStream {
  id: string
  title: string
  category: string
  status: 'scheduled' | 'live' | 'ended'
  created_at: string
  item_count?: number
}

export default function Profile() {
  // Numéro de version réel de l'app installée (sur le web : celui de package.json)
  const [appVersion, setAppVersion] = useState("")
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    CapApp.getInfo().then(i => setAppVersion(`v${i.version} (${i.build})`)).catch(() => {})
  }, [])
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const lang = useLang()
  const profileWord = tr({ en: 'Profile', fr: 'Profil', es: 'Perfil', ru: 'Профиль', he: 'פרופיל' })
  usePageTitle(profile?.display_name ? `${profile.display_name} — ${profileWord}` : profileWord)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [myStreams, setMyStreams] = useState<MyStream[]>([])
  const [streamsLoaded, setStreamsLoaded] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [saving, setSaving] = useState(false)

  // Buyer stats
  const [buyerStats, setBuyerStats] = useState<{
    total_spent: number
    order_count: number
    pending_count: number
    buyer_score: number
  } | null>(null)
  const [buyerStatsLoaded, setBuyerStatsLoaded] = useState(false)

  // Loyalty
  const [loyalty, setLoyalty] = useState<{
    tier: string
    points: number
    next_tier: string | null
    next_tier_threshold: number
  } | null>(null)
  const [loyaltyLoaded, setLoyaltyLoaded] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
  }, [profile])

  // Fetch buyer stats
  useEffect(() => {
    if (!user) return
    const fetchBuyerStats = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return
        const res = await apiFetch('/api/buyer/stats', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (import.meta.env.DEV) console.log('[Profile] buyer stats:', data)
          setBuyerStats(data)
        } else {
          console.warn('[Profile] buyer stats failed:', res.status, await res.text().catch(() => ''))
        }
      } catch (err) {
        console.error('[Profile] buyer stats error:', err)
      }
      setBuyerStatsLoaded(true)
    }
    fetchBuyerStats()
  }, [user])

  // Fetch loyalty
  useEffect(() => {
    if (!user) return
    const fetchLoyalty = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return
        const res = await apiFetch('/api/loyalty', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (import.meta.env.DEV) console.log('[Profile] loyalty:', data)
          setLoyalty(data)
        } else {
          console.warn('[Profile] loyalty failed:', res.status, await res.text().catch(() => ''))
        }
      } catch (err) {
        console.error('[Profile] loyalty error:', err)
      }
      setLoyaltyLoaded(true)
    }
    fetchLoyalty()
  }, [user])

  // Fetch seller's streams
  useEffect(() => {
    if (!user || !profile?.is_seller) return
    const fetchStreams = async () => {
      try {
        const { data, error } = await supabase
          .from('streams')
          .select('id, title, category, status, created_at, items(count)')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (error) { console.error('[Profile] streams fetch:', error.message); setStreamsLoaded(true); return }
        if (data) {
          const withCounts = data.map((s: any) => ({
            ...s,
            item_count: s.items?.[0]?.count || 0,
            items: undefined,
          }) as MyStream)
          setMyStreams(withCounts)
        }
      } catch (err) {
        console.error('[Profile] streams fetch error:', err)
      } finally {
        setStreamsLoaded(true)
      }
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
      showToast(tr({ en: 'Only JPEG, PNG and WebP images are allowed.', fr: 'Seuls les formats JPEG, PNG et WebP sont acceptés.', es: 'Solo se aceptan imágenes JPEG, PNG y WebP.', ru: 'Подходят только изображения JPEG, PNG и WebP.', he: 'אפשר להעלות רק תמונות JPEG, PNG או WebP.' }), 'error')
      return
    }
    if (file.size > MAX_SIZE) {
      showToast(tr({ en: 'The image must be under 5 MB.', fr: 'L\'image doit faire moins de 5 Mo.', es: 'La imagen debe pesar menos de 5 MB.', ru: 'Изображение должно быть меньше 5 МБ.', he: 'התמונה צריכה להיות קטנה מ-5MB.' }), 'error')
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
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', user.id)
      if (updateError) {
        showToast(tr({ en: 'Couldn\'t update your photo.', fr: 'Impossible de mettre à jour ta photo.', es: 'No se pudo actualizar tu foto.', ru: 'Не удалось обновить фото.', he: 'לא הצלחנו לעדכן את התמונה.' }), 'error')
        console.error('Avatar profile update failed:', updateError)
        return
      }
      setAvatarUrl(newUrl)
    } catch (err) {
      console.error('Avatar upload failed:', err)
    }
    setUploading(false)
  }

  const handleEditStart = () => {
    setEditDisplayName(profile?.display_name || '')
    setEditBio(profile?.bio || '')
    setEditMode(true)
  }

  const handleEditCancel = () => {
    setEditMode(false)
  }

  const handleEditSave = async () => {
    if (!user) return
    if (!editDisplayName.trim()) {
      showToast(tr({ en: 'Name can\'t be empty.', fr: 'Le nom ne peut pas être vide.', es: 'El nombre no puede estar vacío.', ru: 'Имя не может быть пустым.', he: 'השם לא יכול להיות ריק.' }), 'error')
      return
    }
    if (editDisplayName.length > 50) {
      showToast(tr({ en: 'Name can\'t be longer than 50 characters.', fr: 'Le nom ne peut pas dépasser 50 caractères.', es: 'El nombre no puede superar los 50 caracteres.', ru: 'Имя не может быть длиннее 50 символов.', he: 'השם יכול להכיל עד 50 תווים.' }), 'error')
      return
    }
    if (editBio.length > 200) {
      showToast(tr({ en: 'Bio can\'t be longer than 200 characters.', fr: 'La bio ne peut pas dépasser 200 caractères.', es: 'La bio no puede superar los 200 caracteres.', ru: 'Описание не может быть длиннее 200 символов.', he: 'הביו יכול להכיל עד 200 תווים.' }), 'error')
      return
    }
    setSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('No auth token')
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: editDisplayName.trim(),
          bio: editBio.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      // Refresh the profile from Supabase to update the local state
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (updatedProfile) {
        // Force AuthContext to refetch by triggering a re-render
        // We update local profile state indirectly via AuthContext
        window.dispatchEvent(new Event('profile-updated'))
      }
      setEditMode(false)
      showToast(tr({ en: 'Profile updated!', fr: 'Profil mis à jour !', es: '¡Perfil actualizado!', ru: 'Профиль обновлён!', he: 'הפרופיל עודכן!' }), 'success')
      // Reload the page to reflect changes from AuthContext
      window.location.reload()
    } catch {
      showToast(tr({ en: 'Couldn\'t update your profile.', fr: 'Impossible de mettre à jour ton profil.', es: 'No se pudo actualizar tu perfil.', ru: 'Не удалось обновить профиль.', he: 'לא הצלחנו לעדכן את הפרופיל.' }), 'error')
    }
    setSaving(false)
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
        <div role="status" aria-label={tr({ en: 'Loading profile', fr: 'Chargement du profil', es: 'Cargando perfil', ru: 'Загрузка профиля', he: 'טוען פרופיל' })} style={{ width: '32px', height: '32px', border: '3px solid #333', borderTopColor: '#F0908A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)', paddingInline: '32px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
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
        <h1 style={{ fontSize: 'calc(24px * var(--fs, 1))', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
          {tr({ en: 'Sign in to ShaPop', fr: 'Connecte-toi à ShaPop', es: 'Inicia sesión en ShaPop', ru: 'Войди в ShaPop', he: 'התחברות ל-ShaPop' })}
        </h1>
        <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#666', textAlign: 'center', marginBottom: '32px', lineHeight: 1.5, maxWidth: '280px' }}>
          {tr({ en: 'Buy, sell and join live shows', fr: 'Achète, vends et rejoins les lives', es: 'Compra, vende y únete a los directos', ru: 'Покупай, продавай и смотри эфиры', he: 'קונים, מוכרים ומצטרפים לשידורים חיים' })}
        </p>
        <Link to="/login" style={{
          display: 'block', width: '100%', maxWidth: '320px', padding: '16px', borderRadius: '14px',
          textDecoration: 'none', background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
          color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, textAlign: 'center',
          boxShadow: '0 6px 24px rgba(240,144,138,0.35)', marginBottom: '12px',
        }}>
          {tr({ en: 'Sign in', fr: 'Se connecter', es: 'Iniciar sesión', ru: 'Войти', he: 'התחברות' })}
        </Link>
        <Link to="/register" style={{
          display: 'block', width: '100%', maxWidth: '320px', padding: '16px', borderRadius: '14px',
          textDecoration: 'none', backgroundColor: 'transparent', border: '1.5px solid #333',
          color: '#ccc', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, textAlign: 'center',
        }}>
          {tr({ en: 'Create an account', fr: 'Créer un compte', es: 'Crear una cuenta', ru: 'Создать аккаунт', he: 'יצירת חשבון' })}
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}>
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

  const langMeta = LANG_META[lang]
  const languageIcon = <span aria-hidden="true" className="no-theme-invert" style={{ fontSize: 'calc(20px * var(--fs, 1))', lineHeight: 1 }}>{langMeta.flag}</span>

  const accountItems: MenuItem[] = [
    { icon: languageIcon, label: tr({ en: 'Language', fr: 'Langue', es: 'Idioma', ru: 'Язык', he: 'שפה' }), sub: langMeta.name, to: '/preferences' },
    { icon: ico.shield, label: tr({ en: 'Account status', fr: 'État du compte', es: 'Estado de la cuenta', ru: 'Статус аккаунта', he: 'מצב החשבון' }), to: '/account-status' },
    { icon: ico.verified, label: tr({ en: 'Identity verification', fr: 'Vérification d\'identité', es: 'Verificación de identidad', ru: 'Подтверждение личности', he: 'אימות זהות' }), sub: tr({ en: 'Selfie + ID', fr: 'Selfie + pièce d\'identité', es: 'Selfie + documento de identidad', ru: 'Селфи + документ', he: 'סלפי + תעודה מזהה' }), to: '/verification' },
    { icon: ico.card, label: tr({ en: 'Payments & handover', fr: 'Paiements et remise', es: 'Pagos y entrega', ru: 'Оплата и передача', he: 'תשלומים ומסירה' }), to: '/payments' },
    { icon: ico.pin, label: tr({ en: 'Addresses', fr: 'Adresses', es: 'Direcciones', ru: 'Адреса', he: 'כתובות' }), to: '/addresses' },
    { icon: ico.bell, label: tr({ en: 'Notifications', fr: 'Notifications', es: 'Notificaciones', ru: 'Уведомления', he: 'התראות' }), to: '/notifications' },
    { icon: ico.controls, label: tr({ en: 'Account controls', fr: 'Contrôles du compte', es: 'Controles de la cuenta', ru: 'Настройки аккаунта', he: 'הגדרות חשבון' }), to: '/account-controls' },
    { icon: ico.mail, label: tr({ en: 'Change email', fr: 'Modifier l\'adresse e-mail', es: 'Cambiar correo electrónico', ru: 'Изменить e-mail', he: 'שינוי אימייל' }), sub: user.email || '', to: '/change-email' },
    { icon: ico.lock, label: tr({ en: 'Change password', fr: 'Modifier le mot de passe', es: 'Cambiar contraseña', ru: 'Изменить пароль', he: 'שינוי סיסמה' }), to: '/change-password' },
    { icon: ico.key, label: tr({ en: 'Passkey', fr: 'Clé d\'accès', es: 'Llave de acceso', ru: 'Ключ доступа', he: 'מפתח גישה' }), to: '/security' },
  ]

  // Admin link — only for admin email
  const ADMIN_EMAIL = 'djbenjaminfranklin@gmail.com'
  const adminItems: MenuItem[] = user.email?.toLowerCase() === ADMIN_EMAIL ? [
    { icon: ico.gear, label: tr({ en: 'Admin', fr: 'Administration', es: 'Administración', ru: 'Администрирование', he: 'ניהול' }), to: '/admin' },
  ] : []

  const supportItems: MenuItem[] = [
    { icon: ico.chat, label: tr({ en: 'Contact us', fr: 'Nous contacter', es: 'Contáctanos', ru: 'Связаться с нами', he: 'צור קשר' }), to: '/contact' },
    { icon: ico.warning, label: tr({ en: 'User reports', fr: 'Signalements', es: 'Denuncias de usuarios', ru: 'Жалобы пользователей', he: 'דיווחי משתמשים' }), to: '/contact' },
    { icon: ico.tax, label: tr({ en: 'Sales tax exemption', fr: 'Exonération de taxe', es: 'Exención de impuestos', ru: 'Освобождение от налога', he: 'פטור ממס' }), to: '/contact' },
    { icon: ico.doc, label: tr({ en: 'Privacy policy', fr: 'Politique de confidentialité', es: 'Política de privacidad', ru: 'Политика конфиденциальности', he: 'מדיניות פרטיות' }), external: true, to: '/privacy' },
    { icon: ico.doc, label: tr({ en: 'Terms of service', fr: 'Conditions d\'utilisation', es: 'Términos del servicio', ru: 'Условия использования', he: 'תנאי שימוש' }), external: true, to: '/terms' },
    { icon: ico.doc, label: tr({ en: 'EULA', fr: 'CLUF', es: 'CLUF', ru: 'Лицензионное соглашение', he: 'הסכם רישיון למשתמש' }), external: true, to: '/eula' },
    { icon: ico.help, label: tr({ en: 'FAQ', fr: 'FAQ', es: 'Preguntas frecuentes', ru: 'Вопросы и ответы', he: 'שאלות נפוצות' }), external: true, to: '/faq' },
    { icon: ico.help, label: tr({ en: 'About', fr: 'À propos', es: 'Acerca de', ru: 'О приложении', he: 'אודות' }), external: true, to: '/about' },
  ]

  // ── Render a single menu row ──
  const renderRow = (item: MenuItem, isLast: boolean, idx: number) => (
    <button
      key={`${item.to}-${idx}`}
      onClick={() => item.to && navigate(item.to)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        width: '100%', padding: '15px 16px',
        background: 'none', border: 'none',
        borderBottom: isLast ? 'none' : '1px solid #1A1A1A',
        cursor: 'pointer', textAlign: 'start',
      }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 'calc(15px * var(--fs, 1))', color: '#E5E5E5', fontWeight: 500, display: 'block', lineHeight: 1.3 }}>
          {item.label}
        </span>
        {item.sub && (
          <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#666', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}>
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>

        {/* ── HEADER: Avatar + Username + "Afficher le profil" ──────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '24px 20px 16px',
          ...entrance('0ms'),
        }}>
          {/* Tappable avatar */}
          <div
            role="button"
            tabIndex={0}
            aria-label={tr({ en: 'Change profile photo', fr: 'Changer la photo de profil', es: 'Cambiar foto de perfil', ru: 'Сменить фото профиля', he: 'שינוי תמונת פרופיל' })}
            onClick={handleAvatarTap}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAvatarTap() } }}
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
                <img src={avatarUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <CartoonAvatar seed={user.id} size={80} />
              )}
            </div>
            {/* Camera badge */}
            <div style={{
              position: 'absolute', bottom: 0, insetInlineEnd: 0,
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
            {!editMode && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h1 style={{
                    fontSize: 'calc(24px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {profile?.display_name || profile?.username}
                  </h1>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                {profile?.bio && (
                  <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#888', margin: '4px 0 0', lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {profile.bio}
                  </p>
                )}
                <button
                  onClick={handleEditStart}
                  style={{
                    marginTop: '8px', padding: '8px 20px', borderRadius: '8px',
                    backgroundColor: 'transparent', border: '1.5px solid #444',
                    color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
                    cursor: 'pointer', letterSpacing: '0.01em',
                  }}
                >
                  {tr({ en: 'Edit profile', fr: 'Modifier le profil', es: 'Editar perfil', ru: 'Редактировать профиль', he: 'עריכת פרופיל' })}
                </button>
              </>
            )}
            {editMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  maxLength={50}
                  placeholder={tr({ en: 'Name', fr: 'Nom', es: 'Nombre', ru: 'Имя', he: 'שם' })}
                  aria-label={tr({ en: 'Name', fr: 'Nom', es: 'Nombre', ru: 'Имя', he: 'שם' })}
                  aria-required="true"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '8px',
                    backgroundColor: '#1A1A1A', border: '1.5px solid #333',
                    color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 600,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#F0908A' }}
                  onBlur={e => { e.target.style.borderColor = '#333' }}
                />
                <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#555', textAlign: 'end' }}>
                  {editDisplayName.length}/50
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Bio edit field (only in edit mode) ──────────────────── */}
        {editMode && (
          <div style={{ padding: '0 20px 12px', ...entrance('20ms') }}>
            <label style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#888', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
              {tr({ en: 'Bio', fr: 'Bio', es: 'Biografía', ru: 'О себе', he: 'ביו' })}
            </label>
            <textarea
              value={editBio}
              onChange={e => setEditBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder={tr({ en: 'Tell us about yourself…', fr: 'Parle-nous de toi…', es: 'Cuéntanos sobre ti…', ru: 'Расскажи о себе…', he: 'ספרו קצת על עצמכם…' })}
              aria-label={tr({ en: 'Bio', fr: 'Bio', es: 'Biografía', ru: 'О себе', he: 'ביו' })}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                backgroundColor: '#1A1A1A', border: '1.5px solid #333',
                color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', lineHeight: 1.5,
                outline: 'none', resize: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#F0908A' }}
              onBlur={e => { e.target.style.borderColor = '#333' }}
            />
            <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#555', display: 'block', textAlign: 'end', marginTop: '2px' }}>
              {editBio.length}/200
            </span>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={handleEditCancel}
                disabled={saving}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  backgroundColor: 'transparent', border: '1.5px solid #333',
                  color: '#ccc', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tr({ en: 'Cancel', fr: 'Annuler', es: 'Cancelar', ru: 'Отмена', he: 'ביטול' })}
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
                  border: 'none',
                  color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? tr({ en: 'Saving…', fr: 'Enregistrement…', es: 'Guardando…', ru: 'Сохранение…', he: 'שומר…' })
                  : tr({ en: 'Save', fr: 'Enregistrer', es: 'Guardar', ru: 'Сохранить', he: 'שמירה' })}
              </button>
            </div>
          </div>
        )}

        {/* ── "Compte" header ─────────────────────────────────────── */}
        <div style={{ padding: '4px 20px 12px', ...entrance('40ms') }}>
          <h2 style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
            {tr({ en: 'Account', fr: 'Compte', es: 'Cuenta', ru: 'Аккаунт', he: 'חשבון' })}
          </h2>
        </div>

        {/* ── Buyer stats card ──────────────────────────────────── */}
        {buyerStatsLoaded && (
          <div style={{ padding: '0 16px 16px', ...entrance('60ms') }}>
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
              }}>
                {/* Total spent */}
                <div style={{
                  backgroundColor: '#111', borderRadius: '12px', padding: '14px',
                  display: 'flex', flexDirection: 'column', gap: '6px',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: 'rgba(34,197,94,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {(() => {
                      const amount = buyerStats?.total_spent ?? 0
                      try {
                        return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: currencyForCountry(profile?.country), maximumFractionDigits: 0 }).format(amount)
                      } catch { return amount.toFixed(0) }
                    })()}
                  </p>
                  <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#888', margin: 0 }}>
                    {tr({ en: 'Total spent', fr: 'Total dépensé', es: 'Total gastado', ru: 'Всего потрачено', he: 'סה״כ הוצאות' })}
                  </p>
                </div>

                {/* Order count */}
                <div style={{
                  backgroundColor: '#111', borderRadius: '12px', padding: '14px',
                  display: 'flex', flexDirection: 'column', gap: '6px',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {buyerStats?.order_count ?? 0}
                  </p>
                  <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#888', margin: 0 }}>
                    {tr({ en: 'Orders', fr: 'Commandes', es: 'Pedidos', ru: 'Заказы', he: 'הזמנות' })}
                  </p>
                </div>

                {/* Pending count */}
                <div style={{
                  backgroundColor: '#111', borderRadius: '12px', padding: '14px',
                  display: 'flex', flexDirection: 'column', gap: '6px',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: 'rgba(245,158,11,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {buyerStats?.pending_count ?? 0}
                  </p>
                  <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#888', margin: 0 }}>
                    {tr({ en: 'In progress', fr: 'En cours', es: 'En curso', ru: 'В процессе', he: 'בתהליך' })}
                  </p>
                </div>

                {/* Buyer score */}
                <div style={{
                  backgroundColor: '#111', borderRadius: '12px', padding: '14px',
                  display: 'flex', flexDirection: 'column', gap: '6px',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: 'rgba(139,92,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {buyerStats?.buyer_score ?? 0}<span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 500, color: '#888' }}>/100</span>
                  </p>
                  <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#888', margin: 0 }}>
                    {tr({ en: 'Buyer score', fr: 'Score acheteur', es: 'Puntuación de comprador', ru: 'Рейтинг покупателя', he: 'ציון קונה' })}
                  </p>
                </div>
              </div>

              {/* "Voir mes achats" button */}
              <button
                onClick={() => navigate('/activity')}
                style={{
                  width: '100%', marginTop: '12px', padding: '12px',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
                  color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700,
                }}
              >
                {tr({ en: 'View my purchases', fr: 'Voir mes achats', es: 'Ver mis compras', ru: 'Мои покупки', he: 'הרכישות שלי' })}
              </button>
            </div>
          </div>
        )}

        {/* ── Loyalty section ─────────────────────────────────────── */}
        {loyaltyLoaded && loyalty && (() => {
          const tierColors: Record<string, string> = {
            bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700', platinum: '#E5E4E2',
          }
          const tierNames: Record<string, string> = {
            bronze: tr({ en: 'Bronze', fr: 'Bronze', es: 'Bronce', ru: 'Бронза', he: 'ארד' }),
            silver: tr({ en: 'Silver', fr: 'Argent', es: 'Plata', ru: 'Серебро', he: 'כסף' }),
            gold: tr({ en: 'Gold', fr: 'Or', es: 'Oro', ru: 'Золото', he: 'זהב' }),
            platinum: tr({ en: 'Platinum', fr: 'Platine', es: 'Platino', ru: 'Платина', he: 'פלטינה' }),
          }
          const tierThresholds: Record<string, number> = {
            bronze: 0, silver: 100, gold: 500, platinum: 1000,
          }
          const tierKey = loyalty.tier.toLowerCase()
          const color = tierColors[tierKey] || '#C0C0C0'
          const currentThreshold = tierThresholds[tierKey] || 0
          const nextThreshold = loyalty.next_tier_threshold || (tierThresholds[loyalty.next_tier?.toLowerCase() || ''] || 1000)
          const progress = nextThreshold > currentThreshold
            ? Math.min(1, (loyalty.points - currentThreshold) / (nextThreshold - currentThreshold))
            : 1
          return (
            <div style={{ padding: '0 16px 16px', ...entrance('80ms') }}>
              <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    backgroundColor: `${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
                        {tierNames[tierKey] || loyalty.tier}
                      </p>
                      <span style={{
                        fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#000',
                        backgroundColor: color, borderRadius: '4px', padding: '2px 8px',
                      }}>
                        {tr({ en: 'TIER', fr: 'NIVEAU', es: 'NIVEL', ru: 'УРОВЕНЬ', he: 'רמה' })}
                      </span>
                    </div>
                    <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#888', margin: '2px 0 0' }}>
                      {tr({ en: `${loyalty.points} points`, fr: `${loyalty.points} points`, es: `${loyalty.points} puntos`, ru: `Баллы: ${loyalty.points}`, he: `${loyalty.points} נקודות` })}
                    </p>
                  </div>
                </div>

                {/* Progress bar to next tier */}
                {loyalty.next_tier && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#666', margin: 0 }}>
                        {tierNames[tierKey] || loyalty.tier}
                      </p>
                      <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#666', margin: 0 }}>
                        {tierNames[loyalty.next_tier.toLowerCase()] || loyalty.next_tier}
                      </p>
                    </div>
                    <div style={{
                      width: '100%', height: '6px', borderRadius: '3px',
                      backgroundColor: '#333', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.round(progress * 100)}%`, height: '100%',
                        borderRadius: '3px', backgroundColor: color,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#666', margin: '6px 0 0', textAlign: 'center' }}>
                      {nextThreshold - loyalty.points > 0
                        ? tr({ en: `${nextThreshold - loyalty.points} points to reach ${tierNames[loyalty.next_tier.toLowerCase()] || loyalty.next_tier}`, fr: `Encore ${nextThreshold - loyalty.points} points pour atteindre ${tierNames[loyalty.next_tier.toLowerCase()] || loyalty.next_tier}`, es: `${nextThreshold - loyalty.points} puntos para llegar a ${tierNames[loyalty.next_tier.toLowerCase()] || loyalty.next_tier}`, ru: `До уровня «${tierNames[loyalty.next_tier.toLowerCase()] || loyalty.next_tier}» осталось баллов: ${nextThreshold - loyalty.points}`, he: `עוד ${nextThreshold - loyalty.points} נקודות לרמת ${tierNames[loyalty.next_tier.toLowerCase()] || loyalty.next_tier}` })
                        : tr({ en: 'Top tier reached!', fr: 'Niveau maximum atteint !', es: '¡Nivel máximo alcanzado!', ru: 'Достигнут максимальный уровень!', he: 'הגעת לרמה הגבוהה ביותר!' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Mes lives card (seller only) ──────────────────────── */}
        {profile?.is_seller && (
          <div style={{
            padding: '0 16px 20px',
            ...entrance('100ms'),
          }}>
            <button onClick={() => navigate('/go-live?manage=true')} style={{
              width: '100%',
              backgroundColor: '#1A1A1A', border: 'none', borderRadius: '14px',
              padding: '16px 14px', cursor: 'pointer', textAlign: 'start',
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
                <p style={{ color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, margin: 0 }}>
                  {tr({ en: 'My lives', fr: 'Mes lives', es: 'Mis directos', ru: 'Мои эфиры', he: 'השידורים שלי' })}
                </p>
                {!streamsLoaded ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <div style={{
                      width: '12px', height: '12px',
                      border: '2px solid #333', borderTopColor: '#F0908A',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                    <span style={{ color: '#666', fontSize: 'calc(12px * var(--fs, 1))' }}>
                      {tr({ en: 'Loading…', fr: 'Chargement…', es: 'Cargando…', ru: 'Загрузка…', he: 'טוען…' })}
                    </span>
                  </div>
                ) : myStreams.length > 0 ? (
                  <p style={{ color: '#888', fontSize: 'calc(13px * var(--fs, 1))', margin: '2px 0 0' }}>
                    {myStreams.length} {tr({ en: `${myStreams.length} lives`, fr: `${myStreams.length} lives`, es: `${myStreams.length} directos`, ru: `Эфиров: ${myStreams.length}`, he: `${myStreams.length} שידורים` })}
                  </p>
                ) : null}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}>
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
              color: '#ccc', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {ico.logout}
            {tr({ en: 'Sign out', fr: 'Se déconnecter', es: 'Cerrar sesión', ru: 'Выйти', he: 'התנתקות' })}
          </button>
        </div>

        {/* ── Version ─────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', paddingBottom: '24px', ...entrance('280ms') }}>
          <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#444', margin: 0 }}>{appVersion}</p>{/* i18n-ignore */}
          <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#444', margin: '2px 0 0' }}>&copy; 2026 ShaPop</p>{/* i18n-ignore */}
        </div>

      </div>
    </div>
  )
}
