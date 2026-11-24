import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getDir, getLang } from '../lib/i18n'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatDateTime, formatMoney, shortOrderRef } from '../lib/fulfillment'
import { ft } from '../lib/fulfillmentText'

interface HandoverOrder {
  id: string
  amount: number
  total_amount: number | null
  currency: string | null
  fulfillment_method: 'pickup' | 'post' | null
  handover_deadline: string | null
  proof_parcel_path: string | null
  proof_slip_path: string | null
  shipping_address?: { name?: string; street?: string; city?: string; zip?: string; country?: string; phone?: string } | null
  item?: { title: string; image_urls: string[] } | null
  buyer_profile?: { display_name: string | null; username: string | null } | null
}

/**
 * « À remettre » (vendeur) : commandes payées qui attendent encore leur preuve —
 * le code de l'acheteur (retrait en main propre) ou les 2 photos (envoi par la poste).
 * Remplace l'ancienne page « Mes envois » (étiquettes / transporteurs).
 */
export default function HandoverPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()
  const t = ft(lang)
  usePageTitle(t.to_hand_over)

  const [orders, setOrders] = useState<HandoverOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Bloc d'adresse prêt à recopier sur le colis : nom, rue, code postal + ville, pays, téléphone,
  // puis la commande exacte (article avec son code, référence, montant)
  const addressBlock = (o: HandoverOrder) => {
    const a = o.shipping_address || {}
    return [
      a.name, a.street, `${a.zip || ''} ${a.city || ''}`.trim(), a.country,
      a.phone ? `${t.phone_label} : ${a.phone}` : '',
    ].filter(Boolean).join('\n')
  }
  const orderLine = (o: HandoverOrder) =>
    `${t.order_label} #${shortOrderRef(o.id)} — ${t.item_label} : ${o.item?.title || ''} — ${formatMoney(o.total_amount ?? o.amount, o.currency, lang)}`
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* rien */ }
      document.body.removeChild(ta)
    }
    setCopied(key); setTimeout(() => setCopied(c => (c === key ? null : c)), 2000)
  }
  const postOrders = orders.filter(o => o.fulfillment_method === 'post' && o.shipping_address)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(false)
    const { data, error: err } = await supabase
      .from('orders')
      .select('id, amount, total_amount, currency, fulfillment_method, handover_deadline, proof_parcel_path, proof_slip_path, shipping_address, item:items(title, image_urls), buyer_profile:profiles!orders_buyer_id_fkey(display_name, username)')
      .eq('seller_id', user.id)
      .eq('status', 'paid')
      .in('fulfillment_method', ['pickup', 'post'])
      .order('handover_deadline', { ascending: true })
      .limit(100)
    if (err) setError(true)
    setOrders((data as unknown as HandoverOrder[]) || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user, navigate])
  if (!user) return null

  return (
    <div dir={getDir()} style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#fff' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1A1A1A', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)', paddingBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px' }}>
          <button
            onClick={() => navigate(-1)}
            aria-label={t.back}
            style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#fff', cursor: 'pointer', flexShrink: 0, fontSize: '18px' }}
          >
            <span style={{ display: 'inline-block', transform: getDir() === 'rtl' ? 'scaleX(-1)' : undefined }}>‹</span>
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{t.to_hand_over}</h1>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '640px', margin: '0 auto' }}>
        {loading && <div style={{ color: '#888', textAlign: 'center', padding: '32px' }}>…</div>}
        {!loading && error && <div style={{ color: '#F87171', textAlign: 'center', padding: '32px' }}>{t.error_generic}</div>}
        {!loading && !error && orders.length === 0 && (
          <div style={{ color: '#888', textAlign: 'center', padding: '48px 16px' }}>{t.to_hand_over_empty}</div>
        )}
        {postOrders.length > 1 && (
          <button
            onClick={() => copy('all', postOrders.map(o => `${addressBlock(o)}\n${orderLine(o)}`).join('\n\n────────\n\n'))}
            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#161616', color: copied === 'all' ? '#22C55E' : '#F0908A', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
          >{copied === 'all' ? `✓ ${t.copied}` : `📋 ${t.copy_all_addresses} (${postOrders.length})`}</button>
        )}
        {orders.map(o => {
          const image = o.item?.image_urls?.[0]
          const photosSent = (o.proof_parcel_path ? 1 : 0) + (o.proof_slip_path ? 1 : 0)
          const late = o.handover_deadline ? new Date(o.handover_deadline).getTime() - Date.now() < 24 * 3600 * 1000 : false
          return (
            <div key={o.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => navigate(`/order/${o.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '14px', cursor: 'pointer',
                backgroundColor: '#111', border: late ? '1px solid rgba(248,113,113,0.5)' : '1px solid #222', color: '#fff', textAlign: 'start', width: '100%',
              }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '10px', backgroundColor: '#1a1a1a', overflow: 'hidden', flexShrink: 0 }}>
                {image && <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.item?.title || `#${shortOrderRef(o.id)}`}
                </div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                  {o.fulfillment_method === 'pickup' ? t.method_pickup : t.method_post}
                  {o.buyer_profile?.display_name || o.buyer_profile?.username ? ` · ${o.buyer_profile?.display_name || o.buyer_profile?.username}` : ''}
                </div>
                <div style={{ fontSize: '12px', color: '#F0908A', marginTop: '2px' }}>
                  {o.fulfillment_method === 'pickup' ? t.awaiting_code : `${t.awaiting_photos} (${photosSent}/2)`}
                </div>
                {o.handover_deadline && (
                  <div style={{ fontSize: '11px', color: late ? '#F87171' : '#777', marginTop: '2px' }}>
                    {t.deadline} {formatDateTime(o.handover_deadline, lang)}
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 800, fontSize: '14px', whiteSpace: 'nowrap' }}>
                {formatMoney(o.total_amount ?? o.amount, o.currency, lang)}
              </div>
            </button>
            {o.fulfillment_method === 'post' && o.shipping_address && (
              <div style={{ margin: '-4px 0 4px', padding: '12px', borderRadius: '0 0 14px 14px', backgroundColor: '#0f0f0f', border: '1px solid #222', borderTop: 'none' }}>
                {/* Grande photo de l'article : le vendeur voit tout de suite quoi mettre dans ce colis */}
                {o.item?.image_urls?.[0] && (
                  <img src={o.item.image_urls[0]} alt="" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px', backgroundColor: '#1a1a1a' }} />
                )}
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{t.ship_to}</div>
                <div dir="auto" style={{ whiteSpace: 'pre-line', fontSize: '15px', lineHeight: 1.5, fontWeight: 600, color: '#fff', userSelect: 'text', WebkitUserSelect: 'text' }}>{addressBlock(o)}</div>
                <div dir="auto" style={{ marginTop: '8px', fontSize: '12px', color: '#aaa', userSelect: 'text', WebkitUserSelect: 'text' }}>{orderLine(o)}</div>
                <button
                  onClick={() => copy(o.id, `${addressBlock(o)}\n${orderLine(o)}`)}
                  style={{ marginTop: '10px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#161616', color: copied === o.id ? '#22C55E' : '#ddd', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >{copied === o.id ? `✓ ${t.copied}` : `📋 ${t.copy_address}`}</button>
              </div>
            )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
