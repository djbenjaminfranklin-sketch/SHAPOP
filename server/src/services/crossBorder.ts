// Vendeur israélien PROFESSIONNEL -> acheteur de l'Union européenne : achat bloqué (28/11/2026).
// 1) TVA : une entreprise hors UE qui vend un bien ≤ 150 € à un particulier de l'UE fait de la plateforme le
//    redevable de la TVA (directive TVA art. 14 bis, CGI art. 256 V) ; la franchise de ShaPop ne l'en dispense pas.
// 2) Marques : un objet authentique vendu d'abord hors de l'EEE peut être bloqué en douane (CJUE Silhouette,
//    C-355/96 ; Blomqvist, C-98/13 : le vendeur pro qui expédie importe).
// Les particuliers israéliens ne sont pas concernés. Regarder le direct reste possible.
import type { Response, NextFunction } from 'express'
import { supabase } from '../config'
import type { AuthenticatedRequest } from '../types'

export const EU_COUNTRIES = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'])
export const BLOCKED_ERROR = 'eu_buyer_il_pro_seller'

export function isCrossBorderBlocked(buyerCountry: string | null | undefined, sellerCountry: string | null | undefined, sellerType: string | null | undefined): boolean {
  return sellerType === 'business' && (sellerCountry || '').toUpperCase() === 'IL' && EU_COUNTRIES.has((buyerCountry || '').toUpperCase())
}

export async function buyerBlockedFromSeller(buyerId: string, sellerId: string): Promise<boolean> {
  const [{ data: buyer }, { data: sellerProfile }, { data: seller }] = await Promise.all([
    supabase.from('profiles').select('country').eq('id', buyerId).maybeSingle(),
    supabase.from('profiles').select('country').eq('id', sellerId).maybeSingle(),
    supabase.from('sellers').select('seller_type').eq('id', sellerId).maybeSingle(),
  ])
  return isCrossBorderBlocked(buyer?.country, sellerProfile?.country, seller?.seller_type)
}

/** Garde à placer sur toute route d'achat dont l'article est req.params.id (ou req.body.item_id). */
export async function crossBorderGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = String(req.params.id || req.body?.item_id || '')
    if (!itemId || !req.user) { next(); return }
    const { data: item } = await supabase.from('items').select('seller_id').eq('id', itemId).maybeSingle()
    if (item?.seller_id && await buyerBlockedFromSeller(req.user.id, item.seller_id)) {
      res.status(403).json({ error: BLOCKED_ERROR })
      return
    }
    next()
  } catch (err) {
    console.error('[crossBorder]', err)
    next()
  }
}
