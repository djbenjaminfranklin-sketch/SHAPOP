import { supabase } from './config'
import { currencyForCountry, formatMoney } from './fulfillment'

// =====================================================================
// Langue des textes envoyés par le serveur (push APNs, notifications in-app, e-mails).
// Chaque texte part dans la langue du DESTINATAIRE (colonne profiles.language).
// 5 langues, toujours dans cet ordre : anglais, français, espagnol, russe, hébreu.
// Valeur absente ou inconnue → anglais.
// =====================================================================

export const LANGS = ['en', 'fr', 'es', 'ru', 'he'] as const
export type Lang = typeof LANGS[number]
export const DEFAULT_LANG: Lang = 'en'

export const LOCALES: Record<Lang, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  ru: 'ru-RU',
  he: 'he-IL',
}

export function isRtl(lang: Lang): boolean {
  return lang === 'he'
}

/** « fr-FR », « FR », « fr_FR » → 'fr' ; « iw » (ancien code) → 'he' ; inconnu → 'en'. */
export function normalizeLang(value: unknown): Lang {
  if (typeof value !== 'string') return DEFAULT_LANG
  let code = value.trim().toLowerCase().split(/[-_]/)[0]
  if (code === 'iw') code = 'he'
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : DEFAULT_LANG
}

// ---------------------------------------------------------------------
// Dictionnaire unique. L'anglais sert de référence : les 4 autres langues
// sont typées `Dict`, donc une clé manquante ou en trop est une erreur de compilation.
// ---------------------------------------------------------------------
const en = {
  'fallback.someone': `Someone`,
  'fallback.seller': `A seller`,
  'fallback.item': `Item`,

  'welcome.title': `Welcome to ShaPop!`,
  'welcome.body': `Discover live shows and start buying or selling.`,

  'auctionWon.title': `You won!`,
  'auctionWon.body': `{item} — {amount}. Pay now to receive your item.`,
  'cardDeclined.title': `Card declined`,
  'cardDeclined.body': `Your card was declined for {item} ({amount}). Add another card in ShaPop so the seller can try again.`,
  'purchaseConfirmed.title': `Purchase confirmed!`,
  'purchaseConfirmed.body': `{item} — {amount}. Pay now to receive your item.`,
  'itemSold.title': `Item sold!`,
  'itemSold.body': `“{item}” was bought for {amount}.`,
  'outbid.title': `You've been outbid!`,
  'outbid.body': `Someone bid {amount} on “{item}”.`,

  'offerReceived.title': `New offer`,
  'offerReceived.body': `You received an offer of {amount} for “{item}”.`,
  'offerAccepted.title': `Offer accepted`,
  'offerAccepted.body': `Your offer of {amount} for “{item}” was accepted!`,
  'offerDeclined.title': `Offer declined`,
  'offerDeclined.body': `Your offer of {amount} for “{item}” was declined.`,
  'offerCountered.title': `Counter-offer`,
  'offerCountered.body': `The seller made you a counter-offer of {amount} for “{item}”.`,

  'orderPaid.title': `Order {ref} paid`,
  'orderPaid.bodySellerPickup': `In-person pickup: contact the buyer and ask for their 4-digit code when you meet (within {days} days).`,
  'orderPaid.bodyBuyerPickup': `Your pickup code is in the order details. Only give it to the seller once you have the item in hand.`,
  'orderPaid.bodySellerPost': `Shipping by post: send the parcel and add the 2 photos (open parcel + stamped receipt) in the app within {days} days.`,
  'handoverLocked.title': `Handover blocked`,
  'handoverLocked.body': `Too many wrong codes were entered for your order. Our team will look into it.`,
  'orderHandedOver.title': `Item handed over`,
  'orderHandedOver.body': `Your order #{ref} has been marked as handed over. Enjoy!`,
  'orderPrepared.title': `Order ready`,
  'orderPrepared.body': `The seller has prepared your order #{ref}. It will be handed over or sent soon.`,
  'orderShipped.title': `Parcel sent`,
  'orderShipped.body': `Your order #{ref} was sent by post. Photos of the parcel and the receipt are in the order details.`,
  'orderShippedCode.title': `Parcel sent`,
  'orderShippedCode.body': `Your order #{ref} is on its way. As soon as you receive it, confirm receipt in the app: you then have 24 h to report a problem.`,
  'orderReceived.title': `Parcel received`,
  'orderReceived.body': `Order #{ref}: the buyer received the parcel. You will be paid in 24 h unless they report a problem.`,
  'sellerWarning.title': `Warning`,
  'sellerWarning.body': `You lost a dispute: the item did not match. Next time, your payments will only be released once buyers confirm receipt. A 3rd lost dispute closes your account.`,
  'sellerRestricted.title': `Payments restricted for 30 days`,
  'sellerRestricted.body': `You lost a 2nd dispute: for 30 days, you are only paid once the buyer has received the item. A 3rd lost dispute closes your account.`,
  'buyerBlocked.title': `Disputes blocked`,
  'buyerBlocked.body': `After several disputes judged unfounded, you can no longer open disputes or request returns. Contact support if you think this is a mistake.`,
  'counterfeitBuyer.title': `Counterfeit confirmed`,
  'counterfeitBuyer.body': `Order #{ref}: our team confirmed the item is a counterfeit. You are fully refunded, shipping included. You can also file a complaint with the police.`,
  'counterfeitSeller.title': `Account closed`,
  'counterfeitSeller.body': `Order #{ref}: our team confirmed the item you sold is a counterfeit. The buyer has been refunded, a penalty of 50% of the price will be taken from your next payouts, and your account is permanently closed.`,
  'receiptReminder.title': `Did you receive your parcel?`,
  'receiptReminder.body': `Order #{ref}: confirm receipt in the app, or report a problem. Without news 10 days after shipping, the seller will be paid.`,
  'carrierDelivered.title': `Parcel delivered`,
  'carrierDelivered.body': `The post office says order #{ref} was delivered. You have 24 h to report a problem; after that, the sale is accepted.`,
  'claimEndingSoon.title': `4 hours left`,
  'claimEndingSoon.body': `Order #{ref}: you have 4 hours left to report a problem. After that, the sale is accepted and the seller paid.`,
  'disputeRespond.title': `Reply to the dispute`,
  'disputeRespond.body': `Order #{ref}: the buyer reported a problem 24 h ago. Add your photos and your answer, otherwise our team will decide without them.`,
  'payoutReleased.title': `Payment released`,
  'payoutReleased.body': `Order #{ref}: the money for this sale has been released to you.`,
  'orderCancelledBuyer.title': `Order {ref} cancelled — refunded`,
  'orderCancelledBuyer.body': `The seller didn't hand over the order in time. You've been refunded {amount}.`,
  'orderCancelledSeller.title': `Sale {ref} cancelled — deadline passed`,
  'orderCancelledSeller.body': `The order wasn't handed over in time (pickup code or shipping photos). The sale is cancelled and the buyer has been refunded.`,
  'handoverReminder.title': `Reminder: hand over order {ref} by tomorrow`,
  'handoverReminder.bodyPickup': `Enter the buyer's code at handover, otherwise the order will be cancelled and refunded.`,
  'handoverReminder.bodyPost': `Add the 2 photos (open parcel + stamped receipt), otherwise the order will be cancelled and refunded.`,
  'paymentReminder.title': `Payment pending`,
  'paymentReminder.body': `Don't forget to pay for “{item}” ({amount}).`,

  'returnRequested.title': `Return requested`,
  'returnRequested.body': `A buyer has requested a return: {reason}`,
  'returnApproved.title': `Return approved`,
  'returnApproved.body': `Your return has been approved and your refund is being processed.`,
  'returnRejected.title': `Return declined`,
  'returnRejected.body': `Your return was declined: {reason}`,
  'returnRejected.bodyNoReason': `The seller declined your return request.`,

  'message.title': `New message`,
  'message.body': `{name} sent you a message`,
  'newFollower.title': `New follower!`,
  'newFollower.body': `{name} is now following you`,
  'referral.title': `New referral!`,
  'referral.body': `A friend joined ShaPop thanks to you! You've received a 5% promo code.`,
  'priceDrop.title': `Price drop!`,
  'priceDrop.body': `“{item}” went from {oldPrice} to {newPrice}`,
  'teamInvite.title': `Team invitation`,
  'teamInvite.body': `You've been invited to join a seller's team.`,

  'sellerLive.title': `{name} is live!`,
  'sellerLive.body': `{title} — {category}. Join now!`,
  'sellerLive.bodyNoCategory': `{title}. Join now!`,
  'liveSoon.title': `{name} is going live soon`,
  'liveSoon.body': `“{title}” starts in 15 minutes.`,

  'email.item': `Item`,
  'email.seller': `Seller`,
  'email.amount': `Amount`,
  'email.tagline': `ShaPop — live shopping, reinvented.`,
  'orderEmail.subject': `Order confirmed – {item}`,
  'orderEmail.heading': `Order confirmed!`,
  'orderEmail.intro': `Your order #{ref} has been placed.`,
  'orderEmail.footnote': `You'll get a notification as soon as the seller hands over or ships your item.`,
  'paymentEmail.subject': `Payment reminder – {item}`,
  'paymentEmail.heading': `Payment reminder`,
  'paymentEmail.intro': `Your order #{ref} is awaiting payment.`,
  'paymentEmail.footnote': `Open the app to complete your payment. Without payment, the order will be cancelled automatically.`,
}

