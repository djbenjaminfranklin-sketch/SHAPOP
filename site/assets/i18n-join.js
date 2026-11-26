/* Pages « Devenir vendeur » (/sell), « Devenir acheteur » (/buy), « Bienvenue » (/welcome)
   + nouvelle section « Comment ça marche » de l'accueil (captures de l'appli) — 26/11/2026 */
(function () {
  var T = window.SP_T = window.SP_T || {};
  function add(l, o) { T[l] = T[l] || {}; for (var k in o) T[l][k] = o[k]; }

  /* ============================== ENGLISH ============================== */
  add('en', {
    cta2: { sell: 'Become a seller', buy: 'Start buying', sellShort: 'Sell', buyShort: 'Buy', gpSmall: 'Get it on', gpAria: 'Get ShaPop on Google Play' },
    how2: {
      kicker: 'Inside the app', title: 'This is what ShaPop looks like', intro: 'Real screens from the app. Dark, fast and simple — the live is the star.',
      s1h: 'Lives near you', s1p: 'Your feed shows the lives starting around you and from the sellers you follow.',
      s2h: 'Direct sales', s2p: 'Not live right now? Browse items on sale any time and buy in one tap.',
      s3h: 'A clear listing', s3p: 'Photos, price, condition and the seller. AI writes the listing from the photos.',
      s4h: 'Everything in one place', s4p: 'Purchases, sales, followed sellers and messages: you always know where your order is.',
      s5h: 'Your shop in 2 minutes', s5p: 'Rules, category, return address, payout: the app guides you step by step.',
      s6h: 'Made to glow', s6p: 'A neon identity you will recognise at first glance.'
    },
    sellp: {
      metaTitle: 'Become a seller — ShaPop', metaDesc: 'Sell live and at auction on ShaPop. 8% commission, payment reserved on the buyer’s card, paid when the buyer has received the item.',
      kicker: 'Sell on ShaPop', title: 'Your shop, <em>live</em>.<br>Your buyers, <em>right now</em>.',
      lead: 'Show your items on video, let buyers bid against each other, and get paid when they have received them. No subscription, no listing fees.',
      cta: 'Create my seller account', ctaMore: 'How it works',
      stat1: '8%', stat1s: 'commission, only when you sell', stat2: '0', stat2s: 'subscription or listing fee', stat3: '1 photo', stat3s: 'and AI writes your listing',
      whyKicker: 'Why live', whyTitle: 'Why sell live on ShaPop?',
      why: [
        ['Auctions push prices up', 'When several buyers want the same item, they bid against each other in real time. You set the starting price, the room does the rest.'],
        ['Buyers trust what they see', 'You show the item from every angle and answer questions in the chat. Fewer doubts, fewer returns.'],
        ['AI does the boring part', 'Take your photos: the AI names the item, picks the category, writes the description and suggests a price.'],
        ['A guaranteed payment', 'The amount is reserved on the buyer’s card as soon as they win. No unpaid orders, no chasing anyone.']
      ],
      stepsKicker: 'How it works', stepsTitle: 'From your wardrobe to your first live in 4 steps',
      steps: [
        ['Create your account', 'Here, in one minute. Then sign in to the ShaPop app with the same email and finish your seller profile.'],
        ['Prepare your items', 'Snap your photos: the AI names them, sorts them and suggests a price. You check and adjust.'],
        ['Go live and sell at auction', 'A title, a thumbnail, and you are on air. Start each auction, chat with buyers, sell several items in a row.'],
        ['Get paid when they receive it', 'You ship (or hand over in person). As soon as the buyer confirms — or 24 hours after delivery without any problem — the money is yours.']
      ],
      feesKicker: 'Fees', feesTitle: 'Simple fees, only when you sell',
      fee1h: '8% commission', fee1p: 'On the sale price, plus VAT where applicable. Nothing if you don’t sell.',
      fee2h: 'Card payment fees', fee2p: 'Charged by the payment provider (Stripe): 2.9% + $0.30 per sale, plus VAT where applicable.',
      fee3h: 'No hidden costs', fee3p: 'No subscription, no listing fee, no fee to go live. Shipping is paid by the buyer.',
      exTitle: 'Example', exSale: 'You sell an item for', exFees: 'Total fees', exNet: 'You receive', exSaleV: '$50.00', exFeesV: '– $6.90', exNetV: '$43.10',
      exNote: 'Indicative amounts including VAT. The exact breakdown is shown in the app for each sale.',
      protKicker: 'Protection', protTitle: 'Protected on both sides',
      prot: [
        ['Payment reserved on the card', 'When the auction ends, the amount is reserved on the buyer’s card. It cannot disappear.'],
        ['24 hours to report, not more', 'The buyer has 24 hours after delivery to report a problem, with photos. After that, the sale is final.'],
        ['Clear rules for everyone', 'Your shipping photos protect you in case of dispute. Our team decides based on the evidence.']
      ],
      rulesLink: 'Read the buying and selling rules',
      faqTitle: 'Questions from sellers',
      faq: [
        ['Do I need a company to sell?', 'No. Individuals can sell their own items. If you sell regularly as a business, you must follow the rules that apply in your country.'],
        ['When do I get paid?', 'As soon as the buyer confirms everything is fine, or 24 hours after delivery without a report, or 10 days after shipping without news. In person: as soon as the buyer gives you their 4-digit code.'],
        ['What can I sell?', 'Fashion, sneakers, bags, watches, cards, toys, tech, home… Anything legal that you own. Counterfeits, dangerous or illegal items are forbidden.'],
        ['Do I have to go live?', 'No. You can also list items as direct sales, which stay on sale between your lives.'],
        ['Is it the same account as in the app?', 'Yes. The email and password you create here are the ones you use in the ShaPop app.']
      ],
      formKicker: 'Sign up', formTitle: 'Open your shop', formIntro: 'Create your account here, then finish your shop in the app. Same email, same password.'
    },
    buyp: {
      metaTitle: 'Start buying — ShaPop', metaDesc: 'Follow sellers, bid live, and only pay if you win. Your card is reserved only if you win, and you have 24 hours to check your item.',
      kicker: 'Buy on ShaPop', title: 'Bid <em>live</em>.<br>Only pay <em>if you win</em>.',
      lead: 'Follow your favourite sellers, see the items on video, bid in one tap. Your card is only reserved if you win the auction.',
      cta: 'Create my account', ctaMore: 'How it works',
      stepsKicker: 'How it works', stepsTitle: 'Buying live in 5 steps',
      steps: [
        ['Follow sellers', 'Pick your categories and follow the sellers you like: you are notified when they go live.'],
        ['Bid in one tap', 'Watch the live, ask your questions in the chat and bid. You can also set a maximum and let the app bid for you.'],
        ['Your card is reserved only if you win', 'Lost the auction? Nothing happens. Won it? The amount is reserved on your card, not paid to the seller yet.'],
        ['Hand-delivered or shipped', 'Choose to meet the seller in person or to have the item sent by post.'],
        ['24 hours to check', 'Once you have the item, confirm it’s fine or report a problem within 24 hours, with photos.']
      ],
      protKicker: 'Protection', protTitle: 'Your money is protected',
      prot: [
        ['The seller is paid after you receive it', 'The money only reaches the seller once you have the item, or after the 24-hour check period.'],
        ['A problem? Report it', 'Item not as described or never arrived: report it from your order. Our team reviews the photos and decides.'],
        ['Always pay in the app', 'Never pay a seller outside ShaPop: you would lose the protection.']
      ],
      rulesLink: 'Read the buying and selling rules',
      formKicker: 'Sign up', formTitle: 'Create your account', formIntro: 'One minute here, then sign in to the app with the same email and password.'
    },
    form: {
      first: 'First name', last: 'Last name', firstPh: 'Dana', lastPh: 'Cohen', name: 'First name', email: 'Email', emailPh: 'you@example.com', password: 'Password', passwordHint: 'At least 8 characters', show: 'Show', hide: 'Hide',
      country: 'Country', countryPick: 'Choose your country',
      countries: { IL: 'Israel', FR: 'France', ES: 'Spain', US: 'United States', GB: 'United Kingdom', DE: 'Germany', IT: 'Italy', BE: 'Belgium', CH: 'Switzerland', PT: 'Portugal', NL: 'Netherlands', CA: 'Canada', OTHER: 'Other country' },
      category: 'Main category', categoryPick: 'What will you sell?',
      categories: { fashion_w: 'Women’s fashion', fashion_m: 'Men’s fashion', sneakers: 'Sneakers', bags: 'Bags', jewelry: 'Jewellery', watches: 'Watches', beauty: 'Beauty', electronics: 'Tech', gaming: 'Gaming', cards: 'Trading cards', toys: 'Toys', vintage: 'Vintage', home: 'Home', kids: 'Kids', collect: 'Collectibles', other: 'Other' },
      exp: 'Selling experience', expPick: 'Choose',
      exps: { none: 'I have never sold online', marketplaces: 'I sell on Vinted, eBay or similar', shop: 'I have a shop (online or physical)', live: 'I already sell live (Whatnot, TikTok…)' },
      acceptRules: 'I accept the <a href="/rules" target="_blank">buying and selling rules</a>',
      acceptTerms: 'I accept the <a href="/terms" target="_blank">terms of use</a> and the <a href="/privacy" target="_blank">privacy policy</a>',
      submitSell: 'Create my seller account', submitBuy: 'Create my account', sending: 'Creating your account…',
      errRequired: 'Please fill in this field.', errEmail: 'This email address does not look right.', errPassword: 'At least 8 characters.', errCheck: 'Tick this box to continue.',
      errExists: 'You already have an account with this email: sign in directly in the ShaPop app.', errRate: 'Too many attempts. Please try again in a few minutes.', errWeak: 'This password is too easy to guess. Choose another one.',
      errGeneric: 'Something went wrong. Please try again in a moment.', errLoad: 'The form could not load. Check your connection and reload the page.',
      same: 'Same email and password in the app.', already: 'Already have an account? Just sign in in the app.'
    },
    prog: {
      label: 'What happens next',
      p1: 'Account', p1s: 'here, in 1 minute', p2: 'Shop', p2s: 'in the app: category, return address, payout', p3: 'First live', p3s: 'you show, they bid',
      b2: 'Card', b2s: 'add it in the app when you first win', b3: 'First bid', b3s: 'follow sellers and bid'
    },
    done: {
      title: 'Check your inbox',
      p: 'We sent a confirmation link to <b class="email">{email}</b>. Click it, then open the ShaPop app and sign in with the same email: your shop is waiting for you.',
      pBuy: 'We sent a confirmation link to <b class="email">{email}</b>. Click it, then open the ShaPop app and sign in with the same email: your first auctions are waiting for you.',
      spam: 'Nothing received after a few minutes? Check your spam folder.', step: 'Done'
    },
    welcome: {
      metaTitle: 'Your account is ready — ShaPop', metaDesc: 'Your ShaPop account is confirmed. Download the app and sign in with the same email.',
      kicker: 'Welcome', title: 'Your account is ready', p: 'Your email address is confirmed. Download ShaPop and sign in with the <b>same email and password</b>.',
      hint: 'Already installed? Open the app and tap “Sign in”.',
      errTitle: 'This link has expired', errP: 'Confirmation links can only be used once and expire after a while. Simply sign in to the app with your email: if needed, it will send you a new link.'
    }
  });

  /* ============================== FRANÇAIS ============================== */
  add('fr', {
    cta2: { sell: 'Devenir vendeur', buy: 'Commencer à acheter', sellShort: 'Vendre', buyShort: 'Acheter', gpSmall: 'Disponible sur', gpAria: 'Télécharger ShaPop sur Google Play' },
    how2: {
      kicker: 'Dans l’appli', title: 'Voilà à quoi ressemble ShaPop', intro: 'De vrais écrans de l’appli. Sombre, rapide et simple : la vedette, c’est le live.',
      s1h: 'Les lives près de toi', s1p: 'Ton fil montre les lives qui démarrent autour de toi et ceux des vendeurs que tu suis.',
      s2h: 'Les ventes directes', s2p: 'Pas de live en ce moment ? Parcours les articles en vente à toute heure et achète en un geste.',
      s3h: 'Une fiche claire', s3p: 'Photos, prix, état et vendeur. L’IA rédige la fiche à partir des photos.',
      s4h: 'Tout au même endroit', s4p: 'Achats, ventes, vendeurs suivis et messages : tu sais toujours où en est ta commande.',
      s5h: 'Ta boutique en 2 minutes', s5p: 'Règles, catégorie, adresse de retour, versement : l’appli te guide pas à pas.',
      s6h: 'Faite pour briller', s6p: 'Une identité néon que tu reconnais au premier coup d’œil.'
    },
    sellp: {
      metaTitle: 'Devenir vendeur — ShaPop', metaDesc: 'Vends en live et aux enchères sur ShaPop. Commission de 8 %, paiement réservé sur la carte de l’acheteur, versé quand il a reçu l’article.',
      kicker: 'Vendre sur ShaPop', title: 'Ta boutique, <em>en live</em>.<br>Tes acheteurs, <em>tout de suite</em>.',
      lead: 'Montre tes articles en vidéo, laisse les acheteurs enchérir entre eux, et sois payé quand ils les ont reçus. Pas d’abonnement, pas de frais de mise en vente.',
      cta: 'Créer mon compte vendeur', ctaMore: 'Comment ça marche',
      stat1: '8 %', stat1s: 'de commission, seulement quand tu vends', stat2: '0', stat2s: 'abonnement ou frais de mise en vente', stat3: '1 photo', stat3s: 'et l’IA rédige ta fiche',
      whyKicker: 'Pourquoi le live', whyTitle: 'Pourquoi vendre en live sur ShaPop ?',
      why: [
        ['Les enchères font monter les prix', 'Quand plusieurs acheteurs veulent le même article, ils enchérissent en direct. Tu fixes le prix de départ, la salle fait le reste.'],
        ['On achète ce qu’on voit', 'Tu montres l’article sous tous les angles et tu réponds aux questions dans le chat. Moins de doutes, moins de retours.'],
        ['L’IA fait la partie ennuyeuse', 'Prends tes photos : l’IA nomme l’article, choisit la catégorie, écrit la description et propose un prix.'],
        ['Un paiement assuré', 'Le montant est réservé sur la carte de l’acheteur dès qu’il gagne. Pas d’impayé, personne à relancer.']
      ],
      stepsKicker: 'Comment ça marche', stepsTitle: 'De ton placard à ton premier live en 4 étapes',
      steps: [
        ['Crée ton compte', 'Ici, en une minute. Ensuite, connecte-toi dans l’appli ShaPop avec le même e-mail et termine ton profil vendeur.'],
        ['Prépare tes articles', 'Prends tes photos : l’IA les nomme, les classe et propose un prix. Tu vérifies et tu ajustes.'],
        ['Lance ton live et vends aux enchères', 'Un titre, une miniature, et tu es à l’antenne. Lance chaque enchère, discute avec les acheteurs, enchaîne les articles.'],
        ['Tu es payé quand l’acheteur a reçu', 'Tu envoies (ou tu remets en main propre). Dès que l’acheteur confirme — ou 24 h après la livraison sans problème — l’argent est à toi.']
      ],
      feesKicker: 'Frais', feesTitle: 'Des frais simples, seulement quand tu vends',
      fee1h: '8 % de commission', fee1p: 'Sur le prix de vente, plus la TVA le cas échéant. Rien si tu ne vends pas.',
      fee2h: 'Frais de paiement par carte', fee2p: 'Prélevés par le prestataire de paiement (Stripe) : 2,9 % + 0,30 € par vente, plus la TVA le cas échéant.',
      fee3h: 'Aucun frais caché', fee3p: 'Pas d’abonnement, pas de frais de mise en vente, rien pour lancer un live. La livraison est payée par l’acheteur.',
      exTitle: 'Exemple', exSale: 'Tu vends un article à', exFees: 'Frais au total', exNet: 'Tu reçois', exSaleV: '50,00 €', exFeesV: '– 6,90 €', exNetV: '43,10 €',
      exNote: 'Montants indicatifs, TVA comprise. Le détail exact s’affiche dans l’appli pour chaque vente.',
      protKicker: 'Protection', protTitle: 'Protégé des deux côtés',
      prot: [
        ['Paiement réservé sur la carte', 'À la fin de l’enchère, le montant est réservé sur la carte de l’acheteur. Il ne peut pas disparaître.'],
        ['24 h pour réclamer, pas plus', 'L’acheteur a 24 h après la livraison pour signaler un problème, photos à l’appui. Ensuite, la vente est acquise.'],
        ['Des règles claires pour tous', 'Tes photos d’envoi te protègent en cas de litige. Notre équipe tranche sur les preuves.']
      ],
      rulesLink: 'Lire les règles d’achat et de vente',
      faqTitle: 'Les questions des vendeurs',
      faq: [
        ['Faut-il une entreprise pour vendre ?', 'Non. Les particuliers peuvent vendre leurs propres affaires. Si tu vends régulièrement à titre professionnel, tu dois respecter les règles de ton pays.'],
        ['Quand suis-je payé ?', 'Dès que l’acheteur confirme que tout est conforme, ou 24 h après la livraison sans signalement, ou 10 jours après l’envoi sans nouvelles. En main propre : dès que l’acheteur te donne son code à 4 chiffres.'],
        ['Qu’est-ce que je peux vendre ?', 'Mode, sneakers, sacs, montres, cartes, jouets, high-tech, maison… Tout ce qui est légal et t’appartient. Contrefaçons, objets dangereux ou illégaux interdits.'],
        ['Suis-je obligé de faire des lives ?', 'Non. Tu peux aussi mettre tes articles en vente directe : ils restent en vente entre tes lives.'],
        ['C’est le même compte que dans l’appli ?', 'Oui. L’e-mail et le mot de passe que tu crées ici sont ceux que tu utilises dans l’appli ShaPop.']
      ],
      formKicker: 'Inscription', formTitle: 'Ouvre ta boutique', formIntro: 'Crée ton compte ici, puis termine ta boutique dans l’appli. Même e-mail, même mot de passe.'
    },
    buyp: {
      metaTitle: 'Commencer à acheter — ShaPop', metaDesc: 'Suis des vendeurs, enchéris en live et ne paie que si tu gagnes. Ta carte n’est réservée que si tu gagnes, et tu as 24 h pour vérifier ton article.',
      kicker: 'Acheter sur ShaPop', title: 'Enchéris <em>en live</em>.<br>Ne paie que <em>si tu gagnes</em>.',
      lead: 'Suis tes vendeurs préférés, vois les articles en vidéo, enchéris en un geste. Ta carte n’est réservée que si tu remportes l’enchère.',
      cta: 'Créer mon compte', ctaMore: 'Comment ça marche',
      stepsKicker: 'Comment ça marche', stepsTitle: 'Acheter en live en 5 étapes',
      steps: [
        ['Suis des vendeurs', 'Choisis tes catégories et suis les vendeurs qui te plaisent : tu es prévenu quand ils passent en live.'],
        ['Enchéris en un geste', 'Regarde le live, pose tes questions dans le chat et enchéris. Tu peux aussi fixer un maximum et laisser l’appli enchérir pour toi.'],
        ['Ta carte n’est réservée que si tu gagnes', 'Enchère perdue ? Il ne se passe rien. Gagnée ? Le montant est réservé sur ta carte, pas encore versé au vendeur.'],
        ['En main propre ou par la poste', 'Choisis de retrouver le vendeur en personne ou de recevoir l’article par la poste.'],
        ['24 h pour vérifier', 'Une fois l’article reçu, confirme que tout va bien ou signale un problème sous 24 h, photos à l’appui.']
      ],
      protKicker: 'Protection', protTitle: 'Ton argent est protégé',
      prot: [
        ['Le vendeur est payé après ta réception', 'L’argent n’arrive chez le vendeur qu’une fois l’article entre tes mains, ou après les 24 h de vérification.'],
        ['Un problème ? Signale-le', 'Article non conforme ou jamais arrivé : signale-le depuis ta commande. Notre équipe examine les photos et tranche.'],
        ['Paie toujours dans l’appli', 'Ne paie jamais un vendeur en dehors de ShaPop : tu perdrais la protection.']
      ],
      rulesLink: 'Lire les règles d’achat et de vente',
      formKicker: 'Inscription', formTitle: 'Crée ton compte', formIntro: 'Une minute ici, puis connecte-toi dans l’appli avec le même e-mail et le même mot de passe.'
    },
    form: {
      first: 'Prénom', last: 'Nom', firstPh: 'Léa', lastPh: 'Martin', name: 'Prénom', email: 'E-mail', emailPh: 'toi@exemple.com', password: 'Mot de passe', passwordHint: '8 caractères minimum', show: 'Afficher', hide: 'Masquer',
      country: 'Pays', countryPick: 'Choisis ton pays',
      countries: { IL: 'Israël', FR: 'France', ES: 'Espagne', US: 'États-Unis', GB: 'Royaume-Uni', DE: 'Allemagne', IT: 'Italie', BE: 'Belgique', CH: 'Suisse', PT: 'Portugal', NL: 'Pays-Bas', CA: 'Canada', OTHER: 'Autre pays' },
      category: 'Catégorie principale', categoryPick: 'Que vas-tu vendre ?',
      categories: { fashion_w: 'Mode femme', fashion_m: 'Mode homme', sneakers: 'Sneakers', bags: 'Sacs', jewelry: 'Bijoux', watches: 'Montres', beauty: 'Beauté', electronics: 'High-tech', gaming: 'Jeux vidéo', cards: 'Cartes à collectionner', toys: 'Jouets', vintage: 'Vintage', home: 'Maison', kids: 'Enfants', collect: 'Objets de collection', other: 'Autre' },
      exp: 'Expérience de vente', expPick: 'Choisis',
      exps: { none: 'Je n’ai jamais vendu en ligne', marketplaces: 'Je vends sur Vinted, Leboncoin ou eBay', shop: 'J’ai une boutique (en ligne ou physique)', live: 'Je vends déjà en live (Whatnot, TikTok…)' },
      acceptRules: 'J’accepte les <a href="/rules" target="_blank">règles d’achat et de vente</a>',
      acceptTerms: 'J’accepte les <a href="/terms" target="_blank">conditions d’utilisation</a> et la <a href="/privacy" target="_blank">politique de confidentialité</a>',
      submitSell: 'Créer mon compte vendeur', submitBuy: 'Créer mon compte', sending: 'Création de ton compte…',
      errRequired: 'Remplis ce champ.', errEmail: 'Cette adresse e-mail ne semble pas correcte.', errPassword: '8 caractères minimum.', errCheck: 'Coche cette case pour continuer.',
      errExists: 'Tu as déjà un compte avec cet e-mail : connecte-toi directement dans l’appli ShaPop.', errRate: 'Trop d’essais. Réessaie dans quelques minutes.', errWeak: 'Ce mot de passe est trop facile à deviner. Choisis-en un autre.',
      errGeneric: 'Une erreur est survenue. Réessaie dans un instant.', errLoad: 'Le formulaire n’a pas pu se charger. Vérifie ta connexion et recharge la page.',
      same: 'Même e-mail et même mot de passe dans l’appli.', already: 'Déjà un compte ? Connecte-toi simplement dans l’appli.'
    },
    prog: {
      label: 'La suite',
      p1: 'Compte', p1s: 'ici, en 1 minute', p2: 'Boutique', p2s: 'dans l’appli : catégorie, adresse de retour, versement', p3: 'Premier live', p3s: 'tu montres, ils enchérissent',
      b2: 'Carte', b2s: 'à ajouter dans l’appli à ta première victoire', b3: 'Première enchère', b3s: 'suis des vendeurs et enchéris'
    },
    done: {
      title: 'Vérifie ta boîte mail',
      p: 'On t’a envoyé un lien de confirmation à <b class="email">{email}</b>. Clique dessus, puis ouvre l’appli ShaPop et connecte-toi avec le même e-mail : ta boutique t’attend.',
      pBuy: 'On t’a envoyé un lien de confirmation à <b class="email">{email}</b>. Clique dessus, puis ouvre l’appli ShaPop et connecte-toi avec le même e-mail : tes premières enchères t’attendent.',
      spam: 'Rien reçu après quelques minutes ? Regarde dans tes courriers indésirables.', step: 'Fait'
    },
    welcome: {
      metaTitle: 'Ton compte est prêt — ShaPop', metaDesc: 'Ton compte ShaPop est confirmé. Télécharge l’appli et connecte-toi avec le même e-mail.',
      kicker: 'Bienvenue', title: 'Ton compte est prêt', p: 'Ton adresse e-mail est confirmée. Télécharge ShaPop et connecte-toi avec le <b>même e-mail et le même mot de passe</b>.',
      hint: 'L’appli est déjà installée ? Ouvre-la et touche « Se connecter ».',
      errTitle: 'Ce lien a expiré', errP: 'Un lien de confirmation ne sert qu’une fois et expire au bout d’un moment. Connecte-toi simplement dans l’appli avec ton e-mail : si besoin, elle t’enverra un nouveau lien.'
    }
  });

  /* ============================== ESPAÑOL ============================== */
  add('es', {
    cta2: { sell: 'Hazte vendedor', buy: 'Empieza a comprar', sellShort: 'Vender', buyShort: 'Comprar', gpSmall: 'Disponible en', gpAria: 'Descarga ShaPop en Google Play' },
    how2: {
      kicker: 'Dentro de la app', title: 'Así es ShaPop', intro: 'Pantallas reales de la app. Oscura, rápida y sencilla: la estrella es el directo.',
      s1h: 'Directos cerca de ti', s1p: 'Tu inicio muestra los directos que empiezan a tu alrededor y los de los vendedores que sigues.',
      s2h: 'Ventas directas', s2p: '¿Ningún directo ahora? Mira los artículos en venta a cualquier hora y compra con un toque.',
      s3h: 'Una ficha clara', s3p: 'Fotos, precio, estado y vendedor. La IA redacta la ficha a partir de las fotos.',
      s4h: 'Todo en un solo sitio', s4p: 'Compras, ventas, vendedores seguidos y mensajes: siempre sabes dónde está tu pedido.',
      s5h: 'Tu tienda en 2 minutos', s5p: 'Reglas, categoría, dirección de devolución, cobro: la app te guía paso a paso.',
      s6h: 'Hecha para brillar', s6p: 'Una identidad neón que reconoces a primera vista.'
    },
    sellp: {
      metaTitle: 'Hazte vendedor — ShaPop', metaDesc: 'Vende en directo y en subasta en ShaPop. Comisión del 8 %, pago reservado en la tarjeta del comprador y abonado cuando lo ha recibido.',
      kicker: 'Vender en ShaPop', title: 'Tu tienda, <em>en directo</em>.<br>Tus compradores, <em>ahora mismo</em>.',
      lead: 'Enseña tus artículos en vídeo, deja que los compradores pujen entre ellos y cobra cuando los hayan recibido. Sin suscripción ni gastos de publicación.',
      cta: 'Crear mi cuenta de vendedor', ctaMore: 'Cómo funciona',
      stat1: '8 %', stat1s: 'de comisión, solo cuando vendes', stat2: '0', stat2s: 'suscripción o gastos de publicación', stat3: '1 foto', stat3s: 'y la IA redacta tu ficha',
      whyKicker: 'Por qué en directo', whyTitle: '¿Por qué vender en directo en ShaPop?',
      why: [
        ['Las subastas suben los precios', 'Cuando varios compradores quieren el mismo artículo, pujan en tiempo real. Tú fijas el precio de salida y la sala hace el resto.'],
        ['Se compra lo que se ve', 'Enseñas el artículo desde todos los ángulos y respondes en el chat. Menos dudas, menos devoluciones.'],
        ['La IA hace lo aburrido', 'Haz tus fotos: la IA nombra el artículo, elige la categoría, escribe la descripción y propone un precio.'],
        ['Un cobro asegurado', 'El importe se reserva en la tarjeta del comprador en cuanto gana. Sin impagos, sin perseguir a nadie.']
      ],
      stepsKicker: 'Cómo funciona', stepsTitle: 'De tu armario a tu primer directo en 4 pasos',
      steps: [
        ['Crea tu cuenta', 'Aquí, en un minuto. Luego inicia sesión en la app ShaPop con el mismo correo y completa tu perfil de vendedor.'],
        ['Prepara tus artículos', 'Haz tus fotos: la IA los nombra, los clasifica y propone un precio. Tú revisas y ajustas.'],
        ['Lanza tu directo y vende en subasta', 'Un título, una miniatura y estás en antena. Lanza cada subasta, charla con los compradores y encadena artículos.'],
        ['Cobras cuando el comprador lo recibe', 'Envías (o entregas en mano). En cuanto el comprador confirma —o 24 h después de la entrega sin problemas— el dinero es tuyo.']
      ],
      feesKicker: 'Tarifas', feesTitle: 'Tarifas sencillas, solo cuando vendes',
      fee1h: '8 % de comisión', fee1p: 'Sobre el precio de venta, más IVA cuando corresponda. Nada si no vendes.',
      fee2h: 'Gastos de pago con tarjeta', fee2p: 'Cobrados por el proveedor de pagos (Stripe): 2,9 % + 0,30 € por venta, más IVA cuando corresponda.',
      fee3h: 'Sin costes ocultos', fee3p: 'Sin suscripción, sin gastos de publicación, nada por lanzar un directo. El envío lo paga el comprador.',
      exTitle: 'Ejemplo', exSale: 'Vendes un artículo por', exFees: 'Gastos totales', exNet: 'Recibes', exSaleV: '50,00 €', exFeesV: '– 6,90 €', exNetV: '43,10 €',
      exNote: 'Importes orientativos, IVA incluido. El desglose exacto aparece en la app para cada venta.',
      protKicker: 'Protección', protTitle: 'Protegidos por ambos lados',
      prot: [
        ['Pago reservado en la tarjeta', 'Al terminar la subasta, el importe queda reservado en la tarjeta del comprador. No puede desaparecer.'],
        ['24 h para reclamar, no más', 'El comprador tiene 24 h tras la entrega para avisar de un problema, con fotos. Después, la venta es firme.'],
        ['Reglas claras para todos', 'Tus fotos de envío te protegen en caso de disputa. Nuestro equipo decide según las pruebas.']
      ],
      rulesLink: 'Leer las reglas de compra y venta',
      faqTitle: 'Preguntas de vendedores',
      faq: [
        ['¿Necesito una empresa para vender?', 'No. Los particulares pueden vender sus propias cosas. Si vendes de forma habitual como profesional, debes cumplir las normas de tu país.'],
        ['¿Cuándo cobro?', 'En cuanto el comprador confirma que todo está bien, o 24 h después de la entrega sin avisos, o 10 días después del envío sin noticias. En mano: en cuanto el comprador te da su código de 4 cifras.'],
        ['¿Qué puedo vender?', 'Moda, zapatillas, bolsos, relojes, cartas, juguetes, tecnología, hogar… Todo lo legal que sea tuyo. Prohibidas las falsificaciones y los objetos peligrosos o ilegales.'],
        ['¿Tengo que hacer directos?', 'No. También puedes poner artículos en venta directa: siguen a la venta entre tus directos.'],
        ['¿Es la misma cuenta que en la app?', 'Sí. El correo y la contraseña que creas aquí son los que usas en la app ShaPop.']
      ],
      formKicker: 'Registro', formTitle: 'Abre tu tienda', formIntro: 'Crea tu cuenta aquí y termina tu tienda en la app. Mismo correo, misma contraseña.'
    },
    buyp: {
      metaTitle: 'Empieza a comprar — ShaPop', metaDesc: 'Sigue a vendedores, puja en directo y paga solo si ganas. Tu tarjeta solo se reserva si ganas y tienes 24 h para revisar tu artículo.',
      kicker: 'Comprar en ShaPop', title: 'Puja <em>en directo</em>.<br>Paga solo <em>si ganas</em>.',
      lead: 'Sigue a tus vendedores favoritos, mira los artículos en vídeo y puja con un toque. Tu tarjeta solo se reserva si ganas la subasta.',
      cta: 'Crear mi cuenta', ctaMore: 'Cómo funciona',
      stepsKicker: 'Cómo funciona', stepsTitle: 'Comprar en directo en 5 pasos',
      steps: [
        ['Sigue a vendedores', 'Elige tus categorías y sigue a los vendedores que te gusten: te avisamos cuando empiezan un directo.'],
        ['Puja con un toque', 'Mira el directo, pregunta en el chat y puja. También puedes fijar un máximo y dejar que la app puje por ti.'],
        ['Tu tarjeta solo se reserva si ganas', '¿Has perdido la subasta? No pasa nada. ¿La has ganado? El importe se reserva en tu tarjeta, aún no se paga al vendedor.'],
        ['En mano o por correo', 'Elige quedar con el vendedor en persona o recibir el artículo por correo.'],
        ['24 h para revisar', 'Cuando tengas el artículo, confirma que todo está bien o avisa de un problema en 24 h, con fotos.']
      ],
      protKicker: 'Protección', protTitle: 'Tu dinero está protegido',
      prot: [
        ['El vendedor cobra después de que lo recibas', 'El dinero solo llega al vendedor cuando tienes el artículo, o tras las 24 h de revisión.'],
        ['¿Un problema? Avísanos', 'Artículo no conforme o que nunca llegó: avísalo desde tu pedido. Nuestro equipo revisa las fotos y decide.'],
        ['Paga siempre en la app', 'Nunca pagues a un vendedor fuera de ShaPop: perderías la protección.']
      ],
      rulesLink: 'Leer las reglas de compra y venta',
      formKicker: 'Registro', formTitle: 'Crea tu cuenta', formIntro: 'Un minuto aquí y luego inicia sesión en la app con el mismo correo y contraseña.'
    },
    form: {
      first: 'Nombre', last: 'Apellidos', firstPh: 'Lucía', lastPh: 'García', name: 'Nombre', email: 'Correo electrónico', emailPh: 'tu@ejemplo.com', password: 'Contraseña', passwordHint: 'Mínimo 8 caracteres', show: 'Mostrar', hide: 'Ocultar',
      country: 'País', countryPick: 'Elige tu país',
      countries: { IL: 'Israel', FR: 'Francia', ES: 'España', US: 'Estados Unidos', GB: 'Reino Unido', DE: 'Alemania', IT: 'Italia', BE: 'Bélgica', CH: 'Suiza', PT: 'Portugal', NL: 'Países Bajos', CA: 'Canadá', OTHER: 'Otro país' },
      category: 'Categoría principal', categoryPick: '¿Qué vas a vender?',
      categories: { fashion_w: 'Moda mujer', fashion_m: 'Moda hombre', sneakers: 'Zapatillas', bags: 'Bolsos', jewelry: 'Joyas', watches: 'Relojes', beauty: 'Belleza', electronics: 'Tecnología', gaming: 'Videojuegos', cards: 'Cartas coleccionables', toys: 'Juguetes', vintage: 'Vintage', home: 'Hogar', kids: 'Niños', collect: 'Coleccionismo', other: 'Otra' },
      exp: 'Experiencia de venta', expPick: 'Elige',
      exps: { none: 'Nunca he vendido en internet', marketplaces: 'Vendo en Vinted, Wallapop o eBay', shop: 'Tengo una tienda (online o física)', live: 'Ya vendo en directo (Whatnot, TikTok…)' },
      acceptRules: 'Acepto las <a href="/rules" target="_blank">reglas de compra y venta</a>',
      acceptTerms: 'Acepto las <a href="/terms" target="_blank">condiciones de uso</a> y la <a href="/privacy" target="_blank">política de privacidad</a>',
      submitSell: 'Crear mi cuenta de vendedor', submitBuy: 'Crear mi cuenta', sending: 'Creando tu cuenta…',
      errRequired: 'Rellena este campo.', errEmail: 'Este correo no parece correcto.', errPassword: 'Mínimo 8 caracteres.', errCheck: 'Marca esta casilla para continuar.',
      errExists: 'Ya tienes una cuenta con este correo: inicia sesión directamente en la app ShaPop.', errRate: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.', errWeak: 'Esta contraseña es demasiado fácil. Elige otra.',
      errGeneric: 'Algo ha fallado. Vuelve a intentarlo en un momento.', errLoad: 'El formulario no se ha podido cargar. Revisa tu conexión y recarga la página.',
      same: 'Mismo correo y contraseña en la app.', already: '¿Ya tienes cuenta? Inicia sesión en la app.'
    },
    prog: {
      label: 'Lo que viene',
      p1: 'Cuenta', p1s: 'aquí, en 1 minuto', p2: 'Tienda', p2s: 'en la app: categoría, dirección de devolución, cobro', p3: 'Primer directo', p3s: 'tú enseñas, ellos pujan',
      b2: 'Tarjeta', b2s: 'añádela en la app cuando ganes por primera vez', b3: 'Primera puja', b3s: 'sigue a vendedores y puja'
    },
    done: {
      title: 'Revisa tu correo',
      p: 'Te hemos enviado un enlace de confirmación a <b class="email">{email}</b>. Haz clic, abre la app ShaPop e inicia sesión con el mismo correo: tu tienda te espera.',
      pBuy: 'Te hemos enviado un enlace de confirmación a <b class="email">{email}</b>. Haz clic, abre la app ShaPop e inicia sesión con el mismo correo: tus primeras subastas te esperan.',
      spam: '¿No te llega después de unos minutos? Mira en la carpeta de spam.', step: 'Hecho'
    },
    welcome: {
      metaTitle: 'Tu cuenta está lista — ShaPop', metaDesc: 'Tu cuenta de ShaPop está confirmada. Descarga la app e inicia sesión con el mismo correo.',
      kicker: 'Bienvenida', title: 'Tu cuenta está lista', p: 'Tu correo está confirmado. Descarga ShaPop e inicia sesión con el <b>mismo correo y la misma contraseña</b>.',
      hint: '¿Ya la tienes instalada? Ábrela y toca «Iniciar sesión».',
      errTitle: 'Este enlace ha caducado', errP: 'Un enlace de confirmación solo sirve una vez y caduca al cabo de un tiempo. Inicia sesión en la app con tu correo: si hace falta, te enviará un enlace nuevo.'
    }
  });

  /* ============================== РУССКИЙ ============================== */
  add('ru', {
    cta2: { sell: 'Стать продавцом', buy: 'Начать покупать', sellShort: 'Продать', buyShort: 'Купить', gpSmall: 'Доступно в', gpAria: 'Скачать ShaPop в Google Play' },
    how2: {
      kicker: 'В приложении', title: 'Так выглядит ShaPop', intro: 'Настоящие экраны приложения. Тёмное, быстрое и простое — главное здесь эфир.',
      s1h: 'Эфиры рядом с тобой', s1p: 'В ленте — эфиры, которые начинаются рядом, и эфиры продавцов, на которых ты подписан.',
      s2h: 'Прямые продажи', s2p: 'Сейчас нет эфира? Смотри товары в продаже в любое время и покупай в одно касание.',
      s3h: 'Понятная карточка', s3p: 'Фото, цена, состояние и продавец. ИИ пишет карточку по фотографиям.',
      s4h: 'Всё в одном месте', s4p: 'Покупки, продажи, подписки и сообщения: ты всегда знаешь, где твой заказ.',
      s5h: 'Магазин за 2 минуты', s5p: 'Правила, категория, адрес возврата, выплаты: приложение ведёт тебя шаг за шагом.',
      s6h: 'Создано, чтобы сиять', s6p: 'Неоновый стиль, который узнаёшь с первого взгляда.'
    },
    sellp: {
      metaTitle: 'Стать продавцом — ShaPop', metaDesc: 'Продавай в прямом эфире и на аукционе в ShaPop. Комиссия 8 %, оплата резервируется на карте покупателя и переводится, когда он получил товар.',
      kicker: 'Продавать в ShaPop', title: 'Твой магазин — <em>в эфире</em>.<br>Твои покупатели — <em>прямо сейчас</em>.',
      lead: 'Показывай товары на видео, пусть покупатели торгуются между собой, а деньги ты получаешь, когда они получили товар. Без подписки и платы за размещение.',
      cta: 'Создать аккаунт продавца', ctaMore: 'Как это работает',
      stat1: '8 %', stat1s: 'комиссии, только когда продаёшь', stat2: '0', stat2s: 'подписки и платы за размещение', stat3: '1 фото', stat3s: 'и ИИ напишет карточку',
      whyKicker: 'Почему эфир', whyTitle: 'Почему стоит продавать в эфире ShaPop?',
      why: [
        ['Аукцион поднимает цену', 'Когда товар нужен нескольким покупателям, они торгуются в реальном времени. Ты задаёшь стартовую цену — остальное делает зал.'],
        ['Покупают то, что видят', 'Ты показываешь товар со всех сторон и отвечаешь в чате. Меньше сомнений — меньше возвратов.'],
        ['ИИ делает скучную часть', 'Сфотографируй товар: ИИ назовёт его, выберет категорию, напишет описание и предложит цену.'],
        ['Оплата гарантирована', 'Сумма резервируется на карте покупателя, как только он выиграл. Никаких неоплат и напоминаний.']
      ],
      stepsKicker: 'Как это работает', stepsTitle: 'От шкафа до первого эфира за 4 шага',
      steps: [
        ['Создай аккаунт', 'Здесь, за минуту. Затем войди в приложение ShaPop с тем же e-mail и заверши профиль продавца.'],
        ['Подготовь товары', 'Сфотографируй их: ИИ назовёт, рассортирует и предложит цену. Ты проверяешь и правишь.'],
        ['Запусти эфир и продавай на аукционе', 'Название, обложка — и ты в эфире. Запускай аукционы, общайся с покупателями, продавай подряд.'],
        ['Деньги — когда покупатель получил товар', 'Ты отправляешь (или передаёшь лично). Как только покупатель подтвердит — или через 24 ч после доставки без проблем — деньги твои.']
      ],
      feesKicker: 'Комиссии', feesTitle: 'Простые комиссии, только когда продаёшь',
      fee1h: 'Комиссия 8 %', fee1p: 'С цены продажи, плюс НДС, если применимо. Ничего, если не продал.',
      fee2h: 'Комиссия за оплату картой', fee2p: 'Взимается платёжным сервисом (Stripe): 2,9 % + 0,30 € за продажу, плюс НДС, если применимо.',
      fee3h: 'Никаких скрытых платежей', fee3p: 'Без подписки, без платы за размещение и за эфир. Доставку оплачивает покупатель.',
      exTitle: 'Пример', exSale: 'Ты продаёшь товар за', exFees: 'Всего комиссий', exNet: 'Ты получаешь', exSaleV: '50,00 €', exFeesV: '– 6,90 €', exNetV: '43,10 €',
      exNote: 'Ориентировочные суммы с НДС. Точный расчёт показывается в приложении для каждой продажи.',
      protKicker: 'Защита', protTitle: 'Защищены обе стороны',
      prot: [
        ['Оплата зарезервирована на карте', 'После аукциона сумма резервируется на карте покупателя. Она не может исчезнуть.'],
        ['24 часа на претензию — не больше', 'У покупателя 24 часа после доставки, чтобы сообщить о проблеме с фото. После этого продажа окончательна.'],
        ['Понятные правила для всех', 'Фото отправки защищают тебя в споре. Наша команда решает по доказательствам.']
      ],
      rulesLink: 'Читать правила покупки и продажи',
      faqTitle: 'Вопросы продавцов',
      faq: [
        ['Нужна ли компания, чтобы продавать?', 'Нет. Частные лица могут продавать свои вещи. Если ты продаёшь регулярно как бизнес, соблюдай правила своей страны.'],
        ['Когда я получу деньги?', 'Как только покупатель подтвердит, что всё в порядке, или через 24 ч после доставки без претензий, или через 10 дней после отправки без новостей. Лично — как только покупатель назовёт свой 4-значный код.'],
        ['Что можно продавать?', 'Одежду, кроссовки, сумки, часы, карточки, игрушки, технику, товары для дома… Всё законное и принадлежащее тебе. Подделки, опасные и незаконные товары запрещены.'],
        ['Обязательно ли выходить в эфир?', 'Нет. Можно выставить товары в прямую продажу: они остаются в продаже между эфирами.'],
        ['Это тот же аккаунт, что в приложении?', 'Да. E-mail и пароль, которые ты создаёшь здесь, — те же, что в приложении ShaPop.']
      ],
      formKicker: 'Регистрация', formTitle: 'Открой свой магазин', formIntro: 'Создай аккаунт здесь, а магазин заверши в приложении. Тот же e-mail, тот же пароль.'
    },
    buyp: {
      metaTitle: 'Начать покупать — ShaPop', metaDesc: 'Подписывайся на продавцов, делай ставки в эфире и плати, только если выиграл. Карта резервируется только при выигрыше, и у тебя 24 часа на проверку товара.',
      kicker: 'Покупать в ShaPop', title: 'Делай ставки <em>в эфире</em>.<br>Плати, только <em>если выиграл</em>.',
      lead: 'Подписывайся на любимых продавцов, смотри товары на видео, делай ставку в одно касание. Карта резервируется, только если ты выиграл аукцион.',
      cta: 'Создать аккаунт', ctaMore: 'Как это работает',
      stepsKicker: 'Как это работает', stepsTitle: 'Покупки в эфире за 5 шагов',
      steps: [
        ['Подпишись на продавцов', 'Выбери категории и подпишись на понравившихся продавцов: мы сообщим, когда они выйдут в эфир.'],
        ['Ставка в одно касание', 'Смотри эфир, задавай вопросы в чате и делай ставки. Можно задать максимум, и приложение будет ставить за тебя.'],
        ['Карта резервируется только при выигрыше', 'Проиграл аукцион? Ничего не происходит. Выиграл? Сумма резервируется на карте, но продавцу ещё не переводится.'],
        ['Лично или почтой', 'Выбери встречу с продавцом или доставку почтой.'],
        ['24 часа на проверку', 'Получив товар, подтверди, что всё в порядке, или сообщи о проблеме в течение 24 часов, с фото.']
      ],
      protKicker: 'Защита', protTitle: 'Твои деньги защищены',
      prot: [
        ['Продавец получает деньги после тебя', 'Деньги приходят продавцу только когда товар у тебя, или после 24 часов на проверку.'],
        ['Проблема? Сообщи', 'Товар не соответствует описанию или не пришёл: сообщи из заказа. Наша команда изучит фото и примет решение.'],
        ['Всегда плати в приложении', 'Никогда не плати продавцу вне ShaPop: ты потеряешь защиту.']
      ],
      rulesLink: 'Читать правила покупки и продажи',
      formKicker: 'Регистрация', formTitle: 'Создай аккаунт', formIntro: 'Минута здесь, затем войди в приложение с тем же e-mail и паролем.'
    },
    form: {
      first: 'Имя', last: 'Фамилия', firstPh: 'Анна', lastPh: 'Иванова', name: 'Имя', email: 'E-mail', emailPh: 'ty@primer.com', password: 'Пароль', passwordHint: 'Не меньше 8 символов', show: 'Показать', hide: 'Скрыть',
      country: 'Страна', countryPick: 'Выбери страну',
      countries: { IL: 'Израиль', FR: 'Франция', ES: 'Испания', US: 'США', GB: 'Великобритания', DE: 'Германия', IT: 'Италия', BE: 'Бельгия', CH: 'Швейцария', PT: 'Португалия', NL: 'Нидерланды', CA: 'Канада', OTHER: 'Другая страна' },
      category: 'Основная категория', categoryPick: 'Что будешь продавать?',
      categories: { fashion_w: 'Женская мода', fashion_m: 'Мужская мода', sneakers: 'Кроссовки', bags: 'Сумки', jewelry: 'Украшения', watches: 'Часы', beauty: 'Красота', electronics: 'Техника', gaming: 'Игры', cards: 'Коллекционные карточки', toys: 'Игрушки', vintage: 'Винтаж', home: 'Дом', kids: 'Дети', collect: 'Коллекционирование', other: 'Другое' },
      exp: 'Опыт продаж', expPick: 'Выбери',
      exps: { none: 'Никогда не продавал онлайн', marketplaces: 'Продаю на Vinted, eBay или Авито', shop: 'У меня есть магазин (онлайн или офлайн)', live: 'Уже продаю в эфирах (Whatnot, TikTok…)' },
      acceptRules: 'Я принимаю <a href="/rules" target="_blank">правила покупки и продажи</a>',
      acceptTerms: 'Я принимаю <a href="/terms" target="_blank">условия использования</a> и <a href="/privacy" target="_blank">политику конфиденциальности</a>',
      submitSell: 'Создать аккаунт продавца', submitBuy: 'Создать аккаунт', sending: 'Создаём аккаунт…',
      errRequired: 'Заполни это поле.', errEmail: 'Похоже, e-mail указан неверно.', errPassword: 'Не меньше 8 символов.', errCheck: 'Отметь, чтобы продолжить.',
      errExists: 'У тебя уже есть аккаунт с этим e-mail: просто войди в приложение ShaPop.', errRate: 'Слишком много попыток. Попробуй через несколько минут.', errWeak: 'Этот пароль слишком простой. Выбери другой.',
      errGeneric: 'Что-то пошло не так. Попробуй ещё раз через минуту.', errLoad: 'Форма не загрузилась. Проверь соединение и обнови страницу.',
      same: 'Тот же e-mail и пароль в приложении.', already: 'Уже есть аккаунт? Просто войди в приложение.'
    },
    prog: {
      label: 'Что дальше',
      p1: 'Аккаунт', p1s: 'здесь, за 1 минуту', p2: 'Магазин', p2s: 'в приложении: категория, адрес возврата, выплаты', p3: 'Первый эфир', p3s: 'ты показываешь, они торгуются',
      b2: 'Карта', b2s: 'добавь в приложении при первом выигрыше', b3: 'Первая ставка', b3s: 'подпишись на продавцов и торгуйся'
    },
    done: {
      title: 'Проверь почту',
      p: 'Мы отправили ссылку для подтверждения на <b class="email">{email}</b>. Нажми на неё, затем открой приложение ShaPop и войди с тем же e-mail: твой магазин ждёт тебя.',
      pBuy: 'Мы отправили ссылку для подтверждения на <b class="email">{email}</b>. Нажми на неё, затем открой приложение ShaPop и войди с тем же e-mail: первые аукционы ждут тебя.',
      spam: 'Письма нет через несколько минут? Проверь папку «Спам».', step: 'Готово'
    },
    welcome: {
      metaTitle: 'Аккаунт готов — ShaPop', metaDesc: 'Твой аккаунт ShaPop подтверждён. Скачай приложение и войди с тем же e-mail.',
      kicker: 'Добро пожаловать', title: 'Твой аккаунт готов', p: 'Твой e-mail подтверждён. Скачай ShaPop и войди с <b>тем же e-mail и паролем</b>.',
      hint: 'Приложение уже установлено? Открой его и нажми «Войти».',
      errTitle: 'Срок действия ссылки истёк', errP: 'Ссылка для подтверждения работает один раз и через какое-то время истекает. Просто войди в приложение со своим e-mail: если нужно, оно пришлёт новую ссылку.'
    }
  });

  /* ============================== עברית ============================== */
  add('he', {
    cta2: { sell: 'להיות מוכר/ת', buy: 'להתחיל לקנות', sellShort: 'למכור', buyShort: 'לקנות', gpSmall: 'זמין ב־', gpAria: 'הורידו את ShaPop מ־Google Play' },
    how2: {
      kicker: 'בתוך האפליקציה', title: 'ככה נראית ShaPop', intro: 'מסכים אמיתיים מהאפליקציה. כהה, מהירה ופשוטה — הלייב הוא הכוכב.',
      s1h: 'לייבים לידכם', s1p: 'הפיד מציג את הלייבים שמתחילים סביבכם ואת אלה של המוכרים שאתם עוקבים אחריהם.',
      s2h: 'מכירות ישירות', s2p: 'אין לייב עכשיו? עברו על הפריטים למכירה בכל שעה וקנו בנגיעה אחת.',
      s3h: 'עמוד פריט ברור', s3p: 'תמונות, מחיר, מצב והמוכר. הבינה המלאכותית כותבת את המודעה מהתמונות.',
      s4h: 'הכול במקום אחד', s4p: 'קניות, מכירות, מוכרים במעקב והודעות: תמיד יודעים איפה ההזמנה.',
      s5h: 'החנות שלכם ב־2 דקות', s5p: 'כללים, קטגוריה, כתובת להחזרות, תשלומים: האפליקציה מלווה אתכם צעד אחר צעד.',
      s6h: 'נוצרה לזהור', s6p: 'זהות ניאון שמזהים במבט הראשון.'
    },
    sellp: {
      metaTitle: 'להיות מוכר/ת — ShaPop', metaDesc: 'מוכרים בלייב ובמכירה פומבית ב־ShaPop. עמלה של 8%, התשלום נשמר בכרטיס של הקונה ומועבר אחרי שקיבל את הפריט.',
      kicker: 'למכור ב־ShaPop', title: 'החנות שלכם, <em>בלייב</em>.<br>הקונים שלכם, <em>עכשיו</em>.',
      lead: 'מציגים את הפריטים בווידאו, נותנים לקונים להתחרות במכירה פומבית ומקבלים את הכסף אחרי שהם קיבלו את הפריט. בלי מנוי ובלי דמי פרסום.',
      cta: 'יצירת חשבון מוכר', ctaMore: 'איך זה עובד',
      stat1: '8%', stat1s: 'עמלה, רק כשמוכרים', stat2: '0', stat2s: 'מנוי או דמי פרסום', stat3: 'תמונה אחת', stat3s: 'והבינה המלאכותית כותבת את המודעה',
      whyKicker: 'למה לייב', whyTitle: 'למה למכור בלייב ב־ShaPop?',
      why: [
        ['מכירה פומבית מעלה מחירים', 'כשכמה קונים רוצים את אותו פריט, הם מתחרים בזמן אמת. אתם קובעים מחיר פתיחה, והקהל עושה את השאר.'],
        ['קונים את מה שרואים', 'מציגים את הפריט מכל הכיוונים ועונים על שאלות בצ׳אט. פחות ספקות, פחות החזרות.'],
        ['הבינה המלאכותית עושה את החלק המשעמם', 'מצלמים: הבינה המלאכותית נותנת שם לפריט, בוחרת קטגוריה, כותבת תיאור ומציעה מחיר.'],
        ['תשלום מובטח', 'הסכום נשמר בכרטיס של הקונה ברגע שזכה. בלי הזמנות שלא שולמו ובלי לרדוף אחרי אף אחד.']
      ],
      stepsKicker: 'איך זה עובד', stepsTitle: 'מהארון ללייב הראשון ב־4 צעדים',
      steps: [
        ['פותחים חשבון', 'כאן, בדקה. אחר כך מתחברים לאפליקציית ShaPop עם אותו אימייל ומשלימים את פרופיל המוכר.'],
        ['מכינים את הפריטים', 'מצלמים: הבינה המלאכותית נותנת שמות, ממיינת ומציעה מחיר. אתם בודקים ומתקנים.'],
        ['עולים ללייב ומוכרים במכירה פומבית', 'כותרת, תמונה ממוזערת ואתם באוויר. פותחים כל מכירה, מדברים עם הקונים ומוכרים פריט אחרי פריט.'],
        ['מקבלים תשלום כשהקונה קיבל', 'שולחים (או מוסרים ביד). ברגע שהקונה מאשר — או 24 שעות אחרי המסירה בלי בעיה — הכסף שלכם.']
      ],
      feesKicker: 'עמלות', feesTitle: 'עמלות פשוטות, רק כשמוכרים',
      fee1h: 'עמלה של 8%', fee1p: 'ממחיר המכירה, בתוספת מע״מ אם חל. כלום אם לא מכרתם.',
      fee2h: 'עמלת תשלום בכרטיס', fee2p: 'נגבית על ידי ספק התשלומים (Stripe): ‏2.9% + 0.30 לכל מכירה, בתוספת מע״מ אם חל.',
      fee3h: 'בלי עלויות נסתרות', fee3p: 'בלי מנוי, בלי דמי פרסום, בלי תשלום על לייב. את המשלוח משלם הקונה.',
      exTitle: 'דוגמה', exSale: 'מכרתם פריט ב־', exFees: 'סך העמלות', exNet: 'אתם מקבלים', exSaleV: '50.00 ₪', exFeesV: '– 6.90 ₪', exNetV: '43.10 ₪',
      exNote: 'סכומים להמחשה, כולל מע״מ. הפירוט המדויק מופיע באפליקציה לכל מכירה.',
      protKicker: 'הגנה', protTitle: 'מוגנים משני הצדדים',
      prot: [
        ['התשלום נשמר בכרטיס', 'בסוף המכירה הפומבית, הסכום נשמר בכרטיס של הקונה. הוא לא יכול להיעלם.'],
        ['24 שעות לתלונה, לא יותר', 'לקונה יש 24 שעות אחרי המסירה לדווח על בעיה, עם תמונות. אחר כך המכירה סופית.'],
        ['כללים ברורים לכולם', 'תמונות המשלוח שלכם מגינות עליכם במחלוקת. הצוות שלנו מכריע לפי הראיות.']
      ],
      rulesLink: 'לקריאת כללי הקנייה והמכירה',
      faqTitle: 'שאלות של מוכרים',
      faq: [
        ['צריך עסק כדי למכור?', 'לא. אנשים פרטיים יכולים למכור את החפצים שלהם. אם אתם מוכרים באופן קבוע כעסק, יש לפעול לפי הכללים במדינה שלכם.'],
        ['מתי מקבלים את הכסף?', 'ברגע שהקונה מאשר שהכול תקין, או 24 שעות אחרי המסירה בלי דיווח, או 10 ימים אחרי השליחה בלי עדכון. במסירה ביד: ברגע שהקונה נותן לכם את הקוד בן 4 הספרות.'],
        ['מה מותר למכור?', 'אופנה, סניקרס, תיקים, שעונים, קלפים, צעצועים, אלקטרוניקה, בית… כל דבר חוקי ששייך לכם. זיופים, פריטים מסוכנים או לא חוקיים אסורים.'],
        ['חייבים לעשות לייבים?', 'לא. אפשר גם להעלות פריטים למכירה ישירה: הם נשארים למכירה בין הלייבים.'],
        ['זה אותו חשבון כמו באפליקציה?', 'כן. האימייל והסיסמה שאתם יוצרים כאן הם אלה שמשמשים אתכם באפליקציית ShaPop.']
      ],
      formKicker: 'הרשמה', formTitle: 'פתחו את החנות שלכם', formIntro: 'יוצרים חשבון כאן ומשלימים את החנות באפליקציה. אותו אימייל, אותה סיסמה.'
    },
    buyp: {
      metaTitle: 'להתחיל לקנות — ShaPop', metaDesc: 'עוקבים אחרי מוכרים, מציעים בלייב ומשלמים רק אם זוכים. הכרטיס נשמר רק אם זכיתם, ויש לכם 24 שעות לבדוק את הפריט.',
      kicker: 'לקנות ב־ShaPop', title: 'מציעים <em>בלייב</em>.<br>משלמים רק <em>אם זוכים</em>.',
      lead: 'עוקבים אחרי המוכרים האהובים, רואים את הפריטים בווידאו ומציעים בנגיעה אחת. הכרטיס נשמר רק אם זכיתם במכירה הפומבית.',
      cta: 'יצירת חשבון', ctaMore: 'איך זה עובד',
      stepsKicker: 'איך זה עובד', stepsTitle: 'קונים בלייב ב־5 צעדים',
      steps: [
        ['עוקבים אחרי מוכרים', 'בוחרים קטגוריות ועוקבים אחרי מוכרים שאוהבים: נודיע לכם כשהם עולים ללייב.'],
        ['מציעים בנגיעה אחת', 'צופים בלייב, שואלים בצ׳אט ומציעים. אפשר גם לקבוע סכום מקסימלי ולתת לאפליקציה להציע בשבילכם.'],
        ['הכרטיס נשמר רק אם זכיתם', 'הפסדתם במכירה? לא קורה כלום. זכיתם? הסכום נשמר בכרטיס, ועדיין לא מועבר למוכר.'],
        ['מסירה ביד או בדואר', 'בוחרים להיפגש עם המוכר או לקבל את הפריט בדואר.'],
        ['24 שעות לבדיקה', 'אחרי שקיבלתם את הפריט, מאשרים שהכול תקין או מדווחים על בעיה תוך 24 שעות, עם תמונות.']
      ],
      protKicker: 'הגנה', protTitle: 'הכסף שלכם מוגן',
      prot: [
        ['המוכר מקבל תשלום אחרי שקיבלתם', 'הכסף מגיע למוכר רק כשהפריט אצלכם, או אחרי 24 שעות הבדיקה.'],
        ['יש בעיה? דווחו', 'פריט לא תואם או שלא הגיע: מדווחים מתוך ההזמנה. הצוות שלנו בודק את התמונות ומכריע.'],
        ['תמיד משלמים באפליקציה', 'לעולם אל תשלמו למוכר מחוץ ל־ShaPop: תאבדו את ההגנה.']
      ],
      rulesLink: 'לקריאת כללי הקנייה והמכירה',
      formKicker: 'הרשמה', formTitle: 'יצירת חשבון', formIntro: 'דקה כאן, ואז מתחברים לאפליקציה עם אותו אימייל ואותה סיסמה.'
    },
    form: {
      first: 'שם פרטי', last: 'שם משפחה', firstPh: 'נועה', lastPh: 'כהן', name: 'שם פרטי', email: 'אימייל', emailPh: 'you@example.com', password: 'סיסמה', passwordHint: 'לפחות 8 תווים', show: 'הצגה', hide: 'הסתרה',
      country: 'מדינה', countryPick: 'בחרו מדינה',
      countries: { IL: 'ישראל', FR: 'צרפת', ES: 'ספרד', US: 'ארצות הברית', GB: 'בריטניה', DE: 'גרמניה', IT: 'איטליה', BE: 'בלגיה', CH: 'שווייץ', PT: 'פורטוגל', NL: 'הולנד', CA: 'קנדה', OTHER: 'מדינה אחרת' },
      category: 'קטגוריה ראשית', categoryPick: 'מה תמכרו?',
      categories: { fashion_w: 'אופנת נשים', fashion_m: 'אופנת גברים', sneakers: 'סניקרס', bags: 'תיקים', jewelry: 'תכשיטים', watches: 'שעונים', beauty: 'טיפוח ויופי', electronics: 'אלקטרוניקה', gaming: 'גיימינג', cards: 'קלפי אספנות', toys: 'צעצועים', vintage: 'וינטג׳', home: 'בית', kids: 'ילדים', collect: 'פריטי אספנות', other: 'אחר' },
      exp: 'ניסיון במכירה', expPick: 'בחרו',
      exps: { none: 'אף פעם לא מכרתי אונליין', marketplaces: 'אני מוכר/ת ביד2, eBay או דומה', shop: 'יש לי חנות (אונליין או פיזית)', live: 'אני כבר מוכר/ת בלייב (Whatnot, TikTok…)' },
      acceptRules: 'אני מאשר/ת את <a href="/rules" target="_blank">כללי הקנייה והמכירה</a>',
      acceptTerms: 'אני מאשר/ת את <a href="/terms" target="_blank">תנאי השימוש</a> ואת <a href="/privacy" target="_blank">מדיניות הפרטיות</a>',
      submitSell: 'יצירת חשבון מוכר', submitBuy: 'יצירת חשבון', sending: 'יוצרים את החשבון…',
      errRequired: 'יש למלא את השדה.', errEmail: 'כתובת האימייל לא נראית תקינה.', errPassword: 'לפחות 8 תווים.', errCheck: 'יש לסמן כדי להמשיך.',
      errExists: 'כבר יש לכם חשבון עם האימייל הזה: התחברו ישירות באפליקציית ShaPop.', errRate: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.', errWeak: 'הסיסמה קלה מדי לניחוש. בחרו סיסמה אחרת.',
      errGeneric: 'משהו השתבש. נסו שוב בעוד רגע.', errLoad: 'הטופס לא נטען. בדקו את החיבור וטענו את הדף מחדש.',
      same: 'אותו אימייל ואותה סיסמה באפליקציה.', already: 'כבר יש לכם חשבון? פשוט התחברו באפליקציה.'
    },
    prog: {
      label: 'מה הלאה',
      p1: 'חשבון', p1s: 'כאן, בדקה', p2: 'חנות', p2s: 'באפליקציה: קטגוריה, כתובת להחזרות, תשלומים', p3: 'לייב ראשון', p3s: 'אתם מציגים, הם מציעים',
      b2: 'כרטיס', b2s: 'מוסיפים באפליקציה בזכייה הראשונה', b3: 'הצעה ראשונה', b3s: 'עוקבים אחרי מוכרים ומציעים'
    },
    done: {
      title: 'בדקו את תיבת המייל',
      p: 'שלחנו קישור אישור ל־<b class="email">{email}</b>. לחצו עליו, פתחו את אפליקציית ShaPop והתחברו עם אותו אימייל: החנות שלכם מחכה.',
      pBuy: 'שלחנו קישור אישור ל־<b class="email">{email}</b>. לחצו עליו, פתחו את אפליקציית ShaPop והתחברו עם אותו אימייל: המכירות הפומביות הראשונות מחכות לכם.',
      spam: 'לא הגיע אחרי כמה דקות? בדקו בתיקיית הספאם.', step: 'בוצע'
    },
    welcome: {
      metaTitle: 'החשבון מוכן — ShaPop', metaDesc: 'חשבון ה־ShaPop שלכם אושר. הורידו את האפליקציה והתחברו עם אותו אימייל.',
      kicker: 'ברוכים הבאים', title: 'החשבון שלכם מוכן', p: 'כתובת האימייל אושרה. הורידו את ShaPop והתחברו עם <b>אותו אימייל ואותה סיסמה</b>.',
      hint: 'האפליקציה כבר מותקנת? פתחו אותה ולחצו על „התחברות”.',
      errTitle: 'הקישור הזה פג תוקף', errP: 'קישור אישור עובד פעם אחת ופג אחרי זמן מה. פשוט התחברו באפליקציה עם האימייל שלכם: אם צריך, היא תשלח קישור חדש.'
    }
  });
})();
