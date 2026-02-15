import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface BannerResult {
  concept: string
  color_palette: string[]
  tagline: { he: string; fr: string } | string
  generated_image_url: string | null
  image_prompt: string
}

const STYLES = [
  { id: 'modern', label: 'Moderne & Clean', emoji: '✨' },
  { id: 'vintage', label: 'Vintage & Rétro', emoji: '📻' },
  { id: 'luxury', label: 'Luxe & Premium', emoji: '💎' },
  { id: 'fun', label: 'Fun & Coloré', emoji: '🎨' },
  { id: 'minimal', label: 'Minimaliste', emoji: '⬜' },
  { id: 'street', label: 'Street & Urban', emoji: '🏙️' },
]

export default function StoreBannerGenerator() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [storeName, setStoreName] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('modern')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BannerResult | null>(null)
  const [error, setError] = useState('')
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
      // Pour le MVP, on utilise une URL d'image temporaire
      // En production, on upload d'abord sur Supabase Storage
      const formData = new FormData()
      formData.append('file', imageFile)

      // Simuler un upload et utiliser l'URL
      // En prod : upload vers Supabase Storage puis récupérer l'URL publique
      const imageUrl = previewUrl // Sera remplacé par l'URL Supabase en prod

      const response = await fetch('/api/ai/generate-store-banner', {
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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 text-white">
        <h2 className="text-xl font-bold">Créer l'image de ta boutique</h2>
        <p className="text-purple-100 text-sm mt-1">
          Upload une photo qui t'inspire, l'IA crée ta bannière pro
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
                Nom de ta boutique
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
                Photo d'inspiration
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <p className="text-4xl mb-3">📸</p>
                <p className="font-medium text-gray-700">Clique pour choisir une photo</p>
                <p className="text-sm text-gray-400 mt-1">
                  Une photo de tes produits, un style que tu aimes, un mood board...
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
                  Ton inspiration
                </div>
              </div>
            )}

            {/* Nom de la boutique si pas encore renseigné */}
            {!storeName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de ta boutique
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

            {/* Choix du style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quel style pour ta boutique ?
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
              Générer ma bannière
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">L'IA travaille sur ta bannière...</h3>
            <div className="space-y-2 text-sm text-gray-500">
              <p className="animate-pulse">Analyse de ton image d'inspiration...</p>
              <p className="animate-pulse" style={{ animationDelay: '0.5s' }}>Création du concept visuel...</p>
              <p className="animate-pulse" style={{ animationDelay: '1s' }}>Génération de l'image...</p>
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
                <p className="text-gray-600 text-sm mb-2">Aperçu du concept (image non générée — configure Replicate)</p>
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
                <h4 className="font-semibold text-gray-900 text-sm mb-2">Ta palette</h4>
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
                <p className="text-sm text-gray-500 mb-1">Slogan suggéré</p>
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
                Régénérer
              </button>
              <button
                onClick={() => {
                  // En prod : sauvegarder et appliquer la bannière
                  alert('Bannière sauvegardée !')
                }}
                className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
              >
                Utiliser cette bannière
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              Recommencer avec une autre photo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
