import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'
import {
  choosePushChannel,
  readFcmConfig,
  buildServiceAccountJwt,
  buildFcmMessage,
  sendFcmPush,
  dispatchPush,
  resetFcmAccessTokenCache,
  ANDROID_CHANNEL_ID,
  type FcmConfig,
  type PushSenders,
} from '../services/push'

const APNS_TOKEN = 'a'.repeat(64)
const FCM_TOKEN = 'dGVzdA:APA91bH-exampleFcmToken_1234567890abcdefghijklmnopqrstuvwxyz'
const BOTH = { apns: true, fcm: true }

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const PRIVATE_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

const SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'shapop-test',
  client_email: 'fcm-sender@shapop-test.iam.gserviceaccount.com',
  private_key: PRIVATE_PEM,
  token_uri: 'https://oauth2.googleapis.com/token',
}

const CFG: FcmConfig = {
  projectId: 'shapop-test',
  clientEmail: SERVICE_ACCOUNT.client_email,
  privateKey: PRIVATE_PEM,
  tokenUri: SERVICE_ACCOUNT.token_uri,
}

describe('choosePushChannel — APNs ou FCM', () => {
  it('iPhone → APNs, Android → FCM', () => {
    expect(choosePushChannel({ token: APNS_TOKEN, platform: 'ios' }, BOTH)).toBe('apns')
    expect(choosePushChannel({ token: FCM_TOKEN, platform: 'android' }, BOTH)).toBe('fcm')
  })

  it('la plateforme enregistrée prime sur la forme du jeton', () => {
    expect(choosePushChannel({ token: FCM_TOKEN, platform: 'ios' }, BOTH)).toBe('apns')
    expect(choosePushChannel({ token: APNS_TOKEN, platform: 'android' }, BOTH)).toBe('fcm')
    expect(choosePushChannel({ token: APNS_TOKEN, platform: 'ANDROID' }, BOTH)).toBe('fcm')
  })

  it('plateforme inconnue : devinée d’après le jeton', () => {
    expect(choosePushChannel({ token: APNS_TOKEN }, BOTH)).toBe('apns')
    expect(choosePushChannel({ token: APNS_TOKEN.toUpperCase(), platform: null }, BOTH)).toBe('apns')
    expect(choosePushChannel({ token: FCM_TOKEN, platform: '' }, BOTH)).toBe('fcm')
  })

  it('aucun envoi vers un service non configuré', () => {
    expect(choosePushChannel({ token: FCM_TOKEN, platform: 'android' }, { apns: true, fcm: false })).toBeNull()
    expect(choosePushChannel({ token: APNS_TOKEN, platform: 'ios' }, { apns: false, fcm: true })).toBeNull()
  })

  it('lignes de préférences « prefs-… » / web : jamais d’envoi', () => {
    expect(choosePushChannel({ token: 'prefs-123', platform: 'web' }, BOTH)).toBeNull()
    expect(choosePushChannel({ token: 'prefs-123' }, BOTH)).toBeNull()
    expect(choosePushChannel({ token: FCM_TOKEN, platform: 'web' }, BOTH)).toBeNull()
    expect(choosePushChannel({ token: '', platform: 'android' }, BOTH)).toBeNull()
  })
})

describe('readFcmConfig — activé seulement si les variables existent', () => {
  it('sans variables : FCM désactivé', () => {
    expect(readFcmConfig({})).toBeNull()
    expect(readFcmConfig({ FCM_PROJECT_ID: 'shapop-test' })).toBeNull()
    expect(readFcmConfig({ FCM_SERVICE_ACCOUNT_JSON: JSON.stringify(SERVICE_ACCOUNT) })).toBeNull()
  })

  it('JSON brut', () => {
    const cfg = readFcmConfig({ FCM_PROJECT_ID: 'shapop-test', FCM_SERVICE_ACCOUNT_JSON: JSON.stringify(SERVICE_ACCOUNT) })
    expect(cfg).toEqual(CFG)
  })

  it('JSON encodé en base64', () => {
    const b64 = Buffer.from(JSON.stringify(SERVICE_ACCOUNT)).toString('base64')
    expect(readFcmConfig({ FCM_PROJECT_ID: 'shapop-test', FCM_SERVICE_ACCOUNT_JSON: b64 })).toEqual(CFG)
  })

  it('clé privée avec des « \\n » littéraux (copiée dans Render)', () => {
    const escaped = JSON.stringify({ ...SERVICE_ACCOUNT, private_key: PRIVATE_PEM.replace(/\n/g, '\\n') })
    const cfg = readFcmConfig({ FCM_PROJECT_ID: 'shapop-test', FCM_SERVICE_ACCOUNT_JSON: escaped })
    expect(cfg?.privateKey).toBe(PRIVATE_PEM)
  })

  it('contenu invalide : désactivé sans planter', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(readFcmConfig({ FCM_PROJECT_ID: 'p', FCM_SERVICE_ACCOUNT_JSON: 'pas du json' })).toBeNull()
    expect(readFcmConfig({ FCM_PROJECT_ID: 'p', FCM_SERVICE_ACCOUNT_JSON: '{"client_email":"x"}' })).toBeNull()
    warn.mockRestore()
  })
})

describe('JWT du compte de service', () => {
  it('signé RS256 avec la bonne portée et la bonne audience', () => {
    const jwt = buildServiceAccountJwt(CFG, 1_700_000_000)
    const [h, p, sig] = jwt.split('.')
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' })
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString())
    expect(payload).toEqual({
      iss: CFG.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    })
    const ok = crypto.createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(sig, 'base64url'))
    expect(ok).toBe(true)
  })
})

