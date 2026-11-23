import { describe, it, expect, beforeEach } from 'vitest'
import { t, tr, getLang, setLang, isRTL, getDir, detectDeviceLang, LANGS, LANG_META, I18N_TRANSLATIONS, subscribeLang, setLangChangeHook } from '../i18n'

function setDeviceLang(...langs: string[]) {
  Object.defineProperty(navigator, 'language', { value: langs[0] ?? '', configurable: true })
  Object.defineProperty(navigator, 'languages', { value: langs, configurable: true })
}

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
    setDeviceLang('en-US')
  })

  it('les 5 langues dans l\'ordre : en, fr, es, ru, he', () => {
    expect(LANGS).toEqual(['en', 'fr', 'es', 'ru', 'he'])
    expect(Object.keys(I18N_TRANSLATIONS)).toEqual(['en', 'fr', 'es', 'ru', 'he'])
    expect(LANG_META.ru.name).toBe('Русский')
    expect(LANG_META.he.name).toBe('עברית')
  })

  describe('langue automatique du téléphone', () => {
    it.each([
      ['fr-FR', 'fr'], ['es-MX', 'es'], ['ru-RU', 'ru'], ['he-IL', 'he'], ['iw-IL', 'he'], ['en-GB', 'en'],
    ])('%s → %s', (device, expected) => {
      setDeviceLang(device)
      expect(getLang()).toBe(expected)
    })

    it('langue non couverte → anglais', () => {
      setDeviceLang('de-DE')
      expect(getLang()).toBe('en')
      setDeviceLang('xx-XX')
      expect(detectDeviceLang()).toBe('en')
    })

    it('prend la première langue couverte de la liste du téléphone', () => {
      setDeviceLang('de-DE', 'ru-RU', 'fr-FR')
      expect(getLang()).toBe('ru')
    })

    it('valeur enregistrée invalide → langue du téléphone', () => {
      localStorage.setItem('shapop_lang', 'zz')
      setDeviceLang('es-ES')
      expect(getLang()).toBe('es')
    })
  })

  describe('choix manuel', () => {
    it('un téléphone israélien peut choisir le russe', () => {
      setDeviceLang('he-IL')
      expect(getLang()).toBe('he')
      setLang('ru')
      expect(getLang()).toBe('ru')
      expect(localStorage.getItem('shapop_lang')).toBe('ru')
      expect(isRTL()).toBe(false)
    })

    it('met à jour <html lang> et dir tout de suite', () => {
      setLang('he')
      expect(document.documentElement.lang).toBe('he')
      expect(document.documentElement.dir).toBe('rtl')
      setLang('fr')
      expect(document.documentElement.lang).toBe('fr')
      expect(document.documentElement.dir).toBe('ltr')
    })

    it('prévient les abonnés et le profil', () => {
      let calls = 0
      let saved: string | null = null
      const off = subscribeLang(() => { calls++ })
      setLangChangeHook(l => { saved = l })
      setLang('es')
      off()
      setLangChangeHook(null)
      expect(calls).toBe(1)
      expect(saved).toBe('es')
    })
  })

  it('hébreu seulement en droite à gauche', () => {
    for (const l of LANGS) {
      setLang(l)
      expect(getDir()).toBe(l === 'he' ? 'rtl' : 'ltr')
      expect(isRTL()).toBe(l === 'he')
    }
  })

  describe('t() et tr()', () => {
    it('traduit dans chaque langue', () => {
      expect(t('en', 'home_tab')).toBe('Home')
      expect(t('fr', 'home_tab')).toBe('Accueil')
      expect(t('es', 'home_tab')).toBe('Inicio')
      expect(t('ru', 'home_tab')).toBe('Главная')
      expect(t('he', 'home_tab')).toBe('בית')
    })

    it('langue inconnue → anglais', () => {
      expect(t('zz', 'home_tab')).toBe('Home')
    })

    it('tr() choisit la langue courante', () => {
      setLang('ru')
      expect(tr({ en: 'a', fr: 'b', es: 'c', ru: 'd', he: 'e' })).toBe('d')
    })

    it('aucune valeur vide', () => {
      for (const l of LANGS) {
        for (const [k, v] of Object.entries(I18N_TRANSLATIONS[l])) {
          expect(v, `${l}.${k}`).toBeTruthy()
        }
      }
    })
  })
})
