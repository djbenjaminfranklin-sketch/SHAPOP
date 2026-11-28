import { useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang, tr, LANGS, type Localized } from '../lib/i18n'
import { track } from '../lib/analytics'
import { usePageTitle } from '../hooks/usePageTitle'

const trendingSearches = ['Nike Dunk', 'Pokémon', 'iPhone 16', 'Vintage', 'Sneakers']

// Maps to CategoryIcons IDs used on Home page
const categoryIds = [
  'fashion_w', 'sneakers', 'electronics', 'cards', 'jewelry',
  'watches', 'toys', 'vintage', 'home', 'beauty',
  'sports', 'art', 'gaming', 'books', 'music',
  'auto', 'bags', 'collect', 'collect', 'music',
  'kids', 'photo', 'jewelry', 'electronics',
]

// Search keywords for each category (same index order as categoryNames)
const categoryKeywords = [
  'mode vetements femme robe jupe pull veste fashion clothes dress',
  'sneakers baskets chaussures nike adidas jordan shoes',
  'electronique tech telephone ordinateur iphone samsung tablette laptop',
  'cartes pokemon yugioh magic trading card tcg',
  'bijoux collier bague bracelet boucles oreilles jewelry ring necklace',
  'montres montre watch rolex casio omega seiko',
  'jouets lego playmobil figurine peluche jeux toy',
  'vintage retro ancien brocante friperie secondhand',
  'maison deco decoration meubles meuble mobilier interieur home furniture',
  'beaute maquillage cosmetique parfum soin skincare makeup beauty',
  'sport fitness gym equipement ballon velo running',
  'art peinture tableau dessin sculpture toile canvas painting',
  'gaming console ps5 xbox nintendo switch manette jeux video',
  'livres livre roman manga bd book lecture',
  'musique instrument guitare piano vinyl disque vinyle',
  'auto moto voiture pieces tuning car motorcycle',
  'sacs sac main bandouliere bag handbag pochette',
  'figurines figurine statue funko pop collection',
  'comics manga bd bande dessinee comic book anime',
  'vinyles vinyl disque platine musique record',
  'bebe enfants puericulture poussette vetements kids baby',
  'photo camera appareil objectif reflex polaroid photography',
  'accessoires ceinture chapeau lunettes echarpe gants montre',
  'telephonie telephone portable coque accessoire smartphone mobile',
]

const categoryImages = [
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
]

type ExploreText = {
  searchPlaceholder: string
  trending: string
  categoriesLabel: string
  noCategoryFound: string
  categoryNames: string[]
}

const exploreContent: Localized<ExploreText> = {
  en: {
    searchPlaceholder: 'Search categories...',
    trending: 'Suggestions',
    categoriesLabel: 'Categories',
    noCategoryFound: 'No category found',
    categoryNames: [
      'Fashion', 'Sneakers', 'Electronics', 'Cards', 'Jewelry',
      'Watches', 'Toys', 'Vintage', 'Home', 'Beauty',
      'Sport', 'Art', 'Gaming', 'Books', 'Music',
      'Cars & bikes', 'Bags', 'Figurines', 'Comics / Manga', 'Vinyl',
      'Baby / Kids', 'Photo / Camera', 'Accessories', 'Phones',
    ],
  },
  fr: {
    searchPlaceholder: 'Rechercher des catégories...',
    trending: 'Suggestions',
    categoriesLabel: 'Catégories',
    noCategoryFound: 'Aucune catégorie trouvée',
    categoryNames: [
      'Mode', 'Sneakers', 'Électronique', 'Cartes', 'Bijoux',
      'Montres', 'Jouets', 'Vintage', 'Maison', 'Beauté',
      'Sport', 'Art', 'Gaming', 'Livres', 'Musique',
      'Auto-Moto', 'Sacs', 'Figurines', 'BD / Manga', 'Vinyles',
      'Bébé / Enfants', 'Photo / Caméra', 'Accessoires', 'Téléphonie',
    ],
  },
  es: {
    searchPlaceholder: 'Buscar categorías...',
    trending: 'Sugerencias',
    categoriesLabel: 'Categorías',
    noCategoryFound: 'No se encontró ninguna categoría',
    categoryNames: [
      'Moda', 'Sneakers', 'Electrónica', 'Cartas', 'Joyas',
      'Relojes', 'Juguetes', 'Vintage', 'Hogar', 'Belleza',
      'Deporte', 'Arte', 'Gaming', 'Libros', 'Música',
      'Motor', 'Bolsos', 'Figuras', 'Cómics / Manga', 'Vinilos',
      'Bebé / Niños', 'Foto / Cámara', 'Accesorios', 'Telefonía',
    ],
  },
  ru: {
    searchPlaceholder: 'Поиск по категориям...',
    trending: 'Подсказки',
    categoriesLabel: 'Категории',
    noCategoryFound: 'Категории не найдены',
    categoryNames: [
      'Мода', 'Кроссовки', 'Электроника', 'Карточки', 'Украшения',
      'Часы', 'Игрушки', 'Винтаж', 'Дом', 'Красота',
      'Спорт', 'Искусство', 'Игры', 'Книги', 'Музыка',
      'Авто и мото', 'Сумки', 'Фигурки', 'Комиксы / манга', 'Винил',
      'Малыши / дети', 'Фото / камеры', 'Аксессуары', 'Телефоны',
    ],
  },
  he: {
    searchPlaceholder: 'חיפוש קטגוריות...',
    trending: 'הצעות',
    categoriesLabel: 'קטגוריות',
    noCategoryFound: 'לא נמצאה קטגוריה',
    categoryNames: [
      'אופנה', 'סניקרס', 'אלקטרוניקה', 'קלפים', 'תכשיטים',
      'שעונים', 'צעצועים', 'וינטג׳', 'בית', 'יופי',
      'ספורט', 'אמנות', 'גיימינג', 'ספרים', 'מוזיקה',
      'רכב ואופנועים', 'תיקים', 'פסלונים', 'קומיקס / מנגה', 'תקליטים',
      'תינוקות / ילדים', 'צילום / מצלמות', 'אקססוריז', 'סלולר',
    ],
  },
}

