import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'

// Admin access is verified server-side via requireAdmin middleware
// Client-side check uses /api/admin/stats response to gate UI

type Lang = 'fr' | 'en' | 'he' | 'es'

const adminContent = {
  fr: {
    pageTitle: 'Administration',
    backOffice: 'ShaPop Back-Office',
    loading: 'Chargement...',
    serverUnreachable: 'Serveur injoignable. Vérifie que le serveur est déployé.',
    error: 'Erreur',
    errorPrefix: 'Erreur',
    invalidResponse: 'Réponse invalide du serveur',
    loadingError: 'Erreur de chargement',
    saveError: 'Erreur de sauvegarde',
    resolutionError: 'Erreur lors de la résolution',
    updateError: 'Erreur lors de la mise à jour',
    serverRequired: 'Le serveur doit être déployé avec les endpoints admin.',
    retry: 'Réessayer',
    close: 'Fermer',
    noData: 'Aucune donnée',
    errorLabel: 'ERREUR : ',
    noTrace: 'Pas de trace',
    errorLinePrefix: 'Erreur ligne : ',
    // Tabs
    tabOverview: 'Vue d\'ensemble',
    tabUsers: 'Utilisateurs',
    tabSellers: 'Vendeurs',
    tabPayments: 'Paiements',
    tabDisputes: 'Litiges',
    tabLives: 'Lives',
    tabAudit: 'Journal',
    // Overview
    statUsers: 'Utilisateurs',
    statSellers: 'Vendeurs',
    statOrders: 'Commandes',
    statOrders30d: 'Commandes (30j)',
    statLivesNow: 'Lives en cours',
    statDisputes: 'Litiges',
    statRevenue: 'Chiffre d\'affaires',
    statFees: 'Frais plateforme',
    statSuspended: 'Suspendus',
    statBanned: 'Bannis',
    statOpenDisputes: 'Litiges ouverts',
    // Users
    searchPlaceholder: 'Rechercher...',
    filterAll: 'Tous',
    filterSellers: 'Vendeurs',
    filterSuspended: 'Suspendus',
    filterBanned: 'Bannis',
    search: 'Chercher',
    users: 'utilisateurs',
    prev: 'Préc.',
    next: 'Suiv.',
    page: 'Page',
    // User badges
    badgeSeller: 'S',
    badgeSuspended: 'SUS',
    badgeBanned: 'BAN',
    // Buyer scores
    riskLow: 'Faible',
    riskMedium: 'Moyen',
    riskHigh: 'Elevé',
    riskBlocked: 'Bloqué',
    scoreLabel: 'Score: ',
    // Sellers
    sellers: 'vendeurs',
    registered: 'Inscrit : ',
    blocked: 'BLOCKED',
    reserveLabel: 'RES',
    docRequested: 'DOC DEM',
    kycVerified: 'KYC',
    kycMissing: '!KYC',
    // Seller trust
    trustNew: 'Nouveau',
    trustStandard: 'Standard',
    trustTrusted: 'Confiance',
    trustPremium: 'Premium',
    retentionLabel: 'Rétention: ',
    payoutDelayLabel: 'Délai paiement: ',
    changeTrustLevel: 'Changer le niveau',
    // Seller metrics
    metricRevenue: 'CA',
    metricOrders: 'Cmd',
    metric30d: '30d',
    metricRefundRate: 'Remb. %',
    metricDisputeRate: 'Litige %',
    // Seller actions
    unblock: 'Débloquer',
    block: 'Bloquer',
    reserve: 'Réserve',
    requestDocs: 'Demander docs',
    viewProfile: 'Voir profil',
    reservePrompt: 'Réserve % (0-100) ?',
    // Payments
    allOrders: 'All',
    orders: 'commandes',
    buyerLabel: 'Acheteur : ',
    sellerLabel: 'Vendeur : ',
    feesLabel: 'Frais : ',
    // Disputes
    disputesLabel: 'litiges/remboursements',
    noDisputes: 'Aucun litige',
    autoRefunded: 'Auto-remboursé',
    orderLabel: 'Commande ',
    openedAt: 'Ouvert : ',
    createdAt: 'Créé : ',
    paidAt: 'Payé : ',
    shippedAt: 'Expédié : ',
    resolvedAt: 'Résolu : ',
    reasonPrefix: 'Motif : ',
    resolutionNotePrefix: 'Note de résolution : ',
    resolutionNotePlaceholder: 'Note de résolution (optionnel)...',
    resolveForBuyer: 'Résoudre en faveur de l\'acheteur',
    resolveForSeller: 'Résoudre en faveur du vendeur',
    buyer: 'Acheteur',
    seller: 'Vendeur',
    shippingProofAlt: 'Preuve expédition',
    // Dispute statuses
    statusOpen: 'Ouvert',
    statusUnderReview: 'En examen',
    statusResolvedBuyer: 'Résolu (acheteur)',
    statusResolvedSeller: 'Résolu (vendeur)',
    statusEscalated: 'Escaladé',
    statusDisputed: 'En litige',
    statusRefunded: 'Remboursé',
    // Lives
    noLives: 'Aucun live',
    viewersLabel: 'Spectateurs : ',
    maxLabel: 'Max : ',
    stopLive: 'Arrêter le live',
    suspendSeller: 'Suspendre le vendeur',
    replayLabel: 'Replay: mux.com/playback/',
    // Audit
    entries: 'entrées',
    auditDate: 'Date',
    auditAdmin: 'Admin',
    auditAction: 'Action',
    auditTarget: 'Cible',
    auditId: 'ID',
    auditDetails: 'Détails',
    // User detail modal
    suspendedBadge: 'SUSPENDU',
    bannedBadge: 'BANNI',
    sellerBadge: 'VENDEUR',
    kycVerifiedBadge: 'KYC VÉRIFIÉ',
    purchasesLabel: 'Achats : ',
    salesLabel: 'Ventes : ',
    storeLabel: 'Boutique : ',
    revenueLabel: 'Revenu : ',
    salesMetricLabel: 'Ventes : ',
    stripeLabel: 'Stripe : ',
    stripeConnected: 'Connecté',
    stripeNo: 'Non',
    paymentsBlocked: 'PAIEMENTS BLOQUÉS',
    reserveBadge: 'RÉSERVE ',
    // User actions
    suspend: 'Suspendre',
    reactivate: 'Réactiver',
    ban: 'Bannir',
    unban: 'Débannir',
    reasonPrompt: 'Motif ?',
    // Notes
    internalNotes: 'Notes internes',
    addNotePlaceholder: 'Ajouter une note...',
    addNote: 'Ajouter',
    // Action messages
    userSuspended: 'Utilisateur suspendu',
    userReactivated: 'Utilisateur réactivé',
    userBanned: 'Utilisateur banni',
    userUnbanned: 'Utilisateur débanni',
    noteAdded: 'Note ajoutée',
    paymentsBlockedMsg: 'Paiements bloqués',
    paymentsUnblockedMsg: 'Paiements débloqués',
    reserveSetMsg: 'Réserve fixée à ',
    docsRequested: 'Documents demandés',
    liveStopped: 'Live arrêté',
    sellerSuspendedLive: 'Vendeur suspendu et live arrêté',
    resolvedBuyerMsg: 'Litige résolu en faveur de l\'acheteur',
    resolvedSellerMsg: 'Litige résolu en faveur du vendeur',
    trustUpdated: 'Niveau de confiance mis à jour',
    // Trust modal
    changeTrustTitle: 'Changer le niveau de confiance',
    trustLevelLabel: 'Niveau de confiance',
    retentionPercentLabel: 'Rétention (%)',
    payoutDelayDaysLabel: 'Délai de paiement (jours)',
    save: 'Enregistrer',
    // Promotions
    tabPromos: 'Promos',
    promoTitle: 'Titre',
    promoDescription: 'Description',
    promoType: 'Type',
    promoTypeCommission: 'Commission',
    promoTypeShipping: 'Livraison',
    promoTypeBoth: 'Les deux',
    promoDiscount: 'Reduction (%)',
    promoStartDate: 'Date de debut',
    promoEndDate: 'Date de fin',
    promoCreate: 'Creer la promotion',
    promoNotify: 'Notifier',
    promoDeactivate: 'Desactiver',
    promoActive: 'Active',
    promoExpired: 'Expiree',
    promoInactive: 'Inactive',
    promoNoPromos: 'Aucune promotion',
    promoCreated: 'Promotion creee',
    promoDeactivated: 'Promotion desactivee',
    promoNotified: 'Notification envoyee',
    promoCreateError: 'Erreur lors de la creation',
    promoNotifyError: 'Erreur lors de la notification',
    promoNewPromo: 'Nouvelle promotion',
    promoExisting: 'Promotions existantes',
  },
  en: {
    pageTitle: 'Administration',
    backOffice: 'ShaPop Back-Office',
    loading: 'Loading...',
    serverUnreachable: 'Server unreachable. Make sure the server is deployed.',
    error: 'Error',
    errorPrefix: 'Error',
    invalidResponse: 'Invalid server response',
    loadingError: 'Loading error',
    saveError: 'Save error',
    resolutionError: 'Error during resolution',
    updateError: 'Error during update',
    serverRequired: 'The server must be deployed with admin endpoints.',
    retry: 'Retry',
    close: 'Close',
    noData: 'No data',
    errorLabel: 'ERROR: ',
    noTrace: 'No trace',
    errorLinePrefix: 'Row error: ',
    tabOverview: 'Overview',
    tabUsers: 'Users',
    tabSellers: 'Sellers',
    tabPayments: 'Payments',
    tabDisputes: 'Disputes',
    tabLives: 'Lives',
    tabAudit: 'Audit log',
    statUsers: 'Users',
    statSellers: 'Sellers',
    statOrders: 'Orders',
    statOrders30d: 'Orders (30d)',
    statLivesNow: 'Lives now',
    statDisputes: 'Disputes',
    statRevenue: 'Revenue',
    statFees: 'Platform fees',
    statSuspended: 'Suspended',
    statBanned: 'Banned',
    statOpenDisputes: 'Open disputes',
    searchPlaceholder: 'Search...',
    filterAll: 'All',
    filterSellers: 'Sellers',
    filterSuspended: 'Suspended',
    filterBanned: 'Banned',
    search: 'Search',
    users: 'users',
    prev: 'Prev',
    next: 'Next',
    page: 'Page',
    badgeSeller: 'S',
    badgeSuspended: 'SUS',
    badgeBanned: 'BAN',
    riskLow: 'Low',
    riskMedium: 'Medium',
    riskHigh: 'High',
    riskBlocked: 'Blocked',
    scoreLabel: 'Score: ',
    sellers: 'sellers',
    registered: 'Registered: ',
    blocked: 'BLOCKED',
    reserveLabel: 'RES',
    docRequested: 'DOC REQ',
    kycVerified: 'KYC',
    kycMissing: '!KYC',
    trustNew: 'New',
    trustStandard: 'Standard',
    trustTrusted: 'Trusted',
    trustPremium: 'Premium',
    retentionLabel: 'Retention: ',
    payoutDelayLabel: 'Payout delay: ',
    changeTrustLevel: 'Change level',
    metricRevenue: 'Rev',
    metricOrders: 'Ord',
    metric30d: '30d',
    metricRefundRate: 'Refund %',
    metricDisputeRate: 'Dispute %',
    unblock: 'Unblock',
    block: 'Block',
    reserve: 'Reserve',
    requestDocs: 'Request docs',
    viewProfile: 'View profile',
    reservePrompt: 'Reserve % (0-100)?',
    allOrders: 'All',
    orders: 'orders',
    buyerLabel: 'Buyer: ',
    sellerLabel: 'Seller: ',
    feesLabel: 'Fees: ',
    disputesLabel: 'disputes/refunds',
    noDisputes: 'No disputes',
    autoRefunded: 'Auto-refunded',
    orderLabel: 'Order ',
    openedAt: 'Opened: ',
    createdAt: 'Created: ',
    paidAt: 'Paid: ',
    shippedAt: 'Shipped: ',
    resolvedAt: 'Resolved: ',
    reasonPrefix: 'Reason: ',
    resolutionNotePrefix: 'Resolution note: ',
    resolutionNotePlaceholder: 'Resolution note (optional)...',
    resolveForBuyer: 'Resolve for buyer',
    resolveForSeller: 'Resolve for seller',
    buyer: 'Buyer',
    seller: 'Seller',
    shippingProofAlt: 'Shipping proof',
    statusOpen: 'Open',
    statusUnderReview: 'Under review',
    statusResolvedBuyer: 'Resolved (buyer)',
    statusResolvedSeller: 'Resolved (seller)',
    statusEscalated: 'Escalated',
    statusDisputed: 'Disputed',
    statusRefunded: 'Refunded',
    noLives: 'No lives',
    viewersLabel: 'Viewers: ',
    maxLabel: 'Max: ',
    stopLive: 'Stop live',
    suspendSeller: 'Suspend seller',
    replayLabel: 'Replay: mux.com/playback/',
    entries: 'entries',
    auditDate: 'Date',
    auditAdmin: 'Admin',
    auditAction: 'Action',
    auditTarget: 'Target',
    auditId: 'ID',
    auditDetails: 'Details',
    suspendedBadge: 'SUSPENDED',
    bannedBadge: 'BANNED',
    sellerBadge: 'SELLER',
    kycVerifiedBadge: 'KYC VERIFIED',
    purchasesLabel: 'Purchases: ',
    salesLabel: 'Sales: ',
    storeLabel: 'Store: ',
    revenueLabel: 'Revenue: ',
    salesMetricLabel: 'Sales: ',
    stripeLabel: 'Stripe: ',
    stripeConnected: 'Connected',
    stripeNo: 'No',
    paymentsBlocked: 'PAYMENTS BLOCKED',
    reserveBadge: 'RESERVE ',
    suspend: 'Suspend',
    reactivate: 'Reactivate',
    ban: 'Ban',
    unban: 'Unban',
    reasonPrompt: 'Reason?',
    internalNotes: 'Internal notes',
    addNotePlaceholder: 'Add a note...',
    addNote: 'Add',
    userSuspended: 'User suspended',
    userReactivated: 'User reactivated',
    userBanned: 'User banned',
    userUnbanned: 'User unbanned',
    noteAdded: 'Note added',
    paymentsBlockedMsg: 'Payments blocked',
    paymentsUnblockedMsg: 'Payments unblocked',
    reserveSetMsg: 'Reserve set to ',
    docsRequested: 'Documents requested',
    liveStopped: 'Live stopped',
    sellerSuspendedLive: 'Seller suspended and live stopped',
    resolvedBuyerMsg: 'Dispute resolved for buyer',
    resolvedSellerMsg: 'Dispute resolved for seller',
    trustUpdated: 'Trust level updated',
    changeTrustTitle: 'Change trust level',
    trustLevelLabel: 'Trust level',
    retentionPercentLabel: 'Retention (%)',
    payoutDelayDaysLabel: 'Payout delay (days)',
    save: 'Save',
    tabPromos: 'Promos',
    promoTitle: 'Title',
    promoDescription: 'Description',
    promoType: 'Type',
    promoTypeCommission: 'Commission',
    promoTypeShipping: 'Shipping',
    promoTypeBoth: 'Both',
    promoDiscount: 'Discount (%)',
    promoStartDate: 'Start date',
    promoEndDate: 'End date',
    promoCreate: 'Create promotion',
    promoNotify: 'Notify',
    promoDeactivate: 'Deactivate',
    promoActive: 'Active',
    promoExpired: 'Expired',
    promoInactive: 'Inactive',
    promoNoPromos: 'No promotions',
    promoCreated: 'Promotion created',
    promoDeactivated: 'Promotion deactivated',
    promoNotified: 'Notification sent',
    promoCreateError: 'Error creating promotion',
    promoNotifyError: 'Error sending notification',
    promoNewPromo: 'New promotion',
    promoExisting: 'Existing promotions',
  },
  he: {
    pageTitle: 'ניהול',
    backOffice: 'ShaPop Back-Office',
    loading: '...טוען',
    serverUnreachable: 'השרת לא זמין. ודא שהשרת מופעל.',
    error: 'שגיאה',
    errorPrefix: 'שגיאה',
    invalidResponse: 'תגובה לא תקינה מהשרת',
    loadingError: 'שגיאת טעינה',
    saveError: 'שגיאת שמירה',
    resolutionError: 'שגיאה בפתרון',
    updateError: 'שגיאה בעדכון',
    serverRequired: 'השרת חייב להיות מופעל עם נקודות קצה של אדמין.',
    retry: 'נסה שנית',
    close: 'סגור',
    noData: 'אין נתונים',
    errorLabel: 'שגיאה: ',
    noTrace: 'אין מעקב',
    errorLinePrefix: 'שגיאת שורה: ',
    tabOverview: 'סקירה',
    tabUsers: 'משתמשים',
    tabSellers: 'מוכרים',
    tabPayments: 'תשלומים',
    tabDisputes: 'סכסוכים',
    tabLives: 'שידורים',
    tabAudit: 'יומן',
    statUsers: 'משתמשים',
    statSellers: 'מוכרים',
    statOrders: 'הזמנות',
    statOrders30d: 'הזמנות (30י)',
    statLivesNow: 'שידורים כעת',
    statDisputes: 'סכסוכים',
    statRevenue: 'מחזור',
    statFees: 'עמלות פלטפורמה',
    statSuspended: 'מושהים',
    statBanned: 'חסומים',
    statOpenDisputes: 'סכסוכים פתוחים',
    searchPlaceholder: '...חפש',
    filterAll: 'הכל',
    filterSellers: 'מוכרים',
    filterSuspended: 'מושהים',
    filterBanned: 'חסומים',
    search: 'חפש',
    users: 'משתמשים',
    prev: 'הקודם',
    next: 'הבא',
    page: 'עמוד',
    badgeSeller: 'מ',
    badgeSuspended: 'מושהה',
    badgeBanned: 'חסום',
    riskLow: 'נמוך',
    riskMedium: 'בינוני',
    riskHigh: 'גבוה',
    riskBlocked: 'חסום',
    scoreLabel: 'ציון: ',
    sellers: 'מוכרים',
    registered: 'רשום: ',
    blocked: 'חסום',
    reserveLabel: 'רזרבה',
    docRequested: 'מסמכים',
    kycVerified: 'KYC',
    kycMissing: '!KYC',
    trustNew: 'חדש',
    trustStandard: 'רגיל',
    trustTrusted: 'מהימן',
    trustPremium: 'פרימיום',
    retentionLabel: 'עיכוב: ',
    payoutDelayLabel: 'עיכוב תשלום: ',
    changeTrustLevel: 'שנה רמה',
    metricRevenue: 'הכנסה',
    metricOrders: 'הזמנות',
    metric30d: '30י',
    metricRefundRate: 'החזר %',
    metricDisputeRate: 'סכסוך %',
    unblock: 'בטל חסימה',
    block: 'חסום',
    reserve: 'רזרבה',
    requestDocs: 'בקש מסמכים',
    viewProfile: 'צפה בפרופיל',
    reservePrompt: 'רזרבה % (0-100)?',
    allOrders: 'הכל',
    orders: 'הזמנות',
    buyerLabel: 'קונה: ',
    sellerLabel: 'מוכר: ',
    feesLabel: 'עמלות: ',
    disputesLabel: 'סכסוכים/החזרים',
    noDisputes: 'אין סכסוכים',
    autoRefunded: 'הוחזר אוטומטית',
    orderLabel: 'הזמנה ',
    openedAt: 'נפתח: ',
    createdAt: 'נוצר: ',
    paidAt: 'שולם: ',
    shippedAt: 'נשלח: ',
    resolvedAt: 'נפתר: ',
    reasonPrefix: 'סיבה: ',
    resolutionNotePrefix: 'הערת פתרון: ',
    resolutionNotePlaceholder: '...הערת פתרון (אופציונלי)',
    resolveForBuyer: 'פתור לטובת הקונה',
    resolveForSeller: 'פתור לטובת המוכר',
    buyer: 'קונה',
    seller: 'מוכר',
    shippingProofAlt: 'הוכחת משלוח',
    statusOpen: 'פתוח',
    statusUnderReview: 'בבדיקה',
    statusResolvedBuyer: 'נפתר (קונה)',
    statusResolvedSeller: 'נפתר (מוכר)',
    statusEscalated: 'הוסלם',
    statusDisputed: 'בסכסוך',
    statusRefunded: 'הוחזר',
    noLives: 'אין שידורים',
    viewersLabel: 'צופים: ',
    maxLabel: 'מקסימום: ',
    stopLive: 'עצור שידור',
    suspendSeller: 'השהה מוכר',
    replayLabel: 'Replay: mux.com/playback/',
    entries: 'רשומות',
    auditDate: 'תאריך',
    auditAdmin: 'אדמין',
    auditAction: 'פעולה',
    auditTarget: 'יעד',
    auditId: 'מזהה',
    auditDetails: 'פרטים',
    suspendedBadge: 'מושהה',
    bannedBadge: 'חסום',
    sellerBadge: 'מוכר',
    kycVerifiedBadge: 'KYC מאומת',
    purchasesLabel: 'רכישות: ',
    salesLabel: 'מכירות: ',
    storeLabel: 'חנות: ',
    revenueLabel: 'הכנסה: ',
    salesMetricLabel: 'מכירות: ',
    stripeLabel: 'Stripe: ',
    stripeConnected: 'מחובר',
    stripeNo: 'לא',
    paymentsBlocked: 'תשלומים חסומים',
    reserveBadge: 'רזרבה ',
    suspend: 'השהה',
    reactivate: 'הפעל מחדש',
    ban: 'חסום',
    unban: 'בטל חסימה',
    reasonPrompt: 'סיבה?',
    internalNotes: 'הערות פנימיות',
    addNotePlaceholder: '...הוסף הערה',
    addNote: 'הוסף',
    userSuspended: 'משתמש הושהה',
    userReactivated: 'משתמש הופעל מחדש',
    userBanned: 'משתמש נחסם',
    userUnbanned: 'חסימת משתמש בוטלה',
    noteAdded: 'הערה נוספה',
    paymentsBlockedMsg: 'תשלומים נחסמו',
    paymentsUnblockedMsg: 'תשלומים שוחררו',
    reserveSetMsg: 'רזרבה נקבעה ל-',
    docsRequested: 'מסמכים התבקשו',
    liveStopped: 'שידור נעצר',
    sellerSuspendedLive: 'מוכר הושהה ושידור נעצר',
    resolvedBuyerMsg: 'סכסוך נפתר לטובת הקונה',
    resolvedSellerMsg: 'סכסוך נפתר לטובת המוכר',
    trustUpdated: 'רמת אמון עודכנה',
    changeTrustTitle: 'שנה רמת אמון',
    trustLevelLabel: 'רמת אמון',
    retentionPercentLabel: '(%עיכוב (אחוז',
    payoutDelayDaysLabel: 'עיכוב תשלום (ימים)',
    save: 'שמור',
    tabPromos: 'מבצעים',
    promoTitle: 'כותרת',
    promoDescription: 'תיאור',
    promoType: 'סוג',
    promoTypeCommission: 'עמלה',
    promoTypeShipping: 'משלוח',
    promoTypeBoth: 'שניהם',
    promoDiscount: 'הנחה (%)',
    promoStartDate: 'תאריך התחלה',
    promoEndDate: 'תאריך סיום',
    promoCreate: 'צור מבצע',
    promoNotify: 'שלח התראה',
    promoDeactivate: 'בטל',
    promoActive: 'פעיל',
    promoExpired: 'פג תוקף',
    promoInactive: 'לא פעיל',
    promoNoPromos: 'אין מבצעים',
    promoCreated: 'מבצע נוצר',
    promoDeactivated: 'מבצע בוטל',
    promoNotified: 'התראה נשלחה',
    promoCreateError: 'שגיאה ביצירת מבצע',
    promoNotifyError: 'שגיאה בשליחת התראה',
    promoNewPromo: 'מבצע חדש',
    promoExisting: 'מבצעים קיימים',
  },
  es: {
    pageTitle: 'Administración',
    backOffice: 'ShaPop Back-Office',
    loading: 'Cargando...',
    serverUnreachable: 'Servidor inaccesible. Verifica que el servidor esté desplegado.',
    error: 'Error',
    errorPrefix: 'Error',
    invalidResponse: 'Respuesta inválida del servidor',
    loadingError: 'Error de carga',
    saveError: 'Error al guardar',
    resolutionError: 'Error durante la resolución',
    updateError: 'Error durante la actualización',
    serverRequired: 'El servidor debe estar desplegado con los endpoints de admin.',
    retry: 'Reintentar',
    close: 'Cerrar',
    noData: 'Sin datos',
    errorLabel: 'ERROR: ',
    noTrace: 'Sin traza',
    errorLinePrefix: 'Error en fila: ',
    tabOverview: 'Resumen',
    tabUsers: 'Usuarios',
    tabSellers: 'Vendedores',
    tabPayments: 'Pagos',
    tabDisputes: 'Disputas',
    tabLives: 'Directos',
    tabAudit: 'Registro',
    statUsers: 'Usuarios',
    statSellers: 'Vendedores',
    statOrders: 'Pedidos',
    statOrders30d: 'Pedidos (30d)',
    statLivesNow: 'Directos ahora',
    statDisputes: 'Disputas',
    statRevenue: 'Ingresos',
    statFees: 'Comisiones',
    statSuspended: 'Suspendidos',
    statBanned: 'Baneados',
    statOpenDisputes: 'Disputas abiertas',
    searchPlaceholder: 'Buscar...',
    filterAll: 'Todos',
    filterSellers: 'Vendedores',
    filterSuspended: 'Suspendidos',
    filterBanned: 'Baneados',
    search: 'Buscar',
    users: 'usuarios',
    prev: 'Ant.',
    next: 'Sig.',
    page: 'Página',
    badgeSeller: 'V',
    badgeSuspended: 'SUS',
    badgeBanned: 'BAN',
    riskLow: 'Bajo',
    riskMedium: 'Medio',
    riskHigh: 'Alto',
    riskBlocked: 'Bloqueado',
    scoreLabel: 'Puntuación: ',
    sellers: 'vendedores',
    registered: 'Registrado: ',
    blocked: 'BLOQUEADO',
    reserveLabel: 'RES',
    docRequested: 'DOC SOL',
    kycVerified: 'KYC',
    kycMissing: '!KYC',
    trustNew: 'Nuevo',
    trustStandard: 'Estándar',
    trustTrusted: 'Confiable',
    trustPremium: 'Premium',
    retentionLabel: 'Retención: ',
    payoutDelayLabel: 'Retraso pago: ',
    changeTrustLevel: 'Cambiar nivel',
    metricRevenue: 'Ingr.',
    metricOrders: 'Ped.',
    metric30d: '30d',
    metricRefundRate: 'Reemb. %',
    metricDisputeRate: 'Disp. %',
    unblock: 'Desbloquear',
    block: 'Bloquear',
    reserve: 'Reserva',
    requestDocs: 'Pedir docs',
    viewProfile: 'Ver perfil',
    reservePrompt: 'Reserva % (0-100)?',
    allOrders: 'Todos',
    orders: 'pedidos',
    buyerLabel: 'Comprador: ',
    sellerLabel: 'Vendedor: ',
    feesLabel: 'Comisiones: ',
    disputesLabel: 'disputas/reembolsos',
    noDisputes: 'Sin disputas',
    autoRefunded: 'Reembolso automático',
    orderLabel: 'Pedido ',
    openedAt: 'Abierto: ',
    createdAt: 'Creado: ',
    paidAt: 'Pagado: ',
    shippedAt: 'Enviado: ',
    resolvedAt: 'Resuelto: ',
    reasonPrefix: 'Motivo: ',
    resolutionNotePrefix: 'Nota de resolución: ',
    resolutionNotePlaceholder: 'Nota de resolución (opcional)...',
    resolveForBuyer: 'Resolver a favor del comprador',
    resolveForSeller: 'Resolver a favor del vendedor',
    buyer: 'Comprador',
    seller: 'Vendedor',
    shippingProofAlt: 'Prueba de envío',
    statusOpen: 'Abierto',
    statusUnderReview: 'En revisión',
    statusResolvedBuyer: 'Resuelto (comprador)',
    statusResolvedSeller: 'Resuelto (vendedor)',
    statusEscalated: 'Escalado',
    statusDisputed: 'En disputa',
    statusRefunded: 'Reembolsado',
    noLives: 'Sin directos',
    viewersLabel: 'Espectadores: ',
    maxLabel: 'Máx: ',
    stopLive: 'Detener directo',
    suspendSeller: 'Suspender vendedor',
    replayLabel: 'Replay: mux.com/playback/',
    entries: 'entradas',
    auditDate: 'Fecha',
    auditAdmin: 'Admin',
    auditAction: 'Acción',
    auditTarget: 'Objetivo',
    auditId: 'ID',
    auditDetails: 'Detalles',
    suspendedBadge: 'SUSPENDIDO',
    bannedBadge: 'BANEADO',
    sellerBadge: 'VENDEDOR',
    kycVerifiedBadge: 'KYC VERIFICADO',
    purchasesLabel: 'Compras: ',
    salesLabel: 'Ventas: ',
    storeLabel: 'Tienda: ',
    revenueLabel: 'Ingresos: ',
    salesMetricLabel: 'Ventas: ',
    stripeLabel: 'Stripe: ',
    stripeConnected: 'Conectado',
    stripeNo: 'No',
    paymentsBlocked: 'PAGOS BLOQUEADOS',
    reserveBadge: 'RESERVA ',
    suspend: 'Suspender',
    reactivate: 'Reactivar',
    ban: 'Banear',
    unban: 'Desbanear',
    reasonPrompt: 'Motivo?',
    internalNotes: 'Notas internas',
    addNotePlaceholder: 'Agregar nota...',
    addNote: 'Agregar',
    userSuspended: 'Usuario suspendido',
    userReactivated: 'Usuario reactivado',
    userBanned: 'Usuario baneado',
    userUnbanned: 'Usuario desbaneado',
    noteAdded: 'Nota agregada',
    paymentsBlockedMsg: 'Pagos bloqueados',
    paymentsUnblockedMsg: 'Pagos desbloqueados',
    reserveSetMsg: 'Reserva fijada en ',
    docsRequested: 'Documentos solicitados',
    liveStopped: 'Directo detenido',
    sellerSuspendedLive: 'Vendedor suspendido y directo detenido',
    resolvedBuyerMsg: 'Disputa resuelta a favor del comprador',
    resolvedSellerMsg: 'Disputa resuelta a favor del vendedor',
    trustUpdated: 'Nivel de confianza actualizado',
    changeTrustTitle: 'Cambiar nivel de confianza',
    trustLevelLabel: 'Nivel de confianza',
    retentionPercentLabel: 'Retención (%)',
    payoutDelayDaysLabel: 'Retraso de pago (días)',
    save: 'Guardar',
    tabPromos: 'Promos',
    promoTitle: 'Titulo',
    promoDescription: 'Descripcion',
    promoType: 'Tipo',
    promoTypeCommission: 'Comision',
    promoTypeShipping: 'Envio',
    promoTypeBoth: 'Ambos',
    promoDiscount: 'Descuento (%)',
    promoStartDate: 'Fecha de inicio',
    promoEndDate: 'Fecha de fin',
    promoCreate: 'Crear promocion',
    promoNotify: 'Notificar',
    promoDeactivate: 'Desactivar',
    promoActive: 'Activa',
    promoExpired: 'Expirada',
    promoInactive: 'Inactiva',
    promoNoPromos: 'Sin promociones',
    promoCreated: 'Promocion creada',
    promoDeactivated: 'Promocion desactivada',
    promoNotified: 'Notificacion enviada',
    promoCreateError: 'Error al crear promocion',
    promoNotifyError: 'Error al enviar notificacion',
    promoNewPromo: 'Nueva promocion',
    promoExisting: 'Promociones existentes',
  },
}

