import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

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

const REACTION_EMOJIS = [
  { emoji: '\u{2764}\u{FE0F}', label: 'coeur' },
  { emoji: '\u{1F525}', label: 'feu' },
  { emoji: '\u{1F44F}', label: 'bravo' },
  { emoji: '\u{1F60D}', label: 'love' },
  { emoji: '\u{1F389}', label: 'fete' },
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
                left: `${reaction.x}%`,
                fontSize: '32px',
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
        {REACTION_EMOJIS.map(({ emoji, label }) => (
          <button
            key={label}
            onTouchEnd={(e) => { e.preventDefault(); handleReaction(emoji) }}
            onClick={() => handleReaction(emoji)}
            aria-label={label}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.06)',
              fontSize: '22px',
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
              el.style.backgroundColor = 'rgba(240,144,138,0.2)'
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
