import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'

const ADMIN_EMAIL = 'djbenjaminfranklin@gmail.com'

type Tab = 'overview' | 'users' | 'sellers' | 'payments' | 'disputes' | 'lives' | 'audit'

interface Stats {
  users: number; sellers: number; orders: number; orders_30d: number
  lives_now: number; disputes: number; total_revenue: number; total_fees: number
  suspended_users: number; banned_users: number
}

export default function AdminPage() {
  const { user, session, loading: authContextLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  // Overview
  const [stats, setStats] = useState<Stats | null>(null)

  // Users
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersFilter, setUsersFilter] = useState('all')
  const [_selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null)
  const [userDetail, setUserDetail] = useState<Record<string, unknown> | null>(null)
  const [noteText, setNoteText] = useState('')

  // Sellers
  const [sellers, setSellers] = useState<Record<string, unknown>[]>([])
  const [sellersTotal, setSellersTotal] = useState(0)

  // Payments/Orders
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersStatus, setOrdersStatus] = useState('')

  // Disputes
  const [disputes, setDisputes] = useState<Record<string, unknown>[]>([])

  // Lives
  const [streams, setStreams] = useState<Record<string, unknown>[]>([])
  const [streamsFilter, setStreamsFilter] = useState('live')

  // Audit
  const [auditLogs, setAuditLogs] = useState<Record<string, unknown>[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const token = session?.access_token || ''

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // Redirect non-admin users
  useEffect(() => {
    if (!authContextLoading && (!user || user.email !== ADMIN_EMAIL)) {
      navigate('/', { replace: true })
    }
  }, [user, authContextLoading, navigate])

  // Load data when tab changes — MUST be before early returns (Rules of Hooks)
  useEffect(() => {
    if (!token) return
    switch (tab) {
      case 'overview': fetchStats(); break
      case 'users': fetchUsers(); break
      case 'sellers': fetchSellers(); break
      case 'payments': fetchOrders(); break
      case 'disputes': fetchDisputes(); break
      case 'lives': fetchStreams(); break
      case 'audit': fetchAudit(); break
    }
  }, [tab, token])

  if (authContextLoading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="admin-spinner" /></div>

  if (!user || user.email !== ADMIN_EMAIL) return null

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const adminFetch = async (path: string, opts?: RequestInit) => {
    let res: Response
    try {
      res = await apiFetch(path, { headers, ...opts })
    } catch {
      throw new Error('Serveur injoignable. Vérifie que le serveur est déployé.')
    }
    if (!res.ok) {
      let msg = `Erreur ${res.status}`
      try { const body = await res.json(); msg = body.error || msg } catch { /* non-JSON response */ }
      throw new Error(msg)
    }
    try {
      return await res.json()
    } catch {
      throw new Error('Réponse invalide du serveur')
    }
  }

  const showAction = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 3000)
  }

  // ======== FETCHERS ========

  const fetchStats = async () => {
    if (!token) return
    setLoading(true)
    try {
      const raw = await adminFetch('/api/admin/stats')
      setStats({
        users: Number(raw.users) || 0,
        sellers: Number(raw.sellers) || 0,
        orders: Number(raw.orders) || 0,
        orders_30d: Number(raw.orders_30d) || 0,
        lives_now: Number(raw.lives_now) || 0,
        disputes: Number(raw.disputes) || 0,
        total_revenue: Number(raw.total_revenue) || 0,
        total_fees: Number(raw.total_fees) || 0,
        suspended_users: Number(raw.suspended_users) || 0,
        banned_users: Number(raw.banned_users) || 0,
      })
      setPageError(null)
    } catch (e: any) { setPageError(String(e?.message || 'Erreur de chargement')); showToast(String(e?.message || 'Failed to load data')) }
    setLoading(false)
  }

  const fetchUsers = async (page = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const q = new URLSearchParams({ page: String(page), limit: '30', filter: usersFilter })
      if (usersSearch) q.set('search', usersSearch)
      const data = await adminFetch(`/api/admin/users?${q}`)
      setUsers(Array.isArray(data.users) ? data.users : []); setUsersTotal(Number(data.total) || 0); setUsersPage(page)
    } catch { showToast('Failed to load data') }
    setLoading(false)
  }

  const fetchUserDetail = async (id: string) => {
    if (!token) return
    try {
      const data = await adminFetch(`/api/admin/users/${id}`)
      setUserDetail(data)
    } catch { showToast('Failed to load data') }
  }

  const fetchSellers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminFetch('/api/admin/sellers?limit=50')
      setSellers(Array.isArray(data.sellers) ? data.sellers : []); setSellersTotal(Number(data.total) || 0)
    } catch { showToast('Failed to load data') }
    setLoading(false)
  }

  const fetchOrders = async (page = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const q = new URLSearchParams({ page: String(page), limit: '30' })
      if (ordersStatus) q.set('status', ordersStatus)
      const data = await adminFetch(`/api/admin/orders?${q}`)
      setOrders(Array.isArray(data.orders) ? data.orders : []); setOrdersTotal(Number(data.total) || 0); setOrdersPage(page)
    } catch { showToast('Failed to load data') }
    setLoading(false)
  }

  const fetchDisputes = async () => {
    if (!token) return
    setLoading(true)
    try { const raw = await adminFetch('/api/admin/disputes'); setDisputes(Array.isArray(raw) ? raw : Array.isArray(raw?.disputes) ? raw.disputes : []) } catch { showToast('Failed to load data') }
    setLoading(false)
  }

  const fetchStreams = async () => {
    if (!token) return
    setLoading(true)
    try { const raw = await adminFetch(`/api/admin/streams?status=${streamsFilter}`); setStreams(Array.isArray(raw) ? raw : Array.isArray(raw?.streams) ? raw.streams : []) } catch { showToast('Failed to load data') }
    setLoading(false)
  }

  const fetchAudit = async (page = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminFetch(`/api/admin/audit-log?page=${page}&limit=50`)
      setAuditLogs(Array.isArray(data.logs) ? data.logs : []); setAuditTotal(Number(data.total) || 0); setAuditPage(page)
    } catch { showToast('Failed to load data') }
    setLoading(false)
  }

  // ======== ACTIONS ========

  const suspendUser = async (id: string, reason: string) => {
    try {
      await adminFetch(`/api/admin/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) })
      showAction('User suspended'); fetchUsers(usersPage)
      if (userDetail) fetchUserDetail(id)
    } catch { showToast('Action failed') }
  }

  const unsuspendUser = async (id: string) => {
    try {
      await adminFetch(`/api/admin/users/${id}/unsuspend`, { method: 'POST' })
      showAction('User unsuspended'); fetchUsers(usersPage)
      if (userDetail) fetchUserDetail(id)
    } catch { showToast('Action failed') }
  }

  const banUser = async (id: string, reason: string) => {
    try {
      await adminFetch(`/api/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) })
      showAction('User banned'); fetchUsers(usersPage)
      if (userDetail) fetchUserDetail(id)
    } catch { showToast('Action failed') }
  }

  const unbanUser = async (id: string) => {
    try {
      await adminFetch(`/api/admin/users/${id}/unban`, { method: 'POST' })
      showAction('User unbanned'); fetchUsers(usersPage)
      if (userDetail) fetchUserDetail(id)
    } catch { showToast('Action failed') }
  }

  const addNote = async (id: string) => {
    if (!noteText.trim()) return
    try {
      await adminFetch(`/api/admin/users/${id}/note`, { method: 'POST', body: JSON.stringify({ note: noteText }) })
      setNoteText('')
      showAction('Note added'); fetchUserDetail(id)
    } catch { showToast('Failed to save note') }
  }

  const blockPayments = async (id: string, block: boolean) => {
    try {
      await adminFetch(`/api/admin/sellers/${id}/block-payments`, { method: 'POST', body: JSON.stringify({ block }) })
      showAction(block ? 'Payments blocked' : 'Payments unblocked'); fetchSellers()
    } catch { showToast('Action failed') }
  }

  const setReserve = async (id: string, percent: number) => {
    try {
      await adminFetch(`/api/admin/sellers/${id}/reserve`, { method: 'POST', body: JSON.stringify({ percent }) })
      showAction(`Reserve set to ${percent}%`); fetchSellers()
    } catch { showToast('Action failed') }
  }

  const requestDocuments = async (id: string) => {
    try {
      await adminFetch(`/api/admin/sellers/${id}/request-documents`, { method: 'POST' })
      showAction('Documents requested'); fetchSellers()
    } catch { showToast('Action failed') }
  }

  const stopStream = async (id: string) => {
    try {
      await adminFetch(`/api/admin/streams/${id}/stop`, { method: 'POST' })
      showAction('Stream stopped'); fetchStreams()
    } catch { showToast('Action failed') }
  }

  const suspendStreamer = async (id: string) => {
    try {
      await adminFetch(`/api/admin/streams/${id}/suspend-streamer`, { method: 'POST', body: JSON.stringify({ reason: 'Suspended during live by admin' }) })
      showAction('Streamer suspended & stream stopped'); fetchStreams()
    } catch { showToast('Action failed') }
  }

  // ======== STYLES ========

  const card: React.CSSProperties = {
    backgroundColor: '#111', borderRadius: '14px', padding: '16px',
    border: '1px solid #1A1A1A', marginBottom: '10px',
  }
  const badge = (color: string): React.CSSProperties => ({
    fontSize: '11px', fontWeight: 700, color, backgroundColor: `${color}18`,
    padding: '3px 10px', borderRadius: '8px', border: `1px solid ${color}30`,
    display: 'inline-block',
  })
  const btn = (bg: string): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: '8px', border: 'none',
    background: bg, color: '#fff', fontSize: '12px', fontWeight: 700,
    cursor: 'pointer', marginRight: '6px', marginBottom: '4px',
  })
  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: '10px', border: '1px solid #222',
    backgroundColor: '#0A0A0A', color: '#fff', fontSize: '14px', width: '100%',
    boxSizing: 'border-box',
  }

  // Safe value helper — prevents any object from being rendered as React child
  const sv = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'number') return String(v)
    if (typeof v === 'boolean') return v ? 'true' : ''
    try { return JSON.stringify(v) } catch { return '[object]' }
  }

  // Safe JSON.stringify wrapper that never throws
  const safeStringify = (v: unknown): string => {
    try {
      if (v === null || v === undefined) return '-'
      if (typeof v === 'string') return v
      if (typeof v === 'number') return String(v)
      return JSON.stringify(v)
    } catch {
      return '[unserializable]'
    }
  }

  // Safe boolean check — guarantees a true boolean, never an object
  const sb = (v: unknown): boolean => {
    return v === true || v === 1 || v === 'true'
  }

  const fmtDate = (d: unknown) => {
    if (!d || typeof d !== 'string') return '-'
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return '-'
    }
  }
  const fmtMoney = (n: unknown) => typeof n === 'number' ? n.toFixed(2) + ' EUR' : '-'
  const fmtId = (id: unknown) => typeof id === 'string' ? id.slice(0, 8) + '...' : '-'

  // ======== TABS ========
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'sellers', label: 'Sellers' },
    { id: 'payments', label: 'Payments' },
    { id: 'disputes', label: 'Disputes' },
    { id: 'lives', label: 'Lives' },
    { id: 'audit', label: 'Audit Log' },
  ]

  // ======== ERROR DISPLAY ========

  const renderDebugError = (label: string, err: { message: string; stack: string }) => (
    <div style={{
      margin: '16px', padding: '20px', backgroundColor: '#1a0505',
      border: '2px solid #ff3333', borderRadius: '12px',
    }}>
      <p style={{ color: '#ff3333', fontSize: '16px', fontWeight: 900, margin: '0 0 8px' }}>
        {'RENDER CRASH: ' + String(label)}
      </p>
      <p style={{ color: '#ff8888', fontSize: '13px', margin: '0 0 12px', wordBreak: 'break-word' }}>
        {String(err.message || 'Unknown error')}
      </p>
      <pre style={{
        color: '#cc6666', fontSize: '10px', margin: 0,
        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        maxHeight: '300px', overflow: 'auto',
        padding: '10px', backgroundColor: '#0a0000', borderRadius: '8px',
      }}>
        {String(err.stack || 'No stack trace')}
      </pre>
      <button
        onClick={() => setRenderError(null)}
        style={{ ...btn('#333'), marginTop: '12px' }}
      >
        {'Dismiss'}
      </button>
    </div>
  )

  // ======== RENDER ========

  const renderOverview = () => {
    if (!stats) return <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>{'Loading...'}</p>
    const statCards: { label: string; value: string; color: string }[] = [
      { label: 'Total Users', value: sv(stats.users), color: '#3B82F6' },
      { label: 'Sellers', value: sv(stats.sellers), color: '#10B981' },
      { label: 'Orders', value: sv(stats.orders), color: '#F59E0B' },
      { label: 'Orders (30d)', value: sv(stats.orders_30d), color: '#8B5CF6' },
      { label: 'Lives Now', value: sv(stats.lives_now), color: '#E8344E' },
      { label: 'Disputes', value: sv(stats.disputes), color: '#EF4444' },
      { label: 'Revenue', value: fmtMoney(stats.total_revenue), color: '#10B981' },
      { label: 'Platform Fees', value: fmtMoney(stats.total_fees), color: '#F0908A' },
      { label: 'Suspended', value: sv(stats.suspended_users), color: '#F59E0B' },
      { label: 'Banned', value: sv(stats.banned_users), color: '#EF4444' },
    ]
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', padding: '0 16px' }}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center' }}>
            <p style={{ fontSize: '24px', fontWeight: 900, color: s.color, margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    )
  }

  const renderUsers = () => (
    <div style={{ padding: '0 16px' }}>
      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input
          value={usersSearch}
          onChange={e => setUsersSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchUsers(1)}
          placeholder="Search username..."
          style={{ ...inputStyle, flex: 1, minWidth: '150px' }}
        />
        <select
          value={usersFilter}
          onChange={e => { setUsersFilter(e.target.value); setTimeout(() => fetchUsers(1), 0) }}
          style={{ ...inputStyle, width: 'auto', minWidth: '120px' }}
        >
          <option value="all">{'All'}</option>
          <option value="sellers">{'Sellers'}</option>
          <option value="suspended">{'Suspended'}</option>
          <option value="banned">{'Banned'}</option>
        </select>
        <button onClick={() => fetchUsers(1)} style={btn('#3B82F6')}>{'Search'}</button>
      </div>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(usersTotal) + ' users found'}</p>

      {/* User detail modal */}
      {userDetail ? (
        <div onClick={() => setUserDetail(null)} style={{
          position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px',
          overflowY: 'auto',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            ...card, maxWidth: '500px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
          }}>
            {(() => {
              try {
                const rawProfile = userDetail.profile
                const rawSeller = userDetail.seller
                const rawNotes = userDetail.notes
                const rawStats = userDetail.stats

                const p = (rawProfile && typeof rawProfile === 'object') ? rawProfile as Record<string, unknown> : null
                const s = (rawSeller && typeof rawSeller === 'object') ? rawSeller as Record<string, unknown> : null
                const notes = Array.isArray(rawNotes) ? rawNotes as Record<string, unknown>[] : []
                const st = (rawStats && typeof rawStats === 'object') ? rawStats as Record<string, number> : null
                if (!p) return <p style={{ color: '#666' }}>{'No data'}</p>
                const uid = String(p.id || '')
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: 0 }}>{sv(p.display_name)}</p>
                        <p style={{ color: '#888', fontSize: '13px', margin: '2px 0 0' }}>{'@' + sv(p.username) + ' | ' + sv(p.country) + ' | ' + fmtId(uid)}</p>
                      </div>
                      <button onClick={() => setUserDetail(null)} style={{ ...btn('#333'), marginRight: 0 }}>{'X'}</button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {sb(p.is_suspended) ? <span style={badge('#F59E0B')}>{'SUSPENDED'}</span> : null}
                      {sb(p.is_banned) ? <span style={badge('#EF4444')}>{'BANNED'}</span> : null}
                      {sb(p.is_seller) ? <span style={badge('#10B981')}>{'SELLER'}</span> : null}
                      {(s && sv(s.kyc_status) === 'verified') ? <span style={badge('#3B82F6')}>{'KYC VERIFIED'}</span> : null}
                    </div>

                    <p style={{ color: '#666', fontSize: '12px' }}>
                      {'Joined: ' + fmtDate(p.created_at) + ' | Purchases: ' + sv(st?.total_purchases || 0) + ' (' + fmtMoney(st?.total_spent || 0) + ') | Sales: ' + sv(st?.total_sales || 0) + ' (' + fmtMoney(st?.total_earned || 0) + ')'}
                    </p>

                    {s ? (
                      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#0A0A0A', borderRadius: '10px' }}>
                        <p style={{ color: '#aaa', fontSize: '13px', fontWeight: 600, margin: '0 0 4px' }}>{'Store: ' + sv(s.store_name)}</p>
                        <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>
                          {'Revenue: ' + fmtMoney(s.total_revenue) + ' | Sales: ' + sv(s.total_sales) + ' | Stripe: ' + (s.stripe_account_id ? 'Connected' : 'None')}
                        </p>
                        {sb(s.payments_blocked) ? <span style={badge('#EF4444')}>{'PAYMENTS BLOCKED'}</span> : null}
                        {Number(s.reserve_percent) > 0 ? <span style={badge('#F59E0B')}>{'RESERVE ' + sv(s.reserve_percent) + '%'}</span> : null}
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(!sb(p.is_suspended) && !sb(p.is_banned)) ? (
                        <button onClick={() => { const r = prompt('Reason?'); if (r) suspendUser(uid, r) }} style={btn('#F59E0B')}>{'Suspend'}</button>
                      ) : null}
                      {(sb(p.is_suspended) && !sb(p.is_banned)) ? (
                        <button onClick={() => unsuspendUser(uid)} style={btn('#10B981')}>{'Unsuspend'}</button>
                      ) : null}
                      {!sb(p.is_banned) ? (
                        <button onClick={() => { const r = prompt('Reason?'); if (r) banUser(uid, r) }} style={btn('#EF4444')}>{'Ban'}</button>
                      ) : null}
                      {sb(p.is_banned) ? (
                        <button onClick={() => unbanUser(uid)} style={btn('#10B981')}>{'Unban'}</button>
                      ) : null}
                    </div>

                    {/* Notes */}
                    <div style={{ marginTop: '20px' }}>
                      <p style={{ color: '#aaa', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>{'Internal Notes (' + sv(notes.length) + ')'}</p>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => addNote(uid)} style={btn('#3B82F6')}>{'Add'}</button>
                      </div>
                      {notes.map((n, i) => (
                        <div key={i} style={{ padding: '8px', backgroundColor: '#0A0A0A', borderRadius: '8px', marginBottom: '6px' }}>
                          <p style={{ color: '#ddd', fontSize: '13px', margin: 0 }}>{sv(n.note)}</p>
                          <p style={{ color: '#555', fontSize: '11px', margin: '4px 0 0' }}>{sv(n.admin_email) + ' - ' + fmtDate(n.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )
              } catch (err: any) {
                return renderDebugError('UserDetail IIFE', { message: String(err?.message || err), stack: String(err?.stack || '') })
              }
            })()}
          </div>
        </div>
      ) : null}

      {/* User list */}
      {Array.isArray(users) ? users.map((u, i) => (
        <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => { setSelectedUser(u); fetchUserDetail(String(u.id || '')) }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0, overflow: 'hidden',
          }}>
            {(typeof u.avatar_url === 'string' && u.avatar_url) ? <img src={String(u.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (sv(u.display_name)?.[0] || '?')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sv(u.display_name) + ' '}<span style={{ color: '#555', fontWeight: 400 }}>{'@' + sv(u.username)}</span>
            </p>
            <p style={{ color: '#555', fontSize: '11px', margin: '2px 0 0' }}>
              {sv(u.country) + ' | ' + fmtDate(u.created_at) + ' | ' + fmtId(u.id)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
            {sb(u.is_seller) ? <span style={badge('#10B981')}>{'S'}</span> : null}
            {sb(u.is_suspended) ? <span style={badge('#F59E0B')}>{'SUS'}</span> : null}
            {sb(u.is_banned) ? <span style={badge('#EF4444')}>{'BAN'}</span> : null}
          </div>
        </div>
      )) : null}

      {/* Pagination */}
      {usersTotal > 30 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
          <button disabled={usersPage <= 1} onClick={() => fetchUsers(usersPage - 1)} style={btn('#333')}>{'Prev'}</button>
          <span style={{ color: '#666', fontSize: '13px', padding: '6px' }}>{'Page ' + sv(usersPage) + ' / ' + sv(Math.ceil(usersTotal / 30))}</span>
          <button disabled={usersPage * 30 >= usersTotal} onClick={() => fetchUsers(usersPage + 1)} style={btn('#333')}>{'Next'}</button>
        </div>
      ) : null}
    </div>
  )

  const renderSellers = () => (
    <div style={{ padding: '0 16px' }}>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(sellersTotal) + ' sellers'}</p>
      {Array.isArray(sellers) ? sellers.map((s, i) => {
        try {
          const rawProfiles = s.profiles
          const rawRiskMetrics = s.risk_metrics
          const p = (rawProfiles && typeof rawProfiles === 'object' && !Array.isArray(rawProfiles)) ? rawProfiles as Record<string, unknown> : null
          const rm = (rawRiskMetrics && typeof rawRiskMetrics === 'object' && !Array.isArray(rawRiskMetrics)) ? rawRiskMetrics as Record<string, number> : null
          const id = String(s.id || '')
          return (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{sv(s.store_name)}</p>
                  <p style={{ color: '#666', fontSize: '12px', margin: '2px 0 0' }}>
                    {(p ? ('@' + sv(p.username) + ' | ' + sv(p.country)) : '') + ' | ' + fmtId(id) + ' | Joined: ' + fmtDate(p ? p.created_at : null)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {sb(s.payments_blocked) ? <span style={badge('#EF4444')}>{'BLOCKED'}</span> : null}
                  {Number(s.reserve_percent) > 0 ? <span style={badge('#F59E0B')}>{sv(s.reserve_percent) + '% RES'}</span> : null}
                  {sb(s.documents_requested) ? <span style={badge('#3B82F6')}>{'DOC REQ'}</span> : null}
                  {(p && sb(p.is_suspended)) ? <span style={badge('#F59E0B')}>{'SUS'}</span> : null}
                  {sv(s.kyc_status) === 'verified' ? <span style={badge('#10B981')}>{'KYC'}</span> : <span style={badge('#F59E0B')}>{'!KYC'}</span>}
                </div>
              </div>

              {/* Risk metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '6px', marginBottom: '10px' }}>
                {[
                  { l: 'Revenue', v: fmtMoney(s.total_revenue), c: '#10B981' },
                  { l: 'Orders', v: sv(rm?.total_orders || 0), c: '#3B82F6' },
                  { l: '30d', v: sv(rm?.orders_30d || 0), c: '#8B5CF6' },
                  { l: 'Refund %', v: sv(rm?.refund_rate || 0) + '%', c: (rm?.refund_rate || 0) > 5 ? '#EF4444' : '#10B981' },
                  { l: 'Dispute %', v: sv(rm?.dispute_rate || 0) + '%', c: (rm?.dispute_rate || 0) > 2 ? '#EF4444' : '#10B981' },
                ].map(m => (
                  <div key={m.l} style={{ textAlign: 'center', padding: '6px', backgroundColor: '#0A0A0A', borderRadius: '8px' }}>
                    <p style={{ color: m.c, fontWeight: 700, fontSize: '14px', margin: 0 }}>{m.v}</p>
                    <p style={{ color: '#555', fontSize: '10px', margin: 0 }}>{m.l}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button onClick={() => blockPayments(id, !sb(s.payments_blocked))} style={btn(sb(s.payments_blocked) ? '#10B981' : '#EF4444')}>
                  {sb(s.payments_blocked) ? 'Unblock Pay' : 'Block Pay'}
                </button>
                <button onClick={() => { const pInput = prompt('Reserve % (0-100)?', sv(s.reserve_percent || 0)); if (pInput !== null) setReserve(id, Number(pInput)) }} style={btn('#F59E0B')}>
                  {'Set Reserve'}
                </button>
                {!sb(s.documents_requested) ? (
                  <button onClick={() => requestDocuments(id)} style={btn('#3B82F6')}>{'Request Docs'}</button>
                ) : null}
                <button onClick={() => { setSelectedUser({ id }); fetchUserDetail(id) }} style={btn('#333')}>{'View User'}</button>
              </div>
            </div>
          )
        } catch (err: any) {
          return (
            <div key={i} style={card}>
              {renderDebugError('Seller row #' + String(i), { message: String(err?.message || err), stack: String(err?.stack || '') })}
            </div>
          )
        }
      }) : null}
    </div>
  )

  const renderPayments = () => (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {['', 'pending_payment', 'paid', 'shipped', 'delivered', 'refunded', 'disputed'].map(s => (
          <button key={s} onClick={() => { setOrdersStatus(s); setTimeout(() => fetchOrders(1), 0) }}
            style={{
              ...btn(ordersStatus === s ? '#F0908A' : '#222'),
              fontSize: '11px', padding: '5px 10px',
            }}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(ordersTotal) + ' orders'}</p>
      {Array.isArray(orders) ? orders.map((o, i) => {
        try {
          const rawBuyer = o.buyer
          const rawSellerProfile = o.seller_profile
          const rawItem = o.item
          const buyer = (rawBuyer && typeof rawBuyer === 'object' && !Array.isArray(rawBuyer)) ? rawBuyer as Record<string, unknown> : null
          const seller = (rawSellerProfile && typeof rawSellerProfile === 'object' && !Array.isArray(rawSellerProfile)) ? rawSellerProfile as Record<string, unknown> : null
          const item = (rawItem && typeof rawItem === 'object' && !Array.isArray(rawItem)) ? rawItem as Record<string, unknown> : null
          const statusColor: Record<string, string> = {
            pending_payment: '#F59E0B', paid: '#3B82F6', shipped: '#10B981',
            delivered: '#10B981', refunded: '#8B5CF6', disputed: '#EF4444',
          }
          return (
            <div key={i} style={{ ...card, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item ? sv(item.title) : fmtId(o.id)}
                </p>
                <p style={{ color: '#F0908A', fontWeight: 700, fontSize: '14px', margin: '2px 0' }}>{fmtMoney(o.amount)}</p>
                <p style={{ color: '#555', fontSize: '11px', margin: 0 }}>
                  {'Buyer: ' + (buyer ? ('@' + sv(buyer.username)) : fmtId(o.buyer_id)) + ' | Seller: ' + (seller ? ('@' + sv(seller.username)) : fmtId(o.seller_id))}
                </p>
                <p style={{ color: '#444', fontSize: '11px', margin: '2px 0 0' }}>
                  {fmtDate(o.created_at) + ' | Fee: ' + fmtMoney(o.platform_fee) + ' | ' + fmtId(o.id)}
                </p>
              </div>
              <span style={badge(statusColor[sv(o.status)] || '#666')}>{sv(o.status)}</span>
            </div>
          )
        } catch (err: any) {
          return (
            <div key={i} style={card}>
              {renderDebugError('Order row #' + String(i), { message: String(err?.message || err), stack: String(err?.stack || '') })}
            </div>
          )
        }
      }) : null}
      {ordersTotal > 30 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
          <button disabled={ordersPage <= 1} onClick={() => fetchOrders(ordersPage - 1)} style={btn('#333')}>{'Prev'}</button>
          <span style={{ color: '#666', fontSize: '13px', padding: '6px' }}>{'Page ' + sv(ordersPage) + ' / ' + sv(Math.ceil(ordersTotal / 30))}</span>
          <button disabled={ordersPage * 30 >= ordersTotal} onClick={() => fetchOrders(ordersPage + 1)} style={btn('#333')}>{'Next'}</button>
        </div>
      ) : null}
    </div>
  )

  const renderDisputes = () => (
    <div style={{ padding: '0 16px' }}>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(disputes.length) + ' disputes/refunds'}</p>
      {(Array.isArray(disputes) && disputes.length === 0) ? <p style={{ color: '#555', textAlign: 'center', padding: '40px' }}>{'No disputes'}</p> : null}
      {Array.isArray(disputes) ? disputes.map((d, i) => {
        try {
          const rawBuyer = d.buyer
          const rawSellerProfile = d.seller_profile
          const buyer = (rawBuyer && typeof rawBuyer === 'object' && !Array.isArray(rawBuyer)) ? rawBuyer as Record<string, unknown> : null
          const seller = (rawSellerProfile && typeof rawSellerProfile === 'object' && !Array.isArray(rawSellerProfile)) ? rawSellerProfile as Record<string, unknown> : null
          return (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: 0 }}>{'Order ' + fmtId(d.id)}</p>
                  <p style={{ color: '#F0908A', fontWeight: 700, margin: '2px 0' }}>{fmtMoney(d.amount)}</p>
                  <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>
                    {'Buyer: ' + (buyer ? ('@' + sv(buyer.username)) : '?') + ' | Seller: ' + (seller ? ('@' + sv(seller.username)) : '?')}
                  </p>
                  <p style={{ color: '#444', fontSize: '11px', margin: '4px 0 0' }}>
                    {'Created: ' + fmtDate(d.created_at) + ' | Paid: ' + fmtDate(d.paid_at) + ' | Shipped: ' + fmtDate(d.shipped_at)}
                  </p>
                </div>
                <span style={badge(sv(d.status) === 'disputed' ? '#EF4444' : '#8B5CF6')}>{sv(d.status)}</span>
              </div>
              {(typeof d.shipping_proof_url === 'string' && d.shipping_proof_url) ? (
                <div style={{ marginTop: '8px' }}>
                  <img src={sv(d.shipping_proof_url)} alt="Proof" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #333' }} />
                </div>
              ) : null}
            </div>
          )
        } catch (err: any) {
          return (
            <div key={i} style={card}>
              {renderDebugError('Dispute row #' + String(i), { message: String(err?.message || err), stack: String(err?.stack || '') })}
            </div>
          )
        }
      }) : null}
    </div>
  )

  const renderLives = () => (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {['live', 'scheduled', 'ended'].map(s => (
          <button key={s} onClick={() => { setStreamsFilter(s); setTimeout(fetchStreams, 0) }}
            style={{ ...btn(streamsFilter === s ? '#F0908A' : '#222'), fontSize: '12px' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {(Array.isArray(streams) && streams.length === 0) ? <p style={{ color: '#555', textAlign: 'center', padding: '40px' }}>{'No streams'}</p> : null}
      {Array.isArray(streams) ? streams.map((s, i) => {
        try {
          const rawSeller = s.seller
          const seller = (rawSeller && typeof rawSeller === 'object' && !Array.isArray(rawSeller)) ? rawSeller as Record<string, unknown> : null
          const rawSellerProfiles = seller ? seller.profiles : null
          const sellerProfile = (rawSellerProfiles && typeof rawSellerProfiles === 'object' && !Array.isArray(rawSellerProfiles)) ? rawSellerProfiles as Record<string, unknown> : null
          return (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{sv(s.title)}</p>
                  <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>
                    {(seller ? sv(seller.store_name) : '?') + ' (' + (sellerProfile ? ('@' + sv(sellerProfile.username)) : '?') + ')'}
                  </p>
                  <p style={{ color: '#555', fontSize: '11px', margin: '2px 0 0' }}>
                    {'Viewers: ' + sv(s.viewer_count) + ' | Peak: ' + sv(s.peak_viewers) + ' | ' + sv(s.category) + ' | ' + fmtDate(s.started_at || s.scheduled_at)}
                  </p>
                </div>
                <span style={badge(sv(s.status) === 'live' ? '#E8344E' : sv(s.status) === 'scheduled' ? '#3B82F6' : '#555')}>
                  {sv(s.status).toUpperCase()}
                </span>
              </div>
              {sv(s.status) === 'live' ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => stopStream(String(s.id || ''))} style={btn('#EF4444')}>{'Stop Live'}</button>
                  <button onClick={() => suspendStreamer(String(s.id || ''))} style={btn('#F59E0B')}>{'Suspend Streamer'}</button>
                </div>
              ) : null}
              {(typeof s.mux_playback_id === 'string' && s.mux_playback_id && sv(s.status) === 'ended') ? (
                <p style={{ color: '#3B82F6', fontSize: '12px', margin: '8px 0 0' }}>
                  {'Replay: mux.com/playback/' + sv(s.mux_playback_id)}
                </p>
              ) : null}
            </div>
          )
        } catch (err: any) {
          return (
            <div key={i} style={card}>
              {renderDebugError('Stream row #' + String(i), { message: String(err?.message || err), stack: String(err?.stack || '') })}
            </div>
          )
        }
      }) : null}
    </div>
  )

  const renderAudit = () => (
    <div style={{ padding: '0 16px' }}>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(auditTotal) + ' log entries'}</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['Date', 'Admin', 'Action', 'Target', 'ID', 'Details'].map(h => (
                <th key={h} style={{ color: '#888', fontWeight: 600, padding: '8px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.isArray(auditLogs) ? auditLogs.map((log, i) => {
              try {
                const actionStr = sv(log.action)
                const adminEmailStr = sv(log.admin_email)
                const detailsStr: string = (log.details && typeof log.details === 'object') ? safeStringify(log.details) : '-'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                    <td style={{ color: '#666', padding: '8px 6px', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</td>
                    <td style={{ color: '#aaa', padding: '8px 6px' }}>{adminEmailStr.split('@')[0]}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={badge(
                        actionStr.includes('ban') ? '#EF4444' :
                        actionStr.includes('suspend') ? '#F59E0B' :
                        actionStr.includes('block') ? '#EF4444' :
                        '#3B82F6'
                      )}>{actionStr}</span>
                    </td>
                    <td style={{ color: '#888', padding: '8px 6px' }}>{sv(log.target_type)}</td>
                    <td style={{ color: '#555', padding: '8px 6px', fontFamily: 'monospace' }}>{fmtId(log.target_id)}</td>
                    <td style={{ color: '#555', padding: '8px 6px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {detailsStr}
                    </td>
                  </tr>
                )
              } catch (err: any) {
                return (
                  <tr key={i}>
                    <td colSpan={6} style={{ color: '#ff3333', padding: '8px 6px' }}>
                      {'Row error: ' + String(err?.message || err)}
                    </td>
                  </tr>
                )
              }
            }) : null}
          </tbody>
        </table>
      </div>
      {auditTotal > 50 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
          <button disabled={auditPage <= 1} onClick={() => fetchAudit(auditPage - 1)} style={btn('#333')}>{'Prev'}</button>
          <span style={{ color: '#666', fontSize: '13px', padding: '6px' }}>{'Page ' + sv(auditPage) + ' / ' + sv(Math.ceil(auditTotal / 50))}</span>
          <button disabled={auditPage * 50 >= auditTotal} onClick={() => fetchAudit(auditPage + 1)} style={btn('#333')}>{'Next'}</button>
        </div>
      ) : null}
    </div>
  )

  const renderContent = () => {
    try {
      switch (tab) {
        case 'overview': return renderOverview()
        case 'users': return renderUsers()
        case 'sellers': return renderSellers()
        case 'payments': return renderPayments()
        case 'disputes': return renderDisputes()
        case 'lives': return renderLives()
        case 'audit': return renderAudit()
        default: return null
      }
    } catch (err: any) {
      return renderDebugError('renderContent (tab=' + String(tab) + ')', { message: String(err?.message || err), stack: String(err?.stack || '') })
    }
  }

  try {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '40px' }}>
        <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {/* Header */}
          <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: 0 }}>{'Admin Panel'}</h1>
                <p style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>{'ShaPop Back-Office'}</p>
              </div>
            </div>
            {loading ? <div className="admin-spinner" style={{ width: '20px', height: '20px' }} /> : null}
          </div>

          {/* Action message */}
          {actionMsg ? (
            <div style={{
              position: 'fixed', top: '60px', left: '50%', transform: 'translateX(-50%)',
              backgroundColor: '#10B981', color: '#fff', padding: '10px 24px',
              borderRadius: '12px', fontSize: '14px', fontWeight: 700, zIndex: 9999,
              boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
            }}>
              {actionMsg}
            </div>
          ) : null}

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: '4px', padding: '16px 16px 12px',
            overflowX: 'auto',
          }} className="no-scrollbar">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 14px', borderRadius: '10px', flexShrink: 0,
                  cursor: 'pointer', fontSize: '13px', fontWeight: tab === t.id ? 700 : 500,
                  background: tab === t.id ? 'rgba(240,144,138,0.12)' : '#0D0D0D',
                  border: tab === t.id ? '1px solid rgba(240,144,138,0.3)' : '1px solid #1A1A1A',
                  color: tab === t.id ? '#F0908A' : '#666',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Error banner */}
          {pageError ? (
            <div style={{ margin: '16px', padding: '16px', backgroundColor: '#1a0a0a', border: '1px solid #E8344E', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ color: '#E8344E', fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>{String(pageError)}</p>
              <p style={{ color: '#666', fontSize: '12px', margin: '0 0 12px' }}>{'Le serveur doit etre deploye avec les endpoints admin.'}</p>
              <button onClick={() => { setPageError(null); fetchStats() }} style={btn('#333')}>{'Reessayer'}</button>
            </div>
          ) : null}

          {/* Content */}
          {!pageError ? renderContent() : null}
        </div>

        {/* Toast */}
        {toast ? (
          <div style={{
            position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
            padding: '14px 24px', borderRadius: '12px',
            backgroundColor: '#3a1a1a',
            border: '1px solid #E8344E',
            color: '#E8344E',
            fontSize: '14px', fontWeight: 600, zIndex: 10000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}>
            {String(toast)}
          </div>
        ) : null}
      </div>
    )
  } catch (err: any) {
    // Catch synchronous errors during JSX evaluation
    const errObj = { message: String(err?.message || err), stack: String(err?.stack || '') }
    // Cannot call setRenderError here (inside render), so return the error UI directly
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', padding: '40px 16px' }}>
        {renderDebugError('Top-level return catch', errObj)}
      </div>
    )
  }
}
