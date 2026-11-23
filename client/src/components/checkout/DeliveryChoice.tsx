import { useEffect, useState } from 'react'
import { getDir, getLang } from '../../lib/i18n'
import { ApiError, formatMoney, fulfillmentApi, type CheckoutOptions, type FulfillmentMethod } from '../../lib/fulfillment'
import { errorText, ft } from '../../lib/fulfillmentText'

interface Props {
  orderId: string
  /** Appelé quand le choix est enregistré côté serveur (le total à payer inclut le port). */
  onConfirmed: (result: { method: FulfillmentMethod; shippingCost: number; totalAmount: number; currency: string }) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #2a2a2a',
  backgroundColor: '#0D0D0D', color: '#fff', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
}

/**
 * Étape « livraison » du paiement : retrait en main propre (si le vendeur l'autorise)
 * ou envoi par la poste (adresse demandée uniquement dans ce cas). Demande aussi le
 * numéro WhatsApp de l'acheteur s'il n'en a pas encore. Tout est enregistré par le serveur.
 */
export default function DeliveryChoice({ orderId, onConfirmed }: Props) {
  const lang = getLang()
  const t = ft(lang)
  const [options, setOptions] = useState<CheckoutOptions | null>(null)
  const [method, setMethod] = useState<FulfillmentMethod>('post')
  const [address, setAddress] = useState({ name: '', street: '', city: '', zip: '', phone: '' })
  const [whatsapp, setWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fulfillmentApi.checkoutOptions(orderId).then(o => {
      if (cancelled) return
      setOptions(o)
      setMethod(o.selected_method || (o.pickup.allowed ? 'pickup' : 'post'))
      if (o.saved_address) {
        setAddress({ name: o.saved_address.name || '', street: o.saved_address.street || '', city: o.saved_address.city || '', zip: o.saved_address.zip || '', phone: o.saved_address.phone || '' })
      }
    }).catch(() => { if (!cancelled) setError(t.error_generic) })
    return () => { cancelled = true }
  }, [orderId, t.error_generic])

  if (!options) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#888' }}>{error || '…'}</div>
  }

  const shipping = method === 'post' ? options.post.price : 0
  const total = Math.round((options.amount + shipping) * 100) / 100
  const needsWhatsapp = !options.whatsapp
  const addressOk = method === 'pickup' || (address.name.trim() && address.street.trim() && address.city.trim() && address.zip.trim())
  const canSubmit = !!addressOk && (!needsWhatsapp || whatsapp.trim().length >= 6) && !saving

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const r = await fulfillmentApi.choose(orderId, {
        method,
        address: method === 'post' ? { name: address.name.trim(), street: address.street.trim(), city: address.city.trim(), zip: address.zip.trim(), phone: address.phone.trim() || undefined } : undefined,
        whatsapp: needsWhatsapp ? whatsapp.trim() : undefined,
      })
      onConfirmed({ method, shippingCost: Number(r.shipping_cost || 0), totalAmount: Number(r.total_amount), currency: r.currency })
    } catch (err) {
      setError(err instanceof ApiError ? errorText(err.code, lang) : t.error_generic)
    } finally {
      setSaving(false)
    }
  }

  const optionCard = (value: FulfillmentMethod, title: string, subtitle: string, price: string) => {
    const selected = method === value
    return (
      <button
        type="button"
        onClick={() => setMethod(value)}
        aria-pressed={selected}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '14px',
          borderRadius: '14px', cursor: 'pointer', textAlign: 'start',
          border: selected ? '1.5px solid #F0908A' : '1px solid #2a2a2a',
          backgroundColor: selected ? 'rgba(240,144,138,0.08)' : '#0D0D0D', color: '#fff',
        }}
      >
        <span style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          border: selected ? '5px solid #F0908A' : '2px solid #555',
        }} />
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontWeight: 700, fontSize: '15px' }}>{title}</span>
          {subtitle && <span style={{ display: 'block', fontSize: '12px', color: '#999', marginTop: '2px' }}>{subtitle}</span>}
        </span>
        <span style={{ fontWeight: 700, fontSize: '14px', color: selected ? '#F0908A' : '#ccc' }}>{price}</span>
      </button>
    )
  }

  return (
    <div dir={getDir()} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'start' }}>
      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff' }}>{t.choose_delivery}</h3>

      {options.pickup.allowed && optionCard(
        'pickup', t.method_pickup,
        options.pickup.area ? `${t.pickup_area} : ${options.pickup.area}` : t.pickup_free,
        formatMoney(0, options.currency, lang),
      )}
      {optionCard('post', t.method_post, '', formatMoney(options.post.price, options.currency, lang))}
      {!options.pickup.allowed && <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{t.post_only}</p>}

      {method === 'post' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ccc', marginTop: '4px' }}>{t.address_title}</div>
          <input style={inputStyle} value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} placeholder={t.address_name} aria-label={t.address_name} autoComplete="name" />
          <input style={inputStyle} value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} placeholder={t.address_street} aria-label={t.address_street} autoComplete="street-address" />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input style={{ ...inputStyle, flex: 2 }} value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} placeholder={t.address_city} aria-label={t.address_city} autoComplete="address-level2" />
            <input style={{ ...inputStyle, flex: 1 }} value={address.zip} onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))} placeholder={t.address_zip} aria-label={t.address_zip} autoComplete="postal-code" inputMode="numeric" />
          </div>
          <input style={inputStyle} value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} placeholder={t.address_phone} aria-label={t.address_phone} type="tel" dir="ltr" />
        </div>
      )}

      {needsWhatsapp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ccc', marginTop: '4px' }}>{t.whatsapp_label}</div>
          <input
            style={inputStyle}
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder={options.dial_code ? `+${options.dial_code} …` : '+…'}
            aria-label={t.whatsapp_label}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
          />
          <span style={{ fontSize: '12px', color: '#888' }}>{t.whatsapp_hint}</span>
        </div>
      )}

      <div style={{ borderTop: '1px solid #222', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa' }}>
          <span>{t.item_price}</span><span>{formatMoney(options.amount, options.currency, lang)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa' }}>
          <span>{t.shipping_fee}</span><span>{formatMoney(shipping, options.currency, lang)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 800, fontSize: '16px' }}>
          <span>{t.total}</span><span>{formatMoney(total, options.currency, lang)}</span>
        </div>
      </div>

      {error && <div role="alert" style={{ color: '#F87171', fontSize: '13px' }}>{error}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        style={{
          width: '100%', padding: '15px', borderRadius: '14px', border: 'none', fontWeight: 800, fontSize: '16px',
          background: canSubmit ? 'linear-gradient(135deg, #F0908A, #E8344E)' : '#333',
          color: canSubmit ? '#fff' : '#777', cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {saving ? t.saving : t.continue_to_payment}
      </button>
    </div>
  )
}
