import { useEffect, useState } from 'react'
import { Avatar, Link, Loading, Pager, UserStatus, date, navigate, qs, useApi, type Row } from '../lib'

export default function Users() {
  const init = new URLSearchParams(window.location.search)
  const [search, setSearch] = useState(init.get('search') || '')
  const [debounced, setDebounced] = useState(search)
  const [role, setRole] = useState(init.get('role') || '')
  const [status, setStatus] = useState(init.get('status') || '')
  const [country, setCountry] = useState(init.get('country') || '')
  const [page, setPage] = useState(1)
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(1) }, [debounced, role, status, country])
  const { data, error, loading } = useApi<Row>(`/api/admin/users-search${qs({ search: debounced, role, status, country, page, limit: 50 })}`)

  return (
    <div>
      <h1>Utilisateurs</h1>
      <div className="filters">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, pseudo, e-mail, téléphone…" />
        <select value={role} onChange={e => setRole(e.target.value)}><option value="">Tous les rôles</option><option value="seller">Vendeurs</option><option value="buyer">Acheteurs</option></select>
        <select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tous les statuts</option><option value="active">Actifs</option><option value="suspended">Suspendus</option><option value="banned">Bannis</option></select>
        <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Pays (IL, FR…)" maxLength={2} style={{ width: 110 }} />
      </div>
      <Loading error={error} loading={loading && !data} />
      {data && (
        <>
          <table className="table hover">
            <thead><tr><th></th><th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Rôle</th><th>Pays</th><th>Statut</th><th>Inscrit le</th><th>Dernière connexion</th></tr></thead>
            <tbody>
              {data.users.map((u: Row) => (
                <tr key={u.id} onClick={() => navigate(`/utilisateurs/${u.id}`)}>
                  <td><Avatar p={u} /></td>
                  <td><Link to={`/utilisateurs/${u.id}`}><b>{u.display_name || '—'}</b></Link><div className="muted small">@{u.username || '—'}</div></td>
                  <td>{u.email || '—'}</td><td>{u.phone || '—'}</td>
                  <td>{u.is_seller ? <span className="badge pink">Vendeur</span> : <span className="badge grey">Acheteur</span>}</td>
                  <td>{u.country || '—'}</td><td><UserStatus p={u} /></td>
                  <td>{date(u.created_at, false)}</td><td>{date(u.last_sign_in_at)}</td>
                </tr>
              ))}
              {data.users.length === 0 && <tr><td colSpan={9} className="muted pad">Aucun utilisateur.</td></tr>}
            </tbody>
          </table>
          <Pager page={page} total={data.total} limit={50} onPage={setPage} />
        </>
      )}
    </div>
  )
}
