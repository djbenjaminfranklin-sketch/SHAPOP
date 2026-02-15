import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import { categories } from '../components/CategoryIcons'

type Lang = 'fr' | 'en' | 'he' | 'es'

const tips = {
  fr: [
    {
      icon: '🎯',
      title: 'Choisis un bon creneau',
      desc: 'Les lives en soiree (19h-22h) et le week-end attirent plus de monde. Teste differents horaires pour trouver ton audience.',
    },
    {
      icon: '💡',
      title: 'Soigne ton eclairage',
      desc: 'Un bon eclairage fait toute la difference ! Place-toi face a une fenetre ou utilise une ring light pour bien montrer tes articles.',
    },
    {
      icon: '🏷️',
      title: 'Prepare tes prix a l\'avance',
      desc: 'Definis tes prix de depart avant le live. Des prix attractifs declenchent plus d\'encheres et font monter les offres.',
    },
    {
      icon: '🗣️',
      title: 'Interagis avec ton audience',
      desc: 'Reponds aux commentaires, appelle les gens par leur prenom. Plus tu echanges, plus les gens restent et achetent.',
    },
    {
      icon: '📦',
      title: 'Montre les details',
      desc: 'Retourne les articles, montre les etiquettes, les defauts s\'il y en a. La transparence cree la confiance et evite les retours.',
    },
  ],
  en: [
    {
      icon: '🎯',
      title: 'Pick the right time',
      desc: 'Evening lives (7-10 PM) and weekends attract more viewers. Test different times to find your audience.',
    },
    {
      icon: '💡',
      title: 'Get your lighting right',
      desc: 'Good lighting makes all the difference! Face a window or use a ring light to showcase your items properly.',
    },
    {
      icon: '🏷️',
      title: 'Set your prices in advance',
      desc: 'Define starting prices before going live. Attractive prices trigger more bids and drive offers up.',
    },
    {
      icon: '🗣️',
      title: 'Engage with your audience',
      desc: 'Reply to comments, call people by name. The more you interact, the longer people stay and buy.',
    },
    {
      icon: '📦',
      title: 'Show the details',
      desc: 'Turn items around, show labels and flaws if any. Transparency builds trust and prevents returns.',
    },
  ],
  he: [
    {
      icon: '🎯',
      title: 'בחר זמן טוב',
      desc: 'שידורים בערב (19-22) ובסופי שבוע מושכים יותר צופים. נסה זמנים שונים כדי למצוא את הקהל שלך.',
    },
    {
      icon: '💡',
      title: 'דאג לתאורה טובה',
      desc: 'תאורה טובה עושה את כל ההבדל! עמוד מול חלון או השתמש בתאורת טבעת.',
    },
    {
      icon: '🏷️',
      title: 'הכן מחירים מראש',
      desc: 'הגדר מחירי פתיחה לפני השידור. מחירים אטרקטיביים מעודדים הצעות.',
    },
    {
      icon: '🗣️',
      title: 'תקשר עם הקהל',
      desc: 'ענה לתגובות, קרא לאנשים בשמם. ככל שתתקשר יותר, אנשים נשארים וקונים.',
    },
    {
      icon: '📦',
      title: 'הראה את הפרטים',
      desc: 'הפוך פריטים, הראה תוויות ופגמים. שקיפות בונה אמון ומונעת החזרות.',
    },
  ],
  es: [
    {
      icon: '🎯',
      title: 'Elige el momento adecuado',
      desc: 'Los directos por la noche (19-22h) y los fines de semana atraen mas publico.',
    },
    {
      icon: '💡',
      title: 'Cuida la iluminacion',
      desc: 'Una buena luz lo cambia todo. Ponte frente a una ventana o usa un aro de luz.',
    },
    {
      icon: '🏷️',
      title: 'Prepara tus precios',
      desc: 'Define los precios de salida antes del directo. Precios atractivos generan mas pujas.',
    },
    {
      icon: '🗣️',
      title: 'Interactua con tu audiencia',
      desc: 'Responde a los comentarios, llama a la gente por su nombre. Cuanto mas interactues, mas compran.',
    },
    {
      icon: '📦',
      title: 'Muestra los detalles',
      desc: 'Gira los articulos, muestra etiquetas y defectos. La transparencia genera confianza.',
    },
  ],
}

const tipsHeader = {
  fr: { title: 'Conseils pour reussir ton live', next: 'Suivant', start: 'C\'est parti !', skip: 'Passer', page: 'sur' },
  en: { title: 'Tips for a great live', next: 'Next', start: 'Let\'s go!', skip: 'Skip', page: 'of' },
  he: { title: 'טיפים לשידור מוצלח', next: 'הבא', start: '!בואו נתחיל', skip: 'דלג', page: 'מתוך' },
  es: { title: 'Consejos para tu directo', next: 'Siguiente', start: 'Vamos!', skip: 'Saltar', page: 'de' },
}

