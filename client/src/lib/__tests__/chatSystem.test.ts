import { describe, it, expect, beforeEach } from 'vitest'
import { formatSystemMessage } from '../chatSystem'
import { setLang } from '../i18n'

describe('messages système du chat', () => {
  beforeEach(() => localStorage.clear())

  it('ignore les messages normaux', () => {
    expect(formatSystemMessage('Bonjour !')).toBeNull()
    expect(formatSystemMessage('__system:inconnu__')).toBeNull()
  })

  it('traduit chaque code dans la langue du spectateur', () => {
    setLang('ru')
    expect(formatSystemMessage('__system:join__')).toEqual({ withAuthor: true, text: 'заходит 👋' })
    expect(formatSystemMessage('__system:timeout:abc:10__')?.text).toContain('10')
    setLang('fr')
    expect(formatSystemMessage(`__system:mod_added:${encodeURIComponent('Léa: la boss')}__`)?.text).toBe('Léa: la boss est maintenant modérateur')
    setLang('he')
    expect(formatSystemMessage(`__system:gift_won:${encodeURIComponent('Dana')}:${encodeURIComponent('Sac "rouge"')}__`)?.text).toContain('Dana')
  })

  it('pourboire affiché avec sa devise', () => {
    setLang('en')
    expect(formatSystemMessage('__system:tip:5:EUR__')?.text).toBe('💰 sent a tip of €5.00')
  })
})
