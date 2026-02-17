import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'
import {
  getCommunitiesByCountry,
  getAllCommunities,
  detectUserCountry,
  COUNTRIES,
  getCountryDisplayName,
} from '../lib/communitiesData'
import type { CommunityDisplay, CountryCode } from '../lib/communitiesData'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Lang = 'fr' | 'en' | 'he' | 'es'

const pageContent = {
  fr: {
    localCommunities: 'Communautes locales',
    subtitle: 'Rejoins les vendeurs et acheteurs de ta ville',
    searchPlaceholder: 'Rechercher une communaute...',
    communities: 'Communautes',
    membersLabel: 'Membres',
    activeLives: 'Lives actifs',
    nearYou: 'Pres de chez toi',
    discoverMore: 'Decouvrir plus',
    noCommunityFound: 'Aucune communaute trouvee',
    tryOtherKeyword: 'Essaie avec un autre mot-cle',
    members: 'membres',
    join: 'Rejoindre',
    memberCheck: 'Membre \u2713',
    yourCountry: 'Ton pays',
    liveSingular: 'live',
    livePlural: 'lives',
  },
  en: {
    localCommunities: 'Local communities',
    subtitle: 'Join sellers and buyers in your city',
    searchPlaceholder: 'Search a community...',
    communities: 'Communities',
    membersLabel: 'Members',
    activeLives: 'Active lives',
    nearYou: 'Near you',
    discoverMore: 'Discover more',
    noCommunityFound: 'No community found',
    tryOtherKeyword: 'Try another keyword',
    members: 'members',
    join: 'Join',
    memberCheck: 'Member \u2713',
    yourCountry: 'Your country',
    liveSingular: 'live',
    livePlural: 'lives',
  },
  he: {
    localCommunities: '\u05E7\u05D4\u05D9\u05DC\u05D5\u05EA \u05DE\u05E7\u05D5\u05DE\u05D9\u05D5\u05EA',
    subtitle: '\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5 \u05DC\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05D5\u05E7\u05D5\u05E0\u05D9\u05DD \u05D1\u05E2\u05D9\u05E8 \u05E9\u05DC\u05DA',
    searchPlaceholder: '\u05D7\u05E4\u05E9 \u05E7\u05D4\u05D9\u05DC\u05D4...',
    communities: '\u05E7\u05D4\u05D9\u05DC\u05D5\u05EA',
    membersLabel: '\u05D7\u05D1\u05E8\u05D9\u05DD',
    activeLives: '\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD',
    nearYou: '\u05E7\u05E8\u05D5\u05D1 \u05D0\u05DC\u05D9\u05DA',
    discoverMore: '\u05D2\u05DC\u05D4 \u05E2\u05D5\u05D3',
    noCommunityFound: '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4 \u05E7\u05D4\u05D9\u05DC\u05D4',
    tryOtherKeyword: '\u05E0\u05E1\u05D4 \u05DE\u05D9\u05DC\u05EA \u05DE\u05E4\u05EA\u05D7 \u05D0\u05D7\u05E8\u05EA',
    members: '\u05D7\u05D1\u05E8\u05D9\u05DD',
    join: '\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5',
    memberCheck: '\u05D7\u05D1\u05E8 \u2713',
    yourCountry: '\u05D4\u05DE\u05D3\u05D9\u05E0\u05D4 \u05E9\u05DC\u05DA',
    liveSingular: '\u05E9\u05D9\u05D3\u05D5\u05E8',
    livePlural: '\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD',
  },
  es: {
    localCommunities: 'Comunidades locales',
    subtitle: 'Unete a vendedores y compradores de tu ciudad',
    searchPlaceholder: 'Buscar una comunidad...',
    communities: 'Comunidades',
    membersLabel: 'Miembros',
    activeLives: 'Lives activos',
    nearYou: 'Cerca de ti',
    discoverMore: 'Descubrir mas',
    noCommunityFound: 'No se encontro ninguna comunidad',
    tryOtherKeyword: 'Intenta con otra palabra clave',
    members: 'miembros',
    join: 'Unirse',
    memberCheck: 'Miembro \u2713',
    yourCountry: 'Tu pais',
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

export { getAllCommunities }
export type { CommunityDisplay }

export default function CommunitiesPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = pageContent[lang] || pageContent.fr
  const [search, setSearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    return (profile?.country as CountryCode) || detectUserCountry()
  })
  const [joinedIds, setJoinedIds] = useState<string[]>([])
  const [realMemberCounts, setRealMemberCounts] = useState<Record<string, number>>({})
  const [realLiveCounts, setRealLiveCounts] = useState<Record<string, number>>({})
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (profile?.joined_communities) {
      setJoinedIds(profile.joined_communities)
    }
  }, [profile])

  // Fetch real member counts from Supabase communities table
  const fetchRealData = useCallback(async () => {
    setLoadingData(true)
    try {
      // Fetch real member_count from communities table
      const { data: communitiesData } = await supabase
        .from('communities')
        .select('id, member_count')
      if (communitiesData) {
        const counts: Record<string, number> = {}
        communitiesData.forEach((c: any) => {
          counts[c.id] = c.member_count ?? 0
        })
        setRealMemberCounts(counts)
      }

      // Fetch real live stream counts grouped by community_id
      const { data: liveStreams } = await supabase
        .from('streams')
        .select('community_id')
        .eq('status', 'live')
        .not('community_id', 'is', null)
      if (liveStreams) {
        const liveCounts: Record<string, number> = {}
        liveStreams.forEach((s: any) => {
          if (s.community_id) {
            liveCounts[s.community_id] = (liveCounts[s.community_id] || 0) + 1
          }
        })
        setRealLiveCounts(liveCounts)
      }
    } catch (err) {
      console.error('Error fetching community data:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    fetchRealData()
  }, [fetchRealData])

  // Save country preference to Supabase
  useEffect(() => {
    if (user) {
      supabase.from('profiles').update({ country: selectedCountry }).eq('id', user.id)
    }
  }, [selectedCountry, user])

  const toggleJoin = async (e: React.MouseEvent, communityId: string) => {
    e.stopPropagation()
    const updated = joinedIds.includes(communityId)
      ? joinedIds.filter(id => id !== communityId)
      : [...joinedIds, communityId]
    setJoinedIds(updated)
    if (user) {
      await supabase.from('profiles').update({ joined_communities: updated }).eq('id', user.id)
    }
  }

  // Get static community list but overlay real data from Supabase
  const staticCommunities = getCommunitiesByCountry(selectedCountry)
  const communities = staticCommunities.map(c => ({
    ...c,
    member_count: realMemberCounts[c.id] ?? (loadingData ? 0 : c.member_count),
    live_count: realLiveCounts[c.id] ?? 0,
  }))

  const filtered = search.trim()
    ? communities.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.city.toLowerCase().includes(search.toLowerCase())
      )
    : communities

  // Compute stats for selected country using real data
  const totalMembers = communities.reduce((sum, c) => sum + c.member_count, 0)
  const totalLives = communities.reduce((sum, c) => sum + c.live_count, 0)
  const formattedMembers = totalMembers >= 1000
    ? (totalMembers / 1000).toFixed(1).replace('.0', '') + 'k'
    : totalMembers.toString()

  // Split into "nearby" (first 4) and "discover" (rest) for visual grouping
  const nearby = filtered.slice(0, 4)
  const discover = filtered.slice(4)

  const countryName = getCountryDisplayName(selectedCountry, lang)

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #F0908A, #E06860)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0,
              letterSpacing: '-0.3px',
            }}>
              {ct.localCommunities}
            </h1>
          </div>
        </div>
        <p style={{
          fontSize: '14px', color: '#888', margin: '6px 0 0 0',
          lineHeight: 1.4,
        }}>
          {ct.subtitle}
        </p>
      </div>

      {/* Country selector */}
      <div style={{ padding: '16px 20px 0' }}>
        <p style={{
          fontSize: '12px', color: '#666', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.5px',
          marginBottom: '10px', margin: '0 0 10px 0',
        }}>
          {ct.yourCountry}
        </p>
        <div style={{
          display: 'flex', gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch' as const,
          scrollbarWidth: 'none' as const,
        }}>
          {COUNTRIES.map(country => (
            <button
              key={country.code}
              onClick={() => setSelectedCountry(country.code)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '4px',
                padding: '10px 14px', borderRadius: '12px',
                border: selectedCountry === country.code
                  ? '1.5px solid #F0908A'
                  : '1.5px solid #222',
                backgroundColor: selectedCountry === country.code
                  ? 'rgba(240,144,138,0.12)'
                  : '#0D0D0D',
                cursor: 'pointer',
                flexShrink: 0,
                minWidth: '64px',
              }}
            >
              <span style={{ fontSize: '22px', lineHeight: 1 }}>{country.flag}</span>
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: selectedCountry === country.code ? '#F0908A' : '#888',
                whiteSpace: 'nowrap',
              }}>
                {country.name[lang] || country.name.en}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          backgroundColor: '#111', border: '1.5px solid #222',
          borderRadius: '14px', padding: '12px 16px',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={ct.searchPlaceholder}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#fff', fontSize: '15px', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Stats banner */}
      <div style={{
        margin: '20px 20px 0',
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(240,144,138,0.05))',
        borderRadius: '16px',
        border: '1px solid rgba(240,144,138,0.2)',
        display: 'flex',
        justifyContent: 'space-around',
      }}>
        {[
          { value: String(communities.length), label: ct.communities },
          { value: formattedMembers, label: ct.membersLabel },
          { value: String(totalLives), label: ct.activeLives },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#F0908A' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Nearby Communities */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>
            {ct.nearYou} - {countryName}
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}>
          {nearby.map(community => (
            <CommunityCard
              key={community.id}
              community={community}
              joined={joinedIds.includes(community.id)}
              onToggleJoin={toggleJoin}
              onTap={() => navigate(`/community/${community.id}`)}
              ct={ct}
            />
          ))}
        </div>
      </div>

      {/* Discover more */}
      {discover.length > 0 && (
        <div style={{ padding: '28px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {ct.discoverMore}
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
            {discover.map(community => (
              <CommunityCard
                key={community.id}
                community={community}
                joined={joinedIds.includes(community.id)}
                onToggleJoin={toggleJoin}
                onTap={() => navigate(`/community/${community.id}`)}
                ct={ct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" style={{ margin: '0 auto' }}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ color: '#555', fontSize: '15px', margin: 0 }}>
            {ct.noCommunityFound}
          </p>
          <p style={{ color: '#444', fontSize: '13px', marginTop: '4px' }}>
            {ct.tryOtherKeyword}
          </p>
        </div>
      )}
    </div>
  )
}

// ------- Community Card Component -------

function CommunityCard({ community, joined, onToggleJoin, onTap, ct }: {
  community: CommunityDisplay
  joined: boolean
  onToggleJoin: (e: React.MouseEvent, id: string) => void
  onTap: () => void
  ct: typeof pageContent['fr']
}) {
  return (
    <div
      onClick={onTap}
      style={{
        backgroundColor: '#0D0D0D',
        border: '1px solid #1A1A1A',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
        <img
          src={community.image_url || ''}
          alt={community.name}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
        }} />

        {/* Live indicator */}
        {community.live_count > 0 && (
          <div style={{
            position: 'absolute', top: '8px', left: '8px',
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: 'rgba(232,52,78,0.9)', backdropFilter: 'blur(4px)',
            padding: '3px 8px', borderRadius: '8px',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: '#fff',
              animation: 'pulse-dot 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>
              {community.live_count} {community.live_count > 1 ? ct.livePlural : ct.liveSingular}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px' }}>
        <h3 style={{
          fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {community.name}
        </h3>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          marginTop: '4px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '12px', color: '#888' }}>{community.city}</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          marginTop: '4px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {formatMemberCount(community.member_count)} {ct.members}
          </span>
        </div>

        {/* Join button */}
        <button
          onClick={(e) => onToggleJoin(e, community.id)}
          style={{
            width: '100%',
            marginTop: '10px',
            padding: '8px 0',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            ...(joined
              ? {
                  backgroundColor: 'rgba(240,144,138,0.15)',
                  border: '1.5px solid rgba(240,144,138,0.3)',
                  color: '#F0908A',
                }
              : {
                  backgroundColor: '#F0908A',
                  border: '1.5px solid #F0908A',
                  color: '#000',
                }
            ),
          }}
        >
          {joined ? ct.memberCheck : ct.join}
        </button>
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
