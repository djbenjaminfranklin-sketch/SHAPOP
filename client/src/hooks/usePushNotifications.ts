import { useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'

/**
 * Registers push notifications on iOS, stores the device token via API.
 * Call `requestPermission()` to trigger the iOS permission prompt.
 */
export function usePushNotifications() {
  const { user, session } = useAuth()
  const registeredRef = useRef(false)
  const pendingTokenRef = useRef<string | null>(null)
  const saveTokenRef = useRef<((token: string) => Promise<void>) | null>(null)

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
        console.log('Device token registered successfully')
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

  // Set up listeners once
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || registeredRef.current) return
    registeredRef.current = true

    PushNotifications.addListener('registration', (token) => {
      console.log('Push token received:', token.value.slice(0, 12) + '...')
      // Use ref so we always call the latest version with current user/session
      saveTokenRef.current?.(token.value)
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('Push registration error:', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground:', notification.title)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data
      if (data?.stream_id) {
        window.location.hash = `/stream/${data.stream_id}`
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
