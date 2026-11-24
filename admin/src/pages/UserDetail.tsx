import { useState } from 'react'
import { Address, Avatar, Badge, Link, Loading, Photos, UserLink, UserStatus, api, confirmAction, date, money, run, shortId, showPhotos, useApi, type Row } from '../lib'
import { ItemCard } from './Items'

const TABS: [string, string][] = [
  ['articles', 'Articles'], ['lives', 'Lives'], ['ventes', 'Ventes'], ['achats', 'Achats'],
  ['signalements', 'Signalements'], ['avis', 'Avis'], ['notes', 'Notes & journal'],
]

function totals(t: Record<string, number>) {
  const e = Object.entries(t || {})
  return e.length ? e.map(([c, n]) => money(n, c)).join(' + ') : '—'
}

export function OrdersTable({ orders, side }: { orders: Row[]; side: 'buyer' | 'seller' }) {
  if (!orders.length) return <p className="muted pad">Aucune commande.</p>
  return (
    <table className="table">
      <thead><tr><th>Réf.</th><th>Date</th><th>Article</th><th>{side === 'buyer' ? 'Vendeur' : 'Acheteur'}</th><th className="num">Montant</th><th>Statut</th><th>Paiement</th><th>Remise</th><th>Adresse</th><th>Preuves</th><th>Versement</th></tr></thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id}>
            <td><Link to={`/commandes/${o.id}`}><code>#{o.ref}</code></Link></td>
            <td>{date(o.created_at)}</td>
            <td><div className="row gap"><Photos urls={o.item?.image_urls?.slice(0, 1)} size={36} /><span className="ell">{o.item?.title || '—'}</span></div></td>
            <td>{side === 'buyer' ? <UserLink p={o.seller_profile} id={o.seller_id} /> : <UserLink p={o.buyer} id={o.buyer_id} />}</td>
            <td className="num">{money(o.amount, o.currency)}</td>
            <td><Badge s={o.status} /></td>
            <td>{o.payment_provider || 'stripe'}</td>
            <td><Badge s={o.fulfillment_method} /></td>
            <td className="small"><Address a={o.shipping_address} /></td>
            <td><Photos urls={[o.proofs?.parcel_url, o.proofs?.slip_url].filter(Boolean)} size={36} /></td>
            <td><Badge s={o.payout_status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ReportsList({ list, who }: { list: Row[]; who: 'reporter' | 'reported' }) {
  if (!list.length) return <p className="muted pad">Aucun.</p>
  return (
    <table className="table"><thead><tr><th>Date</th><th>{who === 'reporter' ? 'Signalé par' : 'Personne signalée'}</th><th>Raison</th><th>Contexte</th><th>Statut</th><th>Décision</th></tr></thead>
      <tbody>{list.map(r => (
        <tr key={r.id}><td>{date(r.created_at)}</td><td><UserLink p={r[who]} id={r[`${who}_id`]} /></td><td>{r.reason}</td><td className="small">{r.context || (r.item_id ? `Article ${shortId(r.item_id)}` : r.stream_id ? `Live ${shortId(r.stream_id)}` : '—')}</td><td><Badge s={r.status} /></td><td className="small">{r.resolution_action || ''} {r.resolution_note || ''}</td></tr>
      ))}</tbody></table>
  )
}

export default function UserDetail({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi<Row>(`/api/admin/users/${id}/full`)
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'articles')
  const [note, setNote] = useState('')
  if (!data) return <Loading error={error} loading={loading} />
  const p = data.profile
  const s = data.seller

  const suspend = async () => {
    const reason = await confirmAction({ title: `Suspendre ${p.display_name || 'ce compte'} ?`, message: 'Le compte ne pourra plus acheter, vendre ni lancer de live jusqu’à la levée de la suspension.', confirmLabel: 'Suspendre' })
    if (reason === null) return
    run('Compte suspendu', () => api(`/api/admin/users/${id}/suspend`, { method: 'POST', body: { reason } }), reload)
  }
  const unsuspend = async () => {
    const reason = await confirmAction({ title: 'Lever la suspension ?', danger: false, confirmLabel: 'Lever la suspension' })
    if (reason === null) return
    run('Suspension levée', async () => {
      await api(`/api/admin/users/${id}/unsuspend`, { method: 'POST', body: {} })
      await api(`/api/admin/users/${id}/note`, { method: 'POST', body: { note: `Suspension levée : ${reason}` } })
    }, reload)
  }
  const ban = async () => {
    const reason = await confirmAction({ title: `Bannir ${p.display_name || 'ce compte'} ?`, message: 'Bannissement définitif : le compte est bloqué et son e-mail ne pourra plus s’inscrire.', confirmLabel: 'Bannir' })
    if (reason === null) return
    run('Compte banni', () => api(`/api/admin/users/${id}/ban`, { method: 'POST', body: { reason } }), reload)
  }
  const unban = async () => {
    const reason = await confirmAction({ title: 'Débannir ce compte ?', danger: false, confirmLabel: 'Débannir' })
    if (reason === null) return
    run('Compte débanni', async () => {
      await api(`/api/admin/users/${id}/unban`, { method: 'POST', body: {} })
      await api(`/api/admin/users/${id}/note`, { method: 'POST', body: { note: `Débanni : ${reason}` } })
    }, reload)
  }
  const blockPayments = async (block: boolean) => {
    const reason = await confirmAction({ title: block ? 'Bloquer les paiements du vendeur ?' : 'Débloquer les paiements ?', message: block ? 'Les versements au vendeur seront suspendus.' : undefined, danger: block, confirmLabel: block ? 'Bloquer' : 'Débloquer' })
    if (reason === null) return
    run(block ? 'Paiements bloqués' : 'Paiements débloqués', async () => {
      await api(`/api/admin/sellers/${id}/block-payments`, { method: 'POST', body: { block } })
      await api(`/api/admin/users/${id}/note`, { method: 'POST', body: { note: `${block ? 'Paiements bloqués' : 'Paiements débloqués'} : ${reason}` } })
    }, reload)
  }
  const addNote = async () => {
    if (!note.trim()) return
    await run('Note ajoutée', () => api(`/api/admin/users/${id}/note`, { method: 'POST', body: { note } }), () => { setNote(''); reload() })
  }

  const counts: Record<string, number> = {
    articles: data.items.length, lives: data.streams.length, ventes: data.sales.length, achats: data.purchases.length,
    signalements: data.reports_by.length + data.reports_against.length, avis: data.reviews.length, notes: data.notes.length + data.audit.length,
  }

  return (
    <div>
      <div className="profile-head card">
        <div onClick={() => p.avatar_url && showPhotos([p.avatar_url])} style={{ cursor: p.avatar_url ? 'zoom-in' : undefined }}><Avatar p={p} size={84} /></div>
        <div className="grow">
          <h1 className="row gap">{p.display_name || '—'} <UserStatus p={p} /> {p.is_seller && <span className="badge pink">Vendeur</span>} {s?.payments_blocked && <span className="badge red">Paiements bloqués</span>}</h1>
          <div className="kv">
            <span>@{p.username || '—'}</span><span>{p.email || 'e-mail inconnu'}</span><span>{p.phone || 'pas de téléphone'}</span>
            <span>{[p.city, p.country].filter(Boolean).join(', ') || 'pays inconnu'}</span><span>Langue : {p.language || '—'}</span>
            <span>Inscrit le {date(p.created_at, false)}</span><span>Dernière connexion : {date(p.last_sign_in_at)}</span>
            <span className="muted">id <code>{p.id}</code></span>
          </div>
          {p.suspension_reason && <div className="warn">Motif : {p.suspension_reason} ({date(p.banned_at || p.suspended_at)})</div>}
          <div className="kv">
            <span>Achats : <b>{data.stats.purchases}</b> ({totals(data.stats.spent)})</span>
            <span>Ventes : <b>{data.stats.sales}</b> ({totals(data.stats.earned)})</span>
            <span>Enchères : <b>{data.bids_count}</b></span>
            {data.buyer_score && <span>Score acheteur : <b>{data.buyer_score.score}</b> ({data.buyer_score.risk_level})</span>}
            {data.seller_trust && <span>Confiance vendeur : <b>{data.seller_trust.trust_level}</b></span>}
          </div>
          {s && (
            <div className="kv small">
              <span>Boutique : <b>{s.store_name || '—'}</b></span><span>KYC : {s.kyc_status || '—'}</span>
              <span>Airwallex : {s.airwallex_beneficiary_id ? 'compte relié' : '—'}</span><span>Stripe : {s.stripe_account_id ? 'compte relié' : '—'}</span>
              <span>Banque : {s.payout_bank_last4 ? `•••• ${s.payout_bank_last4}` : '—'}</span><span>Retrait : {s.allow_pickup ? s.pickup_area || 'oui' : 'non'}</span>
              <span>Réserve : {s.reserve_percent ?? 0} %</span>{s.sale_limit && <span>Plafond : {s.sale_limit}</span>}
            </div>
          )}
        </div>
        <div className="actions">
          {p.is_suspended && !p.is_banned
            ? <button className="btn" onClick={unsuspend}>Lever la suspension</button>
            : !p.is_banned && <button className="btn warnb" onClick={suspend}>Suspendre</button>}
          {p.is_banned ? <button className="btn" onClick={unban}>Débannir</button> : <button className="btn danger" onClick={ban}>Bannir</button>}
          {s && (s.payments_blocked
            ? <button className="btn" onClick={() => blockPayments(false)}>Débloquer les paiements</button>
            : <button className="btn warnb" onClick={() => blockPayments(true)}>Bloquer les paiements</button>)}
          <button className="btn" onClick={() => setTab('notes')}>Ajouter une note</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l} <span className="count">{counts[k]}</span></button>)}
      </div>

      <div className="card">
        {tab === 'articles' && (
          data.items.length ? <div className="itemgrid">{data.items.map((i: Row) => <ItemCard key={i.id} item={i} onChange={reload} country={p.country} />)}</div> : <p className="muted pad">Aucun article.</p>
        )}
        {tab === 'lives' && (
          data.streams.length ? (
            <table className="table"><thead><tr><th></th><th>Titre</th><th>Statut</th><th>Début</th><th>Fin</th><th className="num">Pic spectateurs</th><th>Enregistrement</th></tr></thead>
              <tbody>{data.streams.map((st: Row) => (
                <tr key={st.id}><td><Photos urls={st.thumbnail_url ? [st.thumbnail_url] : []} size={44} /></td><td>{st.title}</td><td><Badge s={st.status} /></td><td>{date(st.started_at || st.scheduled_at)}</td><td>{date(st.ended_at)}</td><td className="num">{st.peak_viewers ?? 0}</td>
                  <td>{st.recording_url ? <a href={st.recording_url} target="_blank" rel="noreferrer">Voir la vidéo</a> : <span className="muted">—</span>}</td></tr>
              ))}</tbody></table>
          ) : <p className="muted pad">Aucun live.</p>
        )}
        {tab === 'ventes' && <OrdersTable orders={data.sales} side="seller" />}
        {tab === 'achats' && <OrdersTable orders={data.purchases} side="buyer" />}
        {tab === 'signalements' && (
          <>
            <h3>Contre lui ({data.reports_against.length})</h3><ReportsList list={data.reports_against} who="reporter" />
            <h3>Par lui ({data.reports_by.length})</h3><ReportsList list={data.reports_by} who="reported" />
            {data.disputes.length > 0 && (<>
              <h3>Litiges ({data.disputes.length})</h3>
              <table className="table"><tbody>{data.disputes.map((d: Row) => (
                <tr key={d.id}><td>{date(d.created_at)}</td><td>{d.buyer_id === id ? 'Acheteur' : 'Vendeur'}</td><td>{d.reason}</td><td className="ell">{d.description}</td><td className="num">{money(d.amount)}</td><td><Badge s={d.status} /></td><td><Link to={`/commandes/${d.order_id}`}>Commande</Link></td></tr>
              ))}</tbody></table>
            </>)}
          </>
        )}
        {tab === 'avis' && (
          data.reviews.length ? (
            <table className="table"><thead><tr><th>Date</th><th>Sens</th><th>Note</th><th>Commentaire</th><th>Réponse du vendeur</th></tr></thead>
              <tbody>{data.reviews.map((r: Row) => (
                <tr key={r.id}><td>{date(r.created_at)}</td><td>{r.seller_id === id ? <>Reçu de <UserLink p={r.buyer} id={r.buyer_id} /></> : 'Laissé'}</td><td>{'★'.repeat(r.rating || 0)}<span className="muted">{'★'.repeat(5 - (r.rating || 0))}</span></td><td>{r.comment || '—'}</td><td className="small">{r.seller_response || '—'}</td></tr>
              ))}</tbody></table>
          ) : <p className="muted pad">Aucun avis.</p>
        )}
        {tab === 'notes' && (
          <>
            <div className="note-add">
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Note interne (jamais visible par l’utilisateur)…" />
              <button className="btn primary" disabled={!note.trim()} onClick={addNote}>Ajouter la note</button>
            </div>
            <h3>Notes ({data.notes.length})</h3>
            {data.notes.map((n: Row) => <div key={n.id} className="note"><div className="muted small">{date(n.created_at)} — {n.admin_email}</div>{n.note}</div>)}
            <h3>Journal des actions ({data.audit.length})</h3>
            <table className="table"><tbody>{data.audit.map((a: Row) => (
              <tr key={a.id}><td>{date(a.created_at)}</td><td><code>{a.action}</code></td><td className="small">{a.admin_email}</td><td className="small">{a.details?.reason || a.details?.note || ''}</td></tr>
            ))}</tbody></table>
          </>
        )}
      </div>
    </div>
  )
}
