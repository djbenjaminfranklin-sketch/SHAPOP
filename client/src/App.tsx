import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { hapticTap } from './lib/haptics'
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
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'))
const ChangeEmailPage = lazy(() => import('./pages/ChangeEmailPage'))
const SecurityPage = lazy(() => import('./pages/SecurityPage'))
const GoLivePage = lazy(() => import('./pages/GoLivePage'))
const PrepareLivePage = lazy(() => import('./pages/PrepareLivePage'))
const LiveSellerView = lazy(() => import('./pages/LiveSellerView'))
const LiveRecapPage = lazy(() => import('./pages/LiveRecapPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

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

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest('button, a, [role="button"]')) {
        hapticTap()
      }
    }
    document.addEventListener('pointerdown', handler, { passive: true })
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
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
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/change-email" element={<ChangeEmailPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/go-live" element={<GoLivePage />} />
                <Route path="/prepare-live/:streamId" element={<PrepareLivePage />} />
                <Route path="/live-seller/:streamId" element={<LiveSellerView />} />
                <Route path="/live-recap/:streamId" element={<LiveRecapPage />} />
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
