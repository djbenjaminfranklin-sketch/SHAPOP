import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang, type Lang, type Localized } from '../lib/i18n'
import { formatMoney, currencyForCountry, currencySymbol } from '../lib/fulfillment'
import { showToast } from '../lib/toast'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type Step = 'upload' | 'analyzing' | 'results' | 'success'

interface AIResult {
  category: string
  title: string
  condition: string
  confidence: number
  tags: string[]
  priceLow: number
  priceHigh: number
  description: string
}

type AIText = Record<'title' | 'iaExpress' | 'takePhoto' | 'importGallery' | 'stepPhoto' | 'stepPhotoDesc' | 'stepAnalysis' | 'stepAnalysisDesc' | 'stepPublish' | 'stepPublishDesc' | 'aiAnalysisComplete' | 'confidence' | 'estimatedPrice' | 'priceBasedOn' | 'aiTags' | 'titleLabel' | 'categoryLabel' | 'conditionLabel' | 'startingPrice' | 'descriptionLabel' | 'generatedByAI' | 'createListing' | 'saving' | 'listingCreated' | 'listingError' | 'missingFields' | 'invalidPrice' | 'scanBarcode' | 'scanning' | 'barcodeFound' | 'barcodeNotFound' | 'lookingUp' | 'analysisFailed' | 'cameraUnavailable' | 'previewAlt' | 'scanningAlt' | 'itemAlt' | 'barcodePlaceholder' | 'ok', string> & {
  analysisSteps: string[]
  categories: string[]
  conditions: string[]
}

