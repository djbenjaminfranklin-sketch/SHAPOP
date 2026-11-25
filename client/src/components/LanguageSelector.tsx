// Sélecteur de langue : petit drapeau + nom de la langue dans sa propre langue.
// Le choix s'applique tout de suite (textes, sens de lecture) et est mémorisé.
import { useEffect, useRef, useState } from 'react'
import { LANGS, LANG_META, setLang, useLang, t, type Lang } from '../lib/i18n'

interface Props {
  /** 'list' : liste complète (réglages) ; 'compact' : bouton drapeau + menu (connexion, accueil). */
  variant?: 'list' | 'compact'
  onChange?: (lang: Lang) => void
}

export default function LanguageSelector({ variant = 'compact', onChange }: Props) {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close, { passive: true })
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  const choose = (code: Lang) => {
    setOpen(false)
    if (code !== lang) {
      setLang(code)
      onChange?.(code)
    }
  }

  const option = (code: Lang, inList: boolean) => {
    const active = code === lang
    return (
      <button
        key={code}
        type="button"
        role={inList ? 'radio' : 'menuitemradio'}
        aria-checked={active}
        lang={code}
        dir={code === 'he' ? 'rtl' : 'ltr'}
        data-testid={`lang-option-${code}`}
        onClick={() => choose(code)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
          padding: inList ? '14px 16px' : '11px 16px',
          background: active && inList ? 'rgba(240,144,138,0.12)' : 'transparent',
          border: inList ? `1px solid ${active ? '#F0908A' : '#2A2A2A'}` : 'none',
          borderRadius: inList ? '12px' : 0,
          color: active ? '#F0908A' : '#E5E5E5', fontSize: 'calc(15px * var(--fs, 1))',
          fontWeight: active ? 700 : 500, cursor: 'pointer', textAlign: 'start',
        }}
      >
        <span aria-hidden="true" className="no-theme-invert" style={{ fontSize: 'calc(20px * var(--fs, 1))', lineHeight: 1 }}>{LANG_META[code].flag}</span>
        <span style={{ flex: 1 }}>{LANG_META[code].name}</span>
        {active && <span aria-hidden="true">✓</span>}
      </button>
    )
  }

  if (variant === 'list') {
    return (
      <div role="radiogroup" aria-label={t(lang, 'language')} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {LANGS.map(code => option(code, true))}
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t(lang, 'language')} : ${LANG_META[lang].name}`}
        data-testid="lang-selector"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          height: '34px', padding: '0 12px', borderRadius: '17px',
          backgroundColor: '#1C1C1E', border: '1px solid #2A2A2A',
          color: '#E5E5E5', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden="true" className="no-theme-invert" style={{ fontSize: 'calc(16px * var(--fs, 1))', lineHeight: 1 }}>{LANG_META[lang].flag}</span>
        <span>{LANG_META[lang].name}</span>
        <span aria-hidden="true" style={{ fontSize: 'calc(10px * var(--fs, 1))', opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', insetInlineEnd: 0,
            backgroundColor: '#1C1C1E', borderRadius: '14px', padding: '6px 0',
            zIndex: 1000, minWidth: '170px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            border: '1px solid #2A2A2A',
          }}
        >
          {LANGS.map(code => option(code, false))}
        </div>
      )}
    </div>
  )
}
