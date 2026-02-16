import { useState, useEffect, useRef, useCallback } from 'react'
import { getLang } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import type { EngagementMetrics } from '../types/database'

type Lang = 'fr' | 'en' | 'he' | 'es'

const dashContent = {
  fr: {
    liveEngagement: 'Engagement en direct',
    energyLevel: 'Niveau d\'\u00E9nergie',
    viewers: 'Spectateurs',
    activeChatters: 'Chatteurs actifs',
    bids: 'Ench\u00E8res',
    reactions: 'R\u00E9actions',
    newFollowers: 'Nouveaux followers',
    engagementRate: 'Taux d\'engagement',
    aiRecommendation: 'Recommandation IA',
    chatMood: 'Ambiance du chat',
    tip: 'Astuce',
    energyLabels: { low: 'Bas', medium: 'Moyen', high: '\u00C9lev\u00E9', peak: 'Au max!' },
    sentimentLabels: { positive: 'Positif', neutral: 'Neutre', negative: 'N\u00E9gatif' },
    aiTips: {
      low: [
        'Pr\u00E9sente un nouvel article pour relancer l\'int\u00E9r\u00EAt !',
        'Pose une question au chat pour engager les spectateurs',
        'Propose un petit jeu ou quiz pour dynamiser le live',
      ],
      medium: [
        'Bon moment pour lancer une ench\u00E8re surprise',
        'Montre les d\u00E9tails de ton prochain article',
        'Partage une anecdote sur un produit pour captiver',
      ],
      high: [
        'L\'audience est captiv\u00E9e ! Lance ton article phare maintenant',
        'Profite de l\'\u00E9lan pour encha\u00EEner les ench\u00E8res',
        'C\'est le moment de montrer tes pi\u00E8ces rares !',
      ],
      peak: [
        'Moment parfait ! Propose une offre exclusive',
        'L\'\u00E9nergie est au maximum ! Lance ton drop le plus attendu',
        'Offre un code promo flash pour maximiser les ventes !',
      ],
    },
  },
  en: {
    liveEngagement: 'Live engagement',
    energyLevel: 'Energy level',
    viewers: 'Viewers',
    activeChatters: 'Active chatters',
    bids: 'Bids',
    reactions: 'Reactions',
    newFollowers: 'New followers',
    engagementRate: 'Engagement rate',
    aiRecommendation: 'AI Recommendation',
    chatMood: 'Chat mood',
    tip: 'Tip',
    energyLabels: { low: 'Low', medium: 'Medium', high: 'High', peak: 'Peak!' },
    sentimentLabels: { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' },
    aiTips: {
      low: [
        'Show a new item to spark interest!',
        'Ask the chat a question to engage viewers',
        'Suggest a mini game or quiz to liven things up',
      ],
      medium: [
        'Great time to launch a surprise auction',
        'Show details of your next item',
        'Share a story about a product to captivate',
      ],
      high: [
        'The audience is hooked! Show your best item now',
        'Ride the momentum and chain auctions',
        'Time to show your rare pieces!',
      ],
      peak: [
        'Perfect moment! Offer an exclusive deal',
        'Energy is at max! Launch your most awaited drop',
        'Offer a flash promo code to maximize sales!',
      ],
    },
  },
  he: {
    liveEngagement: '\u05DE\u05E2\u05D5\u05E8\u05D1\u05D5\u05EA \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8',
    energyLevel: '\u05E8\u05DE\u05EA \u05D0\u05E0\u05E8\u05D2\u05D9\u05D4',
    viewers: '\u05E6\u05D5\u05E4\u05D9\u05DD',
    activeChatters: '\u05E6\u05F3\u05D0\u05D8 \u05E4\u05E2\u05D9\u05DC',
    bids: '\u05D4\u05E6\u05E2\u05D5\u05EA',
    reactions: '\u05EA\u05D2\u05D5\u05D1\u05D5\u05EA',
    newFollowers: '\u05E2\u05D5\u05E7\u05D1\u05D9\u05DD \u05D7\u05D3\u05E9\u05D9\u05DD',
    engagementRate: '\u05E9\u05D9\u05E2\u05D5\u05E8 \u05DE\u05E2\u05D5\u05E8\u05D1\u05D5\u05EA',
    aiRecommendation: '\u05D4\u05DE\u05DC\u05E6\u05EA AI',
    chatMood: '\u05D0\u05D5\u05D5\u05D9\u05E8\u05EA \u05D4\u05E6\u05F3\u05D0\u05D8',
    tip: '\u05D8\u05D9\u05E4',
    energyLabels: { low: '\u05E0\u05DE\u05D5\u05DA', medium: '\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9', high: '\u05D2\u05D1\u05D5\u05D4', peak: '!\u05E9\u05D9\u05D0' },
    sentimentLabels: { positive: '\u05D7\u05D9\u05D5\u05D1\u05D9', neutral: '\u05E0\u05D9\u05D8\u05E8\u05DC\u05D9', negative: '\u05E9\u05DC\u05D9\u05DC\u05D9' },
    aiTips: {
      low: [
        '!\u05D4\u05E6\u05D2 \u05E4\u05E8\u05D9\u05D8 \u05D7\u05D3\u05E9 \u05DC\u05E2\u05D5\u05E8\u05E8 \u05E2\u05E0\u05D9\u05D9\u05DF',
        '\u05E9\u05D0\u05DC \u05E9\u05D0\u05DC\u05D4 \u05D1\u05E6\u05F3\u05D0\u05D8 \u05DB\u05D3\u05D9 \u05DC\u05E2\u05D5\u05E8\u05E8 \u05D0\u05EA \u05D4\u05E6\u05D5\u05E4\u05D9\u05DD',
        '\u05D4\u05E6\u05E2 \u05DE\u05E9\u05D7\u05E7 \u05D0\u05D5 \u05D7\u05D9\u05D3\u05D5\u05DF \u05DC\u05D4\u05D7\u05D9\u05D5\u05EA \u05D0\u05EA \u05D4\u05E9\u05D9\u05D3\u05D5\u05E8',
      ],
      medium: [
        '\u05D6\u05DE\u05DF \u05DE\u05E6\u05D5\u05D9\u05DF \u05DC\u05D4\u05E9\u05D9\u05E7 \u05DE\u05DB\u05D9\u05E8\u05D4 \u05DE\u05E4\u05EA\u05D9\u05E2\u05D4',
        '\u05D4\u05E8\u05D0\u05D4 \u05E4\u05E8\u05D8\u05D9\u05DD \u05E9\u05DC \u05D4\u05E4\u05E8\u05D9\u05D8 \u05D4\u05D1\u05D0',
        '\u05E9\u05EA\u05E3 \u05E1\u05D9\u05E4\u05D5\u05E8 \u05E2\u05DC \u05DE\u05D5\u05E6\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05E8\u05EA\u05E7',
      ],
      high: [
        '!\u05D4\u05E7\u05D4\u05DC \u05DE\u05E8\u05D5\u05EA\u05E7 - \u05D4\u05E6\u05D2 \u05D0\u05EA \u05D4\u05E4\u05E8\u05D9\u05D8 \u05D4\u05DE\u05D5\u05D1\u05D9\u05DC \u05E2\u05DB\u05E9\u05D9\u05D5',
        '\u05E0\u05E6\u05DC \u05D0\u05EA \u05D4\u05EA\u05E0\u05D5\u05E4\u05D4 \u05D5\u05E9\u05E8\u05E9\u05E8 \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA',
        '!\u05D6\u05D4 \u05D4\u05D6\u05DE\u05DF \u05DC\u05D4\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D4\u05E0\u05D3\u05D9\u05E8\u05D9\u05DD',
      ],
      peak: [
        '!\u05E8\u05D2\u05E2 \u05DE\u05D5\u05E9\u05DC\u05DD - \u05D4\u05E6\u05E2 \u05DE\u05D1\u05E6\u05E2 \u05D1\u05DC\u05E2\u05D3\u05D9',
        '!\u05D4\u05D0\u05E0\u05E8\u05D2\u05D9\u05D4 \u05D1\u05E9\u05D9\u05D0 - \u05D4\u05E9\u05E7 \u05D0\u05EA \u05D4\u05D3\u05E8\u05D5\u05E4 \u05D4\u05DB\u05D9 \u05DE\u05D1\u05D5\u05E7\u05E9',
        '!\u05D4\u05E6\u05E2 \u05E7\u05D5\u05D3 \u05E4\u05E8\u05D5\u05DE\u05D5 \u05DE\u05D4\u05D9\u05E8 \u05DC\u05DE\u05E7\u05E1\u05DD \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA',
      ],
    },
  },
  es: {
    liveEngagement: 'Engagement en directo',
    energyLevel: 'Nivel de energia',
    viewers: 'Espectadores',
    activeChatters: 'Chatters activos',
    bids: 'Pujas',
    reactions: 'Reacciones',
    newFollowers: 'Nuevos seguidores',
    engagementRate: 'Tasa de engagement',
    aiRecommendation: 'Recomendacion IA',
    chatMood: 'Ambiente del chat',
    tip: 'Consejo',
    energyLabels: { low: 'Bajo', medium: 'Medio', high: 'Alto', peak: 'Al maximo!' },
    sentimentLabels: { positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' },
    aiTips: {
      low: [
        'Muestra un nuevo articulo para despertar interes!',
        'Haz una pregunta en el chat para enganchar a los espectadores',
        'Propone un mini juego o quiz para animar el live',
      ],
      medium: [
        'Buen momento para lanzar una subasta sorpresa',
        'Muestra los detalles de tu proximo articulo',
        'Comparte una anecdota sobre un producto para cautivar',
      ],
      high: [
        'La audiencia esta enganchada! Muestra tu mejor articulo ahora',
        'Aprovecha el impulso y encadena subastas',
        'Es el momento de mostrar tus piezas raras!',
      ],
      peak: [
        'Momento perfecto! Ofrece un trato exclusivo',
        'La energia esta al maximo! Lanza tu drop mas esperado',
        'Ofrece un codigo promo flash para maximizar ventas!',
      ],
    },
  },
}

interface EngagementDashboardProps {
  streamId: string
  isVisible: boolean
  onClose: () => void
}

const ENERGY_COLORS = {
  low: { color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', percent: 25 },
  medium: { color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', percent: 50 },
  high: { color: '#22C55E', gradient: 'linear-gradient(135deg, #22C55E, #16A34A)', percent: 75 },
  peak: { color: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7, #9333EA)', percent: 100 },
}

const AI_ICONS: Record<string, string> = {
  low: '\u{1F4A1}',
  medium: '\u{1F4E6}',
  high: '\u{1F525}',
  peak: '\u{2B50}',
}

function createEmptyMetrics(): EngagementMetrics {
  return {
    id: '',
    stream_id: '',
    timestamp: new Date().toISOString(),
    viewer_count: 0,
    active_chatters: 0,
    bids_count: 0,
    reactions_count: 0,
    new_followers: 0,
    engagement_rate: 0,
    sentiment_score: 0.5,
    energy_level: 'low',
  }
}

function computeEnergyLevel(metrics: EngagementMetrics): 'low' | 'medium' | 'high' | 'peak' {
  const score =
    (metrics.viewer_count > 100 ? 25 : metrics.viewer_count > 50 ? 15 : 5) +
    (metrics.active_chatters > 30 ? 25 : metrics.active_chatters > 15 ? 15 : 5) +
    (metrics.engagement_rate > 60 ? 25 : metrics.engagement_rate > 35 ? 15 : 5) +
    (metrics.bids_count > 8 ? 25 : metrics.bids_count > 4 ? 15 : 5)
  if (score >= 85) return 'peak'
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

function getSentiment(score: number, labels: { positive: string; neutral: string; negative: string }): { emoji: string; label: string; key: string } {
  if (score >= 0.65) return { emoji: '\u{1F60A}', label: labels.positive, key: 'positive' }
  if (score >= 0.35) return { emoji: '\u{1F610}', label: labels.neutral, key: 'neutral' }
  return { emoji: '\u{1F61F}', label: labels.negative, key: 'negative' }
}

export default function EngagementDashboard({ streamId, isVisible, onClose }: EngagementDashboardProps) {
  const lang = (getLang() || 'fr') as Lang
  const ct = dashContent[lang] || dashContent.fr
  const [metrics, setMetrics] = useState<EngagementMetrics>(() => createEmptyMetrics())
  const [prevViewerCount, setPrevViewerCount] = useState(metrics.viewer_count)
  const [aiRecommendation, setAiRecommendation] = useState('')
  const [aiSlideIn, setAiSlideIn] = useState(true)
  const [panelVisible, setPanelVisible] = useState(false)
  const metricsRef = useRef(metrics)
  metricsRef.current = metrics

  // Animate panel entrance
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPanelVisible(true))
      })
    } else {
      setPanelVisible(false)
    }
  }, [isVisible])

  // Fetch real engagement metrics from Supabase
  useEffect(() => {
    if (!streamId) return

    const fetchMetrics = async () => {
      const { data } = await supabase
        .from('engagement_metrics')
        .select('*')
        .eq('stream_id', streamId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        const updated = { ...data, energy_level: computeEnergyLevel(data) } as EngagementMetrics
        setPrevViewerCount(metrics.viewer_count)
        setMetrics(updated)
      }
    }

    fetchMetrics()

    const channel = supabase
      .channel(`engagement-${streamId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'engagement_metrics',
        filter: `stream_id=eq.${streamId}`,
      }, (payload) => {
        const row = payload.new as EngagementMetrics
        const updated = { ...row, energy_level: computeEnergyLevel(row) }
        setPrevViewerCount(metricsRef.current.viewer_count)
        setMetrics(updated)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [streamId]) // eslint-disable-line react-hooks/exhaustive-deps

  // AI recommendations rotation
  const rotateRecommendation = useCallback(() => {
    const level = metricsRef.current.energy_level
    const recs = ct.aiTips[level as keyof typeof ct.aiTips]
    const rec = recs[Math.floor(Math.random() * recs.length)]
    setAiSlideIn(false)
    setTimeout(() => {
      setAiRecommendation(`${AI_ICONS[level]} ${ct.tip} : ${rec}`)
      setAiSlideIn(true)
    }, 400)
  }, [ct])

  useEffect(() => {
    rotateRecommendation()
    const interval = setInterval(rotateRecommendation, 17000)
    return () => clearInterval(interval)
  }, [rotateRecommendation])

  const energyColors = ENERGY_COLORS[metrics.energy_level]
  const energyLabel = ct.energyLabels[metrics.energy_level as keyof typeof ct.energyLabels]
  const viewerTrend = metrics.viewer_count >= prevViewerCount ? 'up' : 'down'
  const sentiment = getSentiment(metrics.sentiment_score, ct.sentimentLabels)

  if (!isVisible) return null

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '360px',
      backgroundColor: '#000000DD',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transform: panelVisible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{'\u{1F4CA}'}</span>
          <span style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.3px',
          }}>{ct.liveEngagement}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: '#999',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {'\u{2715}'}
        </button>
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* ── Energy Level Gauge ── */}
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {ct.energyLevel}
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: 800,
              color: energyColors.color,
              padding: '3px 10px',
              borderRadius: '8px',
              backgroundColor: `${energyColors.color}18`,
            }}>
              {energyLabel}
            </span>
          </div>

          {/* Gauge Bar */}
          <div style={{
            width: '100%',
            height: '12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              height: '100%',
              width: `${energyColors.percent}%`,
              borderRadius: '6px',
              background: energyColors.gradient,
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background 0.8s ease',
              boxShadow: `0 0 12px ${energyColors.color}60`,
              position: 'relative',
            }}>
              {/* Animated shimmer */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                animation: 'gaugeShimmer 2s infinite',
              }} />
            </div>
          </div>

          {/* Gauge labels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
          }}>
            {(['low', 'medium', 'high', 'peak'] as const).map(level => (
              <span key={level} style={{
                fontSize: '9px',
                fontWeight: 600,
                color: metrics.energy_level === level ? ENERGY_COLORS[level].color : '#444',
                transition: 'color 0.4s ease',
              }}>
                {ct.energyLabels[level]}
              </span>
            ))}
          </div>
        </div>

        {/* ── Live Metrics Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}>
          <MetricCard
            emoji={'\u{1F441}'}
            label={ct.viewers}
            value={metrics.viewer_count}
            trend={viewerTrend}
          />
          <MetricCard
            emoji={'\u{1F4AC}'}
            label={ct.activeChatters}
            value={metrics.active_chatters}
          />
          <MetricCard
            emoji={'\u{1F528}'}
            label={ct.bids}
            value={metrics.bids_count}
          />
          <MetricCard
            emoji={'\u{2764}\u{FE0F}'}
            label={ct.reactions}
            value={metrics.reactions_count}
          />
          <MetricCard
            emoji={'\u{1F465}'}
            label={ct.newFollowers}
            value={metrics.new_followers}
            prefix="+"
          />
          <MetricCard
            emoji={'\u{1F4C8}'}
            label={ct.engagementRate}
            value={metrics.engagement_rate}
            suffix="%"
            accentColor="#F0908A"
          />
        </div>

        {/* ── AI Recommendation Card ── */}
        <div style={{
          padding: '16px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(240,144,138,0.08) 0%, rgba(168,85,247,0.08) 100%)',
          border: '1px solid rgba(240,144,138,0.15)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '80px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '10px',
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#F0908A',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
            }}>
              {ct.aiRecommendation}
            </span>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#F0908A',
              animation: 'pulse 2s ease infinite',
            }} />
          </div>
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#ddd',
            lineHeight: 1.5,
            opacity: aiSlideIn ? 1 : 0,
            transform: aiSlideIn ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}>
            {aiRecommendation}
          </p>
        </div>

        {/* ── Sentiment Indicator ── */}
        <div style={{
          padding: '14px 16px',
          borderRadius: '16px',
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}>
              {ct.chatMood}
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '22px', transition: 'all 0.3s ease' }}>{sentiment.emoji}</span>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              color: sentiment.key === 'positive' ? '#22C55E' : sentiment.key === 'neutral' ? '#F59E0B' : '#EF4444',
              transition: 'color 0.3s ease',
            }}>
              {sentiment.label}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gaugeShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

// ── Metric Card sub-component ──
function MetricCard({
  emoji,
  label,
  value,
  trend,
  prefix = '',
  suffix = '',
  accentColor,
}: {
  emoji: string
  label: string
  value: number
  trend?: 'up' | 'down'
  prefix?: string
  suffix?: string
  accentColor?: string
}) {
  return (
    <div style={{
      padding: '14px 12px',
      borderRadius: '14px',
      backgroundColor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '14px' }}>{emoji}</span>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: '#777',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          fontSize: '22px',
          fontWeight: 800,
          color: accentColor || '#fff',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          letterSpacing: '-0.5px',
          transition: 'color 0.3s ease',
        }}>
          {prefix}{value.toLocaleString()}{suffix}
        </span>
        {trend && (
          <span style={{
            fontSize: '14px',
            color: trend === 'up' ? '#22C55E' : '#EF4444',
            fontWeight: 700,
            transition: 'color 0.3s ease',
          }}>
            {trend === 'up' ? '\u{2191}' : '\u{2193}'}
          </span>
        )}
      </div>
    </div>
  )
}
