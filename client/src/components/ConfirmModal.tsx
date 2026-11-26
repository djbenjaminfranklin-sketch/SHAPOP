import { getLang, tr, type Localized } from '../lib/i18n'

const defaultLabels: Localized<{ confirm: string; cancel: string }> = {
  en: { confirm: 'OK', cancel: 'Cancel' },
  fr: { confirm: 'OK', cancel: 'Annuler' },
  es: { confirm: 'Aceptar', cancel: 'Cancelar' },
  ru: { confirm: 'ОК', cancel: 'Отмена' },
  he: { confirm: 'אישור', cancel: 'ביטול' },
}

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  if (!open) return null
  const labels = tr(defaultLabels, getLang())

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#1A1A1A',
          borderRadius: '20px',
          border: '1px solid #2A2A2A',
          padding: '24px',
          width: '100%',
          maxWidth: '340px',
        }}
      >
        <h3 style={{
          textAlign: 'start',
          fontSize: 'calc(17px * var(--fs, 1))',
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 8px',
        }}>
          {title}
        </h3>

        <p style={{
          textAlign: 'start',
          fontSize: 'calc(14px * var(--fs, 1))',
          color: '#f0f0f0',
          lineHeight: 1.5,
          margin: '0 0 24px',
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: '#2A2A2A',
              border: 'none',
              color: '#f0f0f0',
              fontSize: 'calc(15px * var(--fs, 1))',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelLabel ?? labels.cancel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: danger ? '#E8344E' : '#00E5FF',
              border: 'none',
              color: danger ? '#fff' : '#001014',
              fontSize: 'calc(15px * var(--fs, 1))',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {confirmLabel ?? labels.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
