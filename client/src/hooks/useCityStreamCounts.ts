import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Stream } from '../types/database'
import { normalizeCityName, sameCity } from '../lib/cities'

type StreamWithSeller = Omit<Stream, 'seller'> & { seller?: { display_name: string; avatar_url: string | null; store_name?: string } }

export interface CityStreamData {
  count: number
  streams: StreamWithSeller[]
}

export type CityStreamMap = Record<string, CityStreamData>

/**
 * Range les lives par ville. `cityKeys` : villes proposées (noms canoniques),
 * comparées sans tenir compte des accents ni des tirets. Les lives des autres
 * villes vont dans `others` (clé = nom de ville tel qu'enregistré).
 */
export function groupStreamsByCity(streams: StreamWithSeller[], cityKeys: string[]): { cityData: CityStreamMap; others: CityStreamMap } {
  const cityData: CityStreamMap = {}
  for (const key of cityKeys) cityData[key] = { count: 0, streams: [] }
  const others: CityStreamMap = {}
  const otherKeyByNorm = new Map<string, string>()
  for (const s of streams) {
    if (!s.city) continue
    const key = cityKeys.find(k => sameCity(k, s.city))
    if (key) {
      cityData[key].count++
      cityData[key].streams.push(s)
      continue
    }
    const norm = normalizeCityName(s.city)
    const otherKey = otherKeyByNorm.get(norm) || s.city
    otherKeyByNorm.set(norm, otherKey)
    if (!others[otherKey]) others[otherKey] = { count: 0, streams: [] }
    others[otherKey].count++
    others[otherKey].streams.push(s)
  }
  return { cityData, others }
}

let channelSeq = 0

export function useCityStreamCounts(cityKeys: string[]) {
  const [streams, setStreams] = useState<StreamWithSeller[]>([])
  const [loading, setLoading] = useState(true)
  const channelName = useRef(`map-streams-${++channelSeq}`)

  useEffect(() => {
    const fetchStreams = async () => {
      const { data, error } = await supabase
        .from('streams')
        .select('id, seller_id, title, description, category, tags, status, thumbnail_url, viewer_count, peak_viewers, scheduled_at, started_at, ended_at, city, community_id, mux_playback_id, created_at, livekit_room_name, recording_url, seller:profiles!seller_id(display_name, avatar_url)')
        .in('status', ['live', 'scheduled'])
        .order('viewer_count', { ascending: false })
      if (!error) setStreams((data || []) as unknown as StreamWithSeller[])
      setLoading(false)
    }

    fetchStreams()

    const channel = supabase
      .channel(channelName.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, () => {
        fetchStreams()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const keysSig = cityKeys.join('\u0001')
  const grouped = useMemo(() => groupStreamsByCity(streams, cityKeys), [streams, keysSig])

  return { ...grouped, loading }
}