export type MsgKey = keyof typeof en
type Dict = Record<MsgKey, string>

const fr: Dict = {
  'fallback.someone': `Quelqu’un`,
  'fallback.seller': `Un vendeur`,
  'fallback.item': `Article`,

  'welcome.title': `Bienvenue sur ShaPop !`,
  'welcome.body': `Découvre les lives et commence à acheter ou à vendre.`,

  'auctionWon.title': `Tu as gagné !`,
  'auctionWon.body': `{item} — {amount}. Paie pour recevoir ton article.`,
  'cardDeclined.title': `Carte refusée`,
  'cardDeclined.body': `Ta carte a été refusée pour {item} ({amount}). Ajoute une autre carte dans ShaPop pour que le vendeur réessaie.`,
  'purchaseConfirmed.title': `Achat confirmé !`,
  'purchaseConfirmed.body': `{item} — {amount}. Paie pour recevoir ton article.`,
  'itemSold.title': `Article vendu !`,
  'itemSold.body': `« {item} » a été acheté pour {amount}.`,
  'outbid.title': `Quelqu’un a surenchéri !`,
  'outbid.body': `Quelqu’un a enchéri {amount} sur « {item} ».`,

  'offerReceived.title': `Nouvelle offre`,
  'offerReceived.body': `Tu as reçu une offre de {amount} pour « {item} ».`,
  'offerAccepted.title': `Offre acceptée`,
  'offerAccepted.body': `Ton offre de {amount} pour « {item} » a été acceptée !`,
  'offerDeclined.title': `Offre refusée`,
  'offerDeclined.body': `Ton offre de {amount} pour « {item} » a été refusée.`,
  'offerCountered.title': `Contre-offre`,
  'offerCountered.body': `Le vendeur te fait une contre-offre de {amount} pour « {item} ».`,

  'orderPaid.title': `Commande {ref} payée`,
  'orderPaid.bodySellerPickup': `Retrait en main propre : contacte l’acheteur et demande-lui son code à 4 chiffres au rendez-vous (dans les {days} jours).`,
  'orderPaid.bodyBuyerPickup': `Ton code de retrait est dans le détail de la commande. Ne le donne au vendeur qu’au moment où tu as l’article en main.`,
  'orderPaid.bodySellerPost': `Envoi par la poste : envoie le colis et ajoute les 2 photos (colis ouvert + bordereau tamponné) dans l’app dans les {days} jours.`,
  'handoverLocked.title': `Remise bloquée`,
  'handoverLocked.body': `Trop de codes faux ont été saisis pour ta commande. Notre équipe va vérifier.`,
  'orderHandedOver.title': `Article remis`,
  'orderHandedOver.body': `Ta commande #{ref} est marquée comme remise. Profite bien !`,
  'orderPrepared.title': `Commande prête`,
  'orderPrepared.body': `Le vendeur a préparé ta commande #{ref}. Elle sera remise ou envoyée très bientôt.`,
  'orderShipped.title': `Colis envoyé`,
  'orderShipped.body': `Ta commande #{ref} a été envoyée par la poste. Les photos du colis et du bordereau sont dans le détail de la commande.`,
  'orderShippedCode.title': `Colis envoyé`,
  'orderShippedCode.body': `Ta commande #{ref} est en route. Dès réception, confirme-la dans l’appli : tu auras ensuite 24 h pour signaler un problème.`,
  'orderReceived.title': `Colis reçu`,
  'orderReceived.body': `Commande #{ref} : l’acheteur a reçu le colis. Tu seras payé dans 24 h, sauf s’il signale un problème.`,
  'sellerWarning.title': `Avertissement`,
  'sellerWarning.body': `Tu as perdu un litige : l’article n’était pas conforme. Au prochain litige perdu, tu ne seras payé qu’à la réception par l’acheteur pendant 30 jours. Au 3e, ton compte sera fermé.`,
  'sellerRestricted.title': `Paiements restreints pendant 30 jours`,
  'sellerRestricted.body': `Tu as perdu un 2e litige : pendant 30 jours, tu n’es payé qu’une fois l’article reçu par l’acheteur. Au 3e litige perdu, ton compte sera fermé.`,
  'buyerBlocked.title': `Litiges bloqués`,
  'buyerBlocked.body': `Après plusieurs litiges jugés infondés, tu ne peux plus ouvrir de litige ni demander de retour. Contacte le support si tu penses que c’est une erreur.`,
  'counterfeitBuyer.title': `Contrefaçon confirmée`,
  'counterfeitBuyer.body': `Commande #{ref} : notre équipe a confirmé que l’article est une contrefaçon. Tu es remboursé en entier, frais de port compris. Tu peux aussi porter plainte.`,
  'counterfeitSeller.title': `Compte fermé`,
  'counterfeitSeller.body': `Commande #{ref} : notre équipe a confirmé que l’article vendu est une contrefaçon. L’acheteur est remboursé, une pénalité de 50 % du prix sera prélevée sur tes prochains versements et ton compte est fermé définitivement.`,
  'receiptReminder.title': `Tu as reçu ton colis ?`,
  'receiptReminder.body': `Commande #{ref} : confirme la réception dans l’appli, ou signale un problème. Sans nouvelles 10 jours après l’envoi, le vendeur sera payé.`,
  'carrierDelivered.title': `Colis livré`,
  'carrierDelivered.body': `La poste indique que la commande #{ref} est livrée. Tu as 24 h pour signaler un problème ; ensuite, la vente est acceptée.`,
  'claimEndingSoon.title': `Plus que 4 h`,
  'claimEndingSoon.body': `Commande #{ref} : il te reste 4 h pour signaler un problème. Ensuite, la vente est acceptée et le vendeur payé.`,
  'disputeRespond.title': `Réponds au litige`,
  'disputeRespond.body': `Commande #{ref} : l’acheteur a signalé un problème il y a 24 h. Ajoute tes photos et ta réponse, sinon notre équipe tranchera sans elles.`,
  'payoutReleased.title': `Paiement libéré`,
  'payoutReleased.body': `Commande #{ref} : l’argent de cette vente t’a été versé.`,
  'orderCancelledBuyer.title': `Commande {ref} annulée — remboursée`,
  'orderCancelledBuyer.body': `Le vendeur n’a pas remis la commande à temps. Tu as été remboursé de {amount}.`,
  'orderCancelledSeller.title': `Vente {ref} annulée — délai dépassé`,
  'orderCancelledSeller.body': `La commande n’a pas été remise dans le délai (code de retrait ou photos d’envoi). La vente est annulée et l’acheteur remboursé.`,
  'handoverReminder.title': `Rappel : commande {ref} à remettre avant demain`,
  'handoverReminder.bodyPickup': `Saisis le code de l’acheteur au moment de la remise, sinon la commande sera annulée et remboursée.`,
  'handoverReminder.bodyPost': `Ajoute les 2 photos (colis ouvert + bordereau tamponné), sinon la commande sera annulée et remboursée.`,
  'paymentReminder.title': `Paiement en attente`,
  'paymentReminder.body': `N’oublie pas de payer ton article « {item} » ({amount}).`,

  'returnRequested.title': `Demande de retour`,
  'returnRequested.body': `Un acheteur demande un retour : {reason}`,
  'returnApproved.title': `Retour accepté`,
  'returnApproved.body': `Ton retour a été accepté, le remboursement est en cours.`,
  'returnRejected.title': `Retour refusé`,
  'returnRejected.body': `Ton retour a été refusé : {reason}`,
  'returnRejected.bodyNoReason': `Le vendeur a refusé ta demande de retour.`,

  'message.title': `Nouveau message`,
  'message.body': `{name} t’a envoyé un message`,
  'newFollower.title': `Nouvel abonné !`,
  'newFollower.body': `{name} te suit maintenant`,
  'referral.title': `Nouveau filleul !`,
  'referral.body': `Un ami a rejoint ShaPop grâce à toi ! Tu as reçu un code promo de 5 %.`,
  'priceDrop.title': `Baisse de prix !`,
  'priceDrop.body': `« {item} » est passé de {oldPrice} à {newPrice}`,
  'teamInvite.title': `Invitation dans une équipe`,
  'teamInvite.body': `On t’invite à rejoindre l’équipe d’un vendeur.`,

  'sellerLive.title': `{name} est en live !`,
  'sellerLive.body': `{title} — {category}. Rejoins le live maintenant !`,
  'sellerLive.bodyNoCategory': `{title}. Rejoins le live maintenant !`,
  'liveSoon.title': `{name} est bientôt en direct`,
  'liveSoon.body': `« {title} » commence dans 15 minutes.`,

  'email.item': `Article`,
  'email.seller': `Vendeur`,
  'email.amount': `Montant`,
  'email.tagline': `ShaPop — le shopping en live, réinventé.`,
  'orderEmail.subject': `Commande confirmée – {item}`,
  'orderEmail.heading': `Commande confirmée !`,
  'orderEmail.intro': `Ta commande #{ref} a bien été enregistrée.`,
  'orderEmail.footnote': `Tu recevras une notification dès que le vendeur remettra ou enverra ton article.`,
  'paymentEmail.subject': `Rappel de paiement – {item}`,
  'paymentEmail.heading': `Rappel de paiement`,
  'paymentEmail.intro': `Ta commande #{ref} est en attente de paiement.`,
  'paymentEmail.footnote': `Ouvre l’application pour finaliser ton paiement. Sans paiement, la commande sera annulée automatiquement.`,
}

