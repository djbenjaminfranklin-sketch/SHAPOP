import { useRef, useState, useCallback } from 'react'
import { useMiniPlayer } from '../../contexts/MiniPlayerContext'
import { rtlPos } from '../../lib/rtl'
import LiveKitViewer from './LiveKitViewer'

export default function MiniPlayerOverlay() {
  const { miniPlayer, closeMiniPlayer, expandMiniPlayer } = useMiniPlayer()
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef({ startX: 0, startY: 0, startOffX: 0, startOffY: 0, dragging: false })

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    dragRef.current = {
      startX: t.clientX, startY: t.clientY,
      startOffX: offset.x, startOffY: offset.y,
      dragging: false,
    }
  }, [offset])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    const dx = t.clientX - dragRef.current.startX
    const dy = t.clientY - dragRef.current.startY
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.dragging = true
    setOffset({ x: dragRef.current.startOffX + dx, y: dragRef.current.startOffY + dy })
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current.dragging) {
      expandMiniPlayer()
    }
  }, [expandMiniPlayer])

  if (!miniPlayer) return null

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={() => { if (!dragRef.current.dragging) expandMiniPlayer() }}
      style={{
        position: 'fixed',
        bottom: `${80 - offset.y}px`,
        ...rtlPos('right', `${12 - offset.x}px`),
        zIndex: 200,
        width: '160px',
        height: '100px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        border: '2px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        touchAction: 'none',
      }}
    >
      <LiveKitViewer
        livekitUrl={miniPlayer.lkUrl}
        livekitToken={miniPlayer.lkToken}
        muted={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Overlay info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '4px 8px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
          <span style={{
            fontSize: '8px', fontWeight: 700, color: '#fff',
            backgroundColor: '#E8344E', padding: '1px 4px', borderRadius: '3px',
            lineHeight: '12px',
          }}>
            LIVE
          </span>
          <span style={{
            fontSize: '10px', color: '#fff', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {miniPlayer.sellerName}
          </span>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); closeMiniPlayer() }}
        style={{
          position: 'absolute', top: '4px', ...rtlPos('right', '4px'),
          width: '22px', height: '22px', borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.6)', border: 'none',
          color: '#fff', fontSize: '12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  )
}
