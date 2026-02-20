import { useCallback, useState } from 'react'

interface StreamSidebarProps {
  streamId: string
  onShare?: () => void
  onWalletClick?: () => void
  onMoreClick?: () => void
  onClipClick?: () => void
  onShopClick?: () => void
  onLikeClick?: () => void
  lang: 'fr' | 'en' | 'he' | 'es'
}

const translations: Record<string, Record<StreamSidebarProps['lang'], string>> = {
  like: { fr: 'J\'aime', en: 'Like', he: 'לייק', es: 'Me gusta' },
  share: { fr: 'Partager', en: 'Share', he: 'שתף', es: 'Compartir' },
  clip: { fr: 'Clip', en: 'Clip', he: 'קליפ', es: 'Clip' },
  shop: { fr: 'Boutique', en: 'Shop', he: 'חנות', es: 'Tienda' },
  wallet: { fr: 'Paiement', en: 'Payment', he: 'תשלום', es: 'Pago' },
  more: { fr: 'Plus', en: 'More', he: 'עוד', es: 'Más' },
}

const buttonStyle: React.CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '50%',
  backgroundColor: 'rgba(0,0,0,0.35)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
}

const labelStyle: React.CSSProperties = {
  fontSize: '9px',
  color: '#fff',
  fontWeight: 600,
  marginTop: '3px',
  textAlign: 'center',
  lineHeight: 1,
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
}

export default function StreamSidebar({ streamId, onShare, onWalletClick, onMoreClick, onClipClick, onShopClick, onLikeClick, lang }: StreamSidebarProps) {
  const t = useCallback((key: string) => translations[key]?.[lang] || key, [lang])
  const [liked, setLiked] = useState(false)

  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare()
      return
    }
    const url = `${window.location.origin}/stream/${streamId}`
    if (navigator.share) {
      try { await navigator.share({ url }) } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url) } catch { /* fail */ }
    }
  }, [onShare, streamId])

  const handleLike = useCallback(() => {
    setLiked(prev => !prev)
    onLikeClick?.()
  }, [onLikeClick])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      {/* Like / J'aime */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={buttonStyle} aria-label={t('like')} onClick={handleLike}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? '#E8344E' : 'none'} stroke={liked ? '#E8344E' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
        <span style={labelStyle}>{t('like')}</span>
      </div>

      {/* Share / Partager */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={buttonStyle} aria-label={t('share')} onClick={handleShare}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98" />
            <path d="M15.41 6.51l-6.82 3.98" />
          </svg>
        </button>
        <span style={labelStyle}>{t('share')}</span>
      </div>

      {/* Clip / Screenshot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={buttonStyle} aria-label={t('clip')} onClick={onClipClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>
        <span style={labelStyle}>{t('clip')}</span>
      </div>

      {/* Shop / Boutique */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={buttonStyle} aria-label={t('shop')} onClick={onShopClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
        </button>
        <span style={labelStyle}>{t('shop')}</span>
      </div>

      {/* Wallet / Paiement */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={buttonStyle} aria-label={t('wallet')} onClick={onWalletClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
            <path d="M16 14h2" />
            <path d="M22 6V5a2 2 0 00-2-2H6a2 2 0 00-2 2v1" />
          </svg>
        </button>
        <span style={labelStyle}>{t('wallet')}</span>
      </div>

      {/* More / Plus */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={buttonStyle} aria-label={t('more')} onClick={onMoreClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
        <span style={labelStyle}>{t('more')}</span>
      </div>
    </div>
  )
}
