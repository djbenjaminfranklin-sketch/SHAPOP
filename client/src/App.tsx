import { useState, useEffect, lazy, Suspense, useMemo } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { hapticTap } from './lib/haptics'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import BottomNav from './components/BottomNav'
import HomeButton from './components/HomeButton'
import SplashScreen from './components/SplashScreen'
import ErrorBoundary from './components/ErrorBoundary'

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
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const ConversationPage = lazy(() => import('./pages/ConversationPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const SellerProfilePage = lazy(() => import('./pages/SellerProfilePage'))
const VerificationPage = lazy(() => import('./pages/VerificationPage'))
const AccountControlsPage = lazy(() => import('./pages/AccountControlsPage'))
const CreateLiveWizard = lazy(() => import('./components/seller/CreateLiveWizard'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div
        role="status"
        aria-label="Loading page"
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

/** Auto-register push token if user is logged in */
function PushAutoRegister() {
  const { user } = useAuth()
  const { requestPermission } = usePushNotifications()
  useEffect(() => {
    if (!user) return
    // Request permission (shows prompt if not yet granted, then registers for push)
    requestPermission()
  }, [user, requestPermission])
  return null
}

function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  const lang = localStorage.getItem('shapop_lang') || 'fr'
  const msg: Record<string, string> = {
    fr: 'Pas de connexion internet',
    en: 'No internet connection',
    he: '\u05D0\u05D9\u05DF \u05D7\u05D9\u05D1\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E0\u05D8\u05E8\u05E0\u05D8',
    es: 'Sin conexion a internet',
  }
  return (
    <div
      role="alert"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        backgroundColor: '#1A1A1A', color: '#f59e0b',
        textAlign: 'center', padding: '8px 16px',
        fontSize: '14px', fontWeight: 600,
      }}
    >
      {msg[lang] || msg.fr}
    </div>
  )
}

/** Apply user settings (theme, text size) from localStorage */
function useAppSettings() {
  useEffect(() => {
    const applySettings = () => {
      try {
        const raw = localStorage.getItem('shapop_account_controls')
        if (!raw) return
        const s = JSON.parse(raw)

        // Theme
        const html = document.documentElement
        if (s.appearance === 'light') {
          html.style.filter = 'invert(1) hue-rotate(180deg)'
          html.style.backgroundColor = '#fff'
        } else if (s.appearance === 'auto') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          html.style.filter = prefersDark ? '' : 'invert(1) hue-rotate(180deg)'
          html.style.backgroundColor = prefersDark ? '' : '#fff'
        } else {
          html.style.filter = ''
          html.style.backgroundColor = ''
        }

        // Text size
        const sizes: Record<string, string> = { small: '14px', normal: '16px', large: '18px' }
        html.style.fontSize = sizes[s.textSize] || '16px'
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
  const [showSplash, setShowSplash] = useState(true)
  const lang = useMemo(() => localStorage.getItem('shapop_lang') || 'fr', [])
  const dir = lang === 'he' ? 'rtl' : 'ltr'

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
      if (e instanceof TouchEvent) return // Already handled by touchstart
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
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PushAutoRegister />
          <div dir={dir} className="min-h-screen bg-black" style={{ overflowX: 'hidden', maxWidth: '100vw', width: '100%' }}>
            <a
              href="#main-content"
              style={{
                position: 'absolute', left: '-9999px', top: 'auto',
                width: '1px', height: '1px', overflow: 'hidden',
              }}
              onFocus={(e) => { e.currentTarget.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px;background:#F0908A;color:#000;text-align:center;font-weight:700;' }}
              onBlur={(e) => { e.currentTarget.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;' }}
            >
              Skip to content
            </a>
            <OfflineBanner />
            <HomeButton />
            <Suspense fallback={<PageLoader />}>
              <main id="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/stream/:id" element={<StreamView />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/eula" element={<EulaPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/account-status" element={<AccountStatusPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/addresses" element={<AddressesPage />} />
                <Route path="/preferences" element={<PreferencesPage />} />
                <Route path="/referrals" element={<ReferralsPage />} />
                <Route path="/communities" element={<CommunitiesPage />} />
                <Route path="/community/:id" element={<CommunityDetailPage />} />
                <Route path="/ai-listing" element={<AIListingPage />} />
                <Route path="/direct-sales" element={<DirectSalesPage />} />
                <Route path="/item/:id" element={<ItemDetailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/change-email" element={<ChangeEmailPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/go-live" element={<GoLivePage />} />
                <Route path="/schedule-live" element={<CreateLiveWizard />} />
                <Route path="/prepare-live/:streamId" element={<PrepareLivePage />} />
                <Route path="/live-seller/:streamId" element={<LiveSellerView />} />
                <Route path="/live-recap/:streamId" element={<LiveRecapPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/dispute/:orderId" element={<DisputePage />} />
                <Route path="/order/:id" element={<OrderDetailPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/conversation/:id" element={<ConversationPage />} />
                <Route path="/seller/:id" element={<SellerProfilePage />} />
                <Route path="/verification" element={<VerificationPage />} />
                <Route path="/account-controls" element={<AccountControlsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </main>
            </Suspense>
            <BottomNav />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