describe('buildFcmMessage', () => {
  it('notification + données (texte) + canal Android', () => {
    const body = buildFcmMessage(FCM_TOKEN, { title: 'Live', body: 'Ça commence', data: { stream_id: 's1' } })
    expect(body.message.token).toBe(FCM_TOKEN)
    expect(body.message.notification).toEqual({ title: 'Live', body: 'Ça commence' })
    expect(body.message.data).toEqual({ stream_id: 's1' })
    expect(body.message.android.priority).toBe('HIGH')
    expect(body.message.android.notification.channel_id).toBe(ANDROID_CHANNEL_ID)
  })

  it('pas de champ data vide', () => {
    expect('data' in buildFcmMessage(FCM_TOKEN, { title: 't', body: 'b' }).message).toBe(false)
  })
})

function fakeFetch(sendStatus: number, sendBody = '{}') {
  const calls: { url: string; init?: { headers?: Record<string, string>; body?: string } }[] = []
  const impl = vi.fn(async (url: string, init?: { headers?: Record<string, string>; body?: string }) => {
    calls.push({ url, init })
    if (url.includes('oauth2')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'ya29.test', expires_in: 3600 }), text: async () => '' }
    }
    return { ok: sendStatus === 200, status: sendStatus, json: async () => JSON.parse(sendBody), text: async () => sendBody }
  })
  return { impl, calls }
}

describe('sendFcmPush — API HTTP v1', () => {
  beforeEach(() => resetFcmAccessTokenCache())

  it('échange le JWT puis envoie au bon projet avec le jeton d’accès', async () => {
    const { impl, calls } = fakeFetch(200)
    const r = await sendFcmPush(CFG, FCM_TOKEN, { title: 't', body: 'b', data: { order_id: 'o1' } }, impl)
    expect(r).toBe('sent')
    expect(calls).toHaveLength(2)
    expect(calls[0].url).toBe('https://oauth2.googleapis.com/token')
    expect(calls[0].init?.body).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer')
    expect(calls[1].url).toBe('https://fcm.googleapis.com/v1/projects/shapop-test/messages:send')
    expect(calls[1].init?.headers?.Authorization).toBe('Bearer ya29.test')
    expect(JSON.parse(calls[1].init!.body!).message.data).toEqual({ order_id: 'o1' })
  })

  it('réutilise le jeton d’accès en cache', async () => {
    const { impl, calls } = fakeFetch(200)
    await sendFcmPush(CFG, FCM_TOKEN, { title: 't', body: 'b' }, impl)
    await sendFcmPush(CFG, FCM_TOKEN, { title: 't', body: 'b' }, impl)
    expect(calls.filter(c => c.url.includes('oauth2'))).toHaveLength(1)
  })

  it('jeton périmé (404 UNREGISTERED) → « unregistered »', async () => {
    const { impl } = fakeFetch(404, '{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}')
    expect(await sendFcmPush(CFG, FCM_TOKEN, { title: 't', body: 'b' }, impl)).toBe('unregistered')
  })

  it('autre erreur → « failed » sans exception', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { impl } = fakeFetch(500, 'boom')
    expect(await sendFcmPush(CFG, FCM_TOKEN, { title: 't', body: 'b' }, impl)).toBe('failed')
    const throwing = vi.fn(async () => { throw new Error('réseau coupé') })
    resetFcmAccessTokenCache()
    expect(await sendFcmPush(CFG, FCM_TOKEN, { title: 't', body: 'b' }, throwing)).toBe('failed')
    warn.mockRestore()
  })
})

describe('dispatchPush — aiguillage', () => {
  function senders(over: Partial<PushSenders> = {}): PushSenders & { sendApns: ReturnType<typeof vi.fn>; sendFcm: ReturnType<typeof vi.fn> } {
    return {
      apnsEnabled: true,
      sendApns: vi.fn(async () => true),
      fcm: CFG,
      sendFcm: vi.fn(async () => 'sent' as const),
      onUnregistered: vi.fn(),
      ...over,
    } as PushSenders & { sendApns: ReturnType<typeof vi.fn>; sendFcm: ReturnType<typeof vi.fn> }
  }
  const msg = { title: 't', body: 'b' }

  it('iPhone → APNs uniquement', async () => {
    const s = senders()
    expect(await dispatchPush({ token: APNS_TOKEN, platform: 'ios' }, msg, s)).toBe(true)
    expect(s.sendApns).toHaveBeenCalledWith(APNS_TOKEN, msg)
    expect(s.sendFcm).not.toHaveBeenCalled()
  })

  it('Android → FCM uniquement', async () => {
    const s = senders()
    expect(await dispatchPush({ token: FCM_TOKEN, platform: 'android' }, msg, s)).toBe(true)
    expect(s.sendFcm).toHaveBeenCalledWith(CFG, FCM_TOKEN, msg)
    expect(s.sendApns).not.toHaveBeenCalled()
  })

  it('Android sans FCM configuré : rien n’est envoyé (et surtout pas vers APNs)', async () => {
    const s = senders({ fcm: null })
    expect(await dispatchPush({ token: FCM_TOKEN, platform: 'android' }, msg, s)).toBe(false)
    expect(s.sendApns).not.toHaveBeenCalled()
    expect(s.sendFcm).not.toHaveBeenCalled()
  })

  it('jeton Android périmé → onUnregistered', async () => {
    const s = senders({ sendFcm: vi.fn(async () => 'unregistered' as const) })
    expect(await dispatchPush({ token: FCM_TOKEN, platform: 'android' }, msg, s)).toBe(false)
    expect(s.onUnregistered).toHaveBeenCalledWith(FCM_TOKEN)
  })
})
