// Sub-categories per main category
export const subCategories: Record<string, string[]> = {
  fashion_w: ['Robes', 'Tops', 'Pantalons', 'Jupes', 'Manteaux', 'Lingerie', 'Maillots de bain', 'Accessoires', 'Grande taille', 'Maternite'],
  fashion_m: ['T-shirts', 'Chemises', 'Pantalons', 'Jeans', 'Vestes', 'Costumes', 'Streetwear', 'Sport', 'Sous-vetements', 'Grande taille'],
  sneakers: ['Nike', 'Adidas', 'Jordan', 'New Balance', 'Puma', 'Yeezy', 'Asics', 'Converse', 'Vans', 'Reebok', 'Salomon', 'Autre'],
  bags: ['Sacs a main', 'Sacs a dos', 'Pochettes', 'Cabas', 'Bananes', 'Valises', 'Porte-monnaie', 'Luxe', 'Vintage'],
  jewelry: ['Bagues', 'Colliers', 'Bracelets', 'Boucles d\'oreilles', 'Montres bijoux', 'Piercing', 'Fait main', 'Luxe', 'Fantaisie'],
  watches: ['Luxe', 'Sport', 'Connectees', 'Vintage', 'Automatiques', 'Quartz', 'Bracelets', 'Accessoires', 'Pieces detachees'],
  beauty: ['Maquillage', 'Soins visage', 'Soins corps', 'Parfums', 'Cheveux', 'Ongles', 'Bio/Naturel', 'Coffrets', 'Outils'],
  electronics: ['Smartphones', 'Ordinateurs', 'Tablettes', 'Audio', 'Photo/Video', 'TV', 'Objets connectes', 'Composants', 'Accessoires'],
  gaming: ['Consoles', 'Jeux video', 'PC Gaming', 'Accessoires', 'Retro gaming', 'Figurines', 'Cartes', 'Merchandise', 'Streaming'],
  cards: ['Pokemon', 'Yu-Gi-Oh', 'Magic', 'Sports', 'Dragon Ball', 'One Piece', 'Panini', 'Boosters', 'PSA/Gradees', 'Lots'],
  toys: ['Figurines', 'LEGO', 'Peluches', 'Jeux de societe', 'Puzzles', 'Vehicules', 'Poupees', 'Educatifs', 'Retro', 'Collector'],
  vintage: ['Vetements', 'Accessoires', 'Decoration', 'Vaisselle', 'Affiches', 'Vinyles', 'Livres anciens', 'Bijoux', 'Mobilier'],
  art: ['Peinture', 'Dessin', 'Sculpture', 'Photographie', 'Art numerique', 'Street art', 'Estampes', 'Art contemporain', 'Materiaux'],
  furniture: ['Salon', 'Chambre', 'Bureau', 'Cuisine', 'Salle de bain', 'Rangement', 'Exterieur', 'Vintage', 'Sur mesure'],
  home: ['Decoration', 'Linge de maison', 'Cuisine', 'Bougies', 'Cadres', 'Plantes', 'Rangement', 'Tapis', 'Luminaires'],
  sports: ['Football', 'Basketball', 'Tennis', 'Running', 'Cyclisme', 'Natation', 'Ski', 'Golf', 'Arts martiaux', 'Autre'],
  fitness: ['Equipement', 'Vetements', 'Supplements', 'Yoga', 'Musculation', 'Cardio', 'Accessoires', 'Trackers', 'Tapis'],
  music: ['Guitares', 'Claviers', 'Batteries', 'DJ', 'Vinyles', 'CD', 'Partitions', 'Studio', 'Accessoires', 'Merch'],
  books: ['Romans', 'BD/Manga', 'Sciences', 'Histoire', 'Cuisine', 'Developpement personnel', 'Enfants', 'Scolaire', 'Collector'],
  kids: ['Vetements', 'Jouets', 'Puericulture', 'Ecole', 'Deguisements', 'Livres', 'Jeux educatifs', 'Bebe', 'Ados'],
  pets: ['Chiens', 'Chats', 'Oiseaux', 'Poissons', 'Rongeurs', 'Reptiles', 'Accessoires', 'Alimentation', 'Toilettage'],
  auto: ['Pieces auto', 'Pieces moto', 'Accessoires', 'Tuning', 'Outillage', 'Entretien', 'GPS/Electronique', 'Equipement pilote'],
  garden: ['Plantes', 'Outils', 'Mobilier exterieur', 'Arrosage', 'Decoration', 'Potager', 'Eclairage', 'Piscine', 'Barbecue'],
  food: ['Epicerie fine', 'Chocolat', 'The/Cafe', 'Epices', 'Bio', 'Vins', 'Ustensiles', 'Coffrets', 'Fait maison'],
  handmade: ['Bijoux', 'Vetements', 'Decoration', 'Bougies', 'Savons', 'Ceramique', 'Tricot', 'Cuir', 'Bois', 'Papeterie'],
  collect: ['Timbres', 'Pieces', 'Figurines', 'Affiches', 'Memorabilia', 'Mineraux', 'Militaria', 'Capsules', 'Pins', 'Autre'],
  photo: ['Appareils', 'Objectifs', 'Trepied', 'Eclairage', 'Sacs', 'Filtres', 'Drones', 'Impression', 'Vintage'],
  tools: ['Outillage electrique', 'Outillage a main', 'Peinture', 'Plomberie', 'Electricite', 'Menuiserie', 'Jardin', 'Securite'],
}

