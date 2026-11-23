import { useCallback, useEffect, useRef, useState } from 'react'
import { getDir, getLang } from '../../lib/i18n'
import { ApiError, fileToJpegDataUrl, formatDateTime, fulfillmentApi, type OrderFulfillment } from '../../lib/fulfillment'
import { errorText, ft, statusLabel } from '../../lib/fulfillmentText'

interface Props {
  orderId: string
  /** Appelé après une remise validée ou des photos envoyées (pour recharger la page). */
  onChanged?: () => void
}

const card: React.CSSProperties = {
  backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', padding: '16px',
  display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'start',
}
const title: React.CSSProperties = { margin: 0, fontSize: '15px', fontWeight: 800, color: '#fff' }
const hint: React.CSSProperties = { margin: 0, fontSize: '13px', color: '#999', lineHeight: 1.45 }
const primaryBtn = (enabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '15px',
  background: enabled ? 'linear-gradient(135deg, #F0908A, #E8344E)' : '#333', color: enabled ? '#fff' : '#777',
  cursor: enabled ? 'pointer' : 'not-allowed',
})

/**
 * Panneau de remise d'une commande, côté acheteur ou vendeur :
 * - retrait : l'acheteur voit SON code ; le vendeur saisit le code ;
 * - poste : le vendeur envoie les 2 photos ; l'acheteur les voit ;
 * - coordonnées WhatsApp / e-mail de l'autre partie, seulement après paiement.
 */