const goLiveContent = {
  fr: {
    title: 'Nouveau live',
    titlePlaceholder: 'Donne un titre a ton live...',
    category: 'Categorie',
    next: 'Preparer mes articles',
    cancel: 'Annuler',
    creating: 'Creation...',
    subtitle: 'Choisis un titre et une categorie, puis prepare tes articles avant de passer en direct.',
    createError: 'Erreur lors de la creation',
  },
  en: {
    title: 'New live',
    titlePlaceholder: 'Give your live a title...',
    category: 'Category',
    next: 'Prepare my items',
    cancel: 'Cancel',
    creating: 'Creating...',
    subtitle: 'Choose a title and category, then prepare your items before going live.',
    createError: 'Error creating the live',
  },
  he: {
    title: 'שידור חדש',
    titlePlaceholder: '...תן לשידור שלך כותרת',
    category: 'קטגוריה',
    next: 'הכן את הפריטים שלי',
    cancel: 'ביטול',
    creating: '...יוצר',
    subtitle: 'בחר כותרת וקטגוריה, ואז הכן את הפריטים שלך לפני שתצא לשידור.',
    createError: 'שגיאה ביצירת השידור',
  },
  es: {
    title: 'Nuevo directo',
    titlePlaceholder: 'Dale un titulo a tu directo...',
    category: 'Categoria',
    next: 'Preparar mis articulos',
    cancel: 'Cancelar',
    creating: 'Creando...',
    subtitle: 'Elige un titulo y una categoria, luego prepara tus articulos antes de salir en directo.',
    createError: 'Error al crear el directo',
  },
}

export default function GoLivePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = goLiveContent[lang] || goLiveContent.fr

  const [showTips, setShowTips] = useState(true)
  const [tipIndex, setTipIndex] = useState(0)
  const [liveTitle, setLiveTitle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const langTips = tips[lang] || tips.fr
  const th = tipsHeader[lang] || tipsHeader.fr

  const sellingCategories = categories.filter(c => c.id !== 'for_you' && c.id !== 'following')

  const canProceed = liveTitle.trim().length > 0 && selectedCategory && !creating

  const handleCreate = async () => {
    if (!user || !canProceed) return

    setCreating(true)
    setError('')

    try {
      const { data: stream, error: dbError } = await supabase
        .from('streams')
        .insert({
          seller_id: user.id,
          title: liveTitle.trim(),
          category: selectedCategory,
          status: 'scheduled' as const,
        })
        .select()
        .single()

      if (dbError) throw dbError

      navigate(`/prepare-live/${stream.id}`)
    } catch (err: any) {
      setError(err?.message || ct.createError)
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
    fontSize: '16px',
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => setShowTips(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888', fontSize: '14px', fontWeight: 600,
            }}
          >
            {th.skip}
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 32px', gap: '32px',
        }}>
          {/* Big emoji icon */}
          <div style={{
            width: '100px', height: '100px', borderRadius: '28px',
            background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.08))',
            border: '1px solid rgba(240,144,138,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px',
          }}>
            {tip.icon}
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: '24px', fontWeight: 800, color: '#fff',
            textAlign: 'center', lineHeight: 1.3, margin: 0,
          }}>
            {tip.title}
          </h2>

          {/* Description */}
          <p style={{
            fontSize: '15px', color: '#999', textAlign: 'center',
            lineHeight: 1.7, maxWidth: '300px', margin: 0,
          }}>
            {tip.desc}
          </p>
        </div>

        {/* Bottom: progress + button */}
        <div style={{
          padding: '20px 24px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
        }}>
          {/* Progress dots */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '6px',
            marginBottom: '20px',
          }}>
            {langTips.map((_, i) => (
              <div key={i} style={{
                width: i === tipIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === tipIndex
                  ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                  : '#333',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          {/* Page indicator + button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
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
                  ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                  : '#1A1A1A',
                border: isLast ? 'none' : '1px solid #333',
                borderRadius: '14px',
                color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isLast ? '0 4px 16px rgba(232,52,78,0.3)' : 'none',
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
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{ct.title}</h1>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.08))',
            border: '1px solid rgba(240,144,138,0.2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, maxWidth: '320px', margin: '0 auto' }}>
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
          <p style={{ fontSize: '12px', color: '#555', textAlign: 'right', marginTop: '6px' }}>
            {liveTitle.length}/100
          </p>
        </div>

        {/* Category */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: '12px', fontWeight: 700, color: '#888',
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
                      ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                      : '#111',
                    border: isSelected ? 'none' : '1px solid #222',
                    color: isSelected ? '#fff' : '#999',
                    fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    boxShadow: isSelected ? '0 4px 16px rgba(240,144,138,0.3)' : 'none',
                  }}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Buttons */}
        <button
          onClick={handleCreate}
          disabled={!canProceed}
          style={{
            width: '100%', padding: '16px',
            background: canProceed
              ? 'linear-gradient(135deg, #F0908A, #E8344E)'
              : '#1A1A1A',
            borderRadius: '14px', border: 'none',
            color: canProceed ? '#fff' : '#555',
            fontSize: '16px', fontWeight: 700,
            cursor: canProceed ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: canProceed ? '0 8px 32px rgba(232,52,78,0.3)' : 'none',
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

        {error && (
          <div style={{
            padding: '14px 16px', marginBottom: '12px',
            backgroundColor: 'rgba(232,52,78,0.1)',
            border: '1px solid rgba(232,52,78,0.3)',
            borderRadius: '12px',
          }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#E8344E', margin: 0 }}>
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
            color: '#888', fontSize: '15px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ct.cancel}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