// Where do you currently sell?
export const sellingLocations = [
  { id: 'website', fr: 'Site personnel', en: 'Personal website', he: 'אתר אישי', es: 'Sitio web personal' },
  { id: 'store', fr: 'Boutique physique', en: 'Physical store', he: 'חנות פיזית', es: 'Tienda fisica' },
  { id: 'platforms', fr: 'Plateformes en ligne', en: 'Online platforms', he: 'פלטפורמות אונליין', es: 'Plataformas online' },
  { id: 'social', fr: 'Reseaux sociaux', en: 'Social media', he: 'רשתות חברתיות', es: 'Redes sociales' },
  { id: 'nowhere', fr: 'Nulle part encore', en: 'Nowhere yet', he: 'עדיין לא מוכר', es: 'En ningun lugar todavia' },
]

// Platforms
export const platforms = [
  { id: 'ebay', label: 'eBay' },
  { id: 'facebook', label: 'Facebook Marketplace' },
  { id: 'poshmark', label: 'Poshmark' },
  { id: 'mercari', label: 'Mercari' },
  { id: 'depop', label: 'Depop' },
  { id: 'etsy', label: 'Etsy', hasUrl: true },
  { id: 'offerup', label: 'OfferUp' },
  { id: 'tcgplayer', label: 'TCG Player' },
  { id: 'other', label: 'Other' },
]

// Monthly revenue ranges
export const revenueRanges = [
  { id: '0', fr: '0$ (je debute)', en: '$0 (just starting)', he: '$0 (רק מתחיל)', es: '$0 (recien empezando)' },
  { id: '1-500', fr: '1$ - 500$', en: '$1 - $500', he: '$1 - $500', es: '$1 - $500' },
  { id: '500-2000', fr: '500$ - 2 000$', en: '$500 - $2,000', he: '$500 - $2,000', es: '$500 - $2,000' },
  { id: '2000-5000', fr: '2 000$ - 5 000$', en: '$2,000 - $5,000', he: '$2,000 - $5,000', es: '$2,000 - $5,000' },
  { id: '5000-10000', fr: '5 000$ - 10 000$', en: '$5,000 - $10,000', he: '$5,000 - $10,000', es: '$5,000 - $10,000' },
  { id: '10000-50000', fr: '10 000$ - 50 000$', en: '$10,000 - $50,000', he: '$10,000 - $50,000', es: '$10,000 - $50,000' },
  { id: '50000+', fr: '50 000$+', en: '$50,000+', he: '$50,000+', es: '$50,000+' },
]

// Team size options
export const teamSizes = [
  { id: 'solo', fr: 'Juste moi', en: 'Just me', he: 'רק אני', es: 'Solo yo' },
  { id: '2-5', fr: '2-5 personnes', en: '2-5 people', he: '2-5 אנשים', es: '2-5 personas' },
  { id: '6-20', fr: '6-20 personnes', en: '6-20 people', he: '6-20 אנשים', es: '6-20 personas' },
  { id: '20+', fr: '20+ personnes', en: '20+ people', he: '20+ אנשים', es: '20+ personas' },
]

// Weekly live hours
export const weeklyHours = [
  { id: '0', fr: 'Pas encore', en: 'None yet', he: 'עדיין לא', es: 'Ninguna todavia' },
  { id: '1-5', fr: '1-5 heures', en: '1-5 hours', he: '1-5 שעות', es: '1-5 horas' },
  { id: '5-10', fr: '5-10 heures', en: '5-10 hours', he: '5-10 שעות', es: '5-10 horas' },
  { id: '10-20', fr: '10-20 heures', en: '10-20 hours', he: '10-20 שעות', es: '10-20 horas' },
  { id: '20-40', fr: '20-40 heures', en: '20-40 hours', he: '20-40 שעות', es: '20-40 horas' },
  { id: '40+', fr: '40+ heures', en: '40+ hours', he: '40+ שעות', es: '40+ horas' },
]

// Live format types
export const liveFormats = [
  { id: 'auction', fr: 'Encheres', en: 'Auction', he: 'מכירה פומבית', es: 'Subasta' },
  { id: 'fixed', fr: 'Prix fixe', en: 'Fixed price', he: 'מחיר קבוע', es: 'Precio fijo' },
  { id: 'mystery', fr: 'Boite mystere', en: 'Mystery box', he: 'קופסת הפתעה', es: 'Caja misteriosa' },
  { id: 'rip_n_ship', fr: 'Ouverture & envoi', en: 'Rip & Ship', he: 'פתיחה ומשלוח', es: 'Abrir y enviar' },
  { id: 'showcase', fr: 'Vitrine produits', en: 'Product showcase', he: 'תצוגת מוצרים', es: 'Escaparate' },
  { id: 'bundle', fr: 'Lots & packs', en: 'Bundle deals', he: 'חבילות', es: 'Ofertas en lote' },
]

// Bank account options
export const bankOptions = [
  { id: 'stripe', fr: 'Connecter avec Stripe', en: 'Connect with Stripe', he: 'חבר עם Stripe', es: 'Conectar con Stripe' },
  { id: 'paypal', fr: 'Connecter avec PayPal', en: 'Connect with PayPal', he: 'חבר עם PayPal', es: 'Conectar con PayPal' },
  { id: 'later', fr: 'Configurer plus tard', en: 'Set up later', he: 'הגדר מאוחר יותר', es: 'Configurar mas tarde' },
]
