import type { Community } from '../../types/database'
import { getLang, getLocale, type Lang, type Localized } from '../i18n'

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

const COUNTRY_NAMES: Record<CountryCode, Localized<string>> = {
  FR: { en: 'France', fr: 'France', es: 'Francia', ru: 'Франция', he: 'צרפת' }, // i18n-ignore (nom de pays, donnée)
  ES: { en: 'Spain', fr: 'Espagne', es: 'España', ru: 'Испания', he: 'ספרד' },
  US: { en: 'United States', fr: 'États-Unis', es: 'Estados Unidos', ru: 'США', he: 'ארצות הברית' },
  GB: { en: 'United Kingdom', fr: 'Royaume-Uni', es: 'Reino Unido', ru: 'Великобритания', he: 'בריטניה' },
  BR: { en: 'Brazil', fr: 'Brésil', es: 'Brasil', ru: 'Бразилия', he: 'ברזיל' },
  JP: { en: 'Japan', fr: 'Japon', es: 'Japón', ru: 'Япония', he: 'יפן' },
  DE: { en: 'Germany', fr: 'Allemagne', es: 'Alemania', ru: 'Германия', he: 'גרמניה' },
  IT: { en: 'Italy', fr: 'Italie', es: 'Italia', ru: 'Италия', he: 'איטליה' },
  IL: { en: 'Israel', fr: 'Israël', es: 'Israel', ru: 'Израиль', he: 'ישראל' },
  PT: { en: 'Portugal', fr: 'Portugal', es: 'Portugal', ru: 'Португалия', he: 'פורטוגל' },
  MA: { en: 'Morocco', fr: 'Maroc', es: 'Marruecos', ru: 'Марокко', he: 'מרוקו' },
  CA: { en: 'Canada', fr: 'Canada', es: 'Canadá', ru: 'Канада', he: 'קנדה' },
}


export const COUNTRIES: CountryInfo[] = [
  {
    code: 'FR',
    flag: '\uD83C\uDDEB\uD83C\uDDF7',
    name: COUNTRY_NAMES.FR,
  },
  {
    code: 'ES',
    flag: '\uD83C\uDDEA\uD83C\uDDF8',
    name: COUNTRY_NAMES.ES,
  },
  {
    code: 'US',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    name: COUNTRY_NAMES.US,
  },
  {
    code: 'GB',
    flag: '\uD83C\uDDEC\uD83C\uDDE7',
    name: COUNTRY_NAMES.GB,
  },
  {
    code: 'BR',
    flag: '\uD83C\uDDE7\uD83C\uDDF7',
    name: COUNTRY_NAMES.BR,
  },
  {
    code: 'JP',
    flag: '\uD83C\uDDEF\uD83C\uDDF5',
    name: COUNTRY_NAMES.JP,
  },
  {
    code: 'DE',
    flag: '\uD83C\uDDE9\uD83C\uDDEA',
    name: COUNTRY_NAMES.DE,
  },
  {
    code: 'IT',
    flag: '\uD83C\uDDEE\uD83C\uDDF9',
    name: COUNTRY_NAMES.IT,
  },
  {
    code: 'IL',
    flag: '\uD83C\uDDEE\uD83C\uDDF1',
    name: COUNTRY_NAMES.IL,
  },
  {
    code: 'PT',
    flag: '\uD83C\uDDF5\uD83C\uDDF9',
    name: COUNTRY_NAMES.PT,
  },
  {
    code: 'MA',
    flag: '\uD83C\uDDF2\uD83C\uDDE6',
    name: COUNTRY_NAMES.MA,
  },
  {
    code: 'CA',
    flag: '\uD83C\uDDE8\uD83C\uDDE6',
    name: COUNTRY_NAMES.CA,
  },
]

