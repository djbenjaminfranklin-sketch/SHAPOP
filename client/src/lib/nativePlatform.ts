import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Share } from '@capacitor/share'
import { useEffect, useState } from 'react'

/**
 * Différences entre plateformes (web, iOS, Android) regroupées ici,
 * pour que les écrans n'aient pas à refaire les tests un par un.
 */

export type AppPlatform = 'ios' | 'android' | 'web'

export function getAppPlatform(): AppPlatform {
  const p = Capacitor.getPlatform()
  return p === 'ios' || p === 'android' ? p : 'web'
}

export const isIOSApp = () => getAppPlatform() === 'ios'
export const isAndroidApp = () => getAppPlatform() === 'android'

/** Plateforme envoyée au serveur avec le jeton de notification (APNs pour iOS, FCM pour Android). */
export function pushPlatform(): 'ios' | 'android' | null {
  const p = getAppPlatform()
  return p === 'web' ? null : p
}

// ---------------------------------------------------------------------------
// Notifications push
// ---------------------------------------------------------------------------

interface ShaPopNativePlugin {
  pushAvailable(): Promise<{ available: boolean }>
}
const ShaPopNative = registerPlugin<ShaPopNativePlugin>('ShaPopNative')

let pushAvailableCache: Promise<boolean> | null = null

/**
 * Les notifications push peuvent-elles marcher dans cette app ?
 * - iOS : oui (APNs).
 * - Android : seulement si l'app a été compilée avec google-services.json (Firebase).
 *   Sans lui, PushNotifications.register() ferait planter l'app : on ne demande rien.
 * - Web : non.
 */
export function isPushAvailable(): Promise<boolean> {
  if (!pushAvailableCache) {
    const platform = getAppPlatform()
    if (platform === 'ios') pushAvailableCache = Promise.resolve(true)
    else if (platform === 'android') {
      pushAvailableCache = ShaPopNative.pushAvailable()
        .then(r => r.available === true)
        .catch(() => false)
    } else pushAvailableCache = Promise.resolve(false)
  }
  return pushAvailableCache
}

/** Version React de isPushAvailable() (faux tant que la réponse n'est pas arrivée). */
export function usePushAvailable(): boolean {
  const [available, setAvailable] = useState(isIOSApp())
  useEffect(() => {
    let alive = true
    isPushAvailable().then(v => { if (alive) setAvailable(v) })
    return () => { alive = false }
  }, [])
  return available
}

// ---------------------------------------------------------------------------
// Android : barres système (heure, batterie, barre de navigation)
// ---------------------------------------------------------------------------

/**
 * L'app est en bord à bord sous Android 15+ : les icônes des barres système doivent
 * contraster avec la page. Thème clair (par défaut) → icônes foncées ; thème sombre → icônes claires.
 */
export function syncAndroidSystemBars(isLight: boolean) {
  if (!isAndroidApp()) return
  SystemBars.setStyle({ style: isLight ? SystemBarsStyle.Light : SystemBarsStyle.Dark }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Android : bouton retour et partage
// ---------------------------------------------------------------------------

/** Événement envoyé avant de revenir en arrière : un écran peut l'annuler (preventDefault) pour fermer une fenêtre ouverte. */
export const ANDROID_BACK_EVENT = 'shapop:android-back'

/**
 * Bouton / geste retour d'Android :
 * 1. un écran qui écoute ANDROID_BACK_EVENT peut le prendre (fermer une fenêtre) ;
 * 2. sinon on revient à l'écran précédent ;
 * 3. sur le premier écran, l'app passe en arrière-plan (comme les apps Android), sans être fermée.
 */
export function handleAndroidBack(canGoBack: boolean, deps: {
  dispatch: (e: Event) => boolean
  goBack: () => void
  minimize: () => void
}): 'handled' | 'back' | 'minimize' {
  const event = new Event(ANDROID_BACK_EVENT, { cancelable: true })
  const notCancelled = deps.dispatch(event)
  if (!notCancelled) return 'handled'
  if (canGoBack) {
    deps.goBack()
    return 'back'
  }
  deps.minimize()
  return 'minimize'
}

/**
 * La WebView Android n'a pas navigator.share : on le remplace par la feuille de partage
 * native (@capacitor/share). Les fichiers ne sont pas pris en charge (canShare({files}) = faux),
 * les écrans gardent donc leur solution de repli pour les fichiers.
 */
export function installAndroidSharePolyfill(nav: Navigator = navigator) {
  if (typeof nav.share === 'function') return
  const share = async (data?: ShareData) => {
    if (data?.files && data.files.length > 0) {
      throw new DOMException('Sharing files is not supported', 'NotAllowedError')
    }
    try {
      await Share.share({
        title: data?.title,
        text: data?.text,
        url: data?.url,
        dialogTitle: data?.title,
      })
    } catch (err) {
      // Partage annulé par l'utilisateur : même erreur que le navigateur
      throw new DOMException(err instanceof Error ? err.message : 'Share canceled', 'AbortError')
    }
  }
  const canShare = (data?: ShareData) => !(data?.files && data.files.length > 0)
  Object.defineProperty(nav, 'share', { value: share, configurable: true, writable: true })
  Object.defineProperty(nav, 'canShare', { value: canShare, configurable: true, writable: true })
}

let androidShellInstalled = false

/** À appeler une fois au démarrage : ne fait rien hors de l'app Android. */
export function initAndroidShell() {
  if (!isAndroidApp() || androidShellInstalled) return
  androidShellInstalled = true

  installAndroidSharePolyfill()

  CapApp.addListener('backButton', ({ canGoBack }) => {
    handleAndroidBack(canGoBack, {
      dispatch: e => window.dispatchEvent(e),
      goBack: () => window.history.back(),
      minimize: () => { CapApp.minimizeApp().catch(() => {}) },
    })
  }).catch(() => {})
}
