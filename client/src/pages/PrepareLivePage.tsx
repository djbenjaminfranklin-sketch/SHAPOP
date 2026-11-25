import { useState, useEffect, useRef, useCallback } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import PrePermissionModal from '../components/PrePermissionModal'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { tr, getLocale, getLang, type Localized } from '../lib/i18n'
import type { Item, Stream } from '../types/database'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatMoney, currencyForCountry, currencySymbol } from '../lib/fulfillment'

// Compress image to max 800px and JPEG quality 0.7
type BatchRow = { key: string; preview: string; imageUrl: string | null; title: string; price: string; status: 'uploading' | 'naming' | 'ready' | 'error' }

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

const pageContent = {
  en: {
    title: 'Prepare your live',
    addItem: 'Add an item',
    photosAi: 'Photos (AI)',
    photosAiTitle: 'Your items',
    photosAiHint: 'Take a photo of each item: the AI names it, you just add the price.',
    aiNaming: 'Naming…',
    aiNamingFailed: 'The AI couldn’t name these photos: type the names.',
    priceShort: 'Price',
    addAllItems: 'Add {n} items',
    addMorePhotos: 'Add photos',
    cancelBatch: 'Cancel',
    photoUploadFailed: 'Photo upload failed',
    photo: 'Photo',
    itemTitle: 'Item title',
    startingPrice: 'Starting price ({cur})',
    category: 'Category (optional)',
    add: 'Add',
    cancel: 'Cancel',
    goLive: 'Go live',
    noItems: 'Add at least one item to get started',
    lot: 'Lot',
    deleteConfirm: 'Delete this item?',
    delete: 'Delete',
    takePhoto: 'Take a photo',
    choosePhoto: 'Choose from gallery',
    saving: 'Saving...',
    itemOne: 'item',
    itemFew: 'items',
    items: 'items',
    duration: 'Time per item',
    seconds: 'sec',
    secShort: 's',
    sdShort: 'SD',
    sdTitle: 'Sudden death',
    durationHint: 'Bidding time for each item',
    quantity: 'Quantity',
    quantityHint: 'Each item gets its own unique code',
    generating: 'Creating items ({n})...',
    muxError: 'Video streaming setup failed. Viewers may not see your video.',
    minPrice: 'Minimum price (optional)',
    minShort: 'min',
    minPriceHint: 'If no bid reaches this price, the item stays unsold',
    buyNowPrice: 'Buy now price (optional)',
    buyNowHint: 'Lets buyers purchase instantly without bidding',
    csvUpload: 'Import CSV',
    csvImporting: 'Importing...',
    csvImported: 'Items imported: {n}',
    csvError: 'CSV error',
    csvEmpty: 'the file is empty',
    csvColumns: 'the "title" and "price" columns are required',
    csvNoValid: 'no valid items found',
    uploadFailed: 'Couldn’t upload the photo. Please try again.',
    createFailed: 'Couldn’t create the item. Please try again.',
    deleteStream: 'Delete this live',
    deleteStreamConfirm: 'Delete this live and all its items? This can’t be undone.',
    scheduledDate: 'Scheduled for',
    changeDate: 'Change date',
    saveDate: 'Save',
    deleteError: 'Couldn’t delete the live',
    confirmDelete: 'Delete',
    confirmCancel: 'Cancel',
    back: 'Back',
    cancelEdit: 'Cancel',
    moveUp: 'Move up',
    moveDown: 'Move down',
    deleteItem: 'Delete item',
    decreaseQty: 'Decrease quantity',
    increaseQty: 'Increase quantity',
    shippingDelay: 'Handover deadline',
    shippingDelayHint: 'With no code or photos in time, the order is cancelled and refunded',
    day: 'day',
    dayFew: 'days',
    days: 'days',
    weight: 'Weight (grams)',
    weightHint: 'Item weight (used for the suggested shipping price)',
    suggestedShipping: 'Suggested price',
    shippingOverride: 'Your shipping price for this item',
    shippingOverrideHint: 'Leave empty to use the price from your settings (or the suggested one)',
  },
  fr: {
    title: 'Préparer le live',
    addItem: 'Ajouter un article',
    photosAi: 'Photos (IA)',
    photosAiTitle: 'Tes articles',
    photosAiHint: 'Prends chaque article en photo : l’IA lui donne un nom, tu n’as plus qu’à mettre le prix.',
    aiNaming: 'L’IA cherche le nom…',
    aiNamingFailed: 'L’IA n’a pas pu nommer ces photos : écris les noms.',
    priceShort: 'Prix',
    addAllItems: 'Ajouter {n} articles',
    addMorePhotos: 'Ajouter des photos',
    cancelBatch: 'Annuler',
    photoUploadFailed: 'Échec de l’envoi de la photo',
    photo: 'Photo',
    itemTitle: 'Titre de l’article',
    startingPrice: 'Prix de départ ({cur})',
    category: 'Catégorie (facultatif)',
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
    itemOne: 'article',
    itemFew: 'articles',
    items: 'articles',
    duration: 'Durée par article',
    seconds: 'sec',
    secShort: 's',
    sdShort: 'MS',
    sdTitle: 'Mort subite',
    durationHint: 'Temps d’enchère pour chaque article',
    quantity: 'Quantité',
    quantityHint: 'Chaque article aura son propre code',
    generating: 'Création des articles ({n})...',
    muxError: 'La configuration du streaming vidéo a échoué. Les spectateurs risquent de ne pas voir ta vidéo.',
    minPrice: 'Prix minimum (facultatif)',
    minShort: 'min',
    minPriceHint: 'Si aucune enchère n’atteint ce prix, l’article reste invendu',
    buyNowPrice: 'Prix d’achat immédiat (facultatif)',
    buyNowHint: 'Permet d’acheter l’article sans enchérir',
    csvUpload: 'Importer un CSV',
    csvImporting: 'Import en cours...',
    csvImported: 'Articles importés : {n}',
    csvError: 'Erreur CSV',
    csvEmpty: 'le fichier est vide',
    csvColumns: 'les colonnes "title" et "price" sont obligatoires',
    csvNoValid: 'aucun article valide',
    uploadFailed: 'Impossible d’envoyer la photo. Réessaie.',
    createFailed: 'Impossible de créer l’article. Réessaie.',
    deleteStream: 'Supprimer ce live',
    deleteStreamConfirm: 'Supprimer ce live et tous ses articles ? Cette action est irréversible.',
    scheduledDate: 'Date prévue',
    changeDate: 'Modifier la date',
    saveDate: 'Enregistrer',
    deleteError: 'Échec de la suppression',
    confirmDelete: 'Supprimer',
    confirmCancel: 'Annuler',
    back: 'Retour',
    cancelEdit: 'Annuler',
    moveUp: 'Monter',
    moveDown: 'Descendre',
    deleteItem: 'Supprimer l’article',
    decreaseQty: 'Diminuer la quantité',
    increaseQty: 'Augmenter la quantité',
    shippingDelay: 'Délai de remise',
    shippingDelayHint: 'Sans code ni photos dans ce délai, la commande est annulée et remboursée',
    day: 'jour',
    dayFew: 'jours',
    days: 'jours',
    weight: 'Poids (grammes)',
    weightHint: 'Poids de l’article (sert au prix d’envoi suggéré)',
    suggestedShipping: 'Prix suggéré',
    shippingOverride: 'Ton prix d’envoi pour cet article',
    shippingOverrideHint: 'Laisse vide pour utiliser le prix de tes réglages (ou le prix suggéré)',
  },
  es: {
    title: 'Preparar el directo',
    addItem: 'Añadir un artículo',
    photosAi: 'Fotos (IA)',
    photosAiTitle: 'Tus artículos',
    photosAiHint: 'Haz una foto de cada artículo: la IA le pone nombre y tú solo añades el precio.',
    aiNaming: 'La IA busca el nombre…',
    aiNamingFailed: 'La IA no pudo nombrar estas fotos: escribe los nombres.',
    priceShort: 'Precio',
    addAllItems: 'Añadir {n} artículos',
    addMorePhotos: 'Añadir fotos',
    cancelBatch: 'Cancelar',
    photoUploadFailed: 'No se pudo subir la foto',
    photo: 'Foto',
    itemTitle: 'Título del artículo',
    startingPrice: 'Precio inicial ({cur})',
    category: 'Categoría (opcional)',
    add: 'Añadir',
    cancel: 'Cancelar',
    goLive: 'Empezar directo',
    noItems: 'Añade al menos un artículo para empezar',
    lot: 'Lote',
    deleteConfirm: '¿Eliminar este artículo?',
    delete: 'Eliminar',
    takePhoto: 'Hacer una foto',
    choosePhoto: 'Elegir de la galería',
    saving: 'Guardando...',
    itemOne: 'artículo',
    itemFew: 'artículos',
    items: 'artículos',
    duration: 'Duración por artículo',
    seconds: 'seg',
    secShort: 's',
    sdShort: 'MS',
    sdTitle: 'Muerte súbita',
    durationHint: 'Tiempo de puja para cada artículo',
    quantity: 'Cantidad',
    quantityHint: 'Cada artículo tendrá su propio código',
    generating: 'Creando artículos ({n})...',
    muxError: 'Ha fallado la configuración del vídeo en directo. Puede que los espectadores no vean tu vídeo.',
    minPrice: 'Precio mínimo (opcional)',
    minShort: 'mín.',
    minPriceHint: 'Si ninguna puja llega a este precio, el artículo queda sin vender',
    buyNowPrice: 'Precio de compra inmediata (opcional)',
    buyNowHint: 'Permite comprar al instante sin pujar',
    csvUpload: 'Importar CSV',
    csvImporting: 'Importando...',
    csvImported: 'Artículos importados: {n}',
    csvError: 'Error de CSV',
    csvEmpty: 'el archivo está vacío',
    csvColumns: 'las columnas "title" y "price" son obligatorias',
    csvNoValid: 'ningún artículo válido',
    uploadFailed: 'No se pudo subir la foto. Inténtalo de nuevo.',
    createFailed: 'No se pudo crear el artículo. Inténtalo de nuevo.',
    deleteStream: 'Eliminar este directo',
    deleteStreamConfirm: '¿Eliminar este directo y todos sus artículos? Esta acción no se puede deshacer.',
    scheduledDate: 'Fecha programada',
    changeDate: 'Cambiar fecha',
    saveDate: 'Guardar',
    deleteError: 'No se pudo eliminar',
    confirmDelete: 'Eliminar',
    confirmCancel: 'Cancelar',
    back: 'Volver',
    cancelEdit: 'Cancelar',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    deleteItem: 'Eliminar artículo',
    decreaseQty: 'Reducir cantidad',
    increaseQty: 'Aumentar cantidad',
    shippingDelay: 'Plazo de entrega',
    shippingDelayHint: 'Sin código ni fotos a tiempo, el pedido se cancela y se reembolsa',
    day: 'día',
    dayFew: 'días',
    days: 'días',
    weight: 'Peso (gramos)',
    weightHint: 'Peso del artículo (para el precio de envío sugerido)',
    suggestedShipping: 'Precio sugerido',
    shippingOverride: 'Tu precio de envío para este artículo',
    shippingOverrideHint: 'Déjalo vacío para usar el precio de tus ajustes (o el sugerido)',
  },
  ru: {
    title: 'Подготовка эфира',
    addItem: 'Добавить товар',
    photosAi: 'Фото (ИИ)',
    photosAiTitle: 'Твои товары',
    photosAiHint: 'Сфотографируй каждый товар: ИИ даст ему название, тебе останется указать цену.',
    aiNaming: 'ИИ подбирает название…',
    aiNamingFailed: 'ИИ не смог назвать эти фото: впиши названия.',
    priceShort: 'Цена',
    addAllItems: 'Добавить товары: {n}',
    addMorePhotos: 'Добавить фото',
    cancelBatch: 'Отмена',
    photoUploadFailed: 'Не удалось загрузить фото',
    photo: 'Фото',
    itemTitle: 'Название товара',
    startingPrice: 'Стартовая цена ({cur})',
    category: 'Категория (необязательно)',
    add: 'Добавить',
    cancel: 'Отмена',
    goLive: 'Начать эфир',
    noItems: 'Добавь хотя бы один товар, чтобы начать',
    lot: 'Лот',
    deleteConfirm: 'Удалить этот товар?',
    delete: 'Удалить',
    takePhoto: 'Сделать фото',
    choosePhoto: 'Выбрать из галереи',
    saving: 'Сохраняем...',
    itemOne: 'товар',
    itemFew: 'товара',
    items: 'товаров',
    duration: 'Время на товар',
    seconds: 'сек',
    secShort: 'с',
    sdShort: 'ВС',
    sdTitle: 'Внезапная смерть',
    durationHint: 'Время торгов для каждого товара',
    quantity: 'Количество',
    quantityHint: 'У каждого товара будет свой уникальный код',
    generating: 'Создаём товары ({n})...',
    muxError: 'Не удалось настроить видеотрансляцию. Зрители могут не увидеть твоё видео.',
    minPrice: 'Минимальная цена (необязательно)',
    minShort: 'мин.',
    minPriceHint: 'Если ни одна ставка не достигнет этой цены, товар останется непроданным',
    buyNowPrice: 'Цена «Купить сразу» (необязательно)',
    buyNowHint: 'Позволяет купить товар сразу, без торгов',
    csvUpload: 'Импорт CSV',
    csvImporting: 'Импортируем...',
    csvImported: 'Импортировано товаров: {n}',
    csvError: 'Ошибка CSV',
    csvEmpty: 'файл пустой',
    csvColumns: 'нужны столбцы "title" и "price"',
    csvNoValid: 'нет ни одного подходящего товара',
    uploadFailed: 'Не удалось загрузить фото. Попробуй ещё раз.',
    createFailed: 'Не удалось создать товар. Попробуй ещё раз.',
    deleteStream: 'Удалить этот эфир',
    deleteStreamConfirm: 'Удалить этот эфир и все его товары? Это действие нельзя отменить.',
    scheduledDate: 'Запланировано на',
    changeDate: 'Изменить дату',
    saveDate: 'Сохранить',
    deleteError: 'Не удалось удалить',
    confirmDelete: 'Удалить',
    confirmCancel: 'Отмена',
    back: 'Назад',
    cancelEdit: 'Отмена',
    moveUp: 'Поднять',
    moveDown: 'Опустить',
    deleteItem: 'Удалить товар',
    decreaseQty: 'Уменьшить количество',
    increaseQty: 'Увеличить количество',
    shippingDelay: 'Срок передачи',
    shippingDelayHint: 'Без кода или фото в срок заказ отменяется, деньги возвращаются',
    day: 'день',
    dayFew: 'дня',
    days: 'дней',
    weight: 'Вес (граммы)',
    weightHint: 'Вес товара (для рекомендуемой цены отправки)',
    suggestedShipping: 'Рекомендуемая цена',
    shippingOverride: 'Твоя цена отправки для этого товара',
    shippingOverrideHint: 'Оставь пустым, чтобы взять цену из настроек (или рекомендуемую)',
  },
  he: {
    title: 'הכנת השידור',
    addItem: 'הוספת פריט',
    photosAi: 'תמונות (AI)',
    photosAiTitle: 'הפריטים שלך',
    photosAiHint: 'מצלמים כל פריט: ה-AI נותן לו שם, ונשאר רק להוסיף מחיר.',
    aiNaming: 'ה-AI מחפש שם…',
    aiNamingFailed: 'ה-AI לא הצליח לתת שם לתמונות האלה: כתבו את השמות.',
    priceShort: 'מחיר',
    addAllItems: 'הוספת {n} פריטים',
    addMorePhotos: 'הוספת תמונות',
    cancelBatch: 'ביטול',
    photoUploadFailed: 'העלאת התמונה נכשלה',
    photo: 'תמונה',
    itemTitle: 'שם הפריט',
    startingPrice: 'מחיר פתיחה ({cur})',
    category: 'קטגוריה (לא חובה)',
    add: 'הוספה',
    cancel: 'ביטול',
    goLive: 'עולים לשידור חי',
    noItems: 'צריך להוסיף לפחות פריט אחד כדי להתחיל',
    lot: 'פריט',
    deleteConfirm: 'למחוק את הפריט?',
    delete: 'מחיקה',
    takePhoto: 'צילום תמונה',
    choosePhoto: 'בחירה מהגלריה',
    saving: 'שומרים...',
    itemOne: 'פריט',
    itemFew: 'פריטים',
    items: 'פריטים',
    duration: 'זמן לכל פריט',
    seconds: 'שנ׳',
    secShort: 'שנ׳',
    sdShort: 'מ״פ',
    sdTitle: 'מוות פתאומי',
    durationHint: 'זמן ההצעות לכל פריט',
    quantity: 'כמות',
    quantityHint: 'לכל פריט יהיה קוד ייחודי משלו',
    generating: 'יוצרים פריטים ({n})...',
    muxError: 'הגדרת שידור הווידאו נכשלה. ייתכן שהצופים לא יראו את הווידאו שלך.',
    minPrice: 'מחיר מינימום (לא חובה)',
    minShort: 'מינ׳',
    minPriceHint: 'אם אף הצעה לא תגיע למחיר הזה, הפריט לא יימכר',
    buyNowPrice: 'מחיר קנייה מיידית (לא חובה)',
    buyNowHint: 'מאפשר לקנות מיד בלי להציע',
    csvUpload: 'ייבוא CSV',
    csvImporting: 'מייבאים...',
    csvImported: 'יובאו פריטים: {n}',
    csvError: 'שגיאת CSV',
    csvEmpty: 'הקובץ ריק',
    csvColumns: 'חובה לכלול את העמודות "title" ו-"price"',
    csvNoValid: 'לא נמצאו פריטים תקינים',
    uploadFailed: 'העלאת התמונה נכשלה. אפשר לנסות שוב.',
    createFailed: 'יצירת הפריט נכשלה. אפשר לנסות שוב.',
    deleteStream: 'מחיקת השידור',
    deleteStreamConfirm: 'למחוק את השידור ואת כל הפריטים שלו? אי אפשר לבטל את הפעולה.',
    scheduledDate: 'מתוכנן ל',
    changeDate: 'שינוי תאריך',
    saveDate: 'שמירה',
    deleteError: 'המחיקה נכשלה',
    confirmDelete: 'מחיקה',
    confirmCancel: 'ביטול',
    back: 'חזרה',
    cancelEdit: 'ביטול',
    moveUp: 'הזזה למעלה',
    moveDown: 'הזזה למטה',
    deleteItem: 'מחיקת הפריט',
    decreaseQty: 'הקטנת הכמות',
    increaseQty: 'הגדלת הכמות',
    shippingDelay: 'זמן למסירה',
    shippingDelayHint: 'בלי קוד או תמונות בזמן, ההזמנה מבוטלת והכסף מוחזר',
    day: 'יום',
    dayFew: 'ימים',
    days: 'ימים',
    weight: 'משקל (גרם)',
    weightHint: 'משקל הפריט (לחישוב מחיר המשלוח המומלץ)',
    suggestedShipping: 'מחיר מומלץ',
    shippingOverride: 'מחיר המשלוח שלך לפריט הזה',
    shippingOverrideHint: 'אפשר להשאיר ריק כדי להשתמש במחיר מההגדרות (או במחיר המומלץ)',
  },
} satisfies Localized<Record<string, string>>