const es: Dict = {
  'fallback.someone': `Alguien`,
  'fallback.seller': `Un vendedor`,
  'fallback.item': `Artículo`,

  'welcome.title': `¡Te damos la bienvenida a ShaPop!`,
  'welcome.body': `Descubre los directos y empieza a comprar o vender.`,

  'auctionWon.title': `¡Has ganado!`,
  'auctionWon.body': `{item} — {amount}. Paga para recibir tu artículo.`,
  'cardDeclined.title': `Tarjeta rechazada`,
  'cardDeclined.body': `Tu tarjeta ha sido rechazada para {item} ({amount}). Añade otra tarjeta en ShaPop para que el vendedor lo vuelva a intentar.`,
  'purchaseConfirmed.title': `¡Compra confirmada!`,
  'purchaseConfirmed.body': `{item} — {amount}. Paga para recibir tu artículo.`,
  'itemSold.title': `¡Artículo vendido!`,
  'itemSold.body': `«{item}» se ha vendido por {amount}.`,
  'outbid.title': `¡Han superado tu puja!`,
  'outbid.body': `Alguien ha pujado {amount} por «{item}».`,

  'offerReceived.title': `Nueva oferta`,
  'offerReceived.body': `Has recibido una oferta de {amount} por «{item}».`,
  'offerAccepted.title': `Oferta aceptada`,
  'offerAccepted.body': `¡Tu oferta de {amount} por «{item}» ha sido aceptada!`,
  'offerDeclined.title': `Oferta rechazada`,
  'offerDeclined.body': `Tu oferta de {amount} por «{item}» ha sido rechazada.`,
  'offerCountered.title': `Contraoferta`,
  'offerCountered.body': `El vendedor te ha hecho una contraoferta de {amount} por «{item}».`,

  'orderPaid.title': `Pedido {ref} pagado`,
  'orderPaid.bodySellerPickup': `Entrega en mano: contacta con el comprador y pídele su código de 4 cifras cuando os veáis (en un plazo de {days} días).`,
  'orderPaid.bodyBuyerPickup': `Tu código de recogida está en el detalle del pedido. Dáselo al vendedor solo cuando tengas el artículo en la mano.`,
  'orderPaid.bodySellerPost': `Envío por correo: envía el paquete y sube las 2 fotos (paquete abierto + resguardo sellado) en la app en un plazo de {days} días.`,
  'handoverLocked.title': `Entrega bloqueada`,
  'handoverLocked.body': `Se han introducido demasiados códigos incorrectos para tu pedido. Nuestro equipo lo revisará.`,
  'orderHandedOver.title': `Artículo entregado`,
  'orderHandedOver.body': `Tu pedido #{ref} se ha marcado como entregado. ¡Que lo disfrutes!`,
  'orderPrepared.title': `Pedido listo`,
  'orderPrepared.body': `El vendedor ha preparado tu pedido #{ref}. Se entregará o enviará muy pronto.`,
  'orderShipped.title': `Paquete enviado`,
  'orderShipped.body': `Tu pedido #{ref} se ha enviado por correo. Las fotos del paquete y del resguardo están en el detalle del pedido.`,
  'orderShippedCode.title': `Paquete enviado`,
  'orderShippedCode.body': `Tu pedido #{ref} está en camino. En cuanto lo recibas, confírmalo en la app: tendrás 24 h para avisar de un problema.`,
  'orderReceived.title': `Paquete recibido`,
  'orderReceived.body': `Pedido #{ref}: el comprador ha recibido el paquete. Cobrarás en 24 h salvo que avise de un problema.`,
  'sellerWarning.title': `Advertencia`,
  'sellerWarning.body': `Has perdido una disputa: el artículo no era conforme. Si pierdes otra, durante 30 días solo cobrarás cuando el comprador lo reciba. A la 3.ª, tu cuenta se cerrará.`,
  'sellerRestricted.title': `Pagos restringidos durante 30 días`,
  'sellerRestricted.body': `Has perdido una 2.ª disputa: durante 30 días solo cobras cuando el comprador ha recibido el artículo. A la 3.ª, tu cuenta se cerrará.`,
  'buyerBlocked.title': `Disputas bloqueadas`,
  'buyerBlocked.body': `Tras varias disputas consideradas infundadas, ya no puedes abrir disputas ni pedir devoluciones. Contacta con soporte si crees que es un error.`,
  'counterfeitBuyer.title': `Falsificación confirmada`,
  'counterfeitBuyer.body': `Pedido #{ref}: nuestro equipo ha confirmado que el artículo es una falsificación. Te devolvemos todo, envío incluido. También puedes presentar una denuncia.`,
  'counterfeitSeller.title': `Cuenta cerrada`,
  'counterfeitSeller.body': `Pedido #{ref}: nuestro equipo ha confirmado que el artículo vendido es una falsificación. El comprador ha sido reembolsado, se descontará una penalización del 50 % del precio de tus próximos pagos y tu cuenta queda cerrada definitivamente.`,
  'receiptReminder.title': `¿Has recibido tu paquete?`,
  'receiptReminder.body': `Pedido #{ref}: confirma la recepción en la app o avisa de un problema. Sin noticias 10 días después del envío, el vendedor cobrará.`,
  'carrierDelivered.title': `Paquete entregado`,
  'carrierDelivered.body': `Correos indica que el pedido #{ref} se ha entregado. Tienes 24 h para avisar de un problema; después, la venta se acepta.`,
  'claimEndingSoon.title': `Quedan 4 h`,
  'claimEndingSoon.body': `Pedido #{ref}: te quedan 4 h para avisar de un problema. Después, la venta se acepta y el vendedor cobra.`,
  'disputeRespond.title': `Responde a la disputa`,
  'disputeRespond.body': `Pedido #{ref}: el comprador avisó de un problema hace 24 h. Añade tus fotos y tu respuesta, o nuestro equipo decidirá sin ellas.`,
  'payoutReleased.title': `Pago liberado`,
  'payoutReleased.body': `Pedido #{ref}: el dinero de esta venta ya se ha liberado para ti.`,
  'orderCancelledBuyer.title': `Pedido {ref} cancelado — reembolsado`,
  'orderCancelledBuyer.body': `El vendedor no entregó el pedido a tiempo. Te hemos reembolsado {amount}.`,
  'orderCancelledSeller.title': `Venta {ref} cancelada — plazo vencido`,
  'orderCancelledSeller.body': `El pedido no se entregó a tiempo (código de recogida o fotos del envío). La venta se ha cancelado y se ha reembolsado al comprador.`,
  'handoverReminder.title': `Recordatorio: entrega el pedido {ref} antes de mañana`,
  'handoverReminder.bodyPickup': `Introduce el código del comprador en el momento de la entrega; si no, el pedido se cancelará y se reembolsará.`,
  'handoverReminder.bodyPost': `Sube las 2 fotos (paquete abierto + resguardo sellado); si no, el pedido se cancelará y se reembolsará.`,
  'paymentReminder.title': `Pago pendiente`,
  'paymentReminder.body': `No olvides pagar tu artículo «{item}» ({amount}).`,

  'returnRequested.title': `Solicitud de devolución`,
  'returnRequested.body': `Un comprador ha solicitado una devolución: {reason}`,
  'returnApproved.title': `Devolución aceptada`,
  'returnApproved.body': `Tu devolución ha sido aceptada y el reembolso está en curso.`,
  'returnRejected.title': `Devolución rechazada`,
  'returnRejected.body': `Tu devolución ha sido rechazada: {reason}`,
  'returnRejected.bodyNoReason': `El vendedor ha rechazado tu solicitud de devolución.`,

  'message.title': `Nuevo mensaje`,
  'message.body': `{name} te ha enviado un mensaje`,
  'newFollower.title': `¡Nuevo seguidor!`,
  'newFollower.body': `{name} ahora te sigue`,
  'referral.title': `¡Nuevo referido!`,
  'referral.body': `¡Un amigo se ha unido a ShaPop gracias a ti! Has recibido un código promocional del 5 %.`,
  'priceDrop.title': `¡Bajada de precio!`,
  'priceDrop.body': `«{item}» ha bajado de {oldPrice} a {newPrice}`,
  'teamInvite.title': `Invitación a un equipo`,
  'teamInvite.body': `Te han invitado a unirte al equipo de un vendedor.`,

  'sellerLive.title': `¡{name} está en directo!`,
  'sellerLive.body': `{title} — {category}. ¡Únete ya!`,
  'sellerLive.bodyNoCategory': `{title}. ¡Únete ya!`,
  'liveSoon.title': `{name} estará en directo muy pronto`,
  'liveSoon.body': `«{title}» empieza en 15 minutos.`,

  'email.item': `Artículo`,
  'email.seller': `Vendedor`,
  'email.amount': `Importe`,
  'email.tagline': `ShaPop — las compras en directo, reinventadas.`,
  'orderEmail.subject': `Pedido confirmado – {item}`,
  'orderEmail.heading': `¡Pedido confirmado!`,
  'orderEmail.intro': `Tu pedido #{ref} se ha registrado correctamente.`,
  'orderEmail.footnote': `Te avisaremos en cuanto el vendedor entregue o envíe tu artículo.`,
  'paymentEmail.subject': `Recordatorio de pago – {item}`,
  'paymentEmail.heading': `Recordatorio de pago`,
  'paymentEmail.intro': `Tu pedido #{ref} está pendiente de pago.`,
  'paymentEmail.footnote': `Abre la app para completar el pago. Si no pagas, el pedido se cancelará automáticamente.`,
}

