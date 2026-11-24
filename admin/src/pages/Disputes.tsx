import { useState } from 'react'
import { Badge, Link, Loading, Photos, UserLink, api, confirmAction, date, money, run, useApi, type Row } from '../lib'

export default function Disputes() {
  const { data, error, loading, reload } = useApi<Row[]>('/api/admin/disputes-enhanced')
  const [filter, setFilter] = useState('open')
  const resolve = async (d: Row, resolution: 'buyer' | 'seller') => {
    const note = await confirmAction({
      title: resolution === 'buyer' ? 'Donner raison à l’acheteur ?' : 'Donner raison au vendeur ?',
      message: resolution === 'buyer' ? `L’acheteur sera REMBOURSÉ (${money(d.amount, d.order?.currency)}) et le versement au vendeur annulé. Irréversible.` : 'La commande passe en « livrée » et le score de l’acheteur baisse.',
      confirmLabel: resolution === 'buyer' ? 'Rembourser l’acheteur' : 'Valider pour le vendeur',
    })
    if (note === null) return
    run('Litige tranché', () => api(`/api/admin/disputes/${d.id}/resolve`, { method: 'POST', body: { resolution, note } }), reload)
  }
  if (!data) return <Loading error={error} loading={loading} />
  const closed = (d: Row) => ['resolved_buyer', 'resolved_seller'].includes(d.status)
  const list = data.filter(d => filter === 'all' || (filter === 'open' ? !closed(d) : closed(d)))
  return (
    <div>
      <h1>Litiges</h1>
      <div className="filters"><select value={filter} onChange={e => setFilter(e.target.value)}><option value="open">En cours</option><option value="closed">Tranchés</option><option value="all">Tous</option></select></div>
      {list.length === 0 && <p className="muted pad">Aucun litige.</p>}
      {list.map(d => (
        <div key={d.id} className="card report">
          <div className="report-main">
            <div className="row gap"><Badge s={d.status} /><span className="muted small">{date(d.created_at)}</span>
              <span>Acheteur <UserLink p={d.buyer_profile && { ...d.buyer_profile, id: d.buyer_id }} id={d.buyer_id} /></span>
              <span>Vendeur <UserLink p={d.seller_profile && { ...d.seller_profile, id: d.seller_id }} id={d.seller_id} /></span>
              <Link to={`/commandes/${d.order_id}`}>Commande #{String(d.order_id).slice(0, 8).toUpperCase()}</Link>
              <b>{money(d.amount, d.order?.currency)}</b></div>
            <div className="reason">{d.reason}</div>
            {d.description && <p>{d.description}</p>}
            <div className="row gap top">
              <div><div className="muted small">Article</div><Photos urls={d.order?.item?.image_urls} size={60} /></div>
              <div><div className="muted small">Photos acheteur</div><Photos urls={[...(d.photo_urls || []), ...(d.evidence_urls || [])]} size={60} /></div>
              <div><div className="muted small">Photos vendeur</div><Photos urls={[...(d.seller_photo_urls || []), ...(d.shipping_proofs || []).map((p: Row) => p.url)]} size={60} /></div>
            </div>
            {d.resolution_note && <div className="small muted">Décision : {d.resolution_note} ({date(d.resolved_at)})</div>}
          </div>
          {!closed(d) && (
            <div className="actions">
              <button className="btn sm danger" onClick={() => resolve(d, 'buyer')}>Rembourser l’acheteur</button>
              <button className="btn sm" onClick={() => resolve(d, 'seller')}>Donner raison au vendeur</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
