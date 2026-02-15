import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '../types/database'
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  updateCity: (city: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (u: User) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single()
    if (data) {
      setProfile(data)
    } else {
      // Auto-create profile for OAuth users
      const meta = u.user_metadata || {}
      const name = meta.full_name || meta.name || u.email?.split('@')[0] || 'user'
      const username = (u.email?.split('@')[0] || `user_${u.id.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, '')
      const { data: newProfile } = await supabase.from('profiles').insert({
        id: u.id,
        username,
        display_name: name,
        avatar_url: meta.avatar_url || meta.picture || null,
      }).select().single()
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setProfile(null)
      }
    })

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
              } catch (err) {
                console.error('PKCE exchange error:', err)
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
              } catch (err) {
                console.error('Session set error:', err)
              }
            }
          }
          await Browser.close()
        }
      }).then(listener => {
        appUrlListener = listener
      })
    }

    return () => {
      subscription.unsubscribe()
      if (appUrlListener) appUrlListener.remove()
    }
  }, [])

  const signUp = async (email: string, password: string, username: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        display_name: displayName,
      })
      if (profileError) throw profileError
    }
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
  }

  const updateCity = async (city: string) => {
    if (!user) return
    const { error } = await supabase.from('profiles').update({ city }).eq('id', user.id)
    if (error) throw error
    setProfile(prev => prev ? { ...prev, city } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signInWithGoogle, signInWithApple, signOut, updateCity }}>
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
