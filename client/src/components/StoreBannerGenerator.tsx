import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { showToast } from '../lib/toast'
import { supabase } from '../lib/supabase'

interface BannerResult {
  concept: string
  color_palette: string[]
  tagline: { he: string; fr: string } | string
  generated_image_url: string | null
  image_prompt: string
}

const _t = (fr: string, en: string, he: string, es: string) => {
  const l = getLang()
  return l === 'en' ? en : l === 'he' ? he : l === 'es' ? es : fr
}

const STYLES = [
  { id: 'modern', label: 'Moderne & Clean', emoji: '✨' },
  { id: 'vintage', label: 'Vintage & Retro', emoji: '📻' },
  { id: 'luxury', label: 'Luxe & Premium', emoji: '💎' },
  { id: 'fun', label: 'Fun & Colorful', emoji: '🎨' },
  { id: 'minimal', label: 'Minimal', emoji: '⬜' },
  { id: 'street', label: 'Street & Urban', emoji: '🏙️' },
]

export default function StoreBannerGenerator() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [storeName, setStoreName] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('modern')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [_loading, setLoading] = useState(false)
  const [result, setResult] = useState<BannerResult | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<'upload' | 'style' | 'generating' | 'result'>('upload')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setStep('style')
  }

  const handleGenerate = async () => {
    if (!imageFile || !storeName.trim()) return

    setLoading(true)
    setError('')
    setStep('generating')

    try {
      const formData = new FormData()
      formData.append('file', imageFile)

      const imageUrl = previewUrl

      const { apiFetch } = await import('../lib/api')
      const response = await apiFetch('/api/ai/generate-store-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          store_name: storeName,
          style: STYLES.find(s => s.id === selectedStyle)?.label,
          seller_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error('Erreur lors de la génération')

      const data = await response.json()
      setResult(data)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
      setStep('style')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPreviewUrl(null)
    setImageFile(null)
    setResult(null)
    setStep('upload')
    setError('')
  }

  const handleSaveBanner = async () => {
    if (!user || !result) return
    setSaving(true)

    try {
      const bannerUrl = result.generated_image_url || null
      const colors = result.color_palette || []
      const tagline = typeof result.tagline === 'string'
        ? result.tagline
        : result.tagline
          ? `${result.tagline.he} — ${result.tagline.fr}`
          : null

      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          store_banner_url: bannerUrl,
          store_banner_colors: colors,
          store_tagline: tagline,
        })
        .eq('id', user.id)

      if (updateError) {
        showToast(_t('Erreur lors de la sauvegarde. Reessayez.', 'Error saving banner. Please try again.', '.שגיאה בשמירת הבאנר. נסה שוב', 'Error al guardar el banner. Intentalo de nuevo.'), 'error')
        setSaving(false)
        return
      }

      showToast(_t('Banniere sauvegardee !', 'Banner saved!', '!הבאנר נשמר', '¡Banner guardado!'))
    } catch {
      showToast(_t('Erreur inattendue. Reessayez.', 'Unexpected error. Please try again.', '.שגיאה בלתי צפויה. נסה שוב', 'Error inesperado. Intentalo de nuevo.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 text-white">
        <h2 className="text-xl font-bold">{_t("Creer l'image de ta boutique", 'Create your store banner', 'צור את באנר החנות שלך', 'Crea la imagen de tu tienda')}</h2>
        <p className="text-purple-100 text-sm mt-1">
          {_t("Upload une photo qui t'inspire, l'IA cree ta banniere pro", 'Upload an inspiring photo, AI creates your pro banner', 'העלה תמונה מעוררת השראה, הAI יוצר באנר מקצועי', 'Sube una foto inspiradora, la IA crea tu banner profesional')}
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* Étape 1 : Upload + nom */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {_t('Nom de ta boutique', 'Store name', 'שם החנות', 'Nombre de tu tienda')}
              </label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Ex: Vintage TLV, Cards Kingdom, ..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {_t("Photo d'inspiration", 'Inspiration photo', 'תמונת השראה', 'Foto de inspiracion')}
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <p className="text-4xl mb-3">📸</p>
                <p className="font-medium text-gray-700">{_t('Clique pour choisir une photo', 'Click to choose a photo', 'לחץ לבחירת תמונה', 'Haz clic para elegir una foto')}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {_t('Une photo de tes produits, un style que tu aimes...', 'A photo of your products, a style you like...', 'תמונה של המוצרים שלך, סגנון שאתה אוהב...', 'Una foto de tus productos, un estilo que te gusta...')}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Étape 2 : Choix du style */}
        {step === 'style' && (
          <div className="space-y-6">
            {/* Preview de l'image uploadée */}
            {previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Inspiration"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70"
                >
                  x
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                  {_t('Ton inspiration', 'Your inspiration', 'ההשראה שלך', 'Tu inspiracion')}
                </div>
              </div>
            )}

            {!storeName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {_t('Nom de ta boutique', 'Store name', 'שם החנות', 'Nombre de tu tienda')}
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Ex: Vintage TLV, Cards Kingdom, ..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {_t('Quel style pour ta boutique ?', 'What style for your store?', 'איזה סגנון לחנות שלך?', 'Que estilo para tu tienda?')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedStyle === style.id
                        ? 'border-purple-500 bg-purple-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{style.emoji}</span>
                    <p className="font-medium text-gray-900 text-sm mt-2">{style.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!storeName.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-600 disabled:opacity-50 transition-all"
            >
              {_t('Generer ma banniere', 'Generate my banner', 'צור את הבאנר שלי', 'Generar mi banner')}
            </button>
          </div>
        )}

        {/* Étape 3 : Génération en cours */}
        {step === 'generating' && (
          <div className="text-center py-12">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-purple-200 rounded-full" />
              <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center text-2xl">🎨</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{_t("L'IA travaille sur ta banniere...", 'AI is working on your banner...', '...AI עובד על הבאנר שלך', 'La IA esta trabajando en tu banner...')}</h3>
            <div className="space-y-2 text-sm text-gray-500">
              <p className="animate-pulse">{_t("Analyse de ton image d'inspiration...", 'Analyzing your inspiration image...', '...מנתח את תמונת ההשראה שלך', 'Analizando tu imagen de inspiracion...')}</p>
              <p className="animate-pulse" style={{ animationDelay: '0.5s' }}>{_t('Creation du concept visuel...', 'Creating visual concept...', '...יוצר קונספט ויזואלי', 'Creando concepto visual...')}</p>
              <p className="animate-pulse" style={{ animationDelay: '1s' }}>{_t("Generation de l'image...", 'Generating image...', '...מייצר תמונה', 'Generando imagen...')}</p>
            </div>
          </div>
        )}

        {/* Étape 4 : Résultat */}
        {step === 'result' && result && (
          <div className="space-y-6">
            {/* Image générée */}
            {result.generated_image_url ? (
              <div className="relative">
                <img
                  src={result.generated_image_url}
                  alt="Bannière générée"
                  className="w-full rounded-xl shadow-lg"
                />
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg">
                  <p className="font-bold text-lg">{storeName}</p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-8 text-center">
                <p className="text-gray-600 text-sm mb-2">{_t('Apercu du concept', 'Concept preview', 'תצוגת קונספט', 'Vista previa del concepto')}</p>
                <p className="font-bold text-xl text-gray-900">{storeName}</p>
              </div>
            )}

            {/* Concept */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">Concept</h4>
              <p className="text-gray-600 text-sm">{result.concept}</p>
            </div>

            {/* Palette de couleurs */}
            {result.color_palette && (
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-2">{_t('Ta palette', 'Your palette', 'הפלטה שלך', 'Tu paleta')}</h4>
                <div className="flex gap-2">
                  {result.color_palette.map((color, i) => (
                    <div key={i} className="flex-1 text-center">
                      <div
                        className="h-12 rounded-lg shadow-sm mb-1"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-gray-400 font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tagline */}
            {result.tagline && (
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">{_t('Slogan suggere', 'Suggested tagline', 'סלוגן מוצע', 'Eslogan sugerido')}</p>
                <p className="font-bold text-purple-700">
                  {typeof result.tagline === 'string' ? result.tagline : `${result.tagline.he} — ${result.tagline.fr}`}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                className="flex-1 border-2 border-purple-200 text-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
              >
                {_t('Regenerer', 'Regenerate', 'צור מחדש', 'Regenerar')}
              </button>
              <button
                onClick={handleSaveBanner}
                disabled={saving}
                className={`flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold transition-colors ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-purple-700'}`}
              >
                {saving
                  ? _t('Sauvegarde...', 'Saving...', '...שומר', 'Guardando...')
                  : _t('Utiliser cette banniere', 'Use this banner', 'השתמש בבאנר הזה', 'Usar este banner')}
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              {_t('Recommencer avec une autre photo', 'Start over with another photo', 'התחל מחדש עם תמונה אחרת', 'Empezar de nuevo con otra foto')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
