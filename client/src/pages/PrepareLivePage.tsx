import { useState, useEffect, useRef } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'
import type { Item, Stream } from '../types/database'

// Compress image to max 800px and JPEG quality 0.7
function compressImage(file: File, maxSize = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}

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
    muxError: 'La configuration du streaming video a echoue. Les spectateurs pourraient ne pas voir votre video.',
    minPrice: 'Prix minimum (optionnel)',
    minPriceHint: 'Si aucune enchere n\'atteint ce prix, l\'article sera invendu',
    deleteStream: 'Supprimer ce live',
    deleteStreamConfirm: 'Supprimer ce live et tous ses articles ? Cette action est irreversible.',
    scheduledDate: 'Date programmee',
    changeDate: 'Modifier la date',
    saveDate: 'Enregistrer',
    deleteError: 'Echec de la suppression',
    confirmDelete: 'Supprimer',
    confirmCancel: 'Annuler',
    shippingDelay: 'Delai d\'expedition',
    shippingDelayHint: 'Delai maximum avant expedition',
    day: 'jour',
    days: 'jours',
    weight: 'Poids (grammes)',
    weightHint: 'Poids de l\'article pour le calcul des frais de port',
    suggestedShipping: 'Prix suggere',
    shippingOverride: 'Prix de livraison personnalise (EUR)',
    shippingOverrideHint: 'Laissez vide pour utiliser le prix calcule',
    shippingWarning: 'Attention: si le cout reel est superieur, la difference sera deduite de vos gains',
    perCarrier: 'selon le transporteur',
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
    muxError: 'Video streaming setup failed. Viewers may not see your video.',
    minPrice: 'Minimum price (optional)',
    minPriceHint: 'If no bid reaches this price, the item will be unsold',
    deleteStream: 'Delete this live',
    deleteStreamConfirm: 'Delete this live and all its items? This action cannot be undone.',
    scheduledDate: 'Scheduled date',
    changeDate: 'Change date',
    saveDate: 'Save',
    deleteError: 'Failed to delete',
    confirmDelete: 'Delete',
    confirmCancel: 'Cancel',
    shippingDelay: 'Shipping delay',
    shippingDelayHint: 'Maximum time before shipping',
    day: 'day',
    days: 'days',
    weight: 'Weight (grams)',
    weightHint: 'Item weight for shipping cost calculation',
    suggestedShipping: 'Suggested price',
    shippingOverride: 'Custom shipping price (EUR)',
    shippingOverrideHint: 'Leave empty to use calculated price',
    shippingWarning: 'Warning: if actual cost is higher, the difference will be deducted from your earnings',
    perCarrier: 'depending on carrier',
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
    muxError: 'הגדרת הזרמת הווידאו נכשלה. הצופים עלולים לא לראות את הווידאו שלך.',
    minPrice: '(מחיר מינימום (אופציונלי',
    minPriceHint: 'אם אף הצעה לא מגיעה למחיר זה, הפריט יהיה לא נמכר',
    deleteStream: 'מחק שידור זה',
    deleteStreamConfirm: 'למחוק את השידור ואת כל הפריטים? פעולה זו בלתי הפיכה.',
    scheduledDate: 'תאריך מתוזמן',
    changeDate: 'שנה תאריך',
    saveDate: 'שמור',
    deleteError: 'המחיקה נכשלה',
    confirmDelete: 'מחק',
    confirmCancel: 'ביטול',
    shippingDelay: 'זמן משלוח',
    shippingDelayHint: 'זמן מקסימלי לפני משלוח',
    day: 'יום',
    days: 'ימים',
    weight: '(משקל (גרם',
    weightHint: 'משקל הפריט לחישוב עלות משלוח',
    suggestedShipping: 'מחיר מוצע',
    shippingOverride: '(מחיר משלוח מותאם (EUR',
    shippingOverrideHint: 'השאר ריק לשימוש במחיר המחושב',
    shippingWarning: 'שים לב: אם העלות בפועל גבוהה יותר, ההפרש ינוכה מהרווחים שלך',
    perCarrier: 'בהתאם לשליח',
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
    muxError: 'La configuracion del streaming de video fallo. Los espectadores podrian no ver tu video.',
    minPrice: 'Precio minimo (opcional)',
    minPriceHint: 'Si ninguna puja alcanza este precio, el articulo no se vendera',
    deleteStream: 'Eliminar este directo',
    deleteStreamConfirm: 'Eliminar este directo y todos sus articulos? Esta accion es irreversible.',
    scheduledDate: 'Fecha programada',
    changeDate: 'Cambiar fecha',
    saveDate: 'Guardar',
    deleteError: 'Error al eliminar',
    confirmDelete: 'Eliminar',
    confirmCancel: 'Cancelar',
    shippingDelay: 'Plazo de envio',
    shippingDelayHint: 'Tiempo maximo antes del envio',
    day: 'dia',
    days: 'dias',
    weight: 'Peso (gramos)',
    weightHint: 'Peso del articulo para calcular el envio',
    suggestedShipping: 'Precio sugerido',
    shippingOverride: 'Precio de envio personalizado (EUR)',
    shippingOverrideHint: 'Dejar vacio para usar el precio calculado',
    shippingWarning: 'Atencion: si el costo real es mayor, la diferencia se deducira de tus ganancias',
    perCarrier: 'segun el transportista',
  },
}

