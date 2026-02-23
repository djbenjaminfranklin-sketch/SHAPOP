import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'
import { findCommunityById, getCountryDisplayName } from '../lib/data/communitiesData'
import type { CommunityDisplay } from '../lib/data/communitiesData'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { rtlPos, rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type Lang = 'fr' | 'en' | 'he' | 'es'

interface RecentStream {
  id: string
  title: string
  status: 'scheduled' | 'live' | 'ended'
  seller_name: string
  viewer_count: number
  created_at: string
}

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
    noRecentActivity: 'Aucune activite recente',
    viewers: 'spectateurs',
    streamEnded: 'Termine',
    streamLive: 'En direct',
    streamScheduled: 'Programme',
    loadingActivity: 'Chargement...',
    liveSingular: 'live',
    livePlural: 'lives',
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
    noRecentActivity: 'No recent activity',
    viewers: 'viewers',
    streamEnded: 'Ended',
    streamLive: 'Live',
    streamScheduled: 'Scheduled',
    loadingActivity: 'Loading...',
    liveSingular: 'live',
    livePlural: 'lives',
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
    noRecentActivity: '\u05D0\u05D9\u05DF \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA',
    viewers: '\u05E6\u05D5\u05E4\u05D9\u05DD',
    streamEnded: '\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD',
    streamLive: '\u05E9\u05D9\u05D3\u05D5\u05E8',
    streamScheduled: '\u05DE\u05EA\u05D5\u05DB\u05E0\u05DF',
    loadingActivity: '\u05D8\u05D5\u05E2\u05DF...',
    liveSingular: '\u05E9\u05D9\u05D3\u05D5\u05E8',
    livePlural: '\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD',
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
    noRecentActivity: 'No hay actividad reciente',
    viewers: 'espectadores',
    streamEnded: 'Finalizado',
    streamLive: 'En directo',
    streamScheduled: 'Programado',
    loadingActivity: 'Cargando...',
    liveSingular: 'directo',
    livePlural: 'directos',
  },
}

function formatMemberCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace('.0', '') + 'k'
  }
  return count.toString()
}

