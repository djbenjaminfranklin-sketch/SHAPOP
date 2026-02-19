import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { showToast } from '../lib/toast'
import { Browser } from '@capacitor/browser'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

type Lang = 'fr' | 'en' | 'he' | 'es'

const content = {
  fr: {
    title: 'Paiements et livraison',
    payTitle: 'Moyens de paiement',
    securePayments: 'Connectez Stripe pour recevoir vos paiements',
    secureDesc: 'Stripe gere vos paiements de maniere securisee. Les acheteurs paient, et vous recevez votre argent automatiquement.',
    setupPayment: 'Connecter avec Stripe',
    selectCountry: 'Choisissez votre pays',
    selectCountryDesc: 'Stripe a besoin de connaitre votre pays pour creer votre compte vendeur.',
    confirm: 'Continuer',
    cancel: 'Annuler',
    countryNotSupported: 'Ce pays n\'est pas encore supporte par Stripe.',
    paymentConfigured: 'Stripe connecte',
    configuredDesc: 'Votre compte Stripe est actif. Vous pouvez recevoir des paiements et consulter votre tableau de bord.',
    openDashboard: 'Ouvrir mon dashboard Stripe',
    pendingDesc: 'Votre compte Stripe est en cours de verification. Completez les informations manquantes.',
    completSetup: 'Completer la configuration',
    loading: 'Chargement...',
    connecting: 'Connexion a Stripe...',
    shipTitle: 'Preferences de livraison',
    defaultShip: 'Livraison par defaut',
    standard: 'Standard (La Poste)',
    express: 'Express (coursier)',
    pickup: 'Retrait en main propre',
    feesTitle: 'Vos frais',
    feesDesc: 'Commission 8% + Stripe 2,9% + 0,30\u20AC + TVA 20%',
    feesExample: 'Exemple : vente de 50\u20AC \u2192 vous recevez 43,10\u20AC',
    close: 'Fermer',
    pending: 'En attente',
    notSellerMsg: 'Devenez vendeur pour connecter Stripe et recevoir des paiements.',
    savedLocally: 'Sauvegarde sur cet appareil',
    errorConnect: 'Erreur de connexion a Stripe',
    errorDashboard: 'Impossible d\'ouvrir le dashboard Stripe',
    errorLoad: 'Erreur de chargement du statut Stripe',
    buyerCardTitle: 'Carte bancaire',
    buyerCardDesc: 'Ajoutez une carte pour encherir en live',
    buyerCardSaved: 'Carte enregistree',
    buyerCardLast4: 'se terminant par',
    buyerChangeCard: 'Changer de carte',
    buyerAddCard: 'Ajouter une carte',
    buyerSaveCard: 'Enregistrer la carte',
    buyerCardSuccess: 'Carte enregistree avec succes !',
    buyerCardError: 'Erreur lors de l\'enregistrement',
    buyerNoCard: 'Aucune carte enregistree',
    buyerNoCardDesc: 'Ajoutez une carte bancaire pour pouvoir encherir sur les lives',
    paypalConnected: 'PayPal connecte',
    paypalConnectedDesc: 'Vos ventes seront versees sur votre compte PayPal.',
    paypalEmail: 'Email PayPal',
    paypalChangeEmail: 'Modifier l\'email',
    paypalSaveEmail: 'Enregistrer',
    paypalRecentPayouts: 'Versements recents',
    paypalNoPayout: 'Aucun versement pour le moment',
    paypalStatus_pending: 'En attente',
    paypalStatus_ready: 'Pret',
    paypalStatus_processing: 'En cours',
    paypalStatus_completed: 'Complete',
    paypalStatus_failed: 'Echoue',
    paypalCountryTitle: 'Paiement via PayPal',
    paypalCountryDesc: 'Stripe n\'est pas disponible dans votre pays. Entrez votre email PayPal pour recevoir vos paiements.',
    paypalCountryPlaceholder: 'email@paypal.com',
    paypalCountrySave: 'Connecter PayPal',
    pageDesc: 'Ces informations sont necessaires pour placer une enchere, passer une commande ou acheter un produit pendant un live. Nous debiterons ta carte si une enchere ou une offre est acceptee.',
    paymentMethod: 'Mode de paiement',
    shippingDetails: 'Details d\'expedition',
    addPaymentMethod: 'Ajouter un mode de paiement',
    addPaymentMethodDesc: 'Aucun montant ne sera debite tant que tu n\'auras pas achete un article.',
    creditCard: 'Carte bancaire',
    applePay: 'Apple Pay',
    applePayUnavailable: 'Non disponible sur cet appareil',
    noPaymentMethod: 'Aucun mode de paiement',
    noAddress: 'Aucune adresse enregistree',
  },
  en: {
    title: 'Payments & Shipping',
    payTitle: 'Payment Methods',
    securePayments: 'Connect Stripe to receive payments',
    secureDesc: 'Stripe securely manages your payments. Buyers pay, and you receive your money automatically.',
    setupPayment: 'Connect with Stripe',
    selectCountry: 'Choose your country',
    selectCountryDesc: 'Stripe needs your country to create your seller account.',
    confirm: 'Continue',
    cancel: 'Cancel',
    countryNotSupported: 'This country is not yet supported by Stripe.',
    paymentConfigured: 'Stripe connected',
    configuredDesc: 'Your Stripe account is active. You can receive payments and access your dashboard.',
    openDashboard: 'Open my Stripe dashboard',
    pendingDesc: 'Your Stripe account is being verified. Complete missing information.',
    completSetup: 'Complete setup',
    loading: 'Loading...',
    connecting: 'Connecting to Stripe...',
    shipTitle: 'Shipping Preferences',
    defaultShip: 'Default shipping',
    standard: 'Standard (postal)',
    express: 'Express (courier)',
    pickup: 'Self pickup',
    feesTitle: 'Your fees',
    feesDesc: 'Commission 8% + Stripe 2.9% + \u20AC0.30 + VAT 20%',
    feesExample: 'Example: \u20AC50 sale \u2192 you receive \u20AC43.10',
    close: 'Close',
    pending: 'Pending',
    notSellerMsg: 'Become a seller to connect Stripe and receive payments.',
    savedLocally: 'Saved on this device',
    errorConnect: 'Failed to connect to Stripe',
    errorDashboard: 'Failed to open Stripe dashboard',
    errorLoad: 'Failed to load Stripe status',
    buyerCardTitle: 'Payment card',
    buyerCardDesc: 'Add a card to bid on live streams',
    buyerCardSaved: 'Card saved',
    buyerCardLast4: 'ending in',
    buyerChangeCard: 'Change card',
    buyerAddCard: 'Add a card',
    buyerSaveCard: 'Save card',
    buyerCardSuccess: 'Card saved successfully!',
    buyerCardError: 'Error saving card',
    buyerNoCard: 'No card saved',
    buyerNoCardDesc: 'Add a payment card to bid on live streams',
    paypalConnected: 'PayPal connected',
    paypalConnectedDesc: 'Your sales will be paid out to your PayPal account.',
    paypalEmail: 'PayPal email',
    paypalChangeEmail: 'Change email',
    paypalSaveEmail: 'Save',
    paypalRecentPayouts: 'Recent payouts',
    paypalNoPayout: 'No payouts yet',
    paypalStatus_pending: 'Pending',
    paypalStatus_ready: 'Ready',
    paypalStatus_processing: 'Processing',
    paypalStatus_completed: 'Completed',
    paypalStatus_failed: 'Failed',
    paypalCountryTitle: 'Payment via PayPal',
    paypalCountryDesc: 'Stripe is not available in your country. Enter your PayPal email to receive payments.',
    paypalCountryPlaceholder: 'email@paypal.com',
    paypalCountrySave: 'Connect PayPal',
    pageDesc: 'This information is required to place a bid, make an order or buy a product during a live. Your card will be charged if a bid or offer is accepted.',
    paymentMethod: 'Payment method',
    shippingDetails: 'Shipping details',
    addPaymentMethod: 'Add a payment method',
    addPaymentMethodDesc: 'No amount will be charged until you purchase an item.',
    creditCard: 'Credit card',
    applePay: 'Apple Pay',
    applePayUnavailable: 'Not available on this device',
    noPaymentMethod: 'No payment method',
    noAddress: 'No address saved',
  },
  he: {
    title: '\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D5\u05DE\u05E9\u05DC\u05D5\u05D7',
    payTitle: '\u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD',
    securePayments: '\u05D7\u05D1\u05E8 \u05D0\u05EA Stripe \u05DC\u05E7\u05D1\u05DC\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD',
    secureDesc: 'Stripe \u05DE\u05E0\u05D4\u05DC \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D1\u05D0\u05D5\u05E4\u05DF \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7.',
    setupPayment: '\u05D4\u05EA\u05D7\u05D1\u05E8 \u05E2\u05DD Stripe',
    selectCountry: '\u05D1\u05D7\u05E8 \u05DE\u05D3\u05D9\u05E0\u05D4',
    selectCountryDesc: 'Stripe \u05E6\u05E8\u05D9\u05DA \u05DC\u05D3\u05E2\u05EA \u05D0\u05EA \u05D4\u05DE\u05D3\u05D9\u05E0\u05D4 \u05E9\u05DC\u05DA \u05DB\u05D3\u05D9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF \u05DE\u05D5\u05DB\u05E8.',
    confirm: '\u05D4\u05DE\u05E9\u05DA',
    cancel: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    countryNotSupported: '\u05D4\u05DE\u05D3\u05D9\u05E0\u05D4 \u05D4\u05D6\u05D5 \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05E0\u05EA\u05DE\u05DB\u05EA \u05E2\u05DC \u05D9\u05D3\u05D9 Stripe.',
    paymentConfigured: 'Stripe \u05DE\u05D7\u05D5\u05D1\u05E8',
    configuredDesc: '\u05D7\u05E9\u05D1\u05D5\u05DF Stripe \u05E9\u05DC\u05DA \u05E4\u05E2\u05D9\u05DC. \u05D0\u05EA\u05D4 \u05D9\u05DB\u05D5\u05DC \u05DC\u05E7\u05D1\u05DC \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD.',
    openDashboard: '\u05E4\u05EA\u05D7 \u05D3\u05E9\u05D1\u05D5\u05E8\u05D3 Stripe',
    pendingDesc: '\u05D7\u05E9\u05D1\u05D5\u05DF Stripe \u05D1\u05D0\u05D9\u05DE\u05D5\u05EA. \u05D4\u05E9\u05DC\u05DD \u05D0\u05EA \u05D4\u05DE\u05D9\u05D3\u05E2 \u05D4\u05D7\u05E1\u05E8.',
    completSetup: '\u05D4\u05E9\u05DC\u05DD \u05D4\u05D2\u05D3\u05E8\u05D4',
    loading: '...\u05D8\u05D5\u05E2\u05DF',
    connecting: '...\u05DE\u05EA\u05D7\u05D1\u05E8 \u05DC-Stripe',
    shipTitle: '\u05D4\u05E2\u05D3\u05E4\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7',
    defaultShip: '\u05DE\u05E9\u05DC\u05D5\u05D7 \u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC',
    standard: '\u05E8\u05D2\u05D9\u05DC (\u05D3\u05D5\u05D0\u05E8)',
    express: '\u05DE\u05D4\u05D9\u05E8 (\u05E9\u05DC\u05D9\u05D7)',
    pickup: '\u05D0\u05D9\u05E1\u05D5\u05E3 \u05E2\u05E6\u05DE\u05D9',
    feesTitle: '\u05D4\u05E2\u05DE\u05DC\u05D5\u05EA \u05E9\u05DC\u05DA',
    feesDesc: '\u05E2\u05DE\u05DC\u05D4 8% + Stripe 2.9% + 0.30\u20AC + \u05DE\u05E2"\u05DE 20%',
    feesExample: '\u05D3\u05D5\u05D2\u05DE\u05D4: \u05DE\u05DB\u05D9\u05E8\u05D4 50\u20AC \u2192 \u05DE\u05E7\u05D1\u05DC\u05D9\u05DD 43.10\u20AC',
    close: '\u05E1\u05D2\u05D5\u05E8',
    pending: '\u05D1\u05D4\u05DE\u05EA\u05E0\u05D4',
    notSellerMsg: '\u05D4\u05E4\u05D5\u05DA \u05DC\u05DE\u05D5\u05DB\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D7\u05D1\u05E8 Stripe \u05D5\u05DC\u05E7\u05D1\u05DC \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD.',
    savedLocally: '\u05E0\u05E9\u05DE\u05E8 \u05D1\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D6\u05D4',
    errorConnect: '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DC-Stripe',
    errorDashboard: '\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E4\u05EA\u05D5\u05D7 \u05D0\u05EA \u05D3\u05E9\u05D1\u05D5\u05E8\u05D3 Stripe',
    errorLoad: '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E1\u05D8\u05D8\u05D5\u05E1 Stripe',
    buyerCardTitle: '\u05DB\u05E8\u05D8\u05D9\u05E1 \u05EA\u05E9\u05DC\u05D5\u05DD',
    buyerCardDesc: '\u05D4\u05D5\u05E1\u05E3 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05DC\u05D4\u05E6\u05D9\u05E2 \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05D7\u05D9\u05D9\u05DD',
    buyerCardSaved: '\u05DB\u05E8\u05D8\u05D9\u05E1 \u05E0\u05E9\u05DE\u05E8',
    buyerCardLast4: '\u05DE\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1',
    buyerChangeCard: '\u05D4\u05D7\u05DC\u05E3 \u05DB\u05E8\u05D8\u05D9\u05E1',
    buyerAddCard: '\u05D4\u05D5\u05E1\u05E3 \u05DB\u05E8\u05D8\u05D9\u05E1',
    buyerSaveCard: '\u05E9\u05DE\u05D5\u05E8 \u05DB\u05E8\u05D8\u05D9\u05E1',
    buyerCardSuccess: '!\u05DB\u05E8\u05D8\u05D9\u05E1 \u05E0\u05E9\u05DE\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4',
    buyerCardError: '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05DB\u05E8\u05D8\u05D9\u05E1',
    buyerNoCard: '\u05D0\u05D9\u05DF \u05DB\u05E8\u05D8\u05D9\u05E1 \u05E9\u05DE\u05D5\u05E8',
    buyerNoCardDesc: '\u05D4\u05D5\u05E1\u05E3 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05DC\u05D4\u05E6\u05D9\u05E2 \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05D7\u05D9\u05D9\u05DD',
    paypalConnected: 'PayPal \u05DE\u05D7\u05D5\u05D1\u05E8',
    paypalConnectedDesc: '\u05D4\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05E9\u05DC\u05DA \u05D9\u05E9\u05D5\u05DC\u05DE\u05D5 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF PayPal \u05E9\u05DC\u05DA.',
    paypalEmail: '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC PayPal',
    paypalChangeEmail: '\u05E9\u05E0\u05D4 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC',
    paypalSaveEmail: '\u05E9\u05DE\u05D5\u05E8',
    paypalRecentPayouts: '\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD',
    paypalNoPayout: '\u05D0\u05D9\u05DF \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05E2\u05D3\u05D9\u05D9\u05DF',
    paypalStatus_pending: '\u05DE\u05DE\u05EA\u05D9\u05DF',
    paypalStatus_ready: '\u05DE\u05D5\u05DB\u05DF',
    paypalStatus_processing: '\u05D1\u05E2\u05D9\u05D1\u05D5\u05D3',
    paypalStatus_completed: '\u05D4\u05D5\u05E9\u05DC\u05DD',
    paypalStatus_failed: '\u05E0\u05DB\u05E9\u05DC',
    paypalCountryTitle: '\u05EA\u05E9\u05DC\u05D5\u05DD \u05D3\u05E8\u05DA PayPal',
    paypalCountryDesc: 'Stripe \u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF \u05D1\u05DE\u05D3\u05D9\u05E0\u05D4 \u05E9\u05DC\u05DA. \u05D4\u05D6\u05DF \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC PayPal \u05DC\u05E7\u05D1\u05DC\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD.',
    paypalCountryPlaceholder: 'email@paypal.com',
    paypalCountrySave: '\u05D7\u05D1\u05E8 PayPal',
    pageDesc: '\u05DE\u05D9\u05D3\u05E2 \u05D6\u05D4 \u05E0\u05D3\u05E8\u05E9 \u05DC\u05D4\u05E6\u05D9\u05E2 \u05D4\u05E6\u05E2\u05D5\u05EA, \u05DC\u05D1\u05E6\u05E2 \u05D4\u05D6\u05DE\u05E0\u05D4 \u05D0\u05D5 \u05DC\u05E7\u05E0\u05D5\u05EA \u05DE\u05D5\u05E6\u05E8 \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8.',
    paymentMethod: '\u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD',
    shippingDetails: '\u05E4\u05E8\u05D8\u05D9 \u05DE\u05E9\u05DC\u05D5\u05D7',
    addPaymentMethod: '\u05D4\u05D5\u05E1\u05E3 \u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD',
    addPaymentMethodDesc: '\u05DC\u05D0 \u05D9\u05D7\u05D5\u05D9\u05D1 \u05E1\u05DB\u05D5\u05DD \u05E2\u05D3 \u05E9\u05EA\u05E8\u05DB\u05D5\u05E9 \u05E4\u05E8\u05D9\u05D8.',
    creditCard: '\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D0\u05E9\u05E8\u05D0\u05D9',
    applePay: 'Apple Pay',
    applePayUnavailable: '\u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF \u05D1\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D6\u05D4',
    noPaymentMethod: '\u05D0\u05D9\u05DF \u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD',
    noAddress: '\u05D0\u05D9\u05DF \u05DB\u05EA\u05D5\u05D1\u05EA \u05E9\u05DE\u05D5\u05E8\u05D4',
  },
  es: {
    title: 'Pagos y Envio',
    payTitle: 'Metodos de Pago',
    securePayments: 'Conecta Stripe para recibir pagos',
    secureDesc: 'Stripe gestiona tus pagos de forma segura. Los compradores pagan y tu recibes tu dinero automaticamente.',
    setupPayment: 'Conectar con Stripe',
    selectCountry: 'Elige tu pais',
    selectCountryDesc: 'Stripe necesita saber tu pais para crear tu cuenta de vendedor.',
    confirm: 'Continuar',
    cancel: 'Cancelar',
    countryNotSupported: 'Este pais aun no es compatible con Stripe.',
    paymentConfigured: 'Stripe conectado',
    configuredDesc: 'Tu cuenta Stripe esta activa. Puedes recibir pagos y acceder a tu panel.',
    openDashboard: 'Abrir mi panel de Stripe',
    pendingDesc: 'Tu cuenta Stripe esta en verificacion. Completa la informacion faltante.',
    completSetup: 'Completar configuracion',
    loading: 'Cargando...',
    connecting: 'Conectando a Stripe...',
    shipTitle: 'Preferencias de Envio',
    defaultShip: 'Envio predeterminado',
    standard: 'Estandar (Correos)',
    express: 'Express (mensajero)',
    pickup: 'Recoger en persona',
    feesTitle: 'Tus comisiones',
    feesDesc: 'Comision 8% + Stripe 2,9% + 0,30\u20AC + IVA 20%',
    feesExample: 'Ejemplo: venta de 50\u20AC \u2192 recibes 43,10\u20AC',
    close: 'Cerrar',
    pending: 'Pendiente',
    notSellerMsg: 'Conviertete en vendedor para conectar Stripe y recibir pagos.',
    savedLocally: 'Guardado en este dispositivo',
    errorConnect: 'Error al conectar con Stripe',
    errorDashboard: 'No se pudo abrir el panel de Stripe',
    errorLoad: 'Error al cargar el estado de Stripe',
    buyerCardTitle: 'Tarjeta bancaria',
    buyerCardDesc: 'Agrega una tarjeta para pujar en directo',
    buyerCardSaved: 'Tarjeta guardada',
    buyerCardLast4: 'terminada en',
    buyerChangeCard: 'Cambiar tarjeta',
    buyerAddCard: 'Agregar tarjeta',
    buyerSaveCard: 'Guardar tarjeta',
    buyerCardSuccess: 'Tarjeta guardada correctamente!',
    buyerCardError: 'Error al guardar la tarjeta',
    buyerNoCard: 'Sin tarjeta guardada',
    buyerNoCardDesc: 'Agrega una tarjeta bancaria para poder pujar en los directos',
    paypalConnected: 'PayPal conectado',
    paypalConnectedDesc: 'Tus ventas se pagaran a tu cuenta PayPal.',
    paypalEmail: 'Email de PayPal',
    paypalChangeEmail: 'Cambiar email',
    paypalSaveEmail: 'Guardar',
    paypalRecentPayouts: 'Pagos recientes',
    paypalNoPayout: 'Sin pagos por ahora',
    paypalStatus_pending: 'Pendiente',
    paypalStatus_ready: 'Listo',
    paypalStatus_processing: 'Procesando',
    paypalStatus_completed: 'Completado',
    paypalStatus_failed: 'Fallido',
    paypalCountryTitle: 'Pago via PayPal',
    paypalCountryDesc: 'Stripe no esta disponible en tu pais. Ingresa tu email de PayPal para recibir pagos.',
    paypalCountryPlaceholder: 'email@paypal.com',
    paypalCountrySave: 'Conectar PayPal',
    pageDesc: 'Esta informacion es necesaria para pujar, hacer un pedido o comprar un producto durante un directo. Se cargara tu tarjeta si una puja u oferta es aceptada.',
    paymentMethod: 'Metodo de pago',
    shippingDetails: 'Detalles de envio',
    addPaymentMethod: 'Agregar metodo de pago',
    addPaymentMethodDesc: 'No se cobrara ningun monto hasta que compres un articulo.',
    creditCard: 'Tarjeta bancaria',
    applePay: 'Apple Pay',
    applePayUnavailable: 'No disponible en este dispositivo',
    noPaymentMethod: 'Sin metodo de pago',
    noAddress: 'Sin direccion guardada',
  },
}

