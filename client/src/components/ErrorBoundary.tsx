import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

const getErrorText = () => {
  const lang = localStorage.getItem('shapop_lang') || 'fr'
  const texts: Record<string, { title: string; desc: string; btn: string; backBtn: string }> = {
    fr: { title: 'Une erreur est survenue', desc: 'Une erreur inattendue s\'est produite.', btn: 'Rafraichir', backBtn: 'Retour a l\'accueil' },
    en: { title: 'Something went wrong', desc: 'An unexpected error occurred.', btn: 'Refresh', backBtn: 'Back to home' },
    he: { title: 'משהו השתבש', desc: 'אירעה שגיאה בלתי צפויה.', btn: 'רענן', backBtn: 'חזרה לדף הבית' },
    es: { title: 'Algo salio mal', desc: 'Ocurrio un error inesperado.', btn: 'Recargar', backBtn: 'Volver al inicio' },
  }
  return texts[lang] || texts.fr
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(_error: Error, errorInfo: { componentStack?: string }) {
    // Capture the component stack to help identify which component caused the error
    const stack = errorInfo?.componentStack || ''
    this.setState({ errorInfo: stack })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    // Use history API to navigate without full reload (works on Capacitor)
    window.history.pushState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    // Fallback: if React router doesn't pick up the change, force reload
    setTimeout(() => {
      if (this.state.hasError) {
        window.location.href = '/'
      }
    }, 500)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
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
            marginBottom: '24px', fontSize: '28px',
          }}>
            !
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            {t.title}
          </h1>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '12px', maxWidth: '300px' }}>
            {t.desc}
          </p>
          {this.state.error && (
            <p style={{ fontSize: '11px', color: '#E8344E', marginBottom: '12px', maxWidth: '320px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {this.state.error.message || String(this.state.error)}
            </p>
          )}
          {this.state.errorInfo && (
            <p style={{ fontSize: '10px', color: '#666', marginBottom: '24px', maxWidth: '320px', wordBreak: 'break-all', fontFamily: 'monospace', textAlign: 'left', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
              {this.state.errorInfo}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '12px 32px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                border: 'none', color: '#fff', fontSize: '15px',
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
                color: '#888', fontSize: '14px',
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
