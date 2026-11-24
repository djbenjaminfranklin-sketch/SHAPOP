import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { api, ApiError, ConfirmDialog, Lightbox, Link, Toasts, navigate, supabase, useLocation, shortId, name, Avatar, money, Badge, type Row } from './lib'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Reports from './pages/Reports'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Disputes from './pages/Disputes'
import Lives from './pages/Lives'
import Items from './pages/Items'
import Journal from './pages/Journal'

const NAV: [string, string][] = [
  ['/', 'Tableau de bord'],
  ['/utilisateurs', 'Utilisateurs'],
  ['/signalements', 'Signalements'],
  ['/commandes', 'Commandes'],
  ['/litiges', 'Litiges'],
  ['/lives', 'Lives'],
  ['/articles', 'Articles'],
  ['/journal', 'Journal'],
]

function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } })
    setBusy(false)
    if (error) setErr(error.message); else setSent(true)
  }
  return (
    <div className="login">
      <form className="login-card" onSubmit={send}>
        <div className="brand big"><span className="dot" />ShaPop <b>Admin</b></div>
        {sent ? (
          <p>Lien de connexion envoyé à <b>{email}</b>. Ouvre-le dans ce navigateur.</p>
        ) : (
          <>
            <label className="field">Adresse e-mail
              <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" />
            </label>
            <button className="btn primary wide" disabled={busy}>{busy ? 'Envoi…' : 'Recevoir le lien de connexion'}</button>
            <div className="muted small" style={{ textAlign: 'center', margin: '10px 0' }}>ou</div>
            <button type="button" className="btn wide" onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}>Se connecter avec Google</button>
            {err && <div className="error">{err}</div>}
          </>
        )}
      </form>
    </div>
  )
}

function GlobalSearch() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Row | null>(null)
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(timer.current)
    if (q.trim().length < 2) { setRes(null); return }
    timer.current = window.setTimeout(async () => {
      try { setRes(await api(`/api/admin/search?q=${encodeURIComponent(q.trim())}`)); setOpen(true) } catch { setRes(null) }
    }, 300)
  }, [q])
  const go = (to: string) => { setOpen(false); setQ(''); navigate(to) }
  const empty = res && !res.users.length && !res.orders.length && !res.items.length
  return (
    <div className="gsearch">
      <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => res && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Rechercher : nom, e-mail, téléphone, réf. commande, article ou code [ABCD]…" />
      {open && res && (
        <div className="gsearch-res">
          {empty && <div className="muted pad">Aucun résultat</div>}
          {res.users.length > 0 && <div className="gs-h">Utilisateurs</div>}
          {res.users.map((u: Row) => (
            <div key={u.id} className="gs-row" onMouseDown={() => go(`/utilisateurs/${u.id}`)}>
              <Avatar p={u} size={22} /> <b>{name(u)}</b> <span className="muted">{u.email || ''} {u.phone || ''}</span>
            </div>
          ))}
          {res.orders.length > 0 && <div className="gs-h">Commandes</div>}
          {res.orders.map((o: Row) => (
            <div key={o.id} className="gs-row" onMouseDown={() => go(`/commandes/${o.id}`)}>
              <code>#{o.ref}</code> {money(o.amount, o.currency)} <Badge s={o.status} /> <span className="muted">{name(o.buyer)} → {name(o.seller_profile)}</span>
            </div>
          ))}
          {res.items.length > 0 && <div className="gs-h">Articles</div>}
          {res.items.map((i: Row) => (
            <div key={i.id} className="gs-row" onMouseDown={() => go(`/utilisateurs/${i.seller_id}?tab=articles`)}>
              {i.image_urls?.[0] && <img src={i.image_urls[0]} alt="" className="gs-img" />} {i.title} {i.moderation_status && <Badge s={i.moderation_status} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Router({ loc }: { loc: string }) {
  const path = loc.split('?')[0].replace(/\/$/, '') || '/'
  const m = (re: RegExp) => path.match(re)
  let r
  if (path === '/') return <Dashboard />
  if (path === '/utilisateurs') return <Users />
  if ((r = m(/^\/utilisateurs\/([0-9a-f-]{36})$/))) return <UserDetail id={r[1]} key={r[1]} />
  if (path === '/signalements') return <Reports />
  if (path === '/commandes') return <Orders />
  if ((r = m(/^\/commandes\/([0-9a-f-]{36})$/))) return <OrderDetail id={r[1]} key={r[1]} />
  if (path === '/litiges') return <Disputes />
  if (path === '/lives') return <Lives />
  if (path === '/articles') return <Items />
  if (path === '/journal') return <Journal />
  return <div className="pad">Page introuvable. <Link to="/">Retour</Link></div>
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [access, setAccess] = useState<'checking' | 'ok' | 'denied'>('checking')
  const loc = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    setAccess('checking')
    api('/api/admin/stats').then(() => setAccess('ok')).catch(e => setAccess(e instanceof ApiError && e.status === 403 ? 'denied' : 'ok'))
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (session === undefined) return <div className="pad muted">Chargement…</div>
  if (!session) return <Login />
  if (access === 'checking') return <div className="pad muted">Vérification de l’accès…</div>
  if (access === 'denied') {
    return (
      <div className="login"><div className="login-card">
        <div className="brand big"><span className="dot" />ShaPop <b>Admin</b></div>
        <h2>Accès refusé</h2>
        <p className="muted">Le compte {session.user.email} n’est pas administrateur.</p>
        <button className="btn" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </div></div>
    )
  }

  const path = loc.split('?')[0]
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="dot" />ShaPop <b>Admin</b></div>
        <nav>
          {NAV.map(([to, label]) => {
            const active = to === '/' ? path === '/' : path.startsWith(to)
            return <Link key={to} to={to} className={active ? 'active' : ''}>{label}</Link>
          })}
        </nav>
        <div className="side-foot">
          <div className="muted small">{session.user.email}</div>
          <button className="btn sm" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
        </div>
      </aside>
      <main className="main">
        <header className="top"><GlobalSearch /><span className="muted small">id {shortId(session.user.id)}</span></header>
        <div className="content"><Router loc={loc} /></div>
      </main>
      <Lightbox />
      <ConfirmDialog />
      <Toasts />
    </div>
  )
}
