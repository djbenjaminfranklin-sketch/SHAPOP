import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import { getLang, t as i18nT } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n'
import { categories } from '../CategoryIcons'
import {
  subCategories,
  sellingLocations,
  platforms,
  revenueRanges,
  teamSizes,
  weeklyHours,
  bankOptions,
} from './SubCategoryData'

interface Props {
  onComplete: () => void
  onClose: () => void
}

const TOTAL_STEPS = 12

/* ─── Step hero illustrations (emoji in gradient circles) ─── */
const stepHeroes: { emoji: string; gradient: string }[] = [
  { emoji: '\u{1F4DC}', gradient: 'linear-gradient(135deg, #F0908A 0%, #E8344E 60%, #B91C3C 100%)' },  // 0 rules
  { emoji: '\u{1F6CD}\u{FE0F}', gradient: 'linear-gradient(135deg, #F0908A 0%, #F59E0B 60%, #D97706 100%)' },  // 1 category
  { emoji: '\u{1F3AF}', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 60%, #4C1D95 100%)' },  // 2 sub
  { emoji: '\u{1F464}', gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 60%, #1D4ED8 100%)' },  // 3 type
  { emoji: '\u{1F30D}', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 60%, #047857 100%)' },  // 4 where
  { emoji: '\u{1F4F1}', gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 60%, #BE185D 100%)' },  // 5 platforms
  { emoji: '\u{1F4B0}', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 60%, #B45309 100%)' },  // 6 revenue
  { emoji: '\u{1F465}', gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 60%, #4338CA 100%)' },  // 7 team
  { emoji: '\u{1F3A5}', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 60%, #B91C1C 100%)' },  // 8 hours
  { emoji: '\u{1F4E6}', gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 60%, #0F766E 100%)' },  // 9 address
  { emoji: '\u{1F504}', gradient: 'linear-gradient(135deg, #10B981 0%, #0D9488 60%, #0F766E 100%)' },  // 10 return policy
  { emoji: '\u{1F3E6}', gradient: 'linear-gradient(135deg, #F0908A 0%, #E8344E 60%, #9F1239 100%)' },  // 11 bank
]

export default function OnboardingWizard({ onComplete, onClose }: Props) {
  const { user, profile } = useAuth()
  const lang = getLang()

  const [step, setStep] = useState(0)
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [feesAccepted, setFeesAccepted] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([])
  const [sellerType, setSellerType] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [etsyUrl, setEtsyUrl] = useState('')
  const [revenue, setRevenue] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [liveHours, setLiveHours] = useState('')
  const [useExistingAddress, setUseExistingAddress] = useState(true)
  const [address, setAddress] = useState({ street: '', city: '', zip: '', country: '' })
  const [returnPolicy, setReturnPolicy] = useState('no_return')
  const [bankChoice, setBankChoice] = useState('')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [saving, setSaving] = useState(false)

  /* ─── Animated step transitions ─── */
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')
  const [visible, setVisible] = useState(true)
  const prevStep = useRef(step)

  useEffect(() => {
    if (prevStep.current !== step) {
      setSlideDir(step > prevStep.current ? 'left' : 'right')
      setVisible(false)
      const timer = setTimeout(() => {
        setVisible(true)
      }, 60)
      prevStep.current = step
      return () => clearTimeout(timer)
    }
  }, [step])

  const txt = {
    fr: {
      rules: 'Regles de la communaute',
      rule1: 'Sois honnete sur l\'etat du produit',
      rule2: 'Expedie sous 3 jours ouvrables',
      rule3: 'Pas d\'articles contrefaits ou interdits',
      rule4: 'Reponds aux acheteurs sous 24h',
      rule5: 'Respecte tous les acheteurs et vendeurs',
      understood: 'J\'ai compris !',
      accept: 'J\'accepte les regles',
      feesTitle: 'Grille tarifaire',
      fee1: 'Commission plateforme : 8% HT + TVA (9,60% TTC)',
      fee2: 'Frais Stripe : 2,9% + 0,30\u20AC HT + TVA (3,48% + 0,36\u20AC TTC)',
      fee3: 'Exemple : sur 50\u20AC, frais totaux 6,90\u20AC, vous recevez 43,10\u20AC',
      fee4: 'Versements hebdomadaires, seuil minimum 50\u20AC',
      acceptFees: 'J\'accepte la grille tarifaire',
      category: 'Que vends-tu ?',
      categoryDesc: 'Choisis ta categorie principale',
      subCategory: 'Plus precisement...',
      subCategoryDesc: 'Selectionne tout ce qui correspond',
      type: 'Tu es...',
      individual: 'Particulier',
      individualDesc: 'Vente d\'objets personnels ou petit hobby',
      business: 'Entreprise',
      businessDesc: 'Commerce enregistre ou vendeur professionnel',
      whereSell: 'Ou vends-tu actuellement ?',
      whereSellDesc: 'Selectionne tout ce qui correspond',
      platformsTitle: 'Quelles plateformes ?',
      platformsDesc: 'Selectionne celles que tu utilises',
      etsyUrl: 'URL de ta boutique Etsy',
      revenueTitle: 'Chiffre d\'affaires mensuel ?',
      revenueDesc: 'De tous tes canaux de vente',
      teamTitle: 'Taille de l\'equipe ?',
      teamDesc: 'Combien de personnes travaillent avec toi',
      hoursTitle: 'Heures de live par semaine ?',
      hoursDesc: 'Ou combien tu prevois d\'en faire',
      addressTitle: 'Adresse de retour',
      addressDesc: 'Ou les acheteurs peuvent retourner les articles',
      useExisting: 'Utiliser mon adresse de profil',
      newAddress: 'Saisir une nouvelle adresse',
      street: 'Adresse',
      city: 'Ville',
      zip: 'Code postal',
      country: 'Pays',
      returnPolicyTitle: 'Politique de retour',
      returnPolicyDesc: 'Quelle est ta politique pour les retours ?',
      noReturn: 'Aucun retour',
      exchangeOnly: 'Echanges uniquement',
      return7: 'Retours sous 7 jours',
      return14: 'Retours sous 14 jours',
      return30: 'Retours sous 30 jours',
      bankTitle: 'Configuration du paiement',
      bankDesc: 'Comment tu veux etre paye',
      paypalEmailLabel: 'Ton email PayPal',
      paypalEmailPlaceholder: 'email@paypal.com',
      paypalEmailHint: 'L\'email associe a ton compte PayPal Business',
      next: 'Suivant',
      finish: 'Terminer',
      saving: 'Enregistrement...',
      back: 'Retour',
    },
    en: {
      rules: 'Community Rules',
      rule1: 'Be honest about product condition',
      rule2: 'Ship within 3 business days',
      rule3: 'No counterfeit or prohibited items',
      rule4: 'Respond to buyers within 24 hours',
      rule5: 'Respect all buyers and sellers',
      understood: 'I understand!',
      accept: 'I accept the rules',
      feesTitle: 'Fee Schedule',
      fee1: 'Platform commission: 8% + VAT (9.60% incl. VAT)',
      fee2: 'Stripe processing: 2.9% + \u20AC0.30 + VAT (3.48% + \u20AC0.36 incl. VAT)',
      fee3: 'Example: on \u20AC50 sale, total fees \u20AC6.90, you receive \u20AC43.10',
      fee4: 'Weekly payouts, minimum threshold \u20AC50',
      acceptFees: 'I accept the fee schedule',
      category: 'What do you sell?',
      categoryDesc: 'Pick your main category',
      subCategory: 'More specifically...',
      subCategoryDesc: 'Select all that apply',
      type: 'Are you a...',
      individual: 'Individual',
      individualDesc: 'Selling personal items or small hobby',
      business: 'Business',
      businessDesc: 'Registered business or professional seller',
      whereSell: 'Where do you currently sell?',
      whereSellDesc: 'Select all that apply',
      platformsTitle: 'Which platforms?',
      platformsDesc: 'Select the ones you use',
      etsyUrl: 'Your Etsy shop URL',
      revenueTitle: 'Monthly revenue?',
      revenueDesc: 'From all your selling channels',
      teamTitle: 'Team size?',
      teamDesc: 'How many people work with you',
      hoursTitle: 'Hours of live per week?',
      hoursDesc: 'Or how many you plan to do',
      addressTitle: 'Return address',
      addressDesc: 'Where buyers can return items',
      useExisting: 'Use my profile address',
      newAddress: 'Enter a new address',
      street: 'Street address',
      city: 'City',
      zip: 'ZIP code',
      country: 'Country',
      returnPolicyTitle: 'Return policy',
      returnPolicyDesc: 'What is your return policy?',
      noReturn: 'No returns',
      exchangeOnly: 'Exchanges only',
      return7: 'Returns within 7 days',
      return14: 'Returns within 14 days',
      return30: 'Returns within 30 days',
      bankTitle: 'Payment setup',
      bankDesc: 'How you want to get paid',
      paypalEmailLabel: 'Your PayPal email',
      paypalEmailPlaceholder: 'email@paypal.com',
      paypalEmailHint: 'The email linked to your PayPal Business account',
      next: 'Next',
      finish: 'Finish',
      saving: 'Saving...',
      back: 'Back',
    },
    he: {
      rules: 'כללי הקהילה',
      rule1: 'היה כנה לגבי מצב המוצר',
      rule2: 'שלח תוך 3 ימי עסקים',
      rule3: 'ללא פריטים מזויפים או אסורים',
      rule4: 'ענה לקונים תוך 24 שעות',
      rule5: 'כבד את כל הקונים והמוכרים',
      understood: '!הבנתי',
      accept: '\u05D0\u05E0\u05D9 \u05DE\u05E7\u05D1\u05DC \u05D0\u05EA \u05D4\u05DB\u05DC\u05DC\u05D9\u05DD',
      feesTitle: '\u05DC\u05D5\u05D7 \u05E2\u05DE\u05DC\u05D5\u05EA',
      fee1: '\u05E2\u05DE\u05DC\u05EA \u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4: 8% + \u05DE\u05E2"\u05DE (9.60% \u05DB\u05D5\u05DC\u05DC \u05DE\u05E2"\u05DE)',
      fee2: '\u05E2\u05D9\u05D1\u05D5\u05D3 Stripe: 2.9% + 0.30\u20AC + \u05DE\u05E2"\u05DE (3.48% + 0.36\u20AC)',
      fee3: '\u05D3\u05D5\u05D2\u05DE\u05D4: \u05DE\u05DE\u05DB\u05D9\u05E8\u05D4 \u05E9\u05DC 50\u20AC, \u05E2\u05DE\u05DC\u05D5\u05EA 6.90\u20AC, \u05DE\u05E7\u05D1\u05DC\u05D9\u05DD 43.10\u20AC',
      fee4: '\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05E9\u05D1\u05D5\u05E2\u05D9\u05D9\u05DD, \u05E1\u05E3 \u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD 50\u20AC',
      acceptFees: '\u05D0\u05E0\u05D9 \u05DE\u05E7\u05D1\u05DC \u05D0\u05EA \u05DC\u05D5\u05D7 \u05D4\u05E2\u05DE\u05DC\u05D5\u05EA',
      category: '?מה אתה מוכר',
      categoryDesc: 'בחר את הקטגוריה הראשית',
      subCategory: '...ליתר דיוק',
      subCategoryDesc: 'בחר את כל המתאימים',
      type: '?אתה',
      individual: 'פרטי',
      individualDesc: 'מכירת פריטים אישיים או תחביב',
      business: 'עסק',
      businessDesc: 'עסק רשום או מוכר מקצועי',
      whereSell: '?איפה אתה מוכר כרגע',
      whereSellDesc: 'בחר את כל המתאימים',
      platformsTitle: '?באילו פלטפורמות',
      platformsDesc: 'בחר את אלו שאתה משתמש',
      etsyUrl: 'כתובת חנות Etsy שלך',
      revenueTitle: '?הכנסה חודשית',
      revenueDesc: 'מכל ערוצי המכירה שלך',
      teamTitle: '?גודל הצוות',
      teamDesc: 'כמה אנשים עובדים איתך',
      hoursTitle: '?שעות שידור חי בשבוע',
      hoursDesc: 'או כמה אתה מתכנן לעשות',
      addressTitle: 'כתובת החזרה',
      addressDesc: 'לאן קונים יכולים להחזיר פריטים',
      useExisting: 'השתמש בכתובת הפרופיל שלי',
      newAddress: 'הכנס כתובת חדשה',
      street: 'כתובת רחוב',
      city: 'עיר',
      zip: 'מיקוד',
      country: 'מדינה',
      returnPolicyTitle: 'מדיניות החזרות',
      returnPolicyDesc: 'מה מדיניות ההחזרות שלך?',
      noReturn: 'ללא החזרות',
      exchangeOnly: 'החלפות בלבד',
      return7: 'החזרות תוך 7 ימים',
      return14: 'החזרות תוך 14 ימים',
      return30: 'החזרות תוך 30 ימים',
      bankTitle: 'הגדרת תשלום',
      bankDesc: 'איך תרצה לקבל תשלום',
      paypalEmailLabel: 'אימייל PayPal שלך',
      paypalEmailPlaceholder: 'email@paypal.com',
      paypalEmailHint: 'האימייל המקושר לחשבון PayPal Business שלך',
      next: 'הבא',
      finish: 'סיום',
      saving: '...שומר',
      back: 'חזרה',
    },
    es: {
      rules: 'Reglas de la comunidad',
      rule1: 'S\u00E9 honesto sobre el estado del producto',
      rule2: 'Env\u00EDa en 3 d\u00EDas h\u00E1biles',
      rule3: 'Sin art\u00EDculos falsificados o prohibidos',
      rule4: 'Responde a los compradores en 24 horas',
      rule5: 'Respeta a todos los compradores y vendedores',
      understood: '\u00A1Entendido!',
      accept: 'Acepto las reglas',
      feesTitle: 'Tabla de comisiones',
      fee1: 'Comisi\u00F3n plataforma: 8% + IVA (9,60% IVA incl.)',
      fee2: 'Procesamiento Stripe: 2,9% + 0,30\u20AC + IVA (3,48% + 0,36\u20AC)',
      fee3: 'Ejemplo: venta de 50\u20AC, comisiones 6,90\u20AC, recibes 43,10\u20AC',
      fee4: 'Pagos semanales, umbral m\u00EDnimo 50\u20AC',
      acceptFees: 'Acepto la tabla de comisiones',
      category: '\u00BFQu\u00E9 vendes?',
      categoryDesc: 'Elige tu categor\u00EDa principal',
      subCategory: 'M\u00E1s espec\u00EDficamente...',
      subCategoryDesc: 'Selecciona todo lo que aplique',
      type: '\u00BFEres un...?',
      individual: 'Particular',
      individualDesc: 'Venta de art\u00EDculos personales o peque\u00F1o hobby',
      business: 'Empresa',
      businessDesc: 'Negocio registrado o vendedor profesional',
      whereSell: '\u00BFD\u00F3nde vendes actualmente?',
      whereSellDesc: 'Selecciona todo lo que aplique',
      platformsTitle: '\u00BFEn qu\u00E9 plataformas?',
      platformsDesc: 'Selecciona las que utilices',
      etsyUrl: 'URL de tu tienda Etsy',
      revenueTitle: '\u00BFIngresos mensuales?',
      revenueDesc: 'De todos tus canales de venta',
      teamTitle: '\u00BFTama\u00F1o del equipo?',
      teamDesc: '\u00BFCu\u00E1ntas personas trabajan contigo?',
      hoursTitle: '\u00BFHoras de directo por semana?',
      hoursDesc: 'O cu\u00E1ntas planeas hacer',
      addressTitle: 'Direcci\u00F3n de devoluci\u00F3n',
      addressDesc: 'Donde los compradores pueden devolver art\u00EDculos',
      useExisting: 'Usar mi direcci\u00F3n de perfil',
      newAddress: 'Introducir nueva direcci\u00F3n',
      street: 'Direcci\u00F3n',
      city: 'Ciudad',
      zip: 'C\u00F3digo postal',
      country: 'Pa\u00EDs',
      returnPolicyTitle: 'Pol\u00EDtica de devoluci\u00F3n',
      returnPolicyDesc: '\u00BFCu\u00E1l es tu pol\u00EDtica de devoluci\u00F3n?',
      noReturn: 'Sin devoluciones',
      exchangeOnly: 'Solo cambios',
      return7: 'Devoluciones en 7 d\u00EDas',
      return14: 'Devoluciones en 14 d\u00EDas',
      return30: 'Devoluciones en 30 d\u00EDas',
      bankTitle: 'Configuraci\u00F3n de pago',
      bankDesc: '\u00BFC\u00F3mo quieres recibir los pagos?',
      paypalEmailLabel: 'Tu email de PayPal',
      paypalEmailPlaceholder: 'email@paypal.com',
      paypalEmailHint: 'El email vinculado a tu cuenta PayPal Business',
      next: 'Siguiente',
      finish: 'Finalizar',
      saving: 'Guardando...',
      back: 'Atr\u00E1s',
    },
  }

  const t = txt[lang as keyof typeof txt] || txt.fr

  // Filter categories: remove 'for_you' and 'following' (not real selling categories)
  const sellingCategories = categories.filter(c => c.id !== 'for_you' && c.id !== 'following')

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return rulesAccepted && feesAccepted
      case 1: return selectedCategory !== ''
      case 2: return selectedSubCategories.length > 0
      case 3: return sellerType !== ''
      case 4: return selectedLocations.length > 0
      case 5: return selectedPlatforms.length > 0 || selectedLocations.includes('nowhere')
      case 6: return revenue !== ''
      case 7: return teamSize !== ''
      case 8: return liveHours !== ''
      case 9: return useExistingAddress || (address.street !== '' && address.city !== '' && address.zip !== '' && address.country !== '')
      case 10: return returnPolicy !== ''
      case 11: return bankChoice !== '' && (bankChoice !== 'paypal' || (paypalEmail.includes('@') && paypalEmail.includes('.')))
      default: return false
    }
  }

  const handleFinish = async () => {
    if (!user) return
    setSaving(true)
    try {
      // Update profile to seller
      await supabase.from('profiles').update({ is_seller: true }).eq('id', user.id)

      // Check if seller record exists
      const { data: existingSeller } = await supabase
        .from('sellers')
        .select('id')
        .eq('id', user.id)
        .single()

      const sellerData = {
        store_name: profile?.display_name || profile?.username || 'My Store',
        categories: [selectedCategory],
        sub_categories: selectedSubCategories,
        seller_type: sellerType,
        selling_locations: selectedLocations,
        platforms: selectedPlatforms,
        etsy_url: etsyUrl || null,
        revenue_range: revenue,
        team_size: teamSize,
        live_hours: liveHours,
        return_address: useExistingAddress ? null : address,
        return_policy: returnPolicy,
        bank_choice: bankChoice,
        fees_accepted_at: new Date().toISOString(),
        onboarding_completed_at: new Date().toISOString(),
      }

      if (existingSeller) {
        await supabase.from('sellers').update(sellerData).eq('id', user.id)
      } else {
        await supabase.from('sellers').insert({ id: user.id, ...sellerData })
      }

      // If PayPal selected, save email via API
      if (bankChoice === 'paypal' && paypalEmail) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            await apiFetch('/api/paypal/save-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ email: paypalEmail }),
            })
          }
        } catch {
          // PayPal email save failed — seller can retry from PaymentsPage
        }
      }

      onComplete()
    } catch {
      // Onboarding save failed
    } finally {
      setSaving(false)
    }
  }

  const handleNext = () => {
    if (step === TOTAL_STEPS - 1) {
      handleFinish()
    } else {
      setStep(step + 1)
    }
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const rules = [
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2"><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10"/></svg>, text: t.rule1 },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h2a2 2 0 012 2v6a2 2 0 01-2 2H6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, text: t.rule2 },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2"><path d="M18.36 6.64A9 9 0 015.64 18.36M5.64 5.64A9 9 0 0118.36 18.36" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>, text: t.rule3 },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>, text: t.rule4 },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round"/></svg>, text: t.rule5 },
  ]

  const toggleMultiSelect = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  /* ─── Reusable style helpers ─── */
  const heroCircle = (stepIdx: number) => ({
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    background: stepHeroes[stepIdx].gradient,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontSize: '40px',
    boxShadow: '0 8px 32px rgba(240,144,138,0.25), 0 0 0 6px rgba(240,144,138,0.08)',
    margin: '0 auto 24px',
  })

  const sectionTitle = {
    fontSize: '28px',
    fontWeight: 800 as const,
    color: '#fff',
    marginBottom: '6px',
    textAlign: 'center' as const,
    letterSpacing: '-0.5px',
    lineHeight: 1.2,
  }

  const sectionDesc = {
    fontSize: '15px',
    color: '#888',
    marginBottom: '28px',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  }

  const glassCard = (selected: boolean) => ({
    background: selected
      ? 'linear-gradient(135deg, rgba(240,144,138,0.12) 0%, rgba(232,52,78,0.08) 100%)'
      : 'linear-gradient(135deg, #141414 0%, #0C0C0C 100%)',
    border: selected ? '1.5px solid rgba(240,144,138,0.6)' : '1px solid #1E1E1E',
    borderRadius: '16px',
    cursor: 'pointer',
    boxShadow: selected
      ? '0 4px 20px rgba(240,144,138,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
  })

  const radioCircle = (selected: boolean) => ({
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: selected ? 'none' : '2px solid #444',
    background: selected ? 'linear-gradient(135deg, #F0908A, #E8344E)' : 'transparent',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0 as const,
    boxShadow: selected ? '0 2px 8px rgba(240,144,138,0.4)' : 'none',
  })

  const checkboxSquare = (selected: boolean) => ({
    width: '24px',
    height: '24px',
    borderRadius: '8px',
    border: selected ? 'none' : '2px solid #444',
    background: selected ? 'linear-gradient(135deg, #F0908A, #E8344E)' : 'transparent',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0 as const,
    boxShadow: selected ? '0 2px 8px rgba(240,144,138,0.4)' : 'none',
  })

  const checkIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  const innerDot = (
    <div style={{
      width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff',
    }} />
  )

  const renderStep = () => {
    switch (step) {
      // Step 0 - Rules
      case 0:
        return (
          <div style={{ padding: '0 24px' }}>
            {/* Hero */}
            <div style={heroCircle(0)}>{stepHeroes[0].emoji}</div>
            <h2 style={sectionTitle}>{t.rules}</h2>
            <p style={{ ...sectionDesc, marginBottom: '20px' }}>
              {lang === 'fr' ? 'Lis et accepte nos regles' : lang === 'he' ? 'אנא קרא והסכם לכללים שלנו' : lang === 'es' ? 'Lee y acepta nuestras reglas' : 'Please read and agree to our rules'}
            </p>

            {/* Rules card with gradient border */}
            <div style={{
              background: 'linear-gradient(135deg, #0F0F0F 0%, #141418 50%, #0F0F0F 100%)',
              borderRadius: '20px',
              border: '1px solid #1A1A1A',
              padding: '6px 0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}>
              {rules.map((rule, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '18px 20px',
                  borderBottom: i < rules.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(240,144,138,0.12) 0%, rgba(232,52,78,0.06) 100%)',
                    border: '1px solid rgba(240,144,138,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {rule.icon}
                  </div>
                  <span style={{ fontSize: '15px', color: '#D4D4D4', lineHeight: 1.5, fontWeight: 500 }}>{rule.text}</span>
                </div>
              ))}
            </div>

            {/* Accept rules checkbox */}
            <button
              onClick={() => setRulesAccepted(!rulesAccepted)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px', marginTop: '24px',
                padding: '18px 20px', borderRadius: '16px', width: '100%',
                background: rulesAccepted
                  ? 'linear-gradient(135deg, rgba(240,144,138,0.12) 0%, rgba(232,52,78,0.06) 100%)'
                  : 'linear-gradient(135deg, #141414, #0C0C0C)',
                border: rulesAccepted ? '1.5px solid rgba(240,144,138,0.5)' : '1px solid #1E1E1E',
                cursor: 'pointer',
                boxShadow: rulesAccepted
                  ? '0 4px 20px rgba(240,144,138,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div style={checkboxSquare(rulesAccepted)}>
                {rulesAccepted && checkIcon}
              </div>
              <span style={{ fontSize: '16px', color: '#fff', fontWeight: 700 }}>{t.accept}</span>
            </button>

            {/* Fee schedule card */}
            <div style={{
              background: 'linear-gradient(135deg, #0F0F0F 0%, #141418 50%, #0F0F0F 100%)',
              borderRadius: '20px',
              border: '1px solid #1A1A1A',
              padding: '20px',
              marginTop: '24px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', flexShrink: 0,
                }}>
                  {'\u{1F4B0}'}
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>{t.feesTitle}</h3>
              </div>
              {[t.fee1, t.fee2, t.fee3, t.fee4].map((fee, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ color: '#F59E0B', fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>
                    {i < 2 ? '\u{2022}' : i === 2 ? '\u{1F4CA}' : '\u{1F4C5}'}
                  </span>
                  <span style={{ fontSize: '14px', color: '#D4D4D4', lineHeight: 1.5 }}>{fee}</span>
                </div>
              ))}
            </div>

            {/* Accept fees checkbox */}
            <button
              onClick={() => setFeesAccepted(!feesAccepted)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px', marginTop: '14px',
                padding: '18px 20px', borderRadius: '16px', width: '100%',
                background: feesAccepted
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.06) 100%)'
                  : 'linear-gradient(135deg, #141414, #0C0C0C)',
                border: feesAccepted ? '1.5px solid rgba(245,158,11,0.5)' : '1px solid #1E1E1E',
                cursor: 'pointer',
                boxShadow: feesAccepted
                  ? '0 4px 20px rgba(245,158,11,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{
                ...checkboxSquare(feesAccepted),
                background: feesAccepted ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'transparent',
                boxShadow: feesAccepted ? '0 2px 8px rgba(245,158,11,0.4)' : 'none',
              }}>
                {feesAccepted && checkIcon}
              </div>
              <span style={{ fontSize: '16px', color: '#fff', fontWeight: 700 }}>{t.acceptFees}</span>
            </button>
          </div>
        )

      // Step 1 - Category
      case 1:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(1)}>{stepHeroes[1].emoji}</div>
            <h2 style={sectionTitle}>{t.category}</h2>
            <p style={sectionDesc}>{t.categoryDesc}</p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
            }}>
              {sellingCategories.map(cat => {
                const selected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      setSelectedSubCategories([])
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                      padding: '14px 6px 12px', borderRadius: '18px',
                      background: selected
                        ? 'linear-gradient(135deg, rgba(240,144,138,0.15) 0%, rgba(232,52,78,0.08) 100%)'
                        : 'linear-gradient(160deg, #161616 0%, #0E0E0E 100%)',
                      border: selected ? '2px solid #F0908A' : '1px solid #1C1C1C',
                      cursor: 'pointer',
                      boxShadow: selected
                        ? '0 4px 20px rgba(240,144,138,0.2)'
                        : '0 2px 8px rgba(0,0,0,0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Shimmer overlay on selected */}
                    {selected && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(240,144,138,0.4), transparent)',
                      }} />
                    )}
                    {cat.image ? (
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden',
                        boxShadow: selected
                          ? '0 4px 12px rgba(240,144,138,0.3)'
                          : '0 2px 6px rgba(0,0,0,0.4)',
                        border: selected ? '2px solid rgba(240,144,138,0.3)' : '1px solid #222',
                      }}>
                        <img
                          src={cat.image}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', fontWeight: 800, color: '#fff',
                        boxShadow: '0 4px 12px rgba(232,52,78,0.3)',
                      }}>
                        {cat.label.charAt(0)}
                      </div>
                    )}
                    <span style={{
                      fontSize: '11px', fontWeight: selected ? 700 : 600,
                      color: selected ? '#F0908A' : '#AAA',
                      textAlign: 'center', lineHeight: 1.2,
                    }}>
                      {i18nT(lang, cat.id as TranslationKey)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )

      // Step 2 - Sub-categories
      case 2: {
        const subs = subCategories[selectedCategory] || []
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(2)}>{stepHeroes[2].emoji}</div>
            <h2 style={sectionTitle}>{t.subCategory}</h2>
            <p style={sectionDesc}>{t.subCategoryDesc}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              {subs.map(sub => {
                const selected = selectedSubCategories.includes(sub)
                return (
                  <button
                    key={sub}
                    onClick={() => toggleMultiSelect(selectedSubCategories, setSelectedSubCategories, sub)}
                    style={{
                      padding: '10px 18px', borderRadius: '24px',
                      background: selected
                        ? 'linear-gradient(135deg, rgba(240,144,138,0.18) 0%, rgba(232,52,78,0.08) 100%)'
                        : 'linear-gradient(135deg, #151515 0%, #0E0E0E 100%)',
                      border: selected ? '1.5px solid rgba(240,144,138,0.6)' : '1px solid #222',
                      color: selected ? '#F0908A' : '#BBB',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      boxShadow: selected
                        ? '0 2px 12px rgba(240,144,138,0.2)'
                        : '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {selected && '\u2713 '}{sub}
                  </button>
                )
              })}
            </div>
          </div>
        )
      }

      // Step 3 - Type
      case 3:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(3)}>{stepHeroes[3].emoji}</div>
            <h2 style={sectionTitle}>{t.type}</h2>
            <p style={{ ...sectionDesc, marginBottom: '32px' }}>
              {lang === 'fr' ? 'Choisis ton type de compte' : lang === 'he' ? 'בחר את סוג החשבון שלך' : lang === 'es' ? 'Elige tu tipo de cuenta' : 'Choose your account type'}
            </p>
            {[
              { id: 'individual', title: t.individual, desc: t.individualDesc, emoji: '\u{1F9D1}\u{200D}\u{1F4BB}', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
              { id: 'business', title: t.business, desc: t.businessDesc, emoji: '\u{1F3E2}', gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
            ].map(opt => {
              const selected = sellerType === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setSellerType(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', width: '100%',
                    padding: '20px 18px', marginBottom: '14px', textAlign: 'left',
                    ...glassCard(selected),
                  }}
                >
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: selected ? opt.gradient : 'linear-gradient(135deg, #1A1A1A, #141414)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: '26px',
                    boxShadow: selected ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {opt.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '17px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{opt.title}</p>
                    <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.4 }}>{opt.desc}</p>
                  </div>
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                </button>
              )
            })}
          </div>
        )

      // Step 4 - Where do you sell?
      case 4:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(4)}>{stepHeroes[4].emoji}</div>
            <h2 style={sectionTitle}>{t.whereSell}</h2>
            <p style={sectionDesc}>{t.whereSellDesc}</p>
            {sellingLocations.map(loc => {
              const label = lang === 'fr' ? loc.fr : lang === 'he' ? loc.he : lang === 'es' ? loc.es : loc.en
              const selected = selectedLocations.includes(loc.id)
              return (
                <button
                  key={loc.id}
                  onClick={() => toggleMultiSelect(selectedLocations, setSelectedLocations, loc.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', textAlign: 'left',
                    ...glassCard(selected),
                  }}
                >
                  <div style={checkboxSquare(selected)}>
                    {selected && checkIcon}
                  </div>
                  <span style={{
                    fontSize: '15px', color: selected ? '#fff' : '#BBB', fontWeight: 600,
                  }}>{label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 5 - Platforms
      case 5:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(5)}>{stepHeroes[5].emoji}</div>
            <h2 style={sectionTitle}>{t.platformsTitle}</h2>
            <p style={sectionDesc}>{t.platformsDesc}</p>
            {platforms.map(plat => {
              const selected = selectedPlatforms.includes(plat.id)
              return (
                <div key={plat.id}>
                  <button
                    onClick={() => toggleMultiSelect(selectedPlatforms, setSelectedPlatforms, plat.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                      padding: '16px 18px', marginBottom: '10px', textAlign: 'left',
                      ...glassCard(selected),
                    }}
                  >
                    <div style={checkboxSquare(selected)}>
                      {selected && checkIcon}
                    </div>
                    <span style={{
                      fontSize: '15px', color: selected ? '#fff' : '#BBB', fontWeight: 600,
                    }}>{plat.label}</span>
                  </button>
                  {plat.hasUrl && selected && (
                    <input
                      type="url"
                      value={etsyUrl}
                      onChange={e => setEtsyUrl(e.target.value)}
                      placeholder={t.etsyUrl}
                      style={{
                        width: '100%', padding: '14px 18px', marginBottom: '10px',
                        background: 'linear-gradient(135deg, #141414, #0C0C0C)',
                        border: '1px solid #2A2A2A', borderRadius: '14px',
                        color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s ease',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(240,144,138,0.5)' }}
                      onBlur={e => { e.target.style.borderColor = '#2A2A2A' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )

      // Step 6 - Revenue
      case 6:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(6)}>{stepHeroes[6].emoji}</div>
            <h2 style={sectionTitle}>{t.revenueTitle}</h2>
            <p style={sectionDesc}>{t.revenueDesc}</p>
            {revenueRanges.map(range => {
              const label = lang === 'fr' ? range.fr : lang === 'he' ? range.he : lang === 'es' ? range.es : range.en
              const selected = revenue === range.id
              return (
                <button
                  key={range.id}
                  onClick={() => setRevenue(range.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', textAlign: 'left',
                    ...glassCard(selected),
                  }}
                >
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                  <span style={{
                    fontSize: '15px', color: selected ? '#fff' : '#BBB', fontWeight: 600,
                  }}>{label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 7 - Team size
      case 7:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(7)}>{stepHeroes[7].emoji}</div>
            <h2 style={sectionTitle}>{t.teamTitle}</h2>
            <p style={sectionDesc}>{t.teamDesc}</p>
            {teamSizes.map(size => {
              const label = lang === 'fr' ? size.fr : lang === 'he' ? size.he : lang === 'es' ? size.es : size.en
              const selected = teamSize === size.id
              return (
                <button
                  key={size.id}
                  onClick={() => setTeamSize(size.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', textAlign: 'left',
                    ...glassCard(selected),
                  }}
                >
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                  <span style={{
                    fontSize: '15px', color: selected ? '#fff' : '#BBB', fontWeight: 600,
                  }}>{label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 8 - Weekly hours
      case 8:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(8)}>{stepHeroes[8].emoji}</div>
            <h2 style={sectionTitle}>{t.hoursTitle}</h2>
            <p style={sectionDesc}>{t.hoursDesc}</p>
            {weeklyHours.map(hours => {
              const label = lang === 'fr' ? hours.fr : lang === 'he' ? hours.he : lang === 'es' ? hours.es : hours.en
              const selected = liveHours === hours.id
              return (
                <button
                  key={hours.id}
                  onClick={() => setLiveHours(hours.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', textAlign: 'left',
                    ...glassCard(selected),
                  }}
                >
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                  <span style={{
                    fontSize: '15px', color: selected ? '#fff' : '#BBB', fontWeight: 600,
                  }}>{label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 9 - Return address
      case 9:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(9)}>{stepHeroes[9].emoji}</div>
            <h2 style={sectionTitle}>{t.addressTitle}</h2>
            <p style={sectionDesc}>{t.addressDesc}</p>

            {/* Toggle existing / new */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              {[
                { val: true, label: t.useExisting },
                { val: false, label: t.newAddress },
              ].map(opt => {
                const selected = useExistingAddress === opt.val
                return (
                  <button
                    key={String(opt.val)}
                    onClick={() => setUseExistingAddress(opt.val)}
                    style={{
                      flex: 1, padding: '14px 12px', borderRadius: '14px',
                      background: selected
                        ? 'linear-gradient(135deg, rgba(240,144,138,0.15) 0%, rgba(232,52,78,0.08) 100%)'
                        : 'linear-gradient(135deg, #141414 0%, #0C0C0C 100%)',
                      border: selected ? '1.5px solid rgba(240,144,138,0.5)' : '1px solid #1E1E1E',
                      color: selected ? '#F0908A' : '#777',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      boxShadow: selected ? '0 4px 16px rgba(240,144,138,0.12)' : '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {!useExistingAddress && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '14px',
                background: 'linear-gradient(135deg, #0F0F0F 0%, #141418 100%)',
                borderRadius: '20px', padding: '20px',
                border: '1px solid #1A1A1A',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              }}>
                {[
                  { key: 'street' as const, label: t.street },
                  { key: 'city' as const, label: t.city },
                  { key: 'zip' as const, label: t.zip },
                  { key: 'country' as const, label: t.country },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{
                      display: 'block', fontSize: '12px', color: '#777', marginBottom: '8px',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={address[field.key]}
                      onChange={e => setAddress({ ...address, [field.key]: e.target.value })}
                      style={{
                        width: '100%', padding: '14px 16px',
                        background: 'linear-gradient(135deg, #0A0A0A, #111)',
                        border: '1px solid #2A2A2A', borderRadius: '12px', color: '#fff',
                        fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s ease',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(240,144,138,0.5)' }}
                      onBlur={e => { e.target.style.borderColor = '#2A2A2A' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      // Step 10 - Return policy
      case 10:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(10)}>{stepHeroes[10].emoji}</div>
            <h2 style={sectionTitle}>{t.returnPolicyTitle}</h2>
            <p style={sectionDesc}>{t.returnPolicyDesc}</p>
            {[
              { id: 'no_return', label: t.noReturn },
              { id: 'exchange_only', label: t.exchangeOnly },
              { id: 'return_7', label: t.return7 },
              { id: 'return_14', label: t.return14 },
              { id: 'return_30', label: t.return30 },
            ].map(opt => {
              const selected = returnPolicy === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setReturnPolicy(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', textAlign: 'left',
                    ...glassCard(selected),
                  }}
                >
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                  <span style={{
                    fontSize: '15px', color: selected ? '#fff' : '#BBB', fontWeight: 600,
                  }}>{opt.label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 11 - Bank
      case 11:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(11)}>{stepHeroes[11].emoji}</div>
            <h2 style={sectionTitle}>{t.bankTitle}</h2>
            <p style={sectionDesc}>{t.bankDesc}</p>
            {bankOptions.map(opt => {
              const label = lang === 'fr' ? opt.fr : lang === 'he' ? opt.he : lang === 'es' ? opt.es : opt.en
              const selected = bankChoice === opt.id
              const iconColors: Record<string, string> = {
                stripe: '#6772E5',
                paypal: '#00457C',
                later: '#888',
              }
              const iconGradients: Record<string, string> = {
                stripe: 'linear-gradient(135deg, #6772E5, #4F46E5)',
                paypal: 'linear-gradient(135deg, #003087, #009CDE)',
                later: 'linear-gradient(135deg, #555, #333)',
              }
              return (
                <button
                  key={opt.id}
                  onClick={() => setBankChoice(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', width: '100%',
                    padding: '20px 18px', marginBottom: '12px', textAlign: 'left',
                    ...glassCard(selected),
                  }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: selected
                      ? iconGradients[opt.id] || iconGradients.later
                      : 'linear-gradient(135deg, #1A1A1A, #141414)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: selected ? `0 4px 16px ${iconColors[opt.id]}33` : 'none',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {opt.id === 'stripe' ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={selected ? '#fff' : iconColors.stripe} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    ) : opt.id === 'paypal' ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={selected ? '#fff' : iconColors.paypal} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={selected ? '#fff' : '#888'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </div>
                  <span style={{
                    fontSize: '16px', color: selected ? '#fff' : '#BBB', fontWeight: 700,
                    flex: 1,
                  }}>{label}</span>
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                </button>
              )
            })}

            {/* PayPal email field */}
            {bankChoice === 'paypal' && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '8px' }}>
                  {t.paypalEmailLabel}
                </label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={e => setPaypalEmail(e.target.value)}
                  placeholder={t.paypalEmailPlaceholder}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '12px',
                    backgroundColor: '#111', border: '1px solid #333',
                    color: '#fff', fontSize: '15px', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                  {t.paypalEmailHint}
                </p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const able = canProceed()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90, backgroundColor: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        backgroundColor: '#000',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
        }}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} style={{
              background: 'linear-gradient(135deg, #1A1A1A, #111)',
              border: '1px solid #2A2A2A', cursor: 'pointer', padding: '10px',
              borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div style={{ width: '42px' }} />
          )}

          {/* Step counter */}
          <span style={{
            fontSize: '13px', fontWeight: 700, color: '#555',
            letterSpacing: '1px',
          }}>
            {step + 1} / {TOTAL_STEPS}
          </span>

          <button onClick={onClose} style={{
            background: 'linear-gradient(135deg, #1A1A1A, #111)',
            border: '1px solid #2A2A2A', cursor: 'pointer', padding: '10px',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Progress bar - thicker & more prominent */}
        <div style={{
          height: '6px', backgroundColor: '#111', margin: '0 20px 6px',
          borderRadius: '3px', overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            background: 'linear-gradient(90deg, #E8344E, #F0908A, #FFD700)',
            width: `${progress}%`,
            transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: '0 0 12px rgba(240,144,138,0.5), 0 0 4px rgba(240,144,138,0.3)',
          }} />
        </div>
      </div>

      {/* Content with animated transitions */}
      <div style={{
        flex: 1, overflowY: 'auto', paddingBottom: '110px', paddingTop: '24px',
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateX(0)'
          : slideDir === 'left'
            ? 'translateX(40px)'
            : 'translateX(-40px)',
        transition: visible
          ? 'opacity 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.35s cubic-bezier(0.4,0,0.2,1)'
          : 'none',
      }}>
        {renderStep()}
      </div>

      {/* Footer button - gradient with glow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        background: 'linear-gradient(to top, #000 60%, transparent)',
      }}>
        <button
          onClick={handleNext}
          disabled={!able || saving}
          style={{
            width: '100%', padding: '18px',
            background: able
              ? 'linear-gradient(135deg, #F0908A 0%, #E8344E 50%, #B91C3C 100%)'
              : 'linear-gradient(135deg, #2A2A2A, #1A1A1A)',
            borderRadius: '16px', border: 'none',
            color: able ? '#fff' : '#555',
            fontSize: '17px', fontWeight: 800,
            cursor: able ? 'pointer' : 'not-allowed',
            opacity: saving ? 0.7 : 1,
            boxShadow: able
              ? '0 6px 24px rgba(240,144,138,0.35), 0 2px 8px rgba(232,52,78,0.3)'
              : '0 2px 8px rgba(0,0,0,0.3)',
            letterSpacing: '0.3px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Button shimmer effect */}
          {able && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            }} />
          )}
          {saving ? t.saving : step === TOTAL_STEPS - 1 ? t.finish : t.next}
        </button>
      </div>
    </div>
  )
}