const cameraModalContent = {
  en: { title: 'Camera & microphone', desc: 'ShaPop needs your camera and microphone to go live', allow: 'Continue', skip: 'Not now' },
  fr: { title: 'Caméra et micro', desc: 'ShaPop a besoin de ta caméra et de ton micro pour les lives', allow: 'Continuer', skip: 'Plus tard' },
  es: { title: 'Cámara y micrófono', desc: 'ShaPop necesita tu cámara y tu micrófono para los directos', allow: 'Continuar', skip: 'Ahora no' },
  ru: { title: 'Камера и микрофон', desc: 'ShaPop нужны камера и микрофон для прямых эфиров', allow: 'Продолжить', skip: 'Не сейчас' },
  he: { title: 'מצלמה ומיקרופון', desc: 'ShaPop צריכה גישה למצלמה ולמיקרופון שלך לשידורים חיים', allow: 'המשך', skip: 'לא עכשיו' },
} satisfies Localized<{ title: string; desc: string; allow: string; skip: string }>

/** Forme plurielle selon la langue (le russe a 3 formes : 1 товар, 2 товара, 5 товаров). */
function plural(n: number, one: string, few: string, other: string): string {
  const cat = new Intl.PluralRules(getLocale()).select(n)
  return cat === 'one' ? one : cat === 'few' ? few : other
}

