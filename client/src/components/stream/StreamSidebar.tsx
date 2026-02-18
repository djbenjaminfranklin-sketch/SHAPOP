import { useCallback } from 'react'

interface StreamSidebarProps {
  streamId: string
  itemCount?: number
  onShare?: () => void
  onShopClick?: () => void
  lang: 'fr' | 'en' | 'he' | 'es'
}

const translations: Record<string, Record<StreamSidebarProps['lang'], string>> = {
  more: { fr: 'Plus', en: 'More', he: '\u05E2\u05D5\u05D3', es: 'M\u00E1s' },
  clip: { fr: 'Clip', en: 'Clip', he: '\u05E7\u05DC\u05D9\u05E4', es: 'Clip' },
  share: { fr: 'Partager', en: 'Share', he: '\u05E9\u05EA\u05E3', es: 'Compartir' },
  wallet: { fr: 'Portefeuille', en: 'Wallet', he: '\u05D0\u05E8\u05E0\u05E7', es: 'Cartera' },
  shop: { fr: 'Boutique', en: 'Shop', he: '\u05D7\u05E0\u05D5\u05EA', es: 'Tienda' },
}

const buttonStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  backgroundColor: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#fff',
  fontWeight: 600,
  marginTop: '4px',
  textAlign: 'center',
  lineHeight: 1,
}

const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-4px',
  right: '-4px',
  minWidth: '18px',
  height: '18px',
  borderRadius: '9px',
  backgroundColor: '#E8344E',
  color: '#fff',
  fontSize: '10px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 4px',
  lineHeight: 1,
}

export default function StreamSidebar({ streamId, itemCount, onShare, onShopClick, lang }: StreamSidebarProps) {
  const t = useCallback((key: string) => translations[key]?.[lang] || key, [lang])

  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare()
      return
    }

    const url = `${window.location.origin}/stream/${streamId}`

    if (navigator.share) {
      try {
        await navigator.share({ url })
      } catch {
        // User cancelled or share failed — silently ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        // Clipboard write failed — silently ignore
      }
    }
  }, [onShare, streamId])

  const handleShop = useCallback(() => {
    if (onShopClick) {
      onShopClick()
    }
  }, [onShopClick])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {/* More / Plus */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={buttonStyle} aria-label={t('more')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
        <span style={labelStyle}>{t('more')}</span>
      </div>

      {/* Clip */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={buttonStyle} aria-label={t('clip')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16v16H4z" />
            <path d="M4 4l6 6" />
            <path d="M14 4l6 6" />
            <path d="M4 10h16" />
          </svg>
        </button>
        <span style={labelStyle}>{t('clip')}</span>
      </div>

      {/* Share / Partager */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <button style={buttonStyle} aria-label={t('share')} onClick={handleShare}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98" />
              <path d="M15.41 6.51l-6.82 3.98" />
            </svg>
          </button>
        </div>
        <span style={labelStyle}>{t('share')}</span>
      </div>

      {/* Wallet / Portefeuille */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={buttonStyle} aria-label={t('wallet')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
            <path d="M16 14h2" />
            <path d="M22 6V5a2 2 0 00-2-2H6a2 2 0 00-2 2v1" />
          </svg>
        </button>
        <span style={labelStyle}>{t('wallet')}</span>
      </div>

      {/* Shop / Boutique */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <button style={buttonStyle} aria-label={t('shop')} onClick={handleShop}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </button>
          {itemCount != null && itemCount > 0 && (
            <span style={badgeStyle}>{itemCount}</span>
          )}
        </div>
        <span style={labelStyle}>{t('shop')}</span>
      </div>
    </div>
  )
}