export default function FulfillmentPanel({ orderId, onChanged }: Props) {
  const lang = getLang()
  const t = ft(lang)
  const [data, setData] = useState<OrderFulfillment | null>(null)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await fulfillmentApi.get(orderId))
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [orderId])

  useEffect(() => { load() }, [load])

  if (!data) {
    return loadError ? <div style={{ ...card, color: '#F87171' }}>{t.error_generic}</div> : null
  }

  const refresh = async () => {
    await load()
    onChanged?.()
  }

  const isBuyer = data.role === 'buyer'
  const isSeller = data.role === 'seller'
  const awaiting = data.status === 'paid'

  return (
    <div dir={getDir()} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            {data.fulfillment_method === 'pickup' ? t.method_pickup : data.fulfillment_method === 'post' ? t.method_post : data.fulfillment_method === 'legacy_carrier' ? t.method_legacy : ''}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: awaiting ? '#F0908A' : '#22C55E' }}>{statusLabel(data.status, lang)}</span>
        </div>
        {awaiting && data.handover_deadline && (
          <p style={hint}>
            {isSeller ? t.deadline : data.fulfillment_method === 'pickup' ? t.wait_pickup_until : t.wait_post_until}{' '}
            <strong style={{ color: '#ddd' }}>{formatDateTime(data.handover_deadline, lang)}</strong>
          </p>
        )}
        {data.fulfillment_method === 'pickup' && data.pickup_area && (
          <p style={hint}>{t.pickup_area}{t.colon} <strong style={{ color: '#ddd' }}>{data.pickup_area}</strong></p>
        )}
        {data.handed_over_at && <p style={hint}>{t.handed_over_on} {formatDateTime(data.handed_over_at, lang)}</p>}
        {data.proof_submitted_at && <p style={hint}>{t.shipped_on} {formatDateTime(data.proof_submitted_at, lang)}</p>}
        {isSeller && data.payout_status && (
          <p style={{ ...hint, color: data.payout_status === 'released' ? '#22C55E' : '#aaa' }}>
            {data.payout_status === 'released' ? t.payout_released : awaiting ? t.payout_held : ''}
          </p>
        )}
      </div>

      {/* Code de retrait : visible par l'acheteur seulement (le serveur ne l'envoie qu'à lui) */}
      {isBuyer && data.fulfillment_method === 'pickup' && data.handover?.code && awaiting && (
        <div style={{ ...card, alignItems: 'center', textAlign: 'center', borderColor: 'rgba(240,144,138,0.4)' }}>
          <h3 style={title}>{t.your_code_title}</h3>
          <div dir="ltr" aria-label={t.your_code_title} style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '12px', color: '#F0908A', fontVariantNumeric: 'tabular-nums' }}>
            {data.handover.code}
          </div>
          <p style={hint}>{data.handover.locked ? t.code_locked : t.your_code_hint}</p>
        </div>
      )}

      {isSeller && data.fulfillment_method === 'pickup' && awaiting && (
        <HandoverCodeForm orderId={orderId} locked={!!data.handover?.locked} attemptsLeft={data.handover?.attempts_left} onDone={refresh} />
      )}

      {isSeller && data.fulfillment_method === 'post' && data.shipping_address && (
        <div style={card}>
          <h3 style={title}>{t.ship_to}</h3>
          <p style={{ ...hint, color: '#ddd', whiteSpace: 'pre-line' }}>
            {[data.shipping_address.name, data.shipping_address.street, `${data.shipping_address.zip || ''} ${data.shipping_address.city || ''}`.trim(), data.shipping_address.country, data.shipping_address.phone].filter(Boolean).join('\n')}
          </p>
        </div>
      )}

      {isSeller && data.fulfillment_method === 'post' && awaiting && (
        <ProofForm orderId={orderId} hasParcel={!!data.proofs.parcel_url} hasSlip={!!data.proofs.slip_url} onDone={refresh} />
      )}

      {data.fulfillment_method === 'post' && (data.proofs.parcel_url || data.proofs.slip_url) && (!isSeller || !awaiting) && (
        <div style={card}>
          <h3 style={title}>{t.proofs_title}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {([['parcel_url', t.proof_parcel], ['slip_url', t.proof_slip]] as const).map(([key, label]) => data.proofs[key] ? (
              <a key={key} href={data.proofs[key]!} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <img src={data.proofs[key]!} alt={label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', border: '1px solid #2a2a2a' }} />
                <span style={{ display: 'block', fontSize: '11px', color: '#999', marginTop: '4px' }}>{label}</span>
              </a>
            ) : null)}
          </div>
          {data.tracking_number && <p style={hint}>{t.tracking_number}{t.colon} <span dir="ltr" style={{ color: '#ddd' }}>{data.tracking_number}</span></p>}
        </div>
      )}

      {(isBuyer || isSeller) && (
        <div style={card}>
          <h3 style={title}>{t.contact_title}{data.contact?.name ? ` — ${data.contact.name}` : ''}</h3>
          {data.contact ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.contact.whatsapp_link && (
                <a href={data.contact.whatsapp_link} target="_blank" rel="noreferrer" style={{
                  display: 'block', textAlign: 'center', padding: '13px', borderRadius: '12px', fontWeight: 800,
                  backgroundColor: '#25D366', color: '#062b14', textDecoration: 'none', fontSize: '15px',
                }}>{t.contact_whatsapp}</a>
              )}
              {data.contact.email_link && (
                <a href={data.contact.email_link} style={{
                  display: 'block', textAlign: 'center', padding: '13px', borderRadius: '12px', fontWeight: 700,
                  border: '1px solid #333', color: '#fff', textDecoration: 'none', fontSize: '15px',
                }}>{t.contact_email}</a>
              )}
            </div>
          ) : (
            <p style={hint}>{t.contact_after_payment}</p>
          )}
        </div>
      )}
    </div>
  )
}