interface ShippingOption {
  carrier: string
  cost: number
}

interface DraftItem {
  id?: string
  title: string
  starting_price: number
  min_price: number | null
  category: string
  image_url: string | null
  lot_number: number
  duration_seconds: number
  weight_grams: number | null
  seller_shipping_override: number | null
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
  const [formImageFile, setFormImageFile] = useState<File | null>(null)
  const [formQuantity, setFormQuantity] = useState(1)
  const [formDuration, setFormDuration] = useState(60)
  const [formMinPrice, setFormMinPrice] = useState('')
  const [formWeight, setFormWeight] = useState('')
  const [formShippingOverride, setFormShippingOverride] = useState('')
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [loadingShipping, setLoadingShipping] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null)
  const [shippingDelay, setShippingDelay] = useState(2)

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
        .select('id, seller_id, title, description, category, tags, status, thumbnail_url, viewer_count, peak_viewers, scheduled_at, started_at, ended_at, city, location, community_id, mux_playback_id, created_at, livekit_room_name')
        .eq('id', streamId)
        .single()
      if (data) {
        setStream(data)
        if (data.scheduled_at) {
          setScheduledDate(new Date(data.scheduled_at).toISOString().slice(0, 16))
        }
      }
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
          min_price: item.min_price || null,
          category: item.category,
          image_url: item.image_urls?.[0] || null,
          lot_number: i + 1,
          duration_seconds: item.duration_seconds || 60,
          weight_grams: item.weight_grams || null,
          seller_shipping_override: item.seller_shipping_override || null,
        })))
      }
    }

    fetchStream()
    fetchItems()
  }, [streamId])

  // Fetch seller's current shipping delay
  useEffect(() => {
    if (!user) return
    const fetchShippingDelay = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        if (!token) return
        const resp = await apiFetch('/api/seller/shipping-delay', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (resp.ok) {
          const data = await resp.json()
          if (data.shipping_delay_days != null) {
            setShippingDelay(data.shipping_delay_days)
          }
        }
      } catch { /* ignore */ }
    }
    fetchShippingDelay()
  }, [user])

  // Fetch shipping options when weight changes
  useEffect(() => {
    const weightNum = parseInt(formWeight, 10)
    if (!weightNum || weightNum <= 0) {
      setShippingOptions([])
      return
    }
    setLoadingShipping(true)
    const controller = new AbortController()
    apiFetch(`/api/shipping/options?weight_grams=${weightNum}`, { signal: controller.signal })
      .then(resp => resp.json())
      .then(data => {
        if (data.options) setShippingOptions(data.options)
        setLoadingShipping(false)
      })
      .catch(() => setLoadingShipping(false))
    return () => controller.abort()
  }, [formWeight])

  const handleShippingDelayChange = async (days: number) => {
    setShippingDelay(days)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token) return
      await apiFetch('/api/seller/shipping-delay', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shipping_delay_days: days }),
      })
    } catch { /* ignore */ }
  }

  const handleImagePick = () => {
    fileInputRef.current?.click()
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  // Clean up blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (formImage) URL.revokeObjectURL(formImage)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Revoke old preview URL to prevent memory leak
    if (formImage) URL.revokeObjectURL(formImage)
    setFormImageFile(file)
    setFormImage(URL.createObjectURL(file))
  }

  const handleAddItem = async () => {
    if (!formTitle.trim() || !formPrice || !user || !streamId) return
    setSaving(true)
    setFormError('')

    const price = parseFloat(formPrice)
    if (isNaN(price) || price <= 0) {
      setSaving(false)
      return
    }

    const category = formCategory || stream?.category || ''
    const qty = Math.max(1, Math.min(formQuantity, 99))
    const baseTitle = formTitle.trim()

    const newItems: DraftItem[] = []

    // Upload image to Supabase Storage instead of storing base64 in DB
    let imageUrls: string[] = []
    if (formImageFile) {
      try {
        const compressed = await compressImage(formImageFile)
        const filePath = `items/${user.id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, compressed, { contentType: 'image/jpeg', upsert: false })
        if (uploadError) {
          setFormError(uploadError.message)
          setSaving(false)
          return
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        imageUrls = [urlData.publicUrl]
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Image upload failed')
        setSaving(false)
        return
      }
    }

    for (let i = 0; i < qty; i++) {
      const code = generateUniqueCode()
      const title = `${baseTitle} [${code}]`
      const lotNumber = items.length + newItems.length + 1

      const minPrice = formMinPrice ? parseFloat(formMinPrice) : null
      const weightGrams = formWeight ? parseInt(formWeight, 10) : null
      const shippingOverride = formShippingOverride ? parseFloat(formShippingOverride) : null
      const { data, error } = await supabase
        .from('items')
        .insert({
          seller_id: user.id,
          stream_id: streamId,
          title,
          starting_price: price,
          current_price: price,
          min_price: (minPrice && minPrice > 0) ? minPrice : null,
          category,
          status: 'draft' as const,
          image_urls: imageUrls,
          duration_seconds: formDuration,
          weight_grams: (weightGrams && weightGrams > 0) ? weightGrams : null,
          seller_shipping_override: (shippingOverride && shippingOverride > 0) ? shippingOverride : null,
        })
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        setFormError(error.message || 'Erreur lors de la creation')
        setSaving(false)
        return
      }
      if (data) {
        newItems.push({
          id: data.id,
          title: data.title,
          starting_price: data.starting_price,
          min_price: data.min_price || null,
          category: data.category,
          image_url: imageUrls[0] || null,
          lot_number: lotNumber,
          duration_seconds: formDuration,
          weight_grams: (weightGrams && weightGrams > 0) ? weightGrams : null,
          seller_shipping_override: (shippingOverride && shippingOverride > 0) ? shippingOverride : null,
        })
      }
    }

    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems])
    }

    setFormTitle('')
    setFormPrice('')
    setFormCategory('')
    if (formImage) URL.revokeObjectURL(formImage)
    setFormImage(null)
    setFormImageFile(null)
    setFormQuantity(1)
    setFormDuration(60)
    setFormMinPrice('')
    setFormWeight('')
    setFormShippingOverride('')
    setShippingOptions([])
    setShowForm(false)
    setSaving(false)
  }

  const persistLotNumbers = async (updatedItems: DraftItem[]) => {
    try {
      await Promise.all(
        updatedItems
          .filter(item => item.id)
          .map(item =>
            supabase.from('items').update({ lot_number: item.lot_number }).eq('id', item.id!)
          )
      )
    } catch (err) {
      console.error('Failed to persist lot numbers:', err)
    }
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    setItems(prev => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index - 1]
      copy[index - 1] = temp
      const updated = copy.map((item, i) => ({ ...item, lot_number: i + 1 }))
      persistLotNumbers(updated)
      return updated
    })
  }

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return
    setItems(prev => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index + 1]
      copy[index + 1] = temp
      const updated = copy.map((item, i) => ({ ...item, lot_number: i + 1 }))
      persistLotNumbers(updated)
      return updated
    })
  }

  const handleDeleteItem = async (index: number) => {
    const item = items[index]
    if (item.id) {
      const { error } = await supabase.from('items').delete().eq('id', item.id)
      if (error) {
        console.error('Failed to delete item:', error)
        return
      }
    }
    setItems(prev => prev.filter((_, i) => i !== index).map((it, i) => ({ ...it, lot_number: i + 1 })))
  }

  const handleDeleteStream = () => {
    if (!streamId) return
    setConfirmModal({
      title: ct.deleteStream,
      message: ct.deleteStreamConfirm,
      onConfirm: async () => {
        setConfirmModal(null)
        setDeleteError('')
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await apiFetch(`/api/streams/${streamId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          navigate('/go-live', { replace: true })
        } else {
          const body = await res.json().catch(() => ({ error: ct.deleteError }))
          setDeleteError(body.error || ct.deleteError)
        }
      },
    })
  }

  const handleSaveDate = async () => {
    if (!streamId || !scheduledDate) return
    const { error } = await supabase
      .from('streams')
      .update({ scheduled_at: new Date(scheduledDate).toISOString() })
      .eq('id', streamId)
    if (!error) {
      setStream(prev => prev ? { ...prev, scheduled_at: new Date(scheduledDate).toISOString() } : prev)
      setEditingDate(false)
    }
  }

  const handleGoLive = async () => {
    if (!streamId || items.length === 0) return
    setGoingLive(true)

    // Provision LiveKit room
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (token) {
        const { apiFetch } = await import('../lib/api')
        const resp = await apiFetch(`/api/streams/${streamId}/create-livekit-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}))
          console.error('LiveKit room provisioning failed:', resp.status, errBody)
          alert(ct.muxError)
        }
      }
    } catch (err) {
      console.error('LiveKit room provisioning network error:', err)
      alert(ct.muxError)
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
            aria-label="Back"
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

      {/* Stream actions: scheduled date + delete */}
      {stream && (
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          {/* Scheduled date section — always visible */}
          <div style={{
            backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingDate ? '10px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                  {ct.scheduledDate}: {stream.scheduled_at ? new Date(stream.scheduled_at).toLocaleString() : '—'}
                </span>
              </div>
              {!editingDate && (
                <button onClick={() => setEditingDate(true)} style={{
                  background: 'none', border: '1px solid #333', borderRadius: '8px',
                  padding: '4px 10px', color: '#F0908A', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}>
                  {ct.changeDate}
                </button>
              )}
            </div>
            {editingDate && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  style={{
                    flex: 1, padding: '10px', backgroundColor: '#0D0D0D', border: '1px solid #333',
                    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
                <button onClick={handleSaveDate} style={{
                  padding: '10px 16px', background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                }}>
                  {ct.saveDate}
                </button>
                <button onClick={() => setEditingDate(false)} aria-label="Cancel date edit" style={{
                  padding: '10px 12px', background: '#222', border: 'none', borderRadius: '8px',
                  color: '#888', fontSize: '13px', cursor: 'pointer',
                }}>
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Shipping delay selector */}
          <div style={{
            backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                {ct.shippingDelay}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 5, 7].map(d => (
                <button
                  key={d}
                  onClick={() => handleShippingDelayChange(d)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: '8px',
                    background: shippingDelay === d
                      ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                      : '#0D0D0D',
                    border: shippingDelay === d ? 'none' : '1px solid #222',
                    color: shippingDelay === d ? '#fff' : '#888',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {d} {d === 1 ? ct.day : ct.days}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: '#666', margin: '6px 0 0 2px' }}>
              {ct.shippingDelayHint}
            </p>
          </div>

          {/* Delete stream button */}
          <button onClick={handleDeleteStream} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px', backgroundColor: 'rgba(232,52,78,0.08)', border: '1px solid rgba(232,52,78,0.2)',
            borderRadius: '12px', color: '#E8344E', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            {ct.deleteStream}
          </button>

          {deleteError && (
            <p style={{ fontSize: '12px', color: '#E8344E', margin: 0, textAlign: 'center' }}>{deleteError}</p>
          )}
        </div>
      )}

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
                {item.min_price != null && item.min_price > 0 && (
                  <span style={{ fontSize: '11px', color: '#F59E0B' }}>
                    min {item.min_price} €
                  </span>
                )}
                {item.weight_grams != null && item.weight_grams > 0 && (
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {item.weight_grams >= 1000
                      ? `${(item.weight_grams / 1000).toFixed(1)}kg`
                      : `${item.weight_grams}g`}
                  </span>
                )}
                {item.seller_shipping_override != null && item.seller_shipping_override > 0 && (
                  <span style={{ fontSize: '11px', color: '#F0908A', fontWeight: 600 }}>
                    {item.seller_shipping_override.toFixed(2)}&euro;
                  </span>
                )}
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
                aria-label="Move up"
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
                aria-label="Move down"
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
              aria-label="Delete item"
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
              inputMode="decimal"
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

            {/* Min price (optional) */}
            <div style={{ marginBottom: '10px' }}>
              <input
                type="number"
                inputMode="decimal"
                value={formMinPrice}
                onChange={e => setFormMinPrice(e.target.value)}
                placeholder={ct.minPrice}
                min="0"
                step="1"
                style={{
                  width: '100%', padding: '12px 14px',
                  backgroundColor: '#0D0D0D',
                  border: '1px solid #222',
                  borderRadius: '10px',
                  color: '#fff', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0 4px' }}>
                {ct.minPriceHint}
              </p>
            </div>

            {/* Weight (grams) */}
            <div style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #222',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v18M3 12h18" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {ct.weight}
                  </p>
                </div>
                {formWeight && (
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#F0908A' }}>
                    {parseInt(formWeight, 10) >= 1000
                      ? `${(parseInt(formWeight, 10) / 1000).toFixed(1)}kg`
                      : `${formWeight}g`}
                  </span>
                )}
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={formWeight}
                onChange={e => setFormWeight(e.target.value)}
                placeholder="500"
                min="1"
                style={{
                  width: '100%', padding: '10px 12px',
                  backgroundColor: '#111',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#fff', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                  marginBottom: '8px',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: '100g', value: 100 },
                  { label: '250g', value: 250 },
                  { label: '500g', value: 500 },
                  { label: '1kg', value: 1000 },
                  { label: '2kg', value: 2000 },
                  { label: '5kg', value: 5000 },
                ].map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => setFormWeight(String(preset.value))}
                    style={{
                      flex: 1,
                      minWidth: '48px',
                      padding: '7px 0',
                      borderRadius: '8px',
                      background: formWeight === String(preset.value)
                        ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                        : '#111',
                      border: formWeight === String(preset.value) ? 'none' : '1px solid #222',
                      color: formWeight === String(preset.value) ? '#fff' : '#888',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: '#666', margin: '6px 0 0 2px' }}>
                {ct.weightHint}
              </p>
            </div>

            {/* Shipping override section — shown when weight is set */}
            {formWeight && parseInt(formWeight, 10) > 0 && (
              <div style={{
                backgroundColor: '#0D0D0D',
                border: '1px solid #222',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="1" />
                    <path d="M16 8h4l3 3v5h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {ct.shippingOverride}
                  </p>
                </div>

                {/* Suggested shipping price range */}
                {loadingShipping ? (
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 8px 0' }}>...</p>
                ) : shippingOptions.length > 0 && (
                  <div style={{
                    backgroundColor: 'rgba(240,144,138,0.08)',
                    border: '1px solid rgba(240,144,138,0.2)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '10px',
                  }}>
                    <p style={{ fontSize: '12px', color: '#F0908A', margin: 0, fontWeight: 600 }}>
                      {ct.suggestedShipping}: {Math.min(...shippingOptions.map(o => o.cost)).toFixed(2)}&euro; - {Math.max(...shippingOptions.map(o => o.cost)).toFixed(2)}&euro; {ct.perCarrier}
                    </p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {shippingOptions.map(opt => (
                        <span key={opt.carrier} style={{
                          fontSize: '11px', color: '#888',
                          backgroundColor: '#111',
                          border: '1px solid #222',
                          borderRadius: '6px',
                          padding: '3px 8px',
                        }}>
                          {opt.carrier.replace('_', ' ')}: {opt.cost.toFixed(2)}&euro;
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Override input */}
                <input
                  type="number"
                  inputMode="decimal"
                  value={formShippingOverride}
                  onChange={e => setFormShippingOverride(e.target.value)}
                  placeholder={shippingOptions.length > 0
                    ? `${Math.min(...shippingOptions.map(o => o.cost)).toFixed(2)}`
                    : '0.00'}
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%', padding: '10px 12px',
                    backgroundColor: '#111',
                    border: '1px solid #222',
                    borderRadius: '8px',
                    color: '#fff', fontSize: '15px',
                    outline: 'none', boxSizing: 'border-box',
                    marginBottom: '6px',
                  }}
                />
                <p style={{ fontSize: '11px', color: '#666', margin: '0 0 0 2px' }}>
                  {ct.shippingOverrideHint}
                </p>

                {/* Warning if override is below cheapest carrier */}
                {formShippingOverride && shippingOptions.length > 0 &&
                  parseFloat(formShippingOverride) > 0 &&
                  parseFloat(formShippingOverride) < Math.min(...shippingOptions.map(o => o.cost)) && (
                  <div style={{
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginTop: '8px',
                  }}>
                    <p style={{ fontSize: '12px', color: '#F59E0B', margin: 0 }}>
                      {ct.shippingWarning}
                    </p>
                  </div>
                )}
              </div>
            )}

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
                    aria-label="Decrease quantity"
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
                    aria-label="Increase quantity"
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

            {/* Error message */}
            {formError && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(232,52,78,0.15)',
                border: '1px solid rgba(232,52,78,0.3)',
                borderRadius: '10px',
                marginBottom: '10px',
              }}>
                <p style={{ fontSize: '13px', color: '#E8344E', margin: 0 }}>{formError}</p>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowForm(false)
                  setFormTitle('')
                  setFormPrice('')
                  setFormCategory('')
                  setFormWeight('')
                  setFormShippingOverride('')
                  setShippingOptions([])
                  if (formImage) URL.revokeObjectURL(formImage)
                  setFormImage(null)
                  setFormImageFile(null)
                  setFormQuantity(1)
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
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
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

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmLabel={ct.confirmDelete}
        cancelLabel={ct.confirmCancel}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
        danger
      />
    </div>
  )
}
