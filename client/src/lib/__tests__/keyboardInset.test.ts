import { describe, it, expect } from 'vitest'
import { keyboardLift } from '../keyboardInset'

describe('keyboardLift — hauteur à remonter au-dessus du clavier', () => {
  it('clavier ouvert sans défilement du système : toute la hauteur du clavier', () => {
    expect(keyboardLift(844, 508, 0)).toBe(336)
  })
  it('le système a déjà fait défiler de 200 px : il ne reste que la différence', () => {
    expect(keyboardLift(844, 508, 200)).toBe(136)
  })
  it('pas de clavier (ou simple barre) : rien', () => {
    expect(keyboardLift(844, 844, 0)).toBe(0)
    expect(keyboardLift(844, 820, 0)).toBe(0)
  })
})
