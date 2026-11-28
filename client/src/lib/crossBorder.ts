// Même règle que le serveur (server/src/services/crossBorder.ts) : un acheteur de l'Union européenne ne peut pas
// acheter dans le direct d'un vendeur israélien PROFESSIONNEL (TVA à l'importation, droits des marques).
const EU = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'])

export function isCrossBorderBlocked(buyerCountry: string | null | undefined, sellerCountry: string | null | undefined, sellerType: string | null | undefined): boolean {
  return sellerType === 'business' && (sellerCountry || '').toUpperCase() === 'IL' && EU.has((buyerCountry || '').toUpperCase())
}
