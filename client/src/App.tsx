import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { hapticTap } from './lib/haptics'
import { usePushNotifications } from './hooks/usePushNotifications'
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
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const ConversationPage = lazy(() => import('./pages/ConversationPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const CreateLiveWizard = lazy(() => import('./components/seller/CreateLiveWizard'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '32px', height: '32px', border: '3px solid #333',
        borderTopColor: '#E8344E', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

/** Auto-register push token if user is logged in and permission was already granted */
function PushAutoRegister() {
  const { user } = useAuth()
  const { checkPermission, requestPermission } = usePushNotifications()
  useEffect(() => {
    if (!user) return
    // If permission was already granted, re-register (ensures token is current)
    checkPermission().then(granted => {
      if (granted) requestPermission()
    })
  }, [user, checkPermission, requestPermission])
  return null
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

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
          <div className="min-h-screen bg-black" style={{ overflowX: 'hidden', maxWidth: '100vw', width: '100%' }}>
            <HomeButton />
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/conversation/:id" element={<ConversationPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <BottomNav />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