type Tab = 'overview' | 'users' | 'sellers' | 'payments' | 'disputes' | 'lives' | 'audit' | 'promos'

interface Stats {
  users: number; sellers: number; orders: number; orders_30d: number
  lives_now: number; disputes: number; total_revenue: number; total_fees: number
  suspended_users: number; banned_users: number
}

export default function AdminPage() {
  const { user, session, loading: authContextLoading } = useAuth()
  const navigate = useNavigate()
  const lang = (getLang() || 'fr') as Lang
  const ct = adminContent[lang] || adminContent.fr
  const [tab, setTab] = useState<Tab>('overview')

  // Overview
  const [stats, setStats] = useState<Stats | null>(null)

  // Users
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersFilter, setUsersFilter] = useState('all')
  const [_selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null)
  const [userDetail, setUserDetail] = useState<Record<string, unknown> | null>(null)
  const [noteText, setNoteText] = useState('')

  // Sellers
  const [sellers, setSellers] = useState<Record<string, unknown>[]>([])
  const [sellersTotal, setSellersTotal] = useState(0)

  // Payments/Orders
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersStatus, setOrdersStatus] = useState('')

  // Disputes
  const [disputes, setDisputes] = useState<Record<string, unknown>[]>([])
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({})
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)

  // Buyer scores (anti-fraud)
  const [buyerScores, setBuyerScores] = useState<Record<string, Record<string, unknown>>>({})

  // Seller trusts (anti-fraud)
  const [sellerTrusts, setSellerTrusts] = useState<Record<string, Record<string, unknown>>>({})
  const [trustModal, setTrustModal] = useState<{ sellerId: string; trust_level: string; holdback_percent: number; payout_delay_days: number } | null>(null)

  // Lives
  const [streams, setStreams] = useState<Record<string, unknown>[]>([])
  const [streamsFilter, setStreamsFilter] = useState('live')

  // Audit
  const [auditLogs, setAuditLogs] = useState<Record<string, unknown>[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)

  // Promotions
  const [promotions, setPromotions] = useState<Record<string, unknown>[]>([])
  const [promoForm, setPromoForm] = useState({ title: '', description: '', type: 'commission', discount_percent: 50, starts_at: '', ends_at: '' })

  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const token = session?.access_token || ''

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  // Check admin access via server (single source of truth)
  useEffect(() => {
    if (authContextLoading || !token) return
    if (!user) { navigate('/', { replace: true }); return }
    apiFetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.ok) { setIsAdmin(true) } else { setIsAdmin(false); navigate('/', { replace: true }) } })
      .catch(() => { setIsAdmin(false); navigate('/', { replace: true }) })
  }, [user, authContextLoading, token, navigate])

  // Load data when tab changes — MUST be before early returns (Rules of Hooks)
  useEffect(() => {
    if (!token) return
    switch (tab) {
      case 'overview': fetchStats(); break
      case 'users': fetchUsers(); break
      case 'sellers': fetchSellers(); break
      case 'payments': fetchOrders(); break
      case 'disputes': fetchDisputes(); break
      case 'lives': fetchStreams(); break
      case 'audit': fetchAudit(); break
      case 'promos': fetchPromotions(); break
    }
  }, [tab, token])

  if (authContextLoading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="admin-spinner" /></div>

  if (!user || isAdmin !== true) return null

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const adminFetch = async (path: string, opts?: RequestInit) => {
    let res: Response
    try {
      res = await apiFetch(path, { headers, ...opts })
    } catch {
      throw new Error(ct.serverUnreachable)
    }
    if (!res.ok) {
      let msg = `${ct.errorPrefix} ${res.status}`
      try { const body = await res.json(); msg = body.error || msg } catch { /* non-JSON response */ }
      throw new Error(msg)
    }
    try {
      return await res.json()
    } catch {
      throw new Error(ct.invalidResponse)
    }
  }

  const showAction = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 3000)
  }

  // ======== FETCHERS ========

  const fetchStats = async () => {
    if (!token) return
    setLoading(true)
    try {
      const raw = await adminFetch('/api/admin/stats')
      setStats({
        users: Number(raw.users) || 0,
        sellers: Number(raw.sellers) || 0,
        orders: Number(raw.orders) || 0,
        orders_30d: Number(raw.orders_30d) || 0,
        lives_now: Number(raw.lives_now) || 0,
        disputes: Number(raw.disputes) || 0,
        total_revenue: Number(raw.total_revenue) || 0,
        total_fees: Number(raw.total_fees) || 0,
        suspended_users: Number(raw.suspended_users) || 0,
        banned_users: Number(raw.banned_users) || 0,
      })
      setPageError(null)
    } catch (e: any) { setPageError(String(e?.message || ct.loadingError)); showToast(String(e?.message || ct.loadingError)) }
    setLoading(false)
  }

  const fetchUsers = async (page = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const q = new URLSearchParams({ page: String(page), limit: '30', filter: usersFilter })
      if (usersSearch) q.set('search', usersSearch)
      const data = await adminFetch(`/api/admin/users?${q}`)
      setUsers(Array.isArray(data.users) ? data.users : []); setUsersTotal(Number(data.total) || 0); setUsersPage(page)
      // Fetch buyer scores for anti-fraud display
      try {
        const scoresData = await adminFetch('/api/admin/buyer-scores')
        const scoresArr = Array.isArray(scoresData) ? scoresData : Array.isArray(scoresData?.scores) ? scoresData.scores : []
        const scoresMap: Record<string, Record<string, unknown>> = {}
        scoresArr.forEach((s: Record<string, unknown>) => { if (s.user_id) scoresMap[String(s.user_id)] = s })
        setBuyerScores(scoresMap)
      } catch { /* buyer scores not available, non-blocking */ }
    } catch { showToast(ct.loadingError) }
    setLoading(false)
  }

  const fetchUserDetail = async (id: string) => {
    if (!token) return
    try {
      const data = await adminFetch(`/api/admin/users/${id}`)
      setUserDetail(data)
    } catch { showToast(ct.loadingError) }
  }

  const fetchSellers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminFetch('/api/admin/sellers?limit=50')
      setSellers(Array.isArray(data.sellers) ? data.sellers : []); setSellersTotal(Number(data.total) || 0)
      // Fetch seller trust data for anti-fraud display
      try {
        const trustData = await adminFetch('/api/admin/seller-trusts')
        const trustArr = Array.isArray(trustData) ? trustData : Array.isArray(trustData?.trusts) ? trustData.trusts : []
        const trustMap: Record<string, Record<string, unknown>> = {}
        trustArr.forEach((t: Record<string, unknown>) => { if (t.seller_id) trustMap[String(t.seller_id)] = t })
        setSellerTrusts(trustMap)
      } catch { /* seller trusts not available, non-blocking */ }
    } catch { showToast(ct.loadingError) }
    setLoading(false)
  }

  const fetchOrders = async (page = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const q = new URLSearchParams({ page: String(page), limit: '30' })
      if (ordersStatus) q.set('status', ordersStatus)
      const data = await adminFetch(`/api/admin/orders?${q}`)
      setOrders(Array.isArray(data.orders) ? data.orders : []); setOrdersTotal(Number(data.total) || 0); setOrdersPage(page)
    } catch { showToast(ct.loadingError) }
    setLoading(false)
  }

  const fetchDisputes = async () => {
    if (!token) return
    setLoading(true)
    try { const raw = await adminFetch('/api/admin/disputes-enhanced'); setDisputes(Array.isArray(raw) ? raw : Array.isArray(raw?.disputes) ? raw.disputes : []) } catch {
      // Fallback to original endpoint if enhanced is not available
      try { const raw = await adminFetch('/api/admin/disputes'); setDisputes(Array.isArray(raw) ? raw : Array.isArray(raw?.disputes) ? raw.disputes : []) } catch { showToast(ct.loadingError) }
    }
    setLoading(false)
  }

  const fetchStreams = async () => {
    if (!token) return
    setLoading(true)
    try { const raw = await adminFetch(`/api/admin/streams?status=${streamsFilter}`); setStreams(Array.isArray(raw) ? raw : Array.isArray(raw?.streams) ? raw.streams : []) } catch { showToast(ct.loadingError) }
    setLoading(false)
  }

  const fetchAudit = async (page = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminFetch(`/api/admin/audit-log?page=${page}&limit=50`)
      setAuditLogs(Array.isArray(data.logs) ? data.logs : []); setAuditTotal(Number(data.total) || 0); setAuditPage(page)
    } catch { showToast(ct.loadingError) }
    setLoading(false)
  }

  const fetchPromotions = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminFetch('/api/admin/promotions')
      setPromotions(Array.isArray(data) ? data : [])
    } catch { showToast(ct.loadingError) }
    setLoading(false)
  }

  const createPromotion = async () => {
    if (!promoForm.title || !promoForm.starts_at || !promoForm.ends_at) {
      showToast(ct.promoCreateError)
      return
    }
    try {
      await adminFetch('/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(promoForm),
      })
      showAction(ct.promoCreated)
      setPromoForm({ title: '', description: '', type: 'commission', discount_percent: 50, starts_at: '', ends_at: '' })
      fetchPromotions()
    } catch { showToast(ct.promoCreateError) }
  }

  const deactivatePromotion = async (id: string) => {
    try {
      await adminFetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
      showAction(ct.promoDeactivated)
      fetchPromotions()
    } catch { showToast(ct.error) }
  }

  const notifyPromotion = async (id: string) => {
    try {
      await adminFetch(`/api/admin/promotions/${id}/notify`, { method: 'POST' })
      showAction(ct.promoNotified)
    } catch { showToast(ct.promoNotifyError) }
  }

  // ======== ACTIONS ========

  const suspendUser = async (id: string, reason: string) => {
    try {
      await adminFetch(`/api/admin/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) })
      showAction(ct.userSuspended); fetchUsers(usersPage)
      if (userDetail) fetchUserDetail(id)
    } catch { showToast(ct.error) }
  }

  const unsuspendUser = async (id: string) => {
    try {
      await adminFetch(`/api/admin/users/${id}/unsuspend`, { method: 'POST' })
      showAction(ct.userReactivated); fetchUsers(usersPage)
      if (userDetail) fetchUserDetail(id)
    } catch { showToast(ct.error) }
  }

  const banUser = async (id: string, reason: string) => {
    try {
      await adminFetch(`/api/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) })
      showAction(ct.userBanned); fetchUsers(usersPage)
      if (userDetail) fetchUserDetail(id)
    } catch { showToast(ct.error) }
  }

  const unbanUser = async (id: string) => {
    try {
      await adminFetch(`/api/admin/users/${id}/unban`, { method: 'POST' })
      showAction(ct.userUnbanned); fetchUsers(usersPage)
      if (userDetail) fetchUserDetail(id)
    } catch { showToast(ct.error) }
  }

  const addNote = async (id: string) => {
    if (!noteText.trim()) return
    try {
      await adminFetch(`/api/admin/users/${id}/note`, { method: 'POST', body: JSON.stringify({ note: noteText }) })
      setNoteText('')
      showAction(ct.noteAdded); fetchUserDetail(id)
    } catch { showToast(ct.saveError) }
  }

  const blockPayments = async (id: string, block: boolean) => {
    try {
      await adminFetch(`/api/admin/sellers/${id}/block-payments`, { method: 'POST', body: JSON.stringify({ block }) })
      showAction(block ? ct.paymentsBlockedMsg : ct.paymentsUnblockedMsg); fetchSellers()
    } catch { showToast(ct.error) }
  }

  const setReserve = async (id: string, percent: number) => {
    try {
      await adminFetch(`/api/admin/sellers/${id}/reserve`, { method: 'POST', body: JSON.stringify({ percent }) })
      showAction(`${ct.reserveSetMsg}${percent}%`); fetchSellers()
    } catch { showToast(ct.error) }
  }

  const requestDocuments = async (id: string) => {
    try {
      await adminFetch(`/api/admin/sellers/${id}/request-documents`, { method: 'POST' })
      showAction(ct.docsRequested); fetchSellers()
    } catch { showToast(ct.error) }
  }

  const stopStream = async (id: string) => {
    try {
      await adminFetch(`/api/admin/streams/${id}/stop`, { method: 'POST' })
      showAction(ct.liveStopped); fetchStreams()
    } catch { showToast(ct.error) }
  }

  const suspendStreamer = async (id: string) => {
    try {
      await adminFetch(`/api/admin/streams/${id}/suspend-streamer`, { method: 'POST', body: JSON.stringify({ reason: 'Suspended during live by admin' }) })
      showAction(ct.sellerSuspendedLive); fetchStreams()
    } catch { showToast(ct.error) }
  }

  const resolveDispute = async (disputeId: string, resolution: 'buyer' | 'seller') => {
    const note = disputeNotes[disputeId] || ''
    try {
      await adminFetch(`/api/admin/disputes/${disputeId}/resolve`, { method: 'POST', body: JSON.stringify({ resolution, note }) })
      showAction(resolution === 'buyer' ? ct.resolvedBuyerMsg : ct.resolvedSellerMsg)
      setDisputeNotes(prev => { const copy = { ...prev }; delete copy[disputeId]; return copy })
      fetchDisputes()
    } catch { showToast(ct.resolutionError) }
  }

  const updateSellerTrust = async () => {
    if (!trustModal) return
    try {
      await adminFetch(`/api/admin/sellers/${trustModal.sellerId}/trust`, {
        method: 'POST',
        body: JSON.stringify({
          trust_level: trustModal.trust_level,
          holdback_percent: trustModal.holdback_percent,
          payout_delay_days: trustModal.payout_delay_days,
        }),
      })
      showAction(ct.trustUpdated)
      setTrustModal(null)
      fetchSellers()
    } catch { showToast(ct.updateError) }
  }

  // ======== STYLES ========

  const card: React.CSSProperties = {
    backgroundColor: '#111', borderRadius: '14px', padding: '16px',
    border: '1px solid #1A1A1A', marginBottom: '10px',
  }
  const badge = (color: string): React.CSSProperties => ({
    fontSize: '11px', fontWeight: 700, color, backgroundColor: `${color}18`,
    padding: '3px 10px', borderRadius: '8px', border: `1px solid ${color}30`,
    display: 'inline-block',
  })
  const btn = (bg: string): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: '8px', border: 'none',
    background: bg, color: '#fff', fontSize: '12px', fontWeight: 700,
    cursor: 'pointer', marginRight: '6px', marginBottom: '4px',
  })
  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: '10px', border: '1px solid #222',
    backgroundColor: '#0A0A0A', color: '#fff', fontSize: '14px', width: '100%',
    boxSizing: 'border-box',
  }

  // Safe value helper — prevents any object from being rendered as React child
  const sv = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'number') return String(v)
    if (typeof v === 'boolean') return v ? 'true' : ''
    try { return JSON.stringify(v) } catch { return '[object]' }
  }

  // Safe JSON.stringify wrapper that never throws
  const safeStringify = (v: unknown): string => {
    try {
      if (v === null || v === undefined) return '-'
      if (typeof v === 'string') return v
      if (typeof v === 'number') return String(v)
      return JSON.stringify(v)
    } catch {
      return '[unserializable]'
    }
  }

  // Safe boolean check — guarantees a true boolean, never an object
  const sb = (v: unknown): boolean => {
    return v === true || v === 1 || v === 'true'
  }

  const fmtDate = (d: unknown) => {
    if (!d || typeof d !== 'string') return '-'
    try {
      const localeMap: Record<string, string> = { fr: 'fr-FR', en: 'en-US', he: 'he-IL', es: 'es-ES' }
      return new Date(d).toLocaleDateString(localeMap[lang] || 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return '-'
    }
  }
  const fmtMoney = (n: unknown) => typeof n === 'number' ? n.toFixed(2) + ' EUR' : '-'
  const fmtId = (id: unknown) => typeof id === 'string' ? id.slice(0, 8) + '...' : '-'

  // ======== TABS ========
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: ct.tabOverview },
    { id: 'users', label: ct.tabUsers },
    { id: 'sellers', label: ct.tabSellers },
    { id: 'payments', label: ct.tabPayments },
    { id: 'disputes', label: ct.tabDisputes },
    { id: 'lives', label: ct.tabLives },
    { id: 'audit', label: ct.tabAudit },
    { id: 'promos', label: ct.tabPromos },
  ]

  // ======== ERROR DISPLAY ========

  const renderDebugError = (label: string, err: { message: string; stack: string }) => (
    <div style={{
      margin: '16px', padding: '20px', backgroundColor: '#1a0505',
      border: '2px solid #ff3333', borderRadius: '12px',
    }}>
      <p style={{ color: '#ff3333', fontSize: '16px', fontWeight: 900, margin: '0 0 8px' }}>
        {ct.errorLabel + String(label)}
      </p>
      <p style={{ color: '#ff8888', fontSize: '13px', margin: '0 0 12px', wordBreak: 'break-word' }}>
        {String(err.message || 'Unknown error')}
      </p>
      <pre style={{
        color: '#cc6666', fontSize: '10px', margin: 0,
        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        maxHeight: '300px', overflow: 'auto',
        padding: '10px', backgroundColor: '#0a0000', borderRadius: '8px',
      }}>
        {String(err.stack || ct.noTrace)}
      </pre>
      <button
        onClick={() => window.location.reload()}
        style={{ ...btn('#333'), marginTop: '12px' }}
      >
        {ct.close}
      </button>
    </div>
  )

  // ======== RENDER ========

  const renderOverview = () => {
    if (!stats) return <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>{ct.loading}</p>
    const statCards: { label: string; value: string; color: string }[] = [
      { label: ct.statUsers, value: sv(stats.users), color: '#3B82F6' },
      { label: ct.statSellers, value: sv(stats.sellers), color: '#10B981' },
      { label: ct.statOrders, value: sv(stats.orders), color: '#F59E0B' },
      { label: ct.statOrders30d, value: sv(stats.orders_30d), color: '#8B5CF6' },
      { label: ct.statLivesNow, value: sv(stats.lives_now), color: '#E8344E' },
      { label: ct.statDisputes, value: sv(stats.disputes), color: '#EF4444' },
      { label: ct.statRevenue, value: fmtMoney(stats.total_revenue), color: '#10B981' },
      { label: ct.statFees, value: fmtMoney(stats.total_fees), color: '#F0908A' },
      { label: ct.statSuspended, value: sv(stats.suspended_users), color: '#F59E0B' },
      { label: ct.statBanned, value: sv(stats.banned_users), color: '#EF4444' },
      { label: ct.statOpenDisputes, value: sv(disputes.filter(d => sv(d.status) === 'open' || sv(d.status) === 'disputed' || sv(d.status) === 'under_review').length || stats.disputes), color: '#F97316' },
    ]
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', padding: '0 16px' }}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center' }}>
            <p style={{ fontSize: '24px', fontWeight: 900, color: s.color, margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    )
  }

  const renderUsers = () => (
    <div style={{ padding: '0 16px' }}>
      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input
          value={usersSearch}
          onChange={e => setUsersSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchUsers(1)}
          placeholder={ct.searchPlaceholder}
          style={{ ...inputStyle, flex: 1, minWidth: '150px' }}
        />
        <select
          value={usersFilter}
          onChange={e => { setUsersFilter(e.target.value); setTimeout(() => fetchUsers(1), 0) }}
          style={{ ...inputStyle, width: 'auto', minWidth: '120px' }}
        >
          <option value="all">{ct.filterAll}</option>
          <option value="sellers">{ct.filterSellers}</option>
          <option value="suspended">{ct.filterSuspended}</option>
          <option value="banned">{ct.filterBanned}</option>
        </select>
        <button onClick={() => fetchUsers(1)} style={btn('#3B82F6')}>{ct.search}</button>
      </div>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(usersTotal) + ' ' + ct.users}</p>

      {/* User list */}
      {Array.isArray(users) ? users.map((u, i) => (
        <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => { setSelectedUser(u); fetchUserDetail(String(u.id || '')) }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0, overflow: 'hidden',
          }}>
            {(typeof u.avatar_url === 'string' && u.avatar_url) ? <img src={String(u.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (sv(u.display_name)?.[0] || '?')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sv(u.display_name) + ' '}<span style={{ color: '#555', fontWeight: 400 }}>{'@' + sv(u.username)}</span>
            </p>
            <p style={{ color: '#555', fontSize: '11px', margin: '2px 0 0' }}>
              {sv(u.country) + ' | ' + fmtDate(u.created_at) + ' | ' + fmtId(u.id)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
            {sb(u.is_seller) ? <span style={badge('#10B981')}>{ct.badgeSeller}</span> : null}
            {sb(u.is_suspended) ? <span style={badge('#F59E0B')}>{ct.badgeSuspended}</span> : null}
            {sb(u.is_banned) ? <span style={badge('#EF4444')}>{ct.badgeBanned}</span> : null}
            {(() => {
              const bs = buyerScores[String(u.id || '')]
              if (!bs) return null
              const score = Number(bs.buyer_score) || 0
              const risk = sv(bs.risk_level)
              const riskColors: Record<string, string> = { low: '#10B981', medium: '#F59E0B', high: '#F97316', blocked: '#EF4444' }
              const riskLabels: Record<string, string> = { low: ct.riskLow, medium: ct.riskMedium, high: ct.riskHigh, blocked: ct.riskBlocked }
              return (
                <>
                  <span style={{ ...badge(riskColors[risk] || '#666'), fontSize: '10px' }}>{riskLabels[risk] || risk}</span>
                  <span style={{ color: '#888', fontSize: '10px', fontWeight: 600 }}>{ct.scoreLabel + sv(score)}</span>
                </>
              )
            })()}
          </div>
        </div>
      )) : null}

      {/* Pagination */}
      {usersTotal > 30 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
          <button disabled={usersPage <= 1} onClick={() => fetchUsers(usersPage - 1)} style={btn('#333')}>{ct.prev}</button>
          <span style={{ color: '#666', fontSize: '13px', padding: '6px' }}>{ct.page + ' ' + sv(usersPage) + ' / ' + sv(Math.ceil(usersTotal / 30))}</span>
          <button disabled={usersPage * 30 >= usersTotal} onClick={() => fetchUsers(usersPage + 1)} style={btn('#333')}>{ct.next}</button>
        </div>
      ) : null}
    </div>
  )

  const renderSellers = () => (
    <div style={{ padding: '0 16px' }}>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(sellersTotal) + ' ' + ct.sellers}</p>
      {Array.isArray(sellers) ? sellers.map((s, i) => {
        try {
          const rawProfiles = s.profiles
          const rawRiskMetrics = s.risk_metrics
          const p = (rawProfiles && typeof rawProfiles === 'object' && !Array.isArray(rawProfiles)) ? rawProfiles as Record<string, unknown> : null
          const rm = (rawRiskMetrics && typeof rawRiskMetrics === 'object' && !Array.isArray(rawRiskMetrics)) ? rawRiskMetrics as Record<string, number> : null
          const id = String(s.id || '')
          return (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{sv(s.store_name)}</p>
                  <p style={{ color: '#666', fontSize: '12px', margin: '2px 0 0' }}>
                    {(p ? ('@' + sv(p.username) + ' | ' + sv(p.country)) : '') + ' | ' + fmtId(id) + ' | ' + ct.registered + fmtDate(p ? p.created_at : null)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {sb(s.payments_blocked) ? <span style={badge('#EF4444')}>{ct.blocked}</span> : null}
                  {Number(s.reserve_percent) > 0 ? <span style={badge('#F59E0B')}>{sv(s.reserve_percent) + '% ' + ct.reserveLabel}</span> : null}
                  {sb(s.documents_requested) ? <span style={badge('#3B82F6')}>{ct.docRequested}</span> : null}
                  {(p && sb(p.is_suspended)) ? <span style={badge('#F59E0B')}>{ct.badgeSuspended}</span> : null}
                  {sv(s.kyc_status) === 'verified' ? <span style={badge('#10B981')}>{ct.kycVerified}</span> : <span style={badge('#F59E0B')}>{ct.kycMissing}</span>}
                </div>
              </div>

              {/* Trust info (anti-fraud) */}
              {(() => {
                const trust = sellerTrusts[id]
                if (!trust) return null
                const trustLevel = sv(trust.trust_level)
                const trustColors: Record<string, string> = { new: '#888', standard: '#3B82F6', trusted: '#10B981', premium: '#EAB308' }
                const trustLabels: Record<string, string> = { new: ct.trustNew, standard: ct.trustStandard, trusted: ct.trustTrusted, premium: ct.trustPremium }
                return (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={badge(trustColors[trustLevel] || '#666')}>{trustLabels[trustLevel] || trustLevel}</span>
                    {Number(trust.holdback_percent) > 0 ? <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: 600 }}>{ct.retentionLabel + sv(trust.holdback_percent) + '%'}</span> : null}
                    {Number(trust.payout_delay_days) > 0 ? <span style={{ color: '#8B5CF6', fontSize: '11px', fontWeight: 600 }}>{ct.payoutDelayLabel + sv(trust.payout_delay_days) + 'j'}</span> : null}
                    <button onClick={() => setTrustModal({
                      sellerId: id,
                      trust_level: trustLevel || 'new',
                      holdback_percent: Number(trust.holdback_percent) || 0,
                      payout_delay_days: Number(trust.payout_delay_days) || 0,
                    })} style={{ ...btn('#555'), fontSize: '10px', padding: '3px 8px', marginBottom: 0 }}>{ct.changeTrustLevel}</button>
                  </div>
                )
              })()}

              {/* Risk metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '6px', marginBottom: '10px' }}>
                {[
                  { l: ct.metricRevenue, v: fmtMoney(s.total_revenue), c: '#10B981' },
                  { l: ct.metricOrders, v: sv(rm?.total_orders || 0), c: '#3B82F6' },
                  { l: ct.metric30d, v: sv(rm?.orders_30d || 0), c: '#8B5CF6' },
                  { l: ct.metricRefundRate, v: sv(rm?.refund_rate || 0) + '%', c: (rm?.refund_rate || 0) > 5 ? '#EF4444' : '#10B981' },
                  { l: ct.metricDisputeRate, v: sv(rm?.dispute_rate || 0) + '%', c: (rm?.dispute_rate || 0) > 2 ? '#EF4444' : '#10B981' },
                ].map(m => (
                  <div key={m.l} style={{ textAlign: 'center', padding: '6px', backgroundColor: '#0A0A0A', borderRadius: '8px' }}>
                    <p style={{ color: m.c, fontWeight: 700, fontSize: '14px', margin: 0 }}>{m.v}</p>
                    <p style={{ color: '#555', fontSize: '10px', margin: 0 }}>{m.l}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button onClick={() => blockPayments(id, !sb(s.payments_blocked))} style={btn(sb(s.payments_blocked) ? '#10B981' : '#EF4444')}>
                  {sb(s.payments_blocked) ? ct.unblock : ct.block}
                </button>
                <button onClick={() => { const pInput = prompt(ct.reservePrompt, sv(s.reserve_percent || 0)); if (pInput !== null) setReserve(id, Number(pInput)) }} style={btn('#F59E0B')}>
                  {ct.reserve}
                </button>
                {!sb(s.documents_requested) ? (
                  <button onClick={() => requestDocuments(id)} style={btn('#3B82F6')}>{ct.requestDocs}</button>
                ) : null}
                <button onClick={() => { setSelectedUser({ id }); fetchUserDetail(id) }} style={btn('#333')}>{ct.viewProfile}</button>
              </div>
            </div>
          )
        } catch (err: any) {
          return (
            <div key={i} style={card}>
              {renderDebugError('Seller row #' + String(i), { message: String(err?.message || err), stack: String(err?.stack || '') })}
            </div>
          )
        }
      }) : null}
    </div>
  )

  const renderPayments = () => (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {['', 'pending_payment', 'paid', 'shipped', 'delivered', 'refunded', 'disputed'].map(s => (
          <button key={s} onClick={() => { setOrdersStatus(s); setTimeout(() => fetchOrders(1), 0) }}
            style={{
              ...btn(ordersStatus === s ? '#F0908A' : '#222'),
              fontSize: '11px', padding: '5px 10px',
            }}>
            {s || ct.allOrders}
          </button>
        ))}
      </div>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(ordersTotal) + ' ' + ct.orders}</p>
      {Array.isArray(orders) ? orders.map((o, i) => {
        try {
          const rawBuyer = o.buyer
          const rawSellerProfile = o.seller_profile
          const rawItem = o.item
          const buyer = (rawBuyer && typeof rawBuyer === 'object' && !Array.isArray(rawBuyer)) ? rawBuyer as Record<string, unknown> : null
          const seller = (rawSellerProfile && typeof rawSellerProfile === 'object' && !Array.isArray(rawSellerProfile)) ? rawSellerProfile as Record<string, unknown> : null
          const item = (rawItem && typeof rawItem === 'object' && !Array.isArray(rawItem)) ? rawItem as Record<string, unknown> : null
          const statusColor: Record<string, string> = {
            pending_payment: '#F59E0B', paid: '#3B82F6', shipped: '#10B981',
            delivered: '#10B981', refunded: '#8B5CF6', disputed: '#EF4444',
          }
          return (
            <div key={i} style={{ ...card, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item ? sv(item.title) : fmtId(o.id)}
                </p>
                <p style={{ color: '#F0908A', fontWeight: 700, fontSize: '14px', margin: '2px 0' }}>{fmtMoney(o.amount)}</p>
                <p style={{ color: '#555', fontSize: '11px', margin: 0 }}>
                  {ct.buyerLabel + (buyer ? ('@' + sv(buyer.username)) : fmtId(o.buyer_id)) + ' | ' + ct.sellerLabel + (seller ? ('@' + sv(seller.username)) : fmtId(o.seller_id))}
                </p>
                <p style={{ color: '#444', fontSize: '11px', margin: '2px 0 0' }}>
                  {fmtDate(o.created_at) + ' | ' + ct.feesLabel + fmtMoney(o.platform_fee) + ' | ' + fmtId(o.id)}
                </p>
              </div>
              <span style={badge(statusColor[sv(o.status)] || '#666')}>{sv(o.status)}</span>
            </div>
          )
        } catch (err: any) {
          return (
            <div key={i} style={card}>
              {renderDebugError('Order row #' + String(i), { message: String(err?.message || err), stack: String(err?.stack || '') })}
            </div>
          )
        }
      }) : null}
      {ordersTotal > 30 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
          <button disabled={ordersPage <= 1} onClick={() => fetchOrders(ordersPage - 1)} style={btn('#333')}>{ct.prev}</button>
          <span style={{ color: '#666', fontSize: '13px', padding: '6px' }}>{ct.page + ' ' + sv(ordersPage) + ' / ' + sv(Math.ceil(ordersTotal / 30))}</span>
          <button disabled={ordersPage * 30 >= ordersTotal} onClick={() => fetchOrders(ordersPage + 1)} style={btn('#333')}>{ct.next}</button>
        </div>
      ) : null}
    </div>
  )

  const renderDisputes = () => {
    const statusColors: Record<string, string> = {
      open: '#F59E0B', under_review: '#F97316', resolved_buyer: '#10B981',
      resolved_seller: '#3B82F6', escalated: '#EF4444', disputed: '#EF4444', refunded: '#8B5CF6',
    }
    const statusLabels: Record<string, string> = {
      open: ct.statusOpen, under_review: ct.statusUnderReview, resolved_buyer: ct.statusResolvedBuyer,
      resolved_seller: ct.statusResolvedSeller, escalated: ct.statusEscalated, disputed: ct.statusDisputed, refunded: ct.statusRefunded,
    }
    const isResolved = (status: string) => ['resolved_buyer', 'resolved_seller', 'refunded'].includes(status)

    return (
      <div style={{ padding: '0 16px' }}>
        <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(disputes.length) + ' ' + ct.disputesLabel}</p>
        {(Array.isArray(disputes) && disputes.length === 0) ? <p style={{ color: '#555', textAlign: 'center', padding: '40px' }}>{ct.noDisputes}</p> : null}
        {Array.isArray(disputes) ? disputes.map((d, i) => {
          try {
            const rawBuyer = d.buyer
            const rawSellerProfile = d.seller_profile
            const rawItem = d.item
            const buyer = (rawBuyer && typeof rawBuyer === 'object' && !Array.isArray(rawBuyer)) ? rawBuyer as Record<string, unknown> : null
            const seller = (rawSellerProfile && typeof rawSellerProfile === 'object' && !Array.isArray(rawSellerProfile)) ? rawSellerProfile as Record<string, unknown> : null
            const item = (rawItem && typeof rawItem === 'object' && !Array.isArray(rawItem)) ? rawItem as Record<string, unknown> : null
            const disputeId = String(d.id || d.dispute_id || '')
            const status = sv(d.dispute_status || d.status)
            const evidencePhotos = Array.isArray(d.evidence_photos) ? d.evidence_photos as string[] : []
            const shippingProofs = Array.isArray(d.shipping_proofs) ? d.shipping_proofs as string[] : []
            const shippingProofUrl = typeof d.shipping_proof_url === 'string' ? d.shipping_proof_url : ''

            return (
              <div key={i} style={{ ...card, padding: '20px' }}>
                {/* Header: status + auto-refund */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={badge(statusColors[status] || '#666')}>{statusLabels[status] || status}</span>
                    {sb(d.auto_refund) ? <span style={badge('#10B981')}>{ct.autoRefunded}</span> : null}
                  </div>
                  <p style={{ color: '#F0908A', fontWeight: 700, fontSize: '16px', margin: 0 }}>{fmtMoney(d.amount)}</p>
                </div>

                {/* Order context */}
                {item ? (
                  <p style={{ color: '#ddd', fontWeight: 600, fontSize: '14px', margin: '0 0 8px' }}>{sv(item.title)}</p>
                ) : (
                  <p style={{ color: '#888', fontSize: '13px', margin: '0 0 8px' }}>{ct.orderLabel + fmtId(d.order_id || d.id)}</p>
                )}

                {/* Buyer + Seller info side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {/* Buyer */}
                  <div style={{ padding: '10px', backgroundColor: '#0A0A0A', borderRadius: '10px' }}>
                    <p style={{ color: '#888', fontSize: '10px', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ct.buyer}</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#222',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', flexShrink: 0, overflow: 'hidden',
                      }}>
                        {(buyer && typeof buyer.avatar_url === 'string' && buyer.avatar_url)
                          ? <img src={String(buyer.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (buyer ? (sv(buyer.display_name)?.[0] || sv(buyer.username)?.[0] || '?') : '?')}
                      </div>
                      <div>
                        <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>{buyer ? (sv(buyer.display_name) || '@' + sv(buyer.username)) : '?'}</p>
                        {buyer ? <p style={{ color: '#555', fontSize: '11px', margin: '1px 0 0' }}>{'@' + sv(buyer.username)}</p> : null}
                      </div>
                    </div>
                    {/* Evidence photos */}
                    {evidencePhotos.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {evidencePhotos.map((photo, pi) => (
                          <img key={pi} src={String(photo)} alt={'Evidence ' + (pi + 1)}
                            onClick={() => setEnlargedImage(String(photo))}
                            style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #333', cursor: 'pointer' }} />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Seller */}
                  <div style={{ padding: '10px', backgroundColor: '#0A0A0A', borderRadius: '10px' }}>
                    <p style={{ color: '#888', fontSize: '10px', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ct.seller}</p>
                    <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>{seller ? (sv(seller.display_name) || '@' + sv(seller.username)) : '?'}</p>
                    {seller ? <p style={{ color: '#555', fontSize: '11px', margin: '1px 0 0' }}>{'@' + sv(seller.username)}</p> : null}
                    {/* Shipping proofs */}
                    {(shippingProofs.length > 0 || shippingProofUrl) ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {shippingProofUrl ? (
                          <img src={shippingProofUrl} alt={ct.shippingProofAlt}
                            onClick={() => setEnlargedImage(shippingProofUrl)}
                            style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #333', cursor: 'pointer' }} />
                        ) : null}
                        {shippingProofs.map((proof, pi) => (
                          <img key={pi} src={String(proof)} alt={'Shipping ' + (pi + 1)}
                            onClick={() => setEnlargedImage(String(proof))}
                            style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #333', cursor: 'pointer' }} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {d.opened_at ? <span style={{ color: '#666', fontSize: '11px' }}>{ct.openedAt + fmtDate(d.opened_at)}</span> : null}
                  {d.created_at ? <span style={{ color: '#666', fontSize: '11px' }}>{ct.createdAt + fmtDate(d.created_at)}</span> : null}
                  {d.paid_at ? <span style={{ color: '#666', fontSize: '11px' }}>{ct.paidAt + fmtDate(d.paid_at)}</span> : null}
                  {d.shipped_at ? <span style={{ color: '#666', fontSize: '11px' }}>{ct.shippedAt + fmtDate(d.shipped_at)}</span> : null}
                  {d.resolved_at ? <span style={{ color: '#666', fontSize: '11px' }}>{ct.resolvedAt + fmtDate(d.resolved_at)}</span> : null}
                </div>

                {/* Dispute reason */}
                {d.reason ? <p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 10px', fontStyle: 'italic' }}>{ct.reasonPrefix + sv(d.reason)}</p> : null}

                {/* Resolution note (if already resolved) */}
                {d.resolution_note ? <p style={{ color: '#888', fontSize: '12px', margin: '0 0 10px' }}>{ct.resolutionNotePrefix + sv(d.resolution_note)}</p> : null}

                {/* Resolution controls (only if not already resolved) */}
                {!isResolved(status) ? (
                  <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '12px', marginTop: '4px' }}>
                    <textarea
                      value={disputeNotes[disputeId] || ''}
                      onChange={e => setDisputeNotes(prev => ({ ...prev, [disputeId]: e.target.value }))}
                      placeholder={ct.resolutionNotePlaceholder}
                      style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => resolveDispute(disputeId, 'buyer')} style={btn('#10B981')}>
                        {ct.resolveForBuyer}
                      </button>
                      <button onClick={() => resolveDispute(disputeId, 'seller')} style={btn('#3B82F6')}>
                        {ct.resolveForSeller}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          } catch (err: any) {
            return (
              <div key={i} style={card}>
                {renderDebugError('Dispute row #' + String(i), { message: String(err?.message || err), stack: String(err?.stack || '') })}
              </div>
            )
          }
        }) : null}
      </div>
    )
  }

  const renderLives = () => (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {['live', 'scheduled', 'ended'].map(s => (
          <button key={s} onClick={() => { setStreamsFilter(s); setTimeout(fetchStreams, 0) }}
            style={{ ...btn(streamsFilter === s ? '#F0908A' : '#222'), fontSize: '12px' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {(Array.isArray(streams) && streams.length === 0) ? <p style={{ color: '#555', textAlign: 'center', padding: '40px' }}>{ct.noLives}</p> : null}
      {Array.isArray(streams) ? streams.map((s, i) => {
        try {
          const rawSeller = s.seller
          const seller = (rawSeller && typeof rawSeller === 'object' && !Array.isArray(rawSeller)) ? rawSeller as Record<string, unknown> : null
          const rawSellerProfiles = seller ? seller.profiles : null
          const sellerProfile = (rawSellerProfiles && typeof rawSellerProfiles === 'object' && !Array.isArray(rawSellerProfiles)) ? rawSellerProfiles as Record<string, unknown> : null
          return (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{sv(s.title)}</p>
                  <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>
                    {(seller ? sv(seller.store_name) : '?') + ' (' + (sellerProfile ? ('@' + sv(sellerProfile.username)) : '?') + ')'}
                  </p>
                  <p style={{ color: '#555', fontSize: '11px', margin: '2px 0 0' }}>
                    {ct.viewersLabel + sv(s.viewer_count) + ' | ' + ct.maxLabel + sv(s.peak_viewers) + ' | ' + sv(s.category) + ' | ' + fmtDate(s.started_at || s.scheduled_at)}
                  </p>
                </div>
                <span style={badge(sv(s.status) === 'live' ? '#E8344E' : sv(s.status) === 'scheduled' ? '#3B82F6' : '#555')}>
                  {sv(s.status).toUpperCase()}
                </span>
              </div>
              {sv(s.status) === 'live' ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => stopStream(String(s.id || ''))} style={btn('#EF4444')}>{ct.stopLive}</button>
                  <button onClick={() => suspendStreamer(String(s.id || ''))} style={btn('#F59E0B')}>{ct.suspendSeller}</button>
                </div>
              ) : null}
              {(typeof s.mux_playback_id === 'string' && s.mux_playback_id && sv(s.status) === 'ended') ? (
                <p style={{ color: '#3B82F6', fontSize: '12px', margin: '8px 0 0' }}>
                  {ct.replayLabel + sv(s.mux_playback_id)}
                </p>
              ) : null}
            </div>
          )
        } catch (err: any) {
          return (
            <div key={i} style={card}>
              {renderDebugError('Stream row #' + String(i), { message: String(err?.message || err), stack: String(err?.stack || '') })}
            </div>
          )
        }
      }) : null}
    </div>
  )

  const renderAudit = () => (
    <div style={{ padding: '0 16px' }}>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{sv(auditTotal) + ' ' + ct.entries}</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {[ct.auditDate, ct.auditAdmin, ct.auditAction, ct.auditTarget, ct.auditId, ct.auditDetails].map(h => (
                <th key={h} style={{ color: '#888', fontWeight: 600, padding: '8px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.isArray(auditLogs) ? auditLogs.map((log, i) => {
              try {
                const actionStr = sv(log.action)
                const adminEmailStr = sv(log.admin_email)
                const detailsStr: string = (log.details && typeof log.details === 'object') ? safeStringify(log.details) : '-'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                    <td style={{ color: '#666', padding: '8px 6px', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</td>
                    <td style={{ color: '#aaa', padding: '8px 6px' }}>{adminEmailStr.split('@')[0]}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={badge(
                        actionStr.includes('ban') ? '#EF4444' :
                        actionStr.includes('suspend') ? '#F59E0B' :
                        actionStr.includes('block') ? '#EF4444' :
                        '#3B82F6'
                      )}>{actionStr}</span>
                    </td>
                    <td style={{ color: '#888', padding: '8px 6px' }}>{sv(log.target_type)}</td>
                    <td style={{ color: '#555', padding: '8px 6px', fontFamily: 'monospace' }}>{fmtId(log.target_id)}</td>
                    <td style={{ color: '#555', padding: '8px 6px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {detailsStr}
                    </td>
                  </tr>
                )
              } catch (err: any) {
                return (
                  <tr key={i}>
                    <td colSpan={6} style={{ color: '#ff3333', padding: '8px 6px' }}>
                      {ct.errorLinePrefix + String(err?.message || err)}
                    </td>
                  </tr>
                )
              }
            }) : null}
          </tbody>
        </table>
      </div>
      {auditTotal > 50 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px 0' }}>
          <button disabled={auditPage <= 1} onClick={() => fetchAudit(auditPage - 1)} style={btn('#333')}>{ct.prev}</button>
          <span style={{ color: '#666', fontSize: '13px', padding: '6px' }}>{ct.page + ' ' + sv(auditPage) + ' / ' + sv(Math.ceil(auditTotal / 50))}</span>
          <button disabled={auditPage * 50 >= auditTotal} onClick={() => fetchAudit(auditPage + 1)} style={btn('#333')}>{ct.next}</button>
        </div>
      ) : null}
    </div>
  )

  const renderPromos = () => {
    const now = new Date()
    const getPromoStatus = (p: Record<string, unknown>): 'active' | 'expired' | 'inactive' => {
      if (!p.is_active) return 'inactive'
      const starts = new Date(String(p.starts_at))
      const ends = new Date(String(p.ends_at))
      if (now >= starts && now <= ends) return 'active'
      return 'expired'
    }
    const statusColor: Record<string, string> = { active: '#10B981', expired: '#666', inactive: '#EF4444' }
    const statusLabel: Record<string, string> = { active: ct.promoActive, expired: ct.promoExpired, inactive: ct.promoInactive }
    const typeLabel: Record<string, string> = { commission: ct.promoTypeCommission, shipping: ct.promoTypeShipping, both: ct.promoTypeBoth }

    return (
      <div style={{ padding: '0 16px' }}>
        {/* Create form */}
        <div style={{ ...card, marginBottom: '20px' }}>
          <p style={{ color: '#F0908A', fontSize: '16px', fontWeight: 800, margin: '0 0 14px' }}>{ct.promoNewPromo}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              placeholder={ct.promoTitle}
              value={promoForm.title}
              onChange={e => setPromoForm(f => ({ ...f, title: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder={ct.promoDescription}
              value={promoForm.description}
              onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={promoForm.type}
                onChange={e => setPromoForm(f => ({ ...f, type: e.target.value }))}
                style={{ ...inputStyle, flex: 1 }}
              >
                <option value="commission">{ct.promoTypeCommission}</option>
                <option value="shipping">{ct.promoTypeShipping}</option>
                <option value="both">{ct.promoTypeBoth}</option>
              </select>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#888', fontSize: '13px', flexShrink: 0 }}>{ct.promoDiscount}</span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={10}
                  value={promoForm.discount_percent}
                  onChange={e => setPromoForm(f => ({ ...f, discount_percent: Number(e.target.value) }))}
                  style={{ flex: 1, accentColor: '#F0908A' }}
                />
                <span style={{ color: '#F0908A', fontSize: '16px', fontWeight: 800, minWidth: '44px', textAlign: 'right' }}>
                  {promoForm.discount_percent}%
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>{ct.promoStartDate}</label>
                <input
                  type="datetime-local"
                  value={promoForm.starts_at}
                  onChange={e => setPromoForm(f => ({ ...f, starts_at: e.target.value }))}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '4px' }}>{ct.promoEndDate}</label>
                <input
                  type="datetime-local"
                  value={promoForm.ends_at}
                  onChange={e => setPromoForm(f => ({ ...f, ends_at: e.target.value }))}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>
            </div>
            <button
              onClick={createPromotion}
              style={{
                ...btn('linear-gradient(135deg, #F0908A, #E8344E)'),
                padding: '12px 20px',
                fontSize: '14px',
                width: '100%',
                borderRadius: '12px',
                marginRight: 0,
              }}
            >
              {ct.promoCreate}
            </button>
          </div>
        </div>

        {/* Existing promotions */}
        <p style={{ color: '#888', fontSize: '14px', fontWeight: 700, margin: '0 0 10px' }}>{ct.promoExisting}</p>
        {promotions.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '30px', fontSize: '13px' }}>{ct.promoNoPromos}</p>
        ) : promotions.map((p, i) => {
          const status = getPromoStatus(p)
          const color = statusColor[status]
          return (
            <div key={i} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: '0 0 2px' }}>{sv(p.title)}</p>
                  {p.description && <p style={{ color: '#888', fontSize: '12px', margin: '0 0 4px' }}>{sv(p.description)}</p>}
                </div>
                <span style={badge(color)}>{statusLabel[status]}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={badge('#8B5CF6')}>{typeLabel[sv(p.type)] || sv(p.type)}</span>
                <span style={badge('#F0908A')}>-{sv(p.discount_percent)}%</span>
                <span style={{ color: '#555', fontSize: '11px' }}>
                  {fmtDate(p.starts_at)} → {fmtDate(p.ends_at)}
                </span>
              </div>
              {status === 'active' && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button onClick={() => notifyPromotion(sv(p.id))} style={btn('#8B5CF6')}>{ct.promoNotify}</button>
                  <button onClick={() => deactivatePromotion(sv(p.id))} style={btn('#EF4444')}>{ct.promoDeactivate}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderContent = () => {
    try {
      switch (tab) {
        case 'overview': return renderOverview()
        case 'users': return renderUsers()
        case 'sellers': return renderSellers()
        case 'payments': return renderPayments()
        case 'disputes': return renderDisputes()
        case 'lives': return renderLives()
        case 'audit': return renderAudit()
        case 'promos': return renderPromos()
        default: return null
      }
    } catch (err: any) {
      return renderDebugError('renderContent (tab=' + String(tab) + ')', { message: String(err?.message || err), stack: String(err?.stack || '') })
    }
  }

  try {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '40px' }}>
        <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}>
          {/* Header */}
          <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: 0 }}>{ct.pageTitle}</h1>
                <p style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>{ct.backOffice}</p>
              </div>
            </div>
            {loading ? <div className="admin-spinner" style={{ width: '20px', height: '20px' }} /> : null}
          </div>

          {/* Action message */}
          {actionMsg ? (
            <div style={{
              position: 'fixed', top: '60px', left: '50%', transform: 'translateX(-50%)',
              backgroundColor: '#10B981', color: '#fff', padding: '10px 24px',
              borderRadius: '12px', fontSize: '14px', fontWeight: 700, zIndex: 9999,
              boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
            }}>
              {actionMsg}
            </div>
          ) : null}

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: '4px', padding: '16px 16px 12px',
            overflowX: 'auto',
          }} className="no-scrollbar">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 14px', borderRadius: '10px', flexShrink: 0,
                  cursor: 'pointer', fontSize: '13px', fontWeight: tab === t.id ? 700 : 500,
                  background: tab === t.id ? 'rgba(240,144,138,0.12)' : '#0D0D0D',
                  border: tab === t.id ? '1px solid rgba(240,144,138,0.3)' : '1px solid #1A1A1A',
                  color: tab === t.id ? '#F0908A' : '#666',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Error banner */}
          {pageError ? (
            <div style={{ margin: '16px', padding: '16px', backgroundColor: '#1a0a0a', border: '1px solid #E8344E', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ color: '#E8344E', fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>{String(pageError)}</p>
              <p style={{ color: '#666', fontSize: '12px', margin: '0 0 12px' }}>{ct.serverRequired}</p>
              <button onClick={() => { setPageError(null); fetchStats() }} style={btn('#333')}>{ct.retry}</button>
            </div>
          ) : null}

          {/* Content */}
          {!pageError ? renderContent() : null}
        </div>

        {/* User detail modal — global so it works from any tab */}
        {userDetail ? (
          <div onClick={() => setUserDetail(null)} style={{
            position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px',
            overflowY: 'auto',
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              ...card, maxWidth: '500px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
            }}>
              {(() => {
                try {
                  const rawProfile = userDetail.profile
                  const rawSeller = userDetail.seller
                  const rawNotes = userDetail.notes
                  const rawStats = userDetail.stats

                  const p = (rawProfile && typeof rawProfile === 'object') ? rawProfile as Record<string, unknown> : null
                  const s = (rawSeller && typeof rawSeller === 'object') ? rawSeller as Record<string, unknown> : null
                  const notes = Array.isArray(rawNotes) ? rawNotes as Record<string, unknown>[] : []
                  const st = (rawStats && typeof rawStats === 'object') ? rawStats as Record<string, number> : null
                  if (!p) return <p style={{ color: '#666' }}>{ct.noData}</p>
                  const uid = String(p.id || '')
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <p style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: 0 }}>{sv(p.display_name)}</p>
                          <p style={{ color: '#888', fontSize: '13px', margin: '2px 0 0' }}>{'@' + sv(p.username) + ' | ' + sv(p.country) + ' | ' + fmtId(uid)}</p>
                        </div>
                        <button onClick={() => setUserDetail(null)} style={{ ...btn('#333'), marginRight: 0 }}>{'X'}</button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {sb(p.is_suspended) ? <span style={badge('#F59E0B')}>{ct.suspendedBadge}</span> : null}
                        {sb(p.is_banned) ? <span style={badge('#EF4444')}>{ct.bannedBadge}</span> : null}
                        {sb(p.is_seller) ? <span style={badge('#10B981')}>{ct.sellerBadge}</span> : null}
                        {(s && sv(s.kyc_status) === 'verified') ? <span style={badge('#3B82F6')}>{ct.kycVerifiedBadge}</span> : null}
                      </div>

                      <p style={{ color: '#666', fontSize: '12px' }}>
                        {ct.registered + fmtDate(p.created_at) + ' | ' + ct.purchasesLabel + sv(st?.total_purchases || 0) + ' (' + fmtMoney(st?.total_spent || 0) + ') | ' + ct.salesLabel + sv(st?.total_sales || 0) + ' (' + fmtMoney(st?.total_earned || 0) + ')'}
                      </p>

                      {s ? (
                        <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#0A0A0A', borderRadius: '10px' }}>
                          <p style={{ color: '#aaa', fontSize: '13px', fontWeight: 600, margin: '0 0 4px' }}>{ct.storeLabel + sv(s.store_name)}</p>
                          <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>
                            {ct.revenueLabel + fmtMoney(s.total_revenue) + ' | ' + ct.salesMetricLabel + sv(s.total_sales) + ' | ' + ct.stripeLabel + (s.stripe_account_id ? ct.stripeConnected : ct.stripeNo)}
                          </p>
                          {sb(s.payments_blocked) ? <span style={badge('#EF4444')}>{ct.paymentsBlocked}</span> : null}
                          {Number(s.reserve_percent) > 0 ? <span style={badge('#F59E0B')}>{ct.reserveBadge + sv(s.reserve_percent) + '%'}</span> : null}
                        </div>
                      ) : null}

                      {/* Actions */}
                      <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(!sb(p.is_suspended) && !sb(p.is_banned)) ? (
                          <button onClick={() => { const r = prompt(ct.reasonPrompt); if (r) suspendUser(uid, r) }} style={btn('#F59E0B')}>{ct.suspend}</button>
                        ) : null}
                        {(sb(p.is_suspended) && !sb(p.is_banned)) ? (
                          <button onClick={() => unsuspendUser(uid)} style={btn('#10B981')}>{ct.reactivate}</button>
                        ) : null}
                        {!sb(p.is_banned) ? (
                          <button onClick={() => { const r = prompt(ct.reasonPrompt); if (r) banUser(uid, r) }} style={btn('#EF4444')}>{ct.ban}</button>
                        ) : null}
                        {sb(p.is_banned) ? (
                          <button onClick={() => unbanUser(uid)} style={btn('#10B981')}>{ct.unban}</button>
                        ) : null}
                      </div>

                      {/* Notes */}
                      <div style={{ marginTop: '20px' }}>
                        <p style={{ color: '#aaa', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>{ct.internalNotes + ' (' + sv(notes.length) + ')'}</p>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder={ct.addNotePlaceholder} style={{ ...inputStyle, flex: 1 }} />
                          <button onClick={() => addNote(uid)} style={btn('#3B82F6')}>{ct.addNote}</button>
                        </div>
                        {notes.map((n, i) => (
                          <div key={i} style={{ padding: '8px', backgroundColor: '#0A0A0A', borderRadius: '8px', marginBottom: '6px' }}>
                            <p style={{ color: '#ddd', fontSize: '13px', margin: 0 }}>{sv(n.note)}</p>
                            <p style={{ color: '#555', fontSize: '11px', margin: '4px 0 0' }}>{sv(n.admin_email) + ' - ' + fmtDate(n.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                } catch (err: any) {
                  return renderDebugError('UserDetail IIFE', { message: String(err?.message || err), stack: String(err?.stack || '') })
                }
              })()}
            </div>
          </div>
        ) : null}

        {/* Trust level modal */}
        {trustModal ? (
          <div onClick={() => setTrustModal(null)} style={{
            position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px',
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              ...card, maxWidth: '400px', width: '100%', padding: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '16px', margin: 0 }}>{ct.changeTrustTitle}</p>
                <button onClick={() => setTrustModal(null)} style={{ ...btn('#333'), marginRight: 0 }}>{'X'}</button>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ color: '#888', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{ct.trustLevelLabel}</label>
                <select
                  value={trustModal.trust_level}
                  onChange={e => setTrustModal({ ...trustModal, trust_level: e.target.value })}
                  style={{ ...inputStyle }}
                >
                  <option value="new">{ct.trustNew}</option>
                  <option value="standard">{ct.trustStandard}</option>
                  <option value="trusted">{ct.trustTrusted}</option>
                  <option value="premium">{ct.trustPremium}</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ color: '#888', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{ct.retentionPercentLabel}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={trustModal.holdback_percent}
                  onChange={e => setTrustModal({ ...trustModal, holdback_percent: Number(e.target.value) || 0 })}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#888', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{ct.payoutDelayDaysLabel}</label>
                <input
                  type="number"
                  min={0}
                  value={trustModal.payout_delay_days}
                  onChange={e => setTrustModal({ ...trustModal, payout_delay_days: Number(e.target.value) || 0 })}
                  style={inputStyle}
                />
              </div>

              <button onClick={updateSellerTrust} style={{ ...btn('#10B981'), width: '100%', padding: '10px', fontSize: '14px' }}>
                {ct.save}
              </button>
            </div>
          </div>
        ) : null}

        {/* Image preview modal */}
        {enlargedImage ? (
          <div onClick={() => setEnlargedImage(null)} style={{
            position: 'fixed', inset: 0, zIndex: 10001, backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            cursor: 'pointer',
          }}>
            <img src={enlargedImage} alt="Preview" style={{
              maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px',
              objectFit: 'contain', border: '2px solid #333',
            }} />
          </div>
        ) : null}

        {/* Toast */}
        {toast ? (
          <div style={{
            position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
            padding: '14px 24px', borderRadius: '12px',
            backgroundColor: '#3a1a1a',
            border: '1px solid #E8344E',
            color: '#E8344E',
            fontSize: '14px', fontWeight: 600, zIndex: 10000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}>
            {String(toast)}
          </div>
        ) : null}
      </div>
    )
  } catch (err: any) {
    // Catch synchronous errors during JSX evaluation
    const errObj = { message: String(err?.message || err), stack: String(err?.stack || '') }
    // Cannot call setRenderError here (inside render), so return the error UI directly
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', padding: '40px 16px' }}>
        {renderDebugError('Top-level return catch', errObj)}
      </div>
    )
  }
}
