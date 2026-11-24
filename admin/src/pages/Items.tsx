import { useEffect, useState } from 'react'
import { Badge, Loading, Pager, UserLink, api, confirmAction, date, money, qs, run, showPhotos, useApi, type Row } from '../lib'

export function ItemCard({ item, onChange, showSeller, country }: { item: Row; onChange: () => void; showSeller?: boolean; country?: string }) {
  const currency = item.currency || ((country || item.seller?.country) === 'IL' ? 'ILS' : 'EUR')
  const urls: string[] = (item.image_urls || []).filter(Boolean)
  const act = async (kind: 'hide' | 'unhide' | 'delete') => {
    const labels = { hide: ['Masquer cet article ?', 'Il disparaît des listes publiques ; le vendeur le voit encore.', 'Masquer'], unhide: ['Rendre l’article visible ?', undefined, 'Rendre visible'], delete: ['Supprimer cet article ?', 'Retiré du site et bloqué à la vente (suppression douce, réversible).', 'Supprimer'] } as const
    const [title, message, confirmLabel] = labels[kind]
    const reason = await confirmAction({ title, message, confirmLabel, danger: kind !== 'unhide' })
    if (reason === null) return
    run(kind === 'unhide' ? 'Article visible' : kind === 'hide' ? 'Article masqué' : 'Article supprimé', () => api(`/api/admin/items/${item.id}/${kind}`, { method: 'POST', body: { reason } }), onChange)
  }
  return (
    <div className={`itemcard ${item.moderation_status ? 'moderated' : ''}`}>
      <div className="itemimg" onClick={() => urls.length && showPhotos(urls)}>
        {urls[0] ? <img src={urls[0]} alt="" loading="lazy" /> : <div className="noimg">Pas de photo</div>}
        {urls.length > 1 && <span className="imgcount">{urls.length} photos</span>}
        {item.moderation_status && <span className="modflag"><Badge s={item.moderation_status} /></span>}
      </div>
      <div className="itembody">
        <div className="ititle" title={item.title}>{item.title || '—'}</div>
        <div className="row between small"><span>{money(item.current_price || item.starting_price || item.buy_now_price, currency)}</span><Badge s={item.status} /></div>
        {showSeller && <div className="small"><UserLink p={item.seller} id={item.seller_id} /></div>}
        <div className="muted small">{date(item.created_at, false)}{item.stream_id ? ' · live' : ' · vente directe'}</div>
        {item.moderation_reason && <div className="small warn">{item.moderation_reason}</div>}
        <div className="row gap">
          {item.moderation_status
            ? <button className="btn sm" onClick={() => act('unhide')}>Rendre visible</button>
            : <button className="btn sm warnb" onClick={() => act('hide')}>Masquer</button>}
          {item.moderation_status !== 'removed' && <button className="btn sm danger" onClick={() => act('delete')}>Supprimer</button>}
        </div>
      </div>
    </div>
  )
}

export default function Items() {
  const init = new URLSearchParams(window.location.search)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [moderation, setModeration] = useState(init.get('moderation') || '')
  const [page, setPage] = useState(1)
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(1) }, [debounced, status, moderation])
  const { data, error, loading, reload } = useApi<Row>(`/api/admin/items${qs({ search: debounced, status, moderation, page, limit: 60 })}`)
  return (
    <div>
      <h1>Articles</h1>
      <div className="filters">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Titre ou code [ABCD]…" />
        <select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tous les statuts</option><option value="draft">Brouillon</option><option value="pending">En attente</option><option value="active">En vente</option><option value="sold">Vendu</option></select>
        <select value={moderation} onChange={e => setModeration(e.target.value)}><option value="">Toute visibilité</option><option value="visible">Visibles</option><option value="moderated">Modérés</option><option value="hidden">Masqués</option><option value="removed">Supprimés</option></select>
      </div>
      <Loading error={error} loading={loading && !data} />
      {data && (
        <>
          <div className="itemgrid big">{data.items.map((i: Row) => <ItemCard key={i.id} item={i} onChange={reload} showSeller />)}</div>
          {data.items.length === 0 && <p className="muted pad">Aucun article.</p>}
          <Pager page={page} total={data.total} limit={60} onPage={setPage} />
        </>
      )}
    </div>
  )
}
