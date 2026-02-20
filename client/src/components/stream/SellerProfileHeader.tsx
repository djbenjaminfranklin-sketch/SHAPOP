interface SellerProfileHeaderProps {
  sellerId: string
  sellerName: string
  sellerAvatar?: string | null
  sellerScore: number | null
  shippingDelay?: number
  isFollowing: boolean
  onFollowToggle: () => void
  lang: 'fr' | 'en' | 'he' | 'es'
}

const FOLLOW_LABELS: Record<string, { follow: string; following: string }> = {
  fr: { follow: 'Suivre', following: 'Suivi' },
  en: { follow: 'Follow', following: 'Following' },
  he: { follow: '\u05E2\u05E7\u05D5\u05D1', following: '\u05E2\u05D5\u05E7\u05D1' },
  es: { follow: 'Seguir', following: 'Siguiendo' },
}

// Star SVG icon
function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#F0908A" stroke="none" style={{ flexShrink: 0 }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// Truck SVG icon for shipping speed
function TruckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

// Plus icon for follow button
function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// Check icon for already following
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const SHIPPING_SUFFIX: Record<string, { day: string; days: string }> = {
  fr: { day: 'j', days: 'j' },
  en: { day: 'd', days: 'd' },
  he: { day: 'י', days: 'י' },
  es: { day: 'd', days: 'd' },
}

export default function SellerProfileHeader({
  sellerName,
  sellerAvatar,
  sellerScore,
  shippingDelay,
  isFollowing,
  onFollowToggle,
  lang,
}: SellerProfileHeaderProps) {
  const labels = FOLLOW_LABELS[lang] || FOLLOW_LABELS.en
  const suffix = SHIPPING_SUFFIX[lang] || SHIPPING_SUFFIX.en
  const days = shippingDelay ?? 2
  const shippingLabel = `${days}${days === 1 ? suffix.day : suffix.days}`

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '5px 8px',
      borderRadius: '100px',
      backgroundColor: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      maxWidth: 'fit-content',
    }}>
      {/* Avatar */}
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: '1.5px solid #F0908A',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: sellerAvatar ? '#111' : 'linear-gradient(135deg, #F0908A, #E8344E)',
      }}>
        {sellerAvatar ? (
          <img
            src={sellerAvatar}
            alt={sellerName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1,
            userSelect: 'none',
          }}>
            {sellerName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name + meta inline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '90px',
        }}>
          {sellerName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {sellerScore != null && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '9px',
              fontWeight: 700,
              color: '#F0908A',
              lineHeight: 1,
            }}>
              <StarIcon />
              {sellerScore.toFixed(1)}
            </span>
          )}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            fontSize: '9px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1,
          }}>
            <TruckIcon />
            {shippingLabel}
          </span>
        </div>
      </div>

      {/* Follow button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onFollowToggle()
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          padding: '4px 8px',
          borderRadius: '100px',
          border: 'none',
          backgroundColor: isFollowing ? 'rgba(255,255,255,0.15)' : '#E8344E',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
          lineHeight: 1,
          WebkitTapHighlightColor: 'transparent',
          transition: 'background-color 0.15s',
        }}
      >
        {isFollowing ? <CheckIcon /> : <PlusIcon />}
        {isFollowing ? labels.following : labels.follow}
      </button>
    </div>
  )
}
