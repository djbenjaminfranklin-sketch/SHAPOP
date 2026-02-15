import type { Community } from '../types/database'

// Extended community type with extra display fields
export interface CommunityDisplay extends Community {
  live_count: number
  active_sellers: number
  lives_this_week: number
  unsplash_query: string
}

export type CountryCode = 'IL' | 'FR' | 'ES' | 'US' | 'GB'

export interface CountryInfo {
  code: CountryCode
  flag: string
  name: Record<string, string>
}

export const COUNTRIES: CountryInfo[] = [
  {
    code: 'IL',
    flag: '\uD83C\uDDEE\uD83C\uDDF1',
    name: { fr: 'Israel', en: 'Israel', he: '\u05D9\u05E9\u05E8\u05D0\u05DC', es: 'Israel' },
  },
  {
    code: 'FR',
    flag: '\uD83C\uDDEB\uD83C\uDDF7',
    name: { fr: 'France', en: 'France', he: '\u05E6\u05E8\u05E4\u05EA', es: 'Francia' },
  },
  {
    code: 'ES',
    flag: '\uD83C\uDDEA\uD83C\uDDF8',
    name: { fr: 'Espagne', en: 'Spain', he: '\u05E1\u05E4\u05E8\u05D3', es: 'Espana' },
  },
  {
    code: 'US',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    name: { fr: 'Etats-Unis', en: 'United States', he: '\u05D0\u05E8\u05D4"\u05D1', es: 'Estados Unidos' },
  },
  {
    code: 'GB',
    flag: '\uD83C\uDDEC\uD83C\uDDE7',
    name: { fr: 'Royaume-Uni', en: 'United Kingdom', he: '\u05D1\u05E8\u05D9\u05D8\u05E0\u05D9\u05D4', es: 'Reino Unido' },
  },
]

