import type { Item } from '../types/database'
import { getLang } from '../lib/i18n'

interface ItemCardProps {
  item: Item & { seller?: { display_name?: string; avatar_url?: string | null } }
}

export default function ItemCard({ item }: ItemCardProps) {
  const lang = getLang()
  const sellerName = item.seller?.display_name || 'Vendeur'
  const price = item.current_price ?? item.starting_price
  const imageUrl = item.image_urls?.[0]

  const conditionLabels: Record<string, Record<string, string>> = {
    new: { fr: 'Neuf', en: 'New', he: 'חדש', es: 'Nuevo' },
    like_new: { fr: 'Comme neuf', en: 'Like new', he: 'כמו חדש', es: 'Como nuevo' },
    good: { fr: 'Bon etat', en: 'Good', he: 'מצב טוב', es: 'Buen estado' },
    fair: { fr: 'Correct', en: 'Fair', he: 'סביר', es: 'Aceptable' },
  }

  return (
    <div style={{ display: 'block', textDecoration: 'none' }}>
      {/* Seller info above card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#222',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600, color: '#888', overflow: 'hidden', flexShrink: 0
        }}>
          {item.seller?.avatar_url ? (
            <img src={item.seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          <img src={imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
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
          <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
            <span style={{
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff',
              fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '8px',
            }}>
              {conditionLabels[item.ai_condition]?.[lang] || item.ai_condition}
            </span>
          </div>
        )}

        {/* Price badge — bottom left */}
        <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
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
    </div>
  )
}
