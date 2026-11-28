import { Badge, Loading, Photos, UserLink, api, confirmAction, date, run, useApi, type Row } from '../lib'

export default function Lives() {
  const live = useApi<Row[]>('/api/admin/streams?status=live')
  // Lives programmés (« Bientôt » sur l'accueil) : retirables par l'admin (28/11/2026)
  const sched = useApi<Row[]>('/api/admin/streams?status=scheduled')
  const hist = useApi<Row[]>('/api/admin/streams-history?limit=150')
  const reload = () => { live.reload(); sched.reload(); hist.reload() }
  const stop = async (s: Row) => {
    const reason = await confirmAction({ title: `Arrêter le live « ${s.title} » ?`, message: 'Le live est coupé immédiatement pour tous les spectateurs.', confirmLabel: 'Arrêter le live' })
    if (reason === null) return
    run('Live arrêté', () => api(`/api/admin/streams/${s.id}/stop`, { method: 'POST', body: { reason } }), reload)
  }
  const remove = async (s: Row) => {
    const reason = await confirmAction({ title: `Retirer le live programmé « ${s.title} » ?`, message: 'Il disparaît de l’accueil pour tout le monde (il passe en « terminé »).', confirmLabel: 'Retirer' })
    if (reason === null) return
    run('Live retiré', () => api(`/api/admin/streams/${s.id}/stop`, { method: 'POST', body: { reason } }), reload)
  }
  const suspend = async (s: Row) => {
    const reason = await confirmAction({ title: 'Arrêter le live ET suspendre le vendeur ?', confirmLabel: 'Arrêter et suspendre' })
    if (reason === null) return
    run('Live arrêté, vendeur suspendu', () => api(`/api/admin/streams/${s.id}/suspend-streamer`, { method: 'POST', body: { reason } }), reload)
  }
  return (
    <div>
      <h1>Lives</h1>
      <section className="card">
        <div className="row between"><h2>En direct maintenant ({live.data?.length ?? 0})</h2><button className="btn sm" onClick={reload}>Actualiser</button></div>
        <Loading error={live.error} loading={live.loading && !live.data} />
        {live.data && live.data.length === 0 && <p className="muted">Aucun live en cours.</p>}
        {live.data?.map(s => (
          <div key={s.id} className="report">
            <div className="report-main row gap">
              <Photos urls={s.thumbnail_url ? [s.thumbnail_url] : []} size={70} />
              <div><b>{s.title}</b> <Badge s={s.status} /><div className="small">Vendeur : <UserLink p={s.seller?.profiles && { ...s.seller.profiles, id: s.seller_id }} id={s.seller_id} /> · {s.viewer_count ?? 0} spectateurs · depuis {date(s.started_at)}</div></div>
            </div>
            <div className="actions"><button className="btn sm warnb" onClick={() => stop(s)}>Arrêter le live</button><button className="btn sm danger" onClick={() => suspend(s)}>Suspendre le vendeur</button></div>
          </div>
        ))}
      </section>
      <section className="card">
        <h2>Programmés ({sched.data?.length ?? 0})</h2>
        <Loading error={sched.error} loading={sched.loading && !sched.data} />
        {sched.data && sched.data.length === 0 && <p className="muted">Aucun live programmé.</p>}
        {sched.data?.map(s => (
          <div key={s.id} className="report">
            <div className="report-main row gap">
              <Photos urls={s.thumbnail_url ? [s.thumbnail_url] : []} size={70} />
              <div><b>{s.title}</b> <Badge s={s.status} /><div className="small">Vendeur : <UserLink p={s.seller?.profiles && { ...s.seller.profiles, id: s.seller_id }} id={s.seller_id} /> · prévu {date(s.scheduled_at)}</div></div>
            </div>
            <div className="actions"><button className="btn sm warnb" onClick={() => remove(s)}>Retirer</button></div>
          </div>
        ))}
      </section>
      <section className="card">
        <h2>Historique</h2>
        <Loading error={hist.error} loading={hist.loading && !hist.data} />
        {hist.data && (
          <table className="table"><thead><tr><th></th><th>Titre</th><th>Vendeur</th><th>Statut</th><th>Prévu</th><th>Début</th><th>Fin</th><th className="num">Pic</th><th>Vidéo</th></tr></thead>
            <tbody>{hist.data.map(s => (
              <tr key={s.id}><td><Photos urls={s.thumbnail_url ? [s.thumbnail_url] : []} size={40} /></td><td>{s.title}</td><td><UserLink p={s.seller_profile} id={s.seller_id} /></td><td><Badge s={s.status} /></td>
                <td>{date(s.scheduled_at)}</td><td>{date(s.started_at)}</td><td>{date(s.ended_at)}</td><td className="num">{s.peak_viewers ?? 0}</td>
                <td>{s.recording_url ? <a href={s.recording_url} target="_blank" rel="noreferrer">Voir</a> : '—'}</td></tr>
            ))}</tbody></table>
        )}
      </section>
    </div>
  )
}
