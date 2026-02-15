import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ISRAEL_CITIES } from '../lib/israelCities'
import type { Stream } from '../types/database'

type StreamWithSeller = Omit<Stream, 'seller'> & { seller?: { display_name: string; avatar_url: string | null; store_name?: string } }

export interface CityStreamData {
  count: number
  streams: StreamWithSeller[]
}

export type CityStreamMap = Record<string, CityStreamData>

// Demo streams for fallback when DB is empty
const demoStreams: StreamWithSeller[] = [
  {
    id: 'demo-1', seller_id: '', title: 'NEW COLLECTION', description: '', category: 'Boutiques femme',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=600&fit=crop',
    viewer_count: 60, peak_viewers: 80, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Tel Aviv',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'fashionista_tlv', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', store_name: 'fashionista_tlv' }
  },
  {
    id: 'demo-2', seller_id: '', title: 'Sneakers Drops', description: '', category: 'Sneakers',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=600&fit=crop',
    viewer_count: 48, peak_viewers: 55, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Jerusalem',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'sneaker_king', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', store_name: 'sneaker_king' }
  },
  {
    id: 'demo-3', seller_id: '', title: 'Vintage Luxe', description: '', category: 'Vintage',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=600&fit=crop',
    viewer_count: 131, peak_viewers: 150, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Haifa',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'vintage_shop', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', store_name: 'vintage_shop' }
  },
  {
    id: 'demo-4', seller_id: '', title: 'Tech Deals', description: '', category: 'Electronique',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=600&fit=crop',
    viewer_count: 108, peak_viewers: 120, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Tel Aviv',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'tech_deals_il', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', store_name: 'tech_deals_il' }
  },
  {
    id: 'demo-5', seller_id: '', title: 'Bijoux Artisanaux', description: '', category: 'Bijoux',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=600&fit=crop',
    viewer_count: 73, peak_viewers: 90, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Netanya',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'handmade_jewels', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', store_name: 'handmade_jewels' }
  },
  {
    id: 'demo-6', seller_id: '', title: 'Sport Collection', description: '', category: 'Sport',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=600&fit=crop',
    viewer_count: 45, peak_viewers: 60, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Eilat',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'sport_outlet', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', store_name: 'sport_outlet' }
  },
]

function groupByCities(streams: StreamWithSeller[]): CityStreamMap {
  const map: CityStreamMap = {}
  for (const city of ISRAEL_CITIES) {
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

export function useCityStreamCounts() {
  const [cityData, setCityData] = useState<CityStreamMap>(() => groupByCities([]))
  const [loading, setLoading] = useState(true)
  const [usingDemo, setUsingDemo] = useState(false)

  useEffect(() => {
    const fetchStreams = async () => {
      const { data } = await supabase
        .from('streams')
        .select('*, seller:profiles!seller_id(display_name, avatar_url)')
        .in('status', ['live', 'scheduled'])
        .order('viewer_count', { ascending: false })

      const streams = (data as StreamWithSeller[]) || []
      if (streams.length > 0) {
        setCityData(groupByCities(streams))
        setUsingDemo(false)
      } else {
        setCityData(groupByCities(demoStreams))
        setUsingDemo(true)
      }
      setLoading(false)
    }

    fetchStreams()

    const channel = supabase
      .channel('map-streams-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, () => {
        fetchStreams()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { cityData, loading, usingDemo }
}
