import { useState } from 'react'
import { Link, Loading, Pager, date, useApi, type Row } from '../lib'

const ACTIONS: Record<string, string> = {
  suspend_user: 'Suspension', unsuspend_user: 'Levée de suspension', ban_user: 'Bannissement', unban_user: 'Débannissement',
  add_note: 'Note', block_payments: 'Paiements bloqués', unblock_payments: 'Paiements débloqués', stop_stream: 'Live arrêté',
  suspend_streamer: 'Vendeur suspendu en live', hide_item: 'Article masqué', unhide_item: 'Article visible', remove_item: 'Article supprimé',
  run_automations: 'Automatisations', set_trust_level: 'Niveau de confiance', resolve_dispute_buyer: 'Litige → acheteur', resolve_dispute_seller: 'Litige → vendeur',
}

function target(l: Row) {
  if (l.target_type === 'user' || l.target_type === 'seller') return <Link to={`/utilisateurs/${l.target_id}`}>{l.target_type} {String(l.target_id).slice(0, 8)}</Link>
  if (l.target_type === 'item' && l.details?.seller_id) return <Link to={`/utilisateurs/${l.details.seller_id}?tab=articles`}>article « {l.details.title || String(l.target_id).slice(0, 8)} »</Link>
  return <span>{l.target_type} {String(l.target_id).slice(0, 8)}</span>
}

export default function Journal() {
  const [page, setPage] = useState(1)
  const { data, error, loading } = useApi<Row>(`/api/admin/audit-log?page=${page}&limit=100`)
  return (
    <div>
      <h1>Journal des actions</h1>
      <Loading error={error} loading={loading && !data} />
      {data && (
        <>
          <table className="table"><thead><tr><th>Date</th><th>Admin</th><th>Action</th><th>Cible</th><th>Raison / détails</th></tr></thead>
            <tbody>{data.logs.map((l: Row) => (
              <tr key={l.id}><td>{date(l.created_at)}</td><td className="small">{l.admin_email}</td><td>{ACTIONS[l.action] || l.action.replace(/^resolve_report_/, 'Signalement : ')}</td><td>{target(l)}</td>
                <td className="small">{l.details?.reason || l.details?.note || (Object.keys(l.details || {}).length ? <code>{JSON.stringify(l.details)}</code> : '')}</td></tr>
            ))}</tbody></table>
          <Pager page={page} total={data.total} limit={100} onPage={setPage} />
        </>
      )}
    </div>
  )
}
