import { Link, useNavigate } from 'react-router-dom'
import type { Stream } from '../../types/database'
import { t, getLang, getLocale, tr, type Localized } from '../../lib/i18n'
import { findCommunityById } from '../../lib/data/communitiesData'
import { rtlPos, rtlPadding } from '../../lib/rtl'
import { trackStreamView } from '../../lib/behaviorTracker'
import { PAID_EXTRAS_ENABLED } from '../../lib/paidExtras'

// Anciens identifiants de communautés (avant les identifiants par pays) → nom affiché
const LEGACY_COMMUNITY_IDS: Record<string, string> = {
  'comm-1': 'fr-comm-1',
  'comm-2': 'fr-comm-2',
  'comm-3': 'fr-comm-3',
  'comm-4': 'fr-comm-4',
  'comm-5': 'es-comm-1',
  'comm-6': 'es-comm-2',
  'comm-7': 'gb-comm-1',
  'comm-8': 'us-comm-1',
  'comm-9': 'fr-comm-5',
  'comm-10': 'fr-comm-6',
}

function communityNameFor(id: string): string | null {
  return findCommunityById(LEGACY_COMMUNITY_IDS[id] || id)?.name ?? null
}

type CardText = { seller: string; addFav: string; removeFav: string; boost: string; match: string }
const cardText: Localized<CardText> = {
  en: { seller: 'Seller', addFav: 'Add to favorites', removeFav: 'Remove from favorites', boost: 'BOOST', match: '{n}% match' },
  fr: { seller: 'Vendeur', addFav: 'Ajouter aux favoris', removeFav: 'Retirer des favoris', boost: 'BOOST', match: '{n} % pour toi' },
  es: { seller: 'Vendedor', addFav: 'Añadir a favoritos', removeFav: 'Quitar de favoritos', boost: 'DESTACADO', match: '{n} % para ti' },
  ru: { seller: 'Продавец', addFav: 'Добавить в избранное', removeFav: 'Убрать из избранного', boost: 'ТОП', match: 'Совпадение {n}%' },
  he: { seller: 'מוכר/ת', addFav: 'הוספה למועדפים', removeFav: 'הסרה מהמועדפים', boost: 'מקודם', match: '{n}% התאמה' },
}

/** Nombre de spectateurs : 1234 → « 1,2 k » / « 1.2K » selon la langue, 52 → « 52 » */
function fmtViewers(n: number): string {
  try {
    return new Intl.NumberFormat(getLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  } catch {
    return String(n)
  }
}

interface StreamCardProps {
  stream: Stream & { seller?: { display_name?: string; avatar_url?: string | null; store_name?: string }; seller_score?: number; seller_trust_level?: string; is_boosted?: boolean }
  isFavorited?: boolean
  onToggleFavorite?: (streamId: string) => void
}

export default function StreamCard({ stream, isFavorited, onToggleFavorite }: StreamCardProps) {
  const lang = getLang()
  const ct = tr(cardText, lang)
  const navigate = useNavigate()
  const sellerName = stream.seller?.store_name || stream.seller?.display_name || ct.seller
  const communityName = stream.community_id ? communityNameFor(stream.community_id) : null

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
            <img src={stream.seller.avatar_url} alt={sellerName} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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
            {stream.seller_score.toLocaleString(getLocale(lang), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#151515', aspectRatio: '3/4' }}>
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt={stream.title} loading="lazy" width={300} height={400} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { const img = e.target as HTMLImageElement; img.src = ''; img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; img.alt = '' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* Live badge — WhatNot style with viewer count */}
        {stream.status === 'live' && (
          <div style={{ position: 'absolute', top: '10px', ...rtlPos('left', '10px') }}>
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
          <div style={{ position: 'absolute', top: '10px', ...rtlPos('left', '10px') }}>
            <span style={{
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff',
              fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '8px'
            }}>
              {t(lang, 'coming_soon')}
            </span>
          </div>
        )}

        {/* Boost badge (seulement si les extras payants sont actifs) */}
        {PAID_EXTRAS_ENABLED && stream.is_boosted && (
          <div style={{ position: 'absolute', bottom: '10px', ...rtlPos('left', '10px') }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#fff', fontSize: '10px', fontWeight: 800,
              padding: '3px 8px', borderRadius: '6px',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
            }}>
              <span aria-hidden="true">⚡</span> {ct.boost}
            </span>
          </div>
        )}

        {/* Match score badge */}
        {stream.matching_score != null && stream.matching_score > 50 && (
          <div style={{ position: 'absolute', top: stream.status === 'live' ? '42px' : '10px', ...rtlPos('right', '8px') }}>
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
              {ct.match.replace('{n}', String(stream.matching_score))}
            </span>
          </div>
        )}

        {/* Favorite heart button */}
        {onToggleFavorite && (
          <button
            aria-label={isFavorited ? ct.removeFav : ct.addFav}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(stream.id)
            }}
            style={{
              position: 'absolute',
              bottom: communityName ? '36px' : '10px',
              ...rtlPos('right', '10px'), zIndex: 5,
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
          <div style={{ position: 'absolute', bottom: '10px', ...rtlPos('left', '10px'), ...rtlPos('right', '10px') }}>
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
      <div style={{ marginTop: '8px', ...rtlPadding('right', '4px') }}>
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
