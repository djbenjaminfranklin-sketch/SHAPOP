import { createClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

const API = (import.meta.env.VITE_API_URL || 'https://shapop.onrender.com').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>

export async function api<T = Row>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiError(401, 'Session expirée')
  const resp = await fetch(API + path, {
    method: opts.method || 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new ApiError(resp.status, (json as Row).error || `Erreur ${resp.status}`)
  return json as T
}

export function useApi<T = Row>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => {
    if (!path) return
    setLoading(true); setError(null)
    try { setData(await api<T>(path)) } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }, [path])
  useEffect(() => { load() }, [load])
  return { data, error, loading, reload: load }
}

// --- Navigation (routage par chemin, sans dépendance) ---
export function navigate(to: string) {
  if (window.location.pathname + window.location.search === to) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}
export function useLocation() {
  const [loc, setLoc] = useState(window.location.pathname + window.location.search)
  useEffect(() => {
    const h = () => setLoc(window.location.pathname + window.location.search)
    window.addEventListener('popstate', h)
    return () => window.removeEventListener('popstate', h)
  }, [])
  return loc
}
export function Link({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return <a href={to} className={className} onClick={e => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(to) }}>{children}</a>
}

// --- Formats ---
export function money(amount: unknown, currency?: string | null) {
  const n = Number(amount || 0)
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(n) } catch { return `${n.toFixed(2)} ${currency || ''}` }
}
export function date(d: unknown, withTime = true) {
  if (!d) return '—'
  const dt = new Date(String(d))
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('fr-FR', withTime ? { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export const shortId = (id: unknown) => (typeof id === 'string' ? id.slice(0, 8).toUpperCase() : '—')
export const name = (p: Row | null | undefined) => (p ? p.display_name || p.username || shortId(p.id) : '—')

const STATUS_FR: Record<string, [string, string]> = {
  pending_payment: ['Paiement en attente', 'grey'], paid: ['Payée', 'blue'], shipped: ['Expédiée', 'blue'],
  handed_over: ['Remise en main propre', 'green'], delivered: ['Livrée', 'green'], refunded: ['Remboursée', 'orange'],
  cancelled: ['Annulée', 'grey'], disputed: ['Litige', 'red'],
  live: ['En direct', 'red'], ended: ['Terminé', 'grey'], scheduled: ['Programmé', 'blue'],
  draft: ['Brouillon', 'grey'], pending: ['En attente', 'grey'], active: ['En vente', 'blue'], sold: ['Vendu', 'green'],
  open: ['Ouvert', 'red'], resolved: ['Traité', 'green'], dismissed: ['Classé', 'grey'],
  resolved_buyer: ['Gagné acheteur', 'orange'], resolved_seller: ['Gagné vendeur', 'green'], under_review: ['En examen', 'blue'],
  hidden: ['Masqué', 'orange'], removed: ['Supprimé', 'red'],
  held: ['Bloqué', 'orange'], released: ['Versé', 'green'], new: ['Nouveau', 'red'], read: ['Lu', 'grey'], replied: ['Répondu', 'green'], closed: ['Fermé', 'grey'],
  post: ['Poste', 'grey'], pickup: ['Main propre', 'grey'],
}
export function Badge({ s, label }: { s: string | null | undefined; label?: string }) {
  if (!s) return <span className="badge grey">—</span>
  const [txt, color] = STATUS_FR[s] || [s, 'grey']
  return <span className={`badge ${color}`}>{label || txt}</span>
}
export function UserStatus({ p }: { p: Row | null | undefined }) {
  if (!p) return null
  if (p.is_banned) return <span className="badge red">Banni</span>
  if (p.is_suspended) return <span className="badge orange">Suspendu</span>
  return <span className="badge green">Actif</span>
}

export function Avatar({ p, size = 28 }: { p: Row | null | undefined; size?: number }) {
  const url = p?.avatar_url
  const letter = (name(p) || '?').slice(0, 1).toUpperCase()
  return url
    ? <img className="avatar" src={url} alt="" style={{ width: size, height: size }} />
    : <span className="avatar ph" style={{ width: size, height: size, fontSize: size * 0.45 }}>{letter}</span>
}

export function UserLink({ p, id }: { p: Row | null | undefined; id?: string }) {
  const uid = p?.id || id
  if (!uid) return <span className="muted">—</span>
  return <Link to={`/utilisateurs/${uid}`} className="userlink"><Avatar p={p} size={20} /> {name(p) || shortId(uid)}</Link>
}

// --- Visionneuse de photos ---
let openLightbox: (urls: string[], index: number) => void = () => {}
export function showPhotos(urls: string[], index = 0) { openLightbox(urls, index) }
export function Lightbox() {
  const [state, setState] = useState<{ urls: string[]; i: number } | null>(null)
  openLightbox = (urls, i) => setState({ urls, i })
  useEffect(() => {
    if (!state) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setState(null)
      if (e.key === 'ArrowRight') setState(s => s && { ...s, i: (s.i + 1) % s.urls.length })
      if (e.key === 'ArrowLeft') setState(s => s && { ...s, i: (s.i - 1 + s.urls.length) % s.urls.length })
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [state])
  if (!state) return null
  return (
    <div className="lightbox" onClick={() => setState(null)}>
      <img src={state.urls[state.i]} alt="" onClick={e => e.stopPropagation()} />
      {state.urls.length > 1 && <div className="lb-count">{state.i + 1} / {state.urls.length} — ← → pour naviguer</div>}
      <a className="lb-open" href={state.urls[state.i]} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>Ouvrir l’original</a>
    </div>
  )
}

// --- Confirmation avec raison obligatoire ---
type ConfirmReq = { title: string; message?: string; confirmLabel?: string; danger?: boolean; needReason?: boolean; resolve: (reason: string | null) => void }
let openConfirm: (r: ConfirmReq) => void = () => {}
export function confirmAction(opts: Omit<ConfirmReq, 'resolve'>): Promise<string | null> {
  return new Promise(resolve => openConfirm({ needReason: true, danger: true, ...opts, resolve }))
}
export function ConfirmDialog() {
  const [req, setReq] = useState<ConfirmReq | null>(null)
  const [reason, setReason] = useState('')
  openConfirm = r => { setReason(''); setReq(r) }
  if (!req) return null
  const close = (v: string | null) => { req.resolve(v); setReq(null) }
  const canGo = !req.needReason || reason.trim().length >= 3
  return (
    <div className="modal-bg" onClick={() => close(null)}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={req.title}>
        <h3>{req.title}</h3>
        {req.message && <p className="muted">{req.message}</p>}
        {req.needReason && (
          <label className="field">Raison (consignée dans le journal)
            <textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Ex. : contrefaçon signalée par 2 acheteurs" />
          </label>
        )}
        <div className="row end">
          <button className="btn" onClick={() => close(null)}>Annuler</button>
          <button className={`btn ${req.danger ? 'danger' : 'primary'}`} disabled={!canGo} onClick={() => close(reason.trim() || '')}>{req.confirmLabel || 'Confirmer'}</button>
        </div>
      </div>
    </div>
  )
}

// --- Notifications éphémères ---
let pushToast: (msg: string, kind?: 'ok' | 'err') => void = () => {}
export function toast(msg: string, kind: 'ok' | 'err' = 'ok') { pushToast(msg, kind) }
export function Toasts() {
  const [list, setList] = useState<{ id: number; msg: string; kind: string }[]>([])
  pushToast = (msg, kind = 'ok') => {
    const id = Date.now() + Math.random()
    setList(l => [...l, { id, msg, kind }])
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 4000)
  }
  return <div className="toasts">{list.map(t => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}</div>
}

// Exécute une action serveur, affiche le résultat, recharge
export async function run(label: string, fn: () => Promise<unknown>, after?: () => void) {
  try { await fn(); toast(label); after?.() } catch (e) { toast(`Échec : ${(e as Error).message}`, 'err') }
}

export function Loading({ error, loading }: { error?: string | null; loading?: boolean }) {
  if (error) return <div className="error">Erreur : {error}</div>
  if (loading) return <div className="muted pad">Chargement…</div>
  return null
}

export function Photos({ urls, size = 64 }: { urls: string[] | null | undefined; size?: number }) {
  const list = (urls || []).filter(Boolean)
  if (list.length === 0) return <span className="muted">—</span>
  return (
    <div className="thumbs">
      {list.map((u, i) => <img key={u + i} src={u} alt="" loading="lazy" style={{ width: size, height: size }} onClick={() => showPhotos(list, i)} />)}
    </div>
  )
}

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="pager">
      <span className="muted">{total} résultat{total > 1 ? 's' : ''}</span>
      <button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
      <span>{page} / {pages}</span>
      <button className="btn sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  )
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function Address({ a }: { a: Row | null | undefined }) {
  if (!a) return <span className="muted">—</span>
  const parts = [a.name || a.full_name, a.line1 || a.address_line1 || a.street, a.line2 || a.address_line2, [a.postal_code || a.zip, a.city].filter(Boolean).join(' '), a.state, a.country, a.phone].filter(Boolean)
  return <div className="addr">{parts.length ? parts.map((p, i) => <div key={i}>{String(p)}</div>) : <code>{JSON.stringify(a)}</code>}</div>
}
