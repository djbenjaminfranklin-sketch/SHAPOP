import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import type { Item, Stream } from '../types/database'

type Lang = 'fr' | 'en' | 'he' | 'es'

const pageContent = {
  fr: {
    title: 'Preparer le live',
    addItem: 'Ajouter un article',
    photo: 'Photo',
    itemTitle: 'Titre de l\'article',
    startingPrice: 'Prix de depart (EUR)',
    category: 'Categorie (optionnel)',
    add: 'Ajouter',
    cancel: 'Annuler',
    goLive: 'Passer en direct',
    noItems: 'Ajoute au moins un article pour commencer',
    lot: 'Lot',
    deleteConfirm: 'Supprimer cet article ?',
    delete: 'Supprimer',
    takePhoto: 'Prendre une photo',
    choosePhoto: 'Choisir dans la galerie',
    saving: 'Enregistrement...',
    items: 'articles',
    duration: 'Duree par article',
    seconds: 'sec',
    durationHint: 'Temps d\'enchere pour chaque article',
    quantity: 'Quantite',
    quantityHint: 'Chaque article aura un code unique',
    generating: 'Generation de {n} articles...',
  },
  en: {
    title: 'Prepare your live',
    addItem: 'Add an item',
    photo: 'Photo',
    itemTitle: 'Item title',
    startingPrice: 'Starting price (EUR)',
    category: 'Category (optional)',
    add: 'Add',
    cancel: 'Cancel',
    goLive: 'Go live',
    noItems: 'Add at least one item to start',
    lot: 'Lot',
    deleteConfirm: 'Delete this item?',
    delete: 'Delete',
    takePhoto: 'Take a photo',
    choosePhoto: 'Choose from gallery',
    saving: 'Saving...',
    items: 'items',
    duration: 'Duration per item',
    seconds: 'sec',
    durationHint: 'Bidding time for each item',
    quantity: 'Quantity',
    quantityHint: 'Each item will have a unique code',
    generating: 'Generating {n} items...',
  },
  he: {
    title: 'הכנת השידור',
    addItem: 'הוסף פריט',
    photo: 'תמונה',
    itemTitle: 'שם הפריט',
    startingPrice: 'מחיר התחלתי (EUR)',
    category: 'קטגוריה (אופציונלי)',
    add: 'הוסף',
    cancel: 'ביטול',
    goLive: 'צא לשידור',
    noItems: 'הוסף לפחות פריט אחד כדי להתחיל',
    lot: 'לוט',
    deleteConfirm: 'למחוק את הפריט?',
    delete: 'מחק',
    takePhoto: 'צלם תמונה',
    choosePhoto: 'בחר מהגלריה',
    saving: '...שומר',
    items: 'פריטים',
    duration: 'משך לכל פריט',
    seconds: 'שנ',
    durationHint: 'זמן מכירה לכל פריט',
    quantity: 'כמות',
    quantityHint: 'לכל פריט יהיה קוד ייחודי',
    generating: '...{n} יוצר פריטים',
  },
  es: {
    title: 'Preparar el directo',
    addItem: 'Agregar un articulo',
    photo: 'Foto',
    itemTitle: 'Titulo del articulo',
    startingPrice: 'Precio inicial (EUR)',
    category: 'Categoria (opcional)',
    add: 'Agregar',
    cancel: 'Cancelar',
    goLive: 'Iniciar directo',
    noItems: 'Agrega al menos un articulo para empezar',
    lot: 'Lote',
    deleteConfirm: 'Eliminar este articulo?',
    delete: 'Eliminar',
    takePhoto: 'Tomar foto',
    choosePhoto: 'Elegir de la galeria',
    saving: 'Guardando...',
    items: 'articulos',
    duration: 'Duracion por articulo',
    seconds: 'seg',
    durationHint: 'Tiempo de puja para cada articulo',
    quantity: 'Cantidad',
    quantityHint: 'Cada articulo tendra un codigo unico',
    generating: 'Generando {n} articulos...',
  },
}

interface DraftItem {
  id?: string
  title: string
  starting_price: number
  category: string
  image_url: string | null
  lot_number: number
  duration_seconds: number
}

