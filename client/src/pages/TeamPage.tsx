import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { tr, type Localized } from '../lib/i18n'
import { apiFetch } from '../lib/api'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface TeamMember {
  id: string
  user_id: string
  role: string
  status: string
  user?: { display_name: string; avatar_url: string | null; email: string }
}

interface Invitation {
  id: string
  seller_id: string
  role: string
  seller?: { display_name: string; avatar_url: string | null; store_name: string }
}

type TeamText = Record<'title' | 'invite' | 'email' | 'role' | 'manager' | 'managerDesc' | 'moderator' | 'moderatorDesc' | 'shipper' | 'shipperDesc' | 'send' | 'sending' | 'noMembers' | 'pending' | 'active' | 'remove' | 'invitations' | 'accept' | 'decline' | 'noInvitations' | 'maxMembers' | 'invalidEmail' | 'userNotFound' | 'inviteSelf' | 'notSeller' | 'genericError' | 'networkError' | 'seller' | 'goBack', string>

const content: Localized<TeamText> = {
  en: {
    title: 'My team',
    invite: 'Invite a member',
    email: 'Member’s email',
    role: 'Role',
    manager: 'Manager',
    managerDesc: 'Full access: lives, items, orders',
    moderator: 'Moderator',
    moderatorDesc: 'Chat management and moderation',
    shipper: 'Handovers',
    shipperDesc: 'Handovers and parcels by post only',
    send: 'Send invitation',
    sending: 'Sending...',
    noMembers: 'No team members yet',
    pending: 'Pending',
    active: 'Active',
    remove: 'Remove',
    invitations: 'Invitations received',
    accept: 'Accept',
    decline: 'Decline',
    noInvitations: 'No invitations',
    maxMembers: 'Up to 10 members',
    invalidEmail: 'This email address is not valid.',
    userNotFound: 'No ShaPop account uses this email.',
    inviteSelf: 'You can’t invite yourself.',
    notSeller: 'You need a seller account to invite team members.',
    genericError: 'Something went wrong. Please try again.',
    networkError: 'No connection. Check your internet and try again.',
    seller: 'Seller',
    goBack: 'Go back',
  },
  fr: {
    title: 'Mon équipe',
    invite: 'Inviter un membre',
    email: 'E-mail du membre',
    role: 'Rôle',
    manager: 'Manager',
    managerDesc: 'Accès complet : lives, articles, commandes',
    moderator: 'Modérateur',
    moderatorDesc: 'Gestion du chat et modération',
    shipper: 'Remises',
    shipperDesc: 'Remises et envois uniquement',
    send: 'Envoyer l’invitation',
    sending: 'Envoi...',
    noMembers: 'Aucun membre dans l’équipe pour l’instant',
    pending: 'En attente',
    active: 'Actif',
    remove: 'Retirer',
    invitations: 'Invitations reçues',
    accept: 'Accepter',
    decline: 'Refuser',
    noInvitations: 'Aucune invitation',
    maxMembers: '10 membres maximum',
    invalidEmail: 'Cette adresse e-mail n’est pas valide.',
    userNotFound: 'Aucun compte ShaPop n’utilise cet e-mail.',
    inviteSelf: 'Tu ne peux pas t’inviter toi-même.',
    notSeller: 'Il te faut un compte vendeur pour inviter des membres.',
    genericError: 'Une erreur est survenue. Réessaie.',
    networkError: 'Pas de connexion. Vérifie ton accès à Internet et réessaie.',
    seller: 'Vendeur',
    goBack: 'Retour',
  },
  es: {
    title: 'Mi equipo',
    invite: 'Invitar a un miembro',
    email: 'Correo del miembro',
    role: 'Rol',
    manager: 'Gestor',
    managerDesc: 'Acceso total: directos, artículos, pedidos',
    moderator: 'Moderador',
    moderatorDesc: 'Gestión del chat y moderación',
    shipper: 'Entregas',
    shipperDesc: 'Solo entregas y envíos por correo',
    send: 'Enviar invitación',
    sending: 'Enviando...',
    noMembers: 'Aún no hay miembros en el equipo',
    pending: 'Pendiente',
    active: 'Activo',
    remove: 'Quitar',
    invitations: 'Invitaciones recibidas',
    accept: 'Aceptar',
    decline: 'Rechazar',
    noInvitations: 'Sin invitaciones',
    maxMembers: 'Máximo 10 miembros',
    invalidEmail: 'Esta dirección de correo no es válida.',
    userNotFound: 'Ninguna cuenta de ShaPop usa este correo.',
    inviteSelf: 'No puedes invitarte a ti mismo.',
    notSeller: 'Necesitas una cuenta de vendedor para invitar a miembros.',
    genericError: 'Algo ha fallado. Vuelve a intentarlo.',
    networkError: 'Sin conexión. Revisa tu internet y vuelve a intentarlo.',
    seller: 'Vendedor',
    goBack: 'Volver',
  },
  ru: {
    title: 'Моя команда',
    invite: 'Пригласить участника',
    email: 'E-mail участника',
    role: 'Роль',
    manager: 'Менеджер',
    managerDesc: 'Полный доступ: эфиры, товары, заказы',
    moderator: 'Модератор',
    moderatorDesc: 'Управление чатом и модерация',
    shipper: 'Передачи',
    shipperDesc: 'Только передача и отправка почтой',
    send: 'Отправить приглашение',
    sending: 'Отправляем...',
    noMembers: 'В команде пока никого нет',
    pending: 'Ожидает',
    active: 'Активен',
    remove: 'Убрать',
    invitations: 'Полученные приглашения',
    accept: 'Принять',
    decline: 'Отклонить',
    noInvitations: 'Приглашений нет',
    maxMembers: 'Не более 10 участников',
    invalidEmail: 'Этот адрес e-mail недействителен.',
    userNotFound: 'Нет аккаунта ShaPop с таким e-mail.',
    inviteSelf: 'Нельзя пригласить самого себя.',
    notSeller: 'Чтобы приглашать участников, нужен аккаунт продавца.',
    genericError: 'Что-то пошло не так. Попробуй ещё раз.',
    networkError: 'Нет соединения. Проверь интернет и попробуй снова.',
    seller: 'Продавец',
    goBack: 'Назад',
  },
  he: {
    title: 'הצוות שלי',
    invite: 'הזמנת חבר/ת צוות',
    email: 'האימייל של חבר/ת הצוות',
    role: 'תפקיד',
    manager: 'מנהל/ת',
    managerDesc: 'גישה מלאה: שידורים חיים, פריטים, הזמנות',
    moderator: 'מנחה',
    moderatorDesc: 'ניהול הצ׳אט ומודרציה',
    shipper: 'מסירות',
    shipperDesc: 'מסירות ומשלוחים בדואר בלבד',
    send: 'שליחת הזמנה',
    sending: 'שולחים...',
    noMembers: 'עדיין אין חברי צוות',
    pending: 'ממתין',
    active: 'פעיל',
    remove: 'הסרה',
    invitations: 'הזמנות שקיבלת',
    accept: 'אישור',
    decline: 'דחייה',
    noInvitations: 'אין הזמנות',
    maxMembers: 'עד 10 חברי צוות',
    invalidEmail: 'כתובת האימייל אינה תקינה.',
    userNotFound: 'אין חשבון ShaPop עם האימייל הזה.',
    inviteSelf: 'אי אפשר להזמין את עצמך.',
    notSeller: 'צריך חשבון מוכר/ת כדי להזמין חברי צוות.',
    genericError: 'משהו השתבש. נסו שוב.',
    networkError: 'אין חיבור. בדקו את האינטרנט ונסו שוב.',
    seller: 'מוכר/ת',
    goBack: 'חזרה',
  },
}

