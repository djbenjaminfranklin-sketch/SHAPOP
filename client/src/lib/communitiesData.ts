import type { Community } from '../types/database'

// Extended community type with extra display fields
export interface CommunityDisplay extends Community {
  live_count: number
  active_sellers: number
  lives_this_week: number
  unsplash_query: string
}

export type CountryCode = 'FR' | 'ES' | 'US' | 'GB' | 'BR' | 'JP' | 'DE' | 'IT' | 'IL' | 'PT' | 'MA' | 'CA'

export interface CountryInfo {
  code: CountryCode
  flag: string
  name: Record<string, string>
}

export const COUNTRIES: CountryInfo[] = [
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
  {
    code: 'BR',
    flag: '\uD83C\uDDE7\uD83C\uDDF7',
    name: { fr: 'Bresil', en: 'Brazil', he: '\u05D1\u05E8\u05D6\u05D9\u05DC', es: 'Brasil' },
  },
  {
    code: 'JP',
    flag: '\uD83C\uDDEF\uD83C\uDDF5',
    name: { fr: 'Japon', en: 'Japan', he: '\u05D9\u05E4\u05DF', es: 'Japon' },
  },
  {
    code: 'DE',
    flag: '\uD83C\uDDE9\uD83C\uDDEA',
    name: { fr: 'Allemagne', en: 'Germany', he: '\u05D2\u05E8\u05DE\u05E0\u05D9\u05D4', es: 'Alemania' },
  },
  {
    code: 'IT',
    flag: '\uD83C\uDDEE\uD83C\uDDF9',
    name: { fr: 'Italie', en: 'Italy', he: '\u05D0\u05D9\u05D8\u05DC\u05D9\u05D4', es: 'Italia' },
  },
  {
    code: 'IL',
    flag: '\uD83C\uDDEE\uD83C\uDDF1',
    name: { fr: 'Israel', en: 'Israel', he: '\u05D9\u05E9\u05E8\u05D0\u05DC', es: 'Israel' },
  },
  {
    code: 'PT',
    flag: '\uD83C\uDDF5\uD83C\uDDF9',
    name: { fr: 'Portugal', en: 'Portugal', he: '\u05E4\u05D5\u05E8\u05D8\u05D5\u05D2\u05DC', es: 'Portugal' },
  },
  {
    code: 'MA',
    flag: '\uD83C\uDDF2\uD83C\uDDE6',
    name: { fr: 'Maroc', en: 'Morocco', he: '\u05DE\u05E8\u05D5\u05E7\u05D5', es: 'Marruecos' },
  },
  {
    code: 'CA',
    flag: '\uD83C\uDDE8\uD83C\uDDE6',
    name: { fr: 'Canada', en: 'Canada', he: '\u05E7\u05E0\u05D3\u05D4', es: 'Canada' },
  },
]

