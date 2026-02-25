import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { isNightModeActive } from '../lib/settings'

const PENDING_DEEPLINK_KEY = 'shapop_pending_deeplink'

/**
 * Registers push notifications on iOS, stores the device token via API.
 * Call `requestPermission()` to trigger the iOS permission prompt.
 *
 * On cold start, deep links from push notifications are stored in localStorage
 * and consumed once React Router is mounted.
 */
export function usePushNotifications() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const registeredRef = useRef(false)
  const pendingTokenRef = useRef<string | null>(null)
  const saveTokenRef = useRef<((token: string) => Promise<void>) | null>(null)
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  // Keep saveTokenRef always up-to-date with latest user/session
  saveTokenRef.current = async (token: string) => {
    if (!user || !session?.access_token) {
      pendingTokenRef.current = token
      return
    }
    pendingTokenRef.current = null
    try {
      const res = await apiFetch('/api/device-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          token,
          platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
        }),
      })
      if (res.ok) {
        if (import.meta.env.DEV) console.log('Device token registered successfully')
      } else {
        console.warn('Failed to register device token:', res.status)
      }
    } catch (err) {
      console.warn('Failed to register device token:', err)
    }
  }

  // Retry saving pending token when session becomes available
  useEffect(() => {
    if (pendingTokenRef.current && user && session?.access_token) {
      saveTokenRef.current?.(pendingTokenRef.current)
    }
  }, [user, session])

  // On mount, check for a pending deep link stored during cold start
  useEffect(() => {
    const pending = localStorage.getItem(PENDING_DEEPLINK_KEY)
    if (pending) {
      localStorage.removeItem(PENDING_DEEPLINK_KEY)
      setTimeout(() => {
        navigateRef.current(pending)
      }, 100)
    }
  }, [])

  // Clear badge count when app opens
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    PushNotifications.checkPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.removeAllDeliveredNotifications()
      }
    }).catch(() => {})
  }, [])

  // Set up listeners once
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || registeredRef.current) return
    registeredRef.current = true

    PushNotifications.addListener('registration', (token) => {
      if (import.meta.env.DEV) console.log('Push token received:', token.value.slice(0, 12) + '...')
      saveTokenRef.current?.(token.value)
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('Push registration error:', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      if (import.meta.env.DEV) console.log('Push received in foreground:', notification.title)
      if (isNightModeActive()) {
        PushNotifications.removeAllDeliveredNotifications()
        return
      }
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data
      let deepLink = ''
      if (data?.conversation_id) {
        deepLink = `/conversation/${data.conversation_id}`
      } else if (data?.stream_id) {
        deepLink = `/stream/${data.stream_id}`
      } else if (data?.order_id) {
        deepLink = `/orders`
      }
      if (deepLink) {
        // Store for cold start (router may not be mounted yet)
        localStorage.setItem(PENDING_DEEPLINK_KEY, deepLink)
        // Navigate immediately for warm start (app already open)
        navigateRef.current(deepLink)
      }
    })

    return () => {
      PushNotifications.removeAllListeners()
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false
    const result = await PushNotifications.requestPermissions()
    if (result.receive === 'granted') {
      await PushNotifications.register()
      return true
    }
    return false
  }, [])

  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false
    const result = await PushNotifications.checkPermissions()
    return result.receive === 'granted'
  }, [])

  return { requestPermission, checkPermission }
}
