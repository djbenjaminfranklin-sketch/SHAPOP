import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { tr, type Localized } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface Address {
  id?: string
  name: string
  street: string
  city: string
  zip: string
  phone: string
  is_default?: boolean
}

type AddrText = Record<'title' | 'noAddr' | 'add' | 'name' | 'street' | 'city' | 'zip' | 'phone' | 'save' | 'cancel' | 'edit' | 'delete' | 'saved' | 'confirm' | 'confirmDelete' | 'setDefault' | 'defaultLabel' | 'nameRequired' | 'streetRequired' | 'errorSave' | 'errorDelete' | 'errorDefault' | 'saving' | 'goBack', string>

const content: Localized<AddrText> = {
  en: {
    title: 'Addresses',
    noAddr: 'No saved addresses yet.',
    add: 'Add an address',
    name: 'Full name',
    street: 'Address (street, number, apt.)',
    city: 'City',
    zip: 'Postal code',
    phone: 'Phone',
    save: 'Save address',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    saved: 'Address saved!',
    confirm: 'Confirm?',
    confirmDelete: 'Delete this address?',
    setDefault: 'Make default',
    defaultLabel: 'Default',
    nameRequired: 'Name is required',
    streetRequired: 'Address is required',
    errorSave: 'Couldn’t save the address. Please try again.',
    errorDelete: 'Couldn’t delete the address. Please try again.',
    errorDefault: 'Couldn’t change your default address. Please try again.',
    saving: 'Saving...',
    goBack: 'Go back',
  },
  fr: {
    title: 'Adresses',
    noAddr: 'Aucune adresse enregistrée pour l’instant.',
    add: 'Ajouter une adresse',
    name: 'Nom complet',
    street: 'Adresse (rue, numéro, appartement)',
    city: 'Ville',
    zip: 'Code postal',
    phone: 'Téléphone',
    save: 'Enregistrer l’adresse',
    cancel: 'Annuler',
    edit: 'Modifier',
    delete: 'Supprimer',
    saved: 'Adresse enregistrée !',
    confirm: 'Confirmer ?',
    confirmDelete: 'Supprimer cette adresse ?',
    setDefault: 'Par défaut',
    defaultLabel: 'Par défaut',
    nameRequired: 'Le nom est obligatoire',
    streetRequired: 'L’adresse est obligatoire',
    errorSave: 'Impossible d’enregistrer l’adresse. Réessaie.',
    errorDelete: 'Impossible de supprimer l’adresse. Réessaie.',
    errorDefault: 'Impossible de changer l’adresse par défaut. Réessaie.',
    saving: 'Enregistrement...',
    goBack: 'Retour',
  },
  es: {
    title: 'Direcciones',
    noAddr: 'Aún no tienes direcciones guardadas.',
    add: 'Añadir dirección',
    name: 'Nombre completo',
    street: 'Dirección (calle, número, piso)',
    city: 'Ciudad',
    zip: 'Código postal',
    phone: 'Teléfono',
    save: 'Guardar dirección',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    saved: '¡Dirección guardada!',
    confirm: '¿Confirmar?',
    confirmDelete: '¿Eliminar esta dirección?',
    setDefault: 'Predeterminar',
    defaultLabel: 'Predeterminada',
    nameRequired: 'El nombre es obligatorio',
    streetRequired: 'La dirección es obligatoria',
    errorSave: 'No se pudo guardar la dirección. Vuelve a intentarlo.',
    errorDelete: 'No se pudo eliminar la dirección. Vuelve a intentarlo.',
    errorDefault: 'No se pudo cambiar la dirección predeterminada. Vuelve a intentarlo.',
    saving: 'Guardando...',
    goBack: 'Volver',
  },
  ru: {
    title: 'Адреса',
    noAddr: 'Сохранённых адресов пока нет.',
    add: 'Добавить адрес',
    name: 'Имя и фамилия',
    street: 'Адрес (улица, дом, квартира)',
    city: 'Город',
    zip: 'Почтовый индекс',
    phone: 'Телефон',
    save: 'Сохранить адрес',
    cancel: 'Отмена',
    edit: 'Изменить',
    delete: 'Удалить',
    saved: 'Адрес сохранён!',
    confirm: 'Подтвердить?',
    confirmDelete: 'Удалить этот адрес?',
    setDefault: 'Сделать основным',
    defaultLabel: 'Основной',
    nameRequired: 'Укажи имя',
    streetRequired: 'Укажи адрес',
    errorSave: 'Не удалось сохранить адрес. Попробуй ещё раз.',
    errorDelete: 'Не удалось удалить адрес. Попробуй ещё раз.',
    errorDefault: 'Не удалось изменить основной адрес. Попробуй ещё раз.',
    saving: 'Сохраняем...',
    goBack: 'Назад',
  },
  he: {
    title: 'כתובות',
    noAddr: 'עדיין אין כתובות שמורות.',
    add: 'הוספת כתובת',
    name: 'שם מלא',
    street: 'כתובת (רחוב, מספר, דירה)',
    city: 'עיר',
    zip: 'מיקוד',
    phone: 'טלפון',
    save: 'שמירת הכתובת',
    cancel: 'ביטול',
    edit: 'עריכה',
    delete: 'מחיקה',
    saved: 'הכתובת נשמרה!',
    confirm: 'לאשר?',
    confirmDelete: 'למחוק את הכתובת?',
    setDefault: 'הגדרה כברירת מחדל',
    defaultLabel: 'ברירת מחדל',
    nameRequired: 'צריך למלא שם',
    streetRequired: 'צריך למלא כתובת',
    errorSave: 'לא הצלחנו לשמור את הכתובת. נסו שוב.',
    errorDelete: 'לא הצלחנו למחוק את הכתובת. נסו שוב.',
    errorDefault: 'לא הצלחנו לשנות את כתובת ברירת המחדל. נסו שוב.',
    saving: 'שומרים...',
    goBack: 'חזרה',
  },
}