const content: Localized<AIText> = {
  en: {
    title: 'AI listing',
    iaExpress: 'AI Express',
    takePhoto: 'Take a photo',
    importGallery: 'or import from your gallery',
    stepPhoto: 'Photo',
    stepPhotoDesc: 'Take a photo',
    stepAnalysis: 'Analysis',
    stepAnalysisDesc: 'AI analyzes',
    stepPublish: 'Publish',
    stepPublishDesc: 'Confirm and sell',
    aiAnalysisComplete: 'AI analysis complete',
    confidence: 'Confidence',
    estimatedPrice: 'AI estimated price',
    priceBasedOn: 'Based on recent sales of similar items',
    aiTags: 'AI tags',
    titleLabel: 'Title',
    categoryLabel: 'Category',
    conditionLabel: 'Condition',
    startingPrice: 'Selling price',
    descriptionLabel: 'Description',
    generatedByAI: 'AI generated',
    createListing: 'Create listing',
    saving: 'Saving...',
    listingCreated: 'Listing created!',
    listingError: 'Couldn\'t create the listing. Please try again.',
    missingFields: 'Add a title and a category.',
    invalidPrice: 'Enter a valid price.',
    scanBarcode: 'Scan a barcode',
    scanning: 'Scan a barcode...',
    barcodeFound: 'Barcode detected',
    barcodeNotFound: 'No product found for this barcode',
    lookingUp: 'Looking up product...',
    analysisFailed: 'Analysis failed. Please try again.',
    cameraUnavailable: 'Camera not available',
    previewAlt: 'Preview',
    scanningAlt: 'Photo being analyzed',
    itemAlt: 'Item',
    barcodePlaceholder: 'EAN / UPC code',
    ok: 'OK',
    analysisSteps: ['Analyzing...', 'Detecting the item...', 'Identifying the brand...', 'Assessing condition...', 'Estimating price...', 'Generating tags...', 'Finishing up...'],
    categories: ['Sneakers', 'Women\'s fashion', 'Men\'s fashion', 'Bags', 'Jewelry', 'Watches', 'Tech', 'Gaming', 'Cards', 'Vintage', 'Art', 'Toys', 'Music', 'Sport', 'Photo'],
    conditions: ['New', 'Like new', 'Good condition', 'Fair'],
  },
  fr: {
    title: 'Annonce IA',
    iaExpress: 'IA Express',
    takePhoto: 'Prends une photo',
    importGallery: 'ou importe depuis ta galerie',
    stepPhoto: 'Photo',
    stepPhotoDesc: 'Prends une photo',
    stepAnalysis: 'Analyse',
    stepAnalysisDesc: 'L\'IA analyse',
    stepPublish: 'Publie',
    stepPublishDesc: 'Confirme et vends',
    aiAnalysisComplete: 'Analyse IA terminée',
    confidence: 'Confiance',
    estimatedPrice: 'Prix estimé par l\'IA',
    priceBasedOn: 'Basé sur les ventes récentes d\'articles similaires',
    aiTags: 'Tags IA',
    titleLabel: 'Titre',
    categoryLabel: 'Catégorie',
    conditionLabel: 'État',
    startingPrice: 'Prix de vente',
    descriptionLabel: 'Description',
    generatedByAI: 'Générée par IA',
    createListing: 'Créer l\'annonce',
    saving: 'Enregistrement...',
    listingCreated: 'Annonce créée !',
    listingError: 'Impossible de créer l\'annonce. Réessaie.',
    missingFields: 'Ajoute un titre et une catégorie.',
    invalidPrice: 'Saisis un prix valide.',
    scanBarcode: 'Scanner un code-barres',
    scanning: 'Scanne un code-barres...',
    barcodeFound: 'Code-barres détecté',
    barcodeNotFound: 'Aucun produit trouvé pour ce code',
    lookingUp: 'Recherche du produit...',
    analysisFailed: 'L\'analyse a échoué. Réessaie.',
    cameraUnavailable: 'Caméra indisponible',
    previewAlt: 'Aperçu',
    scanningAlt: 'Photo en cours d\'analyse',
    itemAlt: 'Article',
    barcodePlaceholder: 'Code EAN / UPC',
    ok: 'OK',
    analysisSteps: ['Analyse en cours...', 'Détection de l\'objet...', 'Identification de la marque...', 'Évaluation de l\'état...', 'Estimation du prix...', 'Génération des tags...', 'Finalisation...'],
    categories: ['Sneakers', 'Mode Femme', 'Mode Homme', 'Sacs', 'Bijoux', 'Montres', 'High-tech', 'Gaming', 'Cartes', 'Vintage', 'Art', 'Jouets', 'Musique', 'Sport', 'Photo'],
    conditions: ['Neuf', 'Comme neuf', 'Bon état', 'Correct'],
  },
  es: {
    title: 'Anuncio con IA',
    iaExpress: 'IA Express',
    takePhoto: 'Haz una foto',
    importGallery: 'o súbela desde tu galería',
    stepPhoto: 'Foto',
    stepPhotoDesc: 'Haz una foto',
    stepAnalysis: 'Análisis',
    stepAnalysisDesc: 'La IA analiza',
    stepPublish: 'Publica',
    stepPublishDesc: 'Confirma y vende',
    aiAnalysisComplete: 'Análisis de IA completado',
    confidence: 'Fiabilidad',
    estimatedPrice: 'Precio estimado por la IA',
    priceBasedOn: 'Basado en ventas recientes de artículos similares',
    aiTags: 'Etiquetas IA',
    titleLabel: 'Título',
    categoryLabel: 'Categoría',
    conditionLabel: 'Estado',
    startingPrice: 'Precio de venta',
    descriptionLabel: 'Descripción',
    generatedByAI: 'Generada por IA',
    createListing: 'Crear anuncio',
    saving: 'Guardando...',
    listingCreated: '¡Anuncio creado!',
    listingError: 'No se pudo crear el anuncio. Inténtalo de nuevo.',
    missingFields: 'Añade un título y una categoría.',
    invalidPrice: 'Introduce un precio válido.',
    scanBarcode: 'Escanear un código de barras',
    scanning: 'Escanea un código de barras...',
    barcodeFound: 'Código de barras detectado',
    barcodeNotFound: 'No se encontró ningún producto con este código',
    lookingUp: 'Buscando el producto...',
    analysisFailed: 'El análisis falló. Inténtalo de nuevo.',
    cameraUnavailable: 'Cámara no disponible',
    previewAlt: 'Vista previa',
    scanningAlt: 'Foto en análisis',
    itemAlt: 'Artículo',
    barcodePlaceholder: 'Código EAN / UPC',
    ok: 'OK',
    analysisSteps: ['Analizando...', 'Detectando el objeto...', 'Identificando la marca...', 'Evaluando el estado...', 'Estimando el precio...', 'Generando etiquetas...', 'Terminando...'],
    categories: ['Zapatillas', 'Moda mujer', 'Moda hombre', 'Bolsos', 'Joyería', 'Relojes', 'Tecnología', 'Gaming', 'Cartas', 'Vintage', 'Arte', 'Juguetes', 'Música', 'Deporte', 'Fotografía'],
    conditions: ['Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'],
  },
  ru: {
    title: 'Объявление с ИИ',
    iaExpress: 'ИИ Экспресс',
    takePhoto: 'Сделай фото',
    importGallery: 'или загрузи из галереи',
    stepPhoto: 'Фото',
    stepPhotoDesc: 'Сделай фото',
    stepAnalysis: 'Анализ',
    stepAnalysisDesc: 'ИИ анализирует',
    stepPublish: 'Публикация',
    stepPublishDesc: 'Подтверди и продавай',
    aiAnalysisComplete: 'Анализ ИИ завершён',
    confidence: 'Точность',
    estimatedPrice: 'Цена по оценке ИИ',
    priceBasedOn: 'На основе недавних продаж похожих товаров',
    aiTags: 'Теги ИИ',
    titleLabel: 'Название',
    categoryLabel: 'Категория',
    conditionLabel: 'Состояние',
    startingPrice: 'Цена продажи',
    descriptionLabel: 'Описание',
    generatedByAI: 'Создано ИИ',
    createListing: 'Создать объявление',
    saving: 'Сохранение...',
    listingCreated: 'Объявление создано!',
    listingError: 'Не удалось создать объявление. Попробуй ещё раз.',
    missingFields: 'Укажи название и категорию.',
    invalidPrice: 'Укажи корректную цену.',
    scanBarcode: 'Сканировать штрихкод',
    scanning: 'Наведи камеру на штрихкод...',
    barcodeFound: 'Штрихкод найден',
    barcodeNotFound: 'По этому штрихкоду ничего не найдено',
    lookingUp: 'Ищем товар...',
    analysisFailed: 'Не удалось выполнить анализ. Попробуй ещё раз.',
    cameraUnavailable: 'Камера недоступна',
    previewAlt: 'Предпросмотр',
    scanningAlt: 'Фото на анализе',
    itemAlt: 'Товар',
    barcodePlaceholder: 'Код EAN / UPC',
    ok: 'ОК',
    analysisSteps: ['Анализируем...', 'Распознаём предмет...', 'Определяем бренд...', 'Оцениваем состояние...', 'Оцениваем цену...', 'Подбираем теги...', 'Почти готово...'],
    categories: ['Кроссовки', 'Женская мода', 'Мужская мода', 'Сумки', 'Украшения', 'Часы', 'Техника', 'Гейминг', 'Карточки', 'Винтаж', 'Искусство', 'Игрушки', 'Музыка', 'Спорт', 'Фото'],
    conditions: ['Новое', 'Как новое', 'Хорошее', 'Удовлетворительное'],
  },
  he: {
    title: 'מודעה עם AI',
    iaExpress: 'AI אקספרס',
    takePhoto: 'צלמו תמונה',
    importGallery: 'או העלו מהגלריה',
    stepPhoto: 'תמונה',
    stepPhotoDesc: 'צלמו תמונה',
    stepAnalysis: 'ניתוח',
    stepAnalysisDesc: 'ה-AI מנתח',
    stepPublish: 'פרסום',
    stepPublishDesc: 'אשרו ומכרו',
    aiAnalysisComplete: 'ניתוח ה-AI הושלם',
    confidence: 'רמת ביטחון',
    estimatedPrice: 'מחיר משוער לפי AI',
    priceBasedOn: 'מבוסס על מכירות אחרונות של פריטים דומים',
    aiTags: 'תגיות AI',
    titleLabel: 'כותרת',
    categoryLabel: 'קטגוריה',
    conditionLabel: 'מצב',
    startingPrice: 'מחיר מכירה',
    descriptionLabel: 'תיאור',
    generatedByAI: 'נוצר ב-AI',
    createListing: 'יצירת מודעה',
    saving: 'שומר...',
    listingCreated: 'המודעה נוצרה!',
    listingError: 'לא הצלחנו ליצור את המודעה. נסו שוב.',
    missingFields: 'הוסיפו כותרת וקטגוריה.',
    invalidPrice: 'הזינו מחיר תקין.',
    scanBarcode: 'סריקת ברקוד',
    scanning: 'סרקו ברקוד...',
    barcodeFound: 'הברקוד זוהה',
    barcodeNotFound: 'לא נמצא מוצר לברקוד הזה',
    lookingUp: 'מחפש את המוצר...',
    analysisFailed: 'הניתוח נכשל. נסו שוב.',
    cameraUnavailable: 'המצלמה לא זמינה',
    previewAlt: 'תצוגה מקדימה',
    scanningAlt: 'תמונה בניתוח',
    itemAlt: 'פריט',
    barcodePlaceholder: 'קוד EAN / UPC',
    ok: 'אישור',
    analysisSteps: ['מנתח...', 'מזהה את הפריט...', 'מזהה את המותג...', 'מעריך את המצב...', 'מעריך מחיר...', 'יוצר תגיות...', 'מסיים...'],
    categories: ['סניקרס', 'אופנת נשים', 'אופנת גברים', 'תיקים', 'תכשיטים', 'שעונים', 'טכנולוגיה', 'גיימינג', 'קלפים', 'וינטג׳', 'אמנות', 'צעצועים', 'מוזיקה', 'ספורט', 'צילום'],
    conditions: ['חדש', 'כמו חדש', 'מצב טוב', 'סביר'],
  },
}

