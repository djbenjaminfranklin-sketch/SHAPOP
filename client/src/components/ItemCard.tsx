import { Link } from 'react-router-dom'
import type { Item } from '../types/database'
import { getLang } from '../lib/i18n'
import { rtlPos } from '../lib/rtl'

interface ItemCardProps {
  item: Item & { seller?: { display_name?: string; avatar_url?: string | null } }
  isFavorited?: boolean
  onToggleFavorite?: (itemId: string) => void
}

export default function ItemCard({ item, isFavorited, onToggleFavorite }: ItemCardProps) {
  const lang = getLang()
  const sellerName = item.seller?.display_name || ({ fr: 'Vendeur', en: 'Seller', he: 'מוכר', es: 'Vendedor' })[getLang()]
  const price = item.current_price ?? item.starting_price
  const imageUrl = item.image_urls?.[0]

  const conditionLabels: Record<string, Record<string, string>> = {
    new: { fr: 'Neuf', en: 'New', he: 'חדש', es: 'Nuevo' },
    like_new: { fr: 'Comme neuf', en: 'Like new', he: 'כמו חדש', es: 'Como nuevo' },
    good: { fr: 'Bon etat', en: 'Good', he: 'מצב טוב', es: 'Buen estado' },
    fair: { fr: 'Correct', en: 'Fair', he: 'סביר', es: 'Aceptable' },
  }

  return (
    <Link to={`/item/${item.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      {/* Seller info above card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#222',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600, color: '#888', overflow: 'hidden', flexShrink: 0
        }}>
          {item.seller?.avatar_url ? (
            <img src={item.seller.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            sellerName.charAt(0).toUpperCase()
          )}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            color: '#fff', fontSize: '11px', fontWeight: 700,
            padding: '4px 8px', borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(232, 52, 78, 0.4)',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            AI
          </span>
        </div>

        {/* Condition badge — top right */}
        {item.ai_condition && (
          <div style={{ position: 'absolute', top: '10px', ...rtlPos('right', '10px') }}>
            <span style={{
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff',
              fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '8px',
            }}>
              {conditionLabels[item.ai_condition]?.[lang] || item.ai_condition}
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
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorited ? '#E8344E' : 'none'} stroke={isFavorited ? '#E8344E' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        )}

        {/* Price badge — bottom left */}
        <div style={{ position: 'absolute', bottom: '10px', ...rtlPos('left', '10px') }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            color: '#fff', fontSize: '14px', fontWeight: 700,
            padding: '5px 10px', borderRadius: '8px',
          }}>
            {price}€
          </span>
        </div>
      </div>

      {/* Title & category */}
      <div style={{ marginTop: '8px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </p>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#F0908A', marginTop: '2px' }}>
          {item.category}
        </p>
      </div>
    </Link>
  )
}
