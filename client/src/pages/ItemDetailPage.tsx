import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
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
  const lang = localStorage.getItem('shapop_lang') || 'fr'
  const t = content[lang] || content.fr

  const [item, setItem] = useState<ItemWithSeller | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    if (!id) return
    apiFetch(`/api/items/${id}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (data && data.id) setItem(data)
      })
      .catch((err) => {
        console.error('Failed to fetch item:', err)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Check follow status when item loads
  useEffect(() => {
    if (!item?.seller_id || !session?.access_token || !user) return
    if (item.seller_id === user.id) return
    apiFetch(`/api/follow/${item.seller_id}/status`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setIsFollowing(d.following) })
      .catch(() => {})
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

  const price = item ? (item.current_price ?? item.starting_price) : 0
  const sellerName = item?.seller?.display_name || 'Vendeur'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', paddingTop: 'max(16px, env(safe-area-inset-top))',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item?.title || t.back}
        </h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
          <div style={{
            width: '32px', height: '32px', border: '3px solid #333',
            borderTopColor: '#E8344E', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : !item ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#888' }}>{t.notFound}</p>
        </div>
      ) : (
        <>
          {/* Image carousel */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#111' }}>
            {item.image_urls?.length > 0 ? (
              <img
                src={item.image_urls[selectedImage]}
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
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
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  style={{
                    width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden',
                    border: i === selectedImage ? '2px solid #E8344E' : '2px solid #333',
                    padding: 0, background: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 600, color: '#888', overflow: 'hidden', flexShrink: 0,
              }}>
                {item.seller?.avatar_url ? (
                  <img src={item.seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  sellerName.charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>{sellerName}</p>
                <p style={{ fontSize: '12px', color: '#666', margin: '2px 0 0' }}>{t.seller}</p>
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
                {item.ai_tags.map((tag, i) => (
                  <span key={i} style={{
                    fontSize: '12px', color: '#888', backgroundColor: '#1a1a1a',
                    padding: '4px 10px', borderRadius: '8px', border: '1px solid #222',
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Contact seller button */}
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
          </div>
        </>
      )}
    </div>
  )
}