// Descriptions des communautés de démonstration, dans les 5 langues
const COMMUNITY_DESCRIPTIONS: Record<string, Localized<string>> = {
  'fr-comm-1': {
    en: 'The biggest live marketplace in Paris. Fashion, luxury, vintage and more.', // i18n-ignore (communauté située à Paris : donnée)
    fr: 'Le plus grand marché en live de Paris. Mode, luxe, vintage et bien plus.', // i18n-ignore (communauté située à Paris : donnée)
    es: 'El mayor mercado en directo de París. Moda, lujo, vintage y mucho más.',
    ru: 'Крупнейший живой маркет Парижа. Мода, люкс, винтаж и многое другое.',
    he: 'השוק החי הגדול בפריז. אופנה, יוקרה, וינטג׳ ועוד.',
  },
  'fr-comm-2': {
    en: 'Flea-market treasures, vintage and unique finds in Lyon.',
    fr: 'Brocante, vintage et trouvailles uniques à Lyon.',
    es: 'Mercadillo, vintage y hallazgos únicos en Lyon.',
    ru: 'Барахолка, винтаж и уникальные находки в Лионе.',
    he: 'שוק פשפשים, וינטג׳ ומציאות ייחודיות בליון.',
  },
  'fr-comm-3': {
    en: 'Mediterranean fashion, streetwear and accessories from the south.',
    fr: 'Mode méditerranéenne, streetwear et accessoires du Sud.',
    es: 'Moda mediterránea, streetwear y accesorios del sur.',
    ru: 'Средиземноморская мода, стритвир и аксессуары с юга.',
    he: 'אופנה ים־תיכונית, סטריטוור ואקססוריז מהדרום.',
  },
  'fr-comm-4': {
    en: 'The best deals in Bordeaux. Decor, fashion, wine and food.',
    fr: 'Les meilleures affaires de Bordeaux. Déco, mode, vin et gastronomie.',
    es: 'Las mejores ofertas de Burdeos. Decoración, moda, vino y gastronomía.',
    ru: 'Лучшие предложения Бордо. Декор, мода, вино и гастрономия.',
    he: 'הדילים הכי טובים בבורדו. עיצוב, אופנה, יין ואוכל.',
  },
  'fr-comm-5': {
    en: 'The Côte d\'Azur bazaar. Fashion, jewelry and Riviera lifestyle.',
    fr: 'Le bazar de la Côte d\'Azur. Mode, bijoux et lifestyle Riviera.',
    es: 'El bazar de la Costa Azul. Moda, joyas y estilo de vida Riviera.',
    ru: 'Базар Лазурного Берега. Мода, украшения и стиль Ривьеры.',
    he: 'הבזאר של הריביירה הצרפתית. אופנה, תכשיטים ולייפסטייל.',
  },
  'fr-comm-6': {
    en: 'The Pink City market. Crafts, fashion and Occitan culture.',
    fr: 'Le marché de la Ville rose. Artisanat, mode et culture occitane.',
    es: 'El mercado de la Ciudad Rosa. Artesanía, moda y cultura occitana.',
    ru: 'Рынок Розового города. Ремёсла, мода и окситанская культура.',
    he: 'השוק של העיר הוורודה. אומנות, אופנה ותרבות אוקסיטנית.',
  },
  'fr-comm-7': {
    en: 'Collectibles, cards, figurines and rare items in Alsace.',
    fr: 'Collection, cartes, figurines et objets rares en Alsace.',
    es: 'Coleccionismo, cartas, figuras y objetos raros en Alsacia.',
    ru: 'Коллекционирование, карточки, фигурки и редкие вещи в Эльзасе.',
    he: 'פריטי אספנות, קלפים, פסלונים וחפצים נדירים באלזס.',
  },
  'fr-comm-8': {
    en: 'Fashion trends and independent designers from Nantes.',
    fr: 'Tendances mode et créateurs indépendants de Nantes.',
    es: 'Tendencias de moda y diseñadores independientes de Nantes.',
    ru: 'Модные тренды и независимые дизайнеры из Нанта.',
    he: 'טרנדים באופנה ומעצבים עצמאיים מנאנט.',
  },
  'es-comm-1': {
    en: 'The biggest live marketplace in Madrid. Fashion, tech, vintage and more.',
    fr: 'Le plus grand marché en live de Madrid. Mode, high-tech, vintage et bien plus.',
    es: 'El mayor mercado en directo de Madrid. Moda, tecnología, vintage y mucho más.',
    ru: 'Крупнейший живой маркет Мадрида. Мода, техника, винтаж и многое другое.',
    he: 'השוק החי הגדול במדריד. אופנה, טכנולוגיה, וינטג׳ ועוד.',
  },
  'es-comm-2': {
    en: 'Vintage, fashion and art in the capital of the Mediterranean.',
    fr: 'Vintage, mode et art dans la capitale de la Méditerranée.',
    es: 'Vintage, moda y arte en la capital del Mediterráneo.',
    ru: 'Винтаж, мода и искусство в столице Средиземноморья.',
    he: 'וינטג׳, אופנה ואמנות בבירת הים התיכון.',
  },
  'es-comm-3': {
    en: 'The best deals in Valencia. Fashion, decor and Mediterranean lifestyle.',
    fr: 'Les meilleures affaires de Valence. Mode, déco et lifestyle méditerranéen.',
    es: 'Las mejores ofertas de Valencia. Moda, decoración y estilo de vida mediterráneo.',
    ru: 'Лучшие предложения Валенсии. Мода, декор и средиземноморский стиль жизни.',
    he: 'הדילים הכי טובים בוולנסיה. אופנה, עיצוב ולייפסטייל ים־תיכוני.',
  },
  'es-comm-4': {
    en: 'The bazaar of the south. Crafts, flamenco and Andalusian style.',
    fr: 'Le bazar du Sud. Artisanat, flamenco et style andalou.',
    es: 'El bazar del sur. Artesanía, flamenco y estilo andaluz.',
    ru: 'Южный базар. Ремёсла, фламенко и андалусский стиль.',
    he: 'הבזאר של הדרום. אומנות, פלמנקו וסגנון אנדלוסי.',
  },
  'es-comm-5': {
    en: 'Beachwear, surf and Costa del Sol lifestyle.',
    fr: 'Mode plage, surf et lifestyle de la Costa del Sol.',
    es: 'Moda de playa, surf y estilo de vida de la Costa del Sol.',
    ru: 'Пляжная мода, сёрфинг и стиль жизни Коста-дель-Соль.',
    he: 'אופנת חוף, גלישה ולייפסטייל של קוסטה דל סול.',
  },
  'es-comm-6': {
    en: 'Collectibles, art and unique items in the Basque Country.',
    fr: 'Collection, art et objets uniques au Pays basque.',
    es: 'Coleccionismo, arte y objetos únicos en el País Vasco.',
    ru: 'Коллекционирование, искусство и уникальные вещи в Стране Басков.',
    he: 'פריטי אספנות, אמנות וחפצים ייחודיים בחבל הבסקים.',
  },
  'us-comm-1': {
    en: 'The biggest live marketplace in NYC. Fashion, tech, vintage and more.',
    fr: 'Le plus grand marché en live de New York. Mode, high-tech, vintage et bien plus.',
    es: 'El mayor mercado en directo de Nueva York. Moda, tecnología, vintage y mucho más.',
    ru: 'Крупнейший живой маркет Нью-Йорка. Мода, техника, винтаж и многое другое.',
    he: 'השוק החי הגדול בניו יורק. אופנה, טכנולוגיה, וינטג׳ ועוד.',
  },
  'us-comm-2': {
    en: 'Vintage, streetwear and celebrity closet finds from Los Angeles.',
    fr: 'Vintage, streetwear et pièces de dressings de stars à Los Angeles.',
    es: 'Vintage, streetwear y prendas de armarios de famosos de Los Ángeles.',
    ru: 'Винтаж, стритвир и вещи из гардеробов звёзд Лос-Анджелеса.',
    he: 'וינטג׳, סטריטוור ופריטים מארונות של סלבס בלוס אנג׳לס.',
  },
  'us-comm-3': {
    en: 'Beachwear, designer finds and luxury deals from Miami.',
    fr: 'Mode plage, pièces de créateurs et bonnes affaires de luxe à Miami.',
    es: 'Moda de playa, piezas de diseño y chollos de lujo en Miami.',
    ru: 'Пляжная мода, дизайнерские находки и люкс со скидкой из Майами.',
    he: 'אופנת חוף, פריטי מעצבים ודילים של יוקרה ממיאמי.',
  },
  'us-comm-4': {
    en: 'The Windy City marketplace. Sports memorabilia, fashion and collectibles.',
    fr: 'Le marché de Chicago. Souvenirs sportifs, mode et objets de collection.',
    es: 'El mercado de Chicago. Recuerdos deportivos, moda y coleccionables.',
    ru: 'Маркет Чикаго. Спортивные реликвии, мода и коллекционные вещи.',
    he: 'השוק של שיקגו. מזכרות ספורט, אופנה ופריטי אספנות.',
  },
  'us-comm-5': {
    en: 'Tech gadgets, startup merch and Silicon Valley finds.',
    fr: 'Gadgets high-tech, goodies de start-up et trouvailles de la Silicon Valley.',
    es: 'Gadgets tecnológicos, merch de startups y hallazgos de Silicon Valley.',
    ru: 'Гаджеты, мерч стартапов и находки из Кремниевой долины.',
    he: 'גאדג׳טים, מרצ׳ של סטארטאפים ומציאות מעמק הסיליקון.',
  },
  'us-comm-6': {
    en: 'Music memorabilia, vinyl, collectibles and quirky Austin finds.',
    fr: 'Souvenirs musicaux, vinyles, objets de collection et trouvailles décalées d\'Austin.',
    es: 'Recuerdos musicales, vinilos, coleccionables y hallazgos curiosos de Austin.',
    ru: 'Музыкальные реликвии, винил, коллекционные вещи и необычные находки из Остина.',
    he: 'מזכרות מוזיקה, תקליטים, פריטי אספנות ומציאות מיוחדות מאוסטין.',
  },
  'gb-comm-1': {
    en: 'The biggest live marketplace in London. Fashion, vintage, luxury and more.',
    fr: 'Le plus grand marché en live de Londres. Mode, vintage, luxe et bien plus.',
    es: 'El mayor mercado en directo de Londres. Moda, vintage, lujo y mucho más.',
    ru: 'Крупнейший живой маркет Лондона. Мода, винтаж, люкс и многое другое.',
    he: 'השוק החי הגדול בלונדון. אופנה, וינטג׳, יוקרה ועוד.',
  },
  'gb-comm-2': {
    en: 'Vintage fashion, Northern Quarter finds and indie brands.',
    fr: 'Mode vintage, trouvailles du Northern Quarter et marques indépendantes.',
    es: 'Moda vintage, hallazgos del Northern Quarter y marcas independientes.',
    ru: 'Винтажная мода, находки из Northern Quarter и независимые бренды.',
    he: 'אופנת וינטג׳, מציאות מהנורת׳רן קוורטר ומותגי אינדי.',
  },
  'gb-comm-3': {
    en: 'The best deals from the Jewellery Quarter and beyond.',
    fr: 'Les meilleures affaires du Jewellery Quarter et d\'ailleurs.',
    es: 'Las mejores ofertas del Jewellery Quarter y alrededores.',
    ru: 'Лучшие предложения из Ювелирного квартала и не только.',
    he: 'הדילים הכי טובים מרובע התכשיטים ומעבר לו.',
  },
  'gb-comm-4': {
    en: 'Antiques, rare books, whisky memorabilia and Scottish treasures.',
    fr: 'Antiquités, livres rares, objets autour du whisky et trésors écossais.',
    es: 'Antigüedades, libros raros, recuerdos de whisky y tesoros escoceses.',
    ru: 'Антиквариат, редкие книги, вещи для ценителей виски и шотландские сокровища.',
    he: 'עתיקות, ספרים נדירים, מזכרות וויסקי ואוצרות סקוטיים.',
  },
  'br-comm-1': {
    en: 'The biggest live marketplace in São Paulo. Fashion, tech, vintage and more.',
    fr: 'Le plus grand marché en live de São Paulo. Mode, high-tech, vintage et bien plus.',
    es: 'El mayor mercado en directo de São Paulo. Moda, tecnología, vintage y mucho más.',
    ru: 'Крупнейший живой маркет Сан-Паулу. Мода, техника, винтаж и многое другое.',
    he: 'השוק החי הגדול בסאו פאולו. אופנה, טכנולוגיה, וינטג׳ ועוד.',
  },
  'br-comm-2': {
    en: 'Carioca fashion, beachwear and Rio de Janeiro lifestyle.',
    fr: 'Mode carioca, plage et lifestyle de Rio de Janeiro.',
    es: 'Moda carioca, playa y estilo de vida de Río de Janeiro.',
    ru: 'Мода кариока, пляж и стиль жизни Рио-де-Жанейро.',
    he: 'אופנה קריוקה, חוף ולייפסטייל של ריו דה ז׳נרו.',
  },
  'br-comm-3': {
    en: 'The best deals in Brazil\'s capital.',
    fr: 'Les meilleures affaires de la capitale brésilienne.',
    es: 'Las mejores ofertas de la capital de Brasil.',
    ru: 'Лучшие предложения бразильской столицы.',
    he: 'הדילים הכי טובים בבירת ברזיל.',
  },
  'br-comm-4': {
    en: 'Crafts, Bahian culture and unique finds.',
    fr: 'Artisanat, culture bahianaise et trouvailles uniques.',
    es: 'Artesanía, cultura bahiana y hallazgos únicos.',
    ru: 'Ремёсла, культура Баии и уникальные находки.',
    he: 'אומנות, תרבות באהיה ומציאות ייחודיות.',
  },
  'br-comm-5': {
    en: 'Minas Gerais fashion, crafts and much more from Belo Horizonte.',
    fr: 'Mode du Minas Gerais, artisanat et bien plus à Belo Horizonte.',
    es: 'Moda de Minas Gerais, artesanía y mucho más de Belo Horizonte.',
    ru: 'Мода Минас-Жерайса, ремёсла и многое другое из Белу-Оризонти.',
    he: 'אופנה ממינאס ז׳ראיס, אומנות ועוד מבלו אוריזונטה.',
  },
  'jp-comm-1': {
    en: 'Fashion, anime goods, tech and vintage finds from Tokyo.',
    fr: 'Mode, goodies anime, high-tech et trouvailles vintage de Tokyo.',
    es: 'Moda, merch de anime, tecnología y hallazgos vintage de Tokio.',
    ru: 'Мода, аниме-мерч, техника и винтажные находки из Токио.',
    he: 'אופנה, מרצ׳ אנימה, טכנולוגיה ומציאות וינטג׳ מטוקיו.',
  },
  'jp-comm-2': {
    en: 'Streetwear, vintage and collectibles from Osaka.',
    fr: 'Streetwear, vintage et objets de collection d\'Osaka.',
    es: 'Streetwear, vintage y coleccionables de Osaka.',
    ru: 'Стритвир, винтаж и коллекционные вещи из Осаки.',
    he: 'סטריטוור, וינטג׳ ופריטי אספנות מאוסקה.',
  },
  'jp-comm-3': {
    en: 'Traditional crafts, ceramics and antiques from Kyoto.',
    fr: 'Artisanat traditionnel, céramiques et antiquités de Kyoto.',
    es: 'Artesanía tradicional, cerámica y antigüedades de Kioto.',
    ru: 'Традиционные ремёсла, керамика и антиквариат из Киото.',
    he: 'אומנות מסורתית, קרמיקה ועתיקות מקיוטו.',
  },
  'jp-comm-4': {
    en: 'Great deals from the Yokohama port area.',
    fr: 'Les bonnes affaires du port de Yokohama.',
    es: 'Grandes ofertas de la zona portuaria de Yokohama.',
    ru: 'Выгодные предложения из портового района Иокогамы.',
    he: 'דילים מעולים מאזור הנמל של יוקוהמה.',
  },
  'de-comm-1': {
    en: 'Berlin\'s biggest live marketplace. Fashion, vintage, tech and more.',
    fr: 'Le plus grand marché en live de Berlin. Mode, vintage, high-tech et bien plus.',
    es: 'El mayor mercado en directo de Berlín. Moda, vintage, tecnología y mucho más.',
    ru: 'Крупнейший живой маркет Берлина. Мода, винтаж, техника и многое другое.',
    he: 'השוק החי הגדול בברלין. אופנה, וינטג׳, טכנולוגיה ועוד.',
  },
  'de-comm-2': {
    en: 'Vintage, traditional dress and designer finds from Munich.',
    fr: 'Vintage, costumes traditionnels et pièces de créateurs à Munich.',
    es: 'Vintage, trajes tradicionales y piezas de diseño de Múnich.',
    ru: 'Винтаж, традиционные костюмы и дизайнерские находки из Мюнхена.',
    he: 'וינטג׳, תלבושות מסורתיות ופריטי מעצבים ממינכן.',
  },
  'de-comm-3': {
    en: 'The best deals from the Hanseatic city.',
    fr: 'Les meilleures affaires de la ville hanséatique.',
    es: 'Las mejores ofertas de la ciudad hanseática.',
    ru: 'Лучшие предложения ганзейского города.',
    he: 'הדילים הכי טובים מהעיר ההנזאית.',
  },
  'de-comm-4': {
    en: 'Fashion, jewelry and lifestyle from Frankfurt.',
    fr: 'Mode, bijoux et lifestyle de Francfort.',
    es: 'Moda, joyas y estilo de vida de Fráncfort.',
    ru: 'Мода, украшения и стиль жизни Франкфурта.',
    he: 'אופנה, תכשיטים ולייפסטייל מפרנקפורט.',
  },
  'it-comm-1': {
    en: 'The biggest live marketplace in Rome. Fashion, vintage, luxury and more.',
    fr: 'Le plus grand marché en live de Rome. Mode, vintage, luxe et bien plus.',
    es: 'El mayor mercado en directo de Roma. Moda, vintage, lujo y mucho más.',
    ru: 'Крупнейший живой маркет Рима. Мода, винтаж, люкс и многое другое.',
    he: 'השוק החי הגדול ברומא. אופנה, וינטג׳, יוקרה ועוד.',
  },
  'it-comm-2': {
    en: 'High fashion, design and vintage from the fashion capital.',
    fr: 'Haute couture, design et vintage dans la capitale de la mode.',
    es: 'Alta moda, diseño y vintage de la capital de la moda.',
    ru: 'Высокая мода, дизайн и винтаж из модной столицы.',
    he: 'אופנה עילית, עיצוב ווינטג׳ מבירת האופנה.',
  },
  'it-comm-3': {
    en: 'Crafts, vintage and Neapolitan style.',
    fr: 'Artisanat, vintage et style napolitain.',
    es: 'Artesanía, vintage y estilo napolitano.',
    ru: 'Ремёсла, винтаж и неаполитанский стиль.',
    he: 'אומנות, וינטג׳ וסגנון נפוליטני.',
  },
  'it-comm-4': {
    en: 'Antiques, art and Florentine leather.',
    fr: 'Antiquités, art et cuir florentin.',
    es: 'Antigüedades, arte y cuero florentino.',
    ru: 'Антиквариат, искусство и флорентийская кожа.',
    he: 'עתיקות, אמנות ועור פלורנטיני.',
  },
  'il-comm-1': {
    en: 'The biggest live marketplace in Tel Aviv. Fashion, tech, vintage and more.',
    fr: 'Le plus grand marché en live de Tel Aviv. Mode, high-tech, vintage et bien plus.',
    es: 'El mayor mercado en directo de Tel Aviv. Moda, tecnología, vintage y mucho más.',
    ru: 'Крупнейший живой маркет Тель-Авива. Мода, техника, винтаж и многое другое.',
    he: 'השוק החי הגדול בתל אביב. אופנה, טכנולוגיה, וינטג׳ ועוד.',
  },
  'il-comm-2': {
    en: 'Antiques, Judaica, art and unique finds from Jerusalem.',
    fr: 'Antiquités, judaïca, art et trouvailles uniques de Jérusalem.',
    es: 'Antigüedades, judaica, arte y hallazgos únicos de Jerusalén.',
    ru: 'Антиквариат, иудаика, искусство и уникальные находки из Иерусалима.',
    he: 'עתיקות, יודאיקה, אמנות ומציאות ייחודיות מירושלים.',
  },
  'il-comm-3': {
    en: 'Fashion, art and lifestyle from the port city.',
    fr: 'Mode, art et lifestyle de la ville portuaire.',
    es: 'Moda, arte y estilo de vida de la ciudad portuaria.',
    ru: 'Мода, искусство и стиль жизни портового города.',
    he: 'אופנה, אמנות ולייפסטייל מעיר הנמל.',
  },
  'pt-comm-1': {
    en: 'The biggest live marketplace in Lisbon. Fashion, vintage, azulejos and more.',
    fr: 'Le plus grand marché en live de Lisbonne. Mode, vintage, azulejos et bien plus.',
    es: 'El mayor mercado en directo de Lisboa. Moda, vintage, azulejos y mucho más.',
    ru: 'Крупнейший живой маркет Лиссабона. Мода, винтаж, азулежу и многое другое.',
    he: 'השוק החי הגדול בליסבון. אופנה, וינטג׳, אזולז׳וש ועוד.',
  },
  'pt-comm-2': {
    en: 'Vintage, crafts and northern Portuguese style.',
    fr: 'Vintage, artisanat et style du nord du Portugal.',
    es: 'Vintage, artesanía y estilo del norte de Portugal.',
    ru: 'Винтаж, ремёсла и стиль севера Португалии.',
    he: 'וינטג׳, אומנות וסגנון צפון פורטוגל.',
  },
  'pt-comm-3': {
    en: 'Beachwear, surf and Algarve lifestyle.',
    fr: 'Mode plage, surf et lifestyle de l\'Algarve.',
    es: 'Moda de playa, surf y estilo de vida del Algarve.',
    ru: 'Пляжная мода, сёрфинг и стиль жизни Алгарве.',
    he: 'אופנת חוף, גלישה ולייפסטייל של אלגרבה.',
  },
  'ma-comm-1': {
    en: 'The biggest live marketplace in Casablanca. Fashion, crafts and more.',
    fr: 'Le plus grand marché en live de Casablanca. Mode, artisanat et bien plus.',
    es: 'El mayor mercado en directo de Casablanca. Moda, artesanía y mucho más.',
    ru: 'Крупнейший живой маркет Касабланки. Мода, ремёсла и многое другое.',
    he: 'השוק החי הגדול בקזבלנקה. אופנה, אומנות ועוד.',
  },
  'ma-comm-2': {
    en: 'Crafts, rugs, jewelry and finds from the souk.',
    fr: 'Artisanat, tapis, bijoux et trouvailles du souk.',
    es: 'Artesanía, alfombras, joyas y hallazgos del zoco.',
    ru: 'Ремёсла, ковры, украшения и находки с базара.',
    he: 'אומנות, שטיחים, תכשיטים ומציאות מהשוק.',
  },
  'ma-comm-3': {
    en: 'Fashion, crafts and lifestyle from the capital.',
    fr: 'Mode, artisanat et lifestyle de la capitale.',
    es: 'Moda, artesanía y estilo de vida de la capital.',
    ru: 'Мода, ремёсла и стиль жизни столицы.',
    he: 'אופנה, אומנות ולייפסטייל מהבירה.',
  },
  'ma-comm-4': {
    en: 'Fashion, crafts and Mediterranean style from Tangier.',
    fr: 'Mode, artisanat et style méditerranéen de Tanger.',
    es: 'Moda, artesanía y estilo mediterráneo de Tánger.',
    ru: 'Мода, ремёсла и средиземноморский стиль Танжера.',
    he: 'אופנה, אומנות וסגנון ים־תיכוני מטנג׳יר.',
  },
  'ca-comm-1': {
    en: 'The biggest live marketplace in Toronto. Fashion, tech, vintage and more.',
    fr: 'Le plus grand marché en live de Toronto. Mode, high-tech, vintage et bien plus.',
    es: 'El mayor mercado en directo de Toronto. Moda, tecnología, vintage y mucho más.',
    ru: 'Крупнейший живой маркет Торонто. Мода, техника, винтаж и многое другое.',
    he: 'השוק החי הגדול בטורונטו. אופנה, טכנולוגיה, וינטג׳ ועוד.',
  },
  'ca-comm-2': {
    en: 'Vintage, fashion and unique finds from Montreal.',
    fr: 'Vintage, mode et trouvailles uniques de Montréal.',
    es: 'Vintage, moda y hallazgos únicos de Montreal.',
    ru: 'Винтаж, мода и уникальные находки из Монреаля.',
    he: 'וינטג׳, אופנה ומציאות ייחודיות ממונטריאול.',
  },
  'ca-comm-3': {
    en: 'West Coast finds, outdoor gear and Asian vintage.',
    fr: 'Trouvailles de la côte Ouest, matériel outdoor et vintage asiatique.',
    es: 'Hallazgos de la costa oeste, equipo outdoor y vintage asiático.',
    ru: 'Находки Западного побережья, снаряжение для активного отдыха и азиатский винтаж.',
    he: 'מציאות מהחוף המערבי, ציוד שטח ווינטג׳ אסייתי.',
  },
  'ca-comm-4': {
    en: 'Western Canadian finds, vintage and collectibles.',
    fr: 'Trouvailles de l\'Ouest canadien, vintage et objets de collection.',
    es: 'Hallazgos del oeste de Canadá, vintage y coleccionables.',
    ru: 'Находки Западной Канады, винтаж и коллекционные вещи.',
    he: 'מציאות ממערב קנדה, וינטג׳ ופריטי אספנות.',
  },
}

