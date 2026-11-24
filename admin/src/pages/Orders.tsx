import { useEffect, useState } from 'react'
import { Badge, Link, Loading, Pager, Photos, UserLink, date, download, money, navigate, qs, useApi, type Row } from '../lib'

// Statuts où l'argent a réellement été encaissé : les autres lignes n'ont pas de commission réelle
const MONEY_STATUSES = new Set(['paid', 'shipped', 'handed_over', 'delivered', 'disputed', 'return_requested', 'return_rejected'])

export default function Orders() {
  const init = new URLSearchParams(window.location.search)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState(init.get('status') || '')
  const [provider, setProvider] = useState('')
  const [fulfillment, setFulfillment] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(1) }, [debounced, status, provider, fulfillment, from, to])
  const filters = { search: debounced, status, provider, fulfillment, from, to }
  const { data, error, loading } = useApi<Row>(`/api/admin/orders-search${qs({ ...filters, page, limit: 50 })}`)

  const exportCsv = async () => {
    setExporting(true); setExportError(null)
    try { await download(`/api/admin/orders-export${qs(filters)}`, 'shapop-commandes.csv') }
    catch { setExportError('L’export a échoué. Réessaie.') }
    finally { setExporting(false) }
  }

  const fee = (o: Row, v: unknown) => MONEY_STATUSES.has(o.status) && v != null ? money(v, o.currency) : <span className="muted">—</span>

  return (
    <div>
      <div className="row gap" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Commandes</h1>
        <button className="btn" onClick={exportCsv} disabled={exporting}>{exporting ? 'Export…' : '⬇ Exporter (CSV)'}</button>
      </div>
      {exportError && <p className="error">{exportError}</p>}
      <div className="filters">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Réf. (#A1B2C3D4), acheteur, vendeur, e-mail…" />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option><option value="pending_payment">Paiement en attente</option><option value="paid">Payée</option><option value="shipped">Expédiée</option>
          <option value="handed_over">Remise en main propre</option><option value="delivered">Livrée</option><option value="disputed">Litige</option><option value="refunded">Remboursée</option><option value="cancelled">Annulée</option>
        </select>
        <select value={provider} onChange={e => setProvider(e.target.value)}><option value="">Tous paiements</option><option value="stripe">Stripe</option><option value="airwallex">Airwallex</option><option value="rapyd">Rapyd</option></select>
        <select value={fulfillment} onChange={e => setFulfillment(e.target.value)}><option value="">Toute remise</option><option value="post">Poste</option><option value="pickup">Main propre</option></select>
        <label className="muted">Du <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="muted">au <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
      <Loading error={error} loading={loading && !data} />
      {data && (
        <>
          <table className="table hover">
            <thead><tr>
              <th>Réf.</th><th>Date</th><th>Article</th><th>Acheteur</th><th>Vendeur</th>
              <th className="num">Montant</th><th className="num">Commission ShaPop</th><th className="num">Frais de paiement</th><th className="num">Versé au vendeur</th>
              <th>Statut</th><th>Paiement</th><th>Remise</th><th>Versement</th>
            </tr></thead>
            <tbody>
              {data.orders.map((o: Row) => (
                <tr key={o.id} onClick={() => navigate(`/commandes/${o.id}`)}>
                  <td><Link to={`/commandes/${o.id}`}><code>#{o.ref}</code></Link></td><td>{date(o.created_at)}</td>
                  <td><div className="row gap"><Photos urls={o.item?.image_urls?.slice(0, 1)} size={32} /><span className="ell">{o.item?.title || '—'}</span></div></td>
                  <td onClick={e => e.stopPropagation()}><UserLink p={o.buyer} id={o.buyer_id} /></td><td onClick={e => e.stopPropagation()}><UserLink p={o.seller_profile} id={o.seller_id} /></td>
                  <td className="num">{money(o.total_amount ?? o.amount, o.currency)}</td>
                  <td className="num" style={{ color: '#F0908A', fontWeight: 700 }}>{fee(o, o.platform_fee)}</td>
                  <td className="num">{fee(o, o.processing_fee)}</td>
                  <td className="num">{fee(o, o.seller_payout)}</td>
                  <td><Badge s={o.status} /></td><td>{o.payment_provider || 'stripe'}</td><td><Badge s={o.fulfillment_method} /></td><td><Badge s={o.payout_status} /></td>
                </tr>
              ))}
              {data.orders.length === 0 && <tr><td colSpan={13} className="muted pad">Aucune commande.</td></tr>}
            </tbody>
            {(data.totals || []).length > 0 && (
              <tfoot>
                {(data.totals as Row[]).map(t => (
                  <tr key={t.currency} style={{ fontWeight: 800, borderTop: '2px solid #333' }}>
                    <td colSpan={5}>Total {t.currency} — {t.count} vente{t.count > 1 ? 's' : ''} payée{t.count > 1 ? 's' : ''} (filtres appliqués, toutes pages)</td>
                    <td className="num">{money(t.total, t.currency)}</td>
                    <td className="num" style={{ color: '#F0908A' }}>{money(t.commission, t.currency)}</td>
                    <td className="num">{money(t.fees, t.currency)}</td>
                    <td className="num">{money(t.seller, t.currency)}</td>
                    <td colSpan={4} />
                  </tr>
                ))}
              </tfoot>
            )}
          </table>
          <p className="muted" style={{ fontSize: '12px' }}>Commission, frais et versement ne s’affichent que pour les commandes réellement payées (pas en attente, annulées ni remboursées).</p>
          <Pager page={page} total={data.total} limit={50} onPage={setPage} />
        </>
      )}
    </div>
  )
}
