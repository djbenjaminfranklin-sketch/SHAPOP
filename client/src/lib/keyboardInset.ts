/**
 * Hauteur du clavier iPhone/Android exposée en CSS : --kb sur <html>.
 * Sans module clavier natif, iOS laisse le clavier recouvrir les champs posés en bas d'un écran
 * « fixe » (les directs). On mesure la partie de l'écran que le clavier masque réellement
 * (en tenant compte du défilement que le système a peut-être déjà fait) et on remonte la zone de saisie d'autant.
 */
export function keyboardLift(innerHeight: number, viewportHeight: number, viewportOffsetTop: number): number {
  const lift = innerHeight - viewportHeight - viewportOffsetTop
  return lift > 40 ? Math.round(lift) : 0 // moins de 40 px : barre d'outils, pas un clavier
}

export function startKeyboardInset(): () => void {
  const vv = window.visualViewport
  if (!vv) return () => {}
  const update = () => {
    document.documentElement.style.setProperty('--kb', `${keyboardLift(window.innerHeight, vv.height, vv.offsetTop)}px`)
  }
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  update()
  return () => {
    vv.removeEventListener('resize', update)
    vv.removeEventListener('scroll', update)
  }
}
