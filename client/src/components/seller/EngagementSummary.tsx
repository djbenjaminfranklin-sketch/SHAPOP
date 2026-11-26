import { useState, useEffect } from 'react'
import { tr, type Localized } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

type SummaryTexts = {
  livePerformance: string
  engagementRate7: string
  peakViewers: string
  avgEngagement: string
  totalReactions: string
  bidsPlaced: string
  newFollowers: string
  lastLive: string
  lastLiveDesc: string
  dayLabels: string[]
}

const summaryContent: Localized<SummaryTexts> = {
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
  fr: {
    livePerformance: 'Performance en direct',
    engagementRate7: 'Taux d\'engagement (7 derniers lives)',
    peakViewers: 'Pic de spectateurs',
    avgEngagement: 'Engagement moyen',
    totalReactions: 'Total des réactions',
    bidsPlaced: 'Enchères placées',
    newFollowers: 'Nouveaux abonnés',
    lastLive: 'Dernier live : énergie au top !',
    lastLiveDesc: 'Ton audience était 23 % plus engagée que la moyenne',
    dayLabels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  },
  es: {
    livePerformance: 'Rendimiento en directo',
    engagementRate7: 'Tasa de interacción (últimos 7 directos)',
    peakViewers: 'Pico de espectadores',
    avgEngagement: 'Interacción media',
    totalReactions: 'Reacciones totales',
    bidsPlaced: 'Pujas realizadas',
    newFollowers: 'Nuevos seguidores',
    lastLive: '¡Último directo: mucha energía!',
    lastLiveDesc: 'Tu audiencia participó un 23 % más que la media',
    dayLabels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  },
  ru: {
    livePerformance: 'Эффективность эфиров',
    engagementRate7: 'Вовлечённость (последние 7 эфиров)',
    peakViewers: 'Пик зрителей',
    avgEngagement: 'Средняя вовлечённость',
    totalReactions: 'Всего реакций',
    bidsPlaced: 'Ставок сделано',
    newFollowers: 'Новые подписчики',
    lastLive: 'Последний эфир: море энергии!',
    lastLiveDesc: 'Твоя аудитория была на 23 % активнее обычного',
    dayLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  },
  he: {
    livePerformance: 'ביצועי שידור',
    engagementRate7: 'שיעור מעורבות (7 שידורים אחרונים)',
    peakViewers: 'שיא צופים',
    avgEngagement: 'מעורבות ממוצעת',
    totalReactions: 'סה״כ תגובות',
    bidsPlaced: 'הצעות שהוגשו',
    newFollowers: 'עוקבים חדשים',
    lastLive: 'שידור אחרון: אנרגיה גבוהה!',
    lastLiveDesc: 'הקהל שלך היה מעורב ב-23% יותר מהממוצע',
    dayLabels: ['ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳', 'א׳'],
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
  const ct = tr(summaryContent)
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
      const { data: streams, error } = await supabase
        .from('streams')
        .select('peak_viewers, engagement_score, total_reactions')
        .eq('seller_id', user.id)
        .in('status', ['ended', 'live'])
        .order('created_at', { ascending: false })
        .limit(7)

      if (error || !streams) return

      if (streams.length > 0) {
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
      color: '#00E5FF',
    },
    {
      emoji: '\u{1F4C8}',
      label: ct.avgEngagement,
      value: `${data.avgEngagement}%`,
      color: '#00E5FF',
    },
    {
      emoji: '\u{2764}\u{FE0F}',
      label: ct.totalReactions,
      value: data.totalReactions.toLocaleString(),
      color: '#00E5FF',
    },
    {
      emoji: '\u{1F528}',
      label: ct.bidsPlaced,
      value: data.totalBids.toString(),
      color: '#00E5FF',
    },
    {
      emoji: '\u{1F465}',
      label: ct.newFollowers,
      value: `+${data.newFollowers}`,
      color: '#00E5FF',
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
        <span style={{ fontSize: 'calc(20px * var(--fs, 1))' }}>{'\u{1F4CA}'}</span>
        <h2 style={{
          fontSize: 'calc(18px * var(--fs, 1))',
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
            fontSize: 'calc(13px * var(--fs, 1))',
            fontWeight: 700,
            color: '#f0f0f0',
          }}>
            {ct.engagementRate7}
          </span>
          <span style={{
            fontSize: 'calc(12px * var(--fs, 1))',
            fontWeight: 600,
            color: '#00E5FF',
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0,229,255,0.1)',
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
              <div key={dayLabels[i] || i} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{
                  fontSize: 'calc(9px * var(--fs, 1))',
                  fontWeight: 700,
                  color: isLast ? '#00E5FF' : '#f0f0f0',
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
                    ? 'linear-gradient(to top, #00E5FF, #0091EA)'
                    : 'linear-gradient(to top, rgba(255,255,255,0.06), rgba(255,255,255,0.12))',
                  transition: 'height 0.6s ease',
                  boxShadow: isLast ? '0 0 10px rgba(0, 229, 255,0.3)' : 'none',
                }} />
                <span style={{
                  fontSize: 'calc(9px * var(--fs, 1))',
                  fontWeight: 600,
                  color: '#f0f0f0',
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
            key={stat.label}
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
              <span style={{ fontSize: 'calc(14px * var(--fs, 1))' }}>{stat.emoji}</span>
              <span style={{
                fontSize: 'calc(11px * var(--fs, 1))',
                fontWeight: 600,
                color: '#f0f0f0',
              }}>
                {stat.label}
              </span>
            </div>
            <span style={{
              fontSize: 'calc(24px * var(--fs, 1))',
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

      {/* Récapitulatif du dernier live : texte figé (« 23 % plus engagée ») retiré tant qu'il n'est pas calculé */}
      {false && <div style={{
        marginTop: '10px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(0, 229, 255,0.08) 0%, rgba(168,85,247,0.06) 100%)',
        border: '1px solid rgba(0, 229, 255,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'calc(18px * var(--fs, 1))',
          flexShrink: 0,
        }}>
          {'\u{1F3AF}'}
        </div>
        <div>
          <p style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF', margin: 0 }}>
            {ct.lastLive}
          </p>
          <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '2px 0 0' }}>
            {ct.lastLiveDesc}
          </p>
        </div>
      </div>}
    </div>
  )
}
