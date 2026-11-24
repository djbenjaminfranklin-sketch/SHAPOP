// Aiguillage des paiements : Israël → Rapyd, tous les autres pays → Stripe (décision du 24/11/2026).
// Tant que Rapyd n'est pas activé (RAPYD_ENABLED=true + clés), TOUT passe par Stripe, comme avant.
import { supabase } from '../config'
import { rapydConfig } from './rapyd'

export type PaymentProvider = 'stripe' | 'rapyd'

export const RAPYD_COUNTRIES = new Set(['IL'])

export function providerForCountry(country: string | null | undefined): PaymentProvider {
  const c = String(country || '').trim().toUpperCase()
  return rapydConfig().enabled && RAPYD_COUNTRIES.has(c) ? 'rapyd' : 'stripe'
}

/** Le prestataire suit le pays du VENDEUR (c'est lui qui est payé, dans sa monnaie). */
export async function providerForSeller(sellerId: string): Promise<PaymentProvider> {
  if (!rapydConfig().enabled) return 'stripe'
  const { data } = await supabase.from('profiles').select('country').eq('id', sellerId).maybeSingle()
  return providerForCountry((data as { country?: string | null } | null)?.country)
}