function HandoverCodeForm({ orderId, locked, attemptsLeft, onDone }: { orderId: string; locked: boolean; attemptsLeft?: number; onDone: () => void }) {
  const lang = getLang()
  const t = ft(lang)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(locked ? t.code_locked : null)
  const [isLocked, setIsLocked] = useState(locked)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await fulfillmentApi.submitCode(orderId, code)
      setCode('')
      onDone()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'wrong_code') {
        setError(`${t.wrong_code} ${String(err.body.attempts_left ?? '')}`)
      } else if (err instanceof ApiError && err.code === 'locked') {
        setIsLocked(true)
        setError(t.code_locked)
      } else {
        setError(err instanceof ApiError ? errorText(err.code, lang) : t.error_generic)
      }
    } finally {
      setBusy(false)
    }
  }

  const ok = /^\d{4}$/.test(code) && !busy && !isLocked
  return (
    <div style={card}>
      <h3 style={title}>{t.enter_code_title}</h3>
      <p style={hint}>{t.enter_code_hint}</p>
      <input
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={4}
        dir="ltr"
        disabled={isLocked}
        aria-label={t.enter_code_title}
        placeholder="••••"
        style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #2a2a2a', backgroundColor: '#0D0D0D',
          color: '#fff', fontSize: '28px', letterSpacing: '14px', textAlign: 'center', boxSizing: 'border-box', fontWeight: 800,
        }}
      />
      {typeof attemptsLeft === 'number' && attemptsLeft < 5 && !error && !isLocked && (
        <p style={hint}>{t.wrong_code} {attemptsLeft}</p>
      )}
      {error && <div role="alert" style={{ color: '#F87171', fontSize: '13px' }}>{error}</div>}
      <button type="button" onClick={submit} disabled={!ok} style={primaryBtn(ok)}>{busy ? t.sending : t.enter_code_button}</button>
    </div>
  )
}

function ProofForm({ orderId, hasParcel, hasSlip, onDone }: { orderId: string; hasParcel: boolean; hasSlip: boolean; onDone: () => void }) {
  const lang = getLang()
  const t = ft(lang)
  const [sent, setSent] = useState({ parcel: hasParcel, slip: hasSlip })
  const [busy, setBusy] = useState<'parcel' | 'slip' | null>(null)
  const [tracking, setTracking] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputs = { parcel: useRef<HTMLInputElement>(null), slip: useRef<HTMLInputElement>(null) }

  const onFile = async (kind: 'parcel' | 'slip', file: File | undefined) => {
    if (!file) return
    setBusy(kind)
    setError(null)
    try {
      const image = await fileToJpegDataUrl(file)
      const r = await fulfillmentApi.submitProof(orderId, kind, image, kind === 'slip' ? tracking.trim() : undefined)
      setSent(s => ({ ...s, [kind]: true }))
      if (r.complete) onDone()
    } catch (err) {
      setError(err instanceof ApiError ? errorText(err.code, lang) : t.error_generic)
    } finally {
      setBusy(null)
      const ref = inputs[kind].current
      if (ref) ref.value = ''
    }
  }

  const step = (kind: 'parcel' | 'slip', n: number, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', backgroundColor: '#0D0D0D', border: '1px solid #222' }}>
      <span style={{
        width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontWeight: 800, fontSize: '13px', backgroundColor: sent[kind] ? '#22C55E' : '#333', color: '#fff',
      }}>{sent[kind] ? '✓' : n}</span>
      <span style={{ flex: 1, fontSize: '13px', color: '#ddd' }}>{label}{sent[kind] ? ` — ${t.photo_sent}` : ''}</span>
      <input ref={inputs[kind]} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => onFile(kind, e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputs[kind].current?.click()}
        disabled={busy !== null}
        style={{ padding: '9px 12px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
          backgroundColor: sent[kind] ? '#222' : '#F0908A', color: sent[kind] ? '#ccc' : '#fff', whiteSpace: 'nowrap' }}
      >
        {busy === kind ? t.sending : sent[kind] ? t.retake_photo : t.take_photo}
      </button>
    </div>
  )

  return (
    <div style={card}>
      <h3 style={title}>{t.send_proofs_title}</h3>
      <p style={hint}>{t.send_proofs_hint}</p>
      {step('parcel', 1, t.proof_parcel)}
      <input
        value={tracking}
        onChange={e => setTracking(e.target.value)}
        placeholder={t.tracking_optional}
        aria-label={t.tracking_optional}
        dir="ltr"
        style={{ width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid #2a2a2a', backgroundColor: '#0D0D0D', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
      />
      {step('slip', 2, t.proof_slip)}
      {error && <div role="alert" style={{ color: '#F87171', fontSize: '13px' }}>{error}</div>}
    </div>
  )
}
