// =====================================================================
// Langues de ShaPop — socle unique.
// Ordre partout : anglais, français, espagnol, russe, hébreu.
// - Langue automatique selon le téléphone ; anglais si elle n'est pas couverte.
// - Le choix de l'utilisateur est mémorisé (localStorage + profil si connecté)
//   et s'applique tout de suite (textes, sens de lecture, <html lang>).
// =====================================================================
import { useSyncExternalStore } from 'react'

export const LANGS = ['en', 'fr', 'es', 'ru', 'he'] as const
export type Lang = typeof LANGS[number]
export const DEFAULT_LANG: Lang = 'en'
export const RTL_LANGS: readonly Lang[] = ['he']

/** Drapeau + nom de la langue dans sa propre langue (sélecteur). */
export const LANG_META: Record<Lang, { flag: string; name: string; locale: string }> = {
  en: { flag: '🇬🇧', name: 'English', locale: 'en-US' },
  fr: { flag: '🇫🇷', name: 'Français', locale: 'fr-FR' },
  es: { flag: '🇪🇸', name: 'Español', locale: 'es-ES' },
  ru: { flag: '🇷🇺', name: 'Русский', locale: 'ru-RU' },
  he: { flag: '🇮🇱', name: 'עברית', locale: 'he-IL' },
}

/** Dictionnaire complet : TypeScript exige les 5 langues. */
export type Localized<T> = Record<Lang, T>

