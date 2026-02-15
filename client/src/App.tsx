import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import BottomNav from './components/BottomNav'
import SplashScreen from './components/SplashScreen'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Explore from './pages/Explore'
import StreamView from './pages/StreamView'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import MapPage from './pages/MapPage'
import ActivityPage from './pages/ActivityPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import EulaPage from './pages/EulaPage'
import FaqPage from './pages/FaqPage'
import ContactPage from './pages/ContactPage'
import AboutPage from './pages/AboutPage'
import NotificationsPage from './pages/NotificationsPage'
import AccountStatusPage from './pages/AccountStatusPage'
import PaymentsPage from './pages/PaymentsPage'
import AddressesPage from './pages/AddressesPage'
import PreferencesPage from './pages/PreferencesPage'
import ReferralsPage from './pages/ReferralsPage'
import CommunitiesPage from './pages/CommunitiesPage'
import CommunityDetailPage from './pages/CommunityDetailPage'
import AIListingPage from './pages/AIListingPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ChangeEmailPage from './pages/ChangeEmailPage'
import SecurityPage from './pages/SecurityPage'
import GoLivePage from './pages/GoLivePage'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-black">
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
          </Routes>
          <BottomNav />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
