import { getLang } from '../lib/i18n'

type Lang = 'fr' | 'en' | 'he' | 'es'

const pageContent = {
  fr: {
    sender: 'Expediteur / From',
    recipient: 'Destinataire / To',
    order: 'Commande',
    lot: 'Lot',
    back: 'Retour',
    print: 'Imprimer',
  },
  en: {
    sender: 'Sender / From',
    recipient: 'Recipient / To',
    order: 'Order',
    lot: 'Lot',
    back: 'Back',
    print: 'Print',
  },
  he: {
    sender: 'שולח / From',
    recipient: 'נמען / To',
    order: 'הזמנה',
    lot: 'לוט',
    back: 'חזור',
    print: 'הדפס',
  },
  es: {
    sender: 'Remitente / From',
    recipient: 'Destinatario / To',
    order: 'Pedido',
    lot: 'Lote',
    back: 'Volver',
    print: 'Imprimir',
  },
}

interface ShippingLabelProps {
  sellerName: string
  sellerAddress: string
  buyerName: string
  buyerAddress: string
  buyerPhone: string
  orderRef: string
  lotRef: string
  onClose?: () => void
  embedded?: boolean
}

export default function ShippingLabel({
  sellerName,
  sellerAddress,
  buyerName,
  buyerAddress,
  buyerPhone,
  orderRef,
  lotRef,
  onClose,
  embedded,
}: ShippingLabelProps) {
  const lang = (getLang() || 'fr') as Lang
  const ct = pageContent[lang] || pageContent.fr

  const handlePrint = async () => {
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.()

    if (!isCapacitor) {
      window.print()
      return
    }

    // On iOS Capacitor, use share sheet (includes Print option)
    if (navigator.share) {
      const text = [
        `SHAPOP - ${ct.order}: ${orderRef}`,
        '',
        `${ct.sender}:`,
        sellerName,
        sellerAddress,
        '',
        `${ct.recipient}:`,
        buyerName,
        buyerAddress,
        buyerPhone ? `Tel: ${buyerPhone}` : '',
        '',
        `${ct.lot}: ${lotRef}`,
      ].filter(Boolean).join('\n')

      try {
        await navigator.share({ title: `ShaPop - ${ct.order} ${orderRef}`, text })
      } catch { /* user cancelled */ }
    }
  }

  const labelContent = (
    <div
      className="shipping-label"
      style={{
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        padding: '24px',
        border: '2px solid #000',
        borderRadius: '8px',
        backgroundColor: '#fff',
        fontFamily: 'Arial, sans-serif',
        color: '#000',
      }}
    >
      {/* Header */}
      <div style={{
        textAlign: 'center',
        borderBottom: '2px solid #000',
        paddingBottom: '12px',
        marginBottom: '16px',
      }}>
        <p style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '2px' }}>
          SHAPOP
        </p>
        <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0' }}>
          {orderRef} | {lotRef}
        </p>
      </div>

      {/* Sender */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, color: '#888',
          textTransform: 'uppercase', letterSpacing: '1px',
          margin: '0 0 6px',
        }}>
          {ct.sender}
        </p>
        <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{sellerName}</p>
        <p style={{ fontSize: '12px', color: '#444', margin: '2px 0 0' }}>{sellerAddress}</p>
      </div>

      {/* Divider */}
      <div style={{
        borderTop: '1px dashed #ccc',
        margin: '12px 0',
      }} />

      {/* Recipient */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, color: '#888',
          textTransform: 'uppercase', letterSpacing: '1px',
          margin: '0 0 6px',
        }}>
          {ct.recipient}
        </p>
        <p style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>{buyerName}</p>
        <p style={{ fontSize: '13px', color: '#333', margin: '4px 0 0', lineHeight: 1.5 }}>
          {buyerAddress}
        </p>
        {buyerPhone && (
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
            Tel: {buyerPhone}
          </p>
        )}
      </div>

      {/* Reference bar */}
      <div style={{
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>{ct.order}</p>
          <p style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0 0' }}>{orderRef}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>{ct.lot}</p>
          <p style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0 0' }}>{lotRef}</p>
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return <div style={{ padding: '24px' }}>{labelContent}</div>
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#f5f5f5',
      zIndex: 300,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Controls - hidden on print */}
      <div
        className="no-print"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#eee',
            border: 'none', borderRadius: '8px',
            color: '#333', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ct.back}
        </button>
        <button
          onClick={handlePrint}
          style={{
            padding: '8px 20px',
            backgroundColor: '#E8344E',
            border: 'none', borderRadius: '8px',
            color: '#fff', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {ct.print}
        </button>
      </div>

      {/* Label preview */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}>
        {labelContent}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .shipping-label {
            border: 2px solid #000 !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