const ru: Dict = {
  'fallback.someone': `Кто-то`,
  'fallback.seller': `Продавец`,
  'fallback.item': `Товар`,

  'welcome.title': `Добро пожаловать в ShaPop!`,
  'welcome.body': `Смотри прямые эфиры и начинай покупать или продавать.`,

  'auctionWon.title': `Победа за тобой!`,
  'auctionWon.body': `{item} — {amount}. Оплати, чтобы получить товар.`,
  'cardDeclined.title': `Карта отклонена`,
  'cardDeclined.body': `Твоя карта отклонена для {item} ({amount}). Добавь другую карту в ShaPop, чтобы продавец попробовал снова.`,
  'purchaseConfirmed.title': `Покупка подтверждена!`,
  'purchaseConfirmed.body': `{item} — {amount}. Оплати, чтобы получить товар.`,
  'itemSold.title': `Товар продан!`,
  'itemSold.body': `«{item}» купили за {amount}.`,
  'outbid.title': `Твою ставку перебили!`,
  'outbid.body': `Кто-то поставил {amount} на «{item}».`,

  'offerReceived.title': `Новое предложение`,
  'offerReceived.body': `Тебе предложили {amount} за «{item}».`,
  'offerAccepted.title': `Предложение принято`,
  'offerAccepted.body': `Твоё предложение {amount} за «{item}» принято!`,
  'offerDeclined.title': `Предложение отклонено`,
  'offerDeclined.body': `Твоё предложение {amount} за «{item}» отклонено.`,
  'offerCountered.title': `Встречное предложение`,
  'offerCountered.body': `Продавец предлагает тебе {amount} за «{item}».`,

  'orderPaid.title': `Заказ {ref} оплачен`,
  'orderPaid.bodySellerPickup': `Передача лично: свяжись с покупателем и при встрече попроси его 4-значный код (срок — {days} дн.).`,
  'orderPaid.bodyBuyerPickup': `Код получения — в деталях заказа. Называй его продавцу, только когда товар будет у тебя в руках.`,
  'orderPaid.bodySellerPost': `Отправка почтой: отправь посылку и загрузи в приложение 2 фото (открытая посылка + квитанция со штампом). Срок — {days} дн.`,
  'handoverLocked.title': `Передача заблокирована`,
  'handoverLocked.body': `Для твоего заказа ввели слишком много неверных кодов. Наша команда всё проверит.`,
  'orderHandedOver.title': `Товар передан`,
  'orderHandedOver.body': `Заказ #{ref} отмечен как переданный. Приятного пользования!`,
  'orderPrepared.title': `Заказ готов`,
  'orderPrepared.body': `Продавец подготовил заказ #{ref}. Скоро он будет передан или отправлен.`,
  'orderShipped.title': `Посылка отправлена`,
  'orderShipped.body': `Заказ #{ref} отправлен почтой. Фото посылки и квитанции — в деталях заказа.`,
  'orderShippedCode.title': `Посылка отправлена`,
  'orderShippedCode.body': `Заказ #{ref} в пути. Как только получишь его, подтверди получение в приложении: после этого у тебя будет 24 часа, чтобы сообщить о проблеме.`,
  'orderReceived.title': `Посылка получена`,
  'orderReceived.body': `Заказ #{ref}: покупатель получил посылку. Деньги придут через 24 часа, если он не сообщит о проблеме.`,
  'sellerWarning.title': `Предупреждение`,
  'sellerWarning.body': `Ты проиграл спор: товар не соответствовал описанию. Если проиграешь ещё один, 30 дней будешь получать деньги только после получения товара покупателем. После 3-го аккаунт будет закрыт.`,
  'sellerRestricted.title': `Выплаты ограничены на 30 дней`,
  'sellerRestricted.body': `Ты проиграл 2-й спор: 30 дней ты получаешь деньги только после того, как покупатель получил товар. После 3-го проигранного спора аккаунт будет закрыт.`,
  'buyerBlocked.title': `Споры заблокированы`,
  'buyerBlocked.body': `После нескольких необоснованных споров ты больше не можешь открывать споры и запрашивать возвраты. Напиши в поддержку, если считаешь это ошибкой.`,
  'counterfeitBuyer.title': `Подделка подтверждена`,
  'counterfeitBuyer.body': `Заказ #{ref}: наша команда подтвердила, что товар — подделка. Тебе вернут всю сумму, включая доставку. Ты также можешь подать заявление в полицию.`,
  'counterfeitSeller.title': `Аккаунт закрыт`,
  'counterfeitSeller.body': `Заказ #{ref}: наша команда подтвердила, что проданный товар — подделка. Покупателю вернули деньги, штраф 50 % от цены будет удержан из твоих следующих выплат, а твой аккаунт закрыт навсегда.`,
  'receiptReminder.title': `Ты получил посылку?`,
  'receiptReminder.body': `Заказ #{ref}: подтверди получение в приложении или сообщи о проблеме. Если через 10 дней после отправки нет вестей, продавец получит деньги.`,
  'carrierDelivered.title': `Посылка доставлена`,
  'carrierDelivered.body': `Почта сообщает, что заказ #{ref} доставлен. У тебя 24 часа, чтобы сообщить о проблеме; потом продажа считается принятой.`,
  'claimEndingSoon.title': `Осталось 4 часа`,
  'claimEndingSoon.body': `Заказ #{ref}: осталось 4 часа, чтобы сообщить о проблеме. Потом продажа считается принятой, и продавец получит деньги.`,
  'disputeRespond.title': `Ответь на спор`,
  'disputeRespond.body': `Заказ #{ref}: покупатель сообщил о проблеме 24 часа назад. Добавь свои фото и ответ, иначе наша команда решит без них.`,
  'payoutReleased.title': `Выплата отправлена`,
  'payoutReleased.body': `Заказ #{ref}: деньги за эту продажу переведены тебе.`,
  'orderCancelledBuyer.title': `Заказ {ref} отменён — деньги возвращены`,
  'orderCancelledBuyer.body': `Продавец не передал заказ вовремя. Мы вернули тебе {amount}.`,
  'orderCancelledSeller.title': `Продажа {ref} отменена — срок истёк`,
  'orderCancelledSeller.body': `Заказ не передан вовремя (код получения или фото отправки). Продажа отменена, покупателю вернули деньги.`,
  'handoverReminder.title': `Напоминание: передай заказ {ref} до завтра`,
  'handoverReminder.bodyPickup': `Введи код покупателя при передаче, иначе заказ будет отменён, а деньги возвращены.`,
  'handoverReminder.bodyPost': `Загрузи 2 фото (открытая посылка + квитанция со штампом), иначе заказ будет отменён, а деньги возвращены.`,
  'paymentReminder.title': `Ожидается оплата`,
  'paymentReminder.body': `Не забудь оплатить «{item}» ({amount}).`,

  'returnRequested.title': `Запрос на возврат`,
  'returnRequested.body': `Покупатель запросил возврат: {reason}`,
  'returnApproved.title': `Возврат одобрен`,
  'returnApproved.body': `Возврат одобрен, деньги скоро вернутся.`,
  'returnRejected.title': `Возврат отклонён`,
  'returnRejected.body': `В возврате отказано: {reason}`,
  'returnRejected.bodyNoReason': `Продавец отклонил твой запрос на возврат.`,

  'message.title': `Новое сообщение`,
  'message.body': `Новое сообщение от {name}`,
  'newFollower.title': `Новый подписчик!`,
  'newFollower.body': `{name} теперь следит за тобой`,
  'referral.title': `Новый приглашённый друг!`,
  'referral.body': `Твой друг присоединился к ShaPop! Ты получаешь промокод на скидку 5 %.`,
  'priceDrop.title': `Цена снижена!`,
  'priceDrop.body': `«{item}»: цена снизилась с {oldPrice} до {newPrice}`,
  'teamInvite.title': `Приглашение в команду`,
  'teamInvite.body': `Тебя пригласили в команду продавца.`,

  'sellerLive.title': `{name} в эфире!`,
  'sellerLive.body': `{title} — {category}. Присоединяйся!`,
  'sellerLive.bodyNoCategory': `{title}. Присоединяйся!`,
  'liveSoon.title': `{name} скоро выйдет в эфир`,
  'liveSoon.body': `«{title}» начнётся через 15 минут.`,

  'email.item': `Товар`,
  'email.seller': `Продавец`,
  'email.amount': `Сумма`,
  'email.tagline': `ShaPop — шопинг в прямом эфире по-новому.`,
  'orderEmail.subject': `Заказ подтверждён – {item}`,
  'orderEmail.heading': `Заказ подтверждён!`,
  'orderEmail.intro': `Твой заказ #{ref} оформлен.`,
  'orderEmail.footnote': `Мы пришлём уведомление, как только продавец передаст или отправит товар.`,
  'paymentEmail.subject': `Напоминание об оплате – {item}`,
  'paymentEmail.heading': `Напоминание об оплате`,
  'paymentEmail.intro': `Заказ #{ref} ожидает оплаты.`,
  'paymentEmail.footnote': `Открой приложение, чтобы завершить оплату. Без оплаты заказ будет автоматически отменён.`,
}

