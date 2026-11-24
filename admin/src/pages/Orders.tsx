import { useEffect, useState } from 'react'
import { Badge, Link, Loading, Pager, Photos, UserLink, date, money, navigate, qs, useApi, type Row } from '../lib'

export default function Orders() {
  const init = new URLSearchParams(window.location.search)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState(init.get('status') || '')
  const [provider, setProvider] = useState('')
  const [fulfillment, setFulfillment] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(1) }, [debounced, status, provider, fulfillment])
  const { data, error, loading } = useApi<Row>(`/api/admin/orders-search${qs({ search: debounced, status, provider, fulfillment, page, limit: 50 })}`)
  return (
    <div>
      <h1>Commandes</h1>
      <div className="filters">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Réf. (#A1B2C3D4), acheteur, vendeur, e-mail…" />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option><option value="pending_payment">Paiement en attente</option><option value="paid">Payée</option><option value="shipped">Expédiée</option>
          <option value="handed_over">Remise en main propre</option><option value="delivered">Livrée</option><option value="disputed">Litige</option><option value="refunded">Remboursée</option><option value="cancelled">Annulée</option>
        </select>
        <select value={provider} onChange={e => setProvider(e.target.value)}><option value="">Tous paiements</option><option value="stripe">Stripe</option><option value="airwallex">Airwallex</option><option value="rapyd">Rapyd</option></select>
        <select value={fulfillment} onChange={e => setFulfillment(e.target.value)}><option value="">Toute remise</option><option value="post">Poste</option><option value="pickup">Main propre</option></select>
      </div>
      <Loading error={error} loading={loading && !data} />
      {data && (
        <>
          <table className="table hover">
            <thead><tr><th>Réf.</th><th>Date</th><th>Article</th><th>Acheteur</th><th>Vendeur</th><th className="num">Montant</th><th>Statut</th><th>Paiement</th><th>Remise</th><th>Versement</th></tr></thead>
            <tbody>
              {data.orders.map((o: Row) => (
                <tr key={o.id} onClick={() => navigate(`/commandes/${o.id}`)}>
                  <td><Link to={`/commandes/${o.id}`}><code>#{o.ref}</code></Link></td><td>{date(o.created_at)}</td>
                  <td><div className="row gap"><Photos urls={o.item?.image_urls?.slice(0, 1)} size={32} /><span className="ell">{o.item?.title || '—'}</span></div></td>
                  <td onClick={e => e.stopPropagation()}><UserLink p={o.buyer} id={o.buyer_id} /></td><td onClick={e => e.stopPropagation()}><UserLink p={o.seller_profile} id={o.seller_id} /></td>
                  <td className="num">{money(o.amount, o.currency)}</td><td><Badge s={o.status} /></td><td>{o.payment_provider || 'stripe'}</td><td><Badge s={o.fulfillment_method} /></td><td><Badge s={o.payout_status} /></td>
                </tr>
              ))}
              {data.orders.length === 0 && <tr><td colSpan={10} className="muted pad">Aucune commande.</td></tr>}
            </tbody>
          </table>
          <Pager page={page} total={data.total} limit={50} onPage={setPage} />
        </>
      )}
    </div>
  )
}
