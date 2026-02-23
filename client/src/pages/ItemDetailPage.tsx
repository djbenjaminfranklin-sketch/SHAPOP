import { useEffect, useState, useCallback } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { rtlFlip } from '../lib/rtl'
import { apiFetch } from '../lib/api'
import { track } from '../lib/analytics'
import { showToast } from '../lib/toast'
import { getLang } from '../lib/i18n'
import { usePageTitle } from '../hooks/usePageTitle'
import type { Item } from '../types/database'

type ItemWithSeller = Item & { seller?: { display_name?: string; avatar_url?: string | null } }

const content = {
  fr: {
    notFound: 'Article introuvable',
    back: 'Retour',
    price: 'Prix',
    condition: 'Etat',
    description: 'Description',
    category: 'Categorie',
    seller: 'Vendeur',
    aiGenerated: 'Genere par IA',
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
    makeOffer: 'Faire une offre',
    offerPlaceholder: 'Ton offre',
    offerConfirm: 'Envoyer l\'offre',
    offerSent: 'Offre envoyee !',
    offerPending: 'Offre en attente',
    offerInvalid: 'Entre un montant valide superieur a 0',
  },
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
    makeOffer: 'Make an offer',
    offerPlaceholder: 'Your offer',
    offerConfirm: 'Send offer',
    offerSent: 'Offer sent!',
    offerPending: 'Offer pending',
    offerInvalid: 'Enter a valid amount greater than 0',
  },
  he: {
    notFound: 'הפריט לא נמצא',
    back: 'חזרה',
    price: 'מחיר',
    condition: 'מצב',
    description: 'תיאור',
    category: 'קטגוריה',
    seller: 'מוכר',
    aiGenerated: 'נוצר על ידי AI',
    noDescription: 'אין תיאור זמין.',
    contact: 'צור קשר עם המוכר',
    follow: 'עקוב',
    following: 'עוקב',
    deleteItem: 'מחק מודעה',
    deleteConfirm: 'למחוק את המודעה?',
    myItem: 'המודעה שלי',
    editPrice: 'ערוך מחיר',
    confirmDelete: 'מחק',
    confirmCancel: 'ביטול',
    makeOffer: 'הגש הצעה',
    offerPlaceholder: 'ההצעה שלך',
    offerConfirm: 'שלח הצעה',
    offerSent: 'ההצעה נשלחה!',
    offerPending: 'הצעה בהמתנה',
    offerInvalid: 'הזן סכום תקין גדול מ-0',
  },
  es: {
    notFound: 'Articulo no encontrado',
    back: 'Volver',
    price: 'Precio',
    condition: 'Estado',
    description: 'Descripcion',
    category: 'Categoria',
    seller: 'Vendedor',
    aiGenerated: 'Generado por IA',
    noDescription: 'Sin descripcion disponible.',
    contact: 'Contactar al vendedor',
    follow: 'Seguir',
    following: 'Siguiendo',
    deleteItem: 'Eliminar anuncio',
    deleteConfirm: 'Eliminar este anuncio?',
    myItem: 'Mi anuncio',
    editPrice: 'Editar precio',
    confirmDelete: 'Eliminar',
    confirmCancel: 'Cancelar',
    makeOffer: 'Hacer una oferta',
    offerPlaceholder: 'Tu oferta',
    offerConfirm: 'Enviar oferta',
    offerSent: 'Oferta enviada!',
    offerPending: 'Oferta pendiente',
    offerInvalid: 'Ingresa un monto valido mayor a 0',
  },
} as Record<string, Record<string, string>>

