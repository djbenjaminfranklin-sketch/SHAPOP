import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Stream } from '../types/database'
import type { CountryCode } from '../lib/data/communitiesData'

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
  BR: ['Sao Paulo', 'Rio de Janeiro', 'Brasilia', 'Salvador', 'Belo Horizonte'],
  JP: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama'],
  DE: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
  IT: ['Roma', 'Milano', 'Napoli', 'Firenze'],
  IL: ['Tel Aviv', 'Jerusalem', 'Haifa'],
  PT: ['Lisboa', 'Porto', 'Faro'],
  MA: ['Casablanca', 'Marrakech', 'Rabat', 'Tanger'],
  CA: ['Toronto', 'Montreal', 'Vancouver', 'Calgary'],
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
      const { data, error } = await supabase
        .from('streams')
        .select('id, seller_id, title, description, category, tags, status, thumbnail_url, viewer_count, peak_viewers, scheduled_at, started_at, ended_at, city, community_id, mux_playback_id, created_at, livekit_room_name, recording_url, seller:profiles!seller_id(display_name, avatar_url)')
        .in('status', ['live', 'scheduled'])
        .order('viewer_count', { ascending: false })

      if (error) { setLoading(false); return }
      const streams = ((data || []) as unknown as StreamWithSeller[])

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
