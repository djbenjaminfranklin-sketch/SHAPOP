// Bandeau rose de suivi de commande, au-dessus de la barre du bas (comme les applis de livraison).
// Acheteur : paiement à finaliser / commande payée / prête / envoyée. Vendeur : commandes à remettre.
// N'apparaît que s'il y a quelque chose en cours ; un appui ouvre la commande (ou « À remettre »).
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDir, getLang, tr } from '../lib/i18n'
import { displayItemTitle, formatDateTime } from '../lib/fulfillment'

const content = {
  en: {
    toPay: 'Payment to finish', toPaySub: 'Tap to pay and secure your item',
    preparing: 'Order paid — the seller is preparing it', ready: 'Order ready', readySub: 'It will be handed over or sent very soon',
    shipped: 'Parcel sent', shippedSub: 'Confirm when you receive it', pickup: 'Hand-over in person', pickupSub: 'Give your 4-digit code to the seller',
    toHandOver: (n: number) => n > 1 ? `${n} orders to hand over` : '1 order to hand over', before: 'Before', more: (n: number) => `+${n} more`,
  },
  fr: {
    toPay: 'Paiement à finaliser', toPaySub: 'Appuie pour payer et garder ton article',
    preparing: 'Commande payée — le vendeur la prépare', ready: 'Commande prête', readySub: 'Elle sera remise ou envoyée très bientôt',
    shipped: 'Colis envoyé', shippedSub: 'Confirme quand tu l’as reçu', pickup: 'Remise en main propre', pickupSub: 'Donne ton code à 4 chiffres au vendeur',
    toHandOver: (n: number) => n > 1 ? `${n} commandes à remettre` : '1 commande à remettre', before: 'Avant le', more: (n: number) => `+${n} autre${n > 1 ? 's' : ''}`,
  },
  es: {
    toPay: 'Pago pendiente', toPaySub: 'Toca para pagar y asegurar tu artículo',
    preparing: 'Pedido pagado — el vendedor lo está preparando', ready: 'Pedido listo', readySub: 'Se entregará o enviará muy pronto',
    shipped: 'Paquete enviado', shippedSub: 'Confirma cuando lo recibas', pickup: 'Entrega en mano', pickupSub: 'Da tu código de 4 cifras al vendedor',
    toHandOver: (n: number) => n > 1 ? `${n} pedidos por entregar` : '1 pedido por entregar', before: 'Antes del', more: (n: number) => `+${n} más`,
  },
  ru: {
    toPay: 'Завершите оплату', toPaySub: 'Нажми, чтобы оплатить и закрепить товар',
    preparing: 'Заказ оплачен — продавец готовит его', ready: 'Заказ готов', readySub: 'Скоро будет передан или отправлен',
    shipped: 'Посылка отправлена', shippedSub: 'Подтверди, когда получишь', pickup: 'Передача лично', pickupSub: 'Назови продавцу свой 4-значный код',
    toHandOver: (n: number) => `К передаче: ${n}`, before: 'До', more: (n: number) => `ещё ${n}`,
  },
  he: {
    toPay: 'יש להשלים תשלום', toPaySub: 'הקישו כדי לשלם ולשמור את הפריט',
    preparing: 'ההזמנה שולמה — המוכר מכין אותה', ready: 'ההזמנה מוכנה', readySub: 'היא תימסר או תישלח בקרוב',
    shipped: 'החבילה נשלחה', shippedSub: 'אשרו כשתקבלו אותה', pickup: 'מסירה ביד', pickupSub: 'מסרו למוכר את הקוד בן 4 הספרות',
    toHandOver: (n: number) => n > 1 ? `${n} הזמנות למסירה` : 'הזמנה אחת למסירה', before: 'עד', more: (n: number) => `+${n} נוספות`,
  },
}

type BarOrder = { id: string; status: string; fulfillment_method: string | null; prepared_at: string | null; handover_deadline: string | null; item?: { title: string | null } | null }
type Bar = { title: string; sub: string; to: string; extra: number }

const HIDDEN_PREFIXES = ['/order/', '/pay/', '/to-hand-over', '/payments', '/payouts-israel']

