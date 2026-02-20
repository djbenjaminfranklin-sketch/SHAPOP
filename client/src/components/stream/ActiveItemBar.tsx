import { useState, useEffect } from 'react'
import type { Item } from '../../types/database'
import { apiFetch } from '../../lib/api'
import { hapticTap } from '../../lib/haptics'

interface ActiveItemBarProps {
  item: Item | null
  bidAmount: string
  onBidAmountChange: (value: string) => void
  onBid: () => void
  hasCard: boolean | null
  onAddCard: () => void
  disabled?: boolean
  lang: 'fr' | 'en' | 'he' | 'es'
  selectedCarrier?: string
  onCarrierChange?: (carrier: string) => void
  buyerCountry?: string
  buyerZip?: string
}

const LABELS: Record<string, {
  bid: string
  currentPrice: string
  unavailable: string
  addCard: string
  max: string
}> = {
  fr: {
    bid: 'Encherir',
    currentPrice: 'Prix actuel',
    unavailable: 'Article non disponible',
    addCard: 'Ajoute ta carte',
    max: 'MAX',
  },
  en: {
    bid: 'Bid',
    currentPrice: 'Current price',
    unavailable: 'Item unavailable',
    addCard: 'Add your card',
    max: 'MAX',
  },
  he: {
    bid: 'הצע',
    currentPrice: 'מחיר נוכחי',
    unavailable: 'פריט לא זמין',
    addCard: 'הוסף כרטיס',
    max: 'MAX',
  },
  es: {
    bid: 'Pujar',
    currentPrice: 'Precio actual',
    unavailable: 'No disponible',
    addCard: 'Agrega tu tarjeta',
    max: 'MAX',
  },
}

const CARRIER_NAMES: Record<string, string> = {
  mondial_relay: 'Mondial Relay',
  dpd: 'DPD',
  dhl: 'DHL Express',
}

interface ShippingOption {
  carrier: string
  cost: number
  zone?: string
}

export default function ActiveItemBar({
  item,
  bidAmount,
  onBidAmountChange,
  onBid,
  hasCard,
  onAddCard,
  disabled,
  lang,
  buyerCountry,
  buyerZip,
}: ActiveItemBarProps) {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [_shippingZone, setShippingZone] = useState<string>('france')
  const [shippingPromo, setShippingPromo] = useState<{ discount_percent: number } | null>(null)
  const [bidFlash, setBidFlash] = useState(false)

  const currentBid = parseFloat(bidAmount) || 0
  const nextBid = (item?.current_price ?? 0) + 1

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

  // Fetch shipping options
  useEffect(() => {
    if (!item?.weight_grams) { setShippingOptions([]); return }
    const fetchOptions = async () => {
      try {
        const params = new URLSearchParams({ weight_grams: String(item.weight_grams) })
        if (buyerCountry) params.set('country', buyerCountry)
        if (buyerZip) params.set('zip', buyerZip)
        const resp = await apiFetch(`/api/shipping/options?${params.toString()}`)
        if (resp.ok) {
          const data = await resp.json()
          setShippingOptions(data.options || [])
          if (data.zone) setShippingZone(data.zone)
        }
      } catch { /* ignore */ }
    }
    fetchOptions()
  }, [item?.id, item?.weight_grams, buyerCountry, buyerZip])

  // Fetch shipping promo
  useEffect(() => {
    const f = async () => {
      try {
        const res = await apiFetch('/api/promotions/active')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            const sp = data.find((p: Record<string, unknown>) => p.type === 'shipping' || p.type === 'both')
            if (sp) setShippingPromo({ discount_percent: Number(sp.discount_percent) })
          }
        }
      } catch { /* ignore */ }
    }
    f()
  }, [])

  if (!item) return null

  const labels = LABELS[lang] || LABELS.en
  const isActive = item.status === 'active'
  const hasWeight = item.weight_grams != null && item.weight_grams > 0
  const autoOption = shippingOptions.length > 0 ? shippingOptions[0] : null
  const displayShippingCost = autoOption?.cost ?? 0
  const autoCarrierName = autoOption ? (CARRIER_NAMES[autoOption.carrier] || autoOption.carrier) : ''
  const hasShippingPromo = shippingPromo && shippingPromo.discount_percent > 0
  const discountedShippingCost = hasShippingPromo
    ? Math.round(displayShippingCost * (1 - shippingPromo!.discount_percent / 100) * 100) / 100
    : displayShippingCost
  void _shippingZone
  void nextBid

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
      {/* Top: title + current price */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', marginBottom: '5px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
          {item.image_urls?.[0] && (
            <img src={item.image_urls[0]} alt="" style={{ width: '24px', height: '24px', borderRadius: '5px', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </span>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{labels.currentPrice}</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#F0908A' }}>{item.current_price}€</span>
        </div>
      </div>

      {/* Shipping (compact) */}
      {hasWeight && shippingOptions.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '5px', padding: '3px 8px',
          backgroundColor: 'rgba(240,144,138,0.06)', borderRadius: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{autoCarrierName}</span>
          </div>
          {hasShippingPromo ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>{displayShippingCost.toFixed(2)}€</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981' }}>{discountedShippingCost.toFixed(2)}€</span>
            </div>
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>+{displayShippingCost.toFixed(2)}€</span>
          )}
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
    </div>
  )
}
