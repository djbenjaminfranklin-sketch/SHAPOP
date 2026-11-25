import { describe, it, expect, vi, beforeEach } from 'vitest'

const shareMock = vi.fn()
vi.mock('@capacitor/share', () => ({ Share: { share: (...a: unknown[]) => shareMock(...a) } }))

const platform = { value: 'web' }
const pushAvailableMock = vi.fn()
const setStyleMock = vi.fn(async () => {})
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => platform.value, isNativePlatform: () => platform.value !== 'web' },
  registerPlugin: () => ({ pushAvailable: () => pushAvailableMock() }),
  SystemBars: { setStyle: (...a: unknown[]) => setStyleMock(...a) },
  SystemBarsStyle: { Light: 'LIGHT', Dark: 'DARK', Default: 'DEFAULT' },
}))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(async () => ({ remove: () => {} })), minimizeApp: vi.fn(async () => {}) } }))

async function load() {
  vi.resetModules()
  return import('../nativePlatform')
}

describe('handleAndroidBack — bouton retour Android', () => {
  beforeEach(() => { platform.value = 'android' })

  it('revient à l’écran précédent quand c’est possible', async () => {
    const { handleAndroidBack } = await load()
    const goBack = vi.fn(), minimize = vi.fn()
    expect(handleAndroidBack(true, { dispatch: () => true, goBack, minimize })).toBe('back')
    expect(goBack).toHaveBeenCalledOnce()
    expect(minimize).not.toHaveBeenCalled()
  })

  it('sur le premier écran : met l’app en arrière-plan au lieu de la fermer', async () => {
    const { handleAndroidBack } = await load()
    const goBack = vi.fn(), minimize = vi.fn()
    expect(handleAndroidBack(false, { dispatch: () => true, goBack, minimize })).toBe('minimize')
    expect(minimize).toHaveBeenCalledOnce()
    expect(goBack).not.toHaveBeenCalled()
  })

  it('une fenêtre ouverte peut prendre le retour (preventDefault)', async () => {
    const { handleAndroidBack, ANDROID_BACK_EVENT } = await load()
    const onBack = (e: Event) => e.preventDefault()
    window.addEventListener(ANDROID_BACK_EVENT, onBack)
    const goBack = vi.fn(), minimize = vi.fn()
    const r = handleAndroidBack(true, { dispatch: e => window.dispatchEvent(e), goBack, minimize })
    window.removeEventListener(ANDROID_BACK_EVENT, onBack)
    expect(r).toBe('handled')
    expect(goBack).not.toHaveBeenCalled()
  })
})

describe('installAndroidSharePolyfill — partage dans la WebView Android', () => {
  beforeEach(() => { shareMock.mockReset() })

  it('ajoute navigator.share qui ouvre la feuille de partage native', async () => {
    const { installAndroidSharePolyfill } = await load()
    const nav = {} as Navigator
    installAndroidSharePolyfill(nav)
    shareMock.mockResolvedValue({})
    await nav.share({ title: 'ShaPop', text: 'Regarde', url: 'https://shapop.app/x' })
    expect(shareMock).toHaveBeenCalledWith({ title: 'ShaPop', text: 'Regarde', url: 'https://shapop.app/x', dialogTitle: 'ShaPop' })
  })

  it('les fichiers ne sont pas pris en charge (les écrans gardent leur repli)', async () => {
    const { installAndroidSharePolyfill } = await load()
    const nav = {} as Navigator
    installAndroidSharePolyfill(nav)
    const file = new File(['x'], 'clip.mp4')
    expect(nav.canShare({ files: [file] })).toBe(false)
    expect(nav.canShare({ url: 'https://x' })).toBe(true)
    await expect(nav.share({ files: [file] })).rejects.toThrow()
    expect(shareMock).not.toHaveBeenCalled()
  })

  it('partage annulé → AbortError, comme dans un navigateur', async () => {
    const { installAndroidSharePolyfill } = await load()
    const nav = {} as Navigator
    installAndroidSharePolyfill(nav)
    shareMock.mockImplementation(async () => { throw new Error('Share canceled') })
    await expect(nav.share({ url: 'https://x' })).rejects.toHaveProperty('name', 'AbortError')
  })

  it('ne remplace pas un navigator.share existant', async () => {
    const { installAndroidSharePolyfill } = await load()
    const original = vi.fn()
    const nav = { share: original } as unknown as Navigator
    installAndroidSharePolyfill(nav)
    expect(nav.share).toBe(original)
  })
})

describe('isPushAvailable / pushPlatform', () => {
  it('iPhone : notifications disponibles, plateforme « ios »', async () => {
    platform.value = 'ios'
    const m = await load()
    expect(await m.isPushAvailable()).toBe(true)
    expect(m.pushPlatform()).toBe('ios')
  })

  it('Android sans Firebase : indisponible', async () => {
    platform.value = 'android'
    pushAvailableMock.mockResolvedValue({ available: false })
    const m = await load()
    expect(await m.isPushAvailable()).toBe(false)
    expect(m.pushPlatform()).toBe('android')
  })

  it('Android avec Firebase : disponible', async () => {
    platform.value = 'android'
    pushAvailableMock.mockResolvedValue({ available: true })
    const m = await load()
    expect(await m.isPushAvailable()).toBe(true)
  })

  it('Android : erreur du plugin natif → indisponible (jamais de plantage)', async () => {
    platform.value = 'android'
    pushAvailableMock.mockImplementation(async () => { throw new Error('not implemented') })
    const m = await load()
    expect(await m.isPushAvailable()).toBe(false)
  })

  it('web : indisponible, pas de plateforme', async () => {
    platform.value = 'web'
    const m = await load()
    expect(await m.isPushAvailable()).toBe(false)
    expect(m.pushPlatform()).toBeNull()
  })
})

describe('syncAndroidSystemBars — icônes des barres système', () => {
  beforeEach(() => { setStyleMock.mockClear() })

  it('thème clair → icônes foncées, thème sombre → icônes claires (Android)', async () => {
    platform.value = 'android'
    const m = await load()
    m.syncAndroidSystemBars(true)
    m.syncAndroidSystemBars(false)
    expect(setStyleMock).toHaveBeenNthCalledWith(1, { style: 'LIGHT' })
    expect(setStyleMock).toHaveBeenNthCalledWith(2, { style: 'DARK' })
  })

  it('iPhone : même règle (sinon heure et batterie invisibles en thème sombre)', async () => {
    platform.value = 'ios'
    const m = await load()
    m.syncAndroidSystemBars(true)
    m.syncAndroidSystemBars(false)
    expect(setStyleMock).toHaveBeenNthCalledWith(1, { style: 'LIGHT' })
    expect(setStyleMock).toHaveBeenNthCalledWith(2, { style: 'DARK' })
  })

  it('ne touche à rien sur le web', async () => {
    platform.value = 'web'
    ;(await load()).syncAndroidSystemBars(true)
    expect(setStyleMock).not.toHaveBeenCalled()
  })
})
