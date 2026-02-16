import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { showToast } from '../lib/toast'
import { supabase } from '../lib/supabase'

type Lang = 'fr' | 'en' | 'he' | 'es'
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

const content = {
  fr: {
    iaExpress: 'IA Express',
    takePhoto: 'Prends une photo',
    importGallery: 'ou importe depuis ta galerie',
    stepPhoto: 'Photo',
    stepPhotoDesc: 'Prends une photo',
    stepAnalysis: 'Analyse',
    stepAnalysisDesc: 'L\'IA analyse',
    stepPublish: 'Publie',
    stepPublishDesc: 'Confirme et vends',
    analysisSteps: [
      'Analyse en cours...',
      'Detection de l\'objet...',
      'Identification de la marque...',
      'Evaluation de l\'etat...',
      'Estimation du prix...',
      'Generation des tags...',
      'Finalisation...',
    ],
    aiAnalysisComplete: 'Analyse IA terminee',
    confidence: 'Confiance',
    estimatedPrice: 'Prix estime par l\'IA',
    priceBasedOn: 'Base sur les ventes recentes d\'articles similaires',
    aiTags: 'Tags IA',
    titleLabel: 'Titre',
    categoryLabel: 'Categorie',
    conditionLabel: 'Etat',
    startingPrice: 'Prix de depart',
    descriptionLabel: 'Description',
    generatedByAI: 'Generee par IA',
    createListing: 'Creer l\'annonce',
    saving: 'Sauvegarde en cours...',
    listingCreated: 'Annonce creee avec succes !',
    listingError: 'Erreur lors de la creation. Reessayez.',
    categories: [
      'Sneakers', 'Mode Femme', 'Mode Homme', 'Sacs', 'Bijoux',
      'Montres', 'High-tech', 'Gaming', 'Cartes', 'Vintage',
      'Art', 'Jouets', 'Musique', 'Sport', 'Photo',
    ],
    conditions: ['Neuf', 'Comme neuf', 'Bon etat', 'Correct'],
  },
  en: {
    iaExpress: 'AI Express',
    takePhoto: 'Take a photo',
    importGallery: 'or import from your gallery',
    stepPhoto: 'Photo',
    stepPhotoDesc: 'Take a photo',
    stepAnalysis: 'Analysis',
    stepAnalysisDesc: 'AI analyzes',
    stepPublish: 'Publish',
    stepPublishDesc: 'Confirm and sell',
    analysisSteps: [
      'Analyzing...',
      'Detecting the item...',
      'Identifying the brand...',
      'Evaluating condition...',
      'Estimating price...',
      'Generating tags...',
      'Finalizing...',
    ],
    aiAnalysisComplete: 'AI analysis complete',
    confidence: 'Confidence',
    estimatedPrice: 'AI estimated price',
    priceBasedOn: 'Based on recent sales of similar items',
    aiTags: 'AI Tags',
    titleLabel: 'Title',
    categoryLabel: 'Category',
    conditionLabel: 'Condition',
    startingPrice: 'Starting price',
    descriptionLabel: 'Description',
    generatedByAI: 'AI generated',
    createListing: 'Create listing',
    saving: 'Saving...',
    listingCreated: 'Listing created successfully!',
    listingError: 'Error creating listing. Please try again.',
    categories: [
      'Sneakers', 'Women\'s Fashion', 'Men\'s Fashion', 'Bags', 'Jewelry',
      'Watches', 'Tech', 'Gaming', 'Cards', 'Vintage',
      'Art', 'Toys', 'Music', 'Sport', 'Photo',
    ],
    conditions: ['New', 'Like new', 'Good condition', 'Fair'],
  },
  he: {
    iaExpress: 'AI Express',
    takePhoto: '\u05E6\u05DC\u05DD \u05EA\u05DE\u05D5\u05E0\u05D4',
    importGallery: '\u05D0\u05D5 \u05D9\u05D9\u05D1\u05D0 \u05DE\u05D4\u05D2\u05DC\u05E8\u05D9\u05D4',
    stepPhoto: '\u05EA\u05DE\u05D5\u05E0\u05D4',
    stepPhotoDesc: '\u05E6\u05DC\u05DD \u05EA\u05DE\u05D5\u05E0\u05D4',
    stepAnalysis: '\u05E0\u05D9\u05EA\u05D5\u05D7',
    stepAnalysisDesc: 'AI \u05DE\u05E0\u05EA\u05D7',
    stepPublish: '\u05E4\u05E8\u05E1\u05DD',
    stepPublishDesc: '\u05D0\u05E9\u05E8 \u05D5\u05DE\u05DB\u05D5\u05E8',
    analysisSteps: [
      '\u05DE\u05E0\u05EA\u05D7...',
      '\u05DE\u05D6\u05D4\u05D4 \u05D0\u05EA \u05D4\u05E4\u05E8\u05D9\u05D8...',
      '\u05DE\u05D6\u05D4\u05D4 \u05D0\u05EA \u05D4\u05DE\u05D5\u05EA\u05D2...',
      '\u05DE\u05E2\u05E8\u05D9\u05DA \u05DE\u05E6\u05D1...',
      '\u05DE\u05E2\u05E8\u05D9\u05DA \u05DE\u05D7\u05D9\u05E8...',
      '\u05D9\u05D5\u05E6\u05E8 \u05EA\u05D2\u05D9\u05D5\u05EA...',
      '\u05DE\u05E1\u05D9\u05D9\u05DD...',
    ],
    aiAnalysisComplete: '\u05E0\u05D9\u05EA\u05D5\u05D7 AI \u05D4\u05D5\u05E9\u05DC\u05DD',
    confidence: '\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF',
    estimatedPrice: '\u05DE\u05D7\u05D9\u05E8 \u05DE\u05E9\u05D5\u05E2\u05E8 \u05E2\u05DC \u05D9\u05D3\u05D9 AI',
    priceBasedOn: '\u05DE\u05D1\u05D5\u05E1\u05E1 \u05E2\u05DC \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA \u05E9\u05DC \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D3\u05D5\u05DE\u05D9\u05DD',
    aiTags: '\u05EA\u05D2\u05D9\u05D5\u05EA AI',
    titleLabel: '\u05DB\u05D5\u05EA\u05E8\u05EA',
    categoryLabel: '\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4',
    conditionLabel: '\u05DE\u05E6\u05D1',
    startingPrice: '\u05DE\u05D7\u05D9\u05E8 \u05D4\u05EA\u05D7\u05DC\u05EA\u05D9',
    descriptionLabel: '\u05EA\u05D9\u05D0\u05D5\u05E8',
    generatedByAI: '\u05E0\u05D5\u05E6\u05E8 \u05E2\u05DC \u05D9\u05D3\u05D9 AI',
    createListing: '\u05E6\u05D5\u05E8 \u05DE\u05D5\u05D3\u05E2\u05D4',
    saving: '...\u05E9\u05D5\u05DE\u05E8',
    listingCreated: '\u05D4\u05DE\u05D5\u05D3\u05E2\u05D4 \u05E0\u05D5\u05E6\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4!',
    listingError: '.\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05D4\u05DE\u05D5\u05D3\u05E2\u05D4. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1',
    categories: [
      'Sneakers', '\u05D0\u05D5\u05E4\u05E0\u05EA \u05E0\u05E9\u05D9\u05DD', '\u05D0\u05D5\u05E4\u05E0\u05EA \u05D2\u05D1\u05E8\u05D9\u05DD', '\u05EA\u05D9\u05E7\u05D9\u05DD', '\u05EA\u05DB\u05E9\u05D9\u05D8\u05D9\u05DD',
      '\u05E9\u05E2\u05D5\u05E0\u05D9\u05DD', '\u05D8\u05E7', 'Gaming', '\u05E7\u05DC\u05E4\u05D9\u05DD', '\u05D5\u05D9\u05E0\u05D8\u05D2\u05F3',
      '\u05D0\u05DE\u05E0\u05D5\u05EA', '\u05E6\u05E2\u05E6\u05D5\u05E2\u05D9\u05DD', '\u05DE\u05D5\u05D6\u05D9\u05E7\u05D4', '\u05E1\u05E4\u05D5\u05E8\u05D8', '\u05E6\u05D9\u05DC\u05D5\u05DD',
    ],
    conditions: ['\u05D7\u05D3\u05E9', '\u05DB\u05DE\u05D5 \u05D7\u05D3\u05E9', '\u05DE\u05E6\u05D1 \u05D8\u05D5\u05D1', '\u05E1\u05D1\u05D9\u05E8'],
  },
  es: {
    iaExpress: 'IA Express',
    takePhoto: 'Toma una foto',
    importGallery: 'o importa desde tu galeria',
    stepPhoto: 'Foto',
    stepPhotoDesc: 'Toma una foto',
    stepAnalysis: 'Analisis',
    stepAnalysisDesc: 'La IA analiza',
    stepPublish: 'Publica',
    stepPublishDesc: 'Confirma y vende',
    analysisSteps: [
      'Analizando...',
      'Detectando el objeto...',
      'Identificando la marca...',
      'Evaluando el estado...',
      'Estimando el precio...',
      'Generando etiquetas...',
      'Finalizando...',
    ],
    aiAnalysisComplete: 'Analisis IA completado',
    confidence: 'Confianza',
    estimatedPrice: 'Precio estimado por IA',
    priceBasedOn: 'Basado en ventas recientes de articulos similares',
    aiTags: 'Etiquetas IA',
    titleLabel: 'Titulo',
    categoryLabel: 'Categoria',
    conditionLabel: 'Estado',
    startingPrice: 'Precio inicial',
    descriptionLabel: 'Descripcion',
    generatedByAI: 'Generada por IA',
    createListing: 'Crear anuncio',
    saving: 'Guardando...',
    listingCreated: 'Anuncio creado con exito!',
    listingError: 'Error al crear el anuncio. Intentalo de nuevo.',
    categories: [
      'Sneakers', 'Moda Mujer', 'Moda Hombre', 'Bolsos', 'Joyas',
      'Relojes', 'Tecnologia', 'Gaming', 'Cartas', 'Vintage',
      'Arte', 'Juguetes', 'Musica', 'Deporte', 'Foto',
    ],
    conditions: ['Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'],
  },
}

