import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { showToast } from '../lib/toast'
import { supabase } from '../lib/supabase'

const _t = (fr: string, en: string, he: string, es: string) => {
  const l = getLang()
  return l === 'en' ? en : l === 'he' ? he : l === 'es' ? es : fr
}

export default function StoreIntroVideo() {
  const { user } = useAuth()
  const videoInputRef = useRef<HTMLInputElement>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [_recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [mode, setMode] = useState<'choose' | 'record' | 'upload' | 'preview'>('choose')
  const [saving, setSaving] = useState(false)
  const [duration, setDuration] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const MAX_DURATION = 30 // 30 secondes max

  // Enregistrer directement depuis la caméra
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 720, height: 1280 },
        audio: true,
      })
      streamRef.current = stream

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.muted = true
        videoPreviewRef.current.play()
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setVideoPreviewUrl(url)
        setVideoFile(new File([blob], 'store-intro.webm', { type: 'video/webm' }))
        setRecordedChunks(chunks)
        setMode('preview')

        // Arrêter les tracks de la caméra
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setDuration(0)

      // Timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= MAX_DURATION - 1) {
            recorder.stop()
            setIsRecording(false)
            if (timerRef.current) clearInterval(timerRef.current)
            return MAX_DURATION
          }
          return prev + 1
        })
      }, 1000)

      setMode('record')
    } catch (err) {
      showToast(_t("Impossible d'acceder a la camera. Verifie les permissions.", "Cannot access camera. Check your permissions.", "לא ניתן לגשת למצלמה. בדוק הרשאות.", "No se puede acceder a la camara. Verifica los permisos."), 'error')
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  // Upload depuis la galerie
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier que c'est une vidéo
    if (!file.type.startsWith('video/')) {
      showToast(_t('Veuillez selectionner un fichier video', 'Please select a video file', 'אנא בחר קובץ וידאו', 'Por favor selecciona un archivo de video'), 'error')
      return
    }

    // Vérifier la durée (côté client)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      if (video.duration > MAX_DURATION) {
        showToast(_t(
          `La video doit faire moins de ${MAX_DURATION}s (${Math.ceil(video.duration)}s)`,
          `Video must be under ${MAX_DURATION}s (yours is ${Math.ceil(video.duration)}s)`,
          `הסרטון חייב להיות פחות מ-${MAX_DURATION} שניות (שלך ${Math.ceil(video.duration)} שניות)`,
          `El video debe durar menos de ${MAX_DURATION}s (el tuyo dura ${Math.ceil(video.duration)}s)`
        ), 'error')
        return
      }
      setVideoFile(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
      setDuration(Math.ceil(video.duration))
      setMode('preview')
    }
    video.src = URL.createObjectURL(file)
  }

  const handleReset = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setIsRecording(false)
    setRecordedChunks([])
    setDuration(0)
    setMode('choose')
  }

  const handleSave = async () => {
    if (!videoFile || !user) return
    setSaving(true)

    try {
      // Upload video to Supabase storage
      const fileExt = videoFile.name.split('.').pop() || 'webm'
      const filePath = `${user.id}/store-intro-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, videoFile, { upsert: true })

      if (uploadError) {
        showToast(_t("Erreur lors de l'upload de la video. Reessayez.", 'Error uploading video. Please try again.', '.שגיאה בהעלאת הסרטון. נסה שוב', 'Error al subir el video. Intentalo de nuevo.'), 'error')
        setSaving(false)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath)

      const videoUrl = urlData.publicUrl

      // Update sellers table
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ store_intro_video_url: videoUrl })
        .eq('id', user.id)

      if (updateError) {
        showToast(_t('Erreur lors de la sauvegarde. Reessayez.', 'Error saving video. Please try again.', '.שגיאה בשמירת הסרטון. נסה שוב', 'Error al guardar el video. Intentalo de nuevo.'), 'error')
        setSaving(false)
        return
      }

      showToast(_t('Video sauvegardee !', 'Video saved!', '!הסרטון נשמר', '¡Video guardado!'))
    } catch {
      showToast(_t('Erreur inattendue. Reessayez.', 'Unexpected error. Please try again.', '.שגיאה בלתי צפויה. נסה שוב', 'Error inesperado. Intentalo de nuevo.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-pink-500 to-orange-400 p-6 text-white">
        <h2 className="text-xl font-bold">{_t('Video de presentation', 'Intro video', 'סרטון היכרות', 'Video de presentacion')}</h2>
        <p className="text-pink-100 text-sm mt-1">
          {_t(`Enregistre une courte video pour presenter ta boutique (max ${MAX_DURATION}s)`, `Record a short video to introduce your store (max ${MAX_DURATION}s)`, `הקלט סרטון קצר כדי להציג את החנות שלך (מקסימום ${MAX_DURATION} שניות)`, `Graba un video corto para presentar tu tienda (max ${MAX_DURATION}s)`)}
        </p>
      </div>

      <div className="p-6">
        {/* Mode choix */}
        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleStartRecording}
              className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-colors"
            >
              <span className="text-4xl">🎬</span>
              <span className="font-semibold text-gray-700">{_t('Filmer maintenant', 'Record now', 'הקלט עכשיו', 'Grabar ahora')}</span>
              <span className="text-xs text-gray-400">{_t('Utilise ta camera', 'Use your camera', 'השתמש במצלמה', 'Usa tu camara')}</span>
            </button>

            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-colors"
            >
              <span className="text-4xl">📱</span>
              <span className="font-semibold text-gray-700">{_t('Importer une video', 'Import a video', 'ייבא סרטון', 'Importar un video')}</span>
              <span className="text-xs text-gray-400">{_t('Depuis ta galerie', 'From your gallery', 'מהגלריה שלך', 'Desde tu galeria')}</span>
            </button>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Mode enregistrement */}
        {mode === 'record' && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[400px] mx-auto">
              <video
                ref={videoPreviewRef}
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
                autoPlay
                playsInline
                muted
              />

              {/* Timer */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="font-mono font-bold">
                  {duration}s / {MAX_DURATION}s
                </span>
              </div>

              {/* Barre de progression */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                <div
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{ width: `${(duration / MAX_DURATION) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              {isRecording ? (
                <button
                  onClick={handleStopRecording}
                  className="bg-red-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <span className="w-4 h-4 bg-white rounded-sm" />
                  {_t('Arreter', 'Stop', 'עצור', 'Detener')}
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  className="text-gray-500 hover:text-gray-700 px-6 py-3"
                >
                  {_t('Annuler', 'Cancel', 'ביטול', 'Cancelar')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mode preview */}
        {mode === 'preview' && videoPreviewUrl && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[400px] mx-auto">
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
              <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                {duration}s
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                {_t('Refaire', 'Redo', 'צלם מחדש', 'Rehacer')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 bg-gradient-to-r from-pink-500 to-orange-400 text-white py-3 rounded-xl font-semibold transition-colors ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:from-pink-600 hover:to-orange-500'}`}
              >
                {saving
                  ? _t('Sauvegarde...', 'Saving...', '...שומר', 'Guardando...')
                  : _t('Utiliser cette video', 'Use this video', 'השתמש בסרטון הזה', 'Usar este video')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