// Valeurs ENREGISTRÉES (codes français fixes, aussi renvoyés par analyze-image) : ne pas traduire.
const categoriesFr = [ // i18n-ignore (codes enregistrés)
  'Sneakers', 'Mode Femme', 'Mode Homme', 'Sacs', 'Bijoux',
  'Montres', 'High-tech', 'Gaming', 'Cartes', 'Vintage',
  'Art', 'Jouets', 'Musique', 'Sport', 'Photo',
]

const conditionsFr = ['Neuf', 'Comme neuf', 'Bon etat', 'Correct'] // i18n-ignore (codes enregistrés)

export default function AIListingPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang: Lang = getLang()
  const t = content[lang] ?? content.en
  // Devise du vendeur : sert à l'estimation de l'IA et au champ de prix.
  const currency = currencyForCountry(profile?.country)
  usePageTitle(t.title)

  // Block non-sellers
  useEffect(() => {
    if (profile && !profile.is_seller) {
      navigate('/dashboard', { replace: true })
    }
  }, [profile, navigate])
  const analysisSteps = t.analysisSteps
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analysisText, setAnalysisText] = useState(analysisSteps[0])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [aiResult, setAiResult] = useState<AIResult | null>(null)

  // Editable fields
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editCondition, setEditCondition] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])

  // Save state
  const [saving, setSaving] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  // Barcode scanning
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [barcodeStatus, setBarcodeStatus] = useState<string>('')
  const barcodeVideoRef = useRef<HTMLVideoElement>(null)
  const barcodeStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    setTimeout(() => setMounted(true), 80)
  }, [])

  const imageDataRef = useRef<string | null>(null)
  const imageFileRef = useRef<File | null>(null)

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Revoke old blob URL before creating new one
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    imageFileRef.current = file
    setImagePreview(URL.createObjectURL(file))
    // Still need data URL for the AI analysis edge function
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      imageDataRef.current = dataUrl
      startAnalysis(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const startAnalysis = async (imageData: string) => {
    setStep('analyzing')
    setAnalysisProgress(0)
    setAnalysisText(analysisSteps[0])
    setAnalysisError('')

    // Start the progress animation (runs while API call happens)
    let currentStep = 0
    let animDone = false
    const animInterval = setInterval(() => {
      currentStep++
      if (currentStep < analysisSteps.length - 1) {
        setAnalysisText(analysisSteps[currentStep])
        setAnalysisProgress(Math.round((currentStep / analysisSteps.length) * 100))
      } else if (!animDone) {
        // Hold at the last step before "Finalisation"
        animDone = true
        setAnalysisText(analysisSteps[analysisSteps.length - 2])
        setAnalysisProgress(85)
        clearInterval(animInterval)
      }
    }, 600)

    try {
      // Call the Supabase Edge Function for real AI analysis
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { image: imageData, lang: getLang(), currency },
      })

      clearInterval(animInterval)

      if (error || !data || data.error) {
        handleAnalysisError()
        return
      }

      // Real AI result
      setAnalysisText(analysisSteps[analysisSteps.length - 1])
      setAnalysisProgress(100)

      const result: AIResult = {
        category: data.category,
        title: data.title,
        condition: data.condition,
        confidence: data.confidence,
        tags: data.tags,
        priceLow: data.priceLow,
        priceHigh: data.priceHigh,
        description: data.description,
      }

      applyResult(result)
    } catch {
      clearInterval(animInterval)
      handleAnalysisError()
    }
  }

  const handleAnalysisError = () => {
    setAnalysisError(t.analysisFailed)
    setStep('upload')
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
  }

  const applyResult = (result: AIResult) => {
    setAiResult(result)
    setEditTitle(result.title)
    setEditCategory(result.category)
    setEditCondition(result.condition)
    setEditPrice(String(Math.round((result.priceLow + result.priceHigh) / 2)))
    setEditDescription(result.description)
    setEditTags(result.tags)

    setTimeout(() => {
      setStep('results')
      setTimeout(() => setShowResults(true), 100)
    }, 400)
  }

  const handleSubmit = async () => {
    if (!user || !aiResult) return
    setSaving(true)

    try {
      // Upload image to Supabase Storage instead of storing base64 in DB
      let imageUrls: string[] = []
      const file = imageFileRef.current
      if (file) {
        const ext = file.name.split('.').pop() || 'jpg'
        const filePath = `items/${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { contentType: file.type, upsert: false })
        if (uploadError) {
          showToast(t.listingError, 'error')
          setSaving(false)
          return
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        imageUrls = [urlData.publicUrl]
      }

      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) {
        showToast(t.listingError, 'error')
        setSaving(false)
        return
      }

      const resp = await apiFetch('/api/items/create-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          category: editCategory,
          starting_price: parseFloat(editPrice) || 0,
          image_urls: imageUrls,
          ai_generated: true,
          ai_tags: editTags,
          ai_condition: editCondition,
          ai_confidence: aiResult.confidence > 1 ? aiResult.confidence / 100 : aiResult.confidence,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        console.error('Create listing error:', err)
        const code = String(err?.error || '')
        showToast(code.startsWith('Missing required fields') ? t.missingFields
          : code.startsWith('Price ') ? t.invalidPrice
          : t.listingError, 'error')
        setSaving(false)
        return
      }

      showToast(t.listingCreated)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1200)
    } catch {
      showToast(t.listingError, 'error')
      setSaving(false)
    }
  }

  const removeTag = (index: number) => {
    setEditTags(prev => prev.filter((_, i) => i !== index))
  }

  // ============== BARCODE SCANNING ==============

  const stopBarcodeScanner = () => {
    if (barcodeStreamRef.current) {
      barcodeStreamRef.current.getTracks().forEach(track => track.stop())
      barcodeStreamRef.current = null
    }
    setShowBarcodeScanner(false)
    setBarcodeStatus('')
  }

  const startBarcodeScanner = async () => {
    setShowBarcodeScanner(true)
    setBarcodeStatus(t.scanning)
    setAnalysisError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      barcodeStreamRef.current = stream

      // Wait for video element to be mounted
      await new Promise(r => setTimeout(r, 100))
      const video = barcodeVideoRef.current
      if (!video) { stopBarcodeScanner(); return }
      video.srcObject = stream
      await video.play()

      // Use BarcodeDetector API if available (Chrome/Android/iOS 16+)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BarcodeDetectorClass = (window as unknown as Record<string, unknown>).BarcodeDetector as (new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }) | undefined
      if (BarcodeDetectorClass) {
        const detector = new BarcodeDetectorClass({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] })
        let scanning = true

        const scan = async () => {
          if (!scanning || !barcodeStreamRef.current) return
          try {
            const barcodes = await detector.detect(video)
            if (barcodes.length > 0) {
              scanning = false
              const code = barcodes[0].rawValue
              await handleBarcodeDetected(code)
              return
            }
          } catch { /* ignore detection errors */ }
          if (scanning) requestAnimationFrame(scan)
        }
        requestAnimationFrame(scan)
      } else {
        // Fallback: prompt user to enter barcode manually
        setBarcodeStatus(t.scanning)
      }
    } catch {
      stopBarcodeScanner()
      setAnalysisError(t.cameraUnavailable)
    }
  }

  const handleBarcodeDetected = async (barcode: string) => {
    setBarcodeStatus(t.lookingUp)

    try {
      // Lookup product via Open Food Facts API (free, no key needed)
      const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
      const data = await resp.json()

      if (data.status === 1 && data.product) {
        const product = data.product
        stopBarcodeScanner()

        // Auto-fill the listing form
        const result: AIResult = {
          title: product.product_name || product.generic_name || barcode,
          category: guessCategory(product.categories_tags || []),
          condition: conditionsFr[0],
          confidence: 0.7,
          tags: (product.brands_tags || []).slice(0, 5),
          priceLow: 1,
          priceHigh: 20,
          description: [product.product_name, product.brands, product.quantity].filter(Boolean).join(' — '),
        }

        // If product has an image, use it
        if (product.image_url) {
          setImagePreview(product.image_url)
        }

        applyResult(result)
        return
      }

      // Try UPC lookup via UPC Item DB (free)
      const upcResp = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`)
      const upcData = await upcResp.json()

      if (upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0]
        stopBarcodeScanner()

        const result: AIResult = {
          title: item.title || barcode,
          category: guessCategory([item.category || '']),
          condition: conditionsFr[0],
          confidence: 0.7,
          tags: [item.brand].filter(Boolean),
          priceLow: Math.max(1, Math.floor((item.lowest_recorded_price || 5) * 0.5)),
          priceHigh: Math.max(5, Math.floor((item.highest_recorded_price || 20) * 0.8)),
          description: item.description || item.title || '',
        }

        if (item.images && item.images.length > 0) {
          setImagePreview(item.images[0])
        }

        applyResult(result)
        return
      }

      // No product found
      stopBarcodeScanner()
      setAnalysisError(`${t.barcodeNotFound} (${barcode})`)
    } catch {
      stopBarcodeScanner()
      setAnalysisError(t.barcodeNotFound)
    }
  }

  const guessCategory = (tags: string[]): string => {
    const joined = tags.join(' ').toLowerCase()
    if (joined.includes('shoe') || joined.includes('sneaker') || joined.includes('chaussure')) return 'Sneakers'
    if (joined.includes('tech') || joined.includes('electro') || joined.includes('phone')) return 'High-tech'
    if (joined.includes('game') || joined.includes('jeu')) return 'Gaming'
    if (joined.includes('card') || joined.includes('carte')) return 'Cartes'
    if (joined.includes('watch') || joined.includes('montre')) return 'Montres'
    if (joined.includes('jewel') || joined.includes('bijou')) return 'Bijoux'
    if (joined.includes('bag') || joined.includes('sac')) return 'Sacs'
    if (joined.includes('sport')) return 'Sport'
    if (joined.includes('music') || joined.includes('musique')) return 'Musique'
    if (joined.includes('toy') || joined.includes('jouet')) return 'Jouets'
    if (joined.includes('art')) return 'Art'
    if (joined.includes('vintage')) return 'Vintage'
    return categoriesFr[0]
  }

  // Cleanup barcode scanner on unmount
  useEffect(() => {
    return () => {
      if (barcodeStreamRef.current) {
        barcodeStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // ============== RENDERERS ==============

  const renderUploadStep = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, padding: '24px',
      opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.6s ease',
    }}>
      {analysisError && (
        <div style={{
          backgroundColor: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)',
          borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
          color: '#00E5FF', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 500, textAlign: 'center',
          width: '100%', maxWidth: '340px',
        }}>
          {analysisError}
        </div>
      )}
      {/* AI badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 18px', borderRadius: '100px',
        background: 'linear-gradient(135deg, rgba(0, 229, 255,0.15), rgba(0,229,255,0.1))',
        border: '1px solid rgba(0, 229, 255,0.25)',
        marginBottom: '28px',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#00E5FF" stroke="#00E5FF" strokeWidth="1"/>
        </svg>
        <span style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF' }}>
          {t.iaExpress}
        </span>
      </div>

      {/* Upload area */}
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: '100%', maxWidth: '340px', aspectRatio: '1',
          borderRadius: '24px',
          border: '2px dashed rgba(0, 229, 255,0.4)',
          background: 'linear-gradient(180deg, rgba(0, 229, 255,0.06) 0%, rgba(0,229,255,0.03) 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', gap: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {imagePreview ? (
          <img
            src={imagePreview}
            alt={t.previewAlt}
            loading="lazy"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', borderRadius: '22px',
            }}
          />
        ) : (
          <>
            {/* Camera icon */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0, 229, 255,0.25)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                {t.takePhoto}
              </p>
              <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', lineHeight: '1.4' }}>
                {t.importGallery}
              </p>
            </div>

            {/* Decorative scan lines */}
            <div style={{
              position: 'absolute', top: '20px', left: '20px', // i18n-ignore (coin du cadre de visée, symétrique)
              width: '30px', height: '30px',
              borderTop: '2px solid rgba(0, 229, 255,0.5)',
              borderLeft: '2px solid rgba(0, 229, 255,0.5)', // i18n-ignore (coin du cadre de visée, symétrique)
              borderRadius: '4px 0 0 0',
            }} />
            <div style={{
              position: 'absolute', top: '20px', right: '20px', // i18n-ignore (coin du cadre de visée, symétrique)
              width: '30px', height: '30px',
              borderTop: '2px solid rgba(0, 229, 255,0.5)',
              borderRight: '2px solid rgba(0, 229, 255,0.5)', // i18n-ignore (coin du cadre de visée, symétrique)
              borderRadius: '0 4px 0 0',
            }} />
            <div style={{
              position: 'absolute', bottom: '20px', left: '20px', // i18n-ignore (coin du cadre de visée, symétrique)
              width: '30px', height: '30px',
              borderBottom: '2px solid rgba(0, 229, 255,0.5)',
              borderLeft: '2px solid rgba(0, 229, 255,0.5)', // i18n-ignore (coin du cadre de visée, symétrique)
              borderRadius: '0 0 0 4px',
            }} />
            <div style={{
              position: 'absolute', bottom: '20px', right: '20px', // i18n-ignore (coin du cadre de visée, symétrique)
              width: '30px', height: '30px',
              borderBottom: '2px solid rgba(0, 229, 255,0.5)',
              borderRight: '2px solid rgba(0, 229, 255,0.5)', // i18n-ignore (coin du cadre de visée, symétrique)
              borderRadius: '0 0 4px 0',
            }} />
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Barcode scan button */}
      <button
        onClick={startBarcodeScanner}
        style={{
          width: '100%', maxWidth: '340px', marginTop: '16px',
          padding: '14px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
          border: 'none', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
          <line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="8" x2="9" y2="8"/><line x1="15" y1="8" x2="17" y2="8"/><line x1="7" y1="16" x2="10" y2="16"/><line x1="14" y1="16" x2="17" y2="16"/>
        </svg>
        {t.scanBarcode}
      </button>

      {/* Info cards */}
      <div style={{
        display: 'flex', gap: '10px', marginTop: '28px', width: '100%', maxWidth: '340px',
      }}>
        {[
          { icon: '1', label: t.stepPhoto, desc: t.stepPhotoDesc },
          { icon: '2', label: t.stepAnalysis, desc: t.stepAnalysisDesc },
          { icon: '3', label: t.stepPublish, desc: t.stepPublishDesc },
        ].map((item, i) => (
          <div key={item.icon} style={{
            flex: 1, padding: '12px 8px', borderRadius: '14px',
            backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
            textAlign: 'center',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: `all 0.5s ease ${0.3 + i * 0.1}s`,
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 8px',
              background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 800, color: '#001014',
            }}>
              {item.icon}
            </div>
            <p style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
              {item.label}
            </p>
            <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderAnalysisStep = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, padding: '24px', gap: '28px',
    }}>
      {/* Image being scanned */}
      <div style={{
        width: '200px', height: '200px', borderRadius: '24px',
        overflow: 'hidden', position: 'relative',
      }}>
        {imagePreview && (
          <img
            src={imagePreview}
            alt={t.scanningAlt}
            loading="lazy"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
            }}
          />
        )}
        {/* Scanning overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0, 229, 255,0.15) 50%, transparent 100%)',
          animation: 'scanMove 1.5s ease-in-out infinite',
        }} />
        {/* Corner markers */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '24px', height: '24px', borderTop: '3px solid #00E5FF', borderLeft: '3px solid #00E5FF', borderRadius: '4px 0 0 0' }} />{/* i18n-ignore (coin du cadre de visée, symétrique) */}
        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '24px', height: '24px', borderTop: '3px solid #00E5FF', borderRight: '3px solid #00E5FF', borderRadius: '0 4px 0 0' }} />{/* i18n-ignore (coin du cadre de visée, symétrique) */}
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '24px', height: '24px', borderBottom: '3px solid #00E5FF', borderLeft: '3px solid #00E5FF', borderRadius: '0 0 0 4px' }} />{/* i18n-ignore (coin du cadre de visée, symétrique) */}
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '24px', height: '24px', borderBottom: '3px solid #00E5FF', borderRight: '3px solid #00E5FF', borderRadius: '0 0 4px 0' }} />{/* i18n-ignore (coin du cadre de visée, symétrique) */}
        {/* Pulsing border */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '24px',
          border: '2px solid rgba(0, 229, 255,0.5)',
          animation: 'pulseBorder 1.5s ease-in-out infinite',
        }} />
      </div>

      {/* AI processing indicator */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
        width: '100%', maxWidth: '300px',
      }}>
        {/* Sparkle icon with rotation */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(0, 229, 255,0.2), rgba(0,229,255,0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'sparkleRotate 2s linear infinite',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#00E5FF"/>
          </svg>
        </div>

        {/* Status text */}
        <p style={{
          fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#fff',
          textAlign: 'center', minHeight: '24px',
        }}>
          {analysisText}
        </p>

        {/* Progress bar */}
        <div style={{
          width: '100%', height: '6px', borderRadius: '3px',
          backgroundColor: '#1A1A1A', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            background: 'linear-gradient(90deg, #00E5FF, #0091EA)',
            width: `${analysisProgress}%`,
            transition: 'width 0.3s ease',
            boxShadow: '0 0 12px rgba(0, 229, 255,0.4)',
          }} />
        </div>

        {/* Progress text */}
        <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0' }}>
          {analysisProgress}%
        </p>

        {/* Animated dots */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <div key={`dot-${i}`} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#00E5FF',
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )

  const renderResultsStep = () => {
    if (!aiResult) return null

    return (
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0 16px', paddingBottom: 'calc(180px + env(safe-area-inset-bottom, 0px))',
        opacity: showResults ? 1 : 0,
        transform: showResults ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease',
      }}>
        {/* AI confidence banner */}
        <div style={{
          padding: '16px', borderRadius: '16px', marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(0, 229, 255,0.12), rgba(0,229,255,0.06))',
          border: '1px solid rgba(0, 229, 255,0.2)',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {imagePreview && (
              <img
                src={imagePreview}
                alt={t.itemAlt}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#00E5FF"/>
              </svg>
              <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF' }}>
                {t.aiAnalysisComplete}
              </span>
            </div>
            <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0' }}>
              {t.confidence}: <span style={{ color: '#00E5FF', fontWeight: 700 }}>{aiResult.confidence}%</span>
            </p>
          </div>
          <div style={{
            padding: '8px 14px', borderRadius: '12px',
            backgroundColor: 'rgba(0,229,255,0.1)',
            border: '1px solid rgba(0,229,255,0.2)',
          }}>
            <span style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF' }}>
              {aiResult.confidence}%
            </span>
          </div>
        </div>

        {/* Price estimate card */}
        <div style={{
          padding: '16px', borderRadius: '16px', marginBottom: '20px',
          background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-20px', insetInlineEnd: '-20px',
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }} />
          <p style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0', marginBottom: '4px' }}>
            {t.estimatedPrice}
          </p>
          <p style={{ fontSize: 'calc(28px * var(--fs, 1))', fontWeight: 900, color: '#fff', marginBottom: '2px' }}>
            {formatMoney(aiResult.priceLow, currency)} – {formatMoney(aiResult.priceHigh, currency)}
          </p>
          <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
            {t.priceBasedOn}
          </p>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0', marginBottom: '10px', display: 'block' }}>
            {t.aiTags}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {editTags.map((tag, i) => (
              <div key={tag} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '100px',
                backgroundColor: 'rgba(0, 229, 255,0.1)',
                border: '1px solid rgba(0, 229, 255,0.25)',
              }}>
                <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#00E5FF', fontWeight: 600 }}>
                  #{tag}
                </span>
                <button
                  onClick={() => removeTag(i)}
                  style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    backgroundColor: 'rgba(0, 229, 255,0.2)',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0', marginBottom: '8px', display: 'block' }}>
              {t.titleLabel}
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
                color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0', marginBottom: '8px', display: 'block' }}>
              {t.categoryLabel}
            </label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
                color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
                outline: 'none', appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'8\' viewBox=\'0 0 12 8\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1L6 6L11 1\' stroke=\'%23666\' stroke-width=\'2\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: lang === 'he' ? 'left 16px center' : 'right 16px center', // i18n-ignore (flèche du menu)
                boxSizing: 'border-box',
              }}
            >
              {t.categories.map((cat, idx) => (
                <option key={cat} value={categoriesFr[idx]} style={{ backgroundColor: '#0D0D0D' }}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0', marginBottom: '8px', display: 'block' }}>
              {t.conditionLabel}
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {t.conditions.map((cond, idx) => (
                <button
                  key={cond}
                  onClick={() => setEditCondition(conditionsFr[idx])}
                  style={{
                    padding: '10px 18px', borderRadius: '12px',
                    cursor: 'pointer', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                    backgroundColor: editCondition === conditionsFr[idx] ? 'rgba(0, 229, 255,0.15)' : '#0D0D0D',
                    border: editCondition === conditionsFr[idx] ? '1px solid rgba(0, 229, 255,0.4)' : '1px solid #1A1A1A',
                    color: editCondition === conditionsFr[idx] ? '#00E5FF' : '#f0f0f0',
                  }}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <label style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0', marginBottom: '8px', display: 'block' }}>
              {t.startingPrice}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                inputMode="decimal"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                style={{
                  width: '100%', paddingBlock: '14px', paddingInlineStart: '16px', paddingInlineEnd: '50px', borderRadius: '14px',
                  backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
                  color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <span style={{
                position: 'absolute', insetInlineEnd: '16px', top: '50%', transform: 'translateY(-50%)',
                fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0',
              }}>
                {currencySymbol(currency)}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {t.descriptionLabel}
              <span style={{
                fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 600, color: '#00E5FF',
                backgroundColor: 'rgba(0, 229, 255,0.1)',
                padding: '2px 8px', borderRadius: '100px',
              }}>
                {t.generatedByAI}
              </span>
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
                color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', lineHeight: '1.5',
                outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            width: '100%', padding: '16px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            marginTop: '24px',
            boxShadow: '0 8px 32px rgba(0, 229, 255,0.25)',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="white"/>
          </svg>
          <span style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>
            {saving ? t.saving : t.createListing}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#00E5FF"/>
            </svg>
            <h1 style={{
              fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0,
            }}>
              {t.iaExpress}
            </h1>
          </div>

          {/* Spacer to center the title */}
          <div style={{ width: '40px' }} />
        </div>

        {/* Step indicator */}
        <div style={{
          display: 'flex', gap: '6px', padding: '0 16px 12px',
        }}>
          {['upload', 'analyzing', 'results'].map((s, i) => (
            <div key={s} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              backgroundColor:
                step === 'success' || (step === 'results' && i <= 2) ? '#00E5FF'
                : step === 'analyzing' && i <= 1 ? '#00E5FF'
                : step === 'upload' && i === 0 ? '#00E5FF'
                : '#1A1A1A',
              transition: 'background-color 0.4s ease',
            }} />
          ))}
        </div>
      </div>

      {/* Content */}
      {step === 'upload' && renderUploadStep()}
      {step === 'analyzing' && renderAnalysisStep()}
      {step === 'results' && renderResultsStep()}

      {/* Toast is now handled by showToast() from lib/toast */}

      {/* Barcode scanner overlay */}
      {showBarcodeScanner && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.95)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Scanner header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          }}>
            <h3 style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
              {t.scanBarcode}
            </h3>
            <button
              onClick={stopBarcodeScanner}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Camera view */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative' }}>
            <video
              ref={barcodeVideoRef}
              playsInline
              muted
              style={{
                width: '100%', maxWidth: '400px', borderRadius: '16px',
                backgroundColor: '#111',
              }}
            />
            {/* Scan line animation */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', // i18n-ignore (centrage)
              transform: 'translate(-50%, -50%)',
              width: '280px', height: '160px',
              border: '2px solid rgba(59,130,246,0.5)',
              borderRadius: '12px',
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '2px', backgroundColor: '#3B82F6',
                animation: 'barcodeScan 2s ease-in-out infinite',
              }} />
            </div>
          </div>

          {/* Status */}
          <div style={{
            padding: '16px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0' }}>{barcodeStatus}</p>
            {/* Manual barcode input fallback */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', maxWidth: '340px', margin: '12px auto 0' }}>
              <input
                type="text"
                placeholder={t.barcodePlaceholder}
                id="barcode-manual-input"
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: '1px solid #333', backgroundColor: '#0D0D0D',
                  color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', outline: 'none',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const input = document.getElementById('barcode-manual-input') as HTMLInputElement
                    if (input.value.trim()) handleBarcodeDetected(input.value.trim())
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById('barcode-manual-input') as HTMLInputElement
                  if (input?.value.trim()) handleBarcodeDetected(input.value.trim())
                }}
                style={{
                  padding: '12px 20px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                  border: 'none', color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes scanMove {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        @keyframes pulseBorder {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes sparkleRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1); opacity: 1; }
        }
        @keyframes toastIn {
          0% { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes barcodeScan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  )
}
