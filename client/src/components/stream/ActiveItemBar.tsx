import { useState, useEffect } from 'react'
import type { Item } from '../../types/database'
import { hapticTap } from '../../lib/haptics'

interface ActiveItemBarProps {
  item: Item | null
  bidAmount: string
  onBidAmountChange: (value: string) => void
  onBid: () => void
  hasCard: boolean | null
  hasAddress: boolean | null
  onAddCard: () => void
  onAddAddress: () => void
  disabled?: boolean
  timeLeft?: number
  lang: 'fr' | 'en' | 'he' | 'es'
  onMaxBid?: () => void
  hasActiveMaxBid?: boolean
  bundleCount?: number
  onBuyNow?: () => void
}

const LABELS: Record<string, {
  bid: string
  currentPrice: string
  unavailable: string
  addCard: string
  addAddress: string
  max: string
  shippingGrouped: string
  maxBid: string
  maxBidActive: string
  bundleDiscount: string
  buyNow: string
}> = {
  fr: {
    bid: 'Encherir',
    currentPrice: 'Prix actuel',
    unavailable: 'Article non disponible',
    addCard: 'Ajoute ta carte',
    addAddress: 'Ajoute ton adresse',
    max: 'MAX',
    shippingGrouped: 'Livraison groupee en fin de live',
    maxBid: 'Enchere max',
    maxBidActive: 'Auto-enchere active',
    bundleDiscount: 'Shipping groupe : -15%',
    buyNow: 'Acheter',
  },
  en: {
    bid: 'Bid',
    currentPrice: 'Current price',
    unavailable: 'Item unavailable',
    addCard: 'Add your card',
    addAddress: 'Add your address',
    max: 'MAX',
    shippingGrouped: 'Shipping grouped at end of live',
    maxBid: 'Max bid',
    maxBidActive: 'Auto-bid active',
    bundleDiscount: 'Grouped shipping: -15%',
    buyNow: 'Buy now',
  },
  he: {
    bid: 'הצע',
    currentPrice: 'מחיר נוכחי',
    unavailable: 'פריט לא זמין',
    addCard: 'הוסף כרטיס',
    addAddress: 'הוסף כתובת',
    max: 'MAX',
    shippingGrouped: 'משלוח מרוכז בסוף השידור',
    maxBid: 'הצעה מקסימלית',
    maxBidActive: 'הצעה אוטומטית פעילה',
    bundleDiscount: 'משלוח מרוכז: -15%',
    buyNow: 'קנה עכשיו',
  },
  es: {
    bid: 'Pujar',
    currentPrice: 'Precio actual',
    unavailable: 'No disponible',
    addCard: 'Agrega tu tarjeta',
    addAddress: 'Agrega tu direccion',
    max: 'MAX',
    shippingGrouped: 'Envio agrupado al final del live',
    maxBid: 'Puja max',
    maxBidActive: 'Auto-puja activa',
    bundleDiscount: 'Envio agrupado: -15%',
    buyNow: 'Comprar',
  },
}

