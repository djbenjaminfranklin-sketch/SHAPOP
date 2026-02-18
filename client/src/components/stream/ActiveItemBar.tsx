import { useState, useEffect } from 'react'
import type { Item } from '../../types/database'
import { apiFetch } from '../../lib/api'

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
  shipping: string
  shippingFrom: string
  total: string
  selectCarrier: string
}> = {
  fr: {
    bid: 'Encherir',
    currentPrice: 'Prix actuel',
    unavailable: 'Article non disponible',
    addCard: 'Ajoute ta carte pour encherir',
    shipping: 'Livraison',
    shippingFrom: 'Livraison des',
    total: 'Total estime',
    selectCarrier: 'Transporteur',
  },
  en: {
    bid: 'Bid',
    currentPrice: 'Current price',
    unavailable: 'Item unavailable',
    addCard: 'Add your card to bid',
    shipping: 'Shipping',
    shippingFrom: 'Shipping from',
    total: 'Estimated total',
    selectCarrier: 'Carrier',
  },
  he: {
    bid: 'הצע',
    currentPrice: 'מחיר נוכחי',
    unavailable: 'פריט לא זמין',
    addCard: 'הוסף כרטיס כדי להציע',
    shipping: 'משלוח',
    shippingFrom: 'משלוח מ',
    total: 'סה"כ משוער',
    selectCarrier: 'חברת משלוח',
  },
  es: {
    bid: 'Pujar',
    currentPrice: 'Precio actual',
    unavailable: 'Articulo no disponible',
    addCard: 'Agrega tu tarjeta para pujar',
    shipping: 'Envio',
    shippingFrom: 'Envio desde',
    total: 'Total estimado',
    selectCarrier: 'Transportista',
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
  selectedCarrier,
  onCarrierChange,
  buyerCountry,
  buyerZip,
}: ActiveItemBarProps) {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [shippingZone, setShippingZone] = useState<string>('france')
  const [shippingPromo, setShippingPromo] = useState<{ discount_percent: number } | null>(null)

  // Fetch shipping options when item changes and has weight
  // Include buyer country/zip for zone-based pricing
  useEffect(() => {
    if (!item?.weight_grams) {
      setShippingOptions([])
      return
    }
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

  // Fetch active shipping promotion
  useEffect(() => {
    const fetchPromo = async () => {
      try {
        const res = await apiFetch('/api/promotions/active')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            const shippingPromotion = data.find((p: Record<string, unknown>) =>
              p.type === 'shipping' || p.type === 'both'
            )
            if (shippingPromotion) {
              setShippingPromo({ discount_percent: Number(shippingPromotion.discount_percent) })
            }
          }
        }
      } catch { /* ignore */ }
    }
    fetchPromo()
  }, [])

  if (!item) return null

  const labels = LABELS[lang] || LABELS.en
  const isActive = item.status === 'active'
  const hasWeight = item.weight_grams != null && item.weight_grams > 0

  // Single carrier per zone — use the first (and only) option
  const autoOption = shippingOptions.length > 0 ? shippingOptions[0] : null
  const displayShippingCost = autoOption?.cost ?? 0
  const autoCarrierName = autoOption ? (CARRIER_NAMES[autoOption.carrier] || autoOption.carrier) : ''

  // Apply shipping promotion discount for display
  const hasShippingPromo = shippingPromo && shippingPromo.discount_percent > 0
  const discountedShippingCost = hasShippingPromo
    ? Math.round(displayShippingCost * (1 - shippingPromo!.discount_percent / 100) * 100) / 100
    : displayShippingCost

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '12px 16px',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
    }}>
      {/* Top row: title + price */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: hasWeight && shippingOptions.length > 0 ? '4px' : '10px',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}>
            {item.title}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.5)',
            marginTop: '2px',
            display: 'block',
          }}>
            {labels.currentPrice}
          </span>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <span style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#F0908A',
            display: 'block',
          }}>
            {item.current_price}€
          </span>
        </div>
      </div>

      {/* Shipping cost row (only if item has weight) */}
      {hasWeight && shippingOptions.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          padding: '6px 10px',
          backgroundColor: 'rgba(240,144,138,0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(240,144,138,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1" />
              <path d="M16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <span style={{
                color: '#F0908A',
                fontSize: '12px',
                fontWeight: 600,
              }}>
              {autoCarrierName}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              {labels.shipping}
            </span>
            {hasShippingPromo ? (
              <>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through' }}>
                  {displayShippingCost.toFixed(2)}€
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
                  {discountedShippingCost.toFixed(2)}€
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#10B981', backgroundColor: 'rgba(16,185,129,0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                  -{shippingPromo!.discount_percent}%
                </span>
              </>
            ) : (
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#F0908A' }}>
                {displayShippingCost.toFixed(2)}€
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action area */}
      {!isActive ? (
        <div style={{
          textAlign: 'center',
          padding: '14px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.4)',
        }}>
          {labels.unavailable}
        </div>
      ) : hasCard === false ? (
        <button
          onClick={onAddCard}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {labels.addCard}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            inputMode="decimal"
            value={bidAmount}
            onChange={(e) => onBidAmountChange(e.target.value)}
            style={{
              width: '70px',
              padding: '12px 8px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
              textAlign: 'center',
              outline: 'none',
              flexShrink: 0,
              WebkitAppearance: 'none',
              MozAppearance: 'textfield' as never,
            }}
          />
          <button
            onClick={onBid}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: disabled
                ? 'rgba(255,255,255,0.15)'
                : 'linear-gradient(135deg, #F0908A, #E8344E)',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              WebkitTapHighlightColor: 'transparent',
              transition: 'opacity 0.15s',
            }}
          >
            {labels.bid}
          </button>
        </div>
      )}
    </div>
  )
}
