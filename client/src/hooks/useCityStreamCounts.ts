import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Stream } from '../types/database'
import { getCommunitiesByCountry, detectUserCountry, type CountryCode } from '../lib/data/communitiesData'

type StreamWithSeller = Omit<Stream, 'seller'> & { seller?: { display_name: string; avatar_url: string | null; store_name?: string } }

export interface CityStreamData {
  count: number
  streams: StreamWithSeller[]
}

export type CityStreamMap = Record<string, CityStreamData>

// Villes d'un pays : celles de ses communautés (aucune liste propre à un pays en dur)
function citiesForCountry(country: CountryCode): string[] {
  return Array.from(new Set(getCommunitiesByCountry(country).map(c => c.city).filter(Boolean)))
}

function groupByCities(streams: StreamWithSeller[], country: CountryCode): CityStreamMap {
  const cities = citiesForCountry(country)
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

export function useCityStreamCounts(country: CountryCode = detectUserCountry()) {
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
      const countryCities = citiesForCountry(country)
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