const translations = {
  en: {
    search_placeholder: 'Search on ShaPop',
    detecting_location: 'Detecting location...',
    all_cities: 'All cities',
    for_you: 'My feed',
    following: 'Following',
    fashion_w: 'Women',
    fashion_m: 'Men',
    sneakers: 'Sneakers',
    bags: 'Bags',
    jewelry: 'Jewelry',
    watches: 'Watches',
    beauty: 'Beauty',
    electronics: 'Tech',
    gaming: 'Gaming',
    cards: 'Cards',
    toys: 'Toys',
    vintage: 'Vintage',
    art: 'Art',
    furniture: 'Furniture',
    home: 'Home',
    sports: 'Sport',
    fitness: 'Fitness',
    music: 'Music',
    books: 'Books',
    kids: 'Kids',
    pets: 'Pets',
    auto: 'Cars & bikes',
    garden: 'Garden',
    food: 'Food',
    handmade: 'Handmade',
    collect: 'Collectibles',
    photo: 'Photo',
    tools: 'DIY',
    live: 'Live',
    coming_soon: 'Soon',
    home_tab: 'Home',
    categories_tab: 'Categories',
    sell_tab: 'Sell',
    map_tab: 'Local',
    account_tab: 'Profile',
    live_streams: 'Live streams',
    tap_city: 'Tap a city to see its lives',
    streams_live: 'stream(s) live',
    skip: 'Skip',
    activity_tab: 'Activity',
    purchases_tab: 'Purchases',
    auctions_tab: 'Auctions',
    offers_tab: 'Offers',
    saved_tab: 'Saved',
    filter_all: 'All',
    filter_active: 'Active',
    filter_completed: 'Completed',
    filter_refunds: 'Refunds',
    giftTitle: 'Surprise gift',
    giftParticipants: 'participants',
    giftEnter: 'Enter',
    giftEntered: 'Entered',
    giftDraw: 'Draw a winner',
    giftWinner: 'won the gift!',
    giftPrizePlaceholder: 'Describe the gift...',
    giftLaunch: 'Launch the gift',
    giftActive: 'Gift in progress',
    giftCancel: 'Cancel',
    language: 'Language',
    loading: 'Loading',
    offline: 'No internet connection',
    skip_to_content: 'Skip to content',
  },
  fr: {
    search_placeholder: 'Rechercher sur ShaPop',
    detecting_location: 'Détection de la position...',
    all_cities: 'Toutes les villes',
    for_you: 'Mon feed',
    following: 'Suivis',
    fashion_w: 'Femme',
    fashion_m: 'Homme',
    sneakers: 'Sneakers',
    bags: 'Sacs',
    jewelry: 'Bijoux',
    watches: 'Montres',
    beauty: 'Beauté',
    electronics: 'High-tech',
    gaming: 'Gaming',
    cards: 'Cartes',
    toys: 'Jouets',
    vintage: 'Vintage',
    art: 'Art',
    furniture: 'Meubles',
    home: 'Maison',
    sports: 'Sport',
    fitness: 'Fitness',
    music: 'Musique',
    books: 'Livres',
    kids: 'Enfants',
    pets: 'Animaux',
    auto: 'Auto-Moto',
    garden: 'Jardin',
    food: 'Food',
    handmade: 'Fait main',
    collect: 'Collection',
    photo: 'Photo',
    tools: 'Bricolage',
    live: 'En direct',
    coming_soon: 'Bientôt',
    home_tab: 'Accueil',
    categories_tab: 'Catégories',
    sell_tab: 'Vendre',
    map_tab: 'Local',
    account_tab: 'Profil',
    live_streams: 'Lives en cours',
    tap_city: 'Touche une ville pour voir ses lives',
    streams_live: 'live(s) en cours',
    skip: 'Passer',
    activity_tab: 'Activité',
    purchases_tab: 'Achats',
    auctions_tab: 'Enchères',
    offers_tab: 'Offres',
    saved_tab: 'Sauvegardés',
    filter_all: 'Toutes',
    filter_active: 'En cours',
    filter_completed: 'Terminées',
    filter_refunds: 'Remboursements',
    giftTitle: 'Cadeau surprise',
    giftParticipants: 'participants',
    giftEnter: 'Participer',
    giftEntered: 'Inscrit',
    giftDraw: 'Tirer au sort',
    giftWinner: 'a gagné le cadeau !',
    giftPrizePlaceholder: 'Décris le cadeau...',
    giftLaunch: 'Lancer le cadeau',
    giftActive: 'Cadeau en cours',
    giftCancel: 'Annuler',
    language: 'Langue',
    loading: 'Chargement',
    offline: 'Pas de connexion internet',
    skip_to_content: 'Aller au contenu',
  },
  es: {
    search_placeholder: 'Buscar en ShaPop',
    detecting_location: 'Detectando ubicación...',
    all_cities: 'Todas las ciudades',
    for_you: 'Mi feed',
    following: 'Siguiendo',
    fashion_w: 'Mujer',
    fashion_m: 'Hombre',
    sneakers: 'Zapatillas',
    bags: 'Bolsos',
    jewelry: 'Joyas',
    watches: 'Relojes',
    beauty: 'Belleza',
    electronics: 'Tecnología',
    gaming: 'Gaming',
    cards: 'Cartas',
    toys: 'Juguetes',
    vintage: 'Vintage',
    art: 'Arte',
    furniture: 'Muebles',
    home: 'Hogar',
    sports: 'Deporte',
    fitness: 'Fitness',
    music: 'Música',
    books: 'Libros',
    kids: 'Niños',
    pets: 'Mascotas',
    auto: 'Motor',
    garden: 'Jardín',
    food: 'Comida',
    handmade: 'Artesanal',
    collect: 'Coleccionismo',
    photo: 'Foto',
    tools: 'Bricolaje',
    live: 'En directo',
    coming_soon: 'Pronto',
    home_tab: 'Inicio',
    categories_tab: 'Categorías',
    sell_tab: 'Vender',
    map_tab: 'Cerca',
    account_tab: 'Perfil',
    live_streams: 'Directos ahora',
    tap_city: 'Toca una ciudad para ver sus directos',
    streams_live: 'directo(s) ahora',
    skip: 'Saltar',
    activity_tab: 'Actividad',
    purchases_tab: 'Compras',
    auctions_tab: 'Subastas',
    offers_tab: 'Ofertas',
    saved_tab: 'Guardados',
    filter_all: 'Todas',
    filter_active: 'En curso',
    filter_completed: 'Finalizadas',
    filter_refunds: 'Reembolsos',
    giftTitle: 'Regalo sorpresa',
    giftParticipants: 'participantes',
    giftEnter: 'Participar',
    giftEntered: 'Inscrito',
    giftDraw: 'Sortear',
    giftWinner: '¡ha ganado el regalo!',
    giftPrizePlaceholder: 'Describe el regalo...',
    giftLaunch: 'Lanzar el regalo',
    giftActive: 'Regalo en curso',
    giftCancel: 'Cancelar',
    language: 'Idioma',
    loading: 'Cargando',
    offline: 'Sin conexión a internet',
    skip_to_content: 'Ir al contenido',
  },
  ru: {
    search_placeholder: 'Поиск в ShaPop',
    detecting_location: 'Определяем местоположение...',
    all_cities: 'Все города',
    for_you: 'Моя лента',
    following: 'Подписки',
    fashion_w: 'Женщинам',
    fashion_m: 'Мужчинам',
    sneakers: 'Кроссовки',
    bags: 'Сумки',
    jewelry: 'Украшения',
    watches: 'Часы',
    beauty: 'Красота',
    electronics: 'Техника',
    gaming: 'Игры',
    cards: 'Карточки',
    toys: 'Игрушки',
    vintage: 'Винтаж',
    art: 'Искусство',
    furniture: 'Мебель',
    home: 'Дом',
    sports: 'Спорт',
    fitness: 'Фитнес',
    music: 'Музыка',
    books: 'Книги',
    kids: 'Детям',
    pets: 'Животные',
    auto: 'Авто и мото',
    garden: 'Сад',
    food: 'Еда',
    handmade: 'Ручная работа',
    collect: 'Коллекции',
    photo: 'Фото',
    tools: 'Инструменты',
    live: 'В эфире',
    coming_soon: 'Скоро',
    home_tab: 'Главная',
    categories_tab: 'Категории',
    sell_tab: 'Продать',
    map_tab: 'Рядом',
    account_tab: 'Профиль',
    live_streams: 'Эфиры сейчас',
    tap_city: 'Нажми на город, чтобы увидеть эфиры',
    streams_live: 'эфир(ов) сейчас',
    skip: 'Пропустить',
    activity_tab: 'Активность',
    purchases_tab: 'Покупки',
    auctions_tab: 'Аукционы',
    offers_tab: 'Предложения',
    saved_tab: 'Сохранённые',
    filter_all: 'Все',
    filter_active: 'Активные',
    filter_completed: 'Завершённые',
    filter_refunds: 'Возвраты',
    giftTitle: 'Подарок-сюрприз',
    giftParticipants: 'участников',
    giftEnter: 'Участвовать',
    giftEntered: 'Ты участвуешь',
    giftDraw: 'Разыграть',
    giftWinner: 'выиграл(а) подарок!',
    giftPrizePlaceholder: 'Опиши подарок...',
    giftLaunch: 'Запустить розыгрыш',
    giftActive: 'Розыгрыш идёт',
    giftCancel: 'Отмена',
    language: 'Язык',
    loading: 'Загрузка',
    offline: 'Нет подключения к интернету',
    skip_to_content: 'Перейти к содержимому',
  },
  he: {
    search_placeholder: 'חיפוש בשאפופ',
    detecting_location: 'מזהה מיקום...',
    all_cities: 'כל הערים',
    for_you: 'הפיד שלי',
    following: 'נעקבים',
    fashion_w: 'נשים',
    fashion_m: 'גברים',
    sneakers: 'סניקרס',
    bags: 'תיקים',
    jewelry: 'תכשיטים',
    watches: 'שעונים',
    beauty: 'יופי',
    electronics: 'טק',
    gaming: 'גיימינג',
    cards: 'קלפים',
    toys: 'צעצועים',
    vintage: 'וינטג׳',
    art: 'אמנות',
    furniture: 'רהיטים',
    home: 'בית',
    sports: 'ספורט',
    fitness: 'כושר',
    music: 'מוזיקה',
    books: 'ספרים',
    kids: 'ילדים',
    pets: 'חיות מחמד',
    auto: 'רכב',
    garden: 'גינה',
    food: 'אוכל',
    handmade: 'עבודת יד',
    collect: 'אספנות',
    photo: 'צילום',
    tools: 'כלים',
    live: 'בשידור',
    coming_soon: 'בקרוב',
    home_tab: 'בית',
    categories_tab: 'קטגוריות',
    sell_tab: 'מכירה',
    map_tab: 'קרוב אליי',
    account_tab: 'פרופיל',
    live_streams: 'שידורים חיים',
    tap_city: 'הקש על עיר כדי לראות שידורים',
    streams_live: 'שידורים חיים',
    skip: 'דלג',
    activity_tab: 'פעילות',
    purchases_tab: 'רכישות',
    auctions_tab: 'מכרזים',
    offers_tab: 'הצעות',
    saved_tab: 'שמורים',
    filter_all: 'הכל',
    filter_active: 'פעילות',
    filter_completed: 'הסתיימו',
    filter_refunds: 'החזרים',
    giftTitle: 'מתנת הפתעה',
    giftParticipants: 'משתתפים',
    giftEnter: 'להשתתף',
    giftEntered: 'נרשמת',
    giftDraw: 'הגרלה',
    giftWinner: 'זכה/תה במתנה!',
    giftPrizePlaceholder: 'תאר/י את המתנה...',
    giftLaunch: 'השקת המתנה',
    giftActive: 'מתנה פעילה',
    giftCancel: 'ביטול',
    language: 'שפה',
    loading: 'טוען',
    offline: 'אין חיבור לאינטרנט',
    skip_to_content: 'דלג לתוכן',
  },
} as const