export default function ActiveOrderBar({ userId, path }: { userId: string; path: string }) {
  const navigate = useNavigate()
  const lang = getLang()
  const c = tr(content, lang)
  const [bar, setBar] = useState<Bar | null>(null)

  const load = useCallback(async () => {
    const [{ data: bought }, { count: toHandOver, data: sold }] = await Promise.all([
      supabase.from('orders')
        .select('id, status, fulfillment_method, prepared_at, handover_deadline, item:items(title)')
        .eq('buyer_id', userId).in('status', ['pending_payment', 'paid', 'shipped'])
        .order('created_at', { ascending: false }).limit(10),
      supabase.from('orders')
        .select('id, handover_deadline', { count: 'exact' })
        .eq('seller_id', userId).eq('status', 'paid').in('fulfillment_method', ['pickup', 'post'])
        .order('handover_deadline', { ascending: true }).limit(1),
    ])
    const buyerOrders = (bought || []) as unknown as BarOrder[]
    const toPay = buyerOrders.filter(o => o.status === 'pending_payment')
    const inProgress = buyerOrders.filter(o => o.status !== 'pending_payment')
    const title = (o: BarOrder) => displayItemTitle(o.item?.title)

    if (toPay.length) {
      const o = toPay[0]
      setBar({ title: c.toPay, sub: title(o) || c.toPaySub, to: `/pay/${o.id}`, extra: toPay.length - 1 + inProgress.length })
    } else if ((toHandOver || 0) > 0) {
      const first = (sold || [])[0] as { handover_deadline?: string | null } | undefined
      setBar({
        title: c.toHandOver(toHandOver || 0),
        sub: first?.handover_deadline ? `${c.before} ${formatDateTime(first.handover_deadline, lang)}` : '',
        to: '/to-hand-over', extra: inProgress.length,
      })
    } else if (inProgress.length) {
      const o = inProgress[0]
      const [t, s] = o.status === 'shipped' ? [c.shipped, c.shippedSub]
        : o.fulfillment_method === 'pickup' && o.prepared_at ? [c.pickup, c.pickupSub]
        : o.prepared_at ? [c.ready, c.readySub]
        : [c.preparing, title(o)]
      setBar({ title: t, sub: s || title(o), to: `/order/${o.id}`, extra: inProgress.length - 1 })
    } else {
      setBar(null)
    }
  }, [userId, c, lang])

  useEffect(() => {
    load().catch(() => {})
    const t = setInterval(() => { load().catch(() => {}) }, 60_000)
    return () => clearInterval(t)
  }, [load, path])

  // Seulement sur l'Accueil et Activité : ailleurs, il cachait le bas des pages (fiche article, boutique, communautés…)
  const visible = !!bar && (path === '/' || path === '/home' || path === '/activity') && !HIDDEN_PREFIXES.some(p => path.startsWith(p))

  // Le bandeau flotte au-dessus du bas de page : on ajoute la même hauteur en bas de la page
  // pour que les derniers boutons (Acheter, Supprimer l'annonce…) restent atteignables en défilant.
  useEffect(() => {
    if (!visible) return
    const html = document.documentElement
    html.classList.add('has-order-bar')
    return () => html.classList.remove('has-order-bar')
  }, [visible])

  if (!visible || !bar) return null

  return (
    <button
      dir={getDir()}
      onClick={() => navigate(bar.to)}
      style={{
        position: 'fixed', left: 0, right: 0, zIndex: 49,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)', margin: '0 10px', borderRadius: '14px',
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        background: '#0d0d12', border: '1.5px solid rgba(0,229,255,0.62)', color: '#00E5FF',
        textAlign: 'start', cursor: 'pointer', boxShadow: '0 0 14px rgba(0,229,255,0.28)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M18 15l-6-6-6 6" /></svg>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bar.title}</span>
        {bar.sub && <span style={{ display: 'block', fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bar.sub}</span>}
      </span>
      {bar.extra > 0 && (
        <span style={{ flexShrink: 0, fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, padding: '4px 8px', borderRadius: '999px', backgroundColor: 'rgba(0, 229, 255,0.18)' }}>{c.more(bar.extra)}</span>
      )}
    </button>
  )
}