const he: Dict = {
  'fallback.someone': `מישהו`,
  'fallback.seller': `מוכר`,
  'fallback.item': `פריט`,

  'welcome.title': `ברוכים הבאים ל־ShaPop!`,
  'welcome.body': `גלו שידורים חיים והתחילו לקנות או למכור.`,

  'auctionWon.title': `זכיתם!`,
  'auctionWon.body': `{item} — {amount}. יש לשלם כדי לקבל את הפריט.`,
  'cardDeclined.title': `הכרטיס נדחה`,
  'cardDeclined.body': `הכרטיס שלך נדחה עבור {item} ({amount}). הוסיפו כרטיס אחר ב-ShaPop כדי שהמוכר ינסה שוב.`,
  'purchaseConfirmed.title': `הרכישה אושרה!`,
  'purchaseConfirmed.body': `{item} — {amount}. יש לשלם כדי לקבל את הפריט.`,
  'itemSold.title': `הפריט נמכר!`,
  'itemSold.body': `"{item}" נמכר ב־{amount}.`,
  'outbid.title': `מישהו הציע יותר מכם!`,
  'outbid.body': `מישהו הציע {amount} על "{item}".`,

  'offerReceived.title': `הצעה חדשה`,
  'offerReceived.body': `קיבלתם הצעה של {amount} עבור "{item}".`,
  'offerAccepted.title': `ההצעה התקבלה`,
  'offerAccepted.body': `ההצעה שלכם בסך {amount} עבור "{item}" התקבלה!`,
  'offerDeclined.title': `ההצעה נדחתה`,
  'offerDeclined.body': `ההצעה שלכם בסך {amount} עבור "{item}" נדחתה.`,
  'offerCountered.title': `הצעה נגדית`,
  'offerCountered.body': `המוכר שלח לכם הצעה נגדית של {amount} עבור "{item}".`,

  'orderPaid.title': `הזמנה {ref} שולמה`,
  'orderPaid.bodySellerPickup': `איסוף עצמי: צרו קשר עם הקונה ובקשו ממנו את הקוד בן 4 הספרות בזמן הפגישה (תוך {days} ימים).`,
  'orderPaid.bodyBuyerPickup': `קוד האיסוף שלכם מופיע בפרטי ההזמנה. מסרו אותו למוכר רק כשהפריט כבר בידיים שלכם.`,
  'orderPaid.bodySellerPost': `משלוח בדואר: שלחו את החבילה והעלו לאפליקציה 2 תמונות (החבילה פתוחה + קבלת המשלוח החתומה) תוך {days} ימים.`,
  'handoverLocked.title': `המסירה נחסמה`,
  'handoverLocked.body': `הוזנו יותר מדי קודים שגויים להזמנה שלכם. הצוות שלנו יבדוק את העניין.`,
  'orderHandedOver.title': `הפריט נמסר`,
  'orderHandedOver.body': `ההזמנה #{ref} סומנה כנמסרה. תיהנו!`,
  'orderPrepared.title': `ההזמנה מוכנה`,
  'orderPrepared.body': `המוכר הכין את ההזמנה #{ref}. היא תימסר או תישלח בקרוב.`,
  'orderShipped.title': `החבילה נשלחה`,
  'orderShipped.body': `ההזמנה #{ref} נשלחה בדואר. התמונות של החבילה ושל הקבלה נמצאות בפרטי ההזמנה.`,
  'orderShippedCode.title': `החבילה נשלחה`,
  'orderShippedCode.body': `ההזמנה #{ref} בדרך. ברגע שתקבלו אותה, אשרו את הקבלה באפליקציה: יהיו לכם 24 שעות לדווח על בעיה.`,
  'orderReceived.title': `החבילה התקבלה`,
  'orderReceived.body': `הזמנה #{ref}: הקונה קיבל את החבילה. התשלום יועבר תוך 24 שעות, אלא אם ידווח על בעיה.`,
  'sellerWarning.title': `אזהרה`,
  'sellerWarning.body': `הפסדת במחלוקת: הפריט לא תאם. אם תפסיד שוב, במשך 30 יום תקבל תשלום רק אחרי שהקונה קיבל את הפריט. אחרי הפסד שלישי החשבון ייסגר.`,
  'sellerRestricted.title': `תשלומים מוגבלים ל-30 יום`,
  'sellerRestricted.body': `הפסדת במחלוקת שנייה: במשך 30 יום תקבל תשלום רק אחרי שהקונה קיבל את הפריט. אחרי הפסד שלישי החשבון ייסגר.`,
  'buyerBlocked.title': `מחלוקות חסומות`,
  'buyerBlocked.body': `אחרי כמה מחלוקות שנמצאו לא מוצדקות, אי אפשר יותר לפתוח מחלוקת או לבקש החזרה. פנו לתמיכה אם לדעתכם זו טעות.`,
  'counterfeitBuyer.title': `זיוף אושר`,
  'counterfeitBuyer.body': `הזמנה #{ref}: הצוות שלנו אישר שהפריט מזויף. תקבלו החזר מלא, כולל משלוח. אפשר גם להגיש תלונה במשטרה.`,
  'counterfeitSeller.title': `החשבון נסגר`,
  'counterfeitSeller.body': `הזמנה #{ref}: הצוות שלנו אישר שהפריט שנמכר מזויף. הקונה קיבל החזר, קנס של 50% מהמחיר ינוכה מהתשלומים הבאים שלכם, והחשבון נסגר לצמיתות.`,
  'receiptReminder.title': `קיבלתם את החבילה?`,
  'receiptReminder.body': `הזמנה #{ref}: אשרו את הקבלה באפליקציה או דווחו על בעיה. בלי עדכון 10 ימים אחרי המשלוח, המוכר יקבל את התשלום.`,
  'carrierDelivered.title': `החבילה נמסרה`,
  'carrierDelivered.body': `הדואר מציין שהזמנה #{ref} נמסרה. יש לכם 24 שעות לדווח על בעיה; אחר כך המכירה מאושרת.`,
  'claimEndingSoon.title': `נשארו 4 שעות`,
  'claimEndingSoon.body': `הזמנה #{ref}: נשארו 4 שעות לדווח על בעיה. אחר כך המכירה מאושרת והמוכר מקבל תשלום.`,
  'disputeRespond.title': `השיבו למחלוקת`,
  'disputeRespond.body': `הזמנה #{ref}: הקונה דיווח על בעיה לפני 24 שעות. הוסיפו תמונות ותשובה, אחרת הצוות שלנו יחליט בלעדיהן.`,
  'payoutReleased.title': `התשלום שוחרר`,
  'payoutReleased.body': `הזמנה #{ref}: הכסף על המכירה הזאת הועבר אליך.`,
  'orderCancelledBuyer.title': `הזמנה {ref} בוטלה — הכסף הוחזר`,
  'orderCancelledBuyer.body': `המוכר לא מסר את ההזמנה בזמן. החזרנו לכם {amount}.`,
  'orderCancelledSeller.title': `המכירה {ref} בוטלה — המועד חלף`,
  'orderCancelledSeller.body': `ההזמנה לא נמסרה בזמן (קוד איסוף או תמונות משלוח). המכירה בוטלה והקונה קיבל החזר.`,
  'handoverReminder.title': `תזכורת: יש למסור את הזמנה {ref} עד מחר`,
  'handoverReminder.bodyPickup': `הזינו את הקוד של הקונה בזמן המסירה, אחרת ההזמנה תבוטל והכסף יוחזר.`,
  'handoverReminder.bodyPost': `העלו את 2 התמונות (החבילה פתוחה + קבלת המשלוח החתומה), אחרת ההזמנה תבוטל והכסף יוחזר.`,
  'paymentReminder.title': `ממתין לתשלום`,
  'paymentReminder.body': `אל תשכחו לשלם על "{item}" ({amount}).`,

  'returnRequested.title': `בקשת החזרה`,
  'returnRequested.body': `קונה ביקש להחזיר פריט: {reason}`,
  'returnApproved.title': `ההחזרה אושרה`,
  'returnApproved.body': `ההחזרה אושרה והזיכוי בטיפול.`,
  'returnRejected.title': `ההחזרה נדחתה`,
  'returnRejected.body': `בקשת ההחזרה נדחתה: {reason}`,
  'returnRejected.bodyNoReason': `המוכר דחה את בקשת ההחזרה שלכם.`,

  'message.title': `הודעה חדשה`,
  'message.body': `יש לכם הודעה חדשה מ־{name}`,
  'newFollower.title': `עוקב חדש!`,
  'newFollower.body': `{name} עוקב/ת אחריכם מעכשיו`,
  'referral.title': `חבר חדש הצטרף!`,
  'referral.body': `חבר הצטרף ל־ShaPop בזכותכם! קיבלתם קוד הנחה של 5%.`,
  'priceDrop.title': `המחיר ירד!`,
  'priceDrop.body': `המחיר של "{item}" ירד מ־{oldPrice} ל־{newPrice}`,
  'teamInvite.title': `הזמנה לצוות`,
  'teamInvite.body': `הוזמנתם להצטרף לצוות של מוכר.`,

  'sellerLive.title': `{name} בשידור חי!`,
  'sellerLive.body': `{title} — {category}. הצטרפו עכשיו!`,
  'sellerLive.bodyNoCategory': `{title}. הצטרפו עכשיו!`,
  'liveSoon.title': `{name} עולה לשידור חי בקרוב`,
  'liveSoon.body': `"{title}" מתחיל בעוד 15 דקות.`,

  'email.item': `פריט`,
  'email.seller': `מוכר`,
  'email.amount': `סכום`,
  'email.tagline': `ShaPop — קניות בשידור חי, בגרסה חדשה.`,
  'orderEmail.subject': `ההזמנה אושרה – {item}`,
  'orderEmail.heading': `ההזמנה אושרה!`,
  'orderEmail.intro': `ההזמנה שלכם #{ref} נקלטה בהצלחה.`,
  'orderEmail.footnote': `נשלח לכם התראה ברגע שהמוכר ימסור או ישלח את הפריט.`,
  'paymentEmail.subject': `תזכורת לתשלום – {item}`,
  'paymentEmail.heading': `תזכורת לתשלום`,
  'paymentEmail.intro': `ההזמנה שלכם #{ref} ממתינה לתשלום.`,
  'paymentEmail.footnote': `פתחו את האפליקציה כדי להשלים את התשלום. ללא תשלום, ההזמנה תבוטל אוטומטית.`,
}