export default function PrepareLivePage() {
  const { streamId } = useParams<{ streamId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = pageContent[lang] || pageContent.fr
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stream, setStream] = useState<Stream | null>(null)
  const [items, setItems] = useState<DraftItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [goingLive, setGoingLive] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formImage, setFormImage] = useState<string | null>(null)
  const [formQuantity, setFormQuantity] = useState(1)
  const [formDuration, setFormDuration] = useState(60)

  // Generate a unique 4-char alphanumeric code
  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion
    let code = ''
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  useEffect(() => {
    if (!streamId) return
    const fetchStream = async () => {
      const { data } = await supabase
        .from('streams')
        .select('*')
        .eq('id', streamId)
        .single()
      if (data) setStream(data)
    }

    const fetchItems = async () => {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
      if (data) {
        setItems(data.map((item: Item, i: number) => ({
          id: item.id,
          title: item.title,
          starting_price: item.starting_price,
          category: item.category,
          image_url: item.image_urls?.[0] || null,
          lot_number: i + 1,
          duration_seconds: item.duration_seconds || 60,
        })))
      }
    }

    fetchStream()
    fetchItems()
  }, [streamId])

  const handleImagePick = () => {
    fileInputRef.current?.click()
  }

  const [formImageFile, setFormImageFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFormImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFormImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAddItem = async () => {
    if (!formTitle.trim() || !formPrice || !user || !streamId) return
    setSaving(true)

    const price = parseFloat(formPrice)
    if (isNaN(price) || price <= 0) {
      setSaving(false)
      return
    }

    const category = formCategory || stream?.category || ''
    const qty = Math.max(1, Math.min(formQuantity, 99))
    const baseTitle = formTitle.trim()

    const newItems: DraftItem[] = []

    // Upload image to Supabase Storage if provided
    let imageUrls: string[] = []
    if (formImageFile && user) {
      const ext = formImageFile.name.split('.').pop() || 'jpg'
      const path = `${user.id}/items/${streamId}_${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, formImageFile, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        imageUrls = [urlData.publicUrl]
      }
    }

    for (let i = 0; i < qty; i++) {
      const code = generateUniqueCode()
      const title = `${baseTitle} [${code}]`
      const lotNumber = items.length + newItems.length + 1

      const { data, error } = await supabase
        .from('items')
        .insert({
          seller_id: user.id,
          stream_id: streamId,
          title,
          starting_price: price,
          current_price: price,
          category,
          status: 'draft' as const,
          image_urls: imageUrls,
          duration_seconds: formDuration,
        })
        .select()
        .single()

      if (!error && data) {
        newItems.push({
          id: data.id,
          title: data.title,
          starting_price: data.starting_price,
          category: data.category,
          image_url: formImage,
          lot_number: lotNumber,
          duration_seconds: formDuration,
        })
      }
    }

    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems])
    }

    setFormTitle('')
    setFormPrice('')
    setFormCategory('')
    setFormImage(null)
    setFormQuantity(1)
    setFormDuration(60)
    setShowForm(false)
    setSaving(false)
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    setItems(prev => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index - 1]
      copy[index - 1] = temp
      return copy.map((item, i) => ({ ...item, lot_number: i + 1 }))
    })
  }

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return
    setItems(prev => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index + 1]
      copy[index + 1] = temp
      return copy.map((item, i) => ({ ...item, lot_number: i + 1 }))
    })
  }

  const handleDeleteItem = async (index: number) => {
    const item = items[index]
    if (item.id) {
      await supabase.from('items').delete().eq('id', item.id)
    }
    setItems(prev => prev.filter((_, i) => i !== index).map((it, i) => ({ ...it, lot_number: i + 1 })))
  }

  const handleGoLive = async () => {
    if (!streamId || items.length === 0) return
    setGoingLive(true)

    // Provision Mux live stream
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (token) {
        const { apiFetch } = await import('../lib/api')
        await apiFetch(`/api/streams/${streamId}/create-mux-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })
      }
    } catch {
      // Continue even if Mux provisioning fails — stream can still work locally
    }

    await supabase
      .from('streams')
      .update({
        status: 'live' as const,
        started_at: new Date().toISOString(),
      })
      .eq('id', streamId)

    navigate(`/live-seller/${streamId}`)
  }

  const formatLot = (n: number) => `#${String(n).padStart(3, '0')}`

  const canGoLive = items.length > 0 && !goingLive

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 200,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        borderBottom: '1px solid #1A1A1A',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {ct.title}
            </h1>
            {stream && (
              <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                {stream.title} — {items.length} {ct.items}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        {items.length === 0 && !showForm && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '16px', padding: '40px',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.08))',
              border: '1px solid rgba(240,144,138,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '15px', color: '#888', textAlign: 'center' }}>
              {ct.noItems}
            </p>
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={item.id || index}
            style={{
              backgroundColor: '#111',
              border: '1px solid #222',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Lot number */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(240,144,138,0.2), rgba(232,52,78,0.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                />
              ) : (
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#F0908A' }}>
                  {formatLot(item.lot_number)}
                </span>
              )}
            </div>

            {/* Item info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#F0908A', opacity: 0.7 }}>
                  {formatLot(item.lot_number)}
                </span>
              </div>
              <p style={{
                fontSize: '15px', fontWeight: 600, color: '#fff', margin: '2px 0 0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#F0908A' }}>
                  {item.starting_price} €
                </span>
                <span style={{ fontSize: '11px', color: '#666' }}>
                  {item.duration_seconds}s
                </span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                style={{
                  width: '28px', height: '28px', borderRadius: '6px',
                  backgroundColor: index === 0 ? '#1A1A1A' : '#222',
                  border: 'none', cursor: index === 0 ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: index === 0 ? 0.3 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === items.length - 1}
                style={{
                  width: '28px', height: '28px', borderRadius: '6px',
                  backgroundColor: index === items.length - 1 ? '#1A1A1A' : '#222',
                  border: 'none', cursor: index === items.length - 1 ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: index === items.length - 1 ? 0.3 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Delete */}
            <button
              onClick={() => handleDeleteItem(index)}
              style={{
                width: '28px', height: '28px', borderRadius: '6px',
                backgroundColor: 'rgba(232,52,78,0.15)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        ))}

        {/* Add form */}
        {showForm && (
          <div style={{
            backgroundColor: '#111',
            border: '1px solid rgba(240,144,138,0.3)',
            borderRadius: '14px',
            padding: '16px',
          }}>
            {/* Image picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleImagePick}
              style={{
                width: '100%', height: '120px',
                backgroundColor: '#0D0D0D',
                border: '2px dashed #333',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '8px',
                marginBottom: '12px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {formImage ? (
                <img
                  src={formImage}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: '13px', color: '#666' }}>{ct.photo}</span>
                </>
              )}
            </button>

            {/* Title */}
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder={ct.itemTitle}
              style={{
                width: '100%', padding: '12px 14px',
                backgroundColor: '#0D0D0D',
                border: '1px solid #222',
                borderRadius: '10px',
                color: '#fff', fontSize: '15px',
                outline: 'none', boxSizing: 'border-box',
                marginBottom: '10px',
              }}
            />

            {/* Price */}
            <input
              type="number"
              value={formPrice}
              onChange={e => setFormPrice(e.target.value)}
              placeholder={ct.startingPrice}
              min="0"
              step="1"
              style={{
                width: '100%', padding: '12px 14px',
                backgroundColor: '#0D0D0D',
                border: '1px solid #222',
                borderRadius: '10px',
                color: '#fff', fontSize: '15px',
                outline: 'none', boxSizing: 'border-box',
                marginBottom: '10px',
              }}
            />

            {/* Category (optional) */}
            <input
              type="text"
              value={formCategory}
              onChange={e => setFormCategory(e.target.value)}
              placeholder={ct.category}
              style={{
                width: '100%', padding: '12px 14px',
                backgroundColor: '#0D0D0D',
                border: '1px solid #222',
                borderRadius: '10px',
                color: '#fff', fontSize: '15px',
                outline: 'none', boxSizing: 'border-box',
                marginBottom: '10px',
              }}
            />

            {/* Duration per article */}
            <div style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #222',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {ct.duration}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#F0908A' }}>
                    {formDuration}
                  </span>
                  <span style={{ fontSize: '11px', color: '#888' }}>{ct.seconds}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[30, 45, 60, 90, 120].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setFormDuration(sec)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '8px',
                      background: formDuration === sec
                        ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                        : '#111',
                      border: formDuration === sec ? 'none' : '1px solid #222',
                      color: formDuration === sec ? '#fff' : '#888',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity selector */}
            <div style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #222',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {ct.quantity}
                  </p>
                  {formQuantity > 1 && (
                    <p style={{ fontSize: '11px', color: '#F0908A', margin: '2px 0 0' }}>
                      {ct.quantityHint}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => setFormQuantity(q => Math.max(1, q - 1))}
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      backgroundColor: formQuantity <= 1 ? '#1A1A1A' : '#222',
                      border: 'none', cursor: formQuantity <= 1 ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: formQuantity <= 1 ? 0.3 : 1,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <span style={{
                    fontSize: '20px', fontWeight: 800, color: '#fff',
                    minWidth: '32px', textAlign: 'center',
                  }}>
                    {formQuantity}
                  </span>
                  <button
                    onClick={() => setFormQuantity(q => Math.min(99, q + 1))}
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      backgroundColor: '#222',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/>
                      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              {formQuantity > 1 && (
                <div style={{
                  display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap',
                }}>
                  {[5, 10, 20, 50].map(n => (
                    <button
                      key={n}
                      onClick={() => setFormQuantity(n)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: formQuantity === n
                          ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                          : '#1A1A1A',
                        border: formQuantity === n ? 'none' : '1px solid #333',
                        color: formQuantity === n ? '#fff' : '#888',
                        fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowForm(false)
                  setFormTitle('')
                  setFormPrice('')
                  setFormCategory('')
                  setFormImage(null)
                  setFormDuration(60)
                }}
                style={{
                  flex: 1, padding: '14px',
                  backgroundColor: '#1A1A1A',
                  border: 'none', borderRadius: '10px',
                  color: '#888', fontSize: '15px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {ct.cancel}
              </button>
              <button
                onClick={handleAddItem}
                disabled={!formTitle.trim() || !formPrice || saving}
                style={{
                  flex: 1, padding: '14px',
                  background: formTitle.trim() && formPrice
                    ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                    : 'rgba(255,255,255,0.06)',
                  border: 'none', borderRadius: '10px',
                  color: formTitle.trim() && formPrice ? '#fff' : 'rgba(255,255,255,0.25)',
                  fontSize: '15px', fontWeight: 700,
                  cursor: formTitle.trim() && formPrice ? 'pointer' : 'not-allowed',
                }}
              >
                {saving
                  ? (formQuantity > 1 ? ct.generating.replace('{n}', String(formQuantity)) : ct.saving)
                  : (formQuantity > 1 ? `${ct.add} (x${formQuantity})` : ct.add)
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div style={{
        padding: '16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        borderTop: '1px solid #1A1A1A',
        display: 'flex', flexDirection: 'column', gap: '10px',
        flexShrink: 0,
      }}>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              width: '100%', padding: '16px',
              backgroundColor: '#111',
              border: '1px solid #333',
              borderRadius: '14px',
              color: '#fff', fontSize: '16px', fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/>
            </svg>
            {ct.addItem}
          </button>
        )}

        <button
          onClick={handleGoLive}
          disabled={!canGoLive}
          style={{
            width: '100%', padding: '18px',
            background: canGoLive
              ? 'linear-gradient(135deg, #E8344E 0%, #F0908A 50%, #E8344E 100%)'
              : 'rgba(255,255,255,0.06)',
            backgroundSize: '200% 100%',
            borderRadius: '16px', border: 'none',
            color: canGoLive ? '#fff' : 'rgba(255,255,255,0.25)',
            fontSize: '18px', fontWeight: 800,
            cursor: canGoLive ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: canGoLive ? '0 8px 32px rgba(232,52,78,0.4)' : 'none',
          }}
        >
          {goingLive ? (
            <span style={{
              width: '18px', height: '18px',
              border: '2.5px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {ct.goLive}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
