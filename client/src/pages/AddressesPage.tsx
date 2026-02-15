import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'

interface Address {
  id?: string
  name: string
  street: string
  city: string
  zip: string
  phone: string
  is_default?: boolean
}

const content = {
  fr: { title: 'Adresses', noAddr: 'Aucune adresse enregistree.', add: 'Ajouter une adresse', name: 'Nom complet', street: 'Adresse', city: 'Ville', zip: 'Code postal', phone: 'Telephone', save: 'Enregistrer', cancel: 'Annuler', edit: 'Modifier', delete: 'Supprimer', saved: 'Adresse enregistree !' },
  en: { title: 'Addresses', noAddr: 'No addresses saved yet.', add: 'Add address', name: 'Full name', street: 'Street address', city: 'City', zip: 'Zip code', phone: 'Phone', save: 'Save address', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', saved: 'Address saved!' },
  he: { title: '\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA', noAddr: '\u05D0\u05D9\u05DF \u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA.', add: '\u05D4\u05D5\u05E1\u05E3 \u05DB\u05EA\u05D5\u05D1\u05EA', name: '\u05E9\u05DD \u05DE\u05DC\u05D0', street: '\u05E8\u05D7\u05D5\u05D1', city: '\u05E2\u05D9\u05E8', zip: '\u05DE\u05D9\u05E7\u05D5\u05D3', phone: '\u05D8\u05DC\u05E4\u05D5\u05DF', save: '\u05E9\u05DE\u05D5\u05E8 \u05DB\u05EA\u05D5\u05D1\u05EA', cancel: '\u05D1\u05D9\u05D8\u05D5\u05DC', edit: '\u05E2\u05E8\u05D5\u05DA', delete: '\u05DE\u05D7\u05E7', saved: '!\u05DB\u05EA\u05D5\u05D1\u05EA \u05E0\u05E9\u05DE\u05E8\u05D4' },
  es: { title: 'Direcciones', noAddr: 'No hay direcciones guardadas.', add: 'Agregar direccion', name: 'Nombre completo', street: 'Direccion', city: 'Ciudad', zip: 'Codigo postal', phone: 'Telefono', save: 'Guardar direccion', cancel: 'Cancelar', edit: 'Editar', delete: 'Eliminar', saved: 'Direccion guardada!' },
}

export default function AddressesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = getLang()
  const c = content[lang] || content.fr

  const [addresses, setAddresses] = useState<Address[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [formName, setFormName] = useState('')
  const [formStreet, setFormStreet] = useState('')
  const [formCity, setFormCity] = useState('')
  const [formZip, setFormZip] = useState('')
  const [formPhone, setFormPhone] = useState('')

  const fetchAddresses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (data) setAddresses(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  const handleSave = async () => {
    if (!user || !formName.trim() || !formStreet.trim()) return

    const fields = {
      name: formName.trim(),
      street: formStreet.trim(),
      city: formCity.trim(),
      zip: formZip.trim(),
      phone: formPhone.trim(),
    }

    if (editIndex !== null) {
      const id = addresses[editIndex].id
      await supabase.from('addresses').update(fields).eq('id', id)
    } else {
      await supabase.from('addresses').insert({
        user_id: user.id,
        ...fields,
        is_default: addresses.length === 0,
      })
    }

    await fetchAddresses()
    resetForm()
    showToast(c.saved)
  }

  const handleEdit = (index: number) => {
    const addr = addresses[index]
    setFormName(addr.name)
    setFormStreet(addr.street)
    setFormCity(addr.city)
    setFormZip(addr.zip)
    setFormPhone(addr.phone)
    setEditIndex(index)
    setShowForm(true)
  }

  const handleDelete = async (index: number) => {
    const id = addresses[index].id
    await supabase.from('addresses').delete().eq('id', id)
    await fetchAddresses()
  }

  const resetForm = () => {
    setFormName('')
    setFormStreet('')
    setFormCity('')
    setFormZip('')
    setFormPhone('')
    setEditIndex(null)
    setShowForm(false)
  }

  const inputStyle = { width: '100%', padding: '12px 14px', backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #222', borderTopColor: '#F0908A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
        <>
        {/* Saved addresses */}
        {addresses.length > 0 && !showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {addresses.map((addr, i) => (
              <div key={addr.id || i} style={{
                backgroundColor: '#111', borderRadius: '14px', padding: '16px',
                border: '1px solid #222',
              }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                  {addr.name}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>
                  {addr.street}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>
                  {addr.zip} {addr.city}
                </p>
                {addr.phone && (
                  <p style={{ fontSize: '13px', color: '#888', margin: '0 0 8px' }}>
                    {addr.phone}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(i)}
                    style={{
                      padding: '8px 16px', backgroundColor: '#1A1A1A',
                      border: 'none', borderRadius: '8px',
                      color: '#F0908A', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c.edit}
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    style={{
                      padding: '8px 16px', backgroundColor: 'rgba(232,52,78,0.1)',
                      border: 'none', borderRadius: '8px',
                      color: '#E8344E', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!showForm ? (
          <>
            {addresses.length === 0 && (
              <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '32px', textAlign: 'center', marginBottom: '16px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" style={{ marginBottom: '12px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>{c.noAddr}</p>
              </div>
            )}
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: '100%', padding: '14px',
                backgroundColor: '#F0908A', border: 'none', borderRadius: '10px',
                color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {c.add}
            </button>
          </>
        ) : (
          <div>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder={c.name} style={inputStyle} />
            <input type="text" value={formStreet} onChange={e => setFormStreet(e.target.value)} placeholder={c.street} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="text" value={formCity} onChange={e => setFormCity(e.target.value)} placeholder={c.city} style={inputStyle} />
              <input type="text" value={formZip} onChange={e => setFormZip(e.target.value)} placeholder={c.zip} style={inputStyle} />
            </div>
            <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder={c.phone} style={inputStyle} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={resetForm} style={{ flex: 1, padding: '14px', backgroundColor: '#1A1A1A', border: 'none', borderRadius: '10px', color: '#888', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>{c.cancel}</button>
              <button onClick={handleSave} style={{ flex: 1, padding: '14px', backgroundColor: '#F0908A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>{c.save}</button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}
