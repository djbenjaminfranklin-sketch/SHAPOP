import crypto from 'crypto'

// =============================================
// Notifications push : choix APNs (iPhone) / FCM (Android) et envoi FCM HTTP v1
// =============================================
//
// FCM n'est activé que si les deux variables existent :
//   FCM_PROJECT_ID            identifiant du projet Firebase (ex. « shapop-12345 »)
//   FCM_SERVICE_ACCOUNT_JSON  clé JSON du compte de service (texte JSON brut, ou encodé en base64)
// Sans elles, les jetons Android sont simplement ignorés (aucune erreur).

export type PushChannel = 'apns' | 'fcm'

export interface PushDevice {
  token: string
  platform?: string | null
}

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, string>
}

/** Canal Android créé par l'app (MainActivity) : son nom est traduit dans la langue du téléphone. */
export const ANDROID_CHANNEL_ID = 'shapop_default'

/** Jeton APNs : 64 caractères hexadécimaux. Les jetons FCM sont plus longs et contiennent « : ». */
const APNS_TOKEN_RE = /^[0-9a-f]{64}$/i

/**
 * Par quel service envoyer la notification à cet appareil ?
 * - plateforme « android » → FCM ; « ios » → APNs ;
 * - plateforme inconnue (anciennes lignes) → d'après la forme du jeton ;
 * - « web » / jetons « prefs-… » (lignes de préférences) → rien ;
 * - null si le service n'est pas configuré sur ce serveur.
 */
export function choosePushChannel(
  device: PushDevice,
  enabled: { apns: boolean; fcm: boolean },
): PushChannel | null {
  const platform = (device.platform || '').toLowerCase()
  // Lignes « prefs-<user> » (plateforme « web ») : simples préférences, pas un appareil
  if (!device.token || platform === 'web' || device.token.startsWith('prefs-')) return null
  let channel: PushChannel
  if (platform === 'android') channel = 'fcm'
  else if (platform === 'ios') channel = 'apns'
  else channel = APNS_TOKEN_RE.test(device.token) ? 'apns' : 'fcm'
  if (channel === 'apns' && !enabled.apns) return null
  if (channel === 'fcm' && !enabled.fcm) return null
  return channel
}

// ---------------------------------------------
// Configuration FCM
// ---------------------------------------------

export interface FcmConfig {
  projectId: string
  clientEmail: string
  privateKey: string
  tokenUri: string
}

/** Lit FCM_PROJECT_ID / FCM_SERVICE_ACCOUNT_JSON. Renvoie null si absent ou invalide. */
export function readFcmConfig(env: Record<string, string | undefined> = process.env): FcmConfig | null {
  const projectId = (env.FCM_PROJECT_ID || '').trim()
  const rawJson = (env.FCM_SERVICE_ACCOUNT_JSON || '').trim()
  if (!projectId || !rawJson) return null
  let parsed: Record<string, unknown>
  try {
    const text = rawJson.startsWith('{') ? rawJson : Buffer.from(rawJson, 'base64').toString('utf8')
    parsed = JSON.parse(text)
  } catch {
    console.warn('[fcm] FCM_SERVICE_ACCOUNT_JSON illisible (ni JSON, ni base64 de JSON) : FCM désactivé')
    return null
  }
  const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email : ''
  let privateKey = typeof parsed.private_key === 'string' ? parsed.private_key : ''
  // Clé collée dans une variable d'environnement : les retours à la ligne arrivent souvent en « \n »
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n')
  if (!clientEmail || !privateKey.includes('PRIVATE KEY')) {
    console.warn('[fcm] client_email ou private_key manquant dans FCM_SERVICE_ACCOUNT_JSON : FCM désactivé')
    return null
  }
  const tokenUri = typeof parsed.token_uri === 'string' && parsed.token_uri.startsWith('https://')
    ? parsed.token_uri
    : 'https://oauth2.googleapis.com/token'
  return { projectId, clientEmail, privateKey, tokenUri }
}

// ---------------------------------------------
// Jeton d'accès OAuth (compte de service → Google)
// ---------------------------------------------

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