function formatTimeAgo(dateStr: string, lang: Lang): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  const labels = {
    fr: { min: 'min', hour: 'h', day: 'j', ago: 'Il y a' },
    en: { min: 'min ago', hour: 'h ago', day: 'd ago', ago: '' },
    he: { min: '\u05D3\u05E7\u05D5\u05EA', hour: '\u05E9\u05E2\u05D5\u05EA', day: '\u05D9\u05DE\u05D9\u05DD', ago: '\u05DC\u05E4\u05E0\u05D9' },
    es: { min: 'min', hour: 'h', day: 'd', ago: 'Hace' },
  }
  const l = labels[lang] || labels.en

  if (diffMin < 1) {
    return lang === 'en' ? 'Just now' : lang === 'fr' ? 'A l\'instant' : lang === 'he' ? '\u05E2\u05DB\u05E9\u05D9\u05D5' : 'Ahora mismo'
  }
  if (diffMin < 60) {
    return lang === 'en' ? `${diffMin} ${l.min}` : `${l.ago} ${diffMin} ${l.min}`
  }
  if (diffHours < 24) {
    return lang === 'en' ? `${diffHours}${l.hour}` : `${l.ago} ${diffHours}${l.hour}`
  }
  return lang === 'en' ? `${diffDays}${l.day}` : `${l.ago} ${diffDays}${l.day}`
}

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = detailContent[lang] || detailContent.fr
  const [community, setCommunity] = useState<CommunityDisplay | null>(null)
  usePageTitle(community?.name || ct.title)
  const [joined, setJoined] = useState(false)
  const [activeStreams, setActiveStreams] = useState<{id: string, title: string, seller: string, viewers: number, thumbnail: string}[]>([])
  const [members, setMembers] = useState<{id: string, name: string, avatar: string}[]>([])
  const [recentStreams, setRecentStreams] = useState<RecentStream[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)

  useEffect(() => {
    const found = findCommunityById(id || '')
    if (found) {
      setCommunity(found)
    }
  }, [id])

  useEffect(() => {
    if (profile?.joined_communities) {
      setJoined(profile.joined_communities.includes(id || ''))
    }
  }, [id, profile])

  useEffect(() => {
    if (!community) return
    const fetchStreams = async () => {
      const { data } = await supabase
        .from('streams')
        .select('id, title, viewer_count, thumbnail_url, seller:sellers(store_name)')
        .eq('status', 'live')
        .eq('city', community.city)
        .limit(4)
      if (data) {
        setActiveStreams(data.map((s: { id: string; title: string; viewer_count: number; thumbnail_url: string | null; seller: { store_name: string }[] | null }) => ({
          id: s.id,
          title: s.title,
          seller: s.seller?.[0]?.store_name || '?',
          viewers: s.viewer_count || 0,
          thumbnail: s.thumbnail_url || '',
        })))
      }
    }
    fetchStreams()
  }, [community])

  useEffect(() => {
    if (!id) return
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .contains('joined_communities', [id])
        .limit(8)
      if (data) {
        setMembers(data.map(p => ({
          id: p.id,
          name: p.display_name,
          avatar: p.avatar_url || '',
        })))
      }
    }
    fetchMembers()
  }, [id])

  // Fetch recent activity from streams table
  useEffect(() => {
    if (!id) return
    const fetchRecentActivity = async () => {
      setLoadingActivity(true)
      try {
        const { data } = await supabase
          .from('streams')
          .select('id, title, status, viewer_count, created_at, seller:sellers(store_name)')
          .eq('community_id', id)
          .order('created_at', { ascending: false })
          .limit(10)
        if (data) {
          setRecentStreams(data.map((s: { id: string; title: string; status: string; viewer_count: number; created_at: string; seller: { store_name: string }[] | null }) => ({
            id: s.id,
            title: s.title,
            status: s.status as "scheduled" | "live" | "ended",
            seller_name: s.seller?.[0]?.store_name || '?',
            viewer_count: s.viewer_count || 0,
            created_at: s.created_at,
          })))
        }
      } catch (err) {
        console.error('Error fetching recent activity:', err)
      } finally {
        setLoadingActivity(false)
      }
    }
    fetchRecentActivity()
  }, [id])

  const toggleJoin = async () => {
    if (!user || !profile) return
    const currentIds = profile.joined_communities || []
    const updated = joined
      ? currentIds.filter(jid => jid !== id)
      : [...currentIds, id || '']
    const { error } = await supabase.from('profiles').update({ joined_communities: updated }).eq('id', user.id)
    if (error) {
      console.error('[Community] toggle join failed:', error.message)
      return
    }
    setJoined(!joined)
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
          loading="lazy"
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
            position: 'absolute', top: 'calc(env(safe-area-inset-top, 12px) + 8px)', ...rtlPos('left', '16px'),
            width: '38px', height: '38px', borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{...rtlFlip()}}>
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
              {activeStreams.length} {activeStreams.length > 1 ? ct.livePlural : ct.liveSingular}
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
                    loading="lazy"
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
      {members.length > 0 && (
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
            {members.map(member => (
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
                    loading="lazy"
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
      )}

      {/* Recent activity section */}
      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
          {ct.recentActivity}
        </h2>

        {loadingActivity ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '24px', height: '24px',
              border: '2px solid #333', borderTopColor: '#F0908A',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 8px',
            }} />
            <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>{ct.loadingActivity}</p>
          </div>
        ) : recentStreams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" style={{ margin: '0 auto 10px', display: 'block' }}>
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>
              {ct.noRecentActivity}
            </p>
          </div>
        ) : (
          recentStreams.map((stream, i) => {
            const statusLabel = stream.status === 'live'
              ? ct.streamLive
              : stream.status === 'ended'
                ? ct.streamEnded
                : ct.streamScheduled
            const statusColor = stream.status === 'live' ? '#E8344E' : stream.status === 'ended' ? '#666' : '#F0908A'

            return (
              <div
                key={stream.id}
                onClick={() => navigate(`/stream/${stream.id}`)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 0',
                  borderBottom: i < recentStreams.length - 1 ? '1px solid #111' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  backgroundColor: '#111', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '13px', color: '#ccc', margin: 0, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {stream.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#888' }}>
                      {stream.seller_name}
                    </span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: statusColor,
                      padding: '1px 6px', borderRadius: '4px',
                      backgroundColor: stream.status === 'live' ? 'rgba(232,52,78,0.15)' : 'transparent',
                    }}>
                      {statusLabel}
                    </span>
                    {stream.viewer_count > 0 && (
                      <span style={{ fontSize: '11px', color: '#555' }}>
                        {stream.viewer_count} {ct.viewers}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: '#555', margin: '3px 0 0' }}>
                    {formatTimeAgo(stream.created_at, lang)}
                  </p>
                </div>
              </div>
            )
          })
        )}
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
