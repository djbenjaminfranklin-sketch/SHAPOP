import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

const getErrorText = () => {
  const lang = localStorage.getItem('shapop_lang') || 'fr'
  const texts: Record<string, { title: string; desc: string; btn: string }> = {
    fr: { title: 'Une erreur est survenue', desc: 'Une erreur inattendue s\'est produite. Veuillez rafraichir la page.', btn: 'Rafraichir' },
    en: { title: 'Something went wrong', desc: 'An unexpected error occurred. Please try refreshing the page.', btn: 'Refresh' },
    he: { title: 'משהו השתבש', desc: 'אירעה שגיאה בלתי צפויה. אנא רענן את הדף.', btn: 'רענן' },
    es: { title: 'Algo salio mal', desc: 'Ocurrio un error inesperado. Por favor, recarga la pagina.', btn: 'Recargar' },
  }
  return texts[lang] || texts.fr
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
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
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px', maxWidth: '300px' }}>
            {t.desc}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              border: 'none', color: '#fff', fontSize: '15px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t.btn}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
