import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Stream } from '../types/database'
import type { CountryCode } from '../lib/communitiesData'

type StreamWithSeller = Omit<Stream, 'seller'> & { seller?: { display_name: string; avatar_url: string | null; store_name?: string } }

export interface CityStreamData {
  count: number
  streams: StreamWithSeller[]
}

export type CityStreamMap = Record<string, CityStreamData>

// Cities per country
const CITIES_BY_COUNTRY: Record<CountryCode, string[]> = {
  FR: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nice', 'Toulouse', 'Strasbourg', 'Nantes'],
  ES: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Malaga', 'Bilbao'],
  US: ['New York', 'Los Angeles', 'Miami', 'Chicago', 'San Francisco', 'Austin'],
  GB: ['London', 'Manchester', 'Birmingham', 'Edinburgh'],
}

function groupByCities(streams: StreamWithSeller[], country: CountryCode): CityStreamMap {
  const cities = CITIES_BY_COUNTRY[country] || []
  const map: CityStreamMap = {}
  for (const city of cities) {
    map[city] = { count: 0, streams: [] }
  }
  for (const s of streams) {
    if (s.city && map[s.city]) {
      map[s.city].count++
      map[s.city].streams.push(s)
    }
  }
  return map
}

export function useCityStreamCounts(country: CountryCode = 'FR') {
  const [cityData, setCityData] = useState<CityStreamMap>(() => groupByCities([], country))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    const fetchStreams = async () => {
      const { data } = await supabase
        .from('streams')
        .select('*, seller:profiles!seller_id(display_name, avatar_url)')
        .in('status', ['live', 'scheduled'])
        .order('viewer_count', { ascending: false })

      const streams = (data as StreamWithSeller[]) || []

      // Filter streams that belong to this country's cities
      const countryCities = CITIES_BY_COUNTRY[country] || []
      const countryStreams = streams.filter(s => s.city && countryCities.includes(s.city))

      setCityData(groupByCities(countryStreams, country))
      setLoading(false)
    }

    fetchStreams()

    const channel = supabase
      .channel(`map-streams-${country}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, () => {
        fetchStreams()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [country])

  return { cityData, loading }
}