/** JWT signé RS256 échangé contre un jeton d'accès Google (valable 1 h). */
export function buildServiceAccountJwt(cfg: FcmConfig, nowSec = Math.floor(Date.now() / 1000)): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: cfg.clientEmail,
    scope: FCM_SCOPE,
    aud: cfg.tokenUri,
    iat: nowSec,
    exp: nowSec + 3600,
  })).toString('base64url')
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  const signature = signer.sign(cfg.privateKey, 'base64url')
  return `${header}.${payload}.${signature}`
}

type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
  text(): Promise<string>
}>

let cachedAccessToken: { token: string; expiresAt: number } | null = null

/** Pour les tests : oublie le jeton d'accès en cache. */
export function resetFcmAccessTokenCache() { cachedAccessToken = null }

export async function getFcmAccessToken(cfg: FcmConfig, fetchImpl: FetchLike = fetch as unknown as FetchLike): Promise<string | null> {
  const now = Date.now()
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60_000 > now) return cachedAccessToken.token
  const assertion = buildServiceAccountJwt(cfg, Math.floor(now / 1000))
  const res = await fetchImpl(cfg.tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  })
  if (!res.ok) {
    console.warn(`[fcm] Échec du jeton d'accès Google (${res.status}) : ${(await res.text()).slice(0, 200)}`)
    return null
  }
  const data = await res.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) return null
  cachedAccessToken = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) * 1000 }
  return data.access_token
}

// ---------------------------------------------
// Message et envoi FCM HTTP v1
// ---------------------------------------------

/** Corps de la requête FCM v1 : notification affichée par Android + données pour le lien profond. */
export function buildFcmMessage(token: string, msg: PushMessage) {
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(msg.data || {})) {
    if (v !== undefined && v !== null) data[k] = String(v)
  }
  return {
    message: {
      token,
      notification: { title: msg.title, body: msg.body },
      ...(Object.keys(data).length > 0 ? { data } : {}),
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: ANDROID_CHANNEL_ID,
          sound: 'default',
          default_vibrate_timings: true,
        },
      },
    },
  }
}

export type FcmResult = 'sent' | 'unregistered' | 'failed'

/**
 * Envoie une notification à un appareil Android.
 * « unregistered » : le jeton n'est plus valable (app désinstallée…), il peut être supprimé.
 */
export async function sendFcmPush(
  cfg: FcmConfig,
  token: string,
  msg: PushMessage,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<FcmResult> {
  try {
    const accessToken = await getFcmAccessToken(cfg, fetchImpl)
    if (!accessToken) return 'failed'
    const res = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildFcmMessage(token, msg)),
    })
    if (res.ok) return 'sent'
    const text = await res.text()
    if (res.status === 404 || text.includes('UNREGISTERED')) return 'unregistered'
    if (res.status === 401) resetFcmAccessTokenCache()
    console.warn(`[fcm] Erreur ${res.status} pour le jeton ${token.slice(0, 8)}… : ${text.slice(0, 200)}`)
    return 'failed'
  } catch (err) {
    console.warn('[fcm] Erreur réseau :', err instanceof Error ? err.message : err)
    return 'failed'
  }
}

// ---------------------------------------------
// Aiguillage APNs / FCM
// ---------------------------------------------

export interface PushSenders {
  apnsEnabled: boolean
  sendApns: (token: string, msg: PushMessage) => Promise<boolean>
  fcm: FcmConfig | null
  sendFcm: (cfg: FcmConfig, token: string, msg: PushMessage) => Promise<FcmResult>
  /** Appelé quand FCM dit que le jeton n'existe plus. */
  onUnregistered?: (token: string) => Promise<void> | void
}

/** Envoie au bon service selon l'appareil. Renvoie vrai si la notification est partie. */
export async function dispatchPush(device: PushDevice, msg: PushMessage, senders: PushSenders): Promise<boolean> {
  const channel = choosePushChannel(device, { apns: senders.apnsEnabled, fcm: senders.fcm !== null })
  if (channel === 'apns') return senders.sendApns(device.token, msg)
  if (channel === 'fcm' && senders.fcm) {
    const result = await senders.sendFcm(senders.fcm, device.token, msg)
    if (result === 'unregistered') await senders.onUnregistered?.(device.token)
    return result === 'sent'
  }
  return false
}
