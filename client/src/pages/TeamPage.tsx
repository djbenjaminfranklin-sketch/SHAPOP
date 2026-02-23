import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { apiFetch } from '../lib/api'

type Lang = 'fr' | 'en' | 'he' | 'es'

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

const content = {
  fr: {
    title: 'Mon equipe',
    invite: 'Inviter un membre',
    email: 'Email du membre',
    role: 'Role',
    manager: 'Manager',
    managerDesc: 'Acces complet : lives, articles, commandes',
    moderator: 'Moderateur',
    moderatorDesc: 'Gestion du chat et moderation',
    shipper: 'Expediteur',
    shipperDesc: 'Gestion des expeditions uniquement',
    send: 'Envoyer l\'invitation',
    sending: 'Envoi...',
    noMembers: 'Aucun membre dans l\'equipe',
    pending: 'En attente',
    active: 'Actif',
    remove: 'Retirer',
    invitations: 'Invitations recues',
    accept: 'Accepter',
    decline: 'Refuser',
    noInvitations: 'Aucune invitation',
    maxMembers: 'Maximum 10 membres',
  },
  en: {
    title: 'My team',
    invite: 'Invite a member',
    email: 'Member email',
    role: 'Role',
    manager: 'Manager',
    managerDesc: 'Full access: lives, items, orders',
    moderator: 'Moderator',
    moderatorDesc: 'Chat management and moderation',
    shipper: 'Shipper',
    shipperDesc: 'Shipping management only',
    send: 'Send invitation',
    sending: 'Sending...',
    noMembers: 'No team members',
    pending: 'Pending',
    active: 'Active',
    remove: 'Remove',
    invitations: 'Received invitations',
    accept: 'Accept',
    decline: 'Decline',
    noInvitations: 'No invitations',
    maxMembers: 'Maximum 10 members',
  },
  he: {
    title: '\u05D4\u05E6\u05D5\u05D5\u05EA \u05E9\u05DC\u05D9',
    invite: '\u05D4\u05D6\u05DE\u05DF \u05D7\u05D1\u05E8',
    email: '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D4\u05D7\u05D1\u05E8',
    role: '\u05EA\u05E4\u05E7\u05D9\u05D3',
    manager: '\u05DE\u05E0\u05D4\u05DC',
    managerDesc: '\u05D2\u05D9\u05E9\u05D4 \u05DE\u05DC\u05D0\u05D4: \u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD, \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD, \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA',
    moderator: '\u05DE\u05E0\u05D7\u05D4',
    moderatorDesc: '\u05E0\u05D9\u05D4\u05D5\u05DC \u05E6\u05F3\u05D0\u05D8 \u05D5\u05DE\u05D5\u05D3\u05E8\u05E6\u05D9\u05D4',
    shipper: '\u05E9\u05DC\u05D9\u05D7',
    shipperDesc: '\u05E0\u05D9\u05D4\u05D5\u05DC \u05DE\u05E9\u05DC\u05D5\u05D7\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3',
    send: '\u05E9\u05DC\u05D7 \u05D4\u05D6\u05DE\u05E0\u05D4',
    sending: '\u05E9\u05D5\u05DC\u05D7...',
    noMembers: '\u05D0\u05D9\u05DF \u05D7\u05D1\u05E8\u05D9 \u05E6\u05D5\u05D5\u05EA',
    pending: '\u05DE\u05DE\u05EA\u05D9\u05DF',
    active: '\u05E4\u05E2\u05D9\u05DC',
    remove: '\u05D4\u05E1\u05E8',
    invitations: '\u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05E9\u05D4\u05EA\u05E7\u05D1\u05DC\u05D5',
    accept: '\u05E7\u05D1\u05DC',
    decline: '\u05D3\u05D7\u05D4',
    noInvitations: '\u05D0\u05D9\u05DF \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA',
    maxMembers: '\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 10 \u05D7\u05D1\u05E8\u05D9\u05DD',
  },
  es: {
    title: 'Mi equipo',
    invite: 'Invitar a un miembro',
    email: 'Email del miembro',
    role: 'Rol',
    manager: 'Gerente',
    managerDesc: 'Acceso completo: directos, articulos, pedidos',
    moderator: 'Moderador',
    moderatorDesc: 'Gestion del chat y moderacion',
    shipper: 'Expedidor',
    shipperDesc: 'Solo gestion de envios',
    send: 'Enviar invitacion',
    sending: 'Enviando...',
    noMembers: 'No hay miembros en el equipo',
    pending: 'Pendiente',
    active: 'Activo',
    remove: 'Eliminar',
    invitations: 'Invitaciones recibidas',
    accept: 'Aceptar',
    decline: 'Rechazar',
    noInvitations: 'Sin invitaciones',
    maxMembers: 'Maximo 10 miembros',
  },
}

