import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  })
} else if (import.meta.env.PROD) {
  console.warn('[sentry] VITE_SENTRY_DSN is not set — error monitoring is disabled in production')
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyDocumentLang } from './lib/i18n'
import { initAndroidShell } from './lib/nativePlatform'
import { Capacitor } from '@capacitor/core'

// Langue + sens de lecture posés sur <html> avant le premier affichage
applyDocumentLang()

// App Android : bouton retour système et partage natif
initAndroidShell()

// Service worker (hors ligne) : site web uniquement. Dans l'app (iOS/Android), les fichiers
// sont déjà dans le paquet ; on retire un éventuel ancien service worker.
if (Capacitor.isNativePlatform()) {
  navigator.serviceWorker?.getRegistrations()
    .then(regs => regs.forEach(r => r.unregister()))
    .catch(() => {})
} else {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
