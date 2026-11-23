// Messages d'erreur d'authentification (Supabase renvoie de l'anglais) → texte traduit.
import { tr, type Localized } from './i18n'

const MSG = {
  invalidCredentials: {
    en: 'Wrong email or password.',
    fr: 'E-mail ou mot de passe incorrect.',
    es: 'Correo o contraseña incorrectos.',
    ru: 'Неверный e-mail или пароль.',
    he: 'האימייל או הסיסמה שגויים.',
  },
  alreadyRegistered: {
    en: 'An account already exists with this email. Try signing in.',
    fr: 'Un compte existe déjà avec cet e-mail. Essaie de te connecter.',
    es: 'Ya existe una cuenta con este correo. Prueba a iniciar sesión.',
    ru: 'Аккаунт с этим e-mail уже существует. Попробуй войти.',
    he: 'כבר קיים חשבון עם האימייל הזה. נסו להתחבר.',
  },
  emailNotConfirmed: {
    en: 'Please confirm your email first: check your inbox.',
    fr: 'Confirme d’abord ton e-mail : regarde dans ta boîte de réception.',
    es: 'Primero confirma tu correo: revisa tu bandeja de entrada.',
    ru: 'Сначала подтверди e-mail: проверь входящие.',
    he: 'צריך קודם לאשר את האימייל: בדקו את תיבת הדואר.',
  },
  weakPassword: {
    en: 'Password too weak: use at least 8 characters with letters and numbers.',
    fr: 'Mot de passe trop faible : au moins 8 caractères, avec des lettres et des chiffres.',
    es: 'Contraseña demasiado débil: usa al menos 8 caracteres con letras y números.',
    ru: 'Слишком слабый пароль: минимум 8 символов, буквы и цифры.',
    he: 'הסיסמה חלשה מדי: לפחות 8 תווים, עם אותיות ומספרים.',
  },
  samePassword: {
    en: 'The new password must be different from the old one.',
    fr: 'Le nouveau mot de passe doit être différent de l’ancien.',
    es: 'La nueva contraseña debe ser distinta de la anterior.',
    ru: 'Новый пароль должен отличаться от старого.',
    he: 'הסיסמה החדשה חייבת להיות שונה מהקודמת.',
  },
  rateLimit: {
    en: 'Too many attempts. Please wait a moment and try again.',
    fr: 'Trop de tentatives. Patiente un peu avant de réessayer.',
    es: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
    ru: 'Слишком много попыток. Подожди немного и попробуй снова.',
    he: 'יותר מדי ניסיונות. המתינו רגע ונסו שוב.',
  },
  invalidEmail: {
    en: 'This email address is not valid.',
    fr: 'Cette adresse e-mail n’est pas valide.',
    es: 'Esta dirección de correo no es válida.',
    ru: 'Этот адрес e-mail недействителен.',
    he: 'כתובת האימייל אינה תקינה.',
  },
  network: {
    en: 'No connection. Check your internet and try again.',
    fr: 'Pas de connexion. Vérifie ton accès à Internet et réessaie.',
    es: 'Sin conexión. Revisa tu internet y vuelve a intentarlo.',
    ru: 'Нет соединения. Проверь интернет и попробуй снова.',
    he: 'אין חיבור. בדקו את האינטרנט ונסו שוב.',
  },
  sessionExpired: {
    en: 'Your session has expired. Please sign in again.',
    fr: 'Ta session a expiré. Reconnecte-toi.',
    es: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
    ru: 'Сессия истекла. Войди снова.',
    he: 'פג תוקף ההתחברות. התחברו מחדש.',
  },
  linkExpired: {
    en: 'This link is invalid or has expired. Request a new one.',
    fr: 'Ce lien n’est plus valide ou a expiré. Demandes-en un nouveau.',
    es: 'Este enlace no es válido o ha caducado. Pide uno nuevo.',
    ru: 'Ссылка недействительна или устарела. Запроси новую.',
    he: 'הקישור לא תקף או שפג תוקפו. בקשו קישור חדש.',
  },
  signupDisabled: {
    en: 'Sign-ups are temporarily closed.',
    fr: 'Les inscriptions sont momentanément fermées.',
    es: 'Los registros están cerrados temporalmente.',
    ru: 'Регистрация временно закрыта.',
    he: 'ההרשמה סגורה זמנית.',
  },
  generic: {
    en: 'Something went wrong. Please try again.',
    fr: 'Une erreur est survenue. Réessaie.',
    es: 'Algo ha fallado. Vuelve a intentarlo.',
    ru: 'Что-то пошло не так. Попробуй ещё раз.',
    he: 'משהו השתבש. נסו שוב.',
  },
} satisfies Record<string, Localized<string>>

export type AuthErrorKey = keyof typeof MSG

/** Reconnaît les messages connus de Supabase (anglais) et renvoie la clé correspondante, sinon null. */
export function authErrorKey(raw: unknown): AuthErrorKey | null {
  const anyErr = raw as { message?: string; code?: string; status?: number } | null
  const msg = (typeof raw === 'string' ? raw : anyErr?.message || '').toLowerCase()
  const code = (anyErr && typeof anyErr === 'object' ? anyErr.code || '' : '').toLowerCase()
  const has = (...parts: string[]) => parts.some(p => msg.includes(p) || code.includes(p))

  if (has('invalid login credentials', 'invalid_credentials', 'invalid email or password')) return 'invalidCredentials'
  if (has('already registered', 'already been registered', 'user_already_exists', 'email_exists', 'already exists')) return 'alreadyRegistered'
  if (has('email not confirmed', 'email_not_confirmed')) return 'emailNotConfirmed'
  if (has('same_password', 'should be different from the old')) return 'samePassword'
  if (has('weak_password', 'password should', 'password is too', 'password must', 'weak password')) return 'weakPassword'
  if (has('rate limit', 'rate_limit', 'too many requests', 'over_email_send_rate_limit', 'over_request_rate_limit', 'for security purposes, you can only request') || anyErr?.status === 429) return 'rateLimit'
  if (has('unable to validate email', 'invalid email', 'email_address_invalid', 'invalid format')) return 'invalidEmail'
  if (has('failed to fetch', 'network', 'load failed', 'networkerror')) return 'network'
  if (has('session missing', 'session_not_found', 'jwt expired', 'auth session missing', 'refresh_token')) return 'sessionExpired'
  if (has('otp_expired', 'token has expired', 'link is invalid', 'expired')) return 'linkExpired'
  if (has('signups not allowed', 'signup_disabled')) return 'signupDisabled'
  return null
}

/** Texte traduit d'une erreur d'authentification ; `fallback` (déjà traduit) si le message est inconnu. */
export function authErrorMessage(raw: unknown, fallback?: string): string {
  const key = authErrorKey(raw)
  if (key) return tr(MSG[key])
  return fallback || tr(MSG.generic)
}
