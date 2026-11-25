import { useEffect, useState, useCallback } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { rtlFlip } from '../lib/rtl'
import { apiFetch } from '../lib/api'
import { track } from '../lib/analytics'
import { showToast } from '../lib/toast'
import { getLang, type Localized } from '../lib/i18n'
import { formatItemPrice } from '../lib/fulfillment'
import { usePageTitle } from '../hooks/usePageTitle'
import type { Item } from '../types/database'

type ItemWithSeller = Item & { seller?: { display_name?: string; avatar_url?: string | null; country?: string | null } }

type ItemDetailText = {
  notFound: string; back: string; price: string; condition: string; description: string; category: string
  seller: string; aiGenerated: string; noDescription: string; contact: string; follow: string; following: string
  deleteItem: string; deleteConfirm: string; myItem: string; editPrice: string; confirmDelete: string; confirmCancel: string
  buy: string; buyConfirm: string; bought: string; retry: string; loadingItem: string; imageN: string; selected: string
  deleteFailed: string; networkError: string; genericError: string; contactFailed: string
  alreadySold: string; unavailable: string; ownItem: string
}

const content: Localized<ItemDetailText> = {
  en: {
    notFound: 'Item not found',
    back: 'Back',
    price: 'Price',
    condition: 'Condition',
    description: 'Description',
    category: 'Category',
    seller: 'Seller',
    aiGenerated: 'AI generated',
    noDescription: 'No description available.',
    contact: 'Contact seller',
    follow: 'Follow',
    following: 'Following',
    deleteItem: 'Delete listing',
    deleteConfirm: 'Delete this listing?',
    myItem: 'My listing',
    editPrice: 'Edit price',
    confirmDelete: 'Delete',
    confirmCancel: 'Cancel',
    buy: 'Buy',
    buyConfirm: 'Buy for {price}?',
    bought: 'Purchased!',
    retry: 'Retry',
    loadingItem: 'Loading item',
    imageN: 'Image {n}',
    selected: 'selected',
    deleteFailed: 'Couldn\'t delete the listing',
    networkError: 'Network error. Check your connection.',
    genericError: 'Something went wrong. Please try again.',
    contactFailed: 'Couldn\'t open the conversation. Please try again.',
    alreadySold: 'This item has already been sold.',
    unavailable: 'This item is no longer available.',
    ownItem: 'You can\'t buy your own item.',
  },
  fr: {
    notFound: 'Article introuvable',
    back: 'Retour',
    price: 'Prix',
    condition: 'État',
    description: 'Description',
    category: 'Catégorie',
    seller: 'Vendeur',
    aiGenerated: 'Généré par IA',
    noDescription: 'Aucune description disponible.',
    contact: 'Contacter le vendeur',
    follow: 'Suivre',
    following: 'Suivi',
    deleteItem: 'Supprimer l\'annonce',
    deleteConfirm: 'Supprimer cette annonce ?',
    myItem: 'Mon annonce',
    editPrice: 'Modifier le prix',
    confirmDelete: 'Supprimer',
    confirmCancel: 'Annuler',
    buy: 'Acheter',
    buyConfirm: 'Acheter pour {price} ?',
    bought: 'Acheté !',
    retry: 'Réessayer',
    loadingItem: 'Chargement de l\'article',
    imageN: 'Image {n}',
    selected: 'sélectionnée',
    deleteFailed: 'Impossible de supprimer l\'annonce',
    networkError: 'Erreur réseau. Vérifie ta connexion.',
    genericError: 'Une erreur est survenue. Réessaie.',
    contactFailed: 'Impossible d\'ouvrir la conversation. Réessaie.',
    alreadySold: 'Cet article est déjà vendu.',
    unavailable: 'Cet article n\'est plus disponible.',
    ownItem: 'Tu ne peux pas acheter ton propre article.',
  },
  es: {
    notFound: 'Artículo no encontrado',
    back: 'Volver',
    price: 'Precio',
    condition: 'Estado',
    description: 'Descripción',
    category: 'Categoría',
    seller: 'Vendedor',
    aiGenerated: 'Generado por IA',
    noDescription: 'Sin descripción disponible.',
    contact: 'Contactar al vendedor',
    follow: 'Seguir',
    following: 'Siguiendo',
    deleteItem: 'Eliminar anuncio',
    deleteConfirm: '¿Eliminar este anuncio?',
    myItem: 'Mi anuncio',
    editPrice: 'Editar precio',
    confirmDelete: 'Eliminar',
    confirmCancel: 'Cancelar',
    buy: 'Comprar',
    buyConfirm: '¿Comprar por {price}?',
    bought: '¡Comprado!',
    retry: 'Reintentar',
    loadingItem: 'Cargando artículo',
    imageN: 'Imagen {n}',
    selected: 'seleccionada',
    deleteFailed: 'No se pudo eliminar el anuncio',
    networkError: 'Error de red. Revisa tu conexión.',
    genericError: 'Algo salió mal. Inténtalo de nuevo.',
    contactFailed: 'No se pudo abrir la conversación. Inténtalo de nuevo.',
    alreadySold: 'Este artículo ya se vendió.',
    unavailable: 'Este artículo ya no está disponible.',
    ownItem: 'No puedes comprar tu propio artículo.',
  },
  ru: {
    notFound: 'Товар не найден',
    back: 'Назад',
    price: 'Цена',
    condition: 'Состояние',
    description: 'Описание',
    category: 'Категория',
    seller: 'Продавец',
    aiGenerated: 'Создано ИИ',
    noDescription: 'Описания пока нет.',
    contact: 'Написать продавцу',
    follow: 'Подписаться',
    following: 'Вы подписаны',
    deleteItem: 'Удалить объявление',
    deleteConfirm: 'Удалить это объявление?',
    myItem: 'Моё объявление',
    editPrice: 'Изменить цену',
    confirmDelete: 'Удалить',
    confirmCancel: 'Отмена',
    buy: 'Купить',
    buyConfirm: 'Купить за {price}?',
    bought: 'Куплено!',
    retry: 'Повторить',
    loadingItem: 'Загрузка товара',
    imageN: 'Фото {n}',
    selected: 'выбрано',
    deleteFailed: 'Не удалось удалить объявление',
    networkError: 'Ошибка сети. Проверь подключение.',
    genericError: 'Что-то пошло не так. Попробуй ещё раз.',
    contactFailed: 'Не удалось открыть переписку. Попробуй ещё раз.',
    alreadySold: 'Этот товар уже продан.',
    unavailable: 'Этот товар больше недоступен.',
    ownItem: 'Нельзя купить свой собственный товар.',
  },
  he: {
    notFound: 'הפריט לא נמצא',
    back: 'חזרה',
    price: 'מחיר',
    condition: 'מצב',
    description: 'תיאור',
    category: 'קטגוריה',
    seller: 'מוכר/ת',
    aiGenerated: 'נוצר ב-AI',
    noDescription: 'אין תיאור.',
    contact: 'פנייה למוכר/ת',
    follow: 'מעקב',
    following: 'במעקב',
    deleteItem: 'מחיקת המודעה',
    deleteConfirm: 'למחוק את המודעה?',
    myItem: 'המודעה שלי',
    editPrice: 'עריכת מחיר',
    confirmDelete: 'מחיקה',
    confirmCancel: 'ביטול',
    buy: 'קנייה',
    buyConfirm: 'לקנות ב-{price}?',
    bought: 'נרכש!',
    retry: 'נסו שוב',
    loadingItem: 'טוען את הפריט',
    imageN: 'תמונה {n}',
    selected: 'נבחרה',
    deleteFailed: 'לא הצלחנו למחוק את המודעה',
    networkError: 'שגיאת רשת. בדקו את החיבור.',
    genericError: 'משהו השתבש. נסו שוב.',
    contactFailed: 'לא הצלחנו לפתוח את השיחה. נסו שוב.',
    alreadySold: 'הפריט הזה כבר נמכר.',
    unavailable: 'הפריט הזה כבר לא זמין.',
    ownItem: 'אי אפשר לקנות פריט שלך.',
  },
}

