import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'
import { findCommunityById, getCountryDisplayName } from '../lib/communitiesData'
import type { CommunityDisplay } from '../lib/communitiesData'

type Lang = 'fr' | 'en' | 'he' | 'es'

const detailContent = {
  fr: {
    members: 'Membres',
    activeSellers: 'Vendeurs actifs',
    livesPerWeek: 'Lives / semaine',
    leaveCommunity: 'Quitter cette communaute',
    joinCommunity: 'Rejoindre cette communaute',
    livesOngoing: 'Lives en cours',
    live: 'EN DIRECT',
    popularMembers: 'Membres populaires',
    recentActivity: 'Activite recente',
    activities: [
      { text: 'Sarah a mis en vente 3 nouveaux articles', time: 'Il y a 5 min', icon: 'tag' },
      { text: 'David a demarre un live "Sneakers Drops"', time: 'Il y a 12 min', icon: 'video' },
      { text: 'Noa a rejoint la communaute', time: 'Il y a 25 min', icon: 'user-plus' },
      { text: '15 nouveaux membres cette semaine', time: 'Il y a 1h', icon: 'trending-up' },
    ],
  },
  en: {
    members: 'Members',
    activeSellers: 'Active sellers',
    livesPerWeek: 'Lives / week',
    leaveCommunity: 'Leave this community',
    joinCommunity: 'Join this community',
    livesOngoing: 'Lives in progress',
    live: 'LIVE',
    popularMembers: 'Popular members',
    recentActivity: 'Recent activity',
    activities: [
      { text: 'Sarah listed 3 new items for sale', time: '5 min ago', icon: 'tag' },
      { text: 'David started a live "Sneakers Drops"', time: '12 min ago', icon: 'video' },
      { text: 'Noa joined the community', time: '25 min ago', icon: 'user-plus' },
      { text: '15 new members this week', time: '1h ago', icon: 'trending-up' },
    ],
  },
  he: {
    members: '\u05D7\u05D1\u05E8\u05D9\u05DD',
    activeSellers: '\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD',
    livesPerWeek: '\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD / \u05E9\u05D1\u05D5\u05E2',
    leaveCommunity: '\u05E2\u05D6\u05D5\u05D1 \u05D0\u05EA \u05D4\u05E7\u05D4\u05D9\u05DC\u05D4',
    joinCommunity: '\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5 \u05DC\u05E7\u05D4\u05D9\u05DC\u05D4',
    livesOngoing: '\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD',
    live: '\u05E9\u05D9\u05D3\u05D5\u05E8',
    popularMembers: '\u05D7\u05D1\u05E8\u05D9\u05DD \u05E4\u05D5\u05E4\u05D5\u05DC\u05E8\u05D9\u05D9\u05DD',
    recentActivity: '\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D4',
    activities: [
      { text: '\u05E9\u05E8\u05D4 \u05D4\u05E2\u05DC\u05EA\u05D4 3 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D7\u05D3\u05E9\u05D9\u05DD \u05DC\u05DE\u05DB\u05D9\u05E8\u05D4', time: '\u05DC\u05E4\u05E0\u05D9 5 \u05D3\u05E7\u05D5\u05EA', icon: 'tag' },
      { text: '\u05D3\u05D5\u05D3 \u05D4\u05EA\u05D7\u05D9\u05DC \u05E9\u05D9\u05D3\u05D5\u05E8 "Sneakers Drops"', time: '\u05DC\u05E4\u05E0\u05D9 12 \u05D3\u05E7\u05D5\u05EA', icon: 'video' },
      { text: '\u05E0\u05D5\u05E2\u05D4 \u05D4\u05E6\u05D8\u05E8\u05E4\u05D4 \u05DC\u05E7\u05D4\u05D9\u05DC\u05D4', time: '\u05DC\u05E4\u05E0\u05D9 25 \u05D3\u05E7\u05D5\u05EA', icon: 'user-plus' },
      { text: '15 \u05D7\u05D1\u05E8\u05D9\u05DD \u05D7\u05D3\u05E9\u05D9\u05DD \u05D4\u05E9\u05D1\u05D5\u05E2', time: '\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E2\u05D4', icon: 'trending-up' },
    ],
  },
  es: {
    members: 'Miembros',
    activeSellers: 'Vendedores activos',
    livesPerWeek: 'Lives / semana',
    leaveCommunity: 'Salir de esta comunidad',
    joinCommunity: 'Unirse a esta comunidad',
    livesOngoing: 'Lives en curso',
    live: 'EN DIRECTO',
    popularMembers: 'Miembros populares',
    recentActivity: 'Actividad reciente',
    activities: [
      { text: 'Sarah puso en venta 3 nuevos articulos', time: 'Hace 5 min', icon: 'tag' },
      { text: 'David inicio un live "Sneakers Drops"', time: 'Hace 12 min', icon: 'video' },
      { text: 'Noa se unio a la comunidad', time: 'Hace 25 min', icon: 'user-plus' },
      { text: '15 nuevos miembros esta semana', time: 'Hace 1h', icon: 'trending-up' },
    ],
  },
}

