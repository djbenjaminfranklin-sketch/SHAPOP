import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { usePageTitle } from '../hooks/usePageTitle'
import PageBackButton from '../components/PageBackButton'

const texts: Localized<{ title: string; desc: string; btn: string }> = {
  en: { title: 'Page not found', desc: 'The page you\'re looking for doesn\'t exist.', btn: 'Back to home' },
  fr: { title: 'Page introuvable', desc: 'La page que tu cherches n\'existe pas.', btn: 'Retour à l\'accueil' },
  es: { title: 'Página no encontrada', desc: 'La página que buscas no existe.', btn: 'Volver al inicio' },
  ru: { title: 'Страница не найдена', desc: 'Страницы, которую ты ищешь, не существует.', btn: 'На главную' },
  he: { title: 'הדף לא נמצא', desc: 'הדף שחיפשת לא קיים.', btn: 'חזרה לדף הבית' },
}

export default function NotFoundPage() {
  const navigate = useNavigate()
  const t = tr(texts)
  usePageTitle(t.title)

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
    }}>
      <PageBackButton />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 'calc(64px * var(--fs, 1))', fontWeight: 800, color: '#E8344E', marginBottom: '8px' }}>
          404
        </div>
        <h1 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 700, marginBottom: '8px' }}>
          {t.title}
        </h1>
        <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#888', marginBottom: '24px' }}>
          {t.desc}
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 32px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            border: 'none', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t.btn}
        </button>
      </div>
    </div>
  )
}