const communitiesByCountry: Record<CountryCode, CommunityDisplay[]> = {
  IL: [
    {
      id: 'il-comm-1', name: 'Tel Aviv Marketplace', slug: 'tel-aviv-marketplace',
      description: 'Le plus grand marche live de Tel Aviv. Mode, tech, vintage et bien plus.',
      city: 'Tel Aviv', region: 'Gush Dan', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&h=200&fit=crop',
      member_count: 2847, created_by: null, created_at: '2024-01-01',
      live_count: 5, active_sellers: 89, lives_this_week: 34,
      unsplash_query: 'tel-aviv-city',
    },
    {
      id: 'il-comm-2', name: 'Jerusalem Vintage & Art', slug: 'jerusalem-vintage-art',
      description: 'Art, antiquites et trouvailles vintage dans la Ville Sainte.',
      city: 'Jerusalem', region: 'Jerusalem District', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1547483238-2cbf881a559f?w=400&h=200&fit=crop',
      member_count: 1523, created_by: null, created_at: '2024-02-15',
      live_count: 3, active_sellers: 42, lives_this_week: 18,
      unsplash_query: 'jerusalem',
    },
    {
      id: 'il-comm-3', name: 'Haifa Tech Deals', slug: 'haifa-tech-deals',
      description: 'Gadgets, composants et deals tech depuis la capitale du nord.',
      city: 'Haifa', region: 'Haifa District', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1580093806881-f3309eaf498a?w=400&h=200&fit=crop',
      member_count: 986, created_by: null, created_at: '2024-03-10',
      live_count: 2, active_sellers: 31, lives_this_week: 12,
      unsplash_query: 'haifa-israel',
    },
    {
      id: 'il-comm-4', name: 'Netanya Beach Market', slug: 'netanya-beach-market',
      description: 'Mode plage, surf et lifestyle mediterraneen.',
      city: 'Netanya', region: 'Sharon', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=200&fit=crop',
      member_count: 724, created_by: null, created_at: '2024-04-05',
      live_count: 1, active_sellers: 23, lives_this_week: 8,
      unsplash_query: 'beach-market',
    },
    {
      id: 'il-comm-5', name: 'Beer Sheva Bazaar', slug: 'beer-sheva-bazaar',
      description: 'Le bazaar du Negev. Epices, artisanat et bonnes affaires.',
      city: 'Beer Sheva', region: 'Southern', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=200&fit=crop',
      member_count: 612, created_by: null, created_at: '2024-04-20',
      live_count: 2, active_sellers: 19, lives_this_week: 7,
      unsplash_query: 'desert-market',
    },
    {
      id: 'il-comm-6', name: 'Eilat Duty Free', slug: 'eilat-duty-free',
      description: 'Shopping detaxe, mode et accessoires depuis Eilat.',
      city: 'Eilat', region: 'Southern', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400&h=200&fit=crop',
      member_count: 453, created_by: null, created_at: '2024-05-01',
      live_count: 1, active_sellers: 15, lives_this_week: 5,
      unsplash_query: 'eilat',
    },
    {
      id: 'il-comm-7', name: 'Ashdod Fashion', slug: 'ashdod-fashion',
      description: 'Les dernieres tendances mode a prix accessible.',
      city: 'Ashdod', region: 'Southern', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=200&fit=crop',
      member_count: 891, created_by: null, created_at: '2024-03-25',
      live_count: 3, active_sellers: 28, lives_this_week: 14,
      unsplash_query: 'fashion-store',
    },
    {
      id: 'il-comm-8', name: 'Ramat Gan Collectors', slug: 'ramat-gan-collectors',
      description: 'Cartes Pokemon, figurines, comics et objets de collection.',
      city: 'Ramat Gan', region: 'Gush Dan', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=200&fit=crop',
      member_count: 1102, created_by: null, created_at: '2024-02-28',
      live_count: 4, active_sellers: 35, lives_this_week: 21,
      unsplash_query: 'collectibles',
    },
    {
      id: 'il-comm-9', name: 'Herzliya Premium', slug: 'herzliya-premium',
      description: 'Luxe, montres, sacs de marque et mode haut de gamme.',
      city: 'Herzliya', region: 'Sharon', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop',
      member_count: 678, created_by: null, created_at: '2024-05-10',
      live_count: 2, active_sellers: 21, lives_this_week: 9,
      unsplash_query: 'luxury-shopping',
    },
    {
      id: 'il-comm-10', name: 'Rishon LeZion Market', slug: 'rishon-lezion-market',
      description: 'Tout se vend, tout s\'achete. Le marche general de Rishon.',
      city: 'Rishon LeZion', region: 'Gush Dan', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=400&h=200&fit=crop',
      member_count: 934, created_by: null, created_at: '2024-03-15',
      live_count: 3, active_sellers: 37, lives_this_week: 16,
      unsplash_query: 'marketplace',
    },
  ],
  FR: [
    {
      id: 'fr-comm-1', name: 'Paris Marketplace', slug: 'paris-marketplace',
      description: 'Le plus grand marche live de Paris. Mode, luxe, vintage et bien plus.',
      city: 'Paris', region: 'Ile-de-France', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=200&fit=crop',
      member_count: 4215, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 47, lives_this_week: 38,
      unsplash_query: 'paris',
    },
    {
      id: 'fr-comm-2', name: 'Lyon Vintage & Brocante', slug: 'lyon-vintage-brocante',
      description: 'Brocante, vintage et trouvailles uniques dans la capitale des Gaules.',
      city: 'Lyon', region: 'Auvergne-Rhone-Alpes', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 34, lives_this_week: 19,
      unsplash_query: 'lyon-france',
    },
    {
      id: 'fr-comm-3', name: 'Marseille Mode', slug: 'marseille-mode',
      description: 'Mode mediterraneenne, streetwear et accessoires du sud.',
      city: 'Marseille', region: 'Provence-Alpes-Cote d\'Azur', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=200&fit=crop',
      member_count: 1342, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 28, lives_this_week: 14,
      unsplash_query: 'marseille',
    },
    {
      id: 'fr-comm-4', name: 'Bordeaux Deals', slug: 'bordeaux-deals',
      description: 'Les meilleures affaires de Bordeaux. Deco, mode, vin et gastronomie.',
      city: 'Bordeaux', region: 'Nouvelle-Aquitaine', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1565018054357-3a1c7de985e5?w=400&h=200&fit=crop',
      member_count: 987, created_by: null, created_at: '2024-03-15',
      live_count: 1, active_sellers: 22, lives_this_week: 11,
      unsplash_query: 'bordeaux',
    },
    {
      id: 'fr-comm-5', name: 'Nice Bazaar', slug: 'nice-bazaar',
      description: 'Le bazaar de la Cote d\'Azur. Mode, bijoux et lifestyle riviera.',
      city: 'Nice', region: 'Provence-Alpes-Cote d\'Azur', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=400&h=200&fit=crop',
      member_count: 823, created_by: null, created_at: '2024-04-01',
      live_count: 2, active_sellers: 19, lives_this_week: 9,
      unsplash_query: 'nice-france',
    },
    {
      id: 'fr-comm-6', name: 'Toulouse Market', slug: 'toulouse-market',
      description: 'Le marche de la Ville Rose. Artisanat, mode et culture occitane.',
      city: 'Toulouse', region: 'Occitanie', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1579093563888-1e3da2895f2e?w=400&h=200&fit=crop',
      member_count: 756, created_by: null, created_at: '2024-04-15',
      live_count: 1, active_sellers: 17, lives_this_week: 8,
      unsplash_query: 'toulouse',
    },
    {
      id: 'fr-comm-7', name: 'Strasbourg Collectors', slug: 'strasbourg-collectors',
      description: 'Collection, cartes, figurines et objets rares en Alsace.',
      city: 'Strasbourg', region: 'Grand Est', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&h=200&fit=crop',
      member_count: 645, created_by: null, created_at: '2024-05-01',
      live_count: 2, active_sellers: 15, lives_this_week: 7,
      unsplash_query: 'strasbourg',
    },
    {
      id: 'fr-comm-8', name: 'Nantes Fashion', slug: 'nantes-fashion',
      description: 'Tendances mode et createurs independants de l\'Ouest.',
      city: 'Nantes', region: 'Pays de la Loire', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1568684333877-4d39f2b547f4?w=400&h=200&fit=crop',
      member_count: 534, created_by: null, created_at: '2024-05-15',
      live_count: 1, active_sellers: 13, lives_this_week: 6,
      unsplash_query: 'nantes',
    },
  ],
  ES: [
    {
      id: 'es-comm-1', name: 'Madrid Marketplace', slug: 'madrid-marketplace',
      description: 'El mayor mercado live de Madrid. Moda, tech, vintage y mucho mas.',
      city: 'Madrid', region: 'Comunidad de Madrid', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=200&fit=crop',
      member_count: 3156, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 43, lives_this_week: 29,
      unsplash_query: 'madrid',
    },
    {
      id: 'es-comm-2', name: 'Barcelona Vintage', slug: 'barcelona-vintage',
      description: 'Vintage, moda y arte en la capital del Mediterraneo.',
      city: 'Barcelona', region: 'Cataluna', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=200&fit=crop',
      member_count: 2743, created_by: null, created_at: '2024-01-15',
      live_count: 3, active_sellers: 38, lives_this_week: 24,
      unsplash_query: 'barcelona',
    },
    {
      id: 'es-comm-3', name: 'Valencia Deals', slug: 'valencia-deals',
      description: 'Las mejores ofertas de Valencia. Moda, deco y lifestyle mediterraneo.',
      city: 'Valencia', region: 'Comunidad Valenciana', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1599208274072-0bead41b5d7c?w=400&h=200&fit=crop',
      member_count: 1245, created_by: null, created_at: '2024-02-20',
      live_count: 2, active_sellers: 26, lives_this_week: 13,
      unsplash_query: 'valencia-spain',
    },
    {
      id: 'es-comm-4', name: 'Sevilla Bazaar', slug: 'sevilla-bazaar',
      description: 'El bazar del sur. Artesania, flamenco y estilo andaluz.',
      city: 'Sevilla', region: 'Andalucia', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=400&h=200&fit=crop',
      member_count: 1087, created_by: null, created_at: '2024-03-10',
      live_count: 2, active_sellers: 24, lives_this_week: 11,
      unsplash_query: 'sevilla',
    },
    {
      id: 'es-comm-5', name: 'Malaga Beach Market', slug: 'malaga-beach-market',
      description: 'Moda de playa, surf y lifestyle Costa del Sol.',
      city: 'Malaga', region: 'Andalucia', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1564221710304-0b34b3e5cf00?w=400&h=200&fit=crop',
      member_count: 876, created_by: null, created_at: '2024-04-01',
      live_count: 1, active_sellers: 18, lives_this_week: 8,
      unsplash_query: 'malaga',
    },
    {
      id: 'es-comm-6', name: 'Bilbao Collectors', slug: 'bilbao-collectors',
      description: 'Coleccionismo, arte y objetos unicos en el Pais Vasco.',
      city: 'Bilbao', region: 'Pais Vasco', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1533670528457-8ce9e72d98d2?w=400&h=200&fit=crop',
      member_count: 654, created_by: null, created_at: '2024-04-20',
      live_count: 1, active_sellers: 14, lives_this_week: 6,
      unsplash_query: 'bilbao',
    },
  ],
  US: [
    {
      id: 'us-comm-1', name: 'New York Marketplace', slug: 'new-york-marketplace',
      description: 'The biggest live marketplace in NYC. Fashion, tech, vintage and more.',
      city: 'New York', region: 'New York', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=200&fit=crop',
      member_count: 5432, created_by: null, created_at: '2024-01-01',
      live_count: 5, active_sellers: 48, lives_this_week: 42,
      unsplash_query: 'new-york-city',
    },
    {
      id: 'us-comm-2', name: 'LA Vintage', slug: 'la-vintage',
      description: 'Vintage, streetwear and celebrity closet finds from Los Angeles.',
      city: 'Los Angeles', region: 'California', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=400&h=200&fit=crop',
      member_count: 3876, created_by: null, created_at: '2024-01-15',
      live_count: 4, active_sellers: 41, lives_this_week: 35,
      unsplash_query: 'los-angeles',
    },
    {
      id: 'us-comm-3', name: 'Miami Deals', slug: 'miami-deals',
      description: 'Beach fashion, designer finds and luxury deals from Miami.',
      city: 'Miami', region: 'Florida', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=400&h=200&fit=crop',
      member_count: 2134, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 33, lives_this_week: 22,
      unsplash_query: 'miami',
    },
    {
      id: 'us-comm-4', name: 'Chicago Market', slug: 'chicago-market',
      description: 'The Windy City marketplace. Sports memorabilia, fashion and collectibles.',
      city: 'Chicago', region: 'Illinois', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=400&h=200&fit=crop',
      member_count: 1567, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 27, lives_this_week: 16,
      unsplash_query: 'chicago',
    },
    {
      id: 'us-comm-5', name: 'SF Tech Deals', slug: 'sf-tech-deals',
      description: 'Tech gadgets, startup merch and Silicon Valley finds.',
      city: 'San Francisco', region: 'California', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=200&fit=crop',
      member_count: 1823, created_by: null, created_at: '2024-03-15',
      live_count: 3, active_sellers: 29, lives_this_week: 19,
      unsplash_query: 'san-francisco',
    },
    {
      id: 'us-comm-6', name: 'Austin Collectors', slug: 'austin-collectors',
      description: 'Music memorabilia, vinyl, collectibles and Keep Austin Weird finds.',
      city: 'Austin', region: 'Texas', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=400&h=200&fit=crop',
      member_count: 978, created_by: null, created_at: '2024-04-01',
      live_count: 2, active_sellers: 21, lives_this_week: 12,
      unsplash_query: 'austin-texas',
    },
  ],
  GB: [
    {
      id: 'gb-comm-1', name: 'London Marketplace', slug: 'london-marketplace',
      description: 'The biggest live marketplace in London. Fashion, vintage, luxury and more.',
      city: 'London', region: 'Greater London', country: 'GB',
      image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=200&fit=crop',
      member_count: 4567, created_by: null, created_at: '2024-01-01',
      live_count: 5, active_sellers: 46, lives_this_week: 37,
      unsplash_query: 'london',
    },
    {
      id: 'gb-comm-2', name: 'Manchester Vintage', slug: 'manchester-vintage',
      description: 'Vintage fashion, Northern Quarter finds and indie brands.',
      city: 'Manchester', region: 'Greater Manchester', country: 'GB',
      image_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aede?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 32, lives_this_week: 20,
      unsplash_query: 'manchester',
    },
    {
      id: 'gb-comm-3', name: 'Birmingham Deals', slug: 'birmingham-deals',
      description: 'The best deals from the Jewellery Quarter and beyond.',
      city: 'Birmingham', region: 'West Midlands', country: 'GB',
      image_url: 'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=400&h=200&fit=crop',
      member_count: 1234, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 24, lives_this_week: 13,
      unsplash_query: 'birmingham-uk',
    },
    {
      id: 'gb-comm-4', name: 'Edinburgh Collectors', slug: 'edinburgh-collectors',
      description: 'Antiques, rare books, whisky memorabilia and Scottish treasures.',
      city: 'Edinburgh', region: 'Scotland', country: 'GB',
      image_url: 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=400&h=200&fit=crop',
      member_count: 876, created_by: null, created_at: '2024-04-01',
      live_count: 1, active_sellers: 18, lives_this_week: 9,
      unsplash_query: 'edinburgh',
    },
  ],
}

