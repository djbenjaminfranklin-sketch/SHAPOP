import { useState, useEffect } from 'react'
import type { Item } from '../../types/database'
import { hapticTap } from '../../lib/haptics'
import { getLang, type Lang, type Localized } from '../../lib/i18n'
import { formatMoney, currencyForCountry, displayItemTitle } from '../../lib/fulfillment'

interface ActiveItemBarProps {
  item: Item | null
  bidAmount: string
  onBidAmountChange: (value: string) => void
  onBid: () => void
  hasCard: boolean | null
  onAddCard: () => void
  disabled?: boolean
  timeLeft?: number
  lang?: Lang
  /** Pays du vendeur (devise des prix affichés). */
  sellerCountry?: string | null
  /** Devise explicite (prioritaire sur sellerCountry). */
  currency?: string | null
  onMaxBid?: () => void
  hasActiveMaxBid?: boolean
  /** Ancien bandeau « livraison groupée » retiré ; prop gardée pour compatibilité. */
  bundleCount?: number
  onBuyNow?: () => void
}

type Labels = {
  bid: string
  currentPrice: string
  unavailable: string
  addCard: string
  max: string
  maxBid: string
  maxBidActive: string
  buyNow: string
  reserveNotMet: string
  reserveMet: string
}

const LABELS: Localized<Labels> = {
  en: {
    bid: 'Bid',
    currentPrice: 'Current price',
    unavailable: 'Item unavailable',
    addCard: 'Add your card',
    max: 'MAX',
    maxBid: 'Max bid',
    maxBidActive: 'Auto-bid on',
    buyNow: 'Buy now',
    reserveNotMet: 'Reserve not met',
    reserveMet: 'Reserve met',
  },
  fr: {
    bid: 'Enchérir',
    currentPrice: 'Prix actuel',
    unavailable: 'Article indisponible',
    addCard: 'Ajoute ta carte',
    max: 'MAX',
    maxBid: 'Enchère max',
    maxBidActive: 'Enchère auto activée',
    buyNow: 'Acheter',
    reserveNotMet: 'Prix minimum non atteint',
    reserveMet: 'Prix minimum atteint',
  },
  es: {
    bid: 'Pujar',
    currentPrice: 'Precio actual',
    unavailable: 'Artículo no disponible',
    addCard: 'Añade tu tarjeta',
    max: 'MÁX',
    maxBid: 'Puja máx.',
    maxBidActive: 'Puja automática activa',
    buyNow: 'Comprar',
    reserveNotMet: 'Precio mínimo no alcanzado',
    reserveMet: 'Precio mínimo alcanzado',
  },
  ru: {
    bid: 'Ставка',
    currentPrice: 'Текущая цена',
    unavailable: 'Товар недоступен',
    addCard: 'Добавь карту',
    max: 'MAX',
    maxBid: 'Макс. ставка',
    maxBidActive: 'Автоставка включена',
    buyNow: 'Купить',
    reserveNotMet: 'Мин. цена не достигнута',
    reserveMet: 'Мин. цена достигнута',
  },
  he: {
    bid: 'הצע',
    currentPrice: 'מחיר נוכחי',
    unavailable: 'הפריט לא זמין',
    addCard: 'הוסף כרטיס',
    max: 'MAX',
    maxBid: 'הצעה מקסימלית',
    maxBidActive: 'הצעה אוטומטית פעילה',
    buyNow: 'קנה עכשיו',
    reserveNotMet: 'מחיר המינימום לא הושג',
    reserveMet: 'מחיר המינימום הושג',
  },
}

