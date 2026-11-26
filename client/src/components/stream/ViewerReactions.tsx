import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { tr, type Localized } from '../../lib/i18n'

interface ViewerReactionsProps {
  onReaction: () => void
  sendReaction?: (emoji: string) => void
}

interface FloatingReaction {
  id: number
  emoji: string
  x: number
  startTime: number
}

// key : identifiant technique stable ; label : nom lu par le lecteur d'écran
const REACTION_EMOJIS: { emoji: string; key: string; label: Localized<string> }[] = [
  { emoji: '\u{2764}\u{FE0F}', key: 'heart', label: { en: 'Heart', fr: 'Cœur', es: 'Corazón', ru: 'Сердце', he: 'לב' } },
  { emoji: '\u{1F525}', key: 'fire', label: { en: 'Fire', fr: 'Feu', es: 'Fuego', ru: 'Огонь', he: 'אש' } },
  { emoji: '\u{1F44F}', key: 'clap', label: { en: 'Applause', fr: 'Bravo', es: 'Aplausos', ru: 'Аплодисменты', he: 'מחיאות כפיים' } },
  { emoji: '\u{1F60D}', key: 'love', label: { en: 'Love it', fr: "J'adore", es: 'Me encanta', ru: 'Обожаю', he: 'מת/ה על זה' } },
  { emoji: '\u{1F389}', key: 'party', label: { en: 'Party', fr: 'Fête', es: 'Fiesta', ru: 'Праздник', he: 'חגיגה' } },
]

let reactionIdCounter = 0

export default function ViewerReactions({ onReaction, sendReaction }: ViewerReactionsProps) {
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const cleanupTimerRef = useRef<number | null>(null)

  // Cleanup old floating reactions periodically
  useEffect(() => {
    cleanupTimerRef.current = window.setInterval(() => {
      const now = Date.now()
      setFloatingReactions(prev => prev.filter(r => now - r.startTime < 2200))
    }, 500)
    return () => {
      if (cleanupTimerRef.current) clearInterval(cleanupTimerRef.current)
    }
  }, [])

  const lastReactionRef = useRef(0)

  const handleReaction = useCallback((emoji: string) => {
    const now = Date.now()
    if (now - lastReactionRef.current < 300) return // debounce double-tap
    lastReactionRef.current = now

    onReaction()
    if (sendReaction) sendReaction(emoji)

    const id = ++reactionIdCounter
    const x = 10 + Math.random() * 80 // random horizontal position (%)

    setFloatingReactions(prev => [
      ...prev,
      { id, emoji, x, startTime: Date.now() },
    ])
  }, [onReaction, sendReaction])

  return (
    <>
      {/* Floating reactions — rendered via portal at document.body to avoid iOS clipping */}
      {floatingReactions.length > 0 && createPortal(
        <div style={{
          position: 'fixed',
          bottom: '120px',
          left: 0,
          right: 0,
          height: '250px',
          pointerEvents: 'none',
          zIndex: 9999,
          overflow: 'visible',
        }}>
          {floatingReactions.map(reaction => (
            <div
              key={reaction.id}
              style={{
                position: 'absolute',
                bottom: '0',
                insetInlineStart: `${reaction.x}%`,
                fontSize: 'calc(32px * var(--fs, 1))',
                animation: 'floatUpReaction 2s ease-out forwards',
                pointerEvents: 'none',
              }}
            >
              {reaction.emoji}
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Reaction buttons bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '20px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {REACTION_EMOJIS.map(({ emoji, key, label }) => (
          <button
            key={key}
            onTouchEnd={(e) => { e.preventDefault(); handleReaction(emoji) }}
            onClick={() => handleReaction(emoji)}
            aria-label={tr(label)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.06)',
              fontSize: 'calc(22px * var(--fs, 1))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.1s',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
            onTouchStart={e => {
              const el = e.currentTarget
              el.style.transform = 'scale(1.3)'
              el.style.backgroundColor = 'rgba(0, 229, 255,0.2)'
            }}
            onPointerUp={e => {
              const el = e.currentTarget
              el.style.transform = 'scale(1)'
              el.style.backgroundColor = 'rgba(255,255,255,0.06)'
            }}
            onPointerLeave={e => {
              const el = e.currentTarget
              el.style.transform = 'scale(1)'
              el.style.backgroundColor = 'rgba(255,255,255,0.06)'
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes floatUpReaction {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-120px) scale(1.3);
          }
          100% {
            opacity: 0;
            transform: translateY(-250px) scale(0.8);
          }
        }
      `}</style>
    </>
  )
}