/** Poids lisible dans la langue courante (g / kg). */
function formatWeight(grams: number): string {
  const kg = grams >= 1000
  try {
    return new Intl.NumberFormat(getLocale(), {
      style: 'unit', unit: kg ? 'kilogram' : 'gram', unitDisplay: 'short', maximumFractionDigits: 1,
    }).format(kg ? grams / 1000 : grams)
  } catch {
    return kg ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g` // i18n-ignore (repli technique)
  }
}

interface SuggestedShipping {
  price: number
  currency: string
}

interface DraftItem {
  id?: string
  title: string
  starting_price: number
  min_price: number | null
  buy_now_price: number | null
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
  const { user, profile } = useAuth()
  const ct = tr(pageContent)
  // Devise du vendeur (pays de son profil) pour les prix affichés et saisis
  const sellerCurrency = currencyForCountry(profile?.country)
  const money = (n: number | string | null | undefined) => formatMoney(n, sellerCurrency)
  usePageTitle(ct.title)
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
  const [formBuyNowPrice, setFormBuyNowPrice] = useState('')
  const [csvImporting, setCsvImporting] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  // Photos de plusieurs articles d'un coup : l'IA propose un nom, le vendeur met le prix
  const photosInputRef = useRef<HTMLInputElement>(null)
  const [batch, setBatch] = useState<BatchRow[] | null>(null)
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchAiFailed, setBatchAiFailed] = useState(false)
  // Prix d'envoi par la poste suggéré (le vendeur fixe le sien, par article ou dans ses réglages)
  const [suggestedShipping, setSuggestedShipping] = useState<SuggestedShipping | null>(null)
  const [loadingShipping, setLoadingShipping] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null)
  const [shippingDelay, setShippingDelay] = useState(4)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const camContent = tr(cameraModalContent)

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
        .select('id, seller_id, title, description, category, tags, status, thumbnail_url, viewer_count, peak_viewers, engagement_score, avg_watch_time_seconds, total_reactions, scheduled_at, started_at, ended_at, city, community_id, mux_playback_id, created_at, livekit_room_name, recording_url')
        .eq('id', streamId)
        .single()
      if (data) {
        setStream(data as Stream)
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
          buy_now_price: item.buy_now_price || null,
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

  // Prix d'envoi suggéré selon le poids (pays du vendeur, module unique côté serveur)
  useEffect(() => {
    const weightNum = parseInt(formWeight, 10)
    if (!weightNum || weightNum <= 0) {
      setSuggestedShipping(null)
      return
    }
    setLoadingShipping(true)
    const controller = new AbortController()
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      return apiFetch(`/api/shipping/suggested?weight_grams=${weightNum}`, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    })
      .then(resp => resp.json())
      .then(data => {
        if (typeof data.price === 'number') setSuggestedShipping({ price: data.price, currency: data.currency })
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
          console.error('Upload error:', uploadError.message)
          setFormError(ct.uploadFailed)
          setSaving(false)
          return
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        imageUrls = [urlData.publicUrl]
      } catch (err) {
        console.error('Upload error:', err)
        setFormError(ct.uploadFailed)
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
      const buyNowPrice = formBuyNowPrice ? parseFloat(formBuyNowPrice) : null
      const { data, error } = await supabase
        .from('items')
        .insert({
          seller_id: user.id,
          stream_id: streamId,
          title,
          starting_price: price,
          current_price: price,
          min_price: (minPrice && minPrice > 0) ? minPrice : null,
          buy_now_price: (buyNowPrice && buyNowPrice > 0) ? buyNowPrice : null,
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
        setFormError(ct.createFailed)
        setSaving(false)
        return
      }
      if (data) {
        newItems.push({
          id: data.id,
          title: data.title,
          starting_price: data.starting_price,
          min_price: data.min_price || null,
          buy_now_price: data.buy_now_price || null,
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
    setFormBuyNowPrice('')
    setFormWeight('')
    setFormShippingOverride('')
    setSuggestedShipping(null)
    setShowForm(false)
    setSaving(false)
  }

  const updateRow = (key: string, patch: Partial<BatchRow>) =>
    setBatch(prev => prev ? prev.map(r => r.key === key ? { ...r, ...patch } : r) : prev)

  const handlePhotosPicked = async (fileList: FileList | null) => {
    if (!fileList || !user) return
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/')).slice(0, 30)
    if (files.length === 0) return
    const rows: BatchRow[] = files.map((f, i) => ({
      key: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      preview: URL.createObjectURL(f), imageUrl: null, title: '', price: '', status: 'uploading',
    }))
    setBatchAiFailed(false)
    setBatch(prev => [...(prev || []), ...rows])

    // 1) Envoi des photos (3 à la fois)
    const uploaded: { key: string; url: string }[] = []
    const queue = files.map((f, i) => ({ f, row: rows[i] }))
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        let done = false
        for (let attempt = 0; attempt < 3 && !done; attempt++) {
          try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 800 * attempt))
            const compressed = await compressImage(job.f)
            const filePath = `items/${user.id}/${Date.now()}-${job.row.key}.jpg`
            const { error } = await supabase.storage.from('avatars').upload(filePath, compressed, { contentType: 'image/jpeg', upsert: false })
            if (error) throw error
            const url = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl
            uploaded.push({ key: job.row.key, url })
            updateRow(job.row.key, { imageUrl: url, status: 'naming' })
            done = true
          } catch (err) {
            console.error('batch upload', err)
          }
        }
        if (!done) updateRow(job.row.key, { status: 'error' })
      }
    }
    await Promise.all([worker(), worker(), worker()])

    // 2) Noms proposés par l'IA (12 photos par appel)
    const { data: { session } } = await supabase.auth.getSession()
    for (let i = 0; i < uploaded.length; i += 12) {
      const chunk = uploaded.slice(i, i + 12)
      try {
        const resp = await apiFetch('/api/ai/name-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}) },
          body: JSON.stringify({ image_urls: chunk.map(c => c.url), lang: getLang() }),
        })
        const data = resp.ok ? await resp.json() : null
        const names: string[] = Array.isArray(data?.names) ? data.names : []
        if (names.length === 0) setBatchAiFailed(true)
        setBatch(prev => prev ? prev.map(r => {
          const idx = chunk.findIndex(c => c.key === r.key)
          if (idx < 0) return r
          return { ...r, title: r.title || names[idx] || '', status: 'ready' }
        }) : prev)
      } catch {
        setBatchAiFailed(true)
        setBatch(prev => prev ? prev.map(r => chunk.some(c => c.key === r.key) ? { ...r, status: 'ready' } : r) : prev)
      }
    }
  }

  const closeBatch = () => {
    batch?.forEach(r => URL.revokeObjectURL(r.preview))
    setBatch(null)
    setBatchAiFailed(false)
  }

  const batchReadyRows = (batch || []).filter(r => r.imageUrl && r.title.trim() && parseFloat(r.price.replace(',', '.')) > 0)
  const batchBusy = (batch || []).some(r => r.status === 'uploading' || r.status === 'naming')

  const handleAddBatch = async () => {
    if (!user || !streamId || batchReadyRows.length === 0) return
    setBatchSaving(true)
    const category = stream?.category || ''
    const newItems: DraftItem[] = []
    for (const r of batchReadyRows) {
      const price = parseFloat(r.price.replace(',', '.'))
      const title = `${r.title.trim()} [${generateUniqueCode()}]`
      const { data, error } = await supabase.from('items').insert({
        seller_id: user.id, stream_id: streamId, title,
        starting_price: price, current_price: price, category,
        status: 'draft' as const, image_urls: [r.imageUrl!], duration_seconds: 60,
      }).select().single()
      if (error || !data) { console.error('batch insert', error); continue }
      newItems.push({
        id: data.id, title: data.title, starting_price: data.starting_price,
        min_price: null, buy_now_price: null, category: data.category,
        image_url: r.imageUrl, lot_number: items.length + newItems.length + 1,
        duration_seconds: 60, weight_grams: null, seller_shipping_override: null,
      })
    }
    if (newItems.length > 0) setItems(prev => [...prev, ...newItems])
    const addedKeys = new Set(batchReadyRows.map(r => r.key))
    const remaining = (batch || []).filter(r => !addedKeys.has(r.key))
    batch?.filter(r => addedKeys.has(r.key)).forEach(r => URL.revokeObjectURL(r.preview))
    setBatch(remaining.length > 0 ? remaining : null)
    setBatchSaving(false)
  }

  const handleCsvImport = async (file: File) => {
    if (!user || !streamId) return
    setCsvImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { alert(`${ct.csvError} : ${ct.csvEmpty}`); setCsvImporting(false); return }

      // Parse header
      const header = lines[0].toLowerCase().split(/[;,]/).map(h => h.trim())
      const titleIdx = header.findIndex(h => h === 'title' || h === 'titre')
      const priceIdx = header.findIndex(h => h === 'price' || h === 'prix' || h === 'starting_price')
      if (titleIdx === -1 || priceIdx === -1) {
        alert(`${ct.csvError} : ${ct.csvColumns}`)
        setCsvImporting(false)
        return
      }
      const minPriceIdx = header.findIndex(h => h === 'min_price' || h === 'prix_min')
      const buyNowIdx = header.findIndex(h => h === 'buy_now' || h === 'buy_now_price' || h === 'achat_immediat')
      const categoryIdx = header.findIndex(h => h === 'category' || h === 'categorie')
      const durationIdx = header.findIndex(h => h === 'duration' || h === 'duree')
      const weightIdx = header.findIndex(h => h === 'weight' || h === 'poids')
      const qtyIdx = header.findIndex(h => h === 'qty' || h === 'quantity' || h === 'quantite')

      const newItems: DraftItem[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[;,]/).map(c => c.trim())
        const title = cols[titleIdx]
        const price = parseFloat(cols[priceIdx])
        if (!title || isNaN(price) || price <= 0) continue

        const minPrice = minPriceIdx >= 0 ? parseFloat(cols[minPriceIdx]) || null : null
        const buyNowPrice = buyNowIdx >= 0 ? parseFloat(cols[buyNowIdx]) || null : null
        const category = categoryIdx >= 0 ? (cols[categoryIdx] || 'other') : 'other'
        const duration = durationIdx >= 0 ? (parseInt(cols[durationIdx], 10) || 60) : 60
        const weightGrams = weightIdx >= 0 ? (parseInt(cols[weightIdx], 10) || null) : null
        const qty = qtyIdx >= 0 ? Math.max(1, Math.min(parseInt(cols[qtyIdx], 10) || 1, 50)) : 1

        for (let q = 0; q < qty; q++) {
          const itemTitle = qty > 1 ? `${title} #${q + 1}` : title
          const lotNumber = items.length + newItems.length + 1

          const { data, error } = await supabase
            .from('items')
            .insert({
              seller_id: user.id,
              stream_id: streamId,
              title: itemTitle,
              starting_price: price,
              current_price: price,
              min_price: (minPrice && minPrice > 0) ? minPrice : null,
              buy_now_price: (buyNowPrice && buyNowPrice > 0) ? buyNowPrice : null,
              category,
              status: 'draft' as const,
              duration_seconds: duration,
              weight_grams: (weightGrams && weightGrams > 0) ? weightGrams : null,
            })
            .select()
            .single()

          if (error) { console.error('CSV insert error:', error); continue }
          if (data) {
            newItems.push({
              id: data.id,
              title: data.title,
              starting_price: data.starting_price,
              min_price: data.min_price || null,
              buy_now_price: data.buy_now_price || null,
              category: data.category,
              image_url: null,
              lot_number: lotNumber,
              duration_seconds: duration,
              weight_grams: (weightGrams && weightGrams > 0) ? weightGrams : null,
              seller_shipping_override: null,
            })
          }
        }
      }

      if (newItems.length > 0) {
        setItems(prev => [...prev, ...newItems])
        alert(ct.csvImported.replace('{n}', String(newItems.length)))
      } else {
        alert(`${ct.csvError} : ${ct.csvNoValid}`)
      }
    } catch (err) {
      console.error('CSV import error:', err)
      alert(ct.csvError)
    }
    setCsvImporting(false)
    if (csvInputRef.current) csvInputRef.current.value = ''
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
          console.error('Delete stream error:', body.error)
          setDeleteError(ct.deleteError)
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

  const handleGoLiveClick = useCallback(() => {
    const alreadyShown = localStorage.getItem('shapop_camera_prepermission_shown')
    if (!alreadyShown) {
      setShowCameraModal(true)
      return
    }
    handleGoLive()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCameraModalDismiss = useCallback(() => {
    localStorage.setItem('shapop_camera_prepermission_shown', '1')
    setShowCameraModal(false)
    handleGoLive()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoLive = async () => {
    if (!streamId) return
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

    const { error: goLiveError } = await supabase
      .from('streams')
      .update({
        status: 'live' as const,
        started_at: new Date().toISOString(),
      })
      .eq('id', streamId)

    if (goLiveError) {
      console.error('[PrepareLive] go-live update failed:', goLiveError.message)
      alert(ct.muxError)
      return
    }

    navigate(`/live-seller/${streamId}`)
  }

  const formatLot = (n: number) => `#${String(n).padStart(3, '0')}`

  const canGoLive = !goingLive

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
            aria-label={ct.back}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}>
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
              {ct.title}
            </h1>
            {stream && (
              <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#888', margin: 0 }}>
                {stream.title} — {items.length} {plural(items.length, ct.itemOne, ct.itemFew, ct.items)}
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
                <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff' }}>
                  {ct.scheduledDate}: {stream.scheduled_at ? new Date(stream.scheduled_at).toLocaleString(getLocale()) : '—'}
                </span>
              </div>
              {!editingDate && (
                <button onClick={() => setEditingDate(true)} style={{
                  background: 'none', border: '1px solid #333', borderRadius: '8px',
                  padding: '4px 10px', color: '#F0908A', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
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
                    borderRadius: '8px', color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
                <button onClick={handleSaveDate} style={{
                  padding: '10px 16px', background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  border: 'none', borderRadius: '8px', color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                }}>
                  {ct.saveDate}
                </button>
                <button onClick={() => setEditingDate(false)} aria-label={ct.cancelEdit} style={{
                  padding: '10px 12px', background: '#222', border: 'none', borderRadius: '8px',
                  color: '#888', fontSize: 'calc(13px * var(--fs, 1))', cursor: 'pointer',
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff' }}>
                {ct.shippingDelay}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
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
                    fontSize: 'calc(12px * var(--fs, 1))',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {d} {plural(d, ct.day, ct.dayFew, ct.days)}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#666', margin: '6px 0 0 2px' }}>
              {ct.shippingDelayHint}
            </p>
          </div>

          {/* Delete stream button */}
          <button onClick={handleDeleteStream} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px', backgroundColor: 'rgba(232,52,78,0.08)', border: '1px solid rgba(232,52,78,0.2)',
            borderRadius: '12px', color: '#E8344E', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            {ct.deleteStream}
          </button>

          {deleteError && (
            <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#E8344E', margin: 0, textAlign: 'center' }}>{deleteError}</p>
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
            <p style={{ fontSize: 'calc(15px * var(--fs, 1))', color: '#888', textAlign: 'center' }}>
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
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                />
              ) : (
                <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 800, color: '#F0908A' }}>
                  {formatLot(item.lot_number)}
                </span>
              )}
            </div>

            {/* Item info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700, color: '#F0908A', opacity: 0.7 }}>
                  {formatLot(item.lot_number)}
                </span>
              </div>
              <p style={{
                fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: '2px 0 0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#F0908A' }}>
                  {money(item.starting_price)}
                </span>
                {item.min_price != null && item.min_price > 0 && (
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#F59E0B' }}>
                    {ct.minShort} {money(item.min_price)}
                  </span>
                )}
                {item.buy_now_price != null && item.buy_now_price > 0 && (
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#10B981', fontWeight: 600 }}>
                    ⚡ {money(item.buy_now_price)}
                  </span>
                )}
                {item.weight_grams != null && item.weight_grams > 0 && (
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#888' }}>
                    {formatWeight(item.weight_grams)}
                  </span>
                )}
                {item.seller_shipping_override != null && item.seller_shipping_override > 0 && (
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#F0908A', fontWeight: 600 }}>
                    {money(item.seller_shipping_override)}
                  </span>
                )}
                <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#666' }}>
                  {item.duration_seconds}{ct.secShort}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                aria-label={ct.moveUp}
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
                aria-label={ct.moveDown}
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
              aria-label={ct.deleteItem}
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
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#666' }}>{ct.photo}</span>
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
                color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
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
              placeholder={ct.startingPrice.replace('{cur}', currencySymbol(sellerCurrency))}
              min="0"
              step="1"
              style={{
                width: '100%', padding: '12px 14px',
                backgroundColor: '#0D0D0D',
                border: '1px solid #222',
                borderRadius: '10px',
                color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
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
                  color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#666', margin: '4px 0 0 4px' }}>
                {ct.minPriceHint}
              </p>
            </div>

            {/* Buy Now price (optional) */}
            <div style={{ marginBottom: '10px' }}>
              <input
                type="number"
                inputMode="decimal"
                value={formBuyNowPrice}
                onChange={e => setFormBuyNowPrice(e.target.value)}
                placeholder={ct.buyNowPrice}
                min="0"
                step="1"
                style={{
                  width: '100%', padding: '12px 14px',
                  backgroundColor: '#0D0D0D',
                  border: '1px solid #222',
                  borderRadius: '10px',
                  color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#666', margin: '4px 0 0 4px' }}>
                {ct.buyNowHint}
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
                  <p style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {ct.weight}
                  </p>
                </div>
                {formWeight && (
                  <span style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#F0908A' }}>
                    {formatWeight(parseInt(formWeight, 10) || 0)}
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
                  color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
                  outline: 'none', boxSizing: 'border-box',
                  marginBottom: '8px',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: formatWeight(100), value: 100 },
                  { label: formatWeight(250), value: 250 },
                  { label: formatWeight(500), value: 500 },
                  { label: formatWeight(1000), value: 1000 },
                  { label: formatWeight(2000), value: 2000 },
                  { label: formatWeight(5000), value: 5000 },
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
                      fontSize: 'calc(12px * var(--fs, 1))',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#666', margin: '6px 0 0 2px' }}>
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
                  <p style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {ct.shippingOverride}
                  </p>
                </div>

                {/* Suggested shipping price range */}
                {loadingShipping ? (
                  <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#888', margin: '0 0 8px 0' }}>...</p>
                ) : suggestedShipping && (
                  <div style={{
                    backgroundColor: 'rgba(240,144,138,0.08)',
                    border: '1px solid rgba(240,144,138,0.2)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '10px',
                  }}>
                    <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#F0908A', margin: 0, fontWeight: 600 }}>
                      {ct.suggestedShipping}: {formatMoney(suggestedShipping.price, suggestedShipping.currency)}
                    </p>
                  </div>
                )}

                {/* Override input */}
                <input
                  type="number"
                  inputMode="decimal"
                  value={formShippingOverride}
                  onChange={e => setFormShippingOverride(e.target.value)}
                  placeholder={suggestedShipping ? suggestedShipping.price.toFixed(2) : '0.00'}
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%', padding: '10px 12px',
                    backgroundColor: '#111',
                    border: '1px solid #222',
                    borderRadius: '8px',
                    color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
                    outline: 'none', boxSizing: 'border-box',
                    marginBottom: '6px',
                  }}
                />
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#666', margin: '0 0 0 2px' }}>
                  {ct.shippingOverrideHint}
                </p>

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
                color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
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
                <p style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {ct.duration}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#F0908A' }}>
                    {formDuration}
                  </span>
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#888' }}>{ct.seconds}</span>
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
                      fontSize: 'calc(12px * var(--fs, 1))',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {sec}{ct.secShort}
                  </button>
                ))}
                <button
                  onClick={() => setFormDuration(-1)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: '8px',
                    background: formDuration === -1
                      ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                      : '#111',
                    border: formDuration === -1 ? 'none' : '1px solid #222',
                    color: formDuration === -1 ? '#fff' : '#888',
                    fontSize: 'calc(12px * var(--fs, 1))',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {ct.sdShort}
                </button>
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
                  <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {ct.quantity}
                  </p>
                  {formQuantity > 1 && (
                    <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#F0908A', margin: '2px 0 0' }}>
                      {ct.quantityHint}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => setFormQuantity(q => Math.max(1, q - 1))}
                    aria-label={ct.decreaseQty}
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
                    fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff',
                    minWidth: '32px', textAlign: 'center',
                  }}>
                    {formQuantity}
                  </span>
                  <button
                    onClick={() => setFormQuantity(q => Math.min(99, q + 1))}
                    aria-label={ct.increaseQty}
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
                        fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
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
                <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#E8344E', margin: 0 }}>{formError}</p>
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
                  setSuggestedShipping(null)
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
                  color: '#888', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
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
                  fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
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

      {/* Photos (IA) : vérifier les noms et mettre les prix */}
      {batch && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, backgroundColor: '#000',
          display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top, 44px)',
        }}>
          <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid #1A1A1A' }}>
            <p style={{ margin: 0, fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>{ct.photosAiTitle}</p>
            <p style={{ margin: '4px 0 0', fontSize: 'calc(13px * var(--fs, 1))', color: '#999' }}>{ct.photosAiHint}</p>
            {batchAiFailed && (
              <p style={{ margin: '8px 0 0', fontSize: 'calc(13px * var(--fs, 1))', color: '#F59E0B' }}>{ct.aiNamingFailed}</p>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {batch.map(r => (
              <div key={r.key} style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#111', borderRadius: '14px', padding: '8px' }}>
                <img src={r.preview} alt="" style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, opacity: r.status === 'error' ? 0.4 : 1 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {r.status === 'error' ? (
                    <p style={{ margin: 0, fontSize: 'calc(13px * var(--fs, 1))', color: '#EF4444' }}>{ct.photoUploadFailed}</p>
                  ) : (
                    <input
                      value={r.title}
                      onChange={e => updateRow(r.key, { title: e.target.value })}
                      placeholder={r.status === 'ready' ? ct.itemTitle : ct.aiNaming}
                      maxLength={60}
                      style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#0A0A0A', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', boxSizing: 'border-box' }}
                    />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      value={r.price}
                      onChange={e => updateRow(r.key, { price: e.target.value.replace(/[^0-9.,]/g, '') })}
                      inputMode="decimal"
                      placeholder={ct.priceShort}
                      style={{ width: '110px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#0A0A0A', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                    <span style={{ color: '#999', fontSize: 'calc(14px * var(--fs, 1))' }}>{currencySymbol(sellerCurrency)}</span>
                  </div>
                </div>
                <button
                  onClick={() => { URL.revokeObjectURL(r.preview); setBatch(prev => { const n = (prev || []).filter(x => x.key !== r.key); return n.length > 0 ? n : null }) }}
                  aria-label={ct.cancelBatch}
                  style={{ background: 'transparent', border: 'none', color: '#777', fontSize: 'calc(22px * var(--fs, 1))', padding: '4px 8px', cursor: 'pointer' }}
                >×</button>
              </div>
            ))}
            <button
              onClick={() => photosInputRef.current?.click()}
              style={{ padding: '12px', borderRadius: '12px', border: '1px dashed #444', backgroundColor: 'transparent', color: '#F0908A', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer' }}
            >+ {ct.addMorePhotos}</button>
          </div>
          <div style={{ padding: '12px 16px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', borderTop: '1px solid #1A1A1A', display: 'flex', gap: '8px' }}>
            <button
              onClick={closeBatch}
              disabled={batchSaving}
              style={{ padding: '15px 18px', borderRadius: '14px', border: '1px solid #333', backgroundColor: '#111', color: '#ccc', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer' }}
            >{ct.cancelBatch}</button>
            <button
              onClick={handleAddBatch}
              disabled={batchSaving || batchReadyRows.length === 0}
              style={{
                flex: 1, padding: '15px', borderRadius: '14px', border: 'none',
                background: batchReadyRows.length > 0 ? 'linear-gradient(135deg, #E8344E 0%, #F0908A 100%)' : '#222',
                color: batchReadyRows.length > 0 ? '#fff' : '#666', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800,
                cursor: batchReadyRows.length > 0 ? 'pointer' : 'default', opacity: batchSaving ? 0.7 : 1,
              }}
            >{batchBusy && batchReadyRows.length === 0 ? ct.aiNaming : ct.addAllItems.replace('{n}', String(batchReadyRows.length))}</button>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div style={{
        padding: '16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
        borderTop: '1px solid #1A1A1A',
        display: 'flex', flexDirection: 'column', gap: '10px',
        flexShrink: 0,
      }}>
        {!showForm && (
          <>
          <button
            onClick={() => photosInputRef.current?.click()}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #E8344E 0%, #F0908A 100%)',
              border: 'none', borderRadius: '14px',
              color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800,
              cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {ct.photosAi}
          </button>
          <input
            ref={photosInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => { handlePhotosPicked(e.target.files); e.target.value = '' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                flex: 1, padding: '16px',
                backgroundColor: '#111',
                border: '1px solid #333',
                borderRadius: '14px',
                color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 600,
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
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={csvImporting}
              style={{
                padding: '16px',
                backgroundColor: '#111',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: '14px',
                color: '#8B5CF6', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700,
                cursor: csvImporting ? 'default' : 'pointer',
                opacity: csvImporting ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {csvImporting ? ct.csvImporting : ct.csvUpload}
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleCsvImport(file)
              }}
            />
          </div>
          </>
        )}

        <button
          onClick={handleGoLiveClick}
          disabled={!canGoLive}
          style={{
            width: '100%', padding: '18px',
            background: canGoLive
              ? 'linear-gradient(135deg, #E8344E 0%, #F0908A 50%, #E8344E 100%)'
              : 'rgba(255,255,255,0.06)',
            backgroundSize: '200% 100%',
            borderRadius: '16px', border: 'none',
            color: canGoLive ? '#fff' : 'rgba(255,255,255,0.25)',
            fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800,
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

      <PrePermissionModal
        open={showCameraModal}
        icon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
        title={camContent.title}
        description={camContent.desc}
        allowLabel={camContent.allow}
        skipLabel={camContent.skip}
        onAllow={handleCameraModalDismiss}
        onSkip={handleCameraModalDismiss}
      />
    </div>
  )
}
