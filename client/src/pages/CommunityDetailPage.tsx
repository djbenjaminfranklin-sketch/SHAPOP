import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLang, getLocale, tr, type Lang, type Localized } from '../lib/i18n'
import { findCommunityById, getCountryDisplayName, getCommunityDescription } from '../lib/data/communitiesData'
import type { CommunityDisplay } from '../lib/data/communitiesData'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { rtlPos, rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'
import PageBackButton from '../components/PageBackButton'
import CommunityCover from '../components/CommunityCover'

interface RecentStream {
  id: string
  title: string
  status: 'scheduled' | 'live' | 'ended'
  seller_name: string
  viewer_count: number
  created_at: string
}

type PluralForms = { one: string; few: string; many: string; other: string }
type DetailText = {
  title: string
  back: string
  members: string
  activeSellers: string
  livesPerWeek: string
  leaveCommunity: string
  joinCommunity: string
  livesOngoing: string
  live: string
  popularMembers: string
  recentActivity: string
  noRecentActivity: string
  streamEnded: string
  streamLive: string
  streamScheduled: string
  loadingActivity: string
  justNow: string
  lives: PluralForms
  viewers: PluralForms
}

// {n} = nombre ; few/many servent au russe (ailleurs = other)
const detailContent: Localized<DetailText> = {
  en: {
    title: 'Community',
    back: 'Back',
    members: 'Members',
    activeSellers: 'Active sellers',
    livesPerWeek: 'Lives / week',
    leaveCommunity: 'Leave this community',
    joinCommunity: 'Join this community',
    livesOngoing: 'Live now',
    live: 'LIVE',
    popularMembers: 'Popular members',
    recentActivity: 'Recent activity',
    noRecentActivity: 'No recent activity',
    streamEnded: 'Ended',
    streamLive: 'Live',
    streamScheduled: 'Scheduled',
    loadingActivity: 'Loading...',
    justNow: 'Just now',
    lives: { one: '{n} live', few: '{n} lives', many: '{n} lives', other: '{n} lives' },
    viewers: { one: '{n} viewer', few: '{n} viewers', many: '{n} viewers', other: '{n} viewers' },
  },
  fr: {
    title: 'Communauté',
    back: 'Retour',
    members: 'Membres',
    activeSellers: 'Vendeurs actifs',
    livesPerWeek: 'Lives / semaine',
    leaveCommunity: 'Quitter cette communauté',
    joinCommunity: 'Rejoindre cette communauté',
    livesOngoing: 'Lives en cours',
    live: 'EN DIRECT',
    popularMembers: 'Membres populaires',
    recentActivity: 'Activité récente',
    noRecentActivity: 'Aucune activité récente',
    streamEnded: 'Terminé',
    streamLive: 'En direct',
    streamScheduled: 'Programmé',
    loadingActivity: 'Chargement...',
    justNow: 'À l\'instant',
    lives: { one: '{n} live', few: '{n} lives', many: '{n} lives', other: '{n} lives' },
    viewers: { one: '{n} spectateur', few: '{n} spectateurs', many: '{n} spectateurs', other: '{n} spectateurs' },
  },
  es: {
    title: 'Comunidad',
    back: 'Atrás',
    members: 'Miembros',
    activeSellers: 'Vendedores activos',
    livesPerWeek: 'Directos / semana',
    leaveCommunity: 'Salir de esta comunidad',
    joinCommunity: 'Unirme a esta comunidad',
    livesOngoing: 'Directos en curso',
    live: 'EN DIRECTO',
    popularMembers: 'Miembros populares',
    recentActivity: 'Actividad reciente',
    noRecentActivity: 'No hay actividad reciente',
    streamEnded: 'Finalizado',
    streamLive: 'En directo',
    streamScheduled: 'Programado',
    loadingActivity: 'Cargando...',
    justNow: 'Ahora mismo',
    lives: { one: '{n} directo', few: '{n} directos', many: '{n} directos', other: '{n} directos' },
    viewers: { one: '{n} espectador', few: '{n} espectadores', many: '{n} espectadores', other: '{n} espectadores' },
  },
  ru: {
    title: 'Сообщество',
    back: 'Назад',
    members: 'Участники',
    activeSellers: 'Активные продавцы',
    livesPerWeek: 'Эфиров в неделю',
    leaveCommunity: 'Выйти из сообщества',
    joinCommunity: 'Вступить в сообщество',
    livesOngoing: 'Эфиры сейчас',
    live: 'В ЭФИРЕ',
    popularMembers: 'Популярные участники',
    recentActivity: 'Недавняя активность',
    noRecentActivity: 'Пока нет активности',
    streamEnded: 'Завершён',
    streamLive: 'В эфире',
    streamScheduled: 'Запланирован',
    loadingActivity: 'Загрузка...',
    justNow: 'Только что',
    lives: { one: '{n} эфир', few: '{n} эфира', many: '{n} эфиров', other: '{n} эфира' },
    viewers: { one: '{n} зритель', few: '{n} зрителя', many: '{n} зрителей', other: '{n} зрителя' },
  },
  he: {
    title: 'קהילה',
    back: 'חזרה',
    members: 'חברים',
    activeSellers: 'מוכרים פעילים',
    livesPerWeek: 'שידורים בשבוע',
    leaveCommunity: 'יציאה מהקהילה',
    joinCommunity: 'הצטרפות לקהילה',
    livesOngoing: 'שידורים חיים עכשיו',
    live: 'בשידור חי',
    popularMembers: 'חברים פופולריים',
    recentActivity: 'פעילות אחרונה',
    noRecentActivity: 'אין פעילות אחרונה',
    streamEnded: 'הסתיים',
    streamLive: 'בשידור חי',
    streamScheduled: 'מתוכנן',
    loadingActivity: 'טוען...',
    justNow: 'הרגע',
    lives: { one: 'שידור אחד', few: '{n} שידורים', many: '{n} שידורים', other: '{n} שידורים' },
    viewers: { one: 'צופה אחד', few: '{n} צופים', many: '{n} צופים', other: '{n} צופים' },
  },
}

/** Nombre compact selon la langue : 1 234 → « 1,2 k » / « 1.2K » */
function formatCount(n: number): string {
  try {
    return new Intl.NumberFormat(getLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  } catch {
    return String(n)
  }
}

function plural(forms: PluralForms, n: number): string {
  const rule = new Intl.PluralRules(getLocale()).select(n)
  const form = rule === 'one' || rule === 'few' || rule === 'many' ? forms[rule] : forms.other
  return form.replace('{n}', formatCount(n))
}

/** « il y a 5 min », « 2 h ago », « לפני 3 ימים »… via Intl.RelativeTimeFormat */
function formatTimeAgo(dateStr: string, lang: Lang): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return tr(detailContent, lang).justNow
  const rtf = new Intl.RelativeTimeFormat(getLocale(lang), { numeric: 'auto', style: 'short' })
  if (diffMin < 60) return rtf.format(-diffMin, 'minute')
  if (diffHours < 24) return rtf.format(-diffHours, 'hour')
  return rtf.format(-diffDays, 'day')
}

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang = getLang()
  const ct = tr(detailContent, lang)
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
        display: 'flex', flexDirection: 'column',
      }}>
        <PageBackButton fallback="/communities" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '2px solid #333', borderTopColor: '#00E5FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
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
        <CommunityCover city={community.city || community.name} country={community.country || ''} size="banner" />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)',
        }} />

        {/* Back button */}
        <button
          onClick={() => navigate('/communities')}
          aria-label={ct.back}
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
        <div style={{ position: 'absolute', bottom: '20px', insetInlineStart: '20px', insetInlineEnd: '20px' }}>
          <h1 style={{
            fontSize: 'calc(26px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0,
            letterSpacing: '-0.5px', lineHeight: 1.2,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {community.name}
          </h1>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#ccc' }}>
              {community.city}, {countryDisplayName}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '20px 20px 0' }}>
        <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.5, margin: 0 }}>
          {getCommunityDescription(community, lang)}
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
          <div style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>
            {formatCount(community.member_count)}
          </div>
          <div style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', marginTop: '2px' }}>{ct.members}</div>
        </div>
        <div style={{ width: '1px', backgroundColor: '#1A1A1A' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>
            {community.active_sellers}
          </div>
          <div style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', marginTop: '2px' }}>{ct.activeSellers}</div>
        </div>
        <div style={{ width: '1px', backgroundColor: '#1A1A1A' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>
            {community.lives_this_week}
          </div>
          <div style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', marginTop: '2px' }}>{ct.livesPerWeek}</div>
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
            fontSize: 'calc(16px * var(--fs, 1))',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            ...(joined
              ? {
                  backgroundColor: 'transparent',
                  border: '2px solid #333',
                  color: '#f0f0f0',
                }
              : {
                  backgroundColor: '#00E5FF',
                  border: '2px solid #00E5FF',
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
                backgroundColor: '#00E5FF',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }} />
              <h2 style={{ fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
                {ct.livesOngoing}
              </h2>
            </div>
            <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#00E5FF', fontWeight: 600 }}>
              {plural(ct.lives, activeStreams.length)}
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
                    position: 'absolute', top: '8px', insetInlineStart: '8px',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    backgroundColor: '#00E5FF', padding: '3px 8px', borderRadius: '6px',
                  }}>
                    <span style={{ fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>
                      {ct.live}
                    </span>
                  </div>
                  {/* Viewer count */}
                  <div style={{
                    position: 'absolute', bottom: '8px', insetInlineStart: '8px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 600, color: '#fff' }}>
                      {formatCount(stream.viewers)}
                    </span>
                  </div>
                </div>
                <p style={{
                  fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: '8px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {stream.title}
                </p>
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '2px 0 0' }}>
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
          <h2 style={{ fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
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
                  border: '2px solid #00E5FF',
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
                  fontSize: 'calc(11px * var(--fs, 1))', color: '#ccc', marginTop: '6px',
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
        <h2 style={{ fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
          {ct.recentActivity}
        </h2>

        {loadingActivity ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '24px', height: '24px',
              border: '2px solid #333', borderTopColor: '#00E5FF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 8px',
            }} />
            <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', margin: 0 }}>{ct.loadingActivity}</p>
          </div>
        ) : recentStreams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" style={{ margin: '0 auto 10px', display: 'block' }}>
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: 0 }}>
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
            const statusColor = stream.status === 'live' ? '#E8344E' : stream.status === 'ended' ? '#666' : '#00E5FF'

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
                    fontSize: 'calc(13px * var(--fs, 1))', color: '#ccc', margin: 0, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {stream.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                    <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
                      {stream.seller_name}
                    </span>
                    <span style={{
                      fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: statusColor,
                      padding: '1px 6px', borderRadius: '4px',
                      backgroundColor: stream.status === 'live' ? 'rgba(232,52,78,0.15)' : 'transparent',
                    }}>
                      {statusLabel}
                    </span>
                    {stream.viewer_count > 0 && (
                      <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
                        {plural(ct.viewers, stream.viewer_count)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '3px 0 0' }}>
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
