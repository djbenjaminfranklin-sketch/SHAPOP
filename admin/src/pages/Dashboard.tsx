import { Badge, Link, Loading, UserLink, date, money, useApi, type Row } from '../lib'

const PROVIDERS: Record<string, string> = { stripe: 'Stripe', airwallex: 'Airwallex', rapyd: 'Rapyd' }

export default function Dashboard() {
  const { data, error, loading, reload } = useApi<Row>('/api/admin/dashboard')
  if (!data) return <Loading error={error} loading={loading} />
  const c = data.counts
  const tiles: [string, number, string?][] = [
    ['Utilisateurs', c.users, '/utilisateurs'], ['Vendeurs', c.sellers, '/utilisateurs?role=seller'], ['Lives en direct', c.lives_now, '/lives'],
    ['Commandes', c.orders, '/commandes'], ['Commandes payées', c.paid_orders, '/commandes?status=paid'], ['Litiges ouverts', c.disputes_open, '/litiges'],
    ['Signalements ouverts', c.reports_open, '/signalements'], ['Articles modérés', c.hidden_items, '/articles?moderation=moderated'],
  ]
  return (
    <div>
      <div className="row between"><h1>Tableau de bord</h1><button className="btn sm" onClick={reload}>Actualiser</button></div>
      <div className="tiles">
        {tiles.map(([label, n, to]) => (
          <Link key={label} to={to || '/'} className={`tile ${(label.includes('Litiges') || label.includes('Signalements')) && n > 0 ? 'alert' : ''}`}>
            <div className="tile-n">{n}</div><div className="tile-l">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid2">
        <section className="card">
          <h2>Chiffre d’affaires (commandes payées)</h2>
          {Object.keys(data.revenue).length === 0 ? <p className="muted">Aucune vente payée.</p> : (
            <table><thead><tr><th>Devise</th><th className="num">Ventes</th><th className="num">Montant</th><th className="num">Commission</th></tr></thead>
              <tbody>{Object.entries(data.revenue as Record<string, Row>).map(([cur, r]) => (
                <tr key={cur}><td>{cur}</td><td className="num">{r.count}</td><td className="num">{money(r.amount, cur)}</td><td className="num">{money(r.fees, cur)}</td></tr>
              ))}</tbody></table>
          )}
          <p className="muted small">Par moyen de paiement : {Object.entries(data.providers as Record<string, number>).map(([p, n]) => `${PROVIDERS[p] || p} ${n}`).join(' · ') || '—'}</p>
        </section>

        <section className="card">
          <div className="row between"><h2>Derniers signalements</h2><Link to="/signalements">Tout voir</Link></div>
          {data.latest_reports.length === 0 ? <p className="muted">Aucun signalement.</p> : (
            <table><tbody>{data.latest_reports.map((r: Row) => (
              <tr key={r.id}><td>{date(r.created_at)}</td><td><UserLink p={r.reported} id={r.reported_id} /></td><td className="ell">{r.reason}</td><td><Badge s={r.status} /></td></tr>
            ))}</tbody></table>
          )}
        </section>

        <section className="card">
          <div className="row between"><h2>Derniers litiges</h2><Link to="/litiges">Tout voir</Link></div>
          {data.latest_disputes.length === 0 ? <p className="muted">Aucun litige.</p> : (
            <table><tbody>{data.latest_disputes.map((d: Row) => (
              <tr key={d.id}><td>{date(d.created_at)}</td><td><UserLink p={d.buyer} id={d.buyer_id} /></td><td>→ <UserLink p={d.seller_profile} id={d.seller_id} /></td><td>{d.reason}</td><td><Badge s={d.status} /></td></tr>
            ))}</tbody></table>
          )}
        </section>

        <section className="card">
          <div className="row between"><h2>Dernières commandes</h2><Link to="/commandes">Tout voir</Link></div>
          <table><tbody>{data.latest_orders.map((o: Row) => (
            <tr key={o.id}><td><Link to={`/commandes/${o.id}`}><code>#{o.ref}</code></Link></td><td>{date(o.created_at)}</td><td className="num">{money(o.amount, o.currency)}</td><td><Badge s={o.status} /></td><td><UserLink p={o.buyer} id={o.buyer_id} /></td></tr>
          ))}</tbody></table>
        </section>
      </div>
    </div>
  )
}
