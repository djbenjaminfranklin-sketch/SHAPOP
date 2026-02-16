import { useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Registers push notifications on iOS, stores the device token in Supabase.
 * Call `requestPermission()` to trigger the iOS permission prompt.
 */
export function usePushNotifications() {
  const { user } = useAuth()
  const registeredRef = useRef(false)

  // Store or update the device token in Supabase
  const saveToken = useCallback(async (token: string) => {
    if (!user) return
    const { data: existing } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('token', token)
      .maybeSingle()

    if (existing) return // Already registered

    await supabase.from('device_tokens').upsert({
      user_id: user.id,
      token,
      platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
    }, { onConflict: 'user_id,token' })
  }, [user])

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