interface StripeStatus {
  connected: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
  details_submitted?: boolean
}

interface CardInfo {
  has_card: boolean
  brand?: string
  last4?: string
  exp_month?: number
  exp_year?: number
}

// Stripe Elements loader
let stripePromise: Promise<Stripe | null> | null = null
function getStripePromise() {
  if (!stripePromise) {
    stripePromise = apiFetch('/api/stripe/config')
      .then(r => r.json())
      .then(({ publishable_key }) => loadStripe(publishable_key))
      .catch(() => null)
  }
  return stripePromise
}

function SetupCardFormInner({ clientSecret, onSuccess, onError, loading, setLoading, saveLabel }: {
  clientSecret: string
  onSuccess: () => void
  onError: (msg: string) => void
  loading: boolean
  setLoading: (v: boolean) => void
  saveLabel: string
}) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return
    setLoading(true)

    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    })

    if (error) {
      onError(error.message || 'Failed to save card')
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        padding: '16px', borderRadius: '10px',
        backgroundColor: '#0D0D0D', border: '1px solid #333',
        minHeight: '48px',
      }}>
        <CardElement options={{
          style: {
            base: {
              fontSize: '17px',
              lineHeight: '24px',
              color: '#fff',
              '::placeholder': { color: '#555' },
              iconColor: '#F0908A',
              fontSmoothing: 'antialiased',
            },
            invalid: { color: '#E8344E' },
          },
        }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%', marginTop: '16px', padding: '16px',
          background: loading ? '#555' : 'linear-gradient(135deg, #F0908A, #E8344E)',
          borderRadius: '14px', border: 'none',
          color: '#fff', fontSize: '16px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '...' : saveLabel}
      </button>
    </form>
  )
}

