// Messages système du chat de live : le serveur enregistre un code
// `__system:<type>:<arg1>:<arg2>__` (arguments encodés en URI), traduit ici
// dans la langue de CHAQUE spectateur.
import { tr, type Localized } from './i18n'
import { formatMoney } from './fulfillment'

const TEXTS: Localized<{
  join: string
  timeout: string
  mod_added: string
  tip: string
  gift_won: string
}> = {
  en: { join: 'joined 👋', timeout: 'A viewer has been muted for {min} min', mod_added: '{name} is now a moderator', tip: '💰 sent a tip of {amount}', gift_won: '🎁 {name} won the gift “{title}”!' },
  fr: { join: 'a rejoint 👋', timeout: 'Un spectateur a été mis en sourdine {min} min', mod_added: '{name} est maintenant modérateur', tip: '💰 a envoyé un pourboire de {amount}', gift_won: '🎁 {name} a gagné le cadeau « {title} » !' },
  es: { join: 'se ha unido 👋', timeout: 'Un espectador ha sido silenciado {min} min', mod_added: '{name} ahora es moderador', tip: '💰 ha enviado una propina de {amount}', gift_won: '🎁 ¡{name} ha ganado el regalo «{title}»!' },
  ru: { join: 'заходит 👋', timeout: 'Зритель отключён от чата на {min} мин', mod_added: '{name} теперь модератор', tip: '💰 отправляет чаевые: {amount}', gift_won: '🎁 {name} выигрывает подарок «{title}»!' },
  he: { join: 'הצטרף/ה 👋', timeout: 'צופה הושתק/ה ל-{min} דק׳', mod_added: '{name} מנהל/ת עכשיו את הצ׳אט', tip: '💰 שלח/ה טיפ של {amount}', gift_won: '🎁 {name} זכה/תה במתנה „{title}”!' },
}

export interface SystemMessage {
  /** Le nom de l'auteur du message doit-il être affiché avant le texte ? */
  withAuthor: boolean
  text: string
}

const fill = (s: string, p: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? '')
const dec = (s: string | undefined) => {
  try { return decodeURIComponent(s || '') } catch { return s || '' }
}

/** Code système → texte traduit ; null si ce n'est pas un message système connu. */
export function formatSystemMessage(raw: string | null | undefined): SystemMessage | null {
  const m = /^__system:([a-z_]+)(?::(.*))?__$/.exec(raw || '')
  if (!m) return null
  const t = tr(TEXTS)
  const args = (m[2] ?? '').split(':')
  switch (m[1]) {
    case 'join': return { withAuthor: true, text: t.join }
    case 'timeout': return { withAuthor: false, text: fill(t.timeout, { min: dec(args[1]) || '5' }) }
    case 'mod_added': return { withAuthor: false, text: fill(t.mod_added, { name: dec(args[0]) }) }
    case 'tip': return { withAuthor: true, text: fill(t.tip, { amount: formatMoney(Number(dec(args[0])), dec(args[1]) || 'EUR') }) } // i18n-ignore (devise réellement débitée par le serveur)
    case 'gift_won': return { withAuthor: false, text: fill(t.gift_won, { name: dec(args[0]), title: dec(args[1]) }) }
    default: return null
  }
}