// Get all communities across all countries (flat list)
export function getAllCommunities(): CommunityDisplay[] {
  return Object.values(communitiesByCountry).flat()
}

// Get communities for a specific country
export function getCommunitiesByCountry(code: CountryCode): CommunityDisplay[] {
  return communitiesByCountry[code] || []
}

// Find a community by ID across all countries
export function findCommunityById(id: string): CommunityDisplay | undefined {
  for (const communities of Object.values(communitiesByCountry)) {
    const found = communities.find(c => c.id === id)
    if (found) return found
  }
  // Backward compatibility: check for old IDs (comm-1 -> il-comm-1)
  if (id.startsWith('comm-')) {
    const newId = 'il-' + id
    for (const communities of Object.values(communitiesByCountry)) {
      const found = communities.find(c => c.id === newId)
      if (found) return found
    }
  }
  return undefined
}

// Get country info by code
export function getCountryInfo(code: CountryCode): CountryInfo | undefined {
  return COUNTRIES.find(c => c.code === code)
}

// Detect user country from language / localStorage
export function detectUserCountry(): CountryCode {
  // 1. Check localStorage first
  const saved = localStorage.getItem('shapop_country')
  if (saved && saved in communitiesByCountry) {
    return saved as CountryCode
  }

  // 2. Check app language setting
  const appLang = localStorage.getItem('shapop_lang')
  if (appLang) {
    const langToCountry: Record<string, CountryCode> = {
      he: 'IL',
      fr: 'FR',
      es: 'ES',
      en: 'US',
    }
    if (langToCountry[appLang]) {
      return langToCountry[appLang]
    }
  }

  // 3. Check browser language
  const browserLang = navigator.language?.toLowerCase() || ''
  if (browserLang.startsWith('he')) return 'IL'
  if (browserLang.startsWith('fr')) return 'FR'
  if (browserLang.startsWith('es')) return 'ES'
  if (browserLang === 'en-gb') return 'GB'
  if (browserLang.startsWith('en')) return 'US'

  // 4. Default to FR
  return 'FR'
}

// Get the full country name for a country code, with the country field in community data
export function getCountryDisplayName(code: string, lang: string): string {
  const countryNames: Record<string, Record<string, string>> = {
    IL: { fr: 'Israel', en: 'Israel', he: '\u05D9\u05E9\u05E8\u05D0\u05DC', es: 'Israel' },
    FR: { fr: 'France', en: 'France', he: '\u05E6\u05E8\u05E4\u05EA', es: 'Francia' },
    ES: { fr: 'Espagne', en: 'Spain', he: '\u05E1\u05E4\u05E8\u05D3', es: 'Espana' },
    US: { fr: 'Etats-Unis', en: 'United States', he: '\u05D0\u05E8\u05D4"\u05D1', es: 'Estados Unidos' },
    GB: { fr: 'Royaume-Uni', en: 'United Kingdom', he: '\u05D1\u05E8\u05D9\u05D8\u05E0\u05D9\u05D4', es: 'Reino Unido' },
  }
  return countryNames[code]?.[lang] || countryNames[code]?.en || code
}
