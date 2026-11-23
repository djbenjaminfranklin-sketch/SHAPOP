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
      id: 'fr-comm-1', name: 'Paris Marketplace', slug: 'paris-marketplace', // i18n-ignore (donnée de communauté)
      description: COMMUNITY_DESCRIPTIONS['fr-comm-1'].en,
      city: 'Paris', region: 'Ile-de-France', country: 'FR', // i18n-ignore (donnée de communauté)
      image_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=200&fit=crop',
      member_count: 4215, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 47, lives_this_week: 38,
      unsplash_query: 'paris',
    },
    {
      id: 'fr-comm-2', name: 'Lyon Vintage & Brocante', slug: 'lyon-vintage-brocante',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-2'].en,
      city: 'Lyon', region: 'Auvergne-Rhone-Alpes', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 34, lives_this_week: 19,
      unsplash_query: 'lyon-france',
    },
    {
      id: 'fr-comm-3', name: 'Marseille Mode', slug: 'marseille-mode',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-3'].en,
      city: 'Marseille', region: 'Provence-Alpes-Cote d\'Azur', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=200&fit=crop',
      member_count: 1342, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 28, lives_this_week: 14,
      unsplash_query: 'marseille',
    },
    {
      id: 'fr-comm-4', name: 'Bordeaux Deals', slug: 'bordeaux-deals',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-4'].en,
      city: 'Bordeaux', region: 'Nouvelle-Aquitaine', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1565018054357-3a1c7de985e5?w=400&h=200&fit=crop',
      member_count: 987, created_by: null, created_at: '2024-03-15',
      live_count: 1, active_sellers: 22, lives_this_week: 11,
      unsplash_query: 'bordeaux',
    },
    {
      id: 'fr-comm-5', name: 'Nice Bazaar', slug: 'nice-bazaar',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-5'].en,
      city: 'Nice', region: 'Provence-Alpes-Cote d\'Azur', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=400&h=200&fit=crop',
      member_count: 823, created_by: null, created_at: '2024-04-01',
      live_count: 2, active_sellers: 19, lives_this_week: 9,
      unsplash_query: 'nice-france',
    },
    {
      id: 'fr-comm-6', name: 'Toulouse Market', slug: 'toulouse-market',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-6'].en,
      city: 'Toulouse', region: 'Occitanie', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1579093563888-1e3da2895f2e?w=400&h=200&fit=crop',
      member_count: 756, created_by: null, created_at: '2024-04-15',
      live_count: 1, active_sellers: 17, lives_this_week: 8,
      unsplash_query: 'toulouse',
    },
    {
      id: 'fr-comm-7', name: 'Strasbourg Collectors', slug: 'strasbourg-collectors',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-7'].en,
      city: 'Strasbourg', region: 'Grand Est', country: 'FR',
      image_url: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&h=200&fit=crop',
      member_count: 645, created_by: null, created_at: '2024-05-01',
      live_count: 2, active_sellers: 15, lives_this_week: 7,
      unsplash_query: 'strasbourg',
    },
    {
      id: 'fr-comm-8', name: 'Nantes Fashion', slug: 'nantes-fashion',
      description: COMMUNITY_DESCRIPTIONS['fr-comm-8'].en,
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
      description: COMMUNITY_DESCRIPTIONS['es-comm-1'].en,
      city: 'Madrid', region: 'Comunidad de Madrid', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=200&fit=crop',
      member_count: 3156, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 43, lives_this_week: 29,
      unsplash_query: 'madrid',
    },
    {
      id: 'es-comm-2', name: 'Barcelona Vintage', slug: 'barcelona-vintage',
      description: COMMUNITY_DESCRIPTIONS['es-comm-2'].en,
      city: 'Barcelona', region: 'Cataluna', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=200&fit=crop',
      member_count: 2743, created_by: null, created_at: '2024-01-15',
      live_count: 3, active_sellers: 38, lives_this_week: 24,
      unsplash_query: 'barcelona',
    },
    {
      id: 'es-comm-3', name: 'Valencia Deals', slug: 'valencia-deals',
      description: COMMUNITY_DESCRIPTIONS['es-comm-3'].en,
      city: 'Valencia', region: 'Comunidad Valenciana', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1599208274072-0bead41b5d7c?w=400&h=200&fit=crop',
      member_count: 1245, created_by: null, created_at: '2024-02-20',
      live_count: 2, active_sellers: 26, lives_this_week: 13,
      unsplash_query: 'valencia-spain',
    },
    {
      id: 'es-comm-4', name: 'Sevilla Bazaar', slug: 'sevilla-bazaar',
      description: COMMUNITY_DESCRIPTIONS['es-comm-4'].en,
      city: 'Sevilla', region: 'Andalucia', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=400&h=200&fit=crop',
      member_count: 1087, created_by: null, created_at: '2024-03-10',
      live_count: 2, active_sellers: 24, lives_this_week: 11,
      unsplash_query: 'sevilla',
    },
    {
      id: 'es-comm-5', name: 'Malaga Beach Market', slug: 'malaga-beach-market',
      description: COMMUNITY_DESCRIPTIONS['es-comm-5'].en,
      city: 'Malaga', region: 'Andalucia', country: 'ES',
      image_url: 'https://images.unsplash.com/photo-1564221710304-0b34b3e5cf00?w=400&h=200&fit=crop',
      member_count: 876, created_by: null, created_at: '2024-04-01',
      live_count: 1, active_sellers: 18, lives_this_week: 8,
      unsplash_query: 'malaga',
    },
    {
      id: 'es-comm-6', name: 'Bilbao Collectors', slug: 'bilbao-collectors',
      description: COMMUNITY_DESCRIPTIONS['es-comm-6'].en,
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
      description: COMMUNITY_DESCRIPTIONS['us-comm-1'].en,
      city: 'New York', region: 'New York', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=200&fit=crop',
      member_count: 5432, created_by: null, created_at: '2024-01-01',
      live_count: 5, active_sellers: 48, lives_this_week: 42,
      unsplash_query: 'new-york-city',
    },
    {
      id: 'us-comm-2', name: 'LA Vintage', slug: 'la-vintage',
      description: COMMUNITY_DESCRIPTIONS['us-comm-2'].en,
      city: 'Los Angeles', region: 'California', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=400&h=200&fit=crop',
      member_count: 3876, created_by: null, created_at: '2024-01-15',
      live_count: 4, active_sellers: 41, lives_this_week: 35,
      unsplash_query: 'los-angeles',
    },
    {
      id: 'us-comm-3', name: 'Miami Deals', slug: 'miami-deals',
      description: COMMUNITY_DESCRIPTIONS['us-comm-3'].en,
      city: 'Miami', region: 'Florida', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=400&h=200&fit=crop',
      member_count: 2134, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 33, lives_this_week: 22,
      unsplash_query: 'miami',
    },
    {
      id: 'us-comm-4', name: 'Chicago Market', slug: 'chicago-market',
      description: COMMUNITY_DESCRIPTIONS['us-comm-4'].en,
      city: 'Chicago', region: 'Illinois', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=400&h=200&fit=crop',
      member_count: 1567, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 27, lives_this_week: 16,
      unsplash_query: 'chicago',
    },
    {
      id: 'us-comm-5', name: 'SF Tech Deals', slug: 'sf-tech-deals',
      description: COMMUNITY_DESCRIPTIONS['us-comm-5'].en,
      city: 'San Francisco', region: 'California', country: 'US',
      image_url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=200&fit=crop',
      member_count: 1823, created_by: null, created_at: '2024-03-15',
      live_count: 3, active_sellers: 29, lives_this_week: 19,
      unsplash_query: 'san-francisco',
    },
    {
      id: 'us-comm-6', name: 'Austin Collectors', slug: 'austin-collectors',
      description: COMMUNITY_DESCRIPTIONS['us-comm-6'].en,
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
      description: COMMUNITY_DESCRIPTIONS['gb-comm-1'].en,
      city: 'London', region: 'Greater London', country: 'GB',
      image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=200&fit=crop',
      member_count: 4567, created_by: null, created_at: '2024-01-01',
      live_count: 5, active_sellers: 46, lives_this_week: 37,
      unsplash_query: 'london',
    },
    {
      id: 'gb-comm-2', name: 'Manchester Vintage', slug: 'manchester-vintage',
      description: COMMUNITY_DESCRIPTIONS['gb-comm-2'].en,
      city: 'Manchester', region: 'Greater Manchester', country: 'GB',
      image_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aede?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 32, lives_this_week: 20,
      unsplash_query: 'manchester',
    },
    {
      id: 'gb-comm-3', name: 'Birmingham Deals', slug: 'birmingham-deals',
      description: COMMUNITY_DESCRIPTIONS['gb-comm-3'].en,
      city: 'Birmingham', region: 'West Midlands', country: 'GB',
      image_url: 'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=400&h=200&fit=crop',
      member_count: 1234, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 24, lives_this_week: 13,
      unsplash_query: 'birmingham-uk',
    },
    {
      id: 'gb-comm-4', name: 'Edinburgh Collectors', slug: 'edinburgh-collectors',
      description: COMMUNITY_DESCRIPTIONS['gb-comm-4'].en,
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
      description: COMMUNITY_DESCRIPTIONS['br-comm-1'].en,
      city: 'Sao Paulo', region: 'Sao Paulo', country: 'BR',
      image_url: 'https://images.unsplash.com/photo-1543059080-87f29fbfefea?w=400&h=200&fit=crop',
      member_count: 4120, created_by: null, created_at: '2024-01-01',
      live_count: 5, active_sellers: 52, lives_this_week: 38,
      unsplash_query: 'sao-paulo',
    },
    {
      id: 'br-comm-2', name: 'Rio Fashion', slug: 'rio-fashion',
      description: COMMUNITY_DESCRIPTIONS['br-comm-2'].en,
      city: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'BR',
      image_url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=200&fit=crop',
      member_count: 3245, created_by: null, created_at: '2024-01-15',
      live_count: 4, active_sellers: 41, lives_this_week: 28,
      unsplash_query: 'rio-de-janeiro',
    },
    {
      id: 'br-comm-3', name: 'Brasilia Deals', slug: 'brasilia-deals',
      description: COMMUNITY_DESCRIPTIONS['br-comm-3'].en,
      city: 'Brasilia', region: 'Distrito Federal', country: 'BR',
      image_url: 'https://images.unsplash.com/photo-1553354994-e24e0da07ef7?w=400&h=200&fit=crop',
      member_count: 1234, created_by: null, created_at: '2024-02-10',
      live_count: 2, active_sellers: 22, lives_this_week: 12,
      unsplash_query: 'brasilia',
    },
    {
      id: 'br-comm-4', name: 'Salvador Vintage', slug: 'salvador-vintage',
      description: COMMUNITY_DESCRIPTIONS['br-comm-4'].en,
      city: 'Salvador', region: 'Bahia', country: 'BR',
      image_url: 'https://images.unsplash.com/photo-1551887196-72e32bfc7bf3?w=400&h=200&fit=crop',
      member_count: 987, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 19, lives_this_week: 9,
      unsplash_query: 'salvador-brazil',
    },
    {
      id: 'br-comm-5', name: 'Belo Horizonte Market', slug: 'bh-market',
      description: COMMUNITY_DESCRIPTIONS['br-comm-5'].en,
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
      description: COMMUNITY_DESCRIPTIONS['jp-comm-1'].en,
      city: 'Tokyo', region: 'Kanto', country: 'JP',
      image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=200&fit=crop',
      member_count: 5678, created_by: null, created_at: '2024-01-01',
      live_count: 6, active_sellers: 58, lives_this_week: 45,
      unsplash_query: 'tokyo',
    },
    {
      id: 'jp-comm-2', name: 'Osaka Street Market', slug: 'osaka-street-market',
      description: COMMUNITY_DESCRIPTIONS['jp-comm-2'].en,
      city: 'Osaka', region: 'Kansai', country: 'JP',
      image_url: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=200&fit=crop',
      member_count: 3456, created_by: null, created_at: '2024-01-15',
      live_count: 4, active_sellers: 38, lives_this_week: 29,
      unsplash_query: 'osaka',
    },
    {
      id: 'jp-comm-3', name: 'Kyoto Antiques', slug: 'kyoto-antiques',
      description: COMMUNITY_DESCRIPTIONS['jp-comm-3'].en,
      city: 'Kyoto', region: 'Kansai', country: 'JP',
      image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=200&fit=crop',
      member_count: 2134, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 27, lives_this_week: 18,
      unsplash_query: 'kyoto',
    },
    {
      id: 'jp-comm-4', name: 'Yokohama Deals', slug: 'yokohama-deals',
      description: COMMUNITY_DESCRIPTIONS['jp-comm-4'].en,
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
      description: COMMUNITY_DESCRIPTIONS['de-comm-1'].en,
      city: 'Berlin', region: 'Berlin', country: 'DE',
      image_url: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=200&fit=crop',
      member_count: 3876, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 43, lives_this_week: 31,
      unsplash_query: 'berlin',
    },
    {
      id: 'de-comm-2', name: 'Munich Vintage', slug: 'munich-vintage',
      description: COMMUNITY_DESCRIPTIONS['de-comm-2'].en,
      city: 'Munich', region: 'Bayern', country: 'DE',
      image_url: 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&h=200&fit=crop',
      member_count: 2345, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 32, lives_this_week: 22,
      unsplash_query: 'munich',
    },
    {
      id: 'de-comm-3', name: 'Hamburg Deals', slug: 'hamburg-deals',
      description: COMMUNITY_DESCRIPTIONS['de-comm-3'].en,
      city: 'Hamburg', region: 'Hamburg', country: 'DE',
      image_url: 'https://images.unsplash.com/photo-1562930024-4aca28e91b10?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 26, lives_this_week: 16,
      unsplash_query: 'hamburg',
    },
    {
      id: 'de-comm-4', name: 'Frankfurt Market', slug: 'frankfurt-market',
      description: COMMUNITY_DESCRIPTIONS['de-comm-4'].en,
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
      description: COMMUNITY_DESCRIPTIONS['it-comm-1'].en,
      city: 'Roma', region: 'Lazio', country: 'IT',
      image_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=200&fit=crop',
      member_count: 3567, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 41, lives_this_week: 29,
      unsplash_query: 'rome',
    },
    {
      id: 'it-comm-2', name: 'Milano Fashion', slug: 'milano-fashion',
      description: COMMUNITY_DESCRIPTIONS['it-comm-2'].en,
      city: 'Milano', region: 'Lombardia', country: 'IT',
      image_url: 'https://images.unsplash.com/photo-1520440229-6469a149ac59?w=400&h=200&fit=crop',
      member_count: 4123, created_by: null, created_at: '2024-01-15',
      live_count: 5, active_sellers: 48, lives_this_week: 36,
      unsplash_query: 'milan',
    },
    {
      id: 'it-comm-3', name: 'Napoli Vintage', slug: 'napoli-vintage',
      description: COMMUNITY_DESCRIPTIONS['it-comm-3'].en,
      city: 'Napoli', region: 'Campania', country: 'IT',
      image_url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 28, lives_this_week: 18,
      unsplash_query: 'naples-italy',
    },
    {
      id: 'it-comm-4', name: 'Firenze Antiques', slug: 'firenze-antiques',
      description: COMMUNITY_DESCRIPTIONS['it-comm-4'].en,
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
      description: COMMUNITY_DESCRIPTIONS['il-comm-1'].en,
      city: 'Tel Aviv', region: 'Tel Aviv District', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1544991875-5dc1b05f607d?w=400&h=200&fit=crop',
      member_count: 3456, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 39, lives_this_week: 27,
      unsplash_query: 'tel-aviv',
    },
    {
      id: 'il-comm-2', name: 'Jerusalem Antiques', slug: 'jerusalem-antiques',
      description: COMMUNITY_DESCRIPTIONS['il-comm-2'].en,
      city: 'Jerusalem', region: 'Jerusalem District', country: 'IL',
      image_url: 'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=400&h=200&fit=crop',
      member_count: 2134, created_by: null, created_at: '2024-02-10',
      live_count: 3, active_sellers: 28, lives_this_week: 18,
      unsplash_query: 'jerusalem',
    },
    {
      id: 'il-comm-3', name: 'Haifa Market', slug: 'haifa-market',
      description: COMMUNITY_DESCRIPTIONS['il-comm-3'].en,
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
      description: COMMUNITY_DESCRIPTIONS['pt-comm-1'].en,
      city: 'Lisboa', region: 'Lisboa', country: 'PT',
      image_url: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=200&fit=crop',
      member_count: 2345, created_by: null, created_at: '2024-01-01',
      live_count: 3, active_sellers: 32, lives_this_week: 21,
      unsplash_query: 'lisbon',
    },
    {
      id: 'pt-comm-2', name: 'Porto Vintage', slug: 'porto-vintage',
      description: COMMUNITY_DESCRIPTIONS['pt-comm-2'].en,
      city: 'Porto', region: 'Porto', country: 'PT',
      image_url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=200&fit=crop',
      member_count: 1567, created_by: null, created_at: '2024-02-10',
      live_count: 2, active_sellers: 24, lives_this_week: 14,
      unsplash_query: 'porto',
    },
    {
      id: 'pt-comm-3', name: 'Faro Beach Market', slug: 'faro-beach-market',
      description: COMMUNITY_DESCRIPTIONS['pt-comm-3'].en,
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
      description: COMMUNITY_DESCRIPTIONS['ma-comm-1'].en,
      city: 'Casablanca', region: 'Casablanca-Settat', country: 'MA',
      image_url: 'https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?w=400&h=200&fit=crop',
      member_count: 2345, created_by: null, created_at: '2024-01-01',
      live_count: 3, active_sellers: 31, lives_this_week: 19,
      unsplash_query: 'casablanca',
    },
    {
      id: 'ma-comm-2', name: 'Marrakech Souk', slug: 'marrakech-souk',
      description: COMMUNITY_DESCRIPTIONS['ma-comm-2'].en,
      city: 'Marrakech', region: 'Marrakech-Safi', country: 'MA',
      image_url: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 2, active_sellers: 26, lives_this_week: 15,
      unsplash_query: 'marrakech',
    },
    {
      id: 'ma-comm-3', name: 'Rabat Market', slug: 'rabat-market',
      description: COMMUNITY_DESCRIPTIONS['ma-comm-3'].en,
      city: 'Rabat', region: 'Rabat-Sale-Kenitra', country: 'MA',
      image_url: 'https://images.unsplash.com/photo-1569587112025-0d460e81a126?w=400&h=200&fit=crop',
      member_count: 1234, created_by: null, created_at: '2024-03-01',
      live_count: 2, active_sellers: 21, lives_this_week: 11,
      unsplash_query: 'rabat',
    },
    {
      id: 'ma-comm-4', name: 'Tanger Bazaar', slug: 'tanger-bazaar',
      description: COMMUNITY_DESCRIPTIONS['ma-comm-4'].en,
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
      description: COMMUNITY_DESCRIPTIONS['ca-comm-1'].en,
      city: 'Toronto', region: 'Ontario', country: 'CA',
      image_url: 'https://images.unsplash.com/photo-1517090504332-af4e28e407e0?w=400&h=200&fit=crop',
      member_count: 3456, created_by: null, created_at: '2024-01-01',
      live_count: 4, active_sellers: 41, lives_this_week: 29,
      unsplash_query: 'toronto',
    },
    {
      id: 'ca-comm-2', name: 'Montreal Vintage', slug: 'montreal-vintage',
      description: COMMUNITY_DESCRIPTIONS['ca-comm-2'].en,
      city: 'Montreal', region: 'Quebec', country: 'CA',
      image_url: 'https://images.unsplash.com/photo-1519178614-68673b201f36?w=400&h=200&fit=crop',
      member_count: 2567, created_by: null, created_at: '2024-01-15',
      live_count: 3, active_sellers: 34, lives_this_week: 22,
      unsplash_query: 'montreal',
    },
    {
      id: 'ca-comm-3', name: 'Vancouver Deals', slug: 'vancouver-deals',
      description: COMMUNITY_DESCRIPTIONS['ca-comm-3'].en,
      city: 'Vancouver', region: 'British Columbia', country: 'CA',
      image_url: 'https://images.unsplash.com/photo-1559511260-66a68e7e5e8c?w=400&h=200&fit=crop',
      member_count: 1876, created_by: null, created_at: '2024-02-10',
      live_count: 2, active_sellers: 27, lives_this_week: 16,
      unsplash_query: 'vancouver',
    },
    {
      id: 'ca-comm-4', name: 'Calgary Market', slug: 'calgary-market',
      description: COMMUNITY_DESCRIPTIONS['ca-comm-4'].en,
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
