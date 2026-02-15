import { useState, useEffect } from 'react'
import { getLang } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Lang = 'fr' | 'en' | 'he' | 'es'

const summaryContent = {
  fr: {
    livePerformance: 'Performance en direct',
    engagementRate7: 'Taux d\'engagement (7 derniers lives)',
    peakViewers: 'Pic de spectateurs',
    avgEngagement: 'Engagement moyen',
    totalReactions: 'Total r\u00E9actions',
    bidsPlaced: 'Ench\u00E8res plac\u00E9es',
    newFollowers: 'Nouveaux followers',
    lastLive: 'Dernier live : \u00E9nergie \u00E9lev\u00E9e !',
    lastLiveDesc: 'Ton audience \u00E9tait 23% plus engag\u00E9e que la moyenne',
    dayLabels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  },
  en: {
    livePerformance: 'Live performance',
    engagementRate7: 'Engagement rate (last 7 lives)',
    peakViewers: 'Peak viewers',
    avgEngagement: 'Avg engagement',
    totalReactions: 'Total reactions',
    bidsPlaced: 'Bids placed',
    newFollowers: 'New followers',
    lastLive: 'Last live: high energy!',
    lastLiveDesc: 'Your audience was 23% more engaged than average',
    dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  he: {
    livePerformance: '\u05D1\u05D9\u05E6\u05D5\u05E2\u05D9 \u05E9\u05D9\u05D3\u05D5\u05E8',
    engagementRate7: '\u05E9\u05D9\u05E2\u05D5\u05E8 \u05DE\u05E2\u05D5\u05E8\u05D1\u05D5\u05EA (7 \u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD)',
    peakViewers: '\u05E9\u05D9\u05D0 \u05E6\u05D5\u05E4\u05D9\u05DD',
    avgEngagement: '\u05DE\u05E2\u05D5\u05E8\u05D1\u05D5\u05EA \u05DE\u05DE\u05D5\u05E6\u05E2\u05EA',
    totalReactions: '\u05E1\u05D4\"\u05DB \u05EA\u05D2\u05D5\u05D1\u05D5\u05EA',
    bidsPlaced: '\u05D4\u05E6\u05E2\u05D5\u05EA \u05E9\u05D4\u05D5\u05D2\u05E9\u05D5',
    newFollowers: '\u05E2\u05D5\u05E7\u05D1\u05D9\u05DD \u05D7\u05D3\u05E9\u05D9\u05DD',
    lastLive: '!\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D5\u05DF: \u05D0\u05E0\u05E8\u05D2\u05D9\u05D4 \u05D2\u05D1\u05D5\u05D4\u05D4',
    lastLiveDesc: '\u05D4\u05E7\u05D4\u05DC \u05E9\u05DC\u05DA \u05D4\u05D9\u05D4 \u05DE\u05E2\u05D5\u05E8\u05D1 23% \u05D9\u05D5\u05EA\u05E8 \u05DE\u05D4\u05DE\u05DE\u05D5\u05E6\u05E2',
    dayLabels: ['\u05D0\u05F3', '\u05D1\u05F3', '\u05D2\u05F3', '\u05D3\u05F3', '\u05D4\u05F3', '\u05D5\u05F3', '\u05E9\u05F3'],
  },
  es: {
    livePerformance: 'Rendimiento en directo',
    engagementRate7: 'Tasa de engagement (ultimos 7 lives)',
    peakViewers: 'Pico de espectadores',
    avgEngagement: 'Engagement promedio',
    totalReactions: 'Total reacciones',
    bidsPlaced: 'Pujas realizadas',
    newFollowers: 'Nuevos seguidores',
    lastLive: 'Ultimo live: energia alta!',
    lastLiveDesc: 'Tu audiencia estuvo 23% mas comprometida que el promedio',
    dayLabels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
  },
}

interface EngagementSummaryData {
  peakViewers: number
  avgEngagement: number
  totalReactions: number
  totalBids: number
  newFollowers: number
  engagementTrend: number[] // last 7 data points
}

function createEmptySummary(): EngagementSummaryData {
  return {
    peakViewers: 0,
    avgEngagement: 0,
    totalReactions: 0,
    totalBids: 0,
    newFollowers: 0,
    engagementTrend: [0, 0, 0, 0, 0, 0, 0],
  }
}

export default function EngagementSummary() {
  const lang = (getLang() || 'fr') as Lang
  const ct = summaryContent[lang] || summaryContent.fr
  const { user } = useAuth()
  const [data, setData] = useState<EngagementSummaryData>(() => createEmptySummary())
  const [mounted, setMounted] = useState(false)
  const [trendDelta, setTrendDelta] = useState(0)

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
  }, [])

  // Fetch real engagement data from recent streams
  useEffect(() => {
    if (!user) return

    const fetchSummary = async () => {
      const { data: streams } = await supabase
        .from('streams')
        .select('peak_viewers, engagement_score, total_reactions')
        .eq('seller_id', user.id)
        .in('status', ['ended', 'live'])
        .order('created_at', { ascending: false })
        .limit(7)

      if (streams && streams.length > 0) {
        const peakViewers = Math.max(...streams.map(s => s.peak_viewers || 0))
        const avgEngagement = Math.round(streams.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / streams.length)
        const totalReactions = streams.reduce((sum, s) => sum + (s.total_reactions || 0), 0)
        const engagementTrend = streams.slice(0, 7).reverse().map(s => s.engagement_score || 0)
        while (engagementTrend.length < 7) engagementTrend.unshift(0)

        const prevAvg = engagementTrend.slice(0, 3).reduce((a, b) => a + b, 0) / 3
        const recentAvg = engagementTrend.slice(4).reduce((a, b) => a + b, 0) / 3
        setTrendDelta(prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : 0)

        setData({
          peakViewers,
          avgEngagement,
          totalReactions,
          totalBids: 0,
          newFollowers: 0,
          engagementTrend,
        })
      }
    }

    fetchSummary()
  }, [user])

  const maxTrend = Math.max(...data.engagementTrend, 1)

  const stats = [
    {
      emoji: '\u{1F441}',
      label: ct.peakViewers,
      value: data.peakViewers.toLocaleString(),
      color: '#F0908A',
    },
    {
      emoji: '\u{1F4C8}',
      label: ct.avgEngagement,
      value: `${data.avgEngagement}%`,
      color: '#22C55E',
    },
    {
      emoji: '\u{2764}\u{FE0F}',
      label: ct.totalReactions,
      value: data.totalReactions.toLocaleString(),
      color: '#A855F7',
    },
    {
      emoji: '\u{1F528}',
      label: ct.bidsPlaced,
      value: data.totalBids.toString(),
      color: '#F59E0B',
    },
    {
      emoji: '\u{1F465}',
      label: ct.newFollowers,
      value: `+${data.newFollowers}`,
      color: '#3B82F6',
    },
  ]

  const dayLabels = ct.dayLabels

  return (
    <div style={{
      padding: '0 16px',
      marginBottom: '24px',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(16px)',
      transition: 'all 0.6s ease 0.2s',
    }}>
      {/* Section Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <span style={{ fontSize: '20px' }}>{'\u{1F4CA}'}</span>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.3px',
          margin: 0,
        }}>
          {ct.livePerformance}
        </h2>
      </div>

      {/* Engagement Trend Chart */}
      <div style={{
        padding: '18px',
        borderRadius: '18px',
        backgroundColor: '#0D0D0D',
        border: '1px solid #1A1A1A',
        marginBottom: '10px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#999',
          }}>
            {ct.engagementRate7}
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#22C55E',
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(34,197,94,0.1)',
          }}>
            {trendDelta >= 0 ? '\u{2191}' : '\u{2193}'} {trendDelta >= 0 ? '+' : ''}{trendDelta}%
          </span>
        </div>

        {/* Bar Chart */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: '100px',
          gap: '6px',
          padding: '0 4px',
        }}>
          {data.engagementTrend.map((val, i) => {
            const heightPercent = (val / maxTrend) * 100
            const isLast = i === data.engagementTrend.length - 1
            return (
              <div key={i} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: isLast ? '#F0908A' : '#555',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                }}>
                  {val}%
                </span>
                <div style={{
                  width: '100%',
                  maxWidth: '32px',
                  borderRadius: '6px 6px 3px 3px',
                  height: `${heightPercent}%`,
                  minHeight: '4px',
                  background: isLast
                    ? 'linear-gradient(to top, #F0908A, #E8344E)'
                    : 'linear-gradient(to top, rgba(255,255,255,0.06), rgba(255,255,255,0.12))',
                  transition: 'height 0.6s ease',
                  boxShadow: isLast ? '0 0 10px rgba(240,144,138,0.3)' : 'none',
                }} />
                <span style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  color: '#555',
                }}>
                  {dayLabels[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
      }}>
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{
              padding: '16px 14px',
              borderRadius: '16px',
              backgroundColor: '#0D0D0D',
              border: '1px solid #1A1A1A',
              ...(i === stats.length - 1 && stats.length % 2 === 1 ? { gridColumn: 'span 2' } : {}),
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '14px' }}>{stat.emoji}</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#777',
              }}>
                {stat.label}
              </span>
            </div>
            <span style={{
              fontSize: '24px',
              fontWeight: 900,
              color: stat.color,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              letterSpacing: '-0.5px',
            }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Last live recap bar */}
      <div style={{
        marginTop: '10px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(240,144,138,0.08) 0%, rgba(168,85,247,0.06) 100%)',
        border: '1px solid rgba(240,144,138,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #F0908A, #E8344E)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}>
          {'\u{1F3AF}'}
        </div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#F0908A', margin: 0 }}>
            {ct.lastLive}
          </p>
          <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
            {ct.lastLiveDesc}
          </p>
        </div>
      </div>
    </div>
  )
}