export default function ActiveItemBar({
  item,
  bidAmount,
  onBidAmountChange,
  onBid,
  hasCard,
  onAddCard,
  disabled,
  timeLeft,
  lang,
  sellerCountry,
  currency,
  onMaxBid,
  hasActiveMaxBid,
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

  const labels = LABELS[lang ?? getLang()] ?? LABELS.en
  const cur = currency || currencyForCountry(sellerCountry)
  const money = (n: number) => formatMoney(n, cur, lang ?? getLang())
  const isActive = item.status === 'active'

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 100,
      // Plein écran façon Whatnot : la vidéo reste visible derrière (voile léger + flou)
      background: 'linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0.25))',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      borderTop: '1px solid rgba(0,229,255,0.22)',
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
          <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayItemTitle(item.title)}
          </span>
          {hasActiveMaxBid && (
            <span style={{
              fontSize: 'calc(9px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF',
              backgroundColor: 'rgba(0,229,255,0.12)',
              padding: '2px 6px', borderRadius: '6px',
              border: '1px solid rgba(0,229,255,0.3)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {labels.maxBidActive}
            </span>
          )}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {timeLeft != null && timeLeft > 0 && (
            <div style={{
              backgroundColor: timeLeft <= 10 ? 'rgba(0,229,255,0.3)' : 'rgba(0, 229, 255,0.15)',
              border: timeLeft <= 10 ? '1.5px solid #00E5FF' : '1px solid rgba(0, 229, 255,0.4)',
              borderRadius: '8px',
              padding: '2px 8px',
              textAlign: 'center',
              animation: timeLeft <= 10 ? 'timerPulse 0.5s ease-in-out infinite' : 'none',
            }}>
              <span style={{
                fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 900, color: timeLeft <= 10 ? '#00E5FF' : '#00E5FF',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {timeLeft}s {/* i18n-ignore */}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#f0f0f0' }}>{labels.currentPrice}</span>
              <span style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF' }}>{money(item.current_price)}</span>
            </div>
            {/* Prix minimum du vendeur : on dit s'il est atteint, sans en donner le montant */}
            {Number(item.min_price) > 0 && (
              <span style={{
                fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, marginTop: '2px',
                color: Number(item.current_price) >= Number(item.min_price) ? '#00E5FF' : '#FF9632',
              }}>
                {Number(item.current_price) >= Number(item.min_price) ? labels.reserveMet : labels.reserveNotMet}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bid action */}
      {!isActive ? (
        <div style={{ textAlign: 'center', padding: '6px', fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0' }}>
          {labels.unavailable}
        </div>
      ) : hasCard === false ? (
        <button onClick={onAddCard} style={{
          width: '100%', padding: '10px', borderRadius: '100px', border: '2px solid #00E5FF',
          background: 'rgba(0,10,14,0.35)', // néon transparent : la vidéo se voit derrière
          boxShadow: '0 0 14px rgba(0,229,255,0.55), inset 0 0 8px rgba(0,229,255,0.15)',
          color: '#00E5FF', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
        }}>
          {labels.addCard}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Main bid button — TAP to bid (toute la largeur : le libellé n'est plus tronqué) */}
          <button
            onClick={handleTapBid}
            disabled={disabled}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '100px',
              // Bouton néon : contour cyan lumineux, fond transparent (la vidéo se voit derrière)
              border: disabled ? '1.5px solid rgba(255,255,255,0.2)' : '2px solid #00E5FF',
              background: disabled
                ? 'rgba(255,255,255,0.08)'
                : bidFlash
                  ? '#00E5FF'
                  : 'rgba(0,10,14,0.35)',
              boxShadow: disabled ? 'none' : '0 0 16px rgba(0,229,255,0.55), inset 0 0 10px rgba(0,229,255,0.18)',
              textShadow: disabled || bidFlash ? 'none' : '0 0 8px rgba(0,229,255,0.7)',
              color: disabled ? 'rgba(255,255,255,0.5)' : bidFlash ? '#001014' : '#00E5FF',
              fontSize: 'calc(17px * var(--fs, 1))',
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
            {labels.bid} · {money(currentBid)}
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>

          {/* Buy Now button — only when buy_now_price is set */}
          {item.buy_now_price && item.buy_now_price > 0 && onBuyNow && (
            <button
              onClick={() => { if (!disabled) { hapticTap(); onBuyNow() } }}
              disabled={disabled}
              style={{
                flex: 1,
                height: '40px',
                padding: '0 8px',
                borderRadius: '100px',
                border: '1.5px solid rgba(255,255,255,0.75)',
                backgroundColor: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 'calc(13px * var(--fs, 1))',
                fontWeight: 800,
                letterSpacing: '0.3px',
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {labels.buyNow} {money(item.buy_now_price)}
            </button>
          )}

          {/* Enchere max button */}
          <button
            onClick={() => { if (!disabled) onMaxBid?.() }}
            disabled={disabled}
            style={{
              flex: 1,
              height: '40px',
              padding: '0 8px',
              borderRadius: '100px',
              border: hasActiveMaxBid ? '1.5px solid #00E5FF' : '1px solid rgba(255,255,255,0.45)',
              backgroundColor: hasActiveMaxBid ? 'rgba(0,229,255,0.15)' : 'rgba(0,0,0,0.3)',
              color: hasActiveMaxBid ? '#00E5FF' : '#fff',
              fontSize: 'calc(13px * var(--fs, 1))',
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
              flex: 1,
              height: '40px',
              padding: '0 8px',
              borderRadius: '100px',
              border: '1px solid rgba(255,255,255,0.45)',
              backgroundColor: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: 'calc(13px * var(--fs, 1))',
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
        </div>
      )}
      <style>{`@keyframes timerPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }`}</style>
    </div>
  )
}