const categoriesFr = [
  'Sneakers', 'Mode Femme', 'Mode Homme', 'Sacs', 'Bijoux',
  'Montres', 'High-tech', 'Gaming', 'Cartes', 'Vintage',
  'Art', 'Jouets', 'Musique', 'Sport', 'Photo',
]

const conditionsFr = ['Neuf', 'Comme neuf', 'Bon etat', 'Correct']

export default function AIListingPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const t = content[lang] || content.fr

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

  useEffect(() => {
    setTimeout(() => setMounted(true), 80)
  }, [])

  const imageDataRef = useRef<string | null>(null)
  const imageFileRef = useRef<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
        body: { image: imageData },
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
    const errorMsg = lang === 'en' ? 'Analysis failed. Please try again.'
      : lang === 'he' ? 'הניתוח נכשל. אנא נסה שוב.'
      : lang === 'es' ? 'El analisis fallo. Intentalo de nuevo.'
      : "L'analyse a echoue. Veuillez reessayer."
    setAnalysisError(errorMsg)
    setStep('upload')
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

      const { error } = await supabase.from('items').insert({
        seller_id: user.id,
        title: editTitle,
        description: editDescription,
        category: editCategory,
        starting_price: parseFloat(editPrice) || 0,
        current_price: parseFloat(editPrice) || 0,
        image_urls: imageUrls,
        ai_generated: true,
        ai_tags: editTags,
        ai_condition: editCondition,
        ai_confidence: aiResult.confidence,
        status: 'draft',
      })

      if (error) {
        showToast(t.listingError, 'error')
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
          backgroundColor: 'rgba(232,52,78,0.1)', border: '1px solid rgba(232,52,78,0.3)',
          borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
          color: '#E8344E', fontSize: '14px', fontWeight: 500, textAlign: 'center',
          width: '100%', maxWidth: '340px',
        }}>
          {analysisError}
        </div>
      )}
      {/* AI badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 18px', borderRadius: '100px',
        background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.1))',
        border: '1px solid rgba(240,144,138,0.25)',
        marginBottom: '28px',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#F0908A" stroke="#F0908A" strokeWidth="1"/>
        </svg>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#F0908A' }}>
          {t.iaExpress}
        </span>
      </div>

      {/* Upload area */}
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: '100%', maxWidth: '340px', aspectRatio: '1',
          borderRadius: '24px',
          border: '2px dashed rgba(240,144,138,0.4)',
          background: 'linear-gradient(180deg, rgba(240,144,138,0.06) 0%, rgba(232,52,78,0.03) 100%)',
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
            alt="Preview"
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
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(240,144,138,0.25)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                {t.takePhoto}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.4' }}>
                {t.importGallery}
              </p>
            </div>

            {/* Decorative scan lines */}
            <div style={{
              position: 'absolute', top: '20px', left: '20px',
              width: '30px', height: '30px',
              borderTop: '2px solid rgba(240,144,138,0.5)',
              borderLeft: '2px solid rgba(240,144,138,0.5)',
              borderRadius: '4px 0 0 0',
            }} />
            <div style={{
              position: 'absolute', top: '20px', right: '20px',
              width: '30px', height: '30px',
              borderTop: '2px solid rgba(240,144,138,0.5)',
              borderRight: '2px solid rgba(240,144,138,0.5)',
              borderRadius: '0 4px 0 0',
            }} />
            <div style={{
              position: 'absolute', bottom: '20px', left: '20px',
              width: '30px', height: '30px',
              borderBottom: '2px solid rgba(240,144,138,0.5)',
              borderLeft: '2px solid rgba(240,144,138,0.5)',
              borderRadius: '0 0 0 4px',
            }} />
            <div style={{
              position: 'absolute', bottom: '20px', right: '20px',
              width: '30px', height: '30px',
              borderBottom: '2px solid rgba(240,144,138,0.5)',
              borderRight: '2px solid rgba(240,144,138,0.5)',
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

      {/* Info cards */}
      <div style={{
        display: 'flex', gap: '10px', marginTop: '28px', width: '100%', maxWidth: '340px',
      }}>
        {[
          { icon: '1', label: t.stepPhoto, desc: t.stepPhotoDesc },
          { icon: '2', label: t.stepAnalysis, desc: t.stepAnalysisDesc },
          { icon: '3', label: t.stepPublish, desc: t.stepPublishDesc },
        ].map((item, i) => (
          <div key={i} style={{
            flex: 1, padding: '12px 8px', borderRadius: '14px',
            backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
            textAlign: 'center',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: `all 0.5s ease ${0.3 + i * 0.1}s`,
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 8px',
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 800, color: '#fff',
            }}>
              {item.icon}
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
              {item.label}
            </p>
            <p style={{ fontSize: '11px', color: '#666' }}>
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
            alt="Scanning"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
            }}
          />
        )}
        {/* Scanning overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(240,144,138,0.15) 50%, transparent 100%)',
          animation: 'scanMove 1.5s ease-in-out infinite',
        }} />
        {/* Corner markers */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '24px', height: '24px', borderTop: '3px solid #F0908A', borderLeft: '3px solid #F0908A', borderRadius: '4px 0 0 0' }} />
        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '24px', height: '24px', borderTop: '3px solid #F0908A', borderRight: '3px solid #F0908A', borderRadius: '0 4px 0 0' }} />
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '24px', height: '24px', borderBottom: '3px solid #F0908A', borderLeft: '3px solid #F0908A', borderRadius: '0 0 0 4px' }} />
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '24px', height: '24px', borderBottom: '3px solid #F0908A', borderRight: '3px solid #F0908A', borderRadius: '0 0 4px 0' }} />
        {/* Pulsing border */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '24px',
          border: '2px solid rgba(240,144,138,0.5)',
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
          background: 'linear-gradient(135deg, rgba(240,144,138,0.2), rgba(232,52,78,0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'sparkleRotate 2s linear infinite',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#F0908A"/>
          </svg>
        </div>

        {/* Status text */}
        <p style={{
          fontSize: '16px', fontWeight: 700, color: '#fff',
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
            background: 'linear-gradient(90deg, #F0908A, #E8344E)',
            width: `${analysisProgress}%`,
            transition: 'width 0.3s ease',
            boxShadow: '0 0 12px rgba(240,144,138,0.4)',
          }} />
        </div>

        {/* Progress text */}
        <p style={{ fontSize: '13px', color: '#666' }}>
          {analysisProgress}%
        </p>

        {/* Animated dots */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#F0908A',
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
          background: 'linear-gradient(135deg, rgba(240,144,138,0.12), rgba(232,52,78,0.06))',
          border: '1px solid rgba(240,144,138,0.2)',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Item"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#F0908A"/>
              </svg>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#F0908A' }}>
                {t.aiAnalysisComplete}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#888' }}>
              {t.confidence}: <span style={{ color: '#10B981', fontWeight: 700 }}>{aiResult.confidence}%</span>
            </p>
          </div>
          <div style={{
            padding: '8px 14px', borderRadius: '12px',
            backgroundColor: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>
              {aiResult.confidence}%
            </span>
          </div>
        </div>

        {/* Price estimate card */}
        <div style={{
          padding: '16px', borderRadius: '16px', marginBottom: '20px',
          background: 'linear-gradient(135deg, #F0908A, #E8344E)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }} />
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>
            {t.estimatedPrice}
          </p>
          <p style={{ fontSize: '28px', fontWeight: 900, color: '#fff', marginBottom: '2px' }}>
            {aiResult.priceLow} - {aiResult.priceHigh} €
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
            {t.priceBasedOn}
          </p>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '10px', display: 'block' }}>
            {t.aiTags}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {editTags.map((tag, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '100px',
                backgroundColor: 'rgba(240,144,138,0.1)',
                border: '1px solid rgba(240,144,138,0.25)',
              }}>
                <span style={{ fontSize: '13px', color: '#F0908A', fontWeight: 600 }}>
                  #{tag}
                </span>
                <button
                  onClick={() => removeTag(i)}
                  style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    backgroundColor: 'rgba(240,144,138,0.2)',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="3">
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
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', display: 'block' }}>
              {t.titleLabel}
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', display: 'block' }}>
              {t.categoryLabel}
            </label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                outline: 'none', appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'8\' viewBox=\'0 0 12 8\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1L6 6L11 1\' stroke=\'%23666\' stroke-width=\'2\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
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
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', display: 'block' }}>
              {t.conditionLabel}
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {t.conditions.map((cond, idx) => (
                <button
                  key={cond}
                  onClick={() => setEditCondition(conditionsFr[idx])}
                  style={{
                    padding: '10px 18px', borderRadius: '12px',
                    cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                    backgroundColor: editCondition === conditionsFr[idx] ? 'rgba(240,144,138,0.15)' : '#0D0D0D',
                    border: editCondition === conditionsFr[idx] ? '1px solid rgba(240,144,138,0.4)' : '1px solid #1A1A1A',
                    color: editCondition === conditionsFr[idx] ? '#F0908A' : '#666',
                  }}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', display: 'block' }}>
              {t.startingPrice}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                style={{
                  width: '100%', padding: '14px 50px 14px 16px', borderRadius: '14px',
                  backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
                  color: '#fff', fontSize: '15px', fontWeight: 600,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <span style={{
                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '15px', fontWeight: 700, color: '#555',
              }}>
                €
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {t.descriptionLabel}
              <span style={{
                fontSize: '10px', fontWeight: 600, color: '#F0908A',
                backgroundColor: 'rgba(240,144,138,0.1)',
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
                color: '#fff', fontSize: '14px', lineHeight: '1.5',
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
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            marginTop: '24px',
            boxShadow: '0 8px 32px rgba(240,144,138,0.25)',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="white"/>
          </svg>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
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
        paddingTop: 'env(safe-area-inset-top, 0px)',
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="#F0908A"/>
            </svg>
            <h1 style={{
              fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0,
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
                step === 'success' || (step === 'results' && i <= 2) ? '#F0908A'
                : step === 'analyzing' && i <= 1 ? '#F0908A'
                : step === 'upload' && i === 0 ? '#F0908A'
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
      `}</style>
    </div>
  )
}
