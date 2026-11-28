// Faux directs pour ESSAYER le défilement de l'accueil (28/11/2026, demande de Benjamin).
// Uniquement dans une version compilée avec VITE_DEMO_LIVES=1 (installée à la main sur ses iPhone) :
// jamais dans la base, jamais dans les versions des stores. Toucher une fausse carte ne mène nulle part.
export const DEMO_LIVES_ENABLED = import.meta.env.VITE_DEMO_LIVES === '1'

const TITLES = ['Sneakers rares', 'Montres vintage', 'Sacs de créateurs', 'Cartes Pokémon', 'Bijoux en or', 'Vinyles collector',
  'Parfums de niche', 'Lunettes de soleil', 'Figurines manga', 'Vestes en cuir', 'Casques audio', 'Robes de soirée',
  'Céramiques artisanales', 'Jeux vidéo rétro', 'Montres connectées', 'Sacs à dos', 'Mode enfant', 'Déco maison',
  'Livres anciens', 'Accessoires vélo']

export function demoLives<T>(): T[] {
  const now = Date.now()
  return TITLES.map((title, i) => ({
    id: `demo-${i}`,
    seller_id: `demo-seller-${i}`,
    title,
    description: null,
    category: 'Mode',
    tags: [],
    status: i % 4 === 3 ? 'scheduled' : 'live',
    thumbnail_url: `https://picsum.photos/seed/shapop${i}/400/600`,
    viewer_count: 40 + ((i * 37) % 300),
    peak_viewers: 0, engagement_score: 0, avg_watch_time_seconds: 0, total_reactions: 0,
    scheduled_at: i % 4 === 3 ? new Date(now + (i + 1) * 3600_000).toISOString() : null,
    started_at: new Date(now - (i + 1) * 300_000).toISOString(),
    ended_at: null, city: 'Tel Aviv', community_id: null, mux_playback_id: null,
    created_at: new Date(now - (i + 1) * 300_000).toISOString(),
    livekit_room_name: null, recording_url: null, is_boosted: false,
    seller: { display_name: `Vendeur démo ${i + 1}`, avatar_url: `https://picsum.photos/seed/avatar${i}/80/80` },
  })) as unknown as T[]
}