export default function ActiveItemBar({
  item,
  bidAmount,
  onBidAmountChange,
  onBid,
  hasCard,
  hasAddress,
  onAddCard,
  onAddAddress,
  disabled,
  timeLeft,
  lang,
  onMaxBid,
  hasActiveMaxBid,
  bundleCount,
  onBuyNow,
}: ActiveItemBarProps) {
  const [bidFlash, setBidFlash] = useState(false)

  const currentBid = parseFloat(bidAmount) || 0

  // Keep bid amount in sync with current price
  useEffect(() => {
    if (item && currentBid <= item.current_price) {
      onBidAmountChange(String(item.current_price + 1))
    }
  }, [item?.current_price])

  // Tap to bid: places bid at current amount, then increments for next tap
  const handleTapBid = () => {
    if (disabled || !item) return
    hapticTap()
    setBidFlash(true)
    setTimeout(() => setBidFlash(false), 150)
    onBid()
    // After bid, increment by 1€ for next tap
    onBidAmountChange(String(currentBid + 1))
  }

  // MAX: bid at a high amount
  const handleMaxBid = () => {
    if (disabled || !item) return
    hapticTap()
    const maxAmount = item.current_price + 50
    onBidAmountChange(String(maxAmount))
    // Trigger bid immediately
    setTimeout(() => onBid(), 50)
  }

  if (!item) return null

  const labels = LABELS[lang] || LABELS.en
  const isActive = item.status === 'active'

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 100,
      backgroundColor: 'rgba(18,18,20,0.95)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '6px 12px',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
    }}>
      {/* Top: title + current price + max-bid badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', marginBottom: '5px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
          {item.image_urls?.[0] && (
            <img src={item.image_urls[0]} alt="" loading="lazy" style={{ width: '24px', height: '24px', borderRadius: '5px', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </span>
          {hasActiveMaxBid && (
            <span style={{
              fontSize: '9px', fontWeight: 700, color: '#8B5CF6',
              backgroundColor: 'rgba(139,92,246,0.12)',
              padding: '2px 6px', borderRadius: '6px',
              border: '1px solid rgba(139,92,246,0.3)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {labels.maxBidActive}
            </span>
          )}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {timeLeft != null && timeLeft > 0 && (
            <div style={{
              backgroundColor: timeLeft <= 10 ? 'rgba(232,52,78,0.3)' : 'rgba(240,144,138,0.15)',
              border: timeLeft <= 10 ? '1.5px solid #E8344E' : '1px solid rgba(240,144,138,0.4)',
              borderRadius: '8px',
              padding: '2px 8px',
              textAlign: 'center',
              animation: timeLeft <= 10 ? 'timerPulse 0.5s ease-in-out infinite' : 'none',
            }}>
              <span style={{
                fontSize: '15px', fontWeight: 900, color: timeLeft <= 10 ? '#E8344E' : '#F0908A',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {timeLeft}s
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{labels.currentPrice}</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#F0908A' }}>{item.current_price}€</span>
          </div>
        </div>
      </div>

      {/* Bundle discount banner */}
      {bundleCount != null && bundleCount >= 2 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          marginBottom: '5px', padding: '4px 8px',
          backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: '6px',
          border: '1px solid rgba(139,92,246,0.25)',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#8B5CF6' }}>
            {labels.bundleDiscount}
          </span>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          marginBottom: '5px', padding: '3px 8px',
          backgroundColor: 'rgba(240,144,138,0.06)', borderRadius: '6px',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
            {labels.shippingGrouped}
          </span>
        </div>
      )}

      {/* Bid action */}
      {!isActive ? (
        <div style={{ textAlign: 'center', padding: '6px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
          {labels.unavailable}
        </div>
      ) : hasCard === false ? (
        <button onClick={onAddCard} style={{
          width: '100%', padding: '10px', borderRadius: '100px', border: 'none',
          background: 'linear-gradient(135deg, #F0908A, #E8344E)',
          color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
        }}>
          {labels.addCard}
        </button>
      ) : hasAddress === false ? (
        <button onClick={onAddAddress} style={{
          width: '100%', padding: '10px', borderRadius: '100px', border: 'none',
          background: 'linear-gradient(135deg, #F0908A, #E8344E)',
          color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
        }}>
          {labels.addAddress}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Main bid button — TAP to bid */}
          <button
            onClick={handleTapBid}
            disabled={disabled}
            style={{
              flex: 1,
              height: '42px',
              borderRadius: '100px',
              border: 'none',
              background: disabled
                ? 'rgba(255,255,255,0.1)'
                : bidFlash
                  ? 'linear-gradient(135deg, #FF6B6B, #E8344E)'
                  : 'linear-gradient(135deg, #F0908A, #E8344E)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 800,
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background 0.15s, transform 0.1s',
              transform: bidFlash ? 'scale(0.97)' : 'scale(1)',
            }}
          >
            {labels.bid} : {currentBid}€
          </button>

          {/* Buy Now button — only when buy_now_price is set */}
          {item.buy_now_price && item.buy_now_price > 0 && onBuyNow && (
            <button
              onClick={() => { if (!disabled) { hapticTap(); onBuyNow() } }}
              disabled={disabled}
              style={{
                height: '42px',
                padding: '0 12px',
                borderRadius: '100px',
                border: '1.5px solid #10B981',
                backgroundColor: 'rgba(16,185,129,0.15)',
                color: '#10B981',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.3px',
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {labels.buyNow} {item.buy_now_price}€
            </button>
          )}

          {/* Enchere max button */}
          <button
            onClick={() => { if (!disabled) onMaxBid?.() }}
            disabled={disabled}
            style={{
              height: '42px',
              padding: '0 12px',
              borderRadius: '100px',
              border: hasActiveMaxBid ? '1.5px solid #8B5CF6' : '1px solid rgba(139,92,246,0.4)',
              backgroundColor: hasActiveMaxBid ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
              color: '#8B5CF6',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.3px',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.4 : 1,
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            {labels.maxBid}
          </button>

          {/* MAX button */}
          <button
            onClick={handleMaxBid}
            disabled={disabled}
            style={{
              height: '42px',
              padding: '0 14px',
              borderRadius: '100px',
              border: '1px solid rgba(255,215,0,0.3)',
              backgroundColor: 'rgba(255,215,0,0.1)',
              color: '#FFD700',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.4 : 1,
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {labels.max}
          </button>
        </div>
      )}
      <style>{`@keyframes timerPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }`}</style>
    </div>
  )
}
