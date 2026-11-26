// Pays d'un vendeur (pour afficher la bonne devise), avec un cache partagé : une seule requête
// par vendeur, même si 30 cartes de ses articles s'affichent en même temps.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const cache = new Map<string, Promise<string | null>>()

function loadCountry(sellerId: string): Promise<string | null> {
  let p = cache.get(sellerId)
  if (!p) {
    p = Promise.resolve(supabase.from('profiles').select('country').eq('id', sellerId).maybeSingle())
      .then(({ data }) => (data?.country as string | undefined) || null, () => null)
    cache.set(sellerId, p)
  }
  return p
}

export function useSellerCountry(sellerId: string | null | undefined, known?: string | null): string | null {
  const [country, setCountry] = useState<string | null>(known || null)
  useEffect(() => {
    if (known) { setCountry(known); return }
    if (!sellerId) return
    let alive = true
    loadCountry(sellerId).then(c => { if (alive) setCountry(c) })
    return () => { alive = false }
  }, [sellerId, known])
  return country
}
