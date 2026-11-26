import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
const title: React.CSSProperties = { margin: 0, fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800, color: '#fff' }
const hint: React.CSSProperties = { margin: 0, fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.45 }
const primaryBtn = (enabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: 'calc(15px * var(--fs, 1))',
  background: enabled ? 'linear-gradient(135deg, #00E5FF, #0091EA)' : '#333', color: enabled ? '#001014' : '#f0f0f0',
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
          <span style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>
            {data.fulfillment_method === 'pickup' ? t.method_pickup : data.fulfillment_method === 'post' ? t.method_post : data.fulfillment_method === 'legacy_carrier' ? t.method_legacy : ''}
          </span>
          <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: awaiting ? '#00E5FF' : '#22C55E' }}>{statusLabel(data.status, lang)}</span>
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
          <p style={{ ...hint, color: data.payout_status === 'released' ? '#22C55E' : '#f0f0f0' }}>
            {data.payout_status === 'released'
              ? t.payout_released
              : data.payout_status === 'held' && data.payout_scheduled_at && data.status === 'shipped'
                ? <>{t.payout_scheduled} <strong style={{ color: '#ddd' }}>{formatDateTime(data.payout_scheduled_at, lang)}</strong></>
                : awaiting ? t.payout_held : ''}
          </p>
        )}
      </div>

      {/* Envoi postal : l'acheteur peut confirmer la réception pour payer le vendeur tout de suite */}
      {isBuyer && data.fulfillment_method === 'post' && data.status === 'shipped' && data.payout_status === 'held' && (
        <ConfirmReceipt orderId={orderId} onDone={refresh} />
      )}

      {isBuyer && data.fulfillment_method === 'post' && data.status === 'delivered' && data.payout_status === 'held' && data.claim_deadline && new Date(data.claim_deadline) > new Date() && (
        <ClaimWindow orderId={orderId} deadline={data.claim_deadline} />
      )}

      {/* Code de retrait : visible par l'acheteur seulement (le serveur ne l'envoie qu'à lui) */}
      {isBuyer && data.fulfillment_method === 'pickup' && data.handover?.code && awaiting && (
        <div style={{ ...card, alignItems: 'center', textAlign: 'center', borderColor: 'rgba(0, 229, 255,0.4)' }}>
          <h3 style={title}>{t.your_code_title}</h3>
          <div dir="ltr" aria-label={t.your_code_title} style={{ fontSize: 'calc(40px * var(--fs, 1))', fontWeight: 900, letterSpacing: '12px', color: '#00E5FF', fontVariantNumeric: 'tabular-nums' }}>
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
        <ShipForm orderId={orderId} hasParcel={!!data.proofs.parcel_url} hasSlip={!!data.proofs.slip_url} onDone={refresh} />
      )}

      {/* Après l'envoi : numéro de suivi + ce que dit la poste ; le vendeur garde son code sous les yeux */}
      {data.fulfillment_method === 'post' && !awaiting && data.tracking_number && (data.carrier?.status || !(data.proofs.parcel_url || data.proofs.slip_url)) && (
        <div style={card}>
          {!(data.proofs.parcel_url || data.proofs.slip_url) && (
            <p style={hint}>{t.tracking_number}{t.colon} <span dir="ltr" style={{ color: '#ddd', fontWeight: 700 }}>{data.tracking_number}</span></p>
          )}
          {data.carrier?.status && (
            <p style={hint}>{t.carrier_label}{t.colon} <strong style={{ color: data.carrier.status === 'delivered' ? '#22C55E' : '#ddd' }}>{(t as Record<string, string>)[`carrier_${data.carrier.status}`] || data.carrier.status}</strong></p>
          )}
        </div>
      )}

      {data.fulfillment_method === 'post' && (data.proofs.parcel_url || data.proofs.slip_url) && (!isSeller || !awaiting) && (
        <div style={card}>
          <h3 style={title}>{t.proofs_title}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {([['parcel_url', t.proof_parcel], ['slip_url', t.proof_slip]] as const).map(([key, label]) => data.proofs[key] ? (
              <a key={key} href={data.proofs[key]!} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <img src={data.proofs[key]!} alt={label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', border: '1px solid #2a2a2a' }} />
                <span style={{ display: 'block', fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', marginTop: '4px' }}>{label}</span>
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
                <a href={data.contact.whatsapp_link} target="_blank" rel="noreferrer" className="no-theme-invert" style={{
                  display: 'block', textAlign: 'center', padding: '13px', borderRadius: '12px', fontWeight: 800,
                  backgroundColor: '#25D366', color: '#fff', textDecoration: 'none', fontSize: 'calc(15px * var(--fs, 1))',
                }}>{t.contact_whatsapp}</a>
              )}
              {data.contact.email_link && (
                <a href={data.contact.email_link} style={{
                  display: 'block', textAlign: 'center', padding: '13px', borderRadius: '12px', fontWeight: 700,
                  border: '1px solid #333', color: '#fff', textDecoration: 'none', fontSize: 'calc(15px * var(--fs, 1))',
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
          color: '#fff', fontSize: 'calc(28px * var(--fs, 1))', letterSpacing: '14px', textAlign: 'center', boxSizing: 'border-box', fontWeight: 800,
        }}
      />
      {typeof attemptsLeft === 'number' && attemptsLeft < 5 && !error && !isLocked && (
        <p style={hint}>{t.wrong_code} {attemptsLeft}</p>
      )}
      {error && <div role="alert" style={{ color: '#F87171', fontSize: 'calc(13px * var(--fs, 1))' }}>{error}</div>}
      <button type="button" onClick={submit} disabled={!ok} style={primaryBtn(ok)}>{busy ? t.sending : t.enter_code_button}</button>
    </div>
  )
}

function ConfirmReceipt({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const lang = getLang()
  const t = ft(lang)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const submit = async (conform: boolean) => {
    setBusy(true)
    setError(null)
    try {
      await fulfillmentApi.confirmReceipt(orderId, conform)
      setDone(true)
      onDone()
    } catch (err) {
      setError(errorText(err instanceof ApiError ? err.code : 'error', lang))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div style={{ ...card, borderColor: 'rgba(0, 229, 255,0.4)' }}>
      {!done && <h3 style={title}>{t.receipt_title}</h3>}
      <p style={hint}>{done ? t.receipt_confirmed : t.receipt_hint}</p>
      {!done && (
        <>
          <button type="button" onClick={() => submit(true)} disabled={busy} style={primaryBtn(!busy)}>{busy ? t.sending : t.conform_button}</button>
          <button type="button" onClick={() => submit(false)} disabled={busy} style={{ ...primaryBtn(!busy), background: 'transparent', border: '1px solid #00E5FF', color: '#00E5FF' }}>{t.check_button}</button>
          <button type="button" onClick={() => navigate('/rules')} style={{ background: 'none', border: 'none', color: '#f0f0f0', textDecoration: 'underline', fontSize: 'calc(12px * var(--fs, 1))', cursor: 'pointer', padding: 0 }}>{t.rules_link}</button>
        </>
      )}
      {error && <p role="alert" style={{ ...hint, color: '#F87171' }}>{error}</p>}
    </div>
  )
}

function ClaimWindow({ orderId, deadline }: { orderId: string; deadline: string }) {
  const lang = getLang()
  const t = ft(lang)
  const navigate = useNavigate()
  return (
    <div style={{ ...card, borderColor: 'rgba(0, 229, 255,0.4)' }}>
      <h3 style={title}>{t.claim_window_title}</h3>
      <p style={hint}>{t.claim_window_hint} <strong style={{ color: '#ddd' }}>{formatDateTime(deadline, lang)}</strong>{t.claim_window_after}</p>
      <button type="button" onClick={() => navigate(`/dispute/${orderId}`)} style={{ ...primaryBtn(true), background: 'linear-gradient(135deg, #F97316, #0091EA)' }}>{t.report_problem}</button>
    </div>
  )
}

/** Vendeur, envoi par la poste : 2 photos (preuves de litige) + numéro de suivi obligatoire. */
function ShipForm({ orderId, hasParcel, hasSlip, onDone }: { orderId: string; hasParcel: boolean; hasSlip: boolean; onDone: () => void }) {
  const lang = getLang()
  const t = ft(lang)
  const [tracking, setTracking] = useState('')
  const [sent, setSent] = useState({ parcel: hasParcel, slip: hasSlip })
  const [photoBusy, setPhotoBusy] = useState<'parcel' | 'slip' | null>(null)
  const inputs = { parcel: useRef<HTMLInputElement>(null), slip: useRef<HTMLInputElement>(null) }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (kind: 'parcel' | 'slip', file: File | undefined) => {
    if (!file) return
    setPhotoBusy(kind)
    setError(null)
    try {
      const image = await fileToJpegDataUrl(file)
      await fulfillmentApi.submitProof(orderId, kind, image, undefined, true)
      setSent(s => ({ ...s, [kind]: true }))
    } catch (err) {
      setError(err instanceof ApiError ? errorText(err.code, lang) : t.error_generic)
    } finally {
      setPhotoBusy(null)
      const ref = inputs[kind].current
      if (ref) ref.value = ''
    }
  }

  const step = (kind: 'parcel' | 'slip', n: number, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', backgroundColor: '#0D0D0D', border: '1px solid #222' }}>
      <span style={{
        width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontWeight: 800, fontSize: 'calc(13px * var(--fs, 1))', backgroundColor: sent[kind] ? '#22C55E' : '#333', color: '#fff',
      }}>{sent[kind] ? '✓' : n}</span>
      <span style={{ flex: 1, fontSize: 'calc(13px * var(--fs, 1))', color: '#ddd' }}>{label}{sent[kind] ? ` — ${t.photo_sent}` : ''}</span>
      <input ref={inputs[kind]} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => onFile(kind, e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputs[kind].current?.click()}
        disabled={photoBusy !== null}
        style={{ padding: '9px 12px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: 'calc(13px * var(--fs, 1))', cursor: 'pointer',
          backgroundColor: sent[kind] ? '#222' : '#00E5FF', color: sent[kind] ? '#ccc' : '#001014', whiteSpace: 'nowrap' }}
      >
        {photoBusy === kind ? t.sending : sent[kind] ? t.retake_photo : t.take_photo}
      </button>
    </div>
  )

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await fulfillmentApi.ship(orderId, tracking)
      onDone()
    } catch (err) {
      setError(errorText(err instanceof ApiError ? err.code : 'error', lang))
    } finally {
      setBusy(false)
    }
  }
  const photosOk = sent.parcel && sent.slip
  const ok = !busy && photosOk && tracking.replace(/[\s-]/g, '').length >= 8
  return (
    <div style={card}>
      <h3 style={title}>{t.ship_title}</h3>
      <p style={hint}>{t.ship_photos_hint}</p>
      {step('parcel', 1, t.proof_parcel)}
      {step('slip', 2, t.proof_slip)}
      <p style={hint}>{t.tracking_hint}</p>
      <input
        value={tracking}
        onChange={e => setTracking(e.target.value.toUpperCase())}
        placeholder={t.tracking_label}
        aria-label={t.tracking_label}
        autoCapitalize="characters"
        autoCorrect="off"
        dir="ltr"
        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #2a2a2a', backgroundColor: '#0D0D0D', color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', boxSizing: 'border-box', letterSpacing: '1px' }}
      />
      {!photosOk && tracking.trim().length > 0 && <p style={{ ...hint, color: '#00E5FF' }}>{t.photos_required}</p>}
      {error && <div role="alert" style={{ color: '#F87171', fontSize: 'calc(13px * var(--fs, 1))' }}>{error}</div>}
      <button type="button" onClick={submit} disabled={!ok} style={primaryBtn(ok)}>{busy ? t.sending : t.ship_button}</button>
    </div>
  )
}
