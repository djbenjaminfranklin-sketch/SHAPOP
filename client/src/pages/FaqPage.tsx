import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface FaqItem { q: string; a: string }

const content = {
  fr: {
    title: 'Centre d\'aide',
    subtitle: 'Questions fréquentes',
    buyer: 'Achats',
    seller: 'Ventes',
    general: 'Général',
    buyerFaq: [
      { q: 'Comment acheter un article sur ShaPop ?', a: 'Rejoignez un live, appuyez sur l\'article souhaité lorsque le vendeur le présente, et finalisez votre achat instantanément. Vous pouvez aussi parcourir les lives programmés et activer des rappels.' },
      { q: 'Comment fonctionnent les paiements ?', a: 'Nous acceptons les cartes de crédit/débit et Apple Pay. Les paiements sont traités de manière sécurisée via notre prestataire de paiement. Vos coordonnées bancaires ne sont jamais stockées sur nos serveurs.' },
      { q: 'Puis-je retourner un article ?', a: 'Oui ! Vous disposez de 14 jours après la livraison pour demander un retour, conformément à le Code de la consommation français. Les articles doivent être dans leur état d\'origine. Contactez le vendeur via l\'application pour initier un retour.' },
      { q: 'Combien de temps dure la livraison ?', a: 'Les délais de livraison dépendent du vendeur. La plupart des vendeurs expédient sous 1 à 3 jours ouvrés. Le délai de livraison estimé est affiché avant l\'achat.' },
      { q: 'Que faire si je reçois un article endommagé ?', a: 'Contactez immédiatement le vendeur via l\'application. Si le vendeur ne répond pas sous 48 heures, contactez notre équipe d\'assistance et nous vous aiderons à résoudre le problème.' },
      { q: 'Mon paiement est-il sécurisé ?', a: 'Absolument. Toutes les transactions sont chiffrées avec une sécurité de niveau bancaire (TLS 1.3). Nous ne conservons jamais votre numéro de carte complet.' },
    ] as FaqItem[],
    sellerFaq: [
      { q: 'Comment commencer à vendre sur ShaPop ?', a: 'Rendez-vous dans l\'onglet Vendre, configurez votre profil vendeur et lancez votre premier live ! Aucun frais initial ni abonnement mensuel.' },
      { q: 'Quels sont les frais pour les vendeurs ?', a: 'Sur chaque vente effectuée, ShaPop déduit du versement au vendeur : 8% de commission plateforme + 2,9% + 0,30\u20AC de frais Stripe + TVA 20% sur l\'ensemble des frais. Exemple : sur une vente de 50\u20AC, les frais totaux sont de 6,90\u20AC TTC, le vendeur reçoit 43,10\u20AC. Aucun frais initial ni abonnement mensuel.' },
      { q: 'Quand suis-je payé ?', a: 'Les versements sont traités chaque semaine (tous les dimanches) sur votre compte bancaire enregistré. Le seuil minimum de versement est de 50\u20AC.' },
      { q: 'Que puis-je vendre ?', a: 'Vous pouvez vendre la plupart des biens physiques : mode, électronique, objets de collection, articles faits main, et plus encore. Consultez notre liste d\'articles interdits dans les Conditions d\'utilisation.' },
      { q: 'Comment fonctionnent les lives ?', a: 'Lancez un live depuis l\'onglet Vendre. Présentez vos articles, interagissez avec les spectateurs en temps réel et réalisez des ventes en direct. Les lives peuvent durer jusqu\'à 4 heures.' },
      { q: 'Comment gérer les expéditions ?', a: 'Vous êtes responsable de l\'expédition des articles aux acheteurs. Nous recommandons d\'utiliser des services de livraison avec suivi. Imprimez vos étiquettes d\'expédition directement depuis l\'application.' },
    ] as FaqItem[],
    generalFaq: [
      { q: 'Où ShaPop est-il disponible ?', a: 'ShaPop est disponible en France, en Espagne, au Royaume-Uni et aux États-Unis. Nous prévoyons de nous étendre à d\'autres pays prochainement.' },
      { q: 'Comment supprimer mon compte ?', a: 'Allez dans Profil > Préférences > Supprimer le compte. Vos données personnelles seront supprimées sous 30 jours. Les enregistrements de transactions sont conservés 7 ans conformément à la loi.' },
      { q: 'Comment signaler un problème ?', a: 'Utilisez l\'option « Nous contacter » dans votre Profil, ou envoyez-nous un e-mail à shapopcontact@gmail.com. Nous répondons sous 24 heures.' },
      { q: 'ShaPop est-il gratuit ?', a: 'Oui ! L\'application est gratuite à télécharger et à utiliser. Les acheteurs ne paient aucun frais. Les vendeurs paient uniquement sur les ventes effectuées (~13% total TTC).' },
    ] as FaqItem[],
  },
  en: {
    title: 'Help Center',
    subtitle: 'Frequently Asked Questions',
    buyer: 'Buying',
    seller: 'Selling',
    general: 'General',
    buyerFaq: [
      { q: 'How do I buy an item on ShaPop?', a: 'Join a live stream, tap the item you want when the seller presents it, and complete your purchase instantly. You can also browse scheduled streams and set reminders.' },
      { q: 'How do payments work?', a: 'We accept credit/debit cards and Apple Pay. Payments are processed securely through our payment provider. Your card details are never stored on our servers.' },
      { q: 'Can I return an item?', a: 'Yes! You have 14 days from delivery to request a return, in accordance with French Consumer Protection Code. Items must be in their original condition. Contact the seller through the app to initiate a return.' },
      { q: 'How long does shipping take?', a: 'Shipping times depend on the seller. Most sellers ship within 1-3 business days. Estimated delivery time is displayed before purchase.' },
      { q: 'What if I receive a damaged item?', a: 'Contact the seller immediately through the app. If the seller doesn\'t respond within 48 hours, contact our support team and we\'ll help resolve the issue.' },
      { q: 'Is my payment secure?', a: 'Absolutely. All transactions are encrypted with bank-level security (TLS 1.3). We never store your full card number.' },
    ] as FaqItem[],
    sellerFaq: [
      { q: 'How do I start selling on ShaPop?', a: 'Go to the Sell tab, set up your seller profile, and you can start your first live stream! No upfront costs or monthly fees.' },
      { q: 'What are the seller fees?', a: 'On each completed sale, ShaPop deducts from the seller\'s payout: 8% platform commission + 2.9% + \u20AC0.30 processing fee (Stripe) + 20% VAT on all fees. Example: on a \u20AC50 sale, total fees are \u20AC6.90 incl. VAT, you receive \u20AC43.10. No upfront costs or monthly fees.' },
      { q: 'When do I get paid?', a: 'Payouts are processed weekly (every Sunday) to your registered bank account. There\'s a minimum payout threshold of 50\u20AC.' },
      { q: 'What can I sell?', a: 'You can sell most physical goods: fashion, electronics, collectibles, handmade items, and more. Check our Prohibited Items list in the Terms of Service for items that are not allowed.' },
      { q: 'How do live streams work?', a: 'Start a stream from the Sell tab. Present your items, interact with viewers in real-time, and process sales live. Streams can last up to 4 hours.' },
      { q: 'How do I handle shipping?', a: 'You\'re responsible for shipping items to buyers. We recommend using tracked shipping services. Print shipping labels directly from the app.' },
    ] as FaqItem[],
    generalFaq: [
      { q: 'Where is ShaPop available?', a: 'ShaPop is available in France, Spain, UK, and USA. We plan to expand to additional countries soon.' },
      { q: 'How do I delete my account?', a: 'Go to Profile > Preferences > Delete Account. Your personal data will be removed within 30 days. Transaction records are kept for 7 years as required by law.' },
      { q: 'How do I report a problem?', a: 'Use the "Contact us" option in your Profile, or email us at shapopcontact@gmail.com. We respond within 24 hours.' },
      { q: 'Is ShaPop free to use?', a: 'Yes! The app is free to download and use. Buyers pay no fees. Sellers only pay fees on completed sales (~13% total incl. VAT).' },
    ] as FaqItem[],
  },
  he: {
    title: '\u05DE\u05E8\u05DB\u05D6 \u05E2\u05D6\u05E8\u05D4',
    subtitle: '\u05E9\u05D0\u05DC\u05D5\u05EA \u05E0\u05E4\u05D5\u05E6\u05D5\u05EA',
    buyer: '\u05E7\u05E0\u05D9\u05D9\u05D4',
    seller: '\u05DE\u05DB\u05D9\u05E8\u05D4',
    general: '\u05DB\u05DC\u05DC\u05D9',
    buyerFaq: [
      { q: '\u05D0\u05D9\u05DA \u05E7\u05D5\u05E0\u05D9\u05DD \u05DE\u05D5\u05E6\u05E8 \u05D1-ShaPop?', a: '\u05D4\u05D9\u05DB\u05E0\u05E1\u05D5 \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9, \u05DC\u05D7\u05E6\u05D5 \u05E2\u05DC \u05D4\u05DE\u05D5\u05E6\u05E8 \u05D4\u05E8\u05E6\u05D5\u05D9 \u05DB\u05E9\u05D4\u05DE\u05D5\u05DB\u05E8 \u05DE\u05E6\u05D9\u05D2 \u05D0\u05D5\u05EA\u05D5, \u05D5\u05D4\u05E9\u05DC\u05D9\u05DE\u05D5 \u05D0\u05EA \u05D4\u05E8\u05DB\u05D9\u05E9\u05D4 \u05D1\u05DE\u05E7\u05D5\u05DD.' },
      { q: '\u05D0\u05D9\u05DA \u05E2\u05D5\u05D1\u05D3\u05D9\u05DD \u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD?', a: '\u05D0\u05E0\u05D5 \u05DE\u05E7\u05D1\u05DC\u05D9\u05DD \u05DB\u05E8\u05D8\u05D9\u05E1\u05D9 \u05D0\u05E9\u05E8\u05D0\u05D9/\u05D7\u05D9\u05D5\u05D1 \u05D5-Apple Pay. \u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05DE\u05E2\u05D5\u05D1\u05D3\u05D9\u05DD \u05D1\u05D0\u05D5\u05E4\u05DF \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7. \u05E4\u05E8\u05D8\u05D9 \u05D4\u05DB\u05E8\u05D8\u05D9\u05E1 \u05DC\u05E2\u05D5\u05DC\u05DD \u05DC\u05D0 \u05E0\u05E9\u05DE\u05E8\u05D9\u05DD \u05D0\u05E6\u05DC\u05E0\u05D5.' },
      { q: '\u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05D7\u05D6\u05D9\u05E8 \u05DE\u05D5\u05E6\u05E8?', a: '\u05DB\u05DF! \u05D9\u05E9 14 \u05D9\u05D5\u05DD \u05DE\u05D4\u05DE\u05E9\u05DC\u05D5\u05D7 \u05DC\u05D1\u05E7\u05E9 \u05D4\u05D7\u05D6\u05E8\u05D4 \u05D1\u05D4\u05EA\u05D0\u05DD \u05DC\u05E7\u05D5\u05D3 \u05D4\u05D2\u05E0\u05EA \u05D4\u05E6\u05E8\u05DB\u05DF \u05D4\u05E6\u05E8\u05E4\u05EA\u05D9. \u05D4\u05DE\u05D5\u05E6\u05E8 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D1\u05DE\u05E6\u05D1 \u05DE\u05E7\u05D5\u05E8\u05D9.' },
      { q: '\u05DB\u05DE\u05D4 \u05D6\u05DE\u05DF \u05DC\u05D5\u05E7\u05D7 \u05DE\u05E9\u05DC\u05D5\u05D7?', a: '\u05D6\u05DE\u05E0\u05D9 \u05D4\u05DE\u05E9\u05DC\u05D5\u05D7 \u05EA\u05DC\u05D5\u05D9\u05D9\u05DD \u05D1\u05DE\u05D5\u05DB\u05E8. \u05E8\u05D5\u05D1 \u05D4\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05E9\u05D5\u05DC\u05D7\u05D9\u05DD \u05EA\u05D5\u05DA 1-3 \u05D9\u05DE\u05D9 \u05E2\u05E1\u05E7\u05D9\u05DD.' },
      { q: '\u05DE\u05D4 \u05D0\u05DD \u05E7\u05D9\u05D1\u05DC\u05EA\u05D9 \u05DE\u05D5\u05E6\u05E8 \u05E4\u05D2\u05D5\u05DD?', a: '\u05E4\u05E0\u05D5 \u05DC\u05DE\u05D5\u05DB\u05E8 \u05DE\u05D9\u05D3 \u05D3\u05E8\u05DA \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4. \u05D0\u05DD \u05D0\u05D9\u05DF \u05DE\u05E2\u05E0\u05D4 \u05EA\u05D5\u05DA 48 \u05E9\u05E2\u05D5\u05EA, \u05E4\u05E0\u05D5 \u05DC\u05EA\u05DE\u05D9\u05DB\u05D4 \u05E9\u05DC\u05E0\u05D5.' },
      { q: '\u05D4\u05D0\u05DD \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7?', a: '\u05D1\u05D4\u05D7\u05DC\u05D8. \u05DB\u05DC \u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05DE\u05D5\u05E6\u05E4\u05E0\u05D5\u05EA \u05D1\u05D0\u05D1\u05D8\u05D7\u05D4 \u05D1\u05E8\u05DE\u05EA \u05D1\u05E0\u05E7. \u05D0\u05E0\u05D7\u05E0\u05D5 \u05DC\u05E2\u05D5\u05DC\u05DD \u05DC\u05D0 \u05E9\u05D5\u05DE\u05E8\u05D9\u05DD \u05DE\u05E1\u05E4\u05E8 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05DE\u05DC\u05D0.' },
    ] as FaqItem[],
    sellerFaq: [
      { q: '\u05D0\u05D9\u05DA \u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD \u05DC\u05DE\u05DB\u05D5\u05E8?', a: '\u05DC\u05DB\u05D5 \u05DC\u05DC\u05E9\u05D5\u05E0\u05D9\u05EA \u05DE\u05DB\u05D9\u05E8\u05D4, \u05D4\u05D2\u05D3\u05D9\u05E8\u05D5 \u05D0\u05EA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D4\u05DE\u05D5\u05DB\u05E8 \u05D5\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05D0\u05EA \u05D4\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF! \u05D0\u05D9\u05DF \u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05DE\u05E8\u05D0\u05E9.' },
      { q: '\u05DE\u05D4 \u05D4\u05E2\u05DE\u05DC\u05D5\u05EA?', a: 'ShaPop \u05D2\u05D5\u05D1\u05D4 \u05E2\u05DE\u05DC\u05D4 \u05E7\u05D8\u05E0\u05D4 \u05DE\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05E9\u05D4\u05D5\u05E9\u05DC\u05DE\u05D5. \u05D4\u05EA\u05E2\u05E8\u05D9\u05E3 \u05EA\u05DC\u05D5\u05D9 \u05D1\u05D3\u05E8\u05D2\u05EA \u05D4\u05DE\u05D5\u05DB\u05E8. \u05D1\u05D3\u05E7\u05D5 \u05D1\u05DC\u05D5\u05D7 \u05D4\u05D1\u05E7\u05E8\u05D4.' },
      { q: '\u05DE\u05EA\u05D9 \u05DE\u05E7\u05D1\u05DC\u05D9\u05DD \u05EA\u05E9\u05DC\u05D5\u05DD?', a: '\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05DE\u05E2\u05D5\u05D1\u05D3\u05D9\u05DD \u05E9\u05D1\u05D5\u05E2\u05D9\u05EA (\u05DB\u05DC \u05D9\u05D5\u05DD \u05E8\u05D0\u05E9\u05D5\u05DF) \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D4\u05D1\u05E0\u05E7 \u05D4\u05E8\u05E9\u05D5\u05DD. \u05E1\u05E3 \u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD: 50\u20AC.' },
      { q: '\u05DE\u05D4 \u05D0\u05E4\u05E9\u05E8 \u05DC\u05DE\u05DB\u05D5\u05E8?', a: '\u05D0\u05E4\u05E9\u05E8 \u05DC\u05DE\u05DB\u05D5\u05E8 \u05E8\u05D5\u05D1 \u05D4\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D4\u05E4\u05D9\u05D6\u05D9\u05D9\u05DD: \u05D0\u05D5\u05E4\u05E0\u05D4, \u05D0\u05DC\u05E7\u05D8\u05E8\u05D5\u05E0\u05D9\u05E7\u05D4, \u05D0\u05E1\u05E4\u05E0\u05D5\u05EA, \u05D9\u05D3\u05E0\u05D9 \u05D5\u05E2\u05D5\u05D3. \u05D1\u05D3\u05E7\u05D5 \u05D0\u05EA \u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D4\u05D0\u05E1\u05D5\u05E8\u05D9\u05DD \u05D1\u05EA\u05E0\u05D0\u05D9\u05DD.' },
      { q: '\u05D0\u05D9\u05DA \u05E2\u05D5\u05D1\u05D3 \u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9?', a: '\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05E9\u05D9\u05D3\u05D5\u05E8 \u05DE\u05DC\u05E9\u05D5\u05E0\u05D9\u05EA \u05D4\u05DE\u05DB\u05D9\u05E8\u05D4. \u05D4\u05E6\u05D9\u05D2\u05D5 \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD, \u05E7\u05D9\u05D9\u05DE\u05D5 \u05D0\u05D9\u05E0\u05D8\u05E8\u05D0\u05E7\u05E6\u05D9\u05D4 \u05E2\u05DD \u05D4\u05E6\u05D5\u05E4\u05D9\u05DD \u05D5\u05DE\u05DB\u05E8\u05D5 \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8. \u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05E2\u05D3 4 \u05E9\u05E2\u05D5\u05EA.' },
      { q: '\u05D0\u05D9\u05DA \u05DE\u05D8\u05E4\u05DC\u05D9\u05DD \u05D1\u05DE\u05E9\u05DC\u05D5\u05D7?', a: '\u05D0\u05EA\u05D4 \u05D0\u05D7\u05E8\u05D0\u05D9 \u05DC\u05DE\u05E9\u05DC\u05D5\u05D7. \u05DE\u05D5\u05DE\u05DC\u05E5 \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05DE\u05E9\u05DC\u05D5\u05D7 \u05E2\u05DD \u05DE\u05E2\u05E7\u05D1. \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05D3\u05E4\u05D9\u05E1 \u05EA\u05D5\u05D5\u05D9\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05DE\u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4.' },
    ] as FaqItem[],
    generalFaq: [
      { q: '\u05D4\u05D9\u05DB\u05DF ShaPop \u05D6\u05DE\u05D9\u05E0\u05D4?', a: 'ShaPop \u05D6\u05DE\u05D9\u05E0\u05D4 \u05D1\u05E6\u05E8\u05E4\u05EA, \u05E1\u05E4\u05E8\u05D3, \u05D1\u05E8\u05D9\u05D8\u05E0\u05D9\u05D4 \u05D5\u05D0\u05E8\u05D4"\u05D1. \u05D0\u05E0\u05D5 \u05DE\u05EA\u05DB\u05E0\u05E0\u05D9\u05DD \u05DC\u05D4\u05EA\u05E8\u05D7\u05D1 \u05DC\u05DE\u05D3\u05D9\u05E0\u05D5\u05EA \u05E0\u05D5\u05E1\u05E4\u05D5\u05EA \u05D1\u05E7\u05E8\u05D5\u05D1.' },
      { q: '\u05D0\u05D9\u05DA \u05DE\u05D5\u05D7\u05E7\u05D9\u05DD \u05D7\u05E9\u05D1\u05D5\u05DF?', a: '\u05DC\u05DB\u05D5 \u05DC\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC > \u05D4\u05E2\u05D3\u05E4\u05D5\u05EA > \u05DE\u05D7\u05D9\u05E7\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF. \u05D4\u05DE\u05D9\u05D3\u05E2 \u05D4\u05D0\u05D9\u05E9\u05D9 \u05D9\u05D9\u05DE\u05D7\u05E7 \u05EA\u05D5\u05DA 30 \u05D9\u05D5\u05DD.' },
      { q: '\u05D0\u05D9\u05DA \u05DE\u05D3\u05D5\u05D5\u05D7\u05D9\u05DD \u05E2\u05DC \u05D1\u05E2\u05D9\u05D4?', a: '\u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05D0\u05E4\u05E9\u05E8\u05D5\u05EA "\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8" \u05D1\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC, \u05D0\u05D5 \u05E9\u05DC\u05D7\u05D5 \u05DE\u05D9\u05D9\u05DC \u05DC-shapopcontact@gmail.com. \u05D0\u05E0\u05D5 \u05E2\u05D5\u05E0\u05D9\u05DD \u05EA\u05D5\u05DA 24 \u05E9\u05E2\u05D5\u05EA.' },
      { q: '\u05D4\u05D0\u05DD ShaPop \u05D7\u05D9\u05E0\u05DE\u05D9\u05EA?', a: '\u05DB\u05DF! \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D7\u05D9\u05E0\u05DE\u05D9\u05EA \u05DC\u05D4\u05D5\u05E8\u05D3\u05D4 \u05D5\u05DC\u05E9\u05D9\u05DE\u05D5\u05E9. \u05E7\u05D5\u05E0\u05D9\u05DD \u05DC\u05D0 \u05DE\u05E9\u05DC\u05DE\u05D9\u05DD \u05E2\u05DE\u05DC\u05D5\u05EA. \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05DE\u05E9\u05DC\u05DE\u05D9\u05DD \u05E2\u05DE\u05DC\u05D4 \u05E7\u05D8\u05E0\u05D4 \u05E8\u05E7 \u05DE\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05E9\u05D4\u05D5\u05E9\u05DC\u05DE\u05D5.' },
    ] as FaqItem[],
  },
  es: {
    title: 'Centro de Ayuda',
    subtitle: 'Preguntas Frecuentes',
    buyer: 'Compras',
    seller: 'Ventas',
    general: 'General',
    buyerFaq: [
      { q: '\u00BFC\u00F3mo compro un art\u00EDculo en ShaPop?', a: '\u00DAnete a un directo, toca el art\u00EDculo que deseas cuando el vendedor lo presente y finaliza tu compra al instante. Tambi\u00E9n puedes explorar los directos programados y activar recordatorios.' },
      { q: '\u00BFC\u00F3mo funcionan los pagos?', a: 'Aceptamos tarjetas de cr\u00E9dito/d\u00E9bito y Apple Pay. Los pagos se procesan de forma segura a trav\u00E9s de nuestro proveedor de pagos. Los datos de tu tarjeta nunca se almacenan en nuestros servidores.' },
      { q: '\u00BFPuedo devolver un art\u00EDculo?', a: '\u00A1S\u00ED! Dispones de 14 d\u00EDas desde la entrega para solicitar una devoluci\u00F3n, conforme al C\u00F3digo de Protecci\u00F3n al Consumidor franc\u00E9s. Los art\u00EDculos deben estar en su estado original. Contacta al vendedor a trav\u00E9s de la aplicaci\u00F3n para iniciar una devoluci\u00F3n.' },
      { q: '\u00BFCu\u00E1nto tarda el env\u00EDo?', a: 'Los plazos de entrega dependen del vendedor. La mayor\u00EDa de los vendedores env\u00EDan en 1 a 3 d\u00EDas h\u00E1biles. El plazo de entrega estimado se muestra antes de la compra.' },
      { q: '\u00BFQu\u00E9 pasa si recibo un art\u00EDculo da\u00F1ado?', a: 'Contacta inmediatamente al vendedor a trav\u00E9s de la aplicaci\u00F3n. Si el vendedor no responde en 48 horas, contacta a nuestro equipo de soporte y te ayudaremos a resolver el problema.' },
      { q: '\u00BFEs seguro el pago?', a: 'Absolutamente. Todas las transacciones est\u00E1n cifradas con seguridad de nivel bancario (TLS 1.3). Nunca almacenamos tu n\u00FAmero de tarjeta completo.' },
    ] as FaqItem[],
    sellerFaq: [
      { q: '\u00BFC\u00F3mo empiezo a vender en ShaPop?', a: 'Dir\u00EDgete a la pesta\u00F1a Vender, configura tu perfil de vendedor y \u00A1lanza tu primer directo! Sin costos iniciales ni cuotas mensuales.' },
      { q: '\u00BFCu\u00E1les son las comisiones para vendedores?', a: 'Por cada venta realizada, ShaPop deduce del pago al vendedor: 8% de comisi\u00F3n de plataforma + 2,9% + 0,30\u20AC de comisi\u00F3n Stripe + IVA del 20% sobre todas las comisiones. Ejemplo: en una venta de 50\u20AC, las comisiones totales son 6,90\u20AC IVA incl., el vendedor recibe 43,10\u20AC. Sin costos iniciales ni cuotas mensuales.' },
      { q: '\u00BFCu\u00E1ndo recibo mi pago?', a: 'Los pagos se procesan semanalmente (cada domingo) en tu cuenta bancaria registrada. El umbral m\u00EDnimo de pago es de 50\u20AC.' },
      { q: '\u00BFQu\u00E9 puedo vender?', a: 'Puedes vender la mayor\u00EDa de bienes f\u00EDsicos: moda, electr\u00F3nica, coleccionables, art\u00EDculos hechos a mano y mucho m\u00E1s. Consulta nuestra lista de art\u00EDculos prohibidos en los T\u00E9rminos y Condiciones.' },
      { q: '\u00BFC\u00F3mo funcionan los directos?', a: 'Inicia un directo desde la pesta\u00F1a Vender. Presenta tus art\u00EDculos, interact\u00FAa con los espectadores en tiempo real y realiza ventas en directo. Los directos pueden durar hasta 4 horas.' },
      { q: '\u00BFC\u00F3mo gestiono los env\u00EDos?', a: 'Eres responsable del env\u00EDo de los art\u00EDculos a los compradores. Recomendamos utilizar servicios de env\u00EDo con seguimiento. Imprime tus etiquetas de env\u00EDo directamente desde la aplicaci\u00F3n.' },
    ] as FaqItem[],
    generalFaq: [
      { q: '\u00BFD\u00F3nde est\u00E1 disponible ShaPop?', a: 'ShaPop est\u00E1 disponible en Francia, Espa\u00F1a, Reino Unido y Estados Unidos. Planeamos expandirnos a otros pa\u00EDses pr\u00F3ximamente.' },
      { q: '\u00BFC\u00F3mo elimino mi cuenta?', a: 'Ve a Perfil > Preferencias > Eliminar cuenta. Tus datos personales se eliminar\u00E1n en un plazo de 30 d\u00EDas. Los registros de transacciones se conservan durante 7 a\u00F1os conforme a la ley.' },
      { q: '\u00BFC\u00F3mo reporto un problema?', a: 'Utiliza la opci\u00F3n \u00ABCont\u00E1ctanos\u00BB en tu Perfil, o env\u00EDanos un correo electr\u00F3nico a shapopcontact@gmail.com. Respondemos en un plazo de 24 horas.' },
      { q: '\u00BFEs gratis ShaPop?', a: '\u00A1S\u00ED! La aplicaci\u00F3n es gratuita para descargar y usar. Los compradores no pagan ninguna comisi\u00F3n. Los vendedores solo pagan sobre las ventas realizadas (~13% total IVA incl.).' },
    ] as FaqItem[],
  },
}

export default function FaqPage() {
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr
  usePageTitle(c.title)
  const [tab, setTab] = useState<'buyer' | 'seller' | 'general'>('buyer')
  const [open, setOpen] = useState<number | null>(null)

  const faqs = tab === 'buyer' ? c.buyerFaq : tab === 'seller' ? c.sellerFaq : c.generalFaq

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px 12px' }}>
          <button onClick={() => navigate(-1)} aria-label="Go back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #1A1A1A' }}>
          {(['buyer', 'seller', 'general'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setOpen(null) }}
              style={{
                flex: 1, padding: '12px 0', background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid #F0908A' : '2px solid transparent',
                color: tab === t ? '#fff' : '#666', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {c[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px' }}>{c.subtitle}</p>
        {faqs.map((faq, i) => (
          <div key={`${tab}-${i}`} style={{ borderBottom: '1px solid #1A1A1A', marginBottom: '4px' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '15px', color: '#fff', fontWeight: 500, flex: 1, paddingRight: '12px' }}>{faq.q}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"
                style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {open === i && (
              <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.6, padding: '0 0 16px', whiteSpace: 'pre-line' }}>{faq.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