// Mock live streams for community
const MOCK_COMMUNITY_STREAMS = [
  {
    id: 'cs-1', title: 'Nouveaux arrivages Mode', seller: 'Sarah_TLV', viewers: 45,
    thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=400&fit=crop',
    category: 'Mode',
  },
  {
    id: 'cs-2', title: 'Sneakers rares du jour', seller: 'KicksMaster', viewers: 82,
    thumbnail: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=300&h=400&fit=crop',
    category: 'Sneakers',
  },
  {
    id: 'cs-3', title: 'Bijoux faits main', seller: 'GoldArt_IL', viewers: 31,
    thumbnail: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=400&fit=crop',
    category: 'Bijoux',
  },
  {
    id: 'cs-4', title: 'Tech deals de folie', seller: 'TechBoy', viewers: 67,
    thumbnail: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&h=400&fit=crop',
    category: 'High-tech',
  },
]

// Mock popular members
const MOCK_MEMBERS = [
  { id: 'm1', name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face' },
  { id: 'm2', name: 'David', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face' },
  { id: 'm3', name: 'Noa', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face' },
  { id: 'm4', name: 'Yoav', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face' },
  { id: 'm5', name: 'Shira', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face' },
  { id: 'm6', name: 'Omer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face' },
  { id: 'm7', name: 'Maya', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face' },
  { id: 'm8', name: 'Eyal', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face' },
]

function formatMemberCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace('.0', '') + 'k'
  }
  return count.toString()
}

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lang = (getLang() || 'fr') as Lang
  const ct = detailContent[lang] || detailContent.fr
  const [community, setCommunity] = useState<CommunityDisplay | null>(null)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    const found = findCommunityById(id || '')
    if (found) {
      setCommunity(found)
    }

    // Check join state
    try {
      const joinedIds: string[] = JSON.parse(localStorage.getItem('shapop_joined_communities') || '[]')
      setJoined(joinedIds.includes(id || ''))
    } catch { /* ignore */ }
  }, [id])

  const toggleJoin = () => {
    try {
      const joinedIds: string[] = JSON.parse(localStorage.getItem('shapop_joined_communities') || '[]')
      let updated: string[]
      if (joined) {
        updated = joinedIds.filter(jid => jid !== id)
      } else {
        updated = [...joinedIds, id || '']
      }
      localStorage.setItem('shapop_joined_communities', JSON.stringify(updated))
      setJoined(!joined)
    } catch { /* ignore */ }
  }

  if (!community) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '32px', height: '32px',
          border: '2px solid #333', borderTopColor: '#F0908A',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Get the country display name dynamically
  const countryDisplayName = getCountryDisplayName(community.country, lang)

  // Pick streams to show based on community live_count
  const activeStreams = MOCK_COMMUNITY_STREAMS.slice(0, community.live_count)

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000',
      paddingBottom: '100px',
    }}>
      {/* Banner image */}
      <div style={{ position: 'relative', width: '100%', height: '220px' }}>
        <img
          src={community.image_url || ''}
          alt={community.name}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)',
        }} />

        {/* Back button */}
        <button
          onClick={() => navigate('/communities')}
          style={{
            position: 'absolute', top: 'calc(env(safe-area-inset-top, 12px) + 8px)', left: '16px',
            width: '38px', height: '38px', borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Community name overlay */}
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
          <h1 style={{
            fontSize: '26px', fontWeight: 800, color: '#fff', margin: 0,
            letterSpacing: '-0.5px', lineHeight: 1.2,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {community.name}
          </h1>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: '14px', color: '#ccc' }}>
              {community.city}, {countryDisplayName}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '20px 20px 0' }}>
        <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.5, margin: 0 }}>
          {community.description}
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', justifyContent: 'space-around',
        padding: '20px 20px',
        margin: '16px 20px 0',
        backgroundColor: '#0D0D0D',
        borderRadius: '16px',
        border: '1px solid #1A1A1A',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
            {formatMemberCount(community.member_count)}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{ct.members}</div>
        </div>
        <div style={{ width: '1px', backgroundColor: '#1A1A1A' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
            {community.active_sellers}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{ct.activeSellers}</div>
        </div>
        <div style={{ width: '1px', backgroundColor: '#1A1A1A' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
            {community.lives_this_week}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{ct.livesPerWeek}</div>
        </div>
      </div>

      {/* Join / Leave button */}
      <div style={{ padding: '20px 20px 0' }}>
        <button
          onClick={toggleJoin}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: '14px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            ...(joined
              ? {
                  backgroundColor: 'transparent',
                  border: '2px solid #333',
                  color: '#999',
                }
              : {
                  backgroundColor: '#F0908A',
                  border: '2px solid #F0908A',
                  color: '#000',
                }
            ),
          }}
        >
          {joined ? ct.leaveCommunity : ct.joinCommunity}
        </button>
      </div>

      {/* Lives en cours */}
      {activeStreams.length > 0 && (
        <div style={{ padding: '28px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: '#E8344E',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }} />
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>
                {ct.livesOngoing}
              </h2>
            </div>
            <span style={{ fontSize: '13px', color: '#F0908A', fontWeight: 600 }}>
              {activeStreams.length} live{activeStreams.length > 1 ? 's' : ''}
            </span>
          </div>

          <div style={{
            display: 'flex', gap: '12px',
            overflowX: 'auto',
            paddingBottom: '4px',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}>
            {activeStreams.map(stream => (
              <div
                key={stream.id}
                onClick={() => navigate(`/stream/${stream.id}`)}
                style={{
                  minWidth: '150px', maxWidth: '150px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'relative', borderRadius: '12px', overflow: 'hidden',
                  aspectRatio: '3/4', backgroundColor: '#111',
                }}>
                  <img
                    src={stream.thumbnail}
                    alt={stream.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
                  }} />
                  {/* Live badge */}
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    backgroundColor: '#E8344E', padding: '3px 8px', borderRadius: '6px',
                  }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>
                      {ct.live}
                    </span>
                  </div>
                  {/* Viewer count */}
                  <div style={{
                    position: 'absolute', bottom: '8px', left: '8px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>
                      {stream.viewers}
                    </span>
                  </div>
                </div>
                <p style={{
                  fontSize: '13px', fontWeight: 600, color: '#fff', margin: '8px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {stream.title}
                </p>
                <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
                  {stream.seller}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Membres populaires */}
      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
          {ct.popularMembers}
        </h2>

        <div style={{
          display: 'flex', gap: '16px',
          overflowX: 'auto',
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {MOCK_MEMBERS.map(member => (
            <div
              key={member.id}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                border: '2px solid #F0908A',
                padding: '2px',
                overflow: 'hidden',
              }}>
                <img
                  src={member.avatar}
                  alt={member.name}
                  style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    objectFit: 'cover', display: 'block',
                  }}
                />
              </div>
              <span style={{
                fontSize: '11px', color: '#ccc', marginTop: '6px',
                fontWeight: 500,
              }}>
                {member.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity section */}
      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
          {ct.recentActivity}
        </h2>

        {ct.activities.map((activity, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '12px 0',
              borderBottom: i < 3 ? '1px solid #111' : 'none',
            }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              backgroundColor: '#111', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activity.icon === 'tag' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {activity.icon === 'video' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {activity.icon === 'user-plus' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {activity.icon === 'trending-up' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', color: '#ccc', margin: 0, lineHeight: 1.4 }}>
                {activity.text}
              </p>
              <p style={{ fontSize: '11px', color: '#555', margin: '3px 0 0' }}>
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Keyframe for live dot pulse */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
