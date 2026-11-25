import { useState, useEffect, useRef, useCallback } from 'react'
import { tr, type Localized } from '../../lib/i18n'
import { isRTL } from '../../lib/rtl'
import { supabase } from '../../lib/supabase'
import type { EngagementMetrics } from '../../types/database'

type Level = 'low' | 'medium' | 'high' | 'peak'
type DashTexts = {
  liveEngagement: string
  energyLevel: string
  viewers: string
  activeChatters: string
  bids: string
  reactions: string
  newFollowers: string
  engagementRate: string
  aiRecommendation: string
  chatMood: string
  tip: string
  energyLabels: Record<Level, string>
  sentimentLabels: { positive: string; neutral: string; negative: string }
  aiTips: Record<Level, string[]>
}

const dashContent: Localized<DashTexts> = {
  en: {
    liveEngagement: 'Live engagement',
    energyLevel: 'Energy level',
    viewers: 'Viewers',
    activeChatters: 'Active chatters',
    bids: 'Bids',
    reactions: 'Reactions',
    newFollowers: 'New followers',
    engagementRate: 'Engagement rate',
    aiRecommendation: 'AI tip',
    chatMood: 'Chat mood',
    tip: 'Tip',
    energyLabels: { low: 'Low', medium: 'Medium', high: 'High', peak: 'Peak!' },
    sentimentLabels: { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' },
    aiTips: {
      low: [
        'Show a new item to spark interest!',
        'Ask the chat a question to get viewers involved',
        'Run a mini game or quiz to liven things up',
      ],
      medium: [
        'Great time to launch a surprise auction',
        'Show the details of your next item',
        'Tell a story about a product to hook viewers',
      ],
      high: [
        'The audience is hooked! Show your best item now',
        'Ride the momentum and keep the auctions coming',
        'Time to show your rare pieces!',
      ],
      peak: [
        'Perfect moment! Offer an exclusive deal',
        'Energy is at its peak! Launch your most awaited drop',
        'Offer a flash promo code to boost sales!',
      ],
    },
  },
  fr: {
    liveEngagement: 'Engagement en direct',
    energyLevel: 'Niveau d\'énergie',
    viewers: 'Spectateurs',
    activeChatters: 'Participants actifs au chat',
    bids: 'Enchères',
    reactions: 'Réactions',
    newFollowers: 'Nouveaux abonnés',
    engagementRate: 'Taux d\'engagement',
    aiRecommendation: 'Conseil de l\'IA',
    chatMood: 'Ambiance du chat',
    tip: 'Astuce',
    energyLabels: { low: 'Basse', medium: 'Moyenne', high: 'Élevée', peak: 'Au max !' },
    sentimentLabels: { positive: 'Positive', neutral: 'Neutre', negative: 'Négative' },
    aiTips: {
      low: [
        'Présente un nouvel article pour relancer l\'intérêt !',
        'Pose une question au chat pour faire réagir les spectateurs',
        'Propose un petit jeu ou un quiz pour dynamiser le live',
      ],
      medium: [
        'Bon moment pour lancer une enchère surprise',
        'Montre les détails de ton prochain article',
        'Raconte une anecdote sur un produit pour captiver',
      ],
      high: [
        'L\'audience est captivée ! Lance ton article phare maintenant',
        'Profite de l\'élan pour enchaîner les enchères',
        'C\'est le moment de montrer tes pièces rares !',
      ],
      peak: [
        'Moment parfait ! Propose une offre exclusive',
        'L\'énergie est au maximum ! Lance ton drop le plus attendu',
        'Offre un code promo flash pour maximiser les ventes !',
      ],
    },
  },
  es: {
    liveEngagement: 'Interacción en directo',
    energyLevel: 'Nivel de energía',
    viewers: 'Espectadores',
    activeChatters: 'Participantes en el chat',
    bids: 'Pujas',
    reactions: 'Reacciones',
    newFollowers: 'Nuevos seguidores',
    engagementRate: 'Tasa de interacción',
    aiRecommendation: 'Consejo de la IA',
    chatMood: 'Ambiente del chat',
    tip: 'Consejo',
    energyLabels: { low: 'Baja', medium: 'Media', high: 'Alta', peak: '¡Al máximo!' },
    sentimentLabels: { positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' },
    aiTips: {
      low: [
        '¡Muestra un artículo nuevo para despertar el interés!',
        'Haz una pregunta en el chat para que participen',
        'Propón un minijuego o un quiz para animar el directo',
      ],
      medium: [
        'Buen momento para lanzar una subasta sorpresa',
        'Enseña los detalles de tu próximo artículo',
        'Cuenta una anécdota sobre un producto para enganchar',
      ],
      high: [
        '¡La audiencia está enganchada! Enseña tu mejor artículo ahora',
        'Aprovecha el impulso y encadena subastas',
        '¡Es el momento de enseñar tus piezas más raras!',
      ],
      peak: [
        '¡Momento perfecto! Ofrece un trato exclusivo',
        '¡La energía está al máximo! Lanza tu drop más esperado',
        '¡Ofrece un código promocional relámpago para vender más!',
      ],
    },
  },
  ru: {
    liveEngagement: 'Вовлечённость в эфире',
    energyLevel: 'Уровень энергии',
    viewers: 'Зрители',
    activeChatters: 'Активные в чате',
    bids: 'Ставки',
    reactions: 'Реакции',
    newFollowers: 'Новые подписчики',
    engagementRate: 'Вовлечённость',
    aiRecommendation: 'Совет ИИ',
    chatMood: 'Настроение чата',
    tip: 'Совет',
    energyLabels: { low: 'Низкий', medium: 'Средний', high: 'Высокий', peak: 'На максимуме!' },
    sentimentLabels: { positive: 'Позитивное', neutral: 'Нейтральное', negative: 'Негативное' },
    aiTips: {
      low: [
        'Покажи новый товар, чтобы подогреть интерес!',
        'Задай вопрос в чате, чтобы расшевелить зрителей',
        'Предложи мини-игру или викторину, чтобы оживить эфир',
      ],
      medium: [
        'Отличный момент для аукциона-сюрприза',
        'Покажи детали следующего товара',
        'Расскажи историю о товаре, чтобы увлечь зрителей',
      ],
      high: [
        'Зрители в восторге! Покажи свой лучший товар прямо сейчас',
        'Лови момент и запускай аукционы один за другим',
        'Самое время показать редкие вещи!',
      ],
      peak: [
        'Идеальный момент! Предложи эксклюзивную сделку',
        'Энергия на максимуме! Запускай самый ожидаемый дроп',
        'Дай флеш-промокод, чтобы поднять продажи!',
      ],
    },
  },
  he: {
    liveEngagement: 'מעורבות בשידור',
    energyLevel: 'רמת אנרגיה',
    viewers: 'צופים',
    activeChatters: 'פעילים בצ׳אט',
    bids: 'הצעות',
    reactions: 'תגובות',
    newFollowers: 'עוקבים חדשים',
    engagementRate: 'שיעור מעורבות',
    aiRecommendation: 'המלצת AI',
    chatMood: 'אווירת הצ׳אט',
    tip: 'טיפ',
    energyLabels: { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', peak: 'בשיא!' },
    sentimentLabels: { positive: 'חיובית', neutral: 'ניטרלית', negative: 'שלילית' },
    aiTips: {
      low: [
        'הציגו פריט חדש כדי לעורר עניין!',
        'שאלו שאלה בצ׳אט כדי לשתף את הצופים',
        'הציעו משחקון או חידון כדי להחיות את השידור',
      ],
      medium: [
        'זמן מצוין להשיק מכירה פומבית בהפתעה',
        'הראו את הפרטים של הפריט הבא',
        'ספרו סיפור על מוצר כדי לרתק את הקהל',
      ],
      high: [
        'הקהל מרותק! הציגו עכשיו את הפריט הכי חזק',
        'נצלו את התנופה והמשיכו במכירות ברצף',
        'זה הזמן להראות את הפריטים הנדירים!',
      ],
      peak: [
        'רגע מושלם! הציעו מבצע בלעדי',
        'האנרגיה בשיא! השיקו את הדרופ הכי מבוקש',
        'הציעו קוד הנחה בזק כדי למקסם מכירות!',
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
  const ct = tr(dashContent)
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
      const { data, error } = await supabase
        .from('engagement_metrics')
        .select('*')
        .eq('stream_id', streamId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
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
      insetInlineEnd: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '360px',
      backgroundColor: '#000000DD',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderInlineStart: '1px solid rgba(255,255,255,0.08)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transform: panelVisible ? 'translateX(0)' : isRTL() ? 'translateX(-100%)' : 'translateX(100%)',
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
          <span style={{ fontSize: 'calc(18px * var(--fs, 1))' }}>{'\u{1F4CA}'}</span>
          <span style={{
            fontSize: 'calc(15px * var(--fs, 1))',
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
            fontSize: 'calc(18px * var(--fs, 1))',
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
            <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {ct.energyLevel}
            </span>
            <span style={{
              fontSize: 'calc(13px * var(--fs, 1))',
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
                fontSize: 'calc(9px * var(--fs, 1))',
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
              fontSize: 'calc(10px * var(--fs, 1))',
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
            fontSize: 'calc(13px * var(--fs, 1))',
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
              fontSize: 'calc(11px * var(--fs, 1))',
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
            <span style={{ fontSize: 'calc(22px * var(--fs, 1))', transition: 'all 0.3s ease' }}>{sentiment.emoji}</span>
            <span style={{
              fontSize: 'calc(13px * var(--fs, 1))',
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
        <span style={{ fontSize: 'calc(14px * var(--fs, 1))' }}>{emoji}</span>
        <span style={{
          fontSize: 'calc(10px * var(--fs, 1))',
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
          fontSize: 'calc(22px * var(--fs, 1))',
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
            fontSize: 'calc(14px * var(--fs, 1))',
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