const conditionLabels: Record<string, Localized<string>> = {
  new: { en: 'New', fr: 'Neuf', es: 'Nuevo', ru: 'Новое', he: 'חדש' },
  like_new: { en: 'Like new', fr: 'Comme neuf', es: 'Como nuevo', ru: 'Как новое', he: 'כמו חדש' },
  good: { en: 'Good', fr: 'Bon état', es: 'Buen estado', ru: 'Хорошее', he: 'מצב טוב' },
  fair: { en: 'Fair', fr: 'Correct', es: 'Aceptable', ru: 'Удовлетворительное', he: 'סביר' },
}

// Codes d'erreur renvoyés par POST /api/items/:id/buy-now → clé de texte traduite.
const BUY_ERROR_KEYS: Record<string, keyof ItemDetailText> = {
  'Item is already sold': 'alreadySold', // i18n-ignore (code serveur)
  'Cannot buy your own item': 'ownItem', // i18n-ignore (code serveur)
  'Item is not active': 'unavailable', // i18n-ignore (code serveur)
  'Item is not available': 'unavailable', // i18n-ignore (code serveur)
  'Item not found': 'unavailable', // i18n-ignore (code serveur)
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, session, profile } = useAuth()
  const lang = getLang()
  const t = content[lang] ?? content.en

  const [item, setItem] = useState<ItemWithSeller | null>(null)
  usePageTitle(item?.title || t.notFound)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null)

  // Buy state
  const [buyLoading, setBuyLoading] = useState(false)
  const [bought, setBought] = useState(false)

  const retryLabel = t.retry
  // Pays du vendeur (devise du prix) : renvoyé avec l'article si dispo, sinon lu dans son profil.
  const [sellerCountry, setSellerCountry] = useState<string | null>(null)

  const fetchItem = useCallback((signal?: AbortSignal) => {
    if (!id) return
    setLoading(true)
    setFetchError(false)
    apiFetch(`/api/items/${id}`, { signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (signal?.aborted) return
        if (data && data.id) setItem(data)
      })
      .catch((err) => {
        if (signal?.aborted) return
        console.error('Failed to fetch item:', err)
        setFetchError(true)
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false)
      })
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    fetchItem(controller.signal)
    return () => controller.abort()
  }, [fetchItem])

  // Track page view on mount
  useEffect(() => {
    if (id) track('page_view', { page: 'item', item_id: id })
  }, [id])

  // Check follow status when item loads
  useEffect(() => {
    if (!item?.seller_id || !session?.access_token || !user) return
    if (item.seller_id === user.id) return
    const controller = new AbortController()
    apiFetch(`/api/follow/${item.seller_id}/status`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !controller.signal.aborted) setIsFollowing(d.following) })
      .catch((err) => { if (!controller.signal.aborted) console.error('fetchFollowStatus failed:', err) })
    return () => controller.abort()
  }, [item, session, user])

  useEffect(() => {
    if (!item?.seller_id) return
    if (item.seller?.country) { setSellerCountry(item.seller.country); return }
    let cancelled = false
    supabase.from('profiles').select('country').eq('id', item.seller_id).maybeSingle()
      .then(({ data }) => { if (!cancelled && data?.country) setSellerCountry(data.country) })
    return () => { cancelled = true }
  }, [item])

  const toggleFollow = async () => {
    if (!item?.seller_id || !session?.access_token) return
    const method = isFollowing ? 'DELETE' : 'POST'
    const res = await apiFetch(`/api/follow/${item.seller_id}`, {
      method,
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) setIsFollowing(!isFollowing)
  }



  const price = item ? (item.current_price ?? item.starting_price) : 0
  const sellerName = item?.seller?.display_name || t.seller
  const priceLabel = formatItemPrice(price, sellerCountry ?? profile?.country)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
      }}>
        <button aria-label={t.back} onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item?.title || t.back}
        </h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }} role="status" aria-label={t.loadingItem}>
          <div style={{
            width: '32px', height: '32px', border: '3px solid #333',
            borderTopColor: '#E8344E', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : fetchError || !item ? (
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 'calc(16px * var(--fs, 1))', color: '#888', marginBottom: '16px' }}>{t.notFound}</p>
          {fetchError && (
            <button
              onClick={() => fetchItem()}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#E8344E', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {retryLabel}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Image carousel */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#111' }}>
            {item.image_urls?.length > 0 ? (
              <img
                src={item.image_urls[selectedImage]}
                alt={item.title}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                onError={(e) => { const img = e.target as HTMLImageElement; img.src = ''; img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; img.alt = '' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}

            {/* AI badge */}
            {item.ai_generated && (
              <div style={{ position: 'absolute', top: '12px', insetInlineStart: '12px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  color: '#fff', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700,
                  padding: '5px 10px', borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(232, 52, 78, 0.4)',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" stroke="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {t.aiGenerated}
                </span>
              </div>
            )}
          </div>

          {/* Image thumbnails */}
          {item.image_urls?.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', overflowX: 'auto' }}>
              {item.image_urls.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setSelectedImage(i)}
                  aria-label={`${t.imageN.replace('{n}', String(i + 1))}${i === selectedImage ? ` (${t.selected})` : ''}`}
                  aria-pressed={i === selectedImage}
                  style={{
                    width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden',
                    border: i === selectedImage ? '2px solid #E8344E' : '2px solid #333',
                    padding: 0, background: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          {/* Info section */}
          <div style={{ padding: '16px' }}>
            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: 'calc(28px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>{priceLabel}</span>
              {item.ai_condition && (
                <span style={{
                  backgroundColor: 'rgba(240,144,138,0.15)', color: '#F0908A',
                  fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, padding: '6px 12px', borderRadius: '10px',
                }}>
                  {conditionLabels[item.ai_condition]?.[lang] ?? item.ai_condition}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 }}>
              {item.title}
            </h2>

            {/* Category */}
            <span style={{
              display: 'inline-block', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
              color: '#F0908A', backgroundColor: 'rgba(240,144,138,0.1)',
              padding: '4px 10px', borderRadius: '8px', marginBottom: '20px',
            }}>
              {item.category}
            </span>

            {/* Seller */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px', borderRadius: '14px', backgroundColor: '#111',
              marginBottom: '20px',
            }}>
              <div
                onClick={() => item.seller_id && navigate(`/seller/${item.seller_id}`)}
                data-tap="true"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 600, color: '#888', overflow: 'hidden', flexShrink: 0,
                }}>
                  {item.seller?.avatar_url ? (
                    <img src={item.seller.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    sellerName.charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>{sellerName}</p>
                  <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#666', margin: '2px 0 0' }}>{t.seller}</p>
                </div>
              </div>
              {user && item.seller_id !== user.id && (
                <button
                  onClick={toggleFollow}
                  style={{
                    padding: '6px 14px', borderRadius: '10px', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700,
                    border: isFollowing ? '1px solid #333' : 'none',
                    background: isFollowing ? 'transparent' : 'linear-gradient(135deg, #F0908A, #E8344E)',
                    color: isFollowing ? '#888' : '#fff',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {isFollowing ? t.following : t.follow}
                </button>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{t.description}</h3>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#aaa', lineHeight: 1.6, margin: 0 }}>{item.description}</p>
              </div>
            )}

            {/* Tags */}
            {item.ai_tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {item.ai_tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: 'calc(12px * var(--fs, 1))', color: '#888', backgroundColor: '#1a1a1a',
                    padding: '4px 10px', borderRadius: '8px', border: '1px solid #222',
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Owner actions vs buyer actions */}
            {user && item.seller_id === user.id ? (
              item.status !== 'sold' ? (
                <button
                  onClick={() => {
                    setConfirmModal({
                      title: t.deleteItem,
                      message: t.deleteConfirm,
                      onConfirm: async () => {
                        setConfirmModal(null)
                        if (!session?.access_token) return
                        try {
                          const res = await apiFetch(`/api/items/${item.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${session.access_token}` },
                          })
                          if (res.ok) {
                            navigate(-1)
                          } else {
                            showToast(t.deleteFailed, 'error')
                          }
                        } catch {
                          showToast(t.networkError, 'error')
                        }
                      },
                    })
                  }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: 'none', border: '1px solid #E8344E',
                    color: '#E8344E', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t.deleteItem}
                </button>
              ) : null
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={async () => {
                    if (!user || !session?.access_token) { navigate('/login'); return }
                    try {
                      // Try API first
                      const resp = await apiFetch('/api/conversations/direct', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                        body: JSON.stringify({ user_id: item.seller_id, item_id: item.id }),
                      })
                      const data = await resp.json()
                      if (resp.ok && data.id) {
                        navigate(`/conversation/${data.id}`)
                        return
                      }
                    } catch { /* fallback below */ }

                    // Fallback: create/find conversation directly via Supabase
                    try {
                      const sellerId = item.seller_id
                      const { data: existing } = await supabase
                        .from('conversations')
                        .select('id')
                        .or(`and(participant_1.eq.${user.id},participant_2.eq.${sellerId}),and(participant_1.eq.${sellerId},participant_2.eq.${user.id})`)
                        .eq('status', 'active')
                        .limit(1)
                        .maybeSingle()
                      if (existing) { navigate(`/conversation/${existing.id}`); return }

                      const { data: conv, error } = await supabase
                        .from('conversations')
                        .insert({ type: 'direct', participant_1: user.id, participant_2: sellerId, status: 'active', item_id: item.id })
                        .select('id')
                        .single()
                      if (error) throw error
                      navigate(`/conversation/${conv.id}`)
                    } catch (err) {
                      console.error('open conversation failed:', err)
                      alert(t.contactFailed)
                    }
                  }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                    border: 'none', color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t.contact}
                </button>
                {/* Buy now button */}
                <button
                  disabled={buyLoading || bought}
                  onClick={async () => {
                    if (!user || !session?.access_token) { navigate('/login'); return }
                    if (!confirm(t.buyConfirm.replace('{price}', priceLabel))) return
                    setBuyLoading(true)
                    try {
                      const resp = await apiFetch(`/api/items/${id}/buy-now`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                      })
                      if (resp.ok) {
                        setBought(true)
                        setTimeout(() => navigate('/activity'), 1200)
                      } else {
                        const err = await resp.json().catch(() => ({}))
                        const code = String(err?.error || '')
                        alert(t[BUY_ERROR_KEYS[code] ?? 'genericError'])
                      }
                    } catch { alert(t.networkError) }
                    setBuyLoading(false)
                  }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: bought
                      ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                      : buyLoading ? '#555' : 'linear-gradient(135deg, #E8344E, #D42A42)',
                    border: 'none', color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                    cursor: buyLoading ? 'default' : 'pointer',
                    opacity: buyLoading ? 0.7 : 1,
                  }}
                >
                  {bought ? t.bought : buyLoading ? '...' : `${t.buy} — ${priceLabel}`}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmLabel={t.confirmDelete}
        cancelLabel={t.confirmCancel}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
        danger
      />

    </div>
  )
}
