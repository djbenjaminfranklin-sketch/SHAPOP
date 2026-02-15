import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()

  return (
    <nav className="bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src="/logo.png" alt="ShaPop" className="h-9" />
        </Link>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-sm mx-8">
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full px-4 py-2 bg-surface-3 border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        {/* Nav */}
        <div className="flex items-center gap-3">
          <Link
            to="/explore"
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            Explorer
          </Link>

          {user ? (
            <>
              {profile?.is_seller && (
                <Link
                  to="/dashboard"
                  className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
              )}
              <Link to="/profile" className="flex items-center gap-2 ml-2">
                <div className="w-8 h-8 bg-accent/20 border border-accent/30 rounded-lg flex items-center justify-center text-accent font-semibold text-sm">
                  {profile?.display_name?.charAt(0).toUpperCase() || '?'}
                </div>
              </Link>
              <button
                onClick={signOut}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Sortir
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                to="/login"
                className="px-4 py-2 text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold transition-colors"
              >
                S'inscrire
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