export type TranslationKey = keyof typeof translations['en']

const STORAGE_KEY = 'shapop_lang'

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v)
}

/** Langue du téléphone si elle est couverte, sinon anglais. */
export function detectDeviceLang(): Lang {
  const candidates: string[] = []
  try {
    if (typeof navigator !== 'undefined') {
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages)
      if (navigator.language) candidates.push(navigator.language)
    }
  } catch { /* rien */ }
  for (const c of candidates) {
    let code = String(c || '').slice(0, 2).toLowerCase()
    if (code === 'iw') code = 'he' // ancien code de l'hébreu
    if (isLang(code)) return code
  }
  return DEFAULT_LANG
}

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return isLang(v) ? v : null
  } catch {
    return null
  }
}

/** L'utilisateur a-t-il choisi sa langue lui-même ? */
export function hasChosenLang(): boolean {
  return readStored() !== null
}

export function getLang(): Lang {
  return readStored() || detectDeviceLang()
}

export function isRTL(lang: Lang = getLang()): boolean {
  return RTL_LANGS.includes(lang)
}

export function getDir(lang: Lang = getLang()): 'rtl' | 'ltr' {
  return isRTL(lang) ? 'rtl' : 'ltr'
}

export function getLocale(lang: Lang = getLang()): string {
  return LANG_META[lang].locale
}

