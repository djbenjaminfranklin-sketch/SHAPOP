import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '../types/database'
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { cacheSet, cacheGet, cacheClearAll } from '../lib/cache'
import { getLang } from '../lib/i18n'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, username: string, displayName: string, phone?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  updateCity: (city: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (u: User) => {
    // Load cached profile instantly while fetching fresh data
    const cached = cacheGet<Profile>('profile_' + u.id)
    if (cached && !profile) {
      setProfile(cached)
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single()
    if (data) {
      // Check if user is banned — force sign out
      if ((data as Record<string, unknown>).is_banned) {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setProfile(null)
        const bannedMsgs = { fr: 'Votre compte a ete banni.', en: 'Your account has been banned.', he: 'החשבון שלך נחסם.', es: 'Tu cuenta ha sido suspendida.' }
        alert(bannedMsgs[getLang()] || bannedMsgs.fr)
        return
      }
      setProfile(data)
      cacheSet('profile_' + u.id, data)
    } else {
      // Auto-create profile (OAuth users or email signUp after confirmation)
      const meta = u.user_metadata || {}
      const name = meta.display_name || meta.full_name || meta.name || u.email?.split('@')[0] || 'user'
      const username = meta.username || (u.email?.split('@')[0] || `user_${u.id.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, '')
      const { data: newProfile, error: insertError } = await supabase.from('profiles').insert({
        id: u.id,
        username,
        display_name: name,
        avatar_url: meta.avatar_url || meta.picture || null,
      }).select().single()
      if (insertError) console.error('Failed to create profile:', insertError)
      setProfile(newProfile)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setProfile(null)
        // Clear app data on logout
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('shapop_'))
        keysToRemove.forEach(k => localStorage.removeItem(k))
      }
      // When user confirms email change, refresh user data from server
      if (event === 'USER_UPDATED' && session?.user) {
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) setUser(data.user)
        })
      }
    })

    // Refresh user data when app resumes from background (e.g. after email confirm)
    let appResumeListener: { remove: () => void } | undefined
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          const { data } = await supabase.auth.getUser()
          if (data.user) setUser(data.user)
        }
      }).then(listener => {
        appResumeListener = listener
      })
    }

    // Listen for OAuth deep link callback on native platforms
    let appUrlListener: { remove: () => void } | undefined
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (url.includes('login-callback')) {
          // Check for PKCE code in query params
          const queryPart = url.split('?')[1]?.split('#')[0]
          if (queryPart) {
            const qParams = new URLSearchParams(queryPart)
            const code = qParams.get('code')
            if (code) {
              try {
                await supabase.auth.exchangeCodeForSession(code)
              } catch {
                // PKCE exchange failed silently
              }
              await Browser.close()
              return
            }
          }

          // Implicit flow: tokens in hash fragment
          const hashPart = url.split('#')[1]
          if (hashPart) {
            const params = new URLSearchParams(hashPart)
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            if (accessToken && refreshToken) {
              try {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                })
              } catch {
                // Session restoration failed silently
              }
            }
          }
          await Browser.close()
        } else if (url.includes('reset-callback')) {
          // Password reset deep link — extract tokens, set session, navigate to change password
          const hashPart = url.split('#')[1]
          if (hashPart) {
            const params = new URLSearchParams(hashPart)
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            if (accessToken && refreshToken) {
              try {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                })
              } catch {
                // Session restoration failed
              }
            }
          }
          window.location.hash = ''
          window.location.href = '/change-password'
        } else if (url.includes('/payments')) {
          // Stripe Connect return — just close the browser, PaymentsPage will refetch
          await Browser.close()
        }
      }).then(listener => {
        appUrlListener = listener
      })
    }

    return () => {
      subscription.unsubscribe()
      if (appResumeListener) appResumeListener.remove()
      if (appUrlListener) appUrlListener.remove()
    }
  }, [])

  const signUp = async (email: string, password: string, username: string, displayName: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName },
      },
    })
    if (error) throw error
    // If session exists (email confirmation disabled), create profile and set state immediately
    if (data.session && data.user) {
      // Set auth state immediately — don't wait for onAuthStateChange
      setSession(data.session)
      setUser(data.user)

      const profileData: Record<string, unknown> = {
        id: data.user.id,
        username,
        display_name: displayName,
      }
      if (phone) {
        profileData.phone_number = phone
        profileData.phone_verified = true
      }

      const { data: newProfile, error: profileError } = await supabase.from('profiles').insert(profileData).select().single()
      if (profileError) throw profileError
      if (newProfile) setProfile(newProfile)
    }
    // If no session (email confirmation required), profile will be created on first login via fetchProfile
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signInWithOAuthNative = async (provider: 'google' | 'apple') => {
    if (Capacitor.isNativePlatform()) {
      const redirectTo = 'com.shapop.app://login-callback'
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })
      if (error) throw error
      if (data.url) {
        await Browser.open({ url: data.url })
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    }
  }

  const signInWithGoogle = async () => {
    await signInWithOAuthNative('google')
  }

  const signInWithApple = async () => {
    await signInWithOAuthNative('apple')
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // Clear app data from localStorage (keep preferences so modal doesn't re-show)
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('shapop_') && k !== 'shapop_preferences')
    keysToRemove.forEach(k => localStorage.removeItem(k))
    cacheClearAll()
  }

  const updateCity = async (city: string) => {
    if (!user) return
    const { error } = await supabase.from('profiles').update({ city }).eq('id', user.id)
    if (error) throw error
    setProfile(prev => prev ? { ...prev, city } : prev)
  }

  const refreshUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setUser(data.user)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signInWithGoogle, signInWithApple, signOut, updateCity, refreshUser }}>
      {children}
    </AuthContext.Provider>

  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
