import { Component, type ReactNode } from 'react'
import { tr, type Localized } from '../lib/i18n'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

type ErrorText = { title: string; desc: string; technical: string; btn: string; backBtn: string }
const errorTexts: Localized<ErrorText> = {
  en: { title: 'Something went wrong', desc: 'An unexpected error occurred.', technical: 'A technical error occurred', btn: 'Refresh', backBtn: 'Back to home' },
  fr: { title: 'Oups, une erreur est survenue', desc: 'Une erreur inattendue s\'est produite.', technical: 'Une erreur technique est survenue', btn: 'Recharger', backBtn: 'Retour à l\'accueil' },
  es: { title: 'Algo salió mal', desc: 'Se produjo un error inesperado.', technical: 'Se produjo un error técnico', btn: 'Recargar', backBtn: 'Volver al inicio' },
  ru: { title: 'Что-то пошло не так', desc: 'Произошла непредвиденная ошибка.', technical: 'Произошла техническая ошибка', btn: 'Обновить', backBtn: 'На главную' },
  he: { title: 'משהו השתבש', desc: 'אירעה שגיאה בלתי צפויה.', technical: 'אירעה שגיאה טכנית', btn: 'רענון', backBtn: 'חזרה לדף הבית' },
}
const getErrorText = () => tr(errorTexts)

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
    this.setState({ errorInfo: errorInfo?.componentStack || null })

    try {
      import('@sentry/react').then((Sentry) => {
        Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo?.componentStack || '' } } })
      })
    } catch {
      // Sentry not available — ignore
    }
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    // Use history API to navigate without full reload (works on Capacitor)
    window.history.pushState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    // Fallback: if React router doesn't pick up the change, force reload
    setTimeout(() => {
      if (this.state.hasError) {
        window.location.replace('/')
      }
    }, 500)
  }

  handleRetry = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const t = getErrorText()
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: '#fff',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            backgroundColor: '#1A1A1A', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: '24px', fontSize: 'calc(28px * var(--fs, 1))',
          }}>
            !
          </div>
          <h1 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 700, marginBottom: '8px' }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#888', marginBottom: '12px', maxWidth: '300px' }}>
            {t.desc}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#E8344E', marginBottom: '12px', maxWidth: '320px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {this.state.error.message || String(this.state.error)}
            </p>
          )}
          {import.meta.env.DEV && this.state.errorInfo && (
            <p style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#666', marginBottom: '24px', maxWidth: '320px', wordBreak: 'break-all', fontFamily: 'monospace', textAlign: 'start', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
              {this.state.errorInfo}
            </p>
          )}
          {!import.meta.env.DEV && (
            <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#888', marginBottom: '24px', maxWidth: '320px' }}>
              {t.technical}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '12px 32px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                border: 'none', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t.btn}
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: '10px 24px', borderRadius: '12px',
                background: 'none', border: '1px solid #333',
                color: '#888', fontSize: 'calc(14px * var(--fs, 1))',
                fontWeight: 500, cursor: 'pointer',
              }}
            >
              {t.backBtn}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
