import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import { getLang, getLocale, tr, t as i18nT, type Localized } from '../../lib/i18n'
import { ft } from '../../lib/fulfillmentText'
import type { TranslationKey } from '../../lib/i18n'
import { categories } from '../CategoryIcons'
import { liveFormats, optionLabel } from './SubCategoryData'
import CartoonAvatar from '../CartoonAvatar'
import { rtlFlip, rtlTextAlign, rtlPos } from '../../lib/rtl'

const TOTAL_STEPS = 5

export default function CreateLiveWizard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()

  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [repeat, setRepeat] = useState('none')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successDate, setSuccessDate] = useState('')
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailIsVideo, setThumbnailIsVideo] = useState(false)
  const [showTrimmer, setShowTrimmer] = useState(false)
  const [trimVideoUrl, setTrimVideoUrl] = useState<string | null>(null)
  const [trimDuration, setTrimDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimming, setTrimming] = useState(false)
  const trimVideoRef = useRef<HTMLVideoElement>(null)
  const trimFileRef = useRef<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeTip, setActiveTip] = useState(0)

  // Animation state
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [titleFocused, setTitleFocused] = useState(false)

  // Block non-sellers
  useEffect(() => {
    if (profile && !profile.is_seller) {
      navigate('/dashboard', { replace: true })
    }
  }, [profile, navigate])

  // Clean up blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview)
      }
      if (trimVideoUrl) {
        URL.revokeObjectURL(trimVideoUrl)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchMoved = useRef(false)

  const txt = {
    en: {
      tipsTitle: 'Tips for a great live',
      tip1Title: 'Light & sound',
      tip1Desc: 'Use good lighting and cut background noise. A ring light makes a huge difference!',
      tip2Title: 'Engage your audience',
      tip2Desc: 'Greet viewers by name, answer questions live and create urgency with limited-time deals.',
      tip3Title: 'Prepare your products',
      tip3Desc: 'Keep your items organized and ready to show. Know your prices and descriptions by heart.',
      titleLabel: 'Give your live a title',
      titlePlaceholder: 'e.g. Sunday sneaker drops!',
      charCount: '/150',
      dateLabel: 'When?',
      dateInput: 'Date',
      timeInput: 'Time',
      repeatLabel: 'Repeat',
      repeatNone: 'Doesn\'t repeat',
      repeatWeekly: 'Weekly',
      repeatBiweekly: 'Every 2 weeks',
      categoryLabel: 'Category & format',
      categorySelect: 'Select a category',
      formatSelect: 'Select a format',
      thumbnailLabel: 'Thumbnail',
      thumbnailDesc: 'Upload an image or a short video (10 s max)',
      uploadBtn: 'Upload a file',
      changeBtn: 'Change media',
      videoTooLong: 'The video must be 10 seconds or less',
      trimTitle: 'Trim your video',
      trimDesc: 'Choose which 10 seconds to keep',
      trimBtn: 'Trim',
      trimming: 'Trimming...',
      livePreview: 'Preview',
      next: 'Next',
      goLive: 'Confirm live',
      creating: 'Confirming...',
      stepOf: 'of',
      skip: 'Skip',
      successTitle: 'Live scheduled!',
      successMsg: 'Your live is set for',
      successBtn: 'Great',
      learnFromPros: 'Learn from the pros',
      today: 'Today',
      more: 'More',
      dragDrop: 'or drag & drop here',
      titlePreview: 'Your live title',
      you: 'You',
      createError: 'Couldn\'t create the live. Please try again.',
      seconds: '{n}s',
      totalDuration: '{n}s total',
    },
    fr: {
      tipsTitle: 'Conseils pour un super live',
      tip1Title: 'Lumière & son',
      tip1Desc: 'Utilise un bon éclairage et réduis le bruit de fond. Une ring light fait toute la différence !',
      tip2Title: 'Engage ton audience',
      tip2Desc: 'Salue les spectateurs par leur nom, réponds aux questions en direct et crée de l\'urgence avec des offres limitées.',
      tip3Title: 'Prépare tes produits',
      tip3Desc: 'Garde tes articles bien rangés et prêts à montrer. Connais tes prix et descriptions par cœur.',
      titleLabel: 'Donne un titre à ton live',
      titlePlaceholder: 'ex. : Drops sneakers du dimanche !',
      charCount: '/150',
      dateLabel: 'Quand ?',
      dateInput: 'Date',
      timeInput: 'Heure',
      repeatLabel: 'Répétition',
      repeatNone: 'Pas de répétition',
      repeatWeekly: 'Chaque semaine',
      repeatBiweekly: 'Toutes les 2 semaines',
      categoryLabel: 'Catégorie & format',
      categorySelect: 'Sélectionne une catégorie',
      formatSelect: 'Sélectionne un format',
      thumbnailLabel: 'Miniature',
      thumbnailDesc: 'Ajoute une image ou une courte vidéo (10 s max)',
      uploadBtn: 'Ajouter un fichier',
      changeBtn: 'Changer le média',
      videoTooLong: 'La vidéo ne doit pas dépasser 10 secondes',
      trimTitle: 'Découpe ta vidéo',
      trimDesc: 'Choisis les 10 secondes à garder',
      trimBtn: 'Découper',
      trimming: 'Découpe en cours...',
      livePreview: 'Aperçu',
      next: 'Suivant',
      goLive: 'Valider le live',
      creating: 'Validation...',
      stepOf: 'sur',
      skip: 'Passer',
      successTitle: 'Live programmé !',
      successMsg: 'Ton live est prévu le',
      successBtn: 'Parfait',
      learnFromPros: 'Apprends des pros',
      today: 'Auj.',
      more: 'Plus',
      dragDrop: 'ou glisse-dépose ici',
      titlePreview: 'Le titre de ton live',
      you: 'Toi',
      createError: 'Impossible de créer le live. Réessaie.',
      seconds: '{n} s',
      totalDuration: '{n} s au total',
    },
    es: {
      tipsTitle: 'Consejos para un gran directo',
      tip1Title: 'Luz y sonido',
      tip1Desc: 'Usa buena iluminación y reduce el ruido de fondo. ¡Un aro de luz marca la diferencia!',
      tip2Title: 'Conecta con tu audiencia',
      tip2Desc: 'Saluda a los espectadores por su nombre, responde preguntas en directo y crea urgencia con ofertas por tiempo limitado.',
      tip3Title: 'Prepara tus productos',
      tip3Desc: 'Ten tus artículos ordenados y listos para enseñar. Sabe tus precios y descripciones de memoria.',
      titleLabel: 'Ponle un título a tu directo',
      titlePlaceholder: 'p. ej.: ¡Drops de zapatillas del domingo!',
      charCount: '/150',
      dateLabel: '¿Cuándo?',
      dateInput: 'Fecha',
      timeInput: 'Hora',
      repeatLabel: 'Repetir',
      repeatNone: 'No se repite',
      repeatWeekly: 'Cada semana',
      repeatBiweekly: 'Cada 2 semanas',
      categoryLabel: 'Categoría y formato',
      categorySelect: 'Selecciona una categoría',
      formatSelect: 'Selecciona un formato',
      thumbnailLabel: 'Miniatura',
      thumbnailDesc: 'Sube una imagen o un vídeo corto (máx. 10 s)',
      uploadBtn: 'Subir un archivo',
      changeBtn: 'Cambiar archivo',
      videoTooLong: 'El vídeo no puede durar más de 10 segundos',
      trimTitle: 'Recorta tu vídeo',
      trimDesc: 'Elige los 10 segundos que quieres conservar',
      trimBtn: 'Recortar',
      trimming: 'Recortando...',
      livePreview: 'Vista previa',
      next: 'Siguiente',
      goLive: 'Confirmar directo',
      creating: 'Confirmando...',
      stepOf: 'de',
      skip: 'Saltar',
      successTitle: '¡Directo programado!',
      successMsg: 'Tu directo está previsto para el',
      successBtn: 'Perfecto',
      learnFromPros: 'Aprende de los profesionales',
      today: 'Hoy',
      more: 'Más',
      dragDrop: 'o arrastra y suelta aquí',
      titlePreview: 'El título de tu directo',
      you: 'Tú',
      createError: 'No se pudo crear el directo. Inténtalo de nuevo.',
      seconds: '{n} s',
      totalDuration: '{n} s en total',
    },
    ru: {
      tipsTitle: 'Советы для классного эфира',
      tip1Title: 'Свет и звук',
      tip1Desc: 'Используй хороший свет и убери фоновый шум. Кольцевая лампа творит чудеса!',
      tip2Title: 'Вовлекай зрителей',
      tip2Desc: 'Приветствуй зрителей по имени, отвечай на вопросы в эфире и создавай ажиотаж ограниченными предложениями.',
      tip3Title: 'Подготовь товары',
      tip3Desc: 'Разложи товары так, чтобы их было удобно показывать. Знай цены и описания наизусть.',
      titleLabel: 'Придумай название эфира',
      titlePlaceholder: 'напр.: Воскресный дроп кроссовок!',
      charCount: '/150',
      dateLabel: 'Когда?',
      dateInput: 'Дата',
      timeInput: 'Время',
      repeatLabel: 'Повтор',
      repeatNone: 'Без повтора',
      repeatWeekly: 'Каждую неделю',
      repeatBiweekly: 'Раз в 2 недели',
      categoryLabel: 'Категория и формат',
      categorySelect: 'Выбери категорию',
      formatSelect: 'Выбери формат',
      thumbnailLabel: 'Обложка',
      thumbnailDesc: 'Загрузи картинку или короткое видео (до 10 с)',
      uploadBtn: 'Загрузить файл',
      changeBtn: 'Заменить файл',
      videoTooLong: 'Видео должно быть не длиннее 10 секунд',
      trimTitle: 'Обрежь видео',
      trimDesc: 'Выбери 10 секунд, которые оставить',
      trimBtn: 'Обрезать',
      trimming: 'Обрезаем...',
      livePreview: 'Предпросмотр',
      next: 'Далее',
      goLive: 'Подтвердить эфир',
      creating: 'Подтверждаем...',
      stepOf: 'из',
      skip: 'Пропустить',
      successTitle: 'Эфир запланирован!',
      successMsg: 'Твой эфир назначен на',
      successBtn: 'Отлично',
      learnFromPros: 'Учись у профи',
      today: 'Сегодня',
      more: 'Ещё',
      dragDrop: 'или перетащи файл сюда',
      titlePreview: 'Название твоего эфира',
      you: 'Ты',
      createError: 'Не удалось создать эфир. Попробуй ещё раз.',
      seconds: '{n} с',
      totalDuration: 'Всего {n} с',
    },
    he: {
      tipsTitle: 'טיפים לשידור מעולה',
      tip1Title: 'תאורה וסאונד',
      tip1Desc: 'השתמשו בתאורה טובה והפחיתו רעשי רקע. תאורת טבעת עושה את כל ההבדל!',
      tip2Title: 'שתפו את הקהל',
      tip2Desc: 'ברכו צופים בשמם, ענו על שאלות בשידור וצרו תחושת דחיפות עם מבצעים לזמן מוגבל.',
      tip3Title: 'הכינו את המוצרים',
      tip3Desc: 'סדרו את הפריטים כך שיהיו מוכנים להצגה. הכירו את המחירים והתיאורים בעל פה.',
      titleLabel: 'תנו כותרת לשידור',
      titlePlaceholder: 'לדוגמה: דרופ סניקרס של יום ראשון!',
      charCount: '/150',
      dateLabel: 'מתי?',
      dateInput: 'תאריך',
      timeInput: 'שעה',
      repeatLabel: 'חזרה',
      repeatNone: 'ללא חזרה',
      repeatWeekly: 'כל שבוע',
      repeatBiweekly: 'כל שבועיים',
      categoryLabel: 'קטגוריה ופורמט',
      categorySelect: 'בחרו קטגוריה',
      formatSelect: 'בחרו פורמט',
      thumbnailLabel: 'תמונה ממוזערת',
      thumbnailDesc: 'העלו תמונה או סרטון קצר (עד 10 שניות)',
      uploadBtn: 'העלאת קובץ',
      changeBtn: 'החלפת מדיה',
      videoTooLong: 'הסרטון צריך להיות עד 10 שניות',
      trimTitle: 'חיתוך הסרטון',
      trimDesc: 'בחרו אילו 10 שניות לשמור',
      trimBtn: 'חיתוך',
      trimming: 'חותכים...',
      livePreview: 'תצוגה מקדימה',
      next: 'הבא',
      goLive: 'אישור השידור',
      creating: 'מאשרים...',
      stepOf: 'מתוך',
      skip: 'דילוג',
      successTitle: 'השידור תוזמן!',
      successMsg: 'מועד השידור שלך:',
      successBtn: 'מעולה',
      learnFromPros: 'ללמוד מהמקצוענים',
      today: 'היום',
      more: 'עוד',
      dragDrop: 'או גררו לכאן',
      titlePreview: 'כותרת השידור שלך',
      you: 'את/ה',
      createError: 'לא הצלחנו ליצור את השידור. נסו שוב.',
      seconds: '{n} שנ׳',
      totalDuration: 'סה״כ {n} שנ׳',
    },
  } satisfies Localized<Record<string, string>>

  const t = tr(txt)
  const secs = (n: number) => t.seconds.replace('{n}', String(Math.floor(n)))

  const sellingCategories = categories.filter(c => c.id !== 'for_you' && c.id !== 'following')

  const tipColors = ['#FFD700', '#00D4FF', '#00E5FF']

  const tips = [
    { title: t.tip1Title, desc: t.tip1Desc, emoji: '\u2600\uFE0F', color: '#00E5FF', bg: 'linear-gradient(135deg, #06161c 0%, #03090c 100%)', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
    { title: t.tip2Title, desc: t.tip2Desc, emoji: '\uD83D\uDC65', color: '#00E5FF', bg: 'linear-gradient(135deg, #06161c 0%, #03090c 100%)', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
    { title: t.tip3Title, desc: t.tip3Desc, emoji: '\uD83D\uDCE6', color: '#00E5FF', bg: 'linear-gradient(135deg, #06161c 0%, #03090c 100%)', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  ]

  // Step hero data
  const stepHeroes = [
    { emoji: '\uD83C\uDFA5', gradient: 'linear-gradient(135deg, #00E5FF, #0091EA)' },
    { emoji: '\u270D\uFE0F', gradient: 'linear-gradient(135deg, #00E5FF, #0091EA)' },
    { emoji: '\u23F0', gradient: 'linear-gradient(135deg, #00E5FF, #0091EA)' },
    { emoji: '\uD83C\uDFF7\uFE0F', gradient: 'linear-gradient(135deg, #00E5FF, #00E5FF)' },
    { emoji: '\uD83D\uDDBC\uFE0F', gradient: 'linear-gradient(135deg, #00E5FF, #0091EA)' },
  ]

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true // tips are just informational
      case 1: return title.trim().length > 0
      case 2: return scheduledDate !== '' && scheduledTime !== ''
      case 3: return selectedCategory !== '' && selectedFormat !== ''
      case 4: return true // thumbnail is optional
      default: return false
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processMediaFile(file)
  }

  const processMediaFile = (file: File) => {
    setError('')
    const isVideo = file.type.startsWith('video/')
    if (isVideo) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        if (video.duration > 10) {
          // Open trimmer instead of showing error
          trimFileRef.current = file
          setTrimDuration(video.duration)
          setTrimStart(0)
          setTrimVideoUrl(URL.createObjectURL(file))
          setShowTrimmer(true)
          URL.revokeObjectURL(video.src)
          return
        }
        URL.revokeObjectURL(video.src)
        setThumbnailIsVideo(true)
        setThumbnailFile(file)
        // Revoke old preview URL before creating new one
        if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
          URL.revokeObjectURL(thumbnailPreview)
        }
        setThumbnailPreview(URL.createObjectURL(file))
      }
      video.src = URL.createObjectURL(file)
    } else {
      setThumbnailIsVideo(false)
      setThumbnailFile(file)
      // Revoke old preview URL before creating new one
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview)
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        setThumbnailPreview(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Trim video to 10 seconds using canvas + MediaRecorder
  const handleTrimVideo = async () => {
    if (!trimVideoRef.current || !trimFileRef.current) return
    setTrimming(true)
    setError('')

    const video = trimVideoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 1280
    const ctx = canvas.getContext('2d')!

    try {
      // Seek to start position
      video.currentTime = trimStart
      await new Promise<void>(r => { video.onseeked = () => r() })

      // Try to use MediaRecorder with canvas
      const stream = canvas.captureStream(30)

      // Add audio track if video has audio
      try {
        const audioCtx = new AudioContext()
        const source = audioCtx.createMediaElementSource(video)
        const dest = audioCtx.createMediaStreamDestination()
        source.connect(dest)
        source.connect(audioCtx.destination)
        dest.stream.getAudioTracks().forEach(track => stream.addTrack(track))
      } catch {
        // No audio or audio not supported — continue without
      }

      const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm'
        : ''

      if (!mimeType) {
        // Fallback: just accept the original file and note we couldn't trim
        setShowTrimmer(false)
        setThumbnailIsVideo(true)
        setThumbnailFile(trimFileRef.current)
        setThumbnailPreview(trimVideoUrl)
        setTrimming(false)
        return
      }

      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
        const trimmedFile = new File([blob], `trimmed_${Date.now()}.${ext}`, { type: mimeType })

        setShowTrimmer(false)
        setThumbnailIsVideo(true)
        setThumbnailFile(trimmedFile)
        setThumbnailPreview(URL.createObjectURL(blob))
        setTrimming(false)
        if (trimVideoUrl) URL.revokeObjectURL(trimVideoUrl)
      }

      // Start recording and playback
      video.currentTime = trimStart
      await new Promise<void>(r => { video.onseeked = () => r() })
      video.play()
      recorder.start()

      // Draw frames to canvas
      const drawFrame = () => {
        if (video.currentTime >= trimStart + 10 || video.paused || video.ended) {
          video.pause()
          recorder.stop()
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        requestAnimationFrame(drawFrame)
      }
      drawFrame()

      // Safety: stop after 11 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          video.pause()
          recorder.stop()
        }
      }, 11000)

    } catch {
      // If trimming fails, just use original file
      setShowTrimmer(false)
      setThumbnailIsVideo(true)
      setThumbnailFile(trimFileRef.current)
      setThumbnailPreview(trimVideoUrl)
      setTrimming(false)
    }
  }

  const handleCreate = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const scheduledAt = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null

      // Upload thumbnail to Supabase storage if available
      let uploadedThumbnailUrl: string | null = null
      if (thumbnailFile) {
        const ext = thumbnailFile.name.split('.').pop() || 'jpg'
        const path = `thumbnails/${user.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, thumbnailFile, { upsert: true })
        if (uploadErr) {
          throw new Error(uploadErr.message)
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        uploadedThumbnailUrl = urlData.publicUrl
      } else if (thumbnailPreview && thumbnailPreview.startsWith('data:')) {
        // Fallback: upload base64 data as a file if no File object is available
        const res = await fetch(thumbnailPreview)
        const blob = await res.blob()
        const ext = blob.type.split('/')[1] || 'png'
        const path = `thumbnails/${user.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: blob.type })
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
          title,
          category: selectedCategory,
          scheduled_at: scheduledAt,
          thumbnail_url: uploadedThumbnailUrl,
          city: profile?.city || null,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erreur creation' }))
        if (err.error === 'whatsapp_required') {
          // Numéro WhatsApp obligatoire pour vendre : réglages « Remise des commandes »
          alert(ft().whatsapp_required_to_sell)
          setLoading(false)
          navigate('/payments')
          return
        }
        throw new Error(err.error || 'create failed') // i18n-ignore (message interne, l'écran affiche t.createError)
      }

      const stream = await resp.json()

      // Save extra data to localStorage (use uploaded URL, not blob URL)
      const liveData = {
        streamId: stream.id,
        format: selectedFormat,
        repeat,
        thumbnailPreview: uploadedThumbnailUrl,
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem(`shapop_live_${stream.id}`, JSON.stringify(liveData))

      setLoading(false)

      // Format the date for the success popup
      if (scheduledAt) {
        const d = new Date(scheduledAt)
        const dateStr = d.toLocaleDateString(getLocale(), {
          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        })
        setSuccessDate(dateStr)
      }
      setShowSuccess(true)
    } catch (err) {
      console.error('Create live failed:', err) // i18n-ignore
      setError(t.createError)
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (step === TOTAL_STEPS - 1) {
      handleCreate()
    } else {
      animateStep('left', step + 1)
    }
  }

  const handleBack = () => {
    animateStep('right', step - 1)
  }

  const animateStep = (dir: 'left' | 'right', nextStep: number) => {
    setSlideDir(dir)
    setAnimating(true)
    setVisible(false)
    setTimeout(() => {
      setStep(nextStep)
      setSlideDir(dir)
      setTimeout(() => {
        setVisible(true)
        setAnimating(false)
      }, 30)
    }, 250)
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const scrollToTip = (index: number) => {
    setActiveTip(index)
    carouselRef.current?.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  // Swipe gesture handlers for step navigation
  const SWIPE_THRESHOLD = 50
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchMoved.current = false
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
      const dy = Math.abs(e.touches[0].clientY - (touchStartY.current || 0))
      if (dx > 10 || dy > 10) touchMoved.current = true
    }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || animating) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current || 0))
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > dy) {
      if (dx < 0 && step < TOTAL_STEPS - 1 && canProceed()) {
        // Swiped left -> next step
        handleNext()
      } else if (dx > 0 && step > 0) {
        // Swiped right -> previous step
        handleBack()
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // Determine if the current step can be skipped (only tips step 0 and thumbnail step 4)
  const canSkip = step === 0 || step === 4

  const handleSkip = () => {
    if (step < TOTAL_STEPS - 1) {
      animateStep('left', step + 1)
    }
  }

  // Generate next 7 days for date picker
  const getNextDays = () => {
    const days = []
    const today = new Date()
    const locale = getLocale()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      days.push({
        date: dateStr,
        dayName: d.toLocaleDateString(locale, { weekday: 'short' }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString(locale, { month: 'short' }),
        isToday: i === 0,
      })
    }
    return days
  }

  // Time slots
  const getTimeSlots = () => {
    const slots = []
    for (let h = 8; h <= 23; h++) {
      for (const m of ['00', '30']) {
        const hour = h.toString().padStart(2, '0')
        slots.push({ value: `${hour}:${m}`, label: `${hour}:${m}` })
      }
    }
    return slots
  }

  // Handle drag and drop on thumbnail
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      processMediaFile(file)
    }
  }

  // Get selected category object
  const selectedCatObj = sellingCategories.find(c => c.id === selectedCategory)

  const renderStep = () => {
    switch (step) {
      // Step 0 - Tips carousel
      case 0:
        return (
          <div style={{ padding: '0 20px' }}>
            {/* Hero illustration */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: stepHeroes[0].gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(42px * var(--fs, 1))',
                boxShadow: '0 8px 32px rgba(0, 229, 255, 0.35), 0 0 0 8px rgba(0, 229, 255, 0.08)',
              }}>
                {stepHeroes[0].emoji}
              </div>
            </div>

            <h2 style={{
              fontSize: 'calc(26px * var(--fs, 1))', fontWeight: 800, color: '#fff', marginBottom: '6px',
              textAlign: 'center', letterSpacing: '-0.5px',
            }}>
              {t.tipsTitle}
            </h2>
            <p style={{ textAlign: 'center', color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', marginBottom: '28px' }}>
              {t.learnFromPros}
            </p>

            <div
              ref={carouselRef}
              onScroll={(e) => {
                const el = e.target as HTMLDivElement
                const index = Math.round(el.scrollLeft / el.offsetWidth)
                setActiveTip(index)
              }}
              style={{
                display: 'flex', gap: '16px', overflowX: 'auto',
                scrollSnapType: 'x mandatory', scrollBehavior: 'smooth',
                padding: '0 0 24px',
              }}
              className="no-scrollbar"
            >
              {tips.map((tip, i) => (
                <div
                  key={tip.title}
                  style={{
                    minWidth: 'calc(100% - 0px)', scrollSnapAlign: 'center',
                    background: tip.bg,
                    borderRadius: '20px', padding: '28px 24px',
                    border: `1px solid ${tip.color}18`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Decorative glow */}
                  <div style={{
                    position: 'absolute', top: '-30px', insetInlineEnd: '-30px',
                    width: '120px', height: '120px', borderRadius: '50%',
                    background: `radial-gradient(circle, ${tip.color}12 0%, transparent 70%)`,
                    pointerEvents: 'none',
                  }} />

                  <div style={{
                    width: '64px', height: '64px', borderRadius: '18px',
                    background: `linear-gradient(135deg, ${tip.color}22, ${tip.color}08)`,
                    border: `1px solid ${tip.color}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
                    position: 'relative',
                  }}>
                    <div style={{ fontSize: 'calc(30px * var(--fs, 1))' }}>{tip.emoji}</div>
                  </div>
                  <h3 style={{
                    fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff', marginBottom: '10px',
                    letterSpacing: '-0.3px',
                  }}>
                    {tip.title}
                  </h3>
                  <p style={{
                    fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.7,
                    letterSpacing: '0.1px',
                  }}>
                    {tip.desc}
                  </p>

                  {/* Step number */}
                  <div style={{
                    position: 'absolute', top: '20px', insetInlineEnd: '20px',
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: `${tip.color}15`,
                    border: `1px solid ${tip.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 800, color: tip.color,
                  }}>
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Premium dot indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '0px' }}>
              {tips.map((_tip, i) => (
                <button
                  key={_tip.title}
                  onClick={() => scrollToTip(i)}
                  style={{
                    width: activeTip === i ? '28px' : '8px', height: '8px',
                    borderRadius: '4px', border: 'none',
                    background: activeTip === i
                      ? `linear-gradient(90deg, ${tipColors[i]}, ${tipColors[i]}AA)`
                      : '#222',
                    cursor: 'pointer',
                    boxShadow: activeTip === i ? `0 0 12px ${tipColors[i]}40` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        )

      // Step 1 - Title with live preview
      case 1:
        return (
          <div style={{ padding: '0 20px' }}>
            {/* Hero */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: stepHeroes[1].gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(42px * var(--fs, 1))',
                boxShadow: '0 8px 32px rgba(167, 139, 250, 0.35), 0 0 0 8px rgba(167, 139, 250, 0.08)',
              }}>
                {stepHeroes[1].emoji}
              </div>
            </div>

            <h2 style={{
              fontSize: 'calc(26px * var(--fs, 1))', fontWeight: 800, color: '#fff', marginBottom: '28px',
              textAlign: 'center', letterSpacing: '-0.5px',
            }}>
              {t.titleLabel}
            </h2>

            {/* Title input with gradient border on focus */}
            <div style={{
              position: 'relative',
              borderRadius: '16px',
              padding: '2px',
              background: titleFocused
                ? 'linear-gradient(135deg, #00E5FF, #00E5FF, #00E5FF)'
                : 'transparent',
              transition: 'all 0.3s ease',
              marginBottom: '8px',
            }}>
              <input
                type="text"
                value={title}
                onChange={e => { if (e.target.value.length <= 150) setTitle(e.target.value) }}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
                placeholder={t.titlePlaceholder}
                style={{
                  width: '100%', padding: '18px 20px',
                  backgroundColor: '#0A0A0A',
                  border: titleFocused ? 'none' : '1px solid #1E1E1E',
                  borderRadius: '14px', color: '#fff',
                  fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 500, outline: 'none', boxSizing: 'border-box',
                  letterSpacing: '0.2px',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '0 4px' }}>
              <div style={{
                height: '3px', flex: 1, borderRadius: '2px', marginInlineEnd: '12px',
                background: '#111',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  width: `${(title.length / 150) * 100}%`,
                  background: title.length > 120
                    ? 'linear-gradient(90deg, #00E5FF, #0091EA)'
                    : 'linear-gradient(90deg, #00E5FF, #00E5FF)',
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
              </div>
              <p style={{
                fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
                color: title.length > 120 ? '#00E5FF' : '#f0f0f0',
                flexShrink: 0,
              }}>
                {title.length}{t.charCount}
              </p>
            </div>

            {/* Real-time live preview card */}
            <div style={{
              background: 'linear-gradient(145deg, #111 0%, #0A0A0A 100%)',
              borderRadius: '20px', overflow: 'hidden',
              border: '1px solid #1A1A1A',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                padding: '12px 16px 10px',
                borderBottom: '1px solid #141414',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
                  {t.livePreview}
                </span>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  backgroundColor: title.trim() ? '#00E5FF' : '#333',
                  transition: 'background-color 0.3s ease',
                }} />
              </div>
              <div style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: '#080808' }}>
                {/* Simulated camera view */}
                <div style={{
                  width: '100%', height: '100%',
                  background: 'radial-gradient(ellipse at center, #1A1A1A 0%, #080808 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ opacity: 0.3 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1">
                      <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                </div>
                {/* LIVE badge */}
                <div style={{
                  position: 'absolute', top: '12px', ...rtlPos('left', '12px'),
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <div style={{
                    background: '#E8344E', // en direct = rouge
                    borderRadius: '6px', padding: '4px 10px',
                    fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 800, color: '#fff',
                    letterSpacing: '1px',
                    boxShadow: '0 2px 12px rgba(232,52,78,0.5)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <div style={{
                      width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#fff',
                    }} />
                    LIVE
                  </div>
                </div>
                {/* Viewer count mock */}
                <div style={{
                  position: 'absolute', top: '12px', ...rtlPos('right', '12px'),
                  background: 'rgba(0,0,0,0.6)', borderRadius: '6px',
                  padding: '4px 8px', fontSize: 'calc(11px * var(--fs, 1))', color: '#ccc',
                  backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  0
                </div>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  border: '2px solid #00E5FF',
                  boxShadow: '0 0 0 2px rgba(0, 229, 255, 0.2)',
                }}>
                  <CartoonAvatar seed={profile?.username || profile?.id || 'seller'} size={40} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: title.trim() ? '#fff' : '#f0f0f0',
                    transition: 'color 0.3s ease',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {title.trim() || t.titlePlaceholder}
                  </p>
                  <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginTop: '2px' }}>
                    {profile?.display_name || profile?.username || t.you}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      // Step 2 - Date/Time with beautiful cards
      case 2:
        return (
          <div style={{ padding: '0 20px' }}>
            {/* Hero */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: stepHeroes[2].gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(42px * var(--fs, 1))',
                boxShadow: '0 8px 32px rgba(96, 165, 250, 0.35), 0 0 0 8px rgba(96, 165, 250, 0.08)',
              }}>
                {stepHeroes[2].emoji}
              </div>
            </div>

            <h2 style={{
              fontSize: 'calc(26px * var(--fs, 1))', fontWeight: 800, color: '#fff', marginBottom: '28px',
              textAlign: 'center', letterSpacing: '-0.5px',
            }}>
              {t.dateLabel}
            </h2>

            {/* Date picker cards - horizontal scroll */}
            <label style={{
              display: 'block', fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '10px',
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const,
              padding: '0 4px',
            }}>
              {t.dateInput}
            </label>
            <div style={{
              display: 'flex', gap: '10px', overflowX: 'auto',
              padding: '0 0 16px', marginBottom: '8px',
            }} className="no-scrollbar">
              {getNextDays().map((d) => {
                const isSelected = scheduledDate === d.date
                return (
                  <button
                    key={d.date}
                    onClick={() => setScheduledDate(d.date)}
                    style={{
                      minWidth: '72px', padding: '14px 10px',
                      borderRadius: '16px',
                      background: isSelected
                        ? 'linear-gradient(145deg, #1a3a5c 0%, #0d2240 100%)'
                        : 'linear-gradient(145deg, #111 0%, #0A0A0A 100%)',
                      border: isSelected ? '1.5px solid #00E5FF' : '1px solid #1A1A1A',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      boxShadow: isSelected ? '0 4px 20px rgba(96, 165, 250, 0.25)' : 'none',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 600,
                      color: isSelected ? '#00E5FF' : '#f0f0f0',
                      letterSpacing: '0.5px',
                    }}>
                      {d.isToday ? t.today : d.dayName}
                    </span>
                    <span style={{
                      fontSize: 'calc(24px * var(--fs, 1))', fontWeight: 800,
                      color: isSelected ? '#fff' : '#f0f0f0',
                      lineHeight: 1,
                    }}>
                      {d.dayNum}
                    </span>
                    <span style={{
                      fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 600,
                      color: isSelected ? '#00E5FF99' : '#f0f0f0',
                    }}>
                      {d.month}
                    </span>
                  </button>
                )
              })}
              {/* "More" card that opens native date picker */}
              <button
                onClick={() => {
                  const inp = document.createElement('input')
                  inp.type = 'date'
                  inp.style.position = 'fixed'
                  inp.style.opacity = '0'
                  inp.style.pointerEvents = 'none'
                  document.body.appendChild(inp)
                  const removeInp = () => {
                    if (inp.parentNode) document.body.removeChild(inp)
                  }
                  inp.addEventListener('change', () => {
                    setScheduledDate(inp.value)
                    removeInp()
                  })
                  // Clean up if picker is dismissed without selection
                  inp.addEventListener('blur', () => setTimeout(removeInp, 300))
                  inp.showPicker?.()
                  // fallback for browsers without showPicker
                  inp.click()
                }}
                style={{
                  minWidth: '72px', padding: '14px 10px',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, #111 0%, #0A0A0A 100%)',
                  border: '1px dashed #222',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600 }}>
                  {t.more}
                </span>
              </button>
            </div>

            {/* Time picker */}
            <label style={{
              display: 'block', fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '10px',
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const,
              padding: '0 4px', marginTop: '16px',
            }}>
              {t.timeInput}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '2px 0 16px',
              marginBottom: '8px',
            }} className="no-scrollbar">
              {getTimeSlots().map((slot) => {
                const isSelected = scheduledTime === slot.value
                return (
                  <button
                    key={slot.value}
                    onClick={() => setScheduledTime(slot.value)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '12px',
                      background: isSelected
                        ? 'linear-gradient(145deg, #1a3a5c 0%, #0d2240 100%)'
                        : '#0A0A0A',
                      border: isSelected ? '1.5px solid #00E5FF' : '1px solid #1A1A1A',
                      cursor: 'pointer',
                      fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                      color: isSelected ? '#00E5FF' : '#f0f0f0',
                      boxShadow: isSelected ? '0 2px 12px rgba(96, 165, 250, 0.2)' : 'none',
                    }}
                  >
                    {slot.label}
                  </button>
                )
              })}
            </div>

            {/* Repeat selection */}
            <label style={{
              display: 'block', fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '10px',
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const,
              padding: '0 4px', marginTop: '16px',
            }}>
              {t.repeatLabel}
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { val: 'none', label: t.repeatNone, icon: '\u2715' },
                { val: 'weekly', label: t.repeatWeekly, icon: '\uD83D\uDD01' },
                { val: 'biweekly', label: t.repeatBiweekly, icon: '\uD83D\uDD04' },
              ].map(opt => {
                const isSelected = repeat === opt.val
                return (
                  <button
                    key={opt.val}
                    onClick={() => setRepeat(opt.val)}
                    style={{
                      flex: 1, padding: '14px 8px', borderRadius: '14px',
                      background: isSelected
                        ? 'linear-gradient(145deg, rgba(0, 229, 255,0.12) 0%, rgba(0, 229, 255,0.04) 100%)'
                        : 'linear-gradient(145deg, #111 0%, #0A0A0A 100%)',
                      border: isSelected ? '1.5px solid #00E5FF' : '1px solid #1A1A1A',
                      color: isSelected ? '#00E5FF' : '#f0f0f0',
                      fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 16px rgba(0, 229, 255, 0.15)' : 'none',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: 'calc(18px * var(--fs, 1))' }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )

      // Step 3 - Category & Format with image cards
      case 3:
        return (
          <div style={{ padding: '0 20px' }}>
            {/* Hero */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: stepHeroes[3].gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(42px * var(--fs, 1))',
                boxShadow: '0 8px 32px rgba(52, 211, 153, 0.35), 0 0 0 8px rgba(52, 211, 153, 0.08)',
              }}>
                {stepHeroes[3].emoji}
              </div>
            </div>

            <h2 style={{
              fontSize: 'calc(26px * var(--fs, 1))', fontWeight: 800, color: '#fff', marginBottom: '8px',
              textAlign: 'center', letterSpacing: '-0.5px',
            }}>
              {t.categoryLabel}
            </h2>
            <p style={{ textAlign: 'center', color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', marginBottom: '24px' }}>
              {t.categorySelect}
            </p>

            {/* Category pills */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '10px',
              justifyContent: 'center',
              marginBottom: '28px',
              padding: '2px',
            }} className="no-scrollbar">
              {sellingCategories.map(cat => {
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '20px',
                      border: isSelected ? '2px solid #00E5FF' : '1px solid #333',
                      backgroundColor: isSelected ? 'rgba(52, 211, 153, 0.15)' : '#1A1A1A',
                      color: isSelected ? '#00E5FF' : '#ccc',
                      fontSize: 'calc(14px * var(--fs, 1))',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      touchAction: 'manipulation',
                      boxShadow: isSelected ? '0 4px 16px rgba(52, 211, 153, 0.2)' : 'none',
                    }}
                  >
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span>
                      {i18nT(lang, cat.id as TranslationKey)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Format selection */}
            <label style={{
              display: 'block', fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '12px',
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const,
              padding: '0 4px',
            }}>
              {t.formatSelect}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {liveFormats.map(fmt => {
                const label = optionLabel(fmt)
                const selected = selectedFormat === fmt.id
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    style={{
                      padding: '12px 20px', borderRadius: '24px',
                      background: selected
                        ? 'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(5,150,105,0.08) 100%)'
                        : 'linear-gradient(145deg, #111 0%, #0A0A0A 100%)',
                      border: selected ? '1.5px solid #00E5FF' : '1px solid #1A1A1A',
                      color: selected ? '#00E5FF' : '#f0f0f0',
                      fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                      boxShadow: selected ? '0 2px 12px rgba(52, 211, 153, 0.2)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )

      // Step 4 - Thumbnail with drag-and-drop
      case 4:
        return (
          <div style={{ padding: '0 20px' }}>
            {/* Hero */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: stepHeroes[4].gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(42px * var(--fs, 1))',
                boxShadow: '0 8px 32px rgba(251, 191, 36, 0.35), 0 0 0 8px rgba(251, 191, 36, 0.08)',
              }}>
                {stepHeroes[4].emoji}
              </div>
            </div>

            <h2 style={{
              fontSize: 'calc(26px * var(--fs, 1))', fontWeight: 800, color: '#fff', marginBottom: '4px',
              textAlign: 'center', letterSpacing: '-0.5px',
            }}>
              {t.thumbnailLabel}
            </h2>
            <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '28px', textAlign: 'center' }}>{t.thumbnailDesc}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {!thumbnailPreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  width: '100%', padding: '48px 20px', borderRadius: '20px',
                  background: dragOver
                    ? 'linear-gradient(145deg, rgba(251,191,36,0.08) 0%, rgba(217,119,6,0.04) 100%)'
                    : 'linear-gradient(145deg, #0D0D0D 0%, #080808 100%)',
                  border: dragOver
                    ? '2px dashed #00E5FF'
                    : '2px dashed #1E1E1E',
                  color: '#f0f0f0', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                  boxShadow: dragOver ? '0 0 40px rgba(251, 191, 36, 0.1) inset' : 'none',
                }}
              >
                {/* Upload icon with gradient circle */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00E5FF15, #0091EA15)',
                  border: '1px solid #00E5FF20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#00E5FF' : '#555'} strokeWidth="1.5" style={{ transition: 'stroke 0.3s ease' }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                    color: dragOver ? '#00E5FF' : '#f0f0f0',
                    marginBottom: '4px', transition: 'color 0.3s ease',
                  }}>
                    {t.uploadBtn}
                  </p>
                  <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0' }}>
                    {t.dragDrop}
                  </p>
                </div>
                {/* Supported formats note */}
                <div style={{
                  display: 'flex', gap: '8px', marginTop: '4px',
                }}>
                  {['JPG', 'PNG', 'MP4', 'MOV'].map(fmt => (
                    <span key={fmt} style={{
                      padding: '3px 10px', borderRadius: '6px',
                      background: '#111', border: '1px solid #1A1A1A',
                      fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0',
                      letterSpacing: '0.5px',
                    }}>
                      {fmt}
                    </span>
                  ))}
                </div>
              </button>
            ) : (
              <div>
                {/* Preview card - premium design */}
                <div style={{
                  borderRadius: '20px', overflow: 'hidden',
                  background: 'linear-gradient(145deg, #111 0%, #0A0A0A 100%)',
                  border: '1px solid #1A1A1A', marginBottom: '16px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                    {thumbnailIsVideo ? (
                      <video
                        src={thumbnailPreview!}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <img src={thumbnailPreview!} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {/* Overlay gradient */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.4) 100%)',
                    }} />
                    <div style={{
                      position: 'absolute', top: '12px', ...rtlPos('left', '12px'),
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <div style={{
                        background: '#E8344E', // en direct = rouge
                        borderRadius: '6px', padding: '4px 10px',
                        fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 800, color: '#fff',
                        letterSpacing: '1px',
                        boxShadow: '0 2px 12px rgba(232,52,78,0.5)',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        <div style={{
                          width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#fff',
                        }} />
                        LIVE
                      </div>
                    </div>
                    {thumbnailIsVideo && (
                      <div style={{
                        position: 'absolute', top: '12px', ...rtlPos('right', '12px'),
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                        borderRadius: '6px', padding: '4px 8px',
                        fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#fff',
                        letterSpacing: '0.5px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                          <polygon points="5 3 19 12 5 21 5 3" fill="#fff" stroke="none"/>
                        </svg>
                        VIDEO
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      border: '2px solid #00E5FF',
                    }}>
                      <CartoonAvatar seed={profile?.username || profile?.id || 'seller'} size={40} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {title || t.titlePreview}
                      </p>
                      <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginTop: '2px' }}>
                        {profile?.display_name || profile?.username || t.you}
                        {selectedCatObj && (
                          <span style={{ color: '#f0f0f0' }}>{' \u00B7 '}{i18nT(lang, selectedCatObj.id as TranslationKey)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: 'linear-gradient(145deg, #141414 0%, #0D0D0D 100%)',
                    border: '1px solid #1E1E1E',
                    color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t.changeBtn}
                </button>
              </div>
            )}

            {error && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,229,255,0.12) 0%, rgba(0,229,255,0.04) 100%)',
                color: '#00E5FF',
                padding: '14px 18px', borderRadius: '14px', marginTop: '16px', fontSize: 'calc(14px * var(--fs, 1))',
                fontWeight: 600,
                border: '1px solid rgba(0,229,255,0.2)',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Video trimmer modal
  if (showTrimmer && trimVideoUrl) {
    const maxStart = Math.max(0, trimDuration - 10)
    const endTime = Math.min(trimStart + 10, trimDuration)
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100, backgroundColor: '#000',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => { setShowTrimmer(false); if (trimVideoUrl) URL.revokeObjectURL(trimVideoUrl) }}
            style={{
              background: 'linear-gradient(145deg, #141414, #0A0A0A)',
              border: '1px solid #1E1E1E', cursor: 'pointer', padding: '10px',
              borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>{t.trimTitle}</h2>
          <div style={{ width: '44px' }} />
        </div>

        <p style={{ textAlign: 'center', fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: '0 0 16px' }}>
          {t.trimDesc}
        </p>

        {/* Video preview */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
          <div style={{ width: '100%', maxWidth: '400px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
            <video
              ref={trimVideoRef}
              src={trimVideoUrl}
              muted
              playsInline
              style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', backgroundColor: '#111' }}
              onLoadedMetadata={() => {
                if (trimVideoRef.current) trimVideoRef.current.currentTime = trimStart
              }}
            />
            {/* Time indicator */}
            <div style={{
              position: 'absolute', bottom: '12px', left: '12px', right: '12px',
              display: 'flex', justifyContent: 'space-between',
              pointerEvents: 'none',
            }}>
              <span style={{
                background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '4px 8px',
                fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#fff',
              }}>
                {secs(trimStart)} - {secs(endTime)}
              </span>
              <span style={{
                background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '4px 8px',
                fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0',
              }}>
                {t.totalDuration.replace('{n}', String(Math.floor(trimDuration)))}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline slider */}
        <div style={{ padding: '20px 24px' }}>
          {/* Visual timeline bar */}
          <div style={{
            position: 'relative', height: '40px', marginBottom: '8px',
            background: '#111', borderRadius: '8px', overflow: 'hidden',
          }}>
            {/* Selected portion highlight */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              insetInlineStart: `${(trimStart / trimDuration) * 100}%`,
              width: `${(10 / trimDuration) * 100}%`,
              background: 'linear-gradient(135deg, rgba(0, 229, 255,0.3), rgba(0,229,255,0.2))',
              border: '2px solid #00E5FF',
              borderRadius: '6px',
            }} />
          </div>

          <input
            type="range"
            min={0}
            max={maxStart}
            step={0.1}
            value={trimStart}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              setTrimStart(val)
              if (trimVideoRef.current) trimVideoRef.current.currentTime = val
            }}
            style={{ width: '100%', accentColor: '#00E5FF' }}
          />
        </div>

        {/* Trim button */}
        <div style={{ padding: '0 20px 24px' }}>
          <button
            onClick={handleTrimVideo}
            disabled={trimming}
            style={{
              width: '100%', padding: '18px',
              background: trimming
                ? 'linear-gradient(135deg, #1A1A1A, #111)'
                : 'linear-gradient(135deg, #00E5FF 0%, #0091EA 50%, #00E5FF 100%)',
              borderRadius: '16px', border: 'none',
              color: trimming ? '#666' : '#001014',
              fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 800, cursor: trimming ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: trimming ? 'none' : '0 8px 32px rgba(0, 229, 255,0.35)',
              paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {trimming && (
              <span style={{
                width: '18px', height: '18px',
                border: '2.5px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.8s linear infinite',
              }} />
            )}
            {trimming ? t.trimming : `${t.trimBtn} (${secs(trimStart)} → ${secs(endTime)})`}
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '120px' }}>
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 12px',
        }}>
          <button
            onClick={step > 0 ? handleBack : () => navigate(-1)}
            style={{
              background: 'linear-gradient(145deg, #141414, #0A0A0A)',
              border: '1px solid #1E1E1E',
              cursor: 'pointer', padding: '10px',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'manipulation',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" style={step > 0 ? {...rtlFlip()} : undefined}>
              <path d={step > 0 ? "M19 12H5M12 19l-7-7 7-7" : "M18 6L6 18M6 6l12 12"} strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i <= step
                    ? i === step
                      ? 'linear-gradient(90deg, #00E5FF, #0091EA)'
                      : '#00E5FF66'
                    : '#1A1A1A',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            ))}
          </div>
          {canSkip ? (
            <button
              onClick={handleSkip}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF',
                minWidth: '42px', ...rtlTextAlign('right'), padding: '4px 0',
                letterSpacing: '0.2px',
              }}
            >
              {t.skip}
            </button>
          ) : (
            <div style={{
              fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0',
              minWidth: '42px', ...rtlTextAlign('right'),
            }}>
              {step + 1}/{TOTAL_STEPS}
            </div>
          )}
        </div>

        {/* Progress bar - thick and prominent */}
        <div style={{
          height: '4px', backgroundColor: '#0D0D0D', margin: '0 20px 4px',
          borderRadius: '4px', overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            height: '100%', borderRadius: '4px',
            background: 'linear-gradient(90deg, #0091EA, #00E5FF, #00E5FF)',
            width: `${progress}%`,
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 12px rgba(0, 229, 255, 0.4)',
          }} />
        </div>

        {/* Content with slide animation + swipe support + scroll */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible
              ? 'translateX(0)'
              : slideDir === 'left' ? 'translateX(-30px)' : 'translateX(30px)',
            transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            paddingTop: '20px',
            overflowY: 'auto',
            overflowX: 'hidden',
            maxHeight: 'calc(100vh - 120px)',
            WebkitOverflowScrolling: 'touch',
            // Le bouton « Suivant » (fixe) et la barre du bas ne recouvrent plus la fin de l'étape
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 190px)',
          }}
        >
          {renderStep()}
        </div>
      </div>

      {/* Footer with premium button */}
      <div style={{
        position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)', left: 0, right: 0,
        padding: '16px 20px',
        paddingBottom: '8px',
        background: 'linear-gradient(180deg, transparent 0%, #000 30%)',
      }}>
        <button
          onClick={handleNext}
          disabled={!canProceed() || loading}
          style={{
            width: '100%', padding: '18px',
            background: canProceed()
              ? 'linear-gradient(135deg, #00E5FF 0%, #0091EA 50%, #00E5FF 100%)'
              : 'linear-gradient(135deg, #1A1A1A, #111)',
            backgroundSize: '200% 100%',
            borderRadius: '16px', border: 'none',
            color: canProceed() ? '#001014' : '#f0f0f0',
            fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 800,
            cursor: canProceed() ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: canProceed()
              ? '0 8px 32px rgba(0, 229, 255, 0.35), 0 2px 8px rgba(0, 229, 255, 0.2)'
              : 'none',
            letterSpacing: '0.3px',
          }}
        >
          {loading && (
            <span style={{
              width: '18px', height: '18px',
              border: '2.5px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {loading ? t.creating : step === TOTAL_STEPS - 1 ? t.goLive : t.next}
          {!loading && canProceed() && step < TOTAL_STEPS - 1 && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{...rtlFlip()}}>
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {!loading && step === TOTAL_STEPS - 1 && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          )}
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Success popup */}
      {showSuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            backgroundColor: '#111',
            border: '1px solid #222',
            borderRadius: '24px',
            padding: '36px 28px',
            maxWidth: '340px',
            width: '100%',
            textAlign: 'center',
            animation: 'popIn 0.3s ease',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #00E5FF, #00E5FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 32px rgba(0,229,255, 0.3)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
              {t.successTitle}
            </h3>
            <p style={{ fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', margin: '0 0 8px', lineHeight: 1.5 }}>
              {t.successMsg}
            </p>
            <p style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF', margin: '0 0 28px' }}>
              {successDate}
            </p>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: '100%', padding: '16px',
                borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
                color: '#001014', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                cursor: 'pointer', touchAction: 'manipulation',
                boxShadow: '0 6px 24px rgba(0, 229, 255,0.3)',
              }}
            >
              {t.successBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
