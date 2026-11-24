// Aiguillage des paiements (décision du 24/11/2026) : Israël → Airwallex (Rapyd en réserve),
// tous les autres pays → Stripe. Tant qu'aucun prestataire israélien n'est activé, TOUT passe par Stripe.
import { supabase } from '../config'
import { rapydConfig } from './rapyd'
import { airwallexConfig } from './airwallex'

export type PaymentProvider = 'stripe' | 'rapyd' | 'airwallex'

export const ISRAEL_COUNTRIES = new Set(['IL'])
export const RAPYD_COUNTRIES = ISRAEL_COUNTRIES

export function israelProvider(): PaymentProvider | null {
  if (airwallexConfig().enabled) return 'airwallex'
  if (rapydConfig().enabled) return 'rapyd'
  return null
}

export function providerForCountry(country: string | null | undefined): PaymentProvider {
  const c = String(country || '').trim().toUpperCase()
  const il = israelProvider()
  return il && ISRAEL_COUNTRIES.has(c) ? il : 'stripe'
}

/** Le prestataire suit le pays du VENDEUR (c'est lui qui est payé, dans sa monnaie). */
export async function providerForSeller(sellerId: string): Promise<PaymentProvider> {
  if (!israelProvider()) return 'stripe'
  const { data } = await supabase.from('profiles').select('country').eq('id', sellerId).maybeSingle()
  return providerForCountry((data as { country?: string | null } | null)?.country)
}