/** Ordre imposé : en, fr, es, ru, he. */
export const MESSAGES: Record<Lang, Dict> = { en, fr, es, ru, he }

// ---------------------------------------------------------------------
// Paramètres : texte/nombre brut, montant (formaté dans la locale du destinataire)
// ou autre clé du dictionnaire (ex. nom de repli « Quelqu'un »).
// ---------------------------------------------------------------------
export type Money = { kind: 'money'; amount: number | string | null | undefined; currency: string | null | undefined }
export type Localized = { kind: 'msg'; key: MsgKey }
export type Param = string | number | Money | Localized
export type Params = Record<string, Param | null | undefined>

export function money(amount: number | string | null | undefined, currency: string | null | undefined): Money {
  return { kind: 'money', amount, currency }
}

export function localized(key: MsgKey): Localized {
  return { kind: 'msg', key }
}

function renderParam(lang: Lang, p: Param): string {
  if (typeof p === 'string') return p
  if (typeof p === 'number') return String(p)
  if (p.kind === 'money') return formatMoney(p.amount, p.currency, LOCALES[lang])
  return MESSAGES[lang][p.key]
}

/** Texte traduit avec ses paramètres {x}. Un paramètre absent laisse « {x} » visible (bug repérable). */
export function msg(lang: Lang, key: MsgKey, params: Params = {}): string {
  const template = MESSAGES[lang]?.[key] ?? MESSAGES[DEFAULT_LANG][key]
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const p = params[name]
    return p === undefined || p === null ? whole : renderParam(lang, p)
  })
}

