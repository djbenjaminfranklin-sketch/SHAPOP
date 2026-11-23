import { useEffect, useState } from 'react'
import { getDir, getLang } from '../../lib/i18n'
import { ApiError, formatMoney, fulfillmentApi, type SellerFulfillmentSettings } from '../../lib/fulfillment'
import { errorText, ft } from '../../lib/fulfillmentText'

const input: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #2a2a2a',
  backgroundColor: '#0D0D0D', color: '#fff', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
}
const label: React.CSSProperties = { fontSize: '13px', fontWeight: 700, color: '#ccc' }
const hint: React.CSSProperties = { fontSize: '12px', color: '#888', margin: 0 }

/**
 * Réglages vendeur « Remise des commandes » : retrait en main propre (+ lieu indicatif),
 * prix d'envoi par la poste (avec prix suggéré), délai de remise, numéro WhatsApp obligatoire.
 */
export default function FulfillmentSettings() {
  const lang = getLang()
  const t = ft(lang)
  const [settings, setSettings] = useState<SellerFulfillmentSettings | null>(null)
  const [allowPickup, setAllowPickup] = useState(false)
  const [pickupArea, setPickupArea] = useState('')
  const [postPrice, setPostPrice] = useState('')
  const [delay, setDelay] = useState(4)
  const [whatsapp, setWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    fulfillmentApi.sellerSettings().then(s => {
      if (cancelled) return
      setSettings(s)
      setAllowPickup(s.allow_pickup)
      setPickupArea(s.pickup_area || '')
      setPostPrice(s.post_price != null ? String(s.post_price) : '')
      setDelay(s.handover_delay_days)
      setWhatsapp(s.whatsapp || '')
    }).catch(() => { if (!cancelled) setMessage({ ok: false, text: t.error_generic }) })
    return () => { cancelled = true }
  }, [t.error_generic])

  if (!settings) return message ? <p style={{ ...hint, color: '#F87171' }}>{message.text}</p> : null

  const save = async () => {
    setSaving(true)
    setMessage(null)
    const price = postPrice.trim() === '' ? null : Number(postPrice.replace(',', '.'))
    try {
      await fulfillmentApi.saveSellerSettings({
        allow_pickup: allowPickup,
        pickup_area: pickupArea.trim() || null,
        post_price: price != null && Number.isFinite(price) ? price : null,
        handover_delay_days: delay,
        whatsapp: whatsapp.trim(),
      })
      setMessage({ ok: true, text: t.saved })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? errorText(err.code, lang) : t.error_generic })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div dir={getDir()} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={label}>{t.whatsapp_seller_label}</span>
        <input style={input} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} type="tel" inputMode="tel" dir="ltr"
          placeholder={settings.dial_code ? `+${settings.dial_code} …` : '+…'} aria-label={t.whatsapp_seller_label} />
        <p style={hint}>{t.whatsapp_hint}</p>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={allowPickup} onChange={e => setAllowPickup(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#F0908A' }} />
        <span style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{t.allow_pickup}</span>
      </label>
      {allowPickup && (
        <input style={input} value={pickupArea} onChange={e => setPickupArea(e.target.value)} placeholder={t.pickup_area_placeholder} aria-label={t.pickup_area_placeholder} maxLength={120} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={label}>{t.post_price_label} ({settings.currency})</span>
        <input style={input} value={postPrice} onChange={e => setPostPrice(e.target.value)} inputMode="decimal" dir="ltr"
          placeholder={String(settings.suggested_post_price)} aria-label={t.post_price_label} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p style={hint}>{t.post_price_suggested} {formatMoney(settings.suggested_post_price, settings.currency, lang)}</p>
          <button type="button" onClick={() => setPostPrice(String(settings.suggested_post_price))}
            style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: 'transparent', color: '#F0908A', fontSize: '12px', cursor: 'pointer' }}>
            {t.use_suggested}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={label}>{t.handover_delay}</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {settings.handover_delay_allowed.map(d => (
            <button key={d} type="button" onClick={() => setDelay(d)} aria-pressed={delay === d}
              style={{
                minWidth: '44px', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                background: delay === d ? 'linear-gradient(135deg, #F0908A, #E8344E)' : '#0D0D0D',
                border: delay === d ? 'none' : '1px solid #222', color: delay === d ? '#fff' : '#888',
              }}>
              {d} {t.days}
            </button>
          ))}
        </div>
        <p style={hint}>{t.handover_delay_hint}</p>
      </div>

      {message && <div role="status" style={{ fontSize: '13px', color: message.ok ? '#22C55E' : '#F87171' }}>{message.text}</div>}
      <button type="button" onClick={save} disabled={saving}
        style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '15px', cursor: 'pointer',
          background: 'linear-gradient(135deg, #F0908A, #E8344E)', color: '#fff', opacity: saving ? 0.6 : 1 }}>
        {saving ? t.saving : t.save}
      </button>
    </div>
  )
}
