import type { Item } from '../../types/database'

interface ActiveItemBarProps {
  item: Item | null
  bidAmount: string
  onBidAmountChange: (value: string) => void
  onBid: () => void
  hasCard: boolean | null
  onAddCard: () => void
  disabled?: boolean
  lang: 'fr' | 'en' | 'he' | 'es'
}

const LABELS: Record<string, { bid: string; currentPrice: string; unavailable: string; addCard: string }> = {
  fr: { bid: 'Enchérir', currentPrice: 'Prix actuel', unavailable: 'Article non disponible', addCard: 'Ajoute ta carte pour enchérir' },
  en: { bid: 'Bid', currentPrice: 'Current price', unavailable: 'Item unavailable', addCard: 'Add your card to bid' },
  he: { bid: 'הצע', currentPrice: 'מחיר נוכחי', unavailable: 'פריט לא זמין', addCard: 'הוסף כרטיס כדי להציע' },
  es: { bid: 'Pujar', currentPrice: 'Precio actual', unavailable: 'Artículo no disponible', addCard: 'Agrega tu tarjeta para pujar' },
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
}: ActiveItemBarProps) {
  if (!item) return null

  const labels = LABELS[lang] || LABELS.en
  const isActive = item.status === 'active'

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
        marginBottom: '10px',
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

        <span style={{
          fontSize: '18px',
          fontWeight: 800,
          color: '#F0908A',
          flexShrink: 0,
        }}>
          {item.current_price}€
        </span>
      </div>

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