/** Message serveur connu (anglais) → texte traduit. */
function teamError(raw: unknown, ct: TeamText): string {
  const m = String(raw || '').toLowerCase()
  if (m.includes('user not found')) return ct.userNotFound
  if (m.includes('invite yourself')) return ct.inviteSelf
  if (m.includes('must be a seller')) return ct.notSeller
  if (m.includes('maximum 10')) return ct.maxMembers
  if (m.includes('email is required')) return ct.invalidEmail
  return ct.genericError
}

const roleColors: Record<string, string> = {
  manager: '#8B5CF6',
  moderator: '#3B82F6',
  shipper: '#F59E0B',
}

export default function TeamPage() {
  const navigate = useNavigate()
  const { user, session, profile } = useAuth()
  const ct = tr(content)
  usePageTitle(ct.title)

  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('moderator')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.access_token) { setLoading(false); return }
    const headers = { Authorization: `Bearer ${session.access_token}` }

    const promises: Promise<void>[] = []

    // Fetch team members (for sellers)
    if (profile?.is_seller) {
      promises.push(apiFetch('/api/team/members', { headers }).then(async r => {
        if (r.ok) setMembers(await r.json())
      }).catch(() => {}))
    }

    // Fetch invitations (for everyone)
    promises.push(apiFetch('/api/team/invitations', { headers }).then(async r => {
      if (r.ok) setInvitations(await r.json())
    }).catch(() => {}))

    Promise.all(promises).finally(() => setLoading(false))
  }, [session?.access_token, profile?.is_seller])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !session?.access_token) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setError(ct.invalidEmail)
      return
    }
    setInviting(true)
    setError(null)
    try {
      const resp = await apiFetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (resp.ok) {
        const newMember = await resp.json()
        setMembers(prev => [newMember, ...prev])
        setInviteEmail('')
        setShowInvite(false)
      } else {
        const data = await resp.json().catch(() => ({}))
        setError(teamError(data.error, ct))
      }
    } catch { setError(ct.networkError) }
    setInviting(false)
  }

  const handleAccept = async (sellerId: string) => {
    if (!session?.access_token) return
    try {
      const resp = await apiFetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ seller_id: sellerId }),
      })
      if (resp.ok) {
        setInvitations(prev => prev.filter(i => i.seller_id !== sellerId))
      } else {
        setError(ct.genericError)
      }
    } catch { setError(ct.networkError) }
  }

  const handleDecline = async (sellerId: string) => {
    if (!session?.access_token) return
    try {
      const resp = await apiFetch('/api/team/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ seller_id: sellerId }),
      })
      if (resp.ok) {
        setInvitations(prev => prev.filter(i => i.seller_id !== sellerId))
      } else {
        setError(ct.genericError)
      }
    } catch { setError(ct.networkError) }
  }

  const handleRemove = async (userId: string) => {
    if (!session?.access_token) return
    try {
      const resp = await apiFetch(`/api/team/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (resp.ok) {
        setMembers(prev => prev.filter(m => m.user_id !== userId))
      } else {
        setError(ct.genericError)
      }
    } catch { setError(ct.networkError) }
  }

  const roleLabel = (role: string) => {
    if (role === 'manager') return ct.manager
    if (role === 'moderator') return ct.moderator
    if (role === 'shipper') return ct.shipper
    return role
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: '#000', borderBottom: '1px solid #1A1A1A',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => navigate(-1)} aria-label={ct.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>{ct.title}</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
          <div
            role="status"
            style={{
              width: '32px', height: '32px', border: '3px solid #333',
              borderTopColor: '#F0908A', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : (
      <div style={{ padding: '20px' }}>
        {/* Received invitations */}
        {invitations.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{ct.invitations}</h2>
            {invitations.map(inv => (
              <div key={inv.id} style={{
                backgroundColor: '#111', borderRadius: '14px', padding: '16px',
                marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: '#1A1A1A', overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {inv.seller?.avatar_url ? (
                    <img src={inv.seller.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <span style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#F0908A' }}>
                      {(inv.seller?.display_name || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {inv.seller?.store_name || inv.seller?.display_name || ct.seller}
                  </p>
                  <span style={{
                    fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700,
                    color: roleColors[inv.role] || '#888',
                    padding: '2px 8px', borderRadius: '6px',
                    backgroundColor: `${roleColors[inv.role] || '#888'}15`,
                    textTransform: 'uppercase',
                  }}>
                    {roleLabel(inv.role)}
                  </span>
                </div>
                <button onClick={() => handleAccept(inv.seller_id)} style={{
                  padding: '8px 14px', borderRadius: '8px',
                  backgroundColor: '#22C55E', border: 'none',
                  color: '#fff', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                }}>
                  {ct.accept}
                </button>
                <button onClick={() => handleDecline(inv.seller_id)} style={{
                  padding: '8px 14px', borderRadius: '8px',
                  backgroundColor: '#1A1A1A', border: '1px solid #333',
                  color: '#E8344E', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                }}>
                  {ct.decline}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Seller team management */}
        {profile?.is_seller && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
                {ct.title} ({members.length}/10)
              </h2>
              <button
                onClick={() => setShowInvite(!showInvite)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  borderRadius: '8px', border: 'none',
                  color: '#fff', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {ct.invite}
              </button>
            </div>

            {/* Invite form */}
            {showInvite && (
              <div style={{
                backgroundColor: '#111', borderRadius: '14px', padding: '16px',
                marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
              }}>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={ct.email}
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setError(null) }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    border: '1px solid #333', backgroundColor: '#0D0D0D',
                    color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', boxSizing: 'border-box', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['manager', 'moderator', 'shipper'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: '10px',
                        border: inviteRole === r ? `2px solid ${roleColors[r]}` : '1px solid #333',
                        backgroundColor: inviteRole === r ? `${roleColors[r]}15` : '#0D0D0D',
                        cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      <p style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: roleColors[r], margin: 0 }}>
                        {roleLabel(r)}
                      </p>
                      <p style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#888', margin: '4px 0 0' }}>
                        {r === 'manager' ? ct.managerDesc : r === 'moderator' ? ct.moderatorDesc : ct.shipperDesc}
                      </p>
                    </button>
                  ))}
                </div>
                {error && <p style={{ color: '#E8344E', fontSize: 'calc(12px * var(--fs, 1))', margin: 0 }}>{error}</p>}
                <button
                  disabled={inviting || !inviteEmail.trim()}
                  onClick={handleInvite}
                  style={{
                    width: '100%', padding: '14px',
                    background: inviting ? '#333' : 'linear-gradient(135deg, #F0908A, #E8344E)',
                    borderRadius: '12px', border: 'none',
                    color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
                    cursor: inviting ? 'default' : 'pointer',
                    opacity: inviting ? 0.6 : 1,
                  }}
                >
                  {inviting ? ct.sending : ct.send}
                </button>
              </div>
            )}

            {/* Members list */}
            {members.length === 0 ? (
              <div style={{
                backgroundColor: '#111', borderRadius: '14px', padding: '32px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#666' }}>{ct.noMembers}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map(member => (
                  <div key={member.id} style={{
                    backgroundColor: '#111', borderRadius: '14px', padding: '14px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      backgroundColor: '#1A1A1A', overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {member.user?.avatar_url ? (
                        <img src={member.user.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <span style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#F0908A' }}>
                          {(member.user?.display_name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0 }}>
                        {member.user?.display_name || member.user_id.slice(0, 8)}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700,
                          color: roleColors[member.role] || '#888',
                          padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: `${roleColors[member.role] || '#888'}15`,
                          textTransform: 'uppercase',
                        }}>
                          {roleLabel(member.role)}
                        </span>
                        <span style={{
                          fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 600,
                          color: member.status === 'active' ? '#22C55E' : '#F59E0B',
                        }}>
                          {member.status === 'active' ? ct.active : ct.pending}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(member.user_id)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px',
                        backgroundColor: '#1A1A1A', border: '1px solid #333',
                        color: '#E8344E', fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {ct.remove}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      )}
    </div>
  )
}
