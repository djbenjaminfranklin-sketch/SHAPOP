import { useState, useRef, useCallback, useEffect } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang, getLocale, tr, t as i18nT, type Localized, type TranslationKey } from '../lib/i18n'
import { ft } from '../lib/fulfillmentText'
import { categories } from '../components/CategoryIcons'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'
import SellerStatusPrompt from '../components/seller/SellerStatusPrompt'

// Compress image to max 800px and JPEG quality 0.7 (~100-200KB)
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

type Tip = { icon: string; title: string; desc: string }

const tips: Localized<Tip[]> = {
  en: [
    { icon: '🎯', title: 'Pick the right time', desc: 'Evening lives (7-10 PM) and weekends draw more viewers. Try different times to find your audience.' },
    { icon: '💡', title: 'Get your lighting right', desc: 'Good lighting makes all the difference! Face a window or use a ring light to show your items properly.' },
    { icon: '🏷️', title: 'Set your prices in advance', desc: 'Decide your starting prices before going live. Attractive prices trigger more bids and push offers up.' },
    { icon: '🗣️', title: 'Engage with your audience', desc: 'Reply to comments and call people by name. The more you interact, the longer people stay and buy.' },
    { icon: '📦', title: 'Show the details', desc: 'Turn items around, show labels and any flaws. Transparency builds trust and prevents returns.' },
  ],
  fr: [
    { icon: '🎯', title: 'Choisis un bon créneau', desc: 'Les lives en soirée (19 h - 22 h) et le week-end attirent plus de monde. Teste différents horaires pour trouver ton audience.' },
    { icon: '💡', title: 'Soigne ton éclairage', desc: 'Un bon éclairage fait toute la différence ! Place-toi face à une fenêtre ou utilise une ring light pour bien montrer tes articles.' },
    { icon: '🏷️', title: 'Prépare tes prix à l\'avance', desc: 'Définis tes prix de départ avant le live. Des prix attractifs déclenchent plus d\'enchères et font monter les offres.' },
    { icon: '🗣️', title: 'Interagis avec ton audience', desc: 'Réponds aux commentaires, appelle les gens par leur prénom. Plus tu échanges, plus les gens restent et achètent.' },
    { icon: '📦', title: 'Montre les détails', desc: 'Retourne les articles, montre les étiquettes et les défauts s\'il y en a. La transparence crée la confiance et évite les retours.' },
  ],
  es: [
    { icon: '🎯', title: 'Elige el momento adecuado', desc: 'Los directos por la noche (19-22 h) y los fines de semana atraen más público. Prueba distintos horarios para encontrar a tu audiencia.' },
    { icon: '💡', title: 'Cuida la iluminación', desc: '¡Una buena iluminación lo cambia todo! Ponte frente a una ventana o usa un aro de luz para mostrar bien tus artículos.' },
    { icon: '🏷️', title: 'Prepara tus precios con antelación', desc: 'Define los precios de salida antes del directo. Los precios atractivos generan más pujas y hacen subir las ofertas.' },
    { icon: '🗣️', title: 'Interactúa con tu audiencia', desc: 'Responde a los comentarios y llama a la gente por su nombre. Cuanto más interactúes, más tiempo se quedan y más compran.' },
    { icon: '📦', title: 'Muestra los detalles', desc: 'Gira los artículos, enseña las etiquetas y los defectos si los hay. La transparencia genera confianza y evita devoluciones.' },
  ],
  ru: [
    { icon: '🎯', title: 'Выбери удачное время', desc: 'Вечерние эфиры (19–22 ч) и выходные собирают больше зрителей. Пробуй разное время, чтобы найти свою аудиторию.' },
    { icon: '💡', title: 'Позаботься о свете', desc: 'Хороший свет решает всё! Встань лицом к окну или используй кольцевую лампу, чтобы товары было хорошо видно.' },
    { icon: '🏷️', title: 'Продумай цены заранее', desc: 'Определи стартовые цены до эфира. Привлекательные цены вызывают больше ставок и поднимают предложения.' },
    { icon: '🗣️', title: 'Общайся со зрителями', desc: 'Отвечай на комментарии, обращайся к людям по имени. Чем больше общения, тем дольше зрители остаются и покупают.' },
    { icon: '📦', title: 'Показывай детали', desc: 'Поворачивай товары, показывай бирки и дефекты, если они есть. Честность вызывает доверие и спасает от возвратов.' },
  ],
  he: [
    { icon: '🎯', title: 'בחרו שעה טובה', desc: 'שידורים בערב (19:00-22:00) ובסופי שבוע מושכים יותר צופים. נסו שעות שונות כדי למצוא את הקהל שלכם.' },
    { icon: '💡', title: 'דאגו לתאורה טובה', desc: 'תאורה טובה עושה את כל ההבדל! עמדו מול חלון או השתמשו בתאורת טבעת כדי להציג את הפריטים כמו שצריך.' },
    { icon: '🏷️', title: 'הכינו מחירים מראש', desc: 'קבעו מחירי פתיחה לפני השידור. מחירים אטרקטיביים מביאים יותר הצעות ומקפיצים את המחיר.' },
    { icon: '🗣️', title: 'דברו עם הקהל', desc: 'ענו לתגובות ופנו לאנשים בשמם. ככל שתתקשרו יותר, אנשים נשארים יותר זמן וקונים.' },
    { icon: '📦', title: 'הראו את הפרטים', desc: 'סובבו את הפריטים, הראו תוויות ופגמים אם יש. שקיפות בונה אמון ומונעת החזרות.' },
  ],
}

