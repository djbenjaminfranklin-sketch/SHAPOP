import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'
import { usePageTitle } from '../hooks/usePageTitle'

const texts = {
  fr: { title: 'Page introuvable', desc: 'La page que vous cherchez n\'existe pas.', btn: 'Retour a l\'accueil' },
  en: { title: 'Page not found', desc: 'The page you\'re looking for doesn\'t exist.', btn: 'Go Home' },
  he: { title: 'הדף לא נמצא', desc: 'הדף שאתה מחפש לא קיים.', btn: 'חזרה לדף הבית' },
  es: { title: 'Pagina no encontrada', desc: 'La pagina que buscas no existe.', btn: 'Volver al inicio' },
}

export default function NotFoundPage() {
  const navigate = useNavigate()
  const lang = getLang() as keyof typeof texts
  const t = texts[lang] || texts.fr
  usePageTitle(t.title)

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
      <div style={{ fontSize: '64px', fontWeight: 800, color: '#E8344E', marginBottom: '8px' }}>
        404
      </div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
        {t.title}
      </h1>
      <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
        {t.desc}
      </p>
      <button
        onClick={() => navigate('/')}
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
