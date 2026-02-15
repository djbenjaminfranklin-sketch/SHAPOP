import { Link } from 'react-router-dom'
import type { Stream } from '../types/database'
import { t, getLang } from '../lib/i18n'

// Community name lookup for badge display
const COMMUNITY_NAMES: Record<string, string> = {
  'comm-1': 'Tel Aviv Marketplace',
  'comm-2': 'Jerusalem Vintage & Art',
  'comm-3': 'Haifa Tech Deals',
  'comm-4': 'Netanya Beach Market',
  'comm-5': 'Beer Sheva Bazaar',
  'comm-6': 'Eilat Duty Free',
  'comm-7': 'Ashdod Fashion',
  'comm-8': 'Ramat Gan Collectors',
  'comm-9': 'Herzliya Premium',
  'comm-10': 'Rishon LeZion Market',
}

interface StreamCardProps {
  stream: Stream & { seller?: { display_name?: string; avatar_url?: string | null; store_name?: string } }
}

export default function StreamCard({ stream }: StreamCardProps) {
  const lang = getLang()
  const sellerName = stream.seller?.store_name || stream.seller?.display_name || 'Vendeur'
  const communityName = stream.community_id ? COMMUNITY_NAMES[stream.community_id] : null

  return (
    <Link to={`/stream/${stream.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      {/* Seller info above card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#222',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600, color: '#888', overflow: 'hidden', flexShrink: 0
        }}>
          {stream.seller?.avatar_url ? (
            <img src={stream.seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt={stream.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* Live badge */}
        {stream.status === 'live' && (
          <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              backgroundColor: '#E8344E', color: '#fff',
              fontSize: '12px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px',
              letterSpacing: '0.2px'
            }}>
              {t(lang, 'live')} {stream.viewer_count > 0 && <span>· {stream.viewer_count}</span>}
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

        {/* Match score badge */}
        {stream.matching_score != null && stream.matching_score > 50 && (
          <div style={{ position: 'absolute', top: '10px', right: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(232, 52, 78, 0.4)',
              letterSpacing: '0.2px',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {stream.matching_score}% match
            </span>
          </div>
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

      {/* Title & category */}
      <div style={{ marginTop: '8px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stream.title}
        </p>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#F0908A', marginTop: '2px' }}>
          {stream.category}
        </p>
      </div>
    </Link>
  )
}