const tipsHeader = {
  en: { title: 'Tips for a great live', next: 'Next', start: 'Let\'s go!', skip: 'Skip', page: 'of' },
  fr: { title: 'Conseils pour réussir ton live', next: 'Suivant', start: 'C\'est parti !', skip: 'Passer', page: 'sur' },
  es: { title: 'Consejos para tu directo', next: 'Siguiente', start: '¡Vamos!', skip: 'Saltar', page: 'de' },
  ru: { title: 'Советы для удачного эфира', next: 'Далее', start: 'Поехали!', skip: 'Пропустить', page: 'из' },
  he: { title: 'טיפים לשידור מוצלח', next: 'הבא', start: 'יאללה!', skip: 'דילוג', page: 'מתוך' },
} satisfies Localized<Record<string, string>>

type PluralForms = { one: string; few: string; many: string; other: string }

const goLiveContent = {
  en: {
    title: 'New live',
    titlePlaceholder: 'Give your live a title...',
    category: 'Category',
    next: 'Prepare my items',
    cancel: 'Cancel',
    creating: 'Creating...',
    subtitle: 'Choose a title and a category, then prepare your items before going live.',
    createError: 'Couldn\'t create the live',
    sellerError: 'Couldn\'t verify your seller account',
    myLives: 'My lives',
    noLives: 'No lives yet',
    deleteConfirm: 'Delete this live and its items?',
    liveNow: 'Live now',
    goLiveNow: 'Go live now (without preparing items)',
    scheduled: 'Scheduled',
    ended: 'Ended',
    edit: 'Edit',
    delete: 'Delete',
    thumbnail: 'Thumbnail (optional)',
    thumbnailBtn: 'Add a photo',
    thumbnailChange: 'Change',
    select: 'Select',
    selectAll: 'Select all',
    deleteSelected: 'Delete',
    bulkCancel: 'Cancel',
    bulkDeleteConfirm: 'Delete these lives and their items?',
    confirmDelete: 'Delete',
    confirmCancel: 'Cancel',
    deleteStreamTitle: 'Delete live',
    bulkDeleteTitle: 'Delete several lives',
    back: 'Back',
    deleteFailed: 'Couldn\'t delete the live. Please try again.',
    bulkPartial: '{ok} deleted, {fail} failed',
    bulkFailed: 'Deletion failed ({fail})',
  },
  fr: {
    title: 'Nouveau live',
    titlePlaceholder: 'Donne un titre à ton live...',
    category: 'Catégorie',
    next: 'Préparer mes articles',
    cancel: 'Annuler',
    creating: 'Création...',
    subtitle: 'Choisis un titre et une catégorie, puis prépare tes articles avant de passer en direct.',
    createError: 'Impossible de créer le live',
    sellerError: 'Impossible de vérifier ton compte vendeur',
    myLives: 'Mes lives',
    noLives: 'Aucun live pour le moment',
    deleteConfirm: 'Supprimer ce live et ses articles ?',
    liveNow: 'En direct',
    goLiveNow: 'Passer en direct sans préparer les articles',
    scheduled: 'Programmé',
    ended: 'Terminé',
    edit: 'Modifier',
    delete: 'Supprimer',
    thumbnail: 'Miniature (facultatif)',
    thumbnailBtn: 'Ajouter une photo',
    thumbnailChange: 'Changer',
    select: 'Sélectionner',
    selectAll: 'Tout sélectionner',
    deleteSelected: 'Supprimer',
    bulkCancel: 'Annuler',
    bulkDeleteConfirm: 'Supprimer ces lives et leurs articles ?',
    confirmDelete: 'Supprimer',
    confirmCancel: 'Annuler',
    deleteStreamTitle: 'Supprimer le live',
    bulkDeleteTitle: 'Supprimer plusieurs lives',
    back: 'Retour',
    deleteFailed: 'Impossible de supprimer le live. Réessaie.',
    bulkPartial: '{ok} supprimé(s), {fail} en échec',
    bulkFailed: 'Échec de la suppression ({fail})',
  },
  es: {
    title: 'Nuevo directo',
    titlePlaceholder: 'Ponle un título a tu directo...',
    category: 'Categoría',
    next: 'Preparar mis artículos',
    cancel: 'Cancelar',
    creating: 'Creando...',
    subtitle: 'Elige un título y una categoría, y prepara tus artículos antes de salir en directo.',
    createError: 'No se pudo crear el directo',
    sellerError: 'No se pudo verificar tu cuenta de vendedor',
    myLives: 'Mis directos',
    noLives: 'Aún no tienes directos',
    deleteConfirm: '¿Eliminar este directo y sus artículos?',
    liveNow: 'En directo',
    goLiveNow: 'Ir en directo sin preparar artículos',
    scheduled: 'Programado',
    ended: 'Terminado',
    edit: 'Editar',
    delete: 'Eliminar',
    thumbnail: 'Miniatura (opcional)',
    thumbnailBtn: 'Añadir una foto',
    thumbnailChange: 'Cambiar',
    select: 'Seleccionar',
    selectAll: 'Seleccionar todo',
    deleteSelected: 'Eliminar',
    bulkCancel: 'Cancelar',
    bulkDeleteConfirm: '¿Eliminar estos directos y sus artículos?',
    confirmDelete: 'Eliminar',
    confirmCancel: 'Cancelar',
    deleteStreamTitle: 'Eliminar directo',
    bulkDeleteTitle: 'Eliminar varios directos',
    back: 'Volver',
    deleteFailed: 'No se pudo eliminar el directo. Inténtalo de nuevo.',
    bulkPartial: '{ok} eliminado(s), {fail} con error',
    bulkFailed: 'Error al eliminar ({fail})',
  },
  ru: {
    title: 'Новый эфир',
    titlePlaceholder: 'Придумай название эфира...',
    category: 'Категория',
    next: 'Подготовить товары',
    cancel: 'Отмена',
    creating: 'Создаём...',
    subtitle: 'Выбери название и категорию, затем подготовь товары перед выходом в эфир.',
    createError: 'Не удалось создать эфир',
    sellerError: 'Не удалось проверить твой аккаунт продавца',
    myLives: 'Мои эфиры',
    noLives: 'Эфиров пока нет',
    deleteConfirm: 'Удалить этот эфир и его товары?',
    liveNow: 'В эфире',
    goLiveNow: 'Начать эфир без подготовки товаров',
    scheduled: 'Запланирован',
    ended: 'Завершён',
    edit: 'Изменить',
    delete: 'Удалить',
    thumbnail: 'Обложка (необязательно)',
    thumbnailBtn: 'Добавить фото',
    thumbnailChange: 'Изменить',
    select: 'Выбрать',
    selectAll: 'Выбрать все',
    deleteSelected: 'Удалить',
    bulkCancel: 'Отмена',
    bulkDeleteConfirm: 'Удалить эти эфиры и их товары?',
    confirmDelete: 'Удалить',
    confirmCancel: 'Отмена',
    deleteStreamTitle: 'Удалить эфир',
    bulkDeleteTitle: 'Удалить несколько эфиров',
    back: 'Назад',
    deleteFailed: 'Не удалось удалить эфир. Попробуй ещё раз.',
    bulkPartial: 'Удалено: {ok}, с ошибкой: {fail}',
    bulkFailed: 'Не удалось удалить ({fail})',
  },
  he: {
    title: 'שידור חדש',
    titlePlaceholder: 'תנו כותרת לשידור...',
    category: 'קטגוריה',
    next: 'הכנת הפריטים שלי',
    cancel: 'ביטול',
    creating: 'יוצרים...',
    subtitle: 'בחרו כותרת וקטגוריה, ואז הכינו את הפריטים לפני שעולים לשידור.',
    createError: 'לא הצלחנו ליצור את השידור',
    sellerError: 'לא הצלחנו לאמת את חשבון המוכר/ת שלך',
    myLives: 'השידורים שלי',
    noLives: 'עדיין אין שידורים',
    deleteConfirm: 'למחוק את השידור ואת הפריטים שלו?',
    liveNow: 'בשידור חי',
    goLiveNow: 'לעלות לשידור בלי להכין פריטים',
    scheduled: 'מתוזמן',
    ended: 'הסתיים',
    edit: 'עריכה',
    delete: 'מחיקה',
    thumbnail: 'תמונה ממוזערת (לא חובה)',
    thumbnailBtn: 'הוספת תמונה',
    thumbnailChange: 'החלפה',
    select: 'בחירה',
    selectAll: 'בחירת הכל',
    deleteSelected: 'מחיקה',
    bulkCancel: 'ביטול',
    bulkDeleteConfirm: 'למחוק את השידורים האלה ואת הפריטים שלהם?',
    confirmDelete: 'מחיקה',
    confirmCancel: 'ביטול',
    deleteStreamTitle: 'מחיקת שידור',
    bulkDeleteTitle: 'מחיקת כמה שידורים',
    back: 'חזרה',
    deleteFailed: 'לא הצלחנו למחוק את השידור. נסו שוב.',
    bulkPartial: '{ok} נמחקו, {fail} נכשלו',
    bulkFailed: 'המחיקה נכשלה ({fail})',
  },
} satisfies Localized<Record<string, string>>