/** Description d'une communauté dans la langue courante (repli : texte d'origine). */
export function getCommunityDescription(c: { id: string; description?: string | null }, lang: Lang = getLang()): string {
  const d = COMMUNITY_DESCRIPTIONS[c.id]
  return d ? d[lang] ?? d.en : (c.description || '')
}

const communitiesByCountry: Record<CountryCode, CommunityDisplay[]> = {
  FR: [
    {
      id: 'fr-comm-1', name: 'Paris', slug: 'paris-marketplace', // i18n-ignore (donnée de communauté)
      description: COMMUNITY_DESCRIPTIONS['fr-comm-1'].en,
      city: 'Paris', region: 'Ile-de-France', country: 'FR', // i18n-ignore (donnée de communauté)
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'paris',
    },
    {
      id: 'fr-comm-2', name: 'Lyon', slug: 'lyon-vintage-brocante',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-2'].en,
      city: 'Lyon', region: 'Auvergne-Rhone-Alpes', country: 'FR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'lyon-france',
    },
    {
      id: 'fr-comm-3', name: 'Marseille', slug: 'marseille-mode',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-3'].en,
      city: 'Marseille', region: 'Provence-Alpes-Cote d\'Azur', country: 'FR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'marseille',
    },
    {
      id: 'fr-comm-4', name: 'Bordeaux', slug: 'bordeaux-deals',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-4'].en,
      city: 'Bordeaux', region: 'Nouvelle-Aquitaine', country: 'FR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'bordeaux',
    },
    {
      id: 'fr-comm-5', name: 'Nice', slug: 'nice-bazaar',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-5'].en,
      city: 'Nice', region: 'Provence-Alpes-Cote d\'Azur', country: 'FR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-04-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'nice-france',
    },
    {
      id: 'fr-comm-6', name: 'Toulouse', slug: 'toulouse-market',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-6'].en,
      city: 'Toulouse', region: 'Occitanie', country: 'FR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-04-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'toulouse',
    },
    {
      id: 'fr-comm-7', name: 'Strasbourg', slug: 'strasbourg-collectors',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-7'].en,
      city: 'Strasbourg', region: 'Grand Est', country: 'FR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-05-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'strasbourg',
    },
    {
      id: 'fr-comm-8', name: 'Nantes', slug: 'nantes-fashion',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-8'].en,
      city: 'Nantes', region: 'Pays de la Loire', country: 'FR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-05-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'nantes',
    },
  ],
  ES: [
    {
      id: 'es-comm-1', name: 'Madrid', slug: 'madrid-marketplace',
      description: COMMUNITY_DESCRIPTIONS['es-comm-1'].en,
      city: 'Madrid', region: 'Comunidad de Madrid', country: 'ES',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'madrid',
    },
    {
      id: 'es-comm-2', name: 'Barcelona', slug: 'barcelona-vintage',
      description: COMMUNITY_DESCRIPTIONS['es-comm-2'].en,
      city: 'Barcelona', region: 'Cataluna', country: 'ES',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'barcelona',
    },
    {
      id: 'es-comm-3', name: 'Valencia', slug: 'valencia-deals',
      description: COMMUNITY_DESCRIPTIONS['es-comm-3'].en,
      city: 'Valencia', region: 'Comunidad Valenciana', country: 'ES',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-20',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'valencia-spain',
    },
    {
      id: 'es-comm-4', name: 'Sevilla', slug: 'sevilla-bazaar',
      description: COMMUNITY_DESCRIPTIONS['es-comm-4'].en,
      city: 'Sevilla', region: 'Andalucia', country: 'ES',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'sevilla',
    },
    {
      id: 'es-comm-5', name: 'Malaga', slug: 'malaga-beach-market',
      description: COMMUNITY_DESCRIPTIONS['es-comm-5'].en,
      city: 'Malaga', region: 'Andalucia', country: 'ES',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-04-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'malaga',
    },
    {
      id: 'es-comm-6', name: 'Bilbao', slug: 'bilbao-collectors',
      description: COMMUNITY_DESCRIPTIONS['es-comm-6'].en,
      city: 'Bilbao', region: 'Pais Vasco', country: 'ES',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-04-20',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'bilbao',
    },
  ],
  US: [
    {
      id: 'us-comm-1', name: 'New York', slug: 'new-york-marketplace',
      description: COMMUNITY_DESCRIPTIONS['us-comm-1'].en,
      city: 'New York', region: 'New York', country: 'US',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'new-york-city',
    },
    {
      id: 'us-comm-2', name: 'Los Angeles', slug: 'la-vintage',
      description: COMMUNITY_DESCRIPTIONS['us-comm-2'].en,
      city: 'Los Angeles', region: 'California', country: 'US',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'los-angeles',
    },
    {
      id: 'us-comm-3', name: 'Miami', slug: 'miami-deals',
      description: COMMUNITY_DESCRIPTIONS['us-comm-3'].en,
      city: 'Miami', region: 'Florida', country: 'US',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'miami',
    },
    {
      id: 'us-comm-4', name: 'Chicago', slug: 'chicago-market',
      description: COMMUNITY_DESCRIPTIONS['us-comm-4'].en,
      city: 'Chicago', region: 'Illinois', country: 'US',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'chicago',
    },
    {
      id: 'us-comm-5', name: 'San Francisco', slug: 'sf-tech-deals',
      description: COMMUNITY_DESCRIPTIONS['us-comm-5'].en,
      city: 'San Francisco', region: 'California', country: 'US',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'san-francisco',
    },
    {
      id: 'us-comm-6', name: 'Austin', slug: 'austin-collectors',
      description: COMMUNITY_DESCRIPTIONS['us-comm-6'].en,
      city: 'Austin', region: 'Texas', country: 'US',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-04-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'austin-texas',
    },
  ],
  GB: [
    {
      id: 'gb-comm-1', name: 'London', slug: 'london-marketplace',
      description: COMMUNITY_DESCRIPTIONS['gb-comm-1'].en,
      city: 'London', region: 'Greater London', country: 'GB',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'london',
    },
    {
      id: 'gb-comm-2', name: 'Manchester', slug: 'manchester-vintage',
      description: COMMUNITY_DESCRIPTIONS['gb-comm-2'].en,
      city: 'Manchester', region: 'Greater Manchester', country: 'GB',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'manchester',
    },
    {
      id: 'gb-comm-3', name: 'Birmingham', slug: 'birmingham-deals',
      description: COMMUNITY_DESCRIPTIONS['gb-comm-3'].en,
      city: 'Birmingham', region: 'West Midlands', country: 'GB',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'birmingham-uk',
    },
    {
      id: 'gb-comm-4', name: 'Edinburgh', slug: 'edinburgh-collectors',
      description: COMMUNITY_DESCRIPTIONS['gb-comm-4'].en,
      city: 'Edinburgh', region: 'Scotland', country: 'GB',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-04-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'edinburgh',
    },
  ],
  BR: [
    {
      id: 'br-comm-1', name: 'Sao Paulo', slug: 'sao-paulo-marketplace',
      description: COMMUNITY_DESCRIPTIONS['br-comm-1'].en,
      city: 'Sao Paulo', region: 'Sao Paulo', country: 'BR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'sao-paulo',
    },
    {
      id: 'br-comm-2', name: 'Rio de Janeiro', slug: 'rio-fashion',
      description: COMMUNITY_DESCRIPTIONS['br-comm-2'].en,
      city: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'BR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'rio-de-janeiro',
    },
    {
      id: 'br-comm-3', name: 'Brasilia', slug: 'brasilia-deals',
      description: COMMUNITY_DESCRIPTIONS['br-comm-3'].en,
      city: 'Brasilia', region: 'Distrito Federal', country: 'BR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'brasilia',
    },
    {
      id: 'br-comm-4', name: 'Salvador', slug: 'salvador-vintage',
      description: COMMUNITY_DESCRIPTIONS['br-comm-4'].en,
      city: 'Salvador', region: 'Bahia', country: 'BR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'salvador-brazil',
    },
    {
      id: 'br-comm-5', name: 'Belo Horizonte', slug: 'bh-market',
      description: COMMUNITY_DESCRIPTIONS['br-comm-5'].en,
      city: 'Belo Horizonte', region: 'Minas Gerais', country: 'BR',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'belo-horizonte',
    },
  ],
  JP: [
    {
      id: 'jp-comm-1', name: 'Tokyo', slug: 'tokyo-marketplace',
      description: COMMUNITY_DESCRIPTIONS['jp-comm-1'].en,
      city: 'Tokyo', region: 'Kanto', country: 'JP',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'tokyo',
    },
    {
      id: 'jp-comm-2', name: 'Osaka', slug: 'osaka-street-market',
      description: COMMUNITY_DESCRIPTIONS['jp-comm-2'].en,
      city: 'Osaka', region: 'Kansai', country: 'JP',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'osaka',
    },
    {
      id: 'jp-comm-3', name: 'Kyoto', slug: 'kyoto-antiques',
      description: COMMUNITY_DESCRIPTIONS['jp-comm-3'].en,
      city: 'Kyoto', region: 'Kansai', country: 'JP',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'kyoto',
    },
    {
      id: 'jp-comm-4', name: 'Yokohama', slug: 'yokohama-deals',
      description: COMMUNITY_DESCRIPTIONS['jp-comm-4'].en,
      city: 'Yokohama', region: 'Kanto', country: 'JP',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'yokohama',
    },
  ],
  DE: [
    {
      id: 'de-comm-1', name: 'Berlin', slug: 'berlin-marketplace',
      description: COMMUNITY_DESCRIPTIONS['de-comm-1'].en,
      city: 'Berlin', region: 'Berlin', country: 'DE',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'berlin',
    },
    {
      id: 'de-comm-2', name: 'Munich', slug: 'munich-vintage',
      description: COMMUNITY_DESCRIPTIONS['de-comm-2'].en,
      city: 'Munich', region: 'Bayern', country: 'DE',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'munich',
    },
    {
      id: 'de-comm-3', name: 'Hamburg', slug: 'hamburg-deals',
      description: COMMUNITY_DESCRIPTIONS['de-comm-3'].en,
      city: 'Hamburg', region: 'Hamburg', country: 'DE',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'hamburg',
    },
    {
      id: 'de-comm-4', name: 'Frankfurt', slug: 'frankfurt-market',
      description: COMMUNITY_DESCRIPTIONS['de-comm-4'].en,
      city: 'Frankfurt', region: 'Hessen', country: 'DE',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'frankfurt',
    },
  ],
  IT: [
    {
      id: 'it-comm-1', name: 'Roma', slug: 'roma-marketplace',
      description: COMMUNITY_DESCRIPTIONS['it-comm-1'].en,
      city: 'Roma', region: 'Lazio', country: 'IT',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'rome',
    },
    {
      id: 'it-comm-2', name: 'Milano', slug: 'milano-fashion',
      description: COMMUNITY_DESCRIPTIONS['it-comm-2'].en,
      city: 'Milano', region: 'Lombardia', country: 'IT',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'milan',
    },
    {
      id: 'it-comm-3', name: 'Napoli', slug: 'napoli-vintage',
      description: COMMUNITY_DESCRIPTIONS['it-comm-3'].en,
      city: 'Napoli', region: 'Campania', country: 'IT',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'naples-italy',
    },
    {
      id: 'it-comm-4', name: 'Firenze', slug: 'firenze-antiques',
      description: COMMUNITY_DESCRIPTIONS['it-comm-4'].en,
      city: 'Firenze', region: 'Toscana', country: 'IT',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'florence',
    },
  ],
  IL: [
    {
      id: 'il-comm-1', name: 'Tel Aviv', slug: 'tel-aviv-marketplace',
      description: COMMUNITY_DESCRIPTIONS['il-comm-1'].en,
      city: 'Tel Aviv', region: 'Tel Aviv District', country: 'IL',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'tel-aviv',
    },
    {
      id: 'il-comm-2', name: 'Jerusalem', slug: 'jerusalem-antiques',
      description: COMMUNITY_DESCRIPTIONS['il-comm-2'].en,
      city: 'Jerusalem', region: 'Jerusalem District', country: 'IL',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'jerusalem',
    },
    {
      id: 'il-comm-3', name: 'Haifa', slug: 'haifa-market',
      description: COMMUNITY_DESCRIPTIONS['il-comm-3'].en,
      city: 'Haifa', region: 'Haifa District', country: 'IL',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'haifa',
    },
  ],
  PT: [
    {
      id: 'pt-comm-1', name: 'Lisboa', slug: 'lisboa-marketplace',
      description: COMMUNITY_DESCRIPTIONS['pt-comm-1'].en,
      city: 'Lisboa', region: 'Lisboa', country: 'PT',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'lisbon',
    },
    {
      id: 'pt-comm-2', name: 'Porto', slug: 'porto-vintage',
      description: COMMUNITY_DESCRIPTIONS['pt-comm-2'].en,
      city: 'Porto', region: 'Porto', country: 'PT',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'porto',
    },
    {
      id: 'pt-comm-3', name: 'Faro', slug: 'faro-beach-market',
      description: COMMUNITY_DESCRIPTIONS['pt-comm-3'].en,
      city: 'Faro', region: 'Algarve', country: 'PT',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'algarve',
    },
  ],
  MA: [
    {
      id: 'ma-comm-1', name: 'Casablanca', slug: 'casablanca-marketplace',
      description: COMMUNITY_DESCRIPTIONS['ma-comm-1'].en,
      city: 'Casablanca', region: 'Casablanca-Settat', country: 'MA',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'casablanca',
    },
    {
      id: 'ma-comm-2', name: 'Marrakech', slug: 'marrakech-souk',
      description: COMMUNITY_DESCRIPTIONS['ma-comm-2'].en,
      city: 'Marrakech', region: 'Marrakech-Safi', country: 'MA',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'marrakech',
    },
    {
      id: 'ma-comm-3', name: 'Rabat', slug: 'rabat-market',
      description: COMMUNITY_DESCRIPTIONS['ma-comm-3'].en,
      city: 'Rabat', region: 'Rabat-Sale-Kenitra', country: 'MA',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'rabat',
    },
    {
      id: 'ma-comm-4', name: 'Tanger', slug: 'tanger-bazaar',
      description: COMMUNITY_DESCRIPTIONS['ma-comm-4'].en,
      city: 'Tanger', region: 'Tanger-Tetouan-Al Hoceima', country: 'MA',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'tangier',
    },
  ],
  CA: [
    {
      id: 'ca-comm-1', name: 'Toronto', slug: 'toronto-marketplace',
      description: COMMUNITY_DESCRIPTIONS['ca-comm-1'].en,
      city: 'Toronto', region: 'Ontario', country: 'CA',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'toronto',
    },
    {
      id: 'ca-comm-2', name: 'Montreal', slug: 'montreal-vintage',
      description: COMMUNITY_DESCRIPTIONS['ca-comm-2'].en,
      city: 'Montreal', region: 'Quebec', country: 'CA',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-01-15',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'montreal',
    },
    {
      id: 'ca-comm-3', name: 'Vancouver', slug: 'vancouver-deals',
      description: COMMUNITY_DESCRIPTIONS['ca-comm-3'].en,
      city: 'Vancouver', region: 'British Columbia', country: 'CA',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-02-10',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
      unsplash_query: 'vancouver',
    },
    {
      id: 'ca-comm-4', name: 'Calgary', slug: 'calgary-market',
      description: COMMUNITY_DESCRIPTIONS['ca-comm-4'].en,
      city: 'Calgary', region: 'Alberta', country: 'CA',
      image_url: null,
      member_count: 0, created_by: null, created_at: '2024-03-01',
      live_count: 0, active_sellers: 0, lives_this_week: 0,
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

  // 3. Langue de l'application (l'anglais ne dit rien du pays : on passe à l'étape 4)
  const LANG_COUNTRY: [Lang, CountryCode][] = [['he', 'IL'], ['fr', 'FR'], ['es', 'ES']]
  const appLang = getLang()
  const fromLang = LANG_COUNTRY.find(([l]) => l === appLang)
  if (fromLang) return fromLang[1]

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

  // 5. Par défaut : États-Unis (anglais, langue par défaut de l'app)
  return 'US'
}

// Nom complet d'un pays dans la langue demandée (Intl d'abord, puis dictionnaire, puis code)
export function getCountryDisplayName(code: string, lang: string = getLang()): string {
  const l: Lang = (['en', 'fr', 'es', 'ru', 'he'] as const).find(x => x === lang) ?? 'en'
  const known = COUNTRY_NAMES[code as CountryCode]
  if (known) return known[l]
  try {
    const dn = new Intl.DisplayNames([getLocale(l)], { type: 'region' })
    return dn.of(code.toUpperCase()) || code
  } catch {
    return code
  }
}