/** Pose lang + dir sur <html> (lecteurs d'écran, césure, sens par défaut). */
export function applyDocumentLang(lang: Lang = getLang()) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
  document.documentElement.dir = getDir(lang)
}

// ----- Abonnement : tout l'écran se met à jour au changement de langue -----
const listeners = new Set<() => void>()
type LangChangeHook = (lang: Lang) => void
let onChangeHook: LangChangeHook | null = null

/** Appelé à chaque changement (ex. : enregistrer la langue dans le profil). */
export function setLangChangeHook(fn: LangChangeHook | null) {
  onChangeHook = fn
}

export function setLang(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* rien */ }
  applyDocumentLang(lang)
  listeners.forEach(l => l())
  try { onChangeHook?.(lang) } catch { /* rien */ }
}

export function subscribeLang(cb: () => void): () => void {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) cb() }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
    window.addEventListener('languagechange', cb)
  }
  return () => {
    listeners.delete(cb)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('languagechange', cb)
    }
  }
}

/** Langue courante, réactive (le composant se redessine au changement). */
export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, getLang)
}

/** Choisit le texte de la langue courante dans un dictionnaire des 5 langues. */
export function tr<T>(dict: Localized<T>, lang: Lang = getLang()): T {
  return dict[lang] ?? dict[DEFAULT_LANG]
}

export function t(lang: string, key: TranslationKey): string {
  const l: Lang = isLang(lang) ? lang : DEFAULT_LANG
  return translations[l][key] || translations[DEFAULT_LANG][key]
}

export const I18N_TRANSLATIONS = translations