/** Les préfixes qui ont à la fois « .title » et « .body » (ex. 'welcome'). */
export type NotifKey = {
  [K in MsgKey]: K extends `${infer P}.title` ? (`${P}.body` extends MsgKey ? P : never) : never
}[MsgKey]

// ---------------------------------------------------------------------
// Lecture de la langue en base (profiles.language), avec un petit cache.
// ---------------------------------------------------------------------
const LANG_CACHE_TTL_MS = 5 * 60 * 1000
const langCache = new Map<string, { lang: Lang; at: number }>()

export function clearLangCache(): void {
  langCache.clear()
}

function cachedLang(userId: string): Lang | null {
  const hit = langCache.get(userId)
  if (hit && Date.now() - hit.at < LANG_CACHE_TTL_MS) return hit.lang
  return null
}

export async function getUserLang(userId: string): Promise<Lang> {
  const hit = cachedLang(userId)
  if (hit) return hit
  try {
    const { data } = await supabase.from('profiles').select('language').eq('id', userId).maybeSingle()
    const lang = normalizeLang((data as { language?: unknown } | null)?.language)
    langCache.set(userId, { lang, at: Date.now() })
    return lang
  } catch {
    return DEFAULT_LANG
  }
}

/** Langues de plusieurs utilisateurs (envois groupés). Toujours une entrée par id. */
export async function getUsersLangs(userIds: string[]): Promise<Map<string, Lang>> {
  const result = new Map<string, Lang>()
  const missing: string[] = []
  for (const id of new Set(userIds)) {
    const hit = cachedLang(id)
    if (hit) result.set(id, hit)
    else missing.push(id)
  }
  for (let i = 0; i < missing.length; i += 200) {
    const chunk = missing.slice(i, i + 200)
    try {
      const { data } = await supabase.from('profiles').select('id, language').in('id', chunk)
      for (const row of (data || []) as { id: string; language?: unknown }[]) {
        const lang = normalizeLang(row.language)
        result.set(row.id, lang)
        langCache.set(row.id, { lang, at: Date.now() })
      }
    } catch {
      // on retombe sur l'anglais ci-dessous
    }
  }
  for (const id of userIds) if (!result.has(id)) result.set(id, DEFAULT_LANG)
  return result
}

/** Devise d'un vendeur, déduite de son pays (profiles.country). */
export async function getUserCurrency(userId: string): Promise<string> {
  try {
    const { data } = await supabase.from('profiles').select('country').eq('id', userId).maybeSingle()
    return currencyForCountry((data as { country?: string | null } | null)?.country)
  } catch {
    return currencyForCountry(null)
  }
}