const roleColors: Record<string, string> = {
  manager: '#8B5CF6',
  moderator: '#3B82F6',
  shipper: '#F59E0B',
}

export default function TeamPage() {
  const navigate = useNavigate()
  const { user, session, profile } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = content[lang] || content.fr

  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('moderator')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.access_token) return
    const headers = { Authorization: `Bearer ${session.access_token}` }

    // Fetch team members (for sellers)
    if (profile?.is_seller) {
      apiFetch('/api/team/members', { headers }).then(async r => {
        if (r.ok) setMembers(await r.json())
      }).catch(() => {})
    }

    // Fetch invitations (for everyone)
    apiFetch('/api/team/invitations', { headers }).then(async r => {
      if (r.ok) setInvitations(await r.json())
    }).catch(() => {})
  }, [session?.access_token, profile?.is_seller])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !session?.access_token) return
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
        const data = await resp.json()
        setError(data.error || 'Error')
      }
    } catch { setError('Network error') }
    setInviting(false)
  }

  const handleAccept = async (sellerId: string) => {
    if (!session?.access_token) return
    const resp = await apiFetch('/api/team/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ seller_id: sellerId }),
    })
    if (resp.ok) {
      setInvitations(prev => prev.filter(i => i.seller_id !== sellerId))
    }
  }

  const handleDecline = async (sellerId: string) => {
    if (!session?.access_token) return
    const resp = await apiFetch('/api/team/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ seller_id: sellerId }),
    })
    if (resp.ok) {
      setInvitations(prev => prev.filter(i => i.seller_id !== sellerId))
    }
  }

  const handleRemove = async (userId: string) => {
    if (!session?.access_token) return
    const resp = await apiFetch(`/api/team/members/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (resp.ok) {
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    }
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
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>{ct.title}</h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Received invitations */}
        {invitations.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{ct.invitations}</h2>
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
                    <img src={inv.seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#F0908A' }}>
                      {(inv.seller?.display_name || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {inv.seller?.store_name || inv.seller?.display_name || 'Seller'}
                  </p>
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
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
                  color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                }}>
                  {ct.accept}
                </button>
                <button onClick={() => handleDecline(inv.seller_id)} style={{
                  padding: '8px 14px', borderRadius: '8px',
                  backgroundColor: '#1A1A1A', border: '1px solid #333',
                  color: '#E8344E', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
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
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
                {ct.title} ({members.length}/10)
              </h2>
              <button
                onClick={() => setShowInvite(!showInvite)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  borderRadius: '8px', border: 'none',
                  color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
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
                  placeholder={ct.email}
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setError(null) }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    border: '1px solid #333', backgroundColor: '#0D0D0D',
                    color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
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
                      <p style={{ fontSize: '13px', fontWeight: 700, color: roleColors[r], margin: 0 }}>
                        {roleLabel(r)}
                      </p>
                      <p style={{ fontSize: '10px', color: '#888', margin: '4px 0 0' }}>
                        {r === 'manager' ? ct.managerDesc : r === 'moderator' ? ct.moderatorDesc : ct.shipperDesc}
                      </p>
                    </button>
                  ))}
                </div>
                {error && <p style={{ color: '#E8344E', fontSize: '12px', margin: 0 }}>{error}</p>}
                <button
                  disabled={inviting || !inviteEmail.trim()}
                  onClick={handleInvite}
                  style={{
                    width: '100%', padding: '14px',
                    background: inviting ? '#333' : 'linear-gradient(135deg, #F0908A, #E8344E)',
                    borderRadius: '12px', border: 'none',
                    color: '#fff', fontSize: '15px', fontWeight: 700,
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
                <p style={{ fontSize: '14px', color: '#666' }}>{ct.noMembers}</p>
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
                        <img src={member.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#F0908A' }}>
                          {(member.user?.display_name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>
                        {member.user?.display_name || member.user_id.slice(0, 8)}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          color: roleColors[member.role] || '#888',
                          padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: `${roleColors[member.role] || '#888'}15`,
                          textTransform: 'uppercase',
                        }}>
                          {roleLabel(member.role)}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 600,
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
                        color: '#E8344E', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
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
    </div>
  )
}