const itemsForms: Localized<PluralForms> = {
  en: { one: '{n} item', few: '{n} items', many: '{n} items', other: '{n} items' },
  fr: { one: '{n} article', few: '{n} articles', many: '{n} articles', other: '{n} articles' },
  es: { one: '{n} artículo', few: '{n} artículos', many: '{n} artículos', other: '{n} artículos' },
  ru: { one: '{n} товар', few: '{n} товара', many: '{n} товаров', other: '{n} товара' },
  he: { one: 'פריט אחד', few: '{n} פריטים', many: '{n} פריטים', other: '{n} פריטים' },
}

function itemsLabel(n: number): string {
  const forms = tr(itemsForms)
  const rule = new Intl.PluralRules(getLocale()).select(n)
  const form = rule === 'one' || rule === 'few' || rule === 'many' ? forms[rule] : forms.other
  return form.replace('{n}', String(n))
}

export default function GoLivePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const manageMode = searchParams.get('manage') === 'true'
  const { user, profile } = useAuth()
  const [showStatusPrompt, setShowStatusPrompt] = useState(false)
  const lang = getLang()
  const ct = tr(goLiveContent)
  usePageTitle(ct.title)

  // Block non-sellers
  useEffect(() => {
    if (profile && !profile.is_seller) {
      navigate('/dashboard', { replace: true })
    }
  }, [profile, navigate])

  const [showTips, setShowTips] = useState(() => {
    // Only show tips the first time
    const seen = localStorage.getItem('shapop_live_tips_seen')
    if (seen) return false
    localStorage.setItem('shapop_live_tips_seen', '1')
    return true
  })
  const [tipIndex, setTipIndex] = useState(0)
  const [liveTitle, setLiveTitle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const thumbnailPreviewRef = useRef<string | null>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  // Keep ref in sync for unmount cleanup
  useEffect(() => {
    thumbnailPreviewRef.current = thumbnailPreview
  }, [thumbnailPreview])

  // Clean up blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (thumbnailPreviewRef.current) URL.revokeObjectURL(thumbnailPreviewRef.current)
    }
  }, [])

  // My lives
  interface MyStream {
    id: string
    title: string
    category: string
    status: 'scheduled' | 'live' | 'ended'
    created_at: string
    scheduled_at: string | null
    item_count?: number
  }
  const [myStreams, setMyStreams] = useState<MyStream[]>([])
  const [streamsLoading, setStreamsLoading] = useState(true)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchMyStreams = async () => {
      setStreamsLoading(true)
      try {
        const { data } = await supabase
          .from('streams')
          .select('id, title, category, status, created_at, scheduled_at')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false })
        if (data) {
          // Fetch item counts for each stream
          const streamsWithCounts = await Promise.all(
            data.map(async (s) => {
              const { count } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true })
                .eq('stream_id', s.id)
              return { ...s, item_count: count || 0 } as MyStream
            })
          )
          setMyStreams(streamsWithCounts)
        }
      } finally {
        setStreamsLoading(false)
      }
    }
    fetchMyStreams()
  }, [user])

  const handleDeleteStream = (streamId: string) => {
    setConfirmModal({
      title: ct.deleteStreamTitle || ct.delete,
      message: ct.deleteConfirm,
      onConfirm: async () => {
        setConfirmModal(null)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await apiFetch(`/api/streams/${streamId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          setMyStreams(prev => prev.filter(s => s.id !== streamId))
        } else {
          alert(ct.deleteFailed)
        }
      },
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    setConfirmModal({
      title: ct.bulkDeleteTitle || ct.delete,
      message: ct.bulkDeleteConfirm || ct.deleteConfirm,
      onConfirm: async () => {
        setConfirmModal(null)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const headers = { Authorization: `Bearer ${session.access_token}` }
        const deletedIds = new Set<string>()
        let failCount = 0
        for (const id of selectedIds) {
          try {
            const res = await apiFetch(`/api/streams/${id}`, { method: 'DELETE', headers })
            if (res.ok) deletedIds.add(id)
            else failCount++
          } catch { failCount++ }
        }
        setMyStreams(prev => prev.filter(s => !deletedIds.has(s.id)))
        setSelectedIds(new Set())
        setSelectionMode(false)
        if (failCount > 0 && deletedIds.size > 0) {
          alert(ct.bulkPartial.replace('{ok}', String(deletedIds.size)).replace('{fail}', String(failCount)))
        } else if (failCount > 0) {
          alert(ct.bulkFailed.replace('{fail}', String(failCount)))
        }
      },
    })
  }

  const toggleSelectStream = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === myStreams.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(myStreams.map(s => s.id)))
    }
  }

  const langTips = tr(tips)
  const th = tr(tipsHeader)

  // Swipe gesture state for tips carousel
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isSwiping = useRef(false)

  // Reset touch refs on unmount to prevent stale values when navigating back
  useEffect(() => {
    return () => {
      touchStartX.current = null
      touchStartY.current = null
      isSwiping.current = false
    }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isSwiping.current = false
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = Math.abs(e.touches[0].clientX - touchStartX.current)
    const diffY = Math.abs(e.touches[0].clientY - touchStartY.current)
    // If horizontal movement is dominant, mark as swiping
    if (diffX > diffY && diffX > 10) {
      isSwiping.current = true
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const threshold = 50

    if (Math.abs(deltaX) > threshold && isSwiping.current) {
      if (deltaX < 0) {
        // Swiped left -> next tip or dismiss
        setTipIndex(prev => {
          if (prev === langTips.length - 1) {
            setShowTips(false)
            return prev
          }
          return prev + 1
        })
      } else {
        // Swiped right -> previous tip
        setTipIndex(prev => (prev > 0 ? prev - 1 : prev))
      }
    }

    touchStartX.current = null
    touchStartY.current = null
    isSwiping.current = false
  }, [langTips.length])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  if (!user) {
    return null
  }

  const sellingCategories = categories.filter(c => c.id !== 'for_you' && c.id !== 'following')

  const canProceed = liveTitle.trim().length > 0 && selectedCategory && !creating

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Revoke old preview URL to prevent memory leak
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  // Passer en direct tout de suite, sans préparer les articles (28/11/2026, demande de Benjamin)
  const goNowRef = useRef(false)
  const handleCreate = async (goNow: boolean = goNowRef.current) => {
    goNowRef.current = goNow
    if (!user || !canProceed) return

    setCreating(true)
    setError('')

    try {
      // Upload thumbnail if provided
      let uploadedThumbnailUrl: string | null = null
      if (thumbnailFile) {
        const compressed = await compressImage(thumbnailFile)
        const path = `thumbnails/${user.id}/${Date.now()}.jpg`
        const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
        if (uploadErr) {
          throw new Error(uploadErr.message)
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        uploadedThumbnailUrl = urlData.publicUrl
      }

      // Create stream via server API (handles seller auto-creation)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const resp = await apiFetch('/api/streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          supports_seller_status: true,
          title: liveTitle.trim(),
          category: selectedCategory,
          city: profile?.city || null,
          thumbnail_url: uploadedThumbnailUrl,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: ct.createError }))
        if (err.error === 'seller_status_required') {
          // Particulier ou pro jamais déclaré : on le demande, puis on relance la création
          setShowStatusPrompt(true)
          setCreating(false)
          return
        }
        if (err.error === 'whatsapp_required') {
          // Numéro WhatsApp obligatoire pour vendre : réglages « Remise des commandes »
          alert(ft().whatsapp_required_to_sell)
          setCreating(false)
          navigate('/payments')
          return
        }
        throw new Error(err.error || ct.createError)
      }

      const stream = await resp.json()
      if (!stream?.id) throw new Error('Stream creation failed')

      setCreating(false)
      navigate(goNow ? `/prepare-live/${stream.id}?golive=1` : `/prepare-live/${stream.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : ct.createError)
      setCreating(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '16px 20px',
    backgroundColor: '#111',
    border: '1px solid #222',
    borderRadius: '14px',
    color: '#fff',
    fontSize: 'calc(16px * var(--fs, 1))',
    fontWeight: 600 as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  // Tips carousel screen
  if (showTips) {
    const tip = langTips[tipIndex]
    const isLast = tipIndex === langTips.length - 1
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#000',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '12px 16px',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button
            onClick={() => navigate(-1)}
            aria-label={ct.back}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}>
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => setShowTips(false)}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '100px', cursor: 'pointer',
              color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700,
              padding: '8px 18px',
            }}
          >
            {th.skip}
          </button>
        </div>

        {/* Content - swipeable area */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px 32px', gap: '32px',
            touchAction: 'pan-y',
            userSelect: 'none',
          }}
        >
          {/* Big emoji icon */}
          <div style={{
            width: '100px', height: '100px', borderRadius: '28px',
            background: 'linear-gradient(135deg, rgba(0, 229, 255,0.15), rgba(0,229,255,0.08))',
            border: '1px solid rgba(0, 229, 255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'calc(48px * var(--fs, 1))',
          }}>
            {tip.icon}
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 'calc(24px * var(--fs, 1))', fontWeight: 800, color: '#fff',
            textAlign: 'center', lineHeight: 1.3, margin: 0,
          }}>
            {tip.title}
          </h2>

          {/* Description */}
          <p style={{
            fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center',
            lineHeight: 1.7, maxWidth: '300px', margin: 0,
          }}>
            {tip.desc}
          </p>
        </div>

        {/* Bottom: progress + button */}
        <div style={{
          padding: '20px 24px',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)) + 20px)',
        }}>
          {/* Progress dots */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '6px',
            marginBottom: '20px',
          }}>
            {langTips.map((_, i) => (
              <div
                key={`tip-dot-${i}`}
                onClick={() => setTipIndex(i)}
                style={{
                  width: i === tipIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === tipIndex
                    ? 'linear-gradient(135deg, #00E5FF, #0091EA)'
                    : '#333',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* Page indicator + button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600 }}>
              {tipIndex + 1} {th.page} {langTips.length}
            </span>
            <button
              onClick={() => {
                if (isLast) {
                  setShowTips(false)
                } else {
                  setTipIndex(tipIndex + 1)
                }
              }}
              style={{
                padding: '14px 32px',
                background: isLast
                  ? 'linear-gradient(135deg, #00E5FF, #0091EA)'
                  : '#1A1A1A',
                border: isLast ? 'none' : '1px solid #333',
                borderRadius: '14px',
                color: isLast ? '#fff' : '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isLast ? '0 4px 16px rgba(0,229,255,0.3)' : 'none',
              }}
            >
              {isLast ? th.start : th.next}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(120px + max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)))' }}>
      {showStatusPrompt && user && (
        <SellerStatusPrompt userId={user.id} onCancel={() => setShowStatusPrompt(false)} onDone={() => { setShowStatusPrompt(false); handleCreate(goNowRef.current) }} />
      )}
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: '#000', borderBottom: '1px solid #1A1A1A',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label={ct.back}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={rtlFlip()}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{manageMode ? ct.myLives : ct.title}</h1>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Icon */}
        {!manageMode && <><div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0, 229, 255,0.15), rgba(0,229,255,0.08))',
            border: '1px solid rgba(0, 229, 255,0.2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.6, maxWidth: '320px', margin: '0 auto' }}>
            {ct.subtitle}
          </p>
        </div>

        {/* Title input */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            value={liveTitle}
            onChange={e => { if (e.target.value.length <= 100) setLiveTitle(e.target.value) }}
            placeholder={ct.titlePlaceholder}
            style={inputStyle}
          />
          <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'end', marginTop: '6px' }}>
            {liveTitle.length}/100
          </p>
        </div>

        {/* Category */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0',
            marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            {ct.category}
          </p>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px',
          }}>
            {sellingCategories.slice(0, 12).map(cat => {
              const isSelected = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '100px',
                    background: isSelected
                      ? 'linear-gradient(135deg, #00E5FF, #0091EA)'
                      : '#111',
                    border: isSelected ? 'none' : '1px solid #222',
                    color: isSelected ? '#fff' : '#f0f0f0',
                    fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    boxShadow: isSelected ? '0 4px 16px rgba(0, 229, 255,0.3)' : 'none',
                  }}
                >
                  {i18nT(lang, cat.id as TranslationKey)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Thumbnail */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0',
            marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            {ct.thumbnail}
          </p>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            style={{ display: 'none' }}
          />
          {thumbnailPreview ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={thumbnailPreview}
                alt=""
                loading="lazy"
                style={{
                  width: '80px', height: '80px', borderRadius: '12px',
                  objectFit: 'cover', border: '1px solid #222',
                }}
              />
              <button
                onClick={() => thumbnailInputRef.current?.click()}
                style={{
                  padding: '10px 18px', borderRadius: '10px',
                  background: '#1A1A1A', border: '1px solid #333',
                  color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {ct.thumbnailChange}
              </button>
            </div>
          ) : (
            <button
              onClick={() => thumbnailInputRef.current?.click()}
              style={{
                width: '100%', padding: '20px',
                borderRadius: '14px',
                background: '#0A0A0A',
                border: '2px dashed #222',
                color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {ct.thumbnailBtn}
            </button>
          )}
        </div>

        {/* Buttons */}
        <button
          onClick={() => handleCreate(false)}
          disabled={!canProceed}
          style={{
            width: '100%', padding: '16px',
            background: canProceed
              ? 'linear-gradient(135deg, #00E5FF, #0091EA)'
              : '#1A1A1A',
            borderRadius: '14px', border: 'none',
            color: canProceed ? '#fff' : '#f0f0f0',
            fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
            cursor: canProceed ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: canProceed ? '0 8px 32px rgba(0,229,255,0.3)' : 'none',
            marginBottom: '12px',
          }}
        >
          {creating ? (
            <>
              <span style={{
                width: '18px', height: '18px',
                border: '2.5px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }} />
              {ct.creating}
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {ct.next}
            </>
          )}
        </button>

        <button
          onClick={() => handleCreate(true)}
          disabled={!canProceed || creating}
          style={{
            width: '100%', padding: '16px', marginBottom: '12px',
            background: 'transparent', borderRadius: '14px',
            border: canProceed ? '2px solid #00E5FF' : '1px solid #222',
            color: canProceed ? '#00E5FF' : '#888',
            fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
            cursor: canProceed ? 'pointer' : 'not-allowed',
          }}
        >
          {ct.goLiveNow}
        </button>

        {error && (
          <div style={{
            padding: '14px 16px', marginBottom: '12px',
            backgroundColor: 'rgba(0,229,255,0.1)',
            border: '1px solid rgba(0,229,255,0.3)',
            borderRadius: '12px',
          }}>
            <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#00E5FF', margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        <button
          onClick={() => navigate(-1)}
          style={{
            width: '100%', padding: '16px',
            background: 'transparent',
            borderRadius: '14px', border: '1px solid #222',
            color: '#f0f0f0', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ct.cancel}
        </button></>}

        {/* My Lives section */}
        {(myStreams.length > 0 || manageMode || !streamsLoading) && (
          <div style={{ marginTop: manageMode ? '0' : '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{
                fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, color: '#fff',
                margin: 0, letterSpacing: '0.5px',
              }}>
                {!manageMode && ct.myLives}
              </h2>
              {myStreams.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectionMode && (
                    <button
                      onClick={toggleSelectAll}
                      style={{
                        padding: '6px 12px', borderRadius: '8px',
                        background: 'transparent', border: '1px solid #333',
                        color: '#ccc', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {ct.selectAll}
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()) }}
                    style={{
                      padding: '6px 12px', borderRadius: '8px',
                      background: selectionMode ? 'rgba(0,229,255,0.1)' : 'transparent',
                      border: selectionMode ? '1px solid rgba(0,229,255,0.3)' : '1px solid #333',
                      color: selectionMode ? '#00E5FF' : '#ccc',
                      fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {selectionMode ? ct.cancel : ct.select}
                  </button>
                </div>
              )}
            </div>

            {streamsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div style={{
                  width: '32px', height: '32px', border: '3px solid #333',
                  borderTopColor: '#00E5FF', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              </div>
            ) : myStreams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0' }}>{ct.noLives}</p>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myStreams.map(stream => {
                const isLive = stream.status === 'live'
                const statusLabel = stream.status === 'live' ? ct.liveNow
                  : stream.status === 'scheduled' ? ct.scheduled
                  : ct.ended
                const statusColor = stream.status === 'live' ? '#E8344E'
                  : stream.status === 'scheduled' ? '#00E5FF'
                  : '#555'
                const isSelected = selectedIds.has(stream.id)

                return (
                  <div
                    key={stream.id}
                    onClick={selectionMode ? () => toggleSelectStream(stream.id) : undefined}
                    style={{
                      backgroundColor: '#111',
                      border: isSelected ? '1px solid #E8344E' : isLive ? '1px solid rgba(232,52,78,0.4)' : '1px solid #222',
                      borderRadius: '14px',
                      padding: '14px',
                      cursor: selectionMode ? 'pointer' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      {/* Selection checkbox */}
                      {selectionMode && (
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                          border: isSelected ? '2px solid #00E5FF' : '2px solid #444',
                          backgroundColor: isSelected ? '#00E5FF' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: '2px',
                        }}>
                          {isSelected && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 800,
                            color: statusColor,
                            backgroundColor: `${statusColor}15`,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            {isLive && (
                              <span style={{
                                display: 'inline-block',
                                width: '6px', height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#00E5FF',
                                marginInlineEnd: '4px',
                                animation: 'liveDot 1.5s ease infinite',
                              }} />
                            )}
                            {statusLabel}
                          </span>
                          <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
                            {itemsLabel(stream.item_count || 0)}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {stream.title}
                        </p>
                        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', margin: '2px 0 0' }}>
                          {stream.category ? i18nT(lang, stream.category as TranslationKey) || stream.category : ''} — {new Date(stream.created_at).toLocaleDateString(getLocale())}
                        </p>
                      </div>

                      {/* Actions (hidden in selection mode) */}
                      {!selectionMode && (
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {/* Edit — go to PrepareLivePage */}
                        <button
                          onClick={() => navigate(`/prepare-live/${stream.id}`)}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#1A1A1A',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {ct.edit}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteStream(stream.id)}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: 'rgba(232,52,78,0.1)',
                            border: '1px solid rgba(0,229,255,0.3)',
                            borderRadius: '8px',
                            color: '#00E5FF',
                            fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600,
                            cursor: 'pointer',
                            }}
                          >
                            {ct.delete}
                          </button>
                      </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk delete floating bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px 20px',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)) + 16px)',
          backgroundColor: '#111', borderTop: '1px solid #222',
          zIndex: 20,
        }}>
          <button
            onClick={handleBulkDelete}
            style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #0091EA, #c42040)',
              borderRadius: '14px', border: 'none',
              color: '#001014', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            {ct.deleteSelected} ({selectedIds.size})
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes liveDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmLabel={ct.confirmDelete || ct.delete}
        cancelLabel={ct.confirmCancel || ct.cancel}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
        danger
      />
    </div>
  )
}
