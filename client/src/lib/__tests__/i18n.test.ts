import { describe, it, expect, beforeEach } from 'vitest'
import { t, getLang, setLang, isRTL, getDir } from '../i18n'

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getLang()', () => {
    it('returns "fr" as default when no language is stored and browser language is not supported', () => {
      // jsdom defaults navigator.language to empty/en-US, but 'en' IS supported
      // so we test the fallback by setting a stored unsupported lang, then clearing
      Object.defineProperty(navigator, 'language', {
        value: 'xx-XX',
        configurable: true,
      })
      const lang = getLang()
      expect(lang).toBe('fr')
    })

    it('returns stored language when one is set', () => {
      setLang('en')
      expect(getLang()).toBe('en')
    })

    it('returns stored language for Hebrew', () => {
      setLang('he')
      expect(getLang()).toBe('he')
    })

    it('returns stored language for Spanish', () => {
      setLang('es')
      expect(getLang()).toBe('es')
    })

    it('auto-detects from browser language when no stored language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'es-MX',
        configurable: true,
      })
      expect(getLang()).toBe('es')
    })

    it('falls back to "fr" when stored language is invalid', () => {
      localStorage.setItem('shapop_lang', 'zz')
      Object.defineProperty(navigator, 'language', {
        value: 'zz-ZZ',
        configurable: true,
      })
      expect(getLang()).toBe('fr')
    })
  })

  describe('t()', () => {
    it('returns French translation for a known key with lang "fr"', () => {
      expect(t('fr', 'home_tab')).toBe('Accueil')
    })

    it('returns English translation for a known key with lang "en"', () => {
      expect(t('en', 'home_tab')).toBe('Home')
    })

    it('returns Spanish translation for a known key with lang "es"', () => {
      expect(t('es', 'home_tab')).toBe('Inicio')
    })

    it('returns Hebrew translation for a known key with lang "he"', () => {
      expect(t('he', 'home_tab')).toBe('\u05D1\u05D9\u05EA')
    })

    it('falls back to French when an unknown language is provided', () => {
      expect(t('zz', 'home_tab')).toBe('Accueil')
    })

    it('returns correct translations for category keys', () => {
      expect(t('fr', 'sneakers')).toBe('Sneakers')
      expect(t('en', 'jewelry')).toBe('Jewelry')
      expect(t('es', 'bags')).toBe('Bolsos')
    })

    it('returns correct translations for navigation keys', () => {
      expect(t('en', 'sell_tab')).toBe('Sell')
      expect(t('fr', 'sell_tab')).toBe('Vendre')
      expect(t('es', 'sell_tab')).toBe('Vender')
    })

    it('returns correct translations for filter keys', () => {
      expect(t('en', 'filter_all')).toBe('All')
      expect(t('fr', 'filter_active')).toBe('En cours')
      expect(t('es', 'filter_completed')).toBe('Finalizadas')
    })
  })

  describe('setLang()', () => {
    it('persists language to localStorage', () => {
      setLang('en')
      expect(localStorage.getItem('shapop_lang')).toBe('en')
    })

    it('overwrites previously stored language', () => {
      setLang('en')
      setLang('es')
      expect(localStorage.getItem('shapop_lang')).toBe('es')
    })
  })

  describe('isRTL()', () => {
    it('returns true when language is Hebrew', () => {
      setLang('he')
      expect(isRTL()).toBe(true)
    })

    it('returns false when language is French', () => {
      setLang('fr')
      expect(isRTL()).toBe(false)
    })

    it('returns false when language is English', () => {
      setLang('en')
      expect(isRTL()).toBe(false)
    })

    it('returns false when language is Spanish', () => {
      setLang('es')
      expect(isRTL()).toBe(false)
    })

    it('returns false when no language is set and browser is not Hebrew', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
        configurable: true,
      })
      expect(isRTL()).toBe(false)
    })
  })

  describe('getDir()', () => {
    it('returns "rtl" when language is Hebrew', () => {
      setLang('he')
      expect(getDir()).toBe('rtl')
    })

    it('returns "ltr" when language is French', () => {
      setLang('fr')
      expect(getDir()).toBe('ltr')
    })

    it('returns "ltr" when language is English', () => {
      setLang('en')
      expect(getDir()).toBe('ltr')
    })

    it('returns "ltr" when language is Spanish', () => {
      setLang('es')
      expect(getDir()).toBe('ltr')
    })
  })

  describe('t() - giveaway translations', () => {
    it('returns correct giveaway translations in French', () => {
      expect(t('fr', 'giftTitle')).toBe('Cadeau Surprise')
      expect(t('fr', 'giftEnter')).toBe('Participer')
      expect(t('fr', 'giftDraw')).toBe('Tirer au sort')
    })

    it('returns correct giveaway translations in English', () => {
      expect(t('en', 'giftTitle')).toBe('Surprise Gift')
      expect(t('en', 'giftEnter')).toBe('Enter')
      expect(t('en', 'giftDraw')).toBe('Draw winner')
    })

    it('returns correct giveaway translations in Spanish', () => {
      expect(t('es', 'giftTitle')).toBe('Regalo Sorpresa')
      expect(t('es', 'giftEnter')).toBe('Participar')
      expect(t('es', 'giftDraw')).toBe('Sortear')
    })

    it('returns correct giveaway translations in Hebrew', () => {
      expect(t('he', 'giftTitle')).toBe('\u05DE\u05EA\u05E0\u05D4 \u05D4\u05E4\u05EA\u05E2\u05D4')
      expect(t('he', 'giftEnter')).toBe('\u05DC\u05D4\u05E9\u05EA\u05EA\u05E3')
    })
  })

  describe('t() - all supported languages have consistent keys', () => {
    const commonKeys = [
      'search_placeholder', 'home_tab', 'sell_tab', 'live',
      'filter_all', 'giftTitle', 'giftCancel',
    ] as const

    it('all keys return non-empty strings for French', () => {
      for (const key of commonKeys) {
        const value = t('fr', key)
        expect(value).toBeTruthy()
        expect(typeof value).toBe('string')
      }
    })

    it('all keys return non-empty strings for English', () => {
      for (const key of commonKeys) {
        const value = t('en', key)
        expect(value).toBeTruthy()
        expect(typeof value).toBe('string')
      }
    })

    it('all keys return non-empty strings for Spanish', () => {
      for (const key of commonKeys) {
        const value = t('es', key)
        expect(value).toBeTruthy()
        expect(typeof value).toBe('string')
      }
    })

    it('all keys return non-empty strings for Hebrew', () => {
      for (const key of commonKeys) {
        const value = t('he', key)
        expect(value).toBeTruthy()
        expect(typeof value).toBe('string')
      }
    })
  })
})
