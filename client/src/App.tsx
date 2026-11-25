import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { MiniPlayerProvider } from './contexts/MiniPlayerContext'
import MiniPlayerOverlay from './components/stream/MiniPlayerOverlay'
import { hapticTap } from './lib/haptics'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { usePushNotifications } from './hooks/usePushNotifications'
import { isPushAvailable, syncAndroidSystemBars } from './lib/nativePlatform'
import { startKeyboardInset } from './lib/keyboardInset'
import PrePermissionModal from './components/PrePermissionModal'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import BottomNav from './components/BottomNav'
import SplashScreen from './components/SplashScreen'
import ErrorBoundary from './components/ErrorBoundary'
import { getLang, getDir, t, tr, useLang, applyDocumentLang, type Localized } from './lib/i18n'

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Explore = lazy(() => import('./pages/Explore'))
const StreamView = lazy(() => import('./pages/StreamView'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const MapPage = lazy(() => import('./pages/MapPage'))
const ActivityPage = lazy(() => import('./pages/ActivityPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const EulaPage = lazy(() => import('./pages/EulaPage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const AccountStatusPage = lazy(() => import('./pages/AccountStatusPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const AddressesPage = lazy(() => import('./pages/AddressesPage'))
const PreferencesPage = lazy(() => import('./pages/PreferencesPage'))
const ReferralsPage = lazy(() => import('./pages/ReferralsPage'))
const CommunitiesPage = lazy(() => import('./pages/CommunitiesPage'))
const CommunityDetailPage = lazy(() => import('./pages/CommunityDetailPage'))
const AIListingPage = lazy(() => import('./pages/AIListingPage'))
const DirectSalesPage = lazy(() => import('./pages/DirectSalesPage'))
const ItemDetailPage = lazy(() => import('./pages/ItemDetailPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'))
const ChangeEmailPage = lazy(() => import('./pages/ChangeEmailPage'))
const SecurityPage = lazy(() => import('./pages/SecurityPage'))
const GoLivePage = lazy(() => import('./pages/GoLivePage'))
const PrepareLivePage = lazy(() => import('./pages/PrepareLivePage'))
const LiveSellerView = lazy(() => import('./pages/LiveSellerView'))
const LiveRecapPage = lazy(() => import('./pages/LiveRecapPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const DisputePage = lazy(() => import('./pages/DisputePage'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'))
const PayOrderPage = lazy(() => import('./pages/PayOrderPage'))
const PayoutsIsraelPage = lazy(() => import('./pages/PayoutsIsraelPage'))
const ConversationPage = lazy(() => import('./pages/ConversationPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const SellerProfilePage = lazy(() => import('./pages/SellerProfilePage'))
const VerificationPage = lazy(() => import('./pages/VerificationPage'))
const AccountControlsPage = lazy(() => import('./pages/AccountControlsPage'))
const TeamPage = lazy(() => import('./pages/TeamPage'))
const HandoverPage = lazy(() => import('./pages/HandoverPage'))
const CommunityGuidelinesPage = lazy(() => import('./pages/CommunityGuidelinesPage'))
const ReturnPolicyPage = lazy(() => import('./pages/ReturnPolicyPage'))
const CreateLiveWizard = lazy(() => import('./components/seller/CreateLiveWizard'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '100dvh', backgroundColor: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div
        role="status"
        aria-label={t(getLang(), 'loading')}
        style={{
          width: '32px', height: '32px', border: '3px solid #333',
          borderTopColor: '#E8344E', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

/** Route guard — redirects to /login if not authenticated */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Referral deep link redirect */
function RefRedirect() {
  const code = window.location.pathname.split('/ref/')[1] || ''
  if (code) localStorage.setItem('shapop_referral_code', code)
  return <Navigate to={`/register?ref=${code}`} replace />
}

const pushModalContent: Localized<{ title: string; desc: string; allow: string; skip: string }> = {
  en: { title: 'Stay in the loop', desc: 'Get notified about messages, orders and lives', allow: 'Turn on', skip: 'Later' },
  fr: { title: 'Reste informé', desc: 'Reçois une notification pour tes messages, tes commandes et les lives', allow: 'Activer', skip: 'Plus tard' },
  es: { title: 'Mantente al día', desc: 'Recibe avisos de mensajes, pedidos y directos', allow: 'Activar', skip: 'Más tarde' },
  ru: { title: 'Будь в курсе', desc: 'Получай уведомления о сообщениях, заказах и эфирах', allow: 'Включить', skip: 'Позже' },
  he: { title: 'הישאר/י מעודכן/ת', desc: 'קבל/י התראות על הודעות, הזמנות ושידורים חיים', allow: 'הפעלה', skip: 'אחר כך' },
}

/** Auto-register push token if user is logged in, with pre-permission modal */
function PushAutoRegister() {
  const { user } = useAuth()
  const { requestPermission } = usePushNotifications()
  const [showModal, setShowModal] = useState(false)
  const c = tr(pushModalContent)

  const doRequest = useCallback(() => {
    requestPermission()
  }, [requestPermission])

  useEffect(() => {
    if (!user) return
    if (!Capacitor.isNativePlatform()) return

    const alreadyShown = localStorage.getItem('shapop_push_prepermission_shown')
    if (alreadyShown) {
      doRequest()
      return
    }

    // Check current permission status (Android sans Firebase : pas de notifications, on ne demande rien)
    isPushAvailable().then(ok => ok ? PushNotifications.checkPermissions() : null).then(result => {
      if (!result) return
      if (result.receive === 'granted') {
        // Already granted, just re-register
        doRequest()
      } else if (result.receive === 'denied') {
        // User denied before, don't show anything
      } else {
        // Not determined — show pre-permission modal
        setShowModal(true)
      }
    }).catch(() => {})
  }, [user, doRequest])

  const handleAllow = () => {
    localStorage.setItem('shapop_push_prepermission_shown', '1')
    setShowModal(false)
    doRequest()
  }

  const handleSkip = () => {
    localStorage.setItem('shapop_push_prepermission_shown', '1')
    setShowModal(false)
  }

  return (
    <PrePermissionModal
      open={showModal}
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      }
      title={c.title}
      description={c.desc}
      allowLabel={c.allow}
      skipLabel={c.skip}
      onAllow={handleAllow}
      onSkip={handleSkip}
    />
  )
}

function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div
      role="alert"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        backgroundColor: '#1A1A1A', color: '#f59e0b',
        textAlign: 'center', padding: '8px 16px',
        fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
      }}
    >
      {t(getLang(), 'offline')}
    </div>
  )
}

/** Apply user settings (theme, text size) from localStorage */
function useAppSettings() {
  // Hauteur du clavier en CSS (--kb) : les champs de saisie des directs restent au-dessus du clavier
  useEffect(() => startKeyboardInset(), [])

  useEffect(() => {
    const applySettings = () => {
      try {
        const raw = localStorage.getItem('shapop_account_controls')
        const s = raw ? JSON.parse(raw) : {}

        // Theme — default to light mode when no preference is set
        const html = document.documentElement
        const appearance = s.appearance || 'light'
        const isLight = appearance === 'light' || (appearance === 'auto' && !window.matchMedia('(prefers-color-scheme: dark)').matches)

        // App Android : icônes des barres système lisibles sur le thème choisi
        syncAndroidSystemBars(isLight)

        // Manage the counter-inversion stylesheet for media elements
        let styleEl = document.getElementById('shapop-theme-fix') as HTMLStyleElement | null
        // Thème clair = inversion des couleurs de toute la page, appliquée par une classe sur <html>.
        // Les écrans de direct posent la classe « live-screen » : pas de filtre du tout chez eux
        // (sur iPhone, une vidéo en direct sous un filtre CSS ne remplit plus l'écran).
        html.style.filter = ''
        html.classList.toggle('theme-light', isLight)
        if (isLight) {
          html.style.backgroundColor = '#fff'
          if (!styleEl) {
            styleEl = document.createElement('style')
            styleEl.id = 'shapop-theme-fix'
            document.head.appendChild(styleEl)
          }
          styleEl.textContent = `
            html.theme-light:not(.live-screen) { filter: invert(1) hue-rotate(180deg); }
            html.theme-light.live-screen { background-color: #000 !important; }
            html.theme-light:not(.live-screen) video, html.theme-light:not(.live-screen) img, html.theme-light:not(.live-screen) canvas, html.theme-light:not(.live-screen) svg image { filter: invert(1) hue-rotate(180deg) !important; }
            html.theme-light:not(.live-screen) .no-theme-invert { filter: invert(1) hue-rotate(180deg) !important; }
            html.theme-light:not(.live-screen) .no-theme-invert video, html.theme-light:not(.live-screen) .no-theme-invert img, html.theme-light:not(.live-screen) .no-theme-invert canvas, html.theme-light:not(.live-screen) .no-theme-invert svg image { filter: none !important; }
          `
        } else {
          html.style.backgroundColor = '#0a0a0a'
          if (styleEl) styleEl.textContent = ''
        }

        // Text size
        // Toutes les tailles de texte de l'appli sont multipliées par --fs (Normal = 15 % plus grand qu'avant)
        const sizes: Record<string, string> = { small: '14px', normal: '16px', large: '18px' }
        const scales: Record<string, string> = { small: '1', normal: '1.15', large: '1.3' }
        html.style.fontSize = sizes[s.textSize] || '16px'
        html.style.setProperty('--fs', scales[s.textSize] || '1.15')
      } catch { /* ignore */ }
    }

    applySettings()

    // Listen for storage changes (from AccountControlsPage)
    window.addEventListener('storage', applySettings)

    // Also listen for custom event (same-tab updates)
    window.addEventListener('shapop-settings-changed', applySettings)

    // Auto theme listener
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = () => applySettings()
    mq.addEventListener('change', handleMediaChange)

    return () => {
      window.removeEventListener('storage', applySettings)
      window.removeEventListener('shapop-settings-changed', applySettings)
      mq.removeEventListener('change', handleMediaChange)
    }
  }, [])
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Skip splash for password reset links
    if (window.location.pathname === '/change-password') return false
    return !localStorage.getItem('shapop_splash_seen')
  })
  // Langue réactive : un changement redessine toute l'app (textes + sens de lecture)
  const lang = useLang()
  const dir = getDir(lang)
  useEffect(() => { applyDocumentLang(lang) }, [lang])

  useAppSettings()

  useEffect(() => {
    // Use touchstart (fires ~40ms before pointerdown on iOS) for instant feedback
    const handler = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      const tappable = target.closest('button, a, [role="button"]')
      if (tappable) {
        hapticTap()
        return
      }
      // Also trigger haptics for divs with onClick handlers (common pattern)
      const clickable = target.closest('[data-tap], div[style*="cursor"]')
      if (clickable || target.onclick || target.closest('[onclick]')) {
        hapticTap()
        // Add visual feedback class for non-button tappable elements
        const el = (clickable || target) as HTMLElement
        el.classList.add('tap-active')
        const cleanup = () => {
          el.classList.remove('tap-active')
          el.removeEventListener('touchend', cleanup)
          el.removeEventListener('touchcancel', cleanup)
        }
        el.addEventListener('touchend', cleanup, { passive: true })
        el.addEventListener('touchcancel', cleanup, { passive: true })
        // Safety timeout
        setTimeout(cleanup, 300)
      }
    }
    document.addEventListener('touchstart', handler, { passive: true })
    // Fallback for non-touch (dev/desktop)
    const pointerHandler = (e: Event) => {
      if (typeof TouchEvent !== 'undefined' && e instanceof TouchEvent) return // Already handled by touchstart
      const target = e.target as HTMLElement
      if (target.closest('button, a, [role="button"]')) {
        hapticTap()
      }
    }
    document.addEventListener('pointerdown', pointerHandler, { passive: true })
    return () => {
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('pointerdown', pointerHandler)
    }
  }, [])

  if (showSplash) {
    return <SplashScreen onFinish={() => { localStorage.setItem('shapop_splash_seen', '1'); setShowSplash(false) }} />
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <MiniPlayerProvider>
          <PushAutoRegister />
          <div key={lang} dir={dir} lang={lang} className="min-h-screen" style={{ overflowX: 'hidden', maxWidth: '100%', width: '100%', backgroundColor: '#0a0a0a', minHeight: '100dvh' }}>
            <a
              href="#main-content"
              style={{
                position: 'absolute', insetInlineStart: '-9999px', top: 'auto',
                width: '1px', height: '1px', overflow: 'hidden',
              }}
              onFocus={(e) => { e.currentTarget.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px;background:#F0908A;color:#000;text-align:center;font-weight:700;' }}
              onBlur={(e) => { e.currentTarget.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;' }}
            >
              {t(lang, 'skip_to_content')}
            </a>
            <OfflineBanner />
            <Suspense fallback={<PageLoader />}>
              <main id="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/ref/:code" element={<RefRedirect />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/stream/:id" element={<StreamView />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/eula" element={<EulaPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/account-status" element={<ProtectedRoute><AccountStatusPage /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
                <Route path="/addresses" element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />
                <Route path="/preferences" element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
                <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
                <Route path="/communities" element={<CommunitiesPage />} />
                <Route path="/community/:id" element={<CommunityDetailPage />} />
                <Route path="/ai-listing" element={<ProtectedRoute><AIListingPage /></ProtectedRoute>} />
                <Route path="/direct-sales" element={<ProtectedRoute><DirectSalesPage /></ProtectedRoute>} />
                <Route path="/item/:id" element={<ItemDetailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/change-email" element={<ProtectedRoute><ChangeEmailPage /></ProtectedRoute>} />
                <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
                <Route path="/go-live" element={<ProtectedRoute><GoLivePage /></ProtectedRoute>} />
                <Route path="/schedule-live" element={<ProtectedRoute><CreateLiveWizard /></ProtectedRoute>} />
                <Route path="/prepare-live/:streamId" element={<ProtectedRoute><PrepareLivePage /></ProtectedRoute>} />
                <Route path="/live-seller/:streamId" element={<ProtectedRoute><LiveSellerView /></ProtectedRoute>} />
                <Route path="/live-recap/:streamId" element={<ProtectedRoute><LiveRecapPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
                <Route path="/dispute/:orderId" element={<ProtectedRoute><DisputePage /></ProtectedRoute>} />
                <Route path="/order/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
                <Route path="/pay/:id" element={<ProtectedRoute><PayOrderPage /></ProtectedRoute>} />
                <Route path="/payouts-israel" element={<ProtectedRoute><PayoutsIsraelPage /></ProtectedRoute>} />
                {/* Les messages vivent dans l'onglet Messages de la page Activité (le menu des onglets reste affiché) */}
                <Route path="/messages" element={<Navigate to="/activity" state={{ tab: 'messages' }} replace />} />
                <Route path="/conversation/:id" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />
                <Route path="/seller/:id" element={<SellerProfilePage />} />
                <Route path="/verification" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
                <Route path="/account-controls" element={<ProtectedRoute><AccountControlsPage /></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
                <Route path="/to-hand-over" element={<ProtectedRoute><HandoverPage /></ProtectedRoute>} />
                <Route path="/shipments" element={<Navigate to="/to-hand-over" replace />} />
                <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
                <Route path="/return-policy" element={<ReturnPolicyPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </main>
            </Suspense>
            <MiniPlayerOverlay />
            <BottomNav />
          </div>
          </MiniPlayerProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
