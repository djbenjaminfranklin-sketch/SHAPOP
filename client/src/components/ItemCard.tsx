import { Link } from 'react-router-dom'
import type { Item } from '../types/database'
import { getLang, tr, type Localized } from '../lib/i18n'
import { rtlPos } from '../lib/rtl'
import { formatItemPrice } from '../lib/fulfillment'
import { useAuth } from '../contexts/AuthContext'

type CardText = { seller: string; addFav: string; removeFav: string; ai: string }
const cardText: Localized<CardText> = {
  en: { seller: 'Seller', addFav: 'Add to favorites', removeFav: 'Remove from favorites', ai: 'AI' },
  fr: { seller: 'Vendeur', addFav: 'Ajouter aux favoris', removeFav: 'Retirer des favoris', ai: 'IA' },
  es: { seller: 'Vendedor', addFav: 'Añadir a favoritos', removeFav: 'Quitar de favoritos', ai: 'IA' },
  ru: { seller: 'Продавец', addFav: 'Добавить в избранное', removeFav: 'Убрать из избранного', ai: 'ИИ' },
  he: { seller: 'מוכר/ת', addFav: 'הוספה למועדפים', removeFav: 'הסרה מהמועדפים', ai: 'AI' },
}

const conditionLabels: Record<string, Localized<string>> = {
  new: { en: 'New', fr: 'Neuf', es: 'Nuevo', ru: 'Новое', he: 'חדש' },
  like_new: { en: 'Like new', fr: 'Comme neuf', es: 'Como nuevo', ru: 'Как новое', he: 'כמו חדש' },
  good: { en: 'Good', fr: 'Bon état', es: 'Buen estado', ru: 'Хорошее', he: 'מצב טוב' },
  fair: { en: 'Fair', fr: 'Correct', es: 'Aceptable', ru: 'Удовлетворительное', he: 'סביר' },
  // Anciennes annonces enregistrées avec le libellé français au lieu du code
  'Neuf': { en: 'New', fr: 'Neuf', es: 'Nuevo', ru: 'Новое', he: 'חדש' }, // i18n-ignore (valeur enregistrée)
  'Comme neuf': { en: 'Like new', fr: 'Comme neuf', es: 'Como nuevo', ru: 'Как новое', he: 'כמו חדש' }, // i18n-ignore (valeur enregistrée)
  'Bon etat': { en: 'Good', fr: 'Bon état', es: 'Buen estado', ru: 'Хорошее', he: 'מצב טוב' }, // i18n-ignore (valeur enregistrée)
  'Correct': { en: 'Fair', fr: 'Correct', es: 'Aceptable', ru: 'Удовлетворительное', he: 'סביר' }, // i18n-ignore (valeur enregistrée)
}

interface ItemCardProps {
  item: Item & { seller?: { display_name?: string; avatar_url?: string | null; country?: string | null } }
  isFavorited?: boolean
  onToggleFavorite?: (itemId: string) => void
}

export default function ItemCard({ item, isFavorited, onToggleFavorite }: ItemCardProps) {
  const lang = getLang()
  const ct = tr(cardText, lang)
  const { profile } = useAuth()
  const sellerName = item.seller?.display_name || ct.seller
  const price = item.current_price ?? item.starting_price
  const imageUrl = item.image_urls?.[0]
  // Devise : pays du vendeur, à défaut celui de l'utilisateur connecté
  const priceCountry = item.seller?.country || profile?.country

  return (
    <Link to={`/item/${item.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      {/* Seller info above card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#222',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0', overflow: 'hidden', flexShrink: 0
        }}>
          {item.seller?.avatar_url ? (
            <img src={item.seller.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            sellerName.charAt(0).toUpperCase()
          )}
        </div>
        <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sellerName}
        </span>
      </div>

      {/* Thumbnail */}
      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#111', aspectRatio: '3/4' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={item.title} loading="lazy" width={300} height={400} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { const img = e.target as HTMLImageElement; img.src = ''; img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; img.alt = '' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* AI badge — top left */}
        <div style={{ position: 'absolute', top: '10px', ...rtlPos('left', '10px') }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
            color: '#001014', fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700,
            padding: '4px 8px', borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,229,255, 0.4)',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#001014" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {ct.ai}
          </span>
        </div>

        {/* Condition badge — top right */}
        {item.ai_condition && (
          <div style={{ position: 'absolute', top: '10px', ...rtlPos('right', '10px') }}>
            <span style={{
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff',
              fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 600, padding: '4px 8px', borderRadius: '8px',
            }}>
              {conditionLabels[item.ai_condition]?.[lang] ?? item.ai_condition}
            </span>
          </div>
        )}

        {/* Favorite heart button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(item.id)
            }}
            aria-label={isFavorited ? ct.removeFav : ct.addFav}
            style={{
              position: 'absolute',
              bottom: '10px',
              ...rtlPos('right', '10px'),
              zIndex: 5,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorited ? '#00E5FF' : 'none'} stroke={isFavorited ? '#00E5FF' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        )}

        {/* Price badge — bottom left */}
        <div style={{ position: 'absolute', bottom: '10px', ...rtlPos('left', '10px') }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700,
            padding: '5px 10px', borderRadius: '8px',
          }}>
            {formatItemPrice(price, priceCountry, lang)}
          </span>
        </div>
      </div>

      {/* Title & category */}
      <div style={{ marginTop: '8px' }}>
        <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </p>
        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, color: '#00E5FF', marginTop: '2px' }}>
          {item.category}
        </p>
      </div>
    </Link>
  )
}