export default function Explore() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()
  const ct = tr(exploreContent, lang)
  usePageTitle(ct.categoriesLabel)
  const allCategories = ct.categoryNames.map((name, i) => ({ name, img: categoryImages[i], idx: i }))
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Track search queries with debounce
  useEffect(() => {
    if (!search.trim()) return
    const timeout = setTimeout(() => {
      track('search', { query: search.trim() })
    }, 500)
    return () => clearTimeout(timeout)
  }, [search])

  // Suggestions : noms de catégories dans la langue courante + recherches tendance
  // (les mots-clés multilingues servent à la recherche, pas à l'affichage)
  const suggestionTerms = useMemo(() => {
    const terms = new Set<string>()
    ct.categoryNames.forEach(name => terms.add(name))
    trendingSearches.forEach(t => terms.add(t))
    return Array.from(terms)
  }, [ct.categoryNames])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const suggestions = search.length > 0
    ? suggestionTerms
        .filter(t => t.toLowerCase().includes(search.toLowerCase()) && t.toLowerCase() !== search.toLowerCase())
        .slice(0, 6)
    : []

  const filtered = search
    ? allCategories.filter(c => {
        const q = search.toLowerCase()
        if (c.name.toLowerCase().includes(q)) return true
        // Nom de la catégorie dans n'importe laquelle des 5 langues
        if (LANGS.some(l => (exploreContent[l].categoryNames[c.idx] || '').toLowerCase().includes(q))) return true
        const kw = categoryKeywords[c.idx] || ''
        return kw.includes(q)
      })
    : allCategories

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
      paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)) + 100px)',
    }}>

      {/* Search bar */}
      <div style={{ padding: '16px 16px 0', position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          backgroundColor: '#111', border: '1.5px solid #222',
          borderRadius: '24px', padding: '12px 16px',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={ct.searchPlaceholder}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setShowSuggestions(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', insetInlineStart: '16px', insetInlineEnd: '16px', top: '100%',
            marginTop: '4px', backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A',
            borderRadius: '16px', overflow: 'hidden', zIndex: 50,
          }}>
            {suggestions.map((s, i) => (
              <button
                key={s}
                onClick={() => { setSearch(s); setShowSuggestions(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '12px 16px',
                  background: 'none', border: 'none', borderTop: i > 0 ? '1px solid #222' : 'none',
                  color: '#ddd', fontSize: 'calc(15px * var(--fs, 1))', fontFamily: 'inherit',
                  cursor: 'pointer', textAlign: 'start',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trending searches */}
      {!search && (
        <div style={{ padding: '16px 16px 0' }}>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0', margin: '0 0 10px' }}>
            {ct.trending}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {trendingSearches.map(t => (
              <button
                key={t}
                onClick={() => setSearch(t)}
                style={{
                  backgroundColor: '#111', border: '1px solid #222',
                  borderRadius: '20px', padding: '8px 16px',
                  color: '#ccc', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories grid */}
      <div style={{ padding: '24px 16px 0' }} onClick={() => setShowSuggestions(false)}>
        <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0', margin: '0 0 14px' }}>
          {ct.categoriesLabel}
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
        }}>
          {filtered.map((cat) => (
            <button
              key={cat.name}
              onClick={() => navigate('/?category=' + (categoryIds[cat.idx] || 'for_you'))}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '0', padding: '0',
                backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
                borderRadius: '14px', cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <div style={{
                width: '100%', aspectRatio: '1',
                overflow: 'hidden', position: 'relative',
              }}>
                <img
                  src={cat.img}
                  alt={cat.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '50%',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                }} />
              </div>
              <span style={{
                fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#ccc',
                padding: '10px 4px',
              }}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: '#f0f0f0', fontSize: 'calc(15px * var(--fs, 1))' }}>{ct.noCategoryFound}</p>
          </div>
        )}
      </div>
    </div>
  )
}
