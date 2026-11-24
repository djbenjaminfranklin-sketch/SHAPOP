import { useState } from 'react'
import { Badge, Photos, Link, Loading, UserLink, api, confirmAction, date, run, useApi, type Row } from '../lib'

const ACTIONS: [string, string, boolean][] = [
  ['dismiss', 'Classer sans suite', false], ['warn', 'Avertir (note)', false], ['remove_item', 'Supprimer l’article', true],
  ['suspend', 'Suspendre', true], ['ban', 'Bannir', true],
]
const ACTION_FR: Record<string, string> = Object.fromEntries(ACTIONS.map(([k, l]) => [k, l]))

export default function Reports() {
  const [status, setStatus] = useState('open')
  const [type, setType] = useState('')
  const { data, error, loading, reload } = useApi<Row>(`/api/admin/reports?status=${status}&type=${type}`)

  const resolve = async (r: Row, action: string, danger: boolean) => {
    const who = r.reported?.display_name || 'cet utilisateur'
    const titles: Record<string, string> = {
      dismiss: 'Classer ce signalement sans suite ?', warn: `Consigner un avertissement pour ${who} ?`,
      remove_item: `Supprimer l’article « ${r.item?.title || ''} » ?`, suspend: `Suspendre ${who} ?`, ban: `Bannir ${who} ?`,
    }
    const note = await confirmAction({ title: titles[action], danger, confirmLabel: ACTION_FR[action], message: action === 'warn' ? 'Aucun message n’est envoyé à l’utilisateur : l’avertissement est noté dans sa fiche.' : undefined })
    if (note === null) return
    run('Signalement traité', () => api(`/api/admin/reports/${r.id}/resolve`, { method: 'POST', body: { action, note } }), reload)
  }
  const contactStatus = (m: Row, s: string) => run('Message mis à jour', () => api(`/api/admin/contact-messages/${m.id}/status`, { method: 'POST', body: { status: s } }), reload)

  return (
    <div>
      <h1>Signalements</h1>
      <div className="filters">
        <select value={status} onChange={e => setStatus(e.target.value)}><option value="open">Ouverts</option><option value="resolved">Traités</option><option value="all">Tous</option></select>
        <select value={type} onChange={e => setType(e.target.value)}><option value="">Tous les types</option><option value="user">Utilisateur</option><option value="item">Article</option><option value="stream">Live</option><option value="message">Message</option></select>
      </div>
      <Loading error={error} loading={loading && !data} />
      {data && (
        <>
          <section className="card">
            <h2>File des signalements ({data.reports.length})</h2>
            {data.reports.length === 0 ? <p className="muted">Aucun signalement {status === 'open' ? 'ouvert' : ''}.</p> : data.reports.map((r: Row) => (
              <div key={r.id} className="report">
                <div className="report-main">
                  <div className="row gap"><Badge s={r.status} /><span className="muted small">{date(r.created_at)}</span><span>par <UserLink p={r.reporter} id={r.reporter_id} /></span><span>contre <UserLink p={r.reported} id={r.reported_id} /></span></div>
                  <div className="reason">{r.reason}</div>
                  {r.context && <div className="muted small">Contexte : {r.context}</div>}
                  {r.item && <div className="ctx row gap"><Photos urls={r.item.image_urls} size={56} /><div>Article : <b>{r.item.title}</b> <Badge s={r.item.status} /> {r.item.moderation_status && <Badge s={r.item.moderation_status} />}</div></div>}
                  {r.stream && <div className="ctx">Live : <b>{r.stream.title}</b> <Badge s={r.stream.status} /> {r.stream.recording_url && <a href={r.stream.recording_url} target="_blank" rel="noreferrer">Voir l’enregistrement</a>}</div>}
                  {r.message && <div className="ctx">Message : « {r.message.message} » <span className="muted small">{date(r.message.created_at)}</span></div>}
                  {r.status !== 'open' && <div className="small muted">Décision : {ACTION_FR[r.resolution_action] || r.resolution_action} — {r.resolution_note || ''} ({date(r.resolved_at)})</div>}
                </div>
                {r.status === 'open' && (
                  <div className="actions">
                    {ACTIONS.filter(([k]) => k !== 'remove_item' || r.item_id).map(([k, l, d]) => (
                      <button key={k} className={`btn sm ${d ? (k === 'ban' ? 'danger' : 'warnb') : ''}`} onClick={() => resolve(r, k, d)}>{l}</button>
                    ))}
                    <Link to={`/utilisateurs/${r.reported_id}`} className="btn sm">Fiche 360</Link>
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className="card">
            <h2>Formulaire de contact ({data.contact_messages.length})</h2>
            {data.contact_messages.length === 0 ? <p className="muted">Aucun message.</p> : (
              <table className="table"><thead><tr><th>Date</th><th>De</th><th>Sujet</th><th>Message</th><th>Statut</th><th></th></tr></thead>
                <tbody>{data.contact_messages.map((m: Row) => (
                  <tr key={m.id}><td>{date(m.created_at)}</td><td>{m.user_id ? <UserLink id={m.user_id} p={{ id: m.user_id, display_name: m.user_name }} /> : m.user_name} <div className="muted small">{m.user_email}</div></td>
                    <td>{m.topic}</td><td className="msg">{m.message}</td><td><Badge s={m.status} /></td>
                    <td><select value={m.status} onChange={e => contactStatus(m, e.target.value)}><option value="new">Nouveau</option><option value="read">Lu</option><option value="replied">Répondu</option><option value="closed">Fermé</option></select></td></tr>
                ))}</tbody></table>
            )}
          </section>

          <section className="card">
            <h2>Messages filtrés automatiquement ({data.flagged_messages.length})</h2>
            {data.flagged_messages.length === 0 ? <p className="muted">Aucun message filtré.</p> : (
              <table className="table"><tbody>{data.flagged_messages.map((m: Row) => (
                <tr key={m.id}><td>{date(m.created_at)}</td><td><UserLink id={m.sender_id} p={null} /></td><td className="msg">{m.message}</td><td><span className="badge orange">{m.flag_reason}</span></td></tr>
              ))}</tbody></table>
            )}
          </section>
        </>
      )}
    </div>
  )
}
