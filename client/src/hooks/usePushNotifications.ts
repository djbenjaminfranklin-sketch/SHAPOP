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

  // Store or update the device token via API server (bypasses RLS)
  const saveToken = useCallback(async (token: string) => {
    if (!user || !session?.access_token) return
    try {
      await apiFetch('/api/device-token', {
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
    } catch (err) {
      console.warn('Failed to register device token:', err)
    }
  }, [user, session])

  // Set up listeners once
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || registeredRef.current) return
    registeredRef.current = true

    // When registration succeeds, save the token
    PushNotifications.addListener('registration', (token) => {
      saveToken(token.value)
    })

    // Handle registration errors silently
    PushNotifications.addListener('registrationError', (err) => {
      console.warn('Push registration error:', err)
    })

    // Handle incoming notification while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground:', notification.title)
    })

    // Handle tap on notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data
      if (data?.stream_id) {
        // Navigate to stream — will be handled by the app router
        window.location.hash = `/stream/${data.stream_id}`
      }
    })

    return () => {
      PushNotifications.removeAllListeners()
    }
  }, [saveToken])

  // Request permission + register
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false

    const result = await PushNotifications.requestPermissions()
    if (result.receive === 'granted') {
      await PushNotifications.register()
      return true
    }
    return false
  }, [])

  // Check if permission is already granted
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false
    const result = await PushNotifications.checkPermissions()
    return result.receive === 'granted'
  }, [])

  return { requestPermission, checkPermission }
}