export default function AddressesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const c = tr(content)
  usePageTitle(c.title)

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
  const [saving, setSaving] = useState(false)
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ name?: boolean; street?: boolean }>({})

  const fetchAddresses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Fetch addresses error:', error)
      // Table might not exist yet — don't crash
    }
    if (data) setAddresses(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  const handleSave = async () => {
    if (!user) return

    const errors: { name?: boolean; street?: boolean } = {}
    if (!formName.trim()) errors.name = true
    if (!formStreet.trim()) errors.street = true
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    setSaving(true)
    try {
      const fields = {
        name: formName.trim(),
        street: formStreet.trim(),
        city: formCity.trim(),
        zip: formZip.trim(),
        phone: formPhone.trim(),
      }

      let error
      if (editIndex !== null) {
        const id = addresses[editIndex].id
        ;({ error } = await supabase.from('addresses').update(fields).eq('id', id))
      } else {
        ;({ error } = await supabase.from('addresses').insert({
          user_id: user.id,
          ...fields,
          is_default: addresses.length === 0,
        }))
      }

      if (error) {
        console.error('Address save error:', error)
        showToast(c.errorSave, 'error')
        return
      }

      await fetchAddresses()
      resetForm()
      showToast(c.saved)
    } finally {
      setSaving(false)
    }
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
    if (confirmDeleteIndex !== index) {
      setConfirmDeleteIndex(index)
      return
    }
    setConfirmDeleteIndex(null)
    const id = addresses[index].id
    const { error } = await supabase.from('addresses').delete().eq('id', id)
    if (error) {
      showToast(c.errorDelete, 'error')
      return
    }
    await fetchAddresses()
  }

  const handleSetDefault = async (index: number) => {
    if (!user) return
    const id = addresses[index].id
    // Unset all defaults for this user, then set the chosen one
    const { error: e1 } = await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
    if (e1) { showToast(c.errorDefault, 'error'); return }
    const { error: e2 } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', id)
    if (e2) { showToast(c.errorDefault, 'error'); return }
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
    setFieldErrors({})
  }

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const inputStyle = { width: '100%', padding: '12px 14px', backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label={c.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                    {addr.name}
                  </p>
                  {addr.is_default && (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#F0908A', backgroundColor: 'rgba(240,144,138,0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                      {c.defaultLabel}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>
                  {addr.street}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>
                  {[addr.zip, addr.city].filter(Boolean).join(' ')}
                </p>
                {addr.phone && (
                  <p style={{ fontSize: '13px', color: '#888', margin: '0 0 8px' }}>
                    {addr.phone}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                      padding: '8px 16px',
                      backgroundColor: confirmDeleteIndex === i ? 'rgba(232,52,78,0.25)' : 'rgba(232,52,78,0.1)',
                      border: confirmDeleteIndex === i ? '1px solid #E8344E' : 'none',
                      borderRadius: '8px',
                      color: '#E8344E', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {confirmDeleteIndex === i ? c.confirm : c.delete}
                  </button>
                  {confirmDeleteIndex === i && (
                    <button
                      onClick={() => setConfirmDeleteIndex(null)}
                      style={{
                        padding: '8px 16px', backgroundColor: '#1A1A1A',
                        border: 'none', borderRadius: '8px',
                        color: '#888', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {c.cancel}
                    </button>
                  )}
                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefault(i)}
                      style={{
                        padding: '8px 16px', backgroundColor: '#1A1A1A',
                        border: 'none', borderRadius: '8px',
                        color: '#888', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', marginInlineStart: 'auto',
                      }}
                    >
                      &#9734; {c.setDefault}
                    </button>
                  )}
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
            <input type="text" autoComplete="name" value={formName} onChange={e => { setFormName(e.target.value); if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: false })) }} placeholder={c.name} style={{ ...inputStyle, borderColor: fieldErrors.name ? '#E8344E' : '#222' }} />
            {fieldErrors.name && <p style={{ fontSize: '12px', color: '#E8344E', marginTop: '-8px', marginBottom: '12px', marginInlineStart: '2px' }}>{c.nameRequired}</p>}
            <input type="text" autoComplete="street-address" value={formStreet} onChange={e => { setFormStreet(e.target.value); if (fieldErrors.street) setFieldErrors(prev => ({ ...prev, street: false })) }} placeholder={c.street} style={{ ...inputStyle, borderColor: fieldErrors.street ? '#E8344E' : '#222' }} />
            {fieldErrors.street && <p style={{ fontSize: '12px', color: '#E8344E', marginTop: '-8px', marginBottom: '12px', marginInlineStart: '2px' }}>{c.streetRequired}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="text" autoComplete="address-level2" value={formCity} onChange={e => setFormCity(e.target.value)} placeholder={c.city} style={inputStyle} />
              <input type="text" autoComplete="postal-code" autoCapitalize="characters" value={formZip} onChange={e => setFormZip(e.target.value)} placeholder={c.zip} style={inputStyle} />
            </div>
            <input type="tel" inputMode="tel" autoComplete="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder={c.phone} style={inputStyle} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={resetForm} disabled={saving} style={{ flex: 1, padding: '14px', backgroundColor: '#1A1A1A', border: 'none', borderRadius: '10px', color: '#888', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>{c.cancel}</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '14px', backgroundColor: '#F0908A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? c.saving : c.save}</button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}