const communitiesByCountry: Record<CountryCode, CommunityDisplay[]> = {
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
  BR: [
    {
      id: 'br-comm-1', name: 'Sao Paulo Marketplace', slug: 'sao-paulo-marketplace',
      description: 'O maior mercado live de SP. Moda, tech, vintage e muito mais.',
      city: 'Sao Paulo', region: 'Sao Paulo', country: 'BR',
      image_url: 'https://images.unsplash.com/photo-1543059080-87f29fbfefea?w=400&h=200&fit=crop',
      member_count: 4120, created_by: null, created_at: '2024-01-01',
      live_count: 5, active_sellers: 52, lives_this_week: 38,
      unsplash_query: 'sao-paulo',
    },
    {
      id: 'br-comm-2', name: 'Rio Fashion', slug: 'rio-fashion',
      description: 'Moda carioca, praia e lifestyle do Rio de Janeiro.',
      city: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'BR',
      image_url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=200&fit=crop',
      member_count: 3245, created_by: null, created_at: '2024-01-15',
      live_count: 4, active_sellers: 41, lives_this_week: 28,
      unsplash_query: 'rio-de-janeiro',
    },
    {
      id: 'br-comm-3', name: 'Brasilia Deals', slug: 'brasilia-deals',
      description: 'As melhores ofertas da capital federal.',
      city: 'Brasilia', region: 'Distrito Federal', country: 'BR',
      image_url: 'https://images.unsplash.com/photo-1553354994-e24e0da07ef7?w=400&h=200&fit=crop',
      member_count: 1234, created_by: null, created_at: '2024-02-10',
      live_count: 2, active_sellers: 22, lives_this_week: 12,
      unsplash_query: 'brasilia',
    },
    {
      id: 'br-comm-4', name: 'Salvador Vintage', slug: 'salvador-vintage',
      description: 'Artesanato, cultura baiana e achados unicos.',
      city: 'Salvador', region: 'Bahia', country: 'BR',
      image_url: 'https://images.unsplash.com/photo-1551887196-72e32bfc7bf3?w=400&h=200&fit=crop',
      member_count: 987, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 19, lives_this_week: 9,
      unsplash_query: 'salvador-brazil',
    },
    {
      id: 'br-comm-5', name: 'Belo Horizonte Market', slug: 'bh-market',
      description: 'Moda mineira, artesanato e muito mais de BH.',
      city: 'Belo Horizonte', region: 'Minas Gerais', country: 'BR',
      image_url: 'https://images.unsplash.com/photo-1598301257942-e6bde1d2149b?w=400&h=200&fit=crop',
      member_count: 876, created_by: null, created_at: '2024-03-15',
      live_count: 1, active_sellers: 16, lives_this_week: 7,
      unsplash_query: 'belo-horizonte',
    },
  ],
  JP: [
    {
      id: 'jp-comm-1', name: 'Tokyo Marketplace', slug: 'tokyo-marketplace',
      description: 'Fashion, anime goods, tech and vintage finds from Tokyo.',
      city: 'Tokyo', region: 'Kanto', country: 'JP',
      image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=200&fit=crop',
      member_count: 5678, created_by: null, created_at: '2024-01-01',
      live_count: 6, active_sellers: 58, lives_this_week: 45,
      unsplash_query: 'tokyo',
    },
    {
      id: 'jp-comm-2', name: 'Osaka Street Market', slug: 'osaka-street-market',
      description: 'Streetwear, vintage and collectibles from Osaka.',
      city: 'Osaka', region: 'Kansai', country: 'JP',
      image_url: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=200&fit=crop',
      member_count: 3456, created_by: null, created_at: '2024-01-15',
      live_count: 4, active_sellers: 38, lives_this_week: 29,
      unsplash_query: 'osaka',
    },
    {
      id: 'jp-comm-3', name: 'Kyoto Antiques', slug: 'kyoto-antiques',
      description: 'Traditional crafts, ceramics and antiques from Kyoto.',
      city: 'Kyoto', region: 'Kansai', country: 'JP',
      image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=200&fit=crop',
      member_count: 2134, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 27, lives_this_week: 18,
      unsplash_query: 'kyoto',
    },
    {
      id: 'jp-comm-4', name: 'Yokohama Deals', slug: 'yokohama-deals',
      description: 'Great deals from Yokohama port area.',
      city: 'Yokohama', region: 'Kanto', country: 'JP',
      image_url: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=400&h=200&fit=crop',
      member_count: 1567, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 21, lives_this_week: 12,
      unsplash_query: 'yokohama',
    },
  ],
  DE: [
    {
      id: 'de-comm-1', name: 'Berlin Marketplace', slug: 'berlin-marketplace',
      description: 'Der grosste Live-Marktplatz Berlins. Mode, Vintage, Tech und mehr.',
      city: 'Berlin', region: 'Berlin', country: 'DE',
      image_url: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=200&fit=crop',
      member_count: 3876, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 43, lives_this_week: 31,
      unsplash_query: 'berlin',
    },
    {
      id: 'de-comm-2', name: 'Munich Vintage', slug: 'munich-vintage',
      description: 'Vintage, Tracht und Designerfunde aus Munchen.',
      city: 'Munich', region: 'Bayern', country: 'DE',
      image_url: 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&h=200&fit=crop',
      member_count: 2345, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 32, lives_this_week: 22,
      unsplash_query: 'munich',
    },
    {
      id: 'de-comm-3', name: 'Hamburg Deals', slug: 'hamburg-deals',
      description: 'Die besten Deals aus der Hansestadt.',
      city: 'Hamburg', region: 'Hamburg', country: 'DE',
      image_url: 'https://images.unsplash.com/photo-1562930024-4aca28e91b10?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 26, lives_this_week: 16,
      unsplash_query: 'hamburg',
    },
    {
      id: 'de-comm-4', name: 'Frankfurt Market', slug: 'frankfurt-market',
      description: 'Mode, Schmuck und Lifestyle aus Frankfurt am Main.',
      city: 'Frankfurt', region: 'Hessen', country: 'DE',
      image_url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=200&fit=crop',
      member_count: 1456, created_by: null, created_at: '2024-03-15',
      live_count: 2, active_sellers: 22, lives_this_week: 13,
      unsplash_query: 'frankfurt',
    },
  ],
  IT: [
    {
      id: 'it-comm-1', name: 'Roma Marketplace', slug: 'roma-marketplace',
      description: 'Il piu grande mercato live di Roma. Moda, vintage, lusso e altro.',
      city: 'Roma', region: 'Lazio', country: 'IT',
      image_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=200&fit=crop',
      member_count: 3567, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 41, lives_this_week: 29,
      unsplash_query: 'rome',
    },
    {
      id: 'it-comm-2', name: 'Milano Fashion', slug: 'milano-fashion',
      description: 'Alta moda, design e vintage dalla capitale della moda.',
      city: 'Milano', region: 'Lombardia', country: 'IT',
      image_url: 'https://images.unsplash.com/photo-1520440229-6469a149ac59?w=400&h=200&fit=crop',
      member_count: 4123, created_by: null, created_at: '2024-01-15',
      live_count: 5, active_sellers: 48, lives_this_week: 36,
      unsplash_query: 'milan',
    },
    {
      id: 'it-comm-3', name: 'Napoli Vintage', slug: 'napoli-vintage',
      description: 'Artigianato, vintage e stile napoletano.',
      city: 'Napoli', region: 'Campania', country: 'IT',
      image_url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 28, lives_this_week: 18,
      unsplash_query: 'naples-italy',
    },
    {
      id: 'it-comm-4', name: 'Firenze Antiques', slug: 'firenze-antiques',
      description: 'Antiquariato, arte e pelle fiorentina.',
      city: 'Firenze', region: 'Toscana', country: 'IT',
      image_url: 'https://images.unsplash.com/photo-1543429257-3eb0b65d9c58?w=400&h=200&fit=crop',
      member_count: 1345, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 23, lives_this_week: 14,
      unsplash_query: 'florence',
    },
  ],
  IL: [
    {
      id: 'il-comm-1', name: 'Tel Aviv Marketplace', slug: 'tel-aviv-marketplace',
      description: 'The biggest live marketplace in Tel Aviv. Fashion, tech, vintage and more.',
      city: 'Tel Aviv', region: 'Tel Aviv District', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1544991875-5dc1b05f607d?w=400&h=200&fit=crop',
      member_count: 3456, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 39, lives_this_week: 27,
      unsplash_query: 'tel-aviv',
    },
    {
      id: 'il-comm-2', name: 'Jerusalem Antiques', slug: 'jerusalem-antiques',
      description: 'Antiques, Judaica, art and unique finds from Jerusalem.',
      city: 'Jerusalem', region: 'Jerusalem District', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=400&h=200&fit=crop',
      member_count: 2134, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 28, lives_this_week: 18,
      unsplash_query: 'jerusalem',
    },
    {
      id: 'il-comm-3', name: 'Haifa Market', slug: 'haifa-market',
      description: 'Fashion, art and lifestyle from the port city.',
      city: 'Haifa', region: 'Haifa District', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=200&fit=crop',
      member_count: 1234, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 19, lives_this_week: 11,
      unsplash_query: 'haifa',
    },
  ],
  PT: [
    {
      id: 'pt-comm-1', name: 'Lisboa Marketplace', slug: 'lisboa-marketplace',
      description: 'O maior mercado live de Lisboa. Moda, vintage, azulejos e mais.',
      city: 'Lisboa', region: 'Lisboa', country: 'PT',
      image_url: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=200&fit=crop',
      member_count: 2345, created_by: null, created_at: '2024-01-01',
      live_count: 3, active_sellers: 32, lives_this_week: 21,
      unsplash_query: 'lisbon',
    },
    {
      id: 'pt-comm-2', name: 'Porto Vintage', slug: 'porto-vintage',
      description: 'Vintage, artesanato e estilo do norte de Portugal.',
      city: 'Porto', region: 'Porto', country: 'PT',
      image_url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=200&fit=crop',
      member_count: 1567, created_by: null, created_at: '2024-02-10',
      live_count: 2, active_sellers: 24, lives_this_week: 14,
      unsplash_query: 'porto',
    },
    {
      id: 'pt-comm-3', name: 'Faro Beach Market', slug: 'faro-beach-market',
      description: 'Moda de praia, surf e lifestyle do Algarve.',
      city: 'Faro', region: 'Algarve', country: 'PT',
      image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=200&fit=crop',
      member_count: 876, created_by: null, created_at: '2024-03-01',
      live_count: 1, active_sellers: 15, lives_this_week: 8,
      unsplash_query: 'algarve',
    },
  ],
  MA: [
    {
      id: 'ma-comm-1', name: 'Casablanca Marketplace', slug: 'casablanca-marketplace',
      description: 'Le plus grand marche live de Casablanca. Mode, artisanat et plus.',
      city: 'Casablanca', region: 'Casablanca-Settat', country: 'MA',
      image_url: 'https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?w=400&h=200&fit=crop',
      member_count: 2345, created_by: null, created_at: '2024-01-01',
      live_count: 3, active_sellers: 31, lives_this_week: 19,
      unsplash_query: 'casablanca',
    },
    {
      id: 'ma-comm-2', name: 'Marrakech Souk', slug: 'marrakech-souk',
      description: 'Artisanat, tapis, bijoux et trouvailles du souk.',
      city: 'Marrakech', region: 'Marrakech-Safi', country: 'MA',
      image_url: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 2, active_sellers: 26, lives_this_week: 15,
      unsplash_query: 'marrakech',
    },
    {
      id: 'ma-comm-3', name: 'Rabat Market', slug: 'rabat-market',
      description: 'Mode, artisanat et lifestyle de la capitale.',
      city: 'Rabat', region: 'Rabat-Sale-Kenitra', country: 'MA',
      image_url: 'https://images.unsplash.com/photo-1569587112025-0d460e81a126?w=400&h=200&fit=crop',
      member_count: 1234, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 21, lives_this_week: 11,
      unsplash_query: 'rabat',
    },
    {
      id: 'ma-comm-4', name: 'Tanger Bazaar', slug: 'tanger-bazaar',
      description: 'Mode, artisanat et style mediterraneen de Tanger.',
      city: 'Tanger', region: 'Tanger-Tetouan-Al Hoceima', country: 'MA',
      image_url: 'https://images.unsplash.com/photo-1553522991-71439aa5765b?w=400&h=200&fit=crop',
      member_count: 987, created_by: null, created_at: '2024-03-15',
      live_count: 1, active_sellers: 17, lives_this_week: 8,
      unsplash_query: 'tangier',
    },
  ],
  CA: [
    {
      id: 'ca-comm-1', name: 'Toronto Marketplace', slug: 'toronto-marketplace',
      description: 'The biggest live marketplace in Toronto. Fashion, tech, vintage and more.',
      city: 'Toronto', region: 'Ontario', country: 'CA',
      image_url: 'https://images.unsplash.com/photo-1517090504332-af4e28e407e0?w=400&h=200&fit=crop',
      member_count: 3456, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 41, lives_this_week: 29,
      unsplash_query: 'toronto',
    },
    {
      id: 'ca-comm-2', name: 'Montreal Vintage', slug: 'montreal-vintage',
      description: 'Vintage, mode et trouvailles uniques de Montreal.',
      city: 'Montreal', region: 'Quebec', country: 'CA',
      image_url: 'https://images.unsplash.com/photo-1519178614-68673b201f36?w=400&h=200&fit=crop',
      member_count: 2567, created_by: null, created_at: '2024-01-15',
      live_count: 3, active_sellers: 34, lives_this_week: 22,
      unsplash_query: 'montreal',
    },
    {
      id: 'ca-comm-3', name: 'Vancouver Deals', slug: 'vancouver-deals',
      description: 'West Coast finds, outdoor gear and Asian vintage.',
      city: 'Vancouver', region: 'British Columbia', country: 'CA',
      image_url: 'https://images.unsplash.com/photo-1559511260-66a68e7e5e8c?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 2, active_sellers: 27, lives_this_week: 16,
      unsplash_query: 'vancouver',
    },
    {
      id: 'ca-comm-4', name: 'Calgary Market', slug: 'calgary-market',
      description: 'Western Canadian finds, vintage and collectibles.',
      city: 'Calgary', region: 'Alberta', country: 'CA',
      image_url: 'https://images.unsplash.com/photo-1561134643-668dafae01a4?w=400&h=200&fit=crop',
      member_count: 1234, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 21, lives_this_week: 12,
      unsplash_query: 'calgary',
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
  return undefined
}

// Get country info by code
export function getCountryInfo(code: CountryCode): CountryInfo | undefined {
  return COUNTRIES.find(c => c.code === code)
}

// Detect user country from GPS cache / localStorage / language
export function detectUserCountry(): CountryCode {
  // 1. Check GPS-detected country first (set by geolocation.ts)
  const gpsCountry = localStorage.getItem('shapop_gps_country')
  if (gpsCountry && gpsCountry in communitiesByCountry) {
    return gpsCountry as CountryCode
  }

  // 2. Check manually selected country
  const saved = localStorage.getItem('shapop_country')
  if (saved && saved in communitiesByCountry) {
    return saved as CountryCode
  }

  // 3. Check app language setting
  const appLang = localStorage.getItem('shapop_lang')
  if (appLang) {
    const langToCountry: Record<string, CountryCode> = {
      he: 'IL',
      fr: 'FR',
      es: 'ES',
      en: 'US',
      pt: 'PT',
      ja: 'JP',
      de: 'DE',
      it: 'IT',
      ar: 'MA',
    }
    if (langToCountry[appLang]) {
      return langToCountry[appLang]
    }
  }

  // 4. Check browser language
  const browserLang = navigator.language?.toLowerCase() || ''
  if (browserLang.startsWith('he')) return 'IL'
  if (browserLang.startsWith('fr')) return 'FR'
  if (browserLang.startsWith('es')) return 'ES'
  if (browserLang.startsWith('pt')) return 'PT'
  if (browserLang.startsWith('ja')) return 'JP'
  if (browserLang.startsWith('de')) return 'DE'
  if (browserLang.startsWith('it')) return 'IT'
  if (browserLang.startsWith('ar')) return 'MA'
  if (browserLang === 'en-gb') return 'GB'
  if (browserLang === 'en-ca') return 'CA'
  if (browserLang.startsWith('en')) return 'US'

  // 5. Default to FR
  return 'FR'
}

// Get the full country name for a country code, with the country field in community data
export function getCountryDisplayName(code: string, lang: string): string {
  const countryNames: Record<string, Record<string, string>> = {
    FR: { fr: 'France', en: 'France', he: '\u05E6\u05E8\u05E4\u05EA', es: 'Francia' },
    ES: { fr: 'Espagne', en: 'Spain', he: '\u05E1\u05E4\u05E8\u05D3', es: 'Espana' },
    US: { fr: 'Etats-Unis', en: 'United States', he: '\u05D0\u05E8\u05D4"\u05D1', es: 'Estados Unidos' },
    GB: { fr: 'Royaume-Uni', en: 'United Kingdom', he: '\u05D1\u05E8\u05D9\u05D8\u05E0\u05D9\u05D4', es: 'Reino Unido' },
    BR: { fr: 'Bresil', en: 'Brazil', he: '\u05D1\u05E8\u05D6\u05D9\u05DC', es: 'Brasil' },
    JP: { fr: 'Japon', en: 'Japan', he: '\u05D9\u05E4\u05DF', es: 'Japon' },
    DE: { fr: 'Allemagne', en: 'Germany', he: '\u05D2\u05E8\u05DE\u05E0\u05D9\u05D4', es: 'Alemania' },
    IT: { fr: 'Italie', en: 'Italy', he: '\u05D0\u05D9\u05D8\u05DC\u05D9\u05D4', es: 'Italia' },
    IL: { fr: 'Israel', en: 'Israel', he: '\u05D9\u05E9\u05E8\u05D0\u05DC', es: 'Israel' },
    PT: { fr: 'Portugal', en: 'Portugal', he: '\u05E4\u05D5\u05E8\u05D8\u05D5\u05D2\u05DC', es: 'Portugal' },
    MA: { fr: 'Maroc', en: 'Morocco', he: '\u05DE\u05E8\u05D5\u05E7\u05D5', es: 'Marruecos' },
    CA: { fr: 'Canada', en: 'Canada', he: '\u05E7\u05E0\u05D3\u05D4', es: 'Canada' },
  }
  return countryNames[code]?.[lang] || countryNames[code]?.en || code
}
