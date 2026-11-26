import type { ReactNode } from 'react'

interface PrePermissionModalProps {
  open: boolean
  icon: ReactNode
  title: string
  description: string
  allowLabel: string
  skipLabel: string
  onAllow: () => void
  onSkip: () => void
}

export default function PrePermissionModal({
  open,
  icon,
  title,
  description,
  allowLabel,
  skipLabel,
  onAllow,
  onSkip,
}: PrePermissionModalProps) {
  if (!open) return null

  return (
    <div
      onClick={onSkip}
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
          textAlign: 'center',
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          {icon}
        </div>

        <h3 style={{
          fontSize: 'calc(17px * var(--fs, 1))',
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 8px',
        }}>
          {title}
        </h3>

        <p style={{
          fontSize: 'calc(14px * var(--fs, 1))',
          color: '#f0f0f0',
          lineHeight: 1.5,
          margin: '0 0 24px',
        }}>
          {description}
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onSkip}
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
            {skipLabel}
          </button>
          <button
            onClick={onAllow}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: '#00E5FF',
              border: 'none',
              color: '#001014',
              fontSize: 'calc(15px * var(--fs, 1))',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {allowLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