export default function PaymentsPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const lang = (getLang() || 'fr') as Lang
  const c = content[lang] || content.fr

  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  // Buyer card state
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null)
  const [cardLoading, setCardLoading] = useState(true)
  const [showCardSetup, setShowCardSetup] = useState(false)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupSuccess, setSetupSuccess] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('')

  // PayPal seller state
  const [sellerBankChoice, setSellerBankChoice] = useState<string | null>(null)
  const [bankChoiceLoaded, setBankChoiceLoaded] = useState(false)
  const [paypalEmail, setPaypalEmail] = useState('')
  const [paypalEditEmail, setPaypalEditEmail] = useState('')
  const [paypalEditing, setPaypalEditing] = useState(false)
  const [paypalSaving, setPaypalSaving] = useState(false)
  const [paypalPayouts, setPaypalPayouts] = useState<Array<{ id: string; order_id: string; amount: number; currency: string; status: string; error_message: string | null; completed_at: string | null; created_at: string }>>([])

  const [shippingPref, setShippingPref] = useState<number>(() => {
    const saved = localStorage.getItem('shippingPref')
    return saved !== null ? Number(saved) : 0
  })

  const fetchStatus = useCallback(async () => {
    // Only fetch Stripe status if user is a seller
    if (!profile?.is_seller) {
      setLoading(false)
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const res = await apiFetch('/api/stripe/account-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      } else {
        // Don't show error toast for 404 (no Stripe account yet) or 500 (server issue)
        // Silently fail — the UI will show "Connect Stripe" which is correct
        console.warn('Stripe status check failed:', res.status)
      }
    } catch {
      // Network error — don't show toast, just fail gracefully
      console.warn('Stripe status check failed: network error')
    }
    setLoading(false)
  }, [profile?.is_seller])

  // Fetch PayPal status for seller
  const fetchPaypalStatus = useCallback(async () => {
    if (!profile?.is_seller) {
      setBankChoiceLoaded(true)
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setBankChoiceLoaded(true); return }
      // Fetch seller bank_choice from DB
      const { data: seller } = await supabase
        .from('sellers')
        .select('bank_choice, paypal_email')
        .eq('id', session.user.id)
        .single()
      if (seller) {
        setSellerBankChoice(seller.bank_choice)
        if (seller.paypal_email) {
          setPaypalEmail(seller.paypal_email)
          setPaypalEditEmail(seller.paypal_email)
        }
      }
      setBankChoiceLoaded(true)
      // Fetch payouts
      if (seller?.bank_choice === 'paypal') {
        const res = await apiFetch('/api/paypal/payout-status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setPaypalPayouts(data.payouts || [])
        }
      }
    } catch {
      console.warn('PayPal status check failed')
      setBankChoiceLoaded(true)
    }
  }, [profile?.is_seller])

  const savePaypalEmail = async () => {
    if (!paypalEditEmail.includes('@')) return
    setPaypalSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/paypal/save-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: paypalEditEmail }),
      })
      if (res.ok) {
        setPaypalEmail(paypalEditEmail)
        setPaypalEditing(false)
        showToast(lang === 'fr' ? 'Email PayPal sauvegarde' : 'PayPal email saved', 'success')
      }
    } catch {
      showToast(lang === 'fr' ? 'Erreur' : 'Error', 'error')
    }
    setPaypalSaving(false)
  }

  // Fetch buyer card info
  const fetchCardInfo = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCardLoading(false); return }
      const res = await apiFetch('/api/stripe/card-info', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCardInfo(data)
      }
    } catch {
      console.warn('Card info check failed')
    }
    setCardLoading(false)
  }, [])

  const openCardSetup = async () => {
    setSetupError(null)
    setSetupSuccess(false)
    setSetupLoading(false)
    setSetupClientSecret(null)
    setShowCardSetup(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const resp = await apiFetch('/api/stripe/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        setSetupError(err.error || c.buyerCardError)
        return
      }
      const data = await resp.json()
      if (data.client_secret) {
        setSetupClientSecret(data.client_secret)
      }
    } catch {
      setSetupError(c.buyerCardError)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    fetchCardInfo()
  }, [fetchCardInfo])

  useEffect(() => {
    fetchPaypalStatus()
  }, [fetchPaypalStatus])

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (searchParams.get('stripe') === 'success') {
      fetchStatus()
    }
  }, [searchParams, fetchStatus])

  // Detect Apple Pay availability
  useEffect(() => {
    const checkApplePay = async () => {
      try {
        const stripe = await getStripePromise()
        if (!stripe) return
        const pr = stripe.paymentRequest({
          country: 'FR',
          currency: 'eur',
          total: { label: 'ShaPop', amount: 0 },
        })
        const result = await pr.canMakePayment()
        if (result?.applePay) {
          setApplePayAvailable(true)
        }
      } catch { /* Apple Pay not available */ }
    }
    checkApplePay()
  }, [])

  // Fetch default address
  useEffect(() => {
    if (!user) return
    const fetchAddress = async () => {
      const { data } = await supabase
        .from('addresses')
        .select('name, street, city, zip')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()
      if (data) setDefaultAddress(data)
    }
    fetchAddress()
  }, [user])

  // Refetch Stripe status when in-app browser closes (user returns from Stripe onboarding)
  useEffect(() => {
    let listener: { remove: () => void } | undefined
    Browser.addListener('browserFinished', () => {
      fetchStatus()
    }).then(l => { listener = l })
    return () => { listener?.remove() }
  }, [fetchStatus])

  // Countries list (Stripe + PayPal-only)
  const PAYPAL_ONLY_COUNTRIES = ['IL']
  const allCountries = [
    { code: 'FR', flag: '\uD83C\uDDEB\uD83C\uDDF7', name: { fr: 'France', en: 'France', he: '\u05E6\u05E8\u05E4\u05EA', es: 'Francia' } },
    { code: 'IL', flag: '\uD83C\uDDEE\uD83C\uDDF1', name: { fr: 'Israel', en: 'Israel', he: '\u05D9\u05E9\u05E8\u05D0\u05DC', es: 'Israel' } },
    { code: 'ES', flag: '\uD83C\uDDEA\uD83C\uDDF8', name: { fr: 'Espagne', en: 'Spain', he: '\u05E1\u05E4\u05E8\u05D3', es: 'Espana' } },
    { code: 'US', flag: '\uD83C\uDDFA\uD83C\uDDF8', name: { fr: 'Etats-Unis', en: 'United States', he: '\u05D0\u05E8\u05D4"\u05D1', es: 'Estados Unidos' } },
    { code: 'GB', flag: '\uD83C\uDDEC\uD83C\uDDE7', name: { fr: 'Royaume-Uni', en: 'United Kingdom', he: '\u05D1\u05E8\u05D9\u05D8\u05E0\u05D9\u05D4', es: 'Reino Unido' } },
    { code: 'DE', flag: '\uD83C\uDDE9\uD83C\uDDEA', name: { fr: 'Allemagne', en: 'Germany', he: '\u05D2\u05E8\u05DE\u05E0\u05D9\u05D4', es: 'Alemania' } },
    { code: 'IT', flag: '\uD83C\uDDEE\uD83C\uDDF9', name: { fr: 'Italie', en: 'Italy', he: '\u05D0\u05D9\u05D8\u05DC\u05D9\u05D4', es: 'Italia' } },
    { code: 'PT', flag: '\uD83C\uDDF5\uD83C\uDDF9', name: { fr: 'Portugal', en: 'Portugal', he: '\u05E4\u05D5\u05E8\u05D8\u05D5\u05D2\u05DC', es: 'Portugal' } },
    { code: 'BR', flag: '\uD83C\uDDE7\uD83C\uDDF7', name: { fr: 'Bresil', en: 'Brazil', he: '\u05D1\u05E8\u05D6\u05D9\u05DC', es: 'Brasil' } },
    { code: 'JP', flag: '\uD83C\uDDEF\uD83C\uDDF5', name: { fr: 'Japon', en: 'Japan', he: '\u05D9\u05E4\u05DF', es: 'Japon' } },
    { code: 'CA', flag: '\uD83C\uDDE8\uD83C\uDDE6', name: { fr: 'Canada', en: 'Canada', he: '\u05E7\u05E0\u05D3\u05D4', es: 'Canada' } },
    { code: 'MA', flag: '\uD83C\uDDF2\uD83C\uDDE6', name: { fr: 'Maroc', en: 'Morocco', he: '\u05DE\u05E8\u05D5\u05E7\u05D5', es: 'Marruecos' } },
  ]
  // Payment method picker modal
  const [showMethodPicker, setShowMethodPicker] = useState(false)
  const [applePayAvailable, setApplePayAvailable] = useState(false)

  // Default address
  const [defaultAddress, setDefaultAddress] = useState<{ name: string; street: string; city: string; zip: string } | null>(null)

  const [showPaypalForm, setShowPaypalForm] = useState(false)
  const [countryPaypalEmail, setCountryPaypalEmail] = useState('')
  const [countryPaypalSaving, setCountryPaypalSaving] = useState(false)

  const handleConnect = async (country?: string) => {
    const countryToUse = country || selectedCountry
    if (!countryToUse) {
      // Show country picker first
      setShowPaypalForm(false)
      setShowCountryPicker(true)
      return
    }

    // If PayPal-only country, show PayPal form
    if (PAYPAL_ONLY_COUNTRIES.includes(countryToUse)) {
      setShowPaypalForm(true)
      return
    }

    setShowCountryPicker(false)
    setConnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country: countryToUse }),
      })
      const data = await res.json()
      if (data.url) {
        await Browser.open({ url: data.url })
      } else if (data.error) {
        showToast(data.error, 'error')
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('Stripe connect error:', err)
      showToast(c.errorConnect, 'error')
    }
    setConnecting(false)
  }

  const handleCountryPaypalSave = async () => {
    if (!countryPaypalEmail.includes('@') || !countryPaypalEmail.includes('.')) return
    setCountryPaypalSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/paypal/save-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: countryPaypalEmail }),
      })
      if (res.ok) {
        setPaypalEmail(countryPaypalEmail)
        setPaypalEditEmail(countryPaypalEmail)
        setSellerBankChoice('paypal')
        setShowCountryPicker(false)
        setShowPaypalForm(false)
        showToast(lang === 'fr' ? 'PayPal connecte !' : 'PayPal connected!', 'success')
      }
    } catch {
      showToast(lang === 'fr' ? 'Erreur' : 'Error', 'error')
    }
    setCountryPaypalSaving(false)
  }

  const handleDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/stripe/dashboard-link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      if (data.url) {
        await Browser.open({ url: data.url })
      } else if (data.error) {
        showToast(data.error, 'error')
      }
    } catch {
      showToast(c.errorDashboard, 'error')
    }
  }

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const isFullyConnected = status?.connected && status?.charges_enabled && status?.payouts_enabled
  const isPending = status?.connected && !isFullyConnected

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* ═══════ WHATNOT-STYLE OVERVIEW ═══════ */}
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>{c.title}</h2>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.5, margin: '0 0 24px' }}>{c.pageDesc}</p>

        {/* Mode de paiement row */}
        <div
          onClick={() => setShowMethodPicker(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 0', borderBottom: '1px solid #1A1A1A', cursor: 'pointer',
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F5F5F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {c.paymentMethod}
            </p>
            <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
              {cardInfo?.has_card
                ? `${(cardInfo.brand || 'visa').toLowerCase()} - ${cardInfo.last4} - ${cardInfo.exp_month}/${cardInfo.exp_year}`
                : c.noPaymentMethod}
            </p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>

        {/* Détails d'expédition row */}
        <div
          onClick={() => navigate('/addresses')}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 0', borderBottom: '1px solid #1A1A1A', cursor: 'pointer',
            marginBottom: '32px',
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F5F5F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5a1 1 0 01-1 1h-1"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {c.shippingDetails}
            </p>
            <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0', lineHeight: 1.4 }}>
              {defaultAddress
                ? `${defaultAddress.street}\n${defaultAddress.zip} ${defaultAddress.city}`
                : c.noAddress}
            </p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>

        {/* ═══════ SELLER SECTIONS ═══════ */}
        {/* Payment Methods */}
        {profile?.is_seller && (
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{c.payTitle}</h2>
        )}

        {/* PayPal seller section */}
        {profile?.is_seller && sellerBankChoice === 'paypal' && (
          <div style={{
            backgroundColor: '#111', borderRadius: '14px', padding: '24px',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #003087, #009CDE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#009CDE', margin: '0 0 2px' }}>
                  {c.paypalConnected}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  {c.paypalConnectedDesc}
                </p>
              </div>
            </div>

            {/* PayPal email */}
            <div style={{
              backgroundColor: '#0A0A0A', borderRadius: '10px', padding: '14px',
              marginBottom: '12px',
            }}>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px' }}>{c.paypalEmail}</p>
              {paypalEditing ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    inputMode="email"
                    value={paypalEditEmail}
                    onChange={e => setPaypalEditEmail(e.target.value)}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: '8px',
                      backgroundColor: '#111', border: '1px solid #333',
                      color: '#fff', fontSize: '14px', outline: 'none',
                    }}
                  />
                  <button
                    onClick={savePaypalEmail}
                    disabled={paypalSaving}
                    style={{
                      padding: '10px 16px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #003087, #009CDE)',
                      border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', opacity: paypalSaving ? 0.6 : 1,
                    }}
                  >
                    {c.paypalSaveEmail}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '15px', color: '#fff', fontWeight: 600, margin: 0 }}>
                    {paypalEmail || '—'}
                  </p>
                  <button
                    onClick={() => setPaypalEditing(true)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px',
                      background: 'transparent', border: '1px solid #333',
                      color: '#888', fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    {c.paypalChangeEmail}
                  </button>
                </div>
              )}
            </div>

            {/* Recent payouts */}
            {paypalPayouts.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#888', margin: '16px 0 8px' }}>
                  {c.paypalRecentPayouts}
                </p>
                {paypalPayouts.slice(0, 5).map(p => {
                  const statusColors: Record<string, string> = {
                    pending: '#F59E0B',
                    ready: '#3B82F6',
                    processing: '#8B5CF6',
                    completed: '#22C55E',
                    failed: '#E8344E',
                  }
                  const statusKey = `paypalStatus_${p.status}` as keyof typeof c
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid #1A1A1A',
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', color: '#fff', margin: '0 0 2px', fontWeight: 600 }}>
                          {p.amount.toFixed(2)} {p.currency}
                        </p>
                        <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '12px', fontWeight: 600,
                        color: statusColors[p.status] || '#888',
                        padding: '4px 10px', borderRadius: '6px',
                        backgroundColor: `${statusColors[p.status] || '#888'}15`,
                      }}>
                        {c[statusKey] || p.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {paypalPayouts.length === 0 && paypalEmail && (
              <p style={{ fontSize: '13px', color: '#555', textAlign: 'center', margin: '8px 0 0' }}>
                {c.paypalNoPayout}
              </p>
            )}
          </div>
        )}

        {/* Stripe seller section (hidden if PayPal seller) */}
        {bankChoiceLoaded && sellerBankChoice !== 'paypal' && (
        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '24px',
          textAlign: 'center', marginBottom: '16px',
        }}>
          {loading ? (
            <p style={{ fontSize: '14px', color: '#888' }}>{c.loading}</p>
          ) : isFullyConnected ? (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E', marginBottom: '8px' }}>
                {c.paymentConfigured}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '20px' }}>
                {c.configuredDesc}
              </p>
              <button
                onClick={handleDashboard}
                style={{
                  padding: '12px 24px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6772E5, #4F46E5)',
                  border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.openDashboard}
              </button>
            </>
          ) : isPending ? (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B', marginBottom: '8px' }}>
                Stripe - {c.pending}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '20px' }}>
                {c.pendingDesc}
              </p>
              <button
                onClick={() => handleConnect()}
                disabled={connecting}
                style={{
                  padding: '12px 24px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', opacity: connecting ? 0.6 : 1,
                }}
              >
                {connecting ? c.connecting : c.completSetup}
              </button>
            </>
          ) : (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                {c.securePayments}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '20px', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
                {c.secureDesc}
              </p>
              {profile?.is_seller ? (
                <button
                  onClick={() => handleConnect()}
                  disabled={connecting}
                  style={{
                    padding: '14px 28px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6772E5, #4F46E5)',
                    border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                    cursor: 'pointer', opacity: connecting ? 0.6 : 1,
                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  }}
                >
                  {connecting ? c.connecting : c.setupPayment}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px 0', marginTop: '4px',
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#F59E0B', textDecoration: 'underline' }}>
                    {c.notSellerMsg}
                  </p>
                </button>
              )}
            </>
          )}
        </div>
        )}

        {/* Buyer card section — only visible during card setup */}
        {showCardSetup && (
        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '20px',
          marginBottom: '16px',
        }}>
          {cardLoading ? (
            <p style={{ fontSize: '14px', color: '#888', textAlign: 'center' }}>{c.loading}</p>
          ) : showCardSetup ? (
            <div>
              {setupSuccess ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                    border: '2px solid rgba(34,197,94,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E', margin: '0 0 8px' }}>
                    {c.buyerCardSuccess}
                  </p>
                  <button
                    onClick={() => { setShowCardSetup(false); setSetupSuccess(false); fetchCardInfo() }}
                    style={{
                      padding: '12px 24px', marginTop: '12px',
                      background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                      borderRadius: '12px', border: 'none',
                      color: '#fff', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <>
                  {setupError && (
                    <div style={{
                      padding: '10px 14px', marginBottom: '12px',
                      backgroundColor: 'rgba(232,52,78,0.1)',
                      border: '1px solid rgba(232,52,78,0.3)',
                      borderRadius: '10px',
                    }}>
                      <p style={{ fontSize: '13px', color: '#E8344E', margin: 0 }}>{setupError}</p>
                    </div>
                  )}

                  {setupClientSecret ? (
                    <Elements stripe={getStripePromise()}>
                      <SetupCardFormInner
                        clientSecret={setupClientSecret}
                        onSuccess={() => { setSetupSuccess(true); setSetupLoading(false) }}
                        onError={(msg) => { setSetupError(msg); setSetupLoading(false) }}
                        loading={setupLoading}
                        setLoading={setSetupLoading}
                        saveLabel={c.buyerSaveCard}
                      />
                    </Elements>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                      <div style={{
                        width: '32px', height: '32px', margin: '0 auto',
                        border: '3px solid #333', borderTopColor: '#F0908A',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      }} />
                    </div>
                  )}

                  <button
                    onClick={() => { setShowCardSetup(false); setSetupError(null) }}
                    style={{
                      width: '100%', marginTop: '12px', padding: '10px',
                      backgroundColor: 'transparent',
                      border: '1px solid #333', borderRadius: '10px',
                      color: '#888', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c.close}
                  </button>
                </>
              )}
            </div>
          ) : cardInfo?.has_card ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#22C55E', margin: '0 0 2px' }}>
                  {c.buyerCardSaved}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  {(cardInfo.brand || 'Card').toUpperCase()} {c.buyerCardLast4} {cardInfo.last4}
                </p>
              </div>
              <button
                onClick={openCardSetup}
                style={{
                  padding: '8px 16px', borderRadius: '10px',
                  background: 'transparent', border: '1px solid #333',
                  color: '#aaa', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.buyerChangeCard}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(240,144,138,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                {c.buyerNoCard}
              </p>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto' }}>
                {c.buyerNoCardDesc}
              </p>
              <button
                onClick={openCardSetup}
                style={{
                  padding: '14px 28px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(240,144,138,0.3)',
                }}
              >
                {c.buyerAddCard}
              </button>
            </div>
          )}
        </div>
        )}

        {/* Fees summary */}
        {profile?.is_seller && (
          <div style={{
            backgroundColor: '#111', borderRadius: '14px', padding: '16px 20px',
            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>
              {'\u{1F4B0}'}
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{c.feesTitle}</p>
              <p style={{ fontSize: '12px', color: '#888' }}>{c.feesDesc}</p>
              <p style={{ fontSize: '12px', color: '#F59E0B', marginTop: '2px' }}>{c.feesExample}</p>
            </div>
          </div>
        )}

        {/* Shipping Preferences */}
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{c.shipTitle}</h2>
        <div style={{ backgroundColor: '#111', borderRadius: '14px', overflow: 'hidden' }}>
          <p style={{ fontSize: '12px', color: '#888', padding: '16px 16px 8px' }}>{c.defaultShip}</p>
          {[c.standard, c.express, c.pickup].map((opt, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: i < 2 ? '1px solid #1A1A1A' : 'none', cursor: 'pointer' }}>
              <input type="radio" name="shipping" checked={shippingPref === i} onChange={() => { setShippingPref(i); localStorage.setItem('shippingPref', String(i)) }} style={{ accentColor: '#F0908A' }} />
              <span style={{ fontSize: '15px', color: '#fff' }}>{opt}</span>
            </label>
          ))}
          <p style={{ fontSize: '11px', color: '#555', padding: '8px 16px 12px', textAlign: 'right' }}>{c.savedLocally}</p>
        </div>
      </div>

      {/* ═══════ PAYMENT METHOD PICKER MODAL ═══════ */}
      {showMethodPicker && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowMethodPicker(false)}
        >
          <div
            style={{
              backgroundColor: '#fff', borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: '500px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
              animation: 'slideUp 0.3s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#ccc' }} />
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', padding: '8px 24px 4px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#000', margin: 0 }}>
                {c.addPaymentMethod}
              </h3>
              <p style={{ fontSize: '13px', color: '#888', margin: '8px 0 20px', lineHeight: 1.5 }}>
                {c.addPaymentMethodDesc}
              </p>
            </div>

            {/* Options */}
            <div style={{ padding: '0 24px' }}>
              {/* Carte bancaire */}
              <button
                onClick={() => { setShowMethodPicker(false); openCardSetup() }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '18px 0', borderBottom: '1px solid #eee',
                  background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#eee',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: '44px', height: '30px', borderRadius: '6px', border: '1.5px solid #333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#000', flex: 1 }}>
                  {c.creditCard}
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>

              {/* PayPal */}
              <button
                onClick={() => {
                  setShowMethodPicker(false)
                  // For buyer PayPal: navigate to a PayPal setup or show info
                  showToast(lang === 'fr' ? 'PayPal sera disponible lors du paiement.' : 'PayPal will be available at checkout.', 'info')
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '18px 0', borderBottom: '1px solid #eee',
                  background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#eee',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: '44px', height: '30px', borderRadius: '6px',
                  background: 'linear-gradient(135deg, #003087, #009CDE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '12px', letterSpacing: '-0.5px' }}>Pay</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#000', flex: 1 }}>
                  PayPal
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>

              {/* Apple Pay */}
              <button
                onClick={() => {
                  if (!applePayAvailable) return
                  setShowMethodPicker(false)
                  showToast(lang === 'fr' ? 'Apple Pay sera utilise automatiquement lors du paiement.' : 'Apple Pay will be used automatically at checkout.', 'success')
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '18px 0',
                  background: 'none', border: 'none',
                  cursor: applePayAvailable ? 'pointer' : 'default', textAlign: 'left',
                  opacity: applePayAvailable ? 1 : 0.4,
                }}
              >
                <div style={{
                  width: '44px', height: '30px', borderRadius: '6px', border: '1.5px solid #333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  backgroundColor: '#000',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#000', display: 'block' }}>
                    {c.applePay}
                  </span>
                  {!applePayAvailable && (
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {c.applePayUnavailable}
                    </span>
                  )}
                </div>
                {applePayAvailable && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Country picker modal */}
      {showCountryPicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
          onClick={() => setShowCountryPicker(false)}
        >
          <div
            style={{
              backgroundColor: '#111', borderRadius: '16px',
              padding: '24px', width: '100%', maxWidth: '360px',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px', textAlign: 'center' }}>
              {c.selectCountry}
            </h3>
            <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '20px', lineHeight: 1.5 }}>
              {c.selectCountryDesc}
            </p>
            {showPaypalForm ? (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0,48,135,0.2), rgba(0,156,222,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#009CDE" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#009CDE', textAlign: 'center', marginBottom: '8px' }}>
                  {c.paypalCountryTitle}
                </h4>
                <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '16px', lineHeight: 1.5 }}>
                  {c.paypalCountryDesc}
                </p>
                <input
                  type="email"
                  inputMode="email"
                  value={countryPaypalEmail}
                  onChange={e => setCountryPaypalEmail(e.target.value)}
                  placeholder={c.paypalCountryPlaceholder}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '12px',
                    backgroundColor: '#0A0A0A', border: '1px solid #333',
                    color: '#fff', fontSize: '15px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '12px',
                  }}
                />
                <button
                  onClick={handleCountryPaypalSave}
                  disabled={countryPaypalSaving || !countryPaypalEmail.includes('@')}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: countryPaypalEmail.includes('@') ? 'linear-gradient(135deg, #003087, #009CDE)' : '#333',
                    border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                    cursor: countryPaypalEmail.includes('@') ? 'pointer' : 'not-allowed',
                    opacity: countryPaypalSaving ? 0.6 : 1,
                    marginBottom: '8px',
                  }}
                >
                  {countryPaypalSaving ? '...' : c.paypalCountrySave}
                </button>
                <button
                  onClick={() => { setShowPaypalForm(false); setSelectedCountry('') }}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '10px',
                    backgroundColor: 'transparent', border: '1px solid #333',
                    color: '#888', fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  {c.cancel}
                </button>
              </div>
            ) : (
              <>
                <div style={{ overflowY: 'auto', flex: 1, marginBottom: '16px' }}>
                  {allCountries.map(ct => {
                    const isPaypalOnly = PAYPAL_ONLY_COUNTRIES.includes(ct.code)
                    return (
                      <button
                        key={ct.code}
                        onClick={() => setSelectedCountry(ct.code)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 14px', marginBottom: '4px',
                          borderRadius: '10px', border: 'none', cursor: 'pointer',
                          backgroundColor: selectedCountry === ct.code ? 'rgba(99,102,241,0.15)' : 'transparent',
                          outline: selectedCountry === ct.code ? '2px solid #6366F1' : '2px solid transparent',
                        }}
                      >
                        <span style={{ fontSize: '22px' }}>{ct.flag}</span>
                        <span style={{ fontSize: '15px', color: '#fff', fontWeight: selectedCountry === ct.code ? 700 : 400, flex: 1 }}>
                          {ct.name[lang] || ct.name.en}
                        </span>
                        {isPaypalOnly && (
                          <span style={{ fontSize: '11px', color: '#009CDE', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(0,156,222,0.1)' }}>
                            PayPal
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => { if (selectedCountry) handleConnect(selectedCountry) }}
                  disabled={!selectedCountry || connecting}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: selectedCountry
                      ? PAYPAL_ONLY_COUNTRIES.includes(selectedCountry)
                        ? 'linear-gradient(135deg, #003087, #009CDE)'
                        : 'linear-gradient(135deg, #6772E5, #4F46E5)'
                      : '#333',
                    border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                    cursor: selectedCountry ? 'pointer' : 'not-allowed',
                    opacity: connecting ? 0.6 : 1,
                    marginBottom: '8px',
                  }}
                >
                  {connecting ? c.connecting : c.confirm}
                </button>
              </>
            )}
            <button
              onClick={() => setShowCountryPicker(false)}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                backgroundColor: 'transparent', border: '1px solid #333',
                color: '#888', fontSize: '14px', cursor: 'pointer',
              }}
            >
              {c.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