const conditionLabels: Record<string, Record<string, string>> = {
  new: { fr: 'Neuf', en: 'New', he: 'חדש', es: 'Nuevo' },
  like_new: { fr: 'Comme neuf', en: 'Like new', he: 'כמו חדש', es: 'Como nuevo' },
  good: { fr: 'Bon etat', en: 'Good', he: 'מצב טוב', es: 'Buen estado' },
  fair: { fr: 'Correct', en: 'Fair', he: 'סביר', es: 'Aceptable' },
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const lang = getLang()
  const t = content[lang] || content.fr

  const [item, setItem] = useState<ItemWithSeller | null>(null)
  usePageTitle(item?.title || t.notFound)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null)

  // Offer state
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerLoading, setOfferLoading] = useState(false)
  const [offerError, setOfferError] = useState('')
  const [hasOffer, setHasOffer] = useState(false)

  const retryLabel = { fr: 'Reessayer', en: 'Retry', he: '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1', es: 'Reintentar' }[lang] || 'Reessayer'

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

  const toggleFollow = async () => {
    if (!item?.seller_id || !session?.access_token) return
    const method = isFollowing ? 'DELETE' : 'POST'
    const res = await apiFetch(`/api/follow/${item.seller_id}`, {
      method,
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) setIsFollowing(!isFollowing)
  }

  // Check if user already has a pending offer on this item
  useEffect(() => {
    if (!id || !user) return
    let cancelled = false
    supabase
      .from('offers')
      .select('id')
      .eq('item_id', id)
      .eq('buyer_id', user.id)
      .eq('status', 'pending')
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('checkPendingOffer failed:', error); return }
        setHasOffer(!!data && data.length > 0)
      })
    return () => { cancelled = true }
  }, [id, user])

  const handleOfferSubmit = async () => {
    if (!id || !user) return
    const amount = parseFloat(offerAmount)
    if (isNaN(amount) || amount <= 0) {
      setOfferError(t.offerInvalid)
      return
    }
    setOfferError('')
    setOfferLoading(true)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { setOfferLoading(false); return }
      const resp = await apiFetch(`/api/items/${id}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
        body: JSON.stringify({ amount }),
      })
      if (resp.ok) {
        setHasOffer(true)
        setShowOfferModal(false)
        setOfferAmount('')
      } else {
        showToast(lang === 'fr' ? "Erreur lors de l'envoi de l'offre" : 'Failed to send offer', 'error')
      }
    } catch {
      showToast(lang === 'fr' ? 'Erreur reseau' : 'Network error', 'error')
    }
    setOfferLoading(false)
  }

  const price = item ? (item.current_price ?? item.starting_price) : 0
  const sellerName = item?.seller?.display_name || ({ fr: 'Vendeur', en: 'Seller', he: 'מוכר', es: 'Vendedor' })[lang]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
      }}>
        <button aria-label={lang === 'fr' ? 'Retour' : lang === 'es' ? 'Volver' : lang === 'he' ? 'חזרה' : 'Back'} onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item?.title || t.back}
        </h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }} role="status" aria-label={lang === 'fr' ? 'Chargement de l\'article' : lang === 'es' ? 'Cargando articulo' : lang === 'he' ? 'טוען פריט' : 'Loading item'}>
          <div style={{
            width: '32px', height: '32px', border: '3px solid #333',
            borderTopColor: '#E8344E', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : fetchError || !item ? (
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#888', marginBottom: '16px' }}>{t.notFound}</p>
          {fetchError && (
            <button
              onClick={() => fetchItem()}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#E8344E', fontSize: '14px', fontWeight: 600,
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
              <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  color: '#fff', fontSize: '12px', fontWeight: 700,
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
                  aria-label={`Image ${i + 1}${i === selectedImage ? ' (selected)' : ''}`}
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
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{price}€</span>
              {item.ai_condition && (
                <span style={{
                  backgroundColor: 'rgba(240,144,138,0.15)', color: '#F0908A',
                  fontSize: '13px', fontWeight: 600, padding: '6px 12px', borderRadius: '10px',
                }}>
                  {conditionLabels[item.ai_condition]?.[lang] || item.ai_condition}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 }}>
              {item.title}
            </h2>

            {/* Category */}
            <span style={{
              display: 'inline-block', fontSize: '13px', fontWeight: 600,
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
                  fontSize: '16px', fontWeight: 600, color: '#888', overflow: 'hidden', flexShrink: 0,
                }}>
                  {item.seller?.avatar_url ? (
                    <img src={item.seller.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    sellerName.charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>{sellerName}</p>
                  <p style={{ fontSize: '12px', color: '#666', margin: '2px 0 0' }}>{t.seller}</p>
                </div>
              </div>
              {user && item.seller_id !== user.id && (
                <button
                  onClick={toggleFollow}
                  style={{
                    padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
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
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{t.description}</h3>
                <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.6, margin: 0 }}>{item.description}</p>
              </div>
            )}

            {/* Tags */}
            {item.ai_tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {item.ai_tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: '12px', color: '#888', backgroundColor: '#1a1a1a',
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
                            showToast(lang === 'fr' ? 'Erreur lors de la suppression' : 'Failed to delete item', 'error')
                          }
                        } catch {
                          showToast(lang === 'fr' ? 'Erreur reseau' : 'Network error', 'error')
                        }
                      },
                    })
                  }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: 'none', border: '1px solid #E8344E',
                    color: '#E8344E', fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t.deleteItem}
                </button>
              ) : null
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => navigate(`/conversation/${item.seller_id}`)}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                    border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t.contact}
                </button>
                {/* Make an offer button */}
                <button
                  onClick={() => {
                    if (!user) { navigate('/login'); return }
                    setOfferAmount(String(Math.round(price * 0.8)))
                    setOfferError('')
                    setShowOfferModal(true)
                  }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: hasOffer ? 'rgba(139,92,246,0.15)' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    border: hasOffer ? '1px solid rgba(139,92,246,0.3)' : 'none',
                    color: hasOffer ? '#8B5CF6' : '#fff',
                    fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {hasOffer ? t.offerPending : t.makeOffer}
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

      {/* Offer modal */}
      {showOfferModal && (
        <div
          onClick={() => setShowOfferModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '340px',
              backgroundColor: '#1A1A1A', borderRadius: '20px',
              padding: '24px', border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 4px', textAlign: 'center' }}>
              {t.makeOffer}
            </h3>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 20px', textAlign: 'center' }}>
              {item?.title || ''}
            </p>
            <input
              type="number"
              value={offerAmount}
              onChange={e => { setOfferAmount(e.target.value); setOfferError('') }}
              placeholder={t.offerPlaceholder}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                backgroundColor: '#111', border: offerError ? '1px solid #E8344E' : '1px solid #333',
                color: '#fff', fontSize: '18px', fontWeight: 700,
                textAlign: 'center', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {offerError && (
              <p style={{ fontSize: '13px', color: '#E8344E', margin: '8px 0 0', textAlign: 'center' }}>{offerError}</p>
            )}
            <button
              onClick={handleOfferSubmit}
              disabled={offerLoading}
              style={{
                width: '100%', marginTop: '14px', padding: '14px',
                borderRadius: '100px', border: 'none',
                background: offerLoading ? '#555' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: offerLoading ? 'default' : 'pointer',
                opacity: offerLoading ? 0.7 : 1,
              }}
            >
              {offerLoading ? '...' : t.offerConfirm}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
