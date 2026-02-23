import { Link, useNavigate } from 'react-router-dom'
import type { Stream } from '../types/database'
import { t, getLang } from '../lib/i18n'
import { trackStreamView } from '../lib/behaviorTracker'

// Community name lookup for badge display
const COMMUNITY_NAMES: Record<string, string> = {
  'comm-1': 'Paris Marketplace',
  'comm-2': 'Lyon Vintage & Art',
  'comm-3': 'Marseille Deals',
  'comm-4': 'Bordeaux Market',
  'comm-5': 'Madrid Bazaar',
  'comm-6': 'Barcelona Market',
  'comm-7': 'London Fashion',
  'comm-8': 'New York Collectors',
  'comm-9': 'Nice Premium',
  'comm-10': 'Toulouse Market',
}

/** Format viewer count: 1234 → "1.2 k", 52 → "52" */
function fmtViewers(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + ' k'
  return String(n)
}

interface StreamCardProps {
  stream: Stream & { seller?: { display_name?: string; avatar_url?: string | null; store_name?: string }; seller_score?: number; seller_trust_level?: string }
  isFavorited?: boolean
  onToggleFavorite?: (streamId: string) => void
}

export default function StreamCard({ stream, isFavorited, onToggleFavorite }: StreamCardProps) {
  const lang = getLang()
  const navigate = useNavigate()
  const sellerName = stream.seller?.store_name || stream.seller?.display_name || 'Vendeur'
  const communityName = stream.community_id ? COMMUNITY_NAMES[stream.community_id] : null

  const goToSellerProfile = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/seller/${stream.seller_id}`)
  }

  return (
    <Link to={`/stream/${stream.id}`} onClick={() => trackStreamView(stream.category, sellerName)} style={{ display: 'block', textDecoration: 'none' }}>
      {/* Seller info above card */}
      <div
        onClick={goToSellerProfile}
        data-tap="true"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}
      >
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#222',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600, color: '#888', overflow: 'hidden', flexShrink: 0,
          border: '1.5px solid #333',
        }}>
          {stream.seller?.avatar_url ? (
            <img src={stream.seller.avatar_url} alt={sellerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            sellerName.charAt(0).toUpperCase()
          )}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#E5E5E5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sellerName}
        </span>
        {stream.seller_score != null && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            backgroundColor: '#1A1A1A', padding: '2px 6px', borderRadius: '6px',
            fontSize: '11px', fontWeight: 700, color: '#F0908A', flexShrink: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#F0908A" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {stream.seller_score.toFixed(1)}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#151515', aspectRatio: '3/4' }}>
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt={stream.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* Live badge — WhatNot style with viewer count */}
        {stream.status === 'live' && (
          <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              backgroundColor: '#E8344E', color: '#fff',
              fontSize: '12px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px',
              letterSpacing: '0.2px',
            }}>
              {t(lang, 'live')}{stream.viewer_count > 0 && <> · {fmtViewers(stream.viewer_count)}</>}
            </span>
          </div>
        )}

        {stream.status === 'scheduled' && (
          <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
            <span style={{
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff',
              fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '8px'
            }}>
              {t(lang, 'coming_soon')}
            </span>
          </div>
        )}

        {/* Boost badge */}
        {(stream as any).is_boosted && (
          <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#fff', fontSize: '10px', fontWeight: 800,
              padding: '3px 8px', borderRadius: '6px',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
            }}>
              ⚡ BOOST
            </span>
          </div>
        )}

        {/* Match score badge */}
        {stream.matching_score != null && stream.matching_score > 50 && (
          <div style={{ position: 'absolute', top: '10px', right: '8px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              color: '#fff', fontSize: '11px', fontWeight: 700,
              padding: '4px 8px', borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(232, 52, 78, 0.4)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {stream.matching_score}% match
            </span>
          </div>
        )}

        {/* Favorite heart button */}
        {onToggleFavorite && (
          <button
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(stream.id)
            }}
            style={{
              position: 'absolute',
              bottom: communityName ? '36px' : '10px',
              right: '10px', zIndex: 5,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              border: 'none', borderRadius: '50%',
              width: '34px', height: '34px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorited ? '#E8344E' : 'none'} stroke={isFavorited ? '#E8344E' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        )}

        {/* Community badge */}
        {communityName && (
          <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              color: '#F0908A',
              fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px',
              maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {communityName}
            </span>
          </div>
        )}
      </div>

      {/* Title & category — WhatNot style with blue category link */}
      <div style={{ marginTop: '8px', paddingRight: '4px' }}>
        <p style={{
          fontSize: '14px', fontWeight: 700, color: '#fff', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          margin: 0,
        }}>
          {stream.title}
        </p>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#5B9FE4', marginTop: '3px', margin: '3px 0 0' }}>
          {stream.category}
        </p>
      </div>
    </Link>
  )
}
