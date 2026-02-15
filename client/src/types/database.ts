export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  is_seller: boolean
  city: string | null
  country: string
  language: string
  joined_communities: string[]
  created_at: string
}

export interface Address {
  id: string
  user_id: string
  name: string
  street: string
  city: string
  zip: string
  phone: string | null
  is_default: boolean
  created_at: string
}

export interface Seller {
  id: string
  store_name: string
  store_description: string | null
  store_banner_url: string | null
  store_banner_colors: string[]
  store_tagline: string | null
  store_intro_video_url: string | null
  stripe_account_id: string | null
  kyc_status: 'pending' | 'verified' | 'rejected'
  rating: number
  total_sales: number
  total_revenue: number
  categories: string[]
  sub_categories: string[]
  seller_type: string | null
  selling_locations: string[]
  platforms: string[]
  etsy_url: string | null
  revenue_range: string | null
  team_size: string | null
  live_hours: string | null
  return_address: Record<string, string> | null
  bank_choice: string | null
  onboarding_completed_at: string | null
  verified_at: string | null
  created_at: string
  profiles?: Profile
}

export interface Stream {
  id: string
  seller_id: string
  title: string
  description: string | null
  category: string
  tags: string[]
  status: 'scheduled' | 'live' | 'ended'
  thumbnail_url: string | null
  viewer_count: number
  peak_viewers: number
  engagement_score: number
  avg_watch_time_seconds: number
  total_reactions: number
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  city: string | null
  community_id: string | null
  mux_stream_id?: string | null
  mux_playback_id?: string | null
  mux_stream_key?: string | null
  mux_asset_id?: string | null
  created_at: string
  seller?: Seller & { profiles?: Profile }
  matching_score?: number
}

export type AuctionItem = Item

export interface Item {
  id: string
  seller_id: string
  stream_id: string | null
  title: string
  description: string | null
  category: string
  subcategory: string | null
  image_urls: string[]
  starting_price: number
  current_price: number
  estimated_price_low: number | null
  estimated_price_high: number | null
  ai_generated: boolean
  ai_tags: string[]
  ai_condition: string | null
  ai_confidence: number | null
  status: 'draft' | 'pending' | 'active' | 'sold' | 'unsold'
  winner_id: string | null
  duration_seconds: number
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface Bid {
  id: string
  item_id: string
  bidder_id: string
  amount: number
  is_winning: boolean
  created_at: string
}

export interface Order {
  id: string
  buyer_id: string
  seller_id: string
  item_id: string
  stream_id: string | null
  amount: number
  platform_fee: number
  processing_fee: number
  seller_payout: number
  status: 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'refunded' | 'disputed'
  shipping_address: Record<string, string> | null
  tracking_number: string | null
  stripe_payment_intent_id: string | null
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
}

export interface Community {
  id: string
  name: string
  slug: string
  description: string | null
  city: string
  region: string | null
  country: string
  image_url: string | null
  member_count: number
  created_by: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  stream_id: string
  user_id: string
  message: string
  type: 'message' | 'reaction' | 'bid_notification' | 'system'
  created_at: string
  user_profile?: { display_name: string }
}

export interface EngagementMetrics {
  id: string
  stream_id: string
  timestamp: string
  viewer_count: number
  active_chatters: number
  bids_count: number
  reactions_count: number
  new_followers: number
  engagement_rate: number
  sentiment_score: number
  energy_level: 'low' | 'medium' | 'high' | 'peak'
}

export interface UserPreferences {
  user_id: string
  favorite_categories: string[]
  favorite_sellers: string[]
  price_range_min: number
  price_range_max: number
  preferred_cities: string[]
  last_updated: string
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; username: string; display_name: string }; Update: Partial<Profile> }
      addresses: { Row: Address; Insert: Partial<Address> & { user_id: string; name: string; street: string; city: string; zip: string }; Update: Partial<Address> }
      sellers: { Row: Seller; Insert: Partial<Seller> & { id: string; store_name: string }; Update: Partial<Seller> }
      streams: { Row: Stream; Insert: Partial<Stream> & { seller_id: string; title: string; category: string }; Update: Partial<Stream> }
      items: { Row: Item; Insert: Partial<Item> & { seller_id: string; title: string; category: string; starting_price: number; current_price: number }; Update: Partial<Item> }
      bids: { Row: Bid; Insert: { item_id: string; bidder_id: string; amount: number }; Update: never }
      orders: { Row: Order; Insert: Partial<Order> & { buyer_id: string; seller_id: string; item_id: string; amount: number; platform_fee: number; processing_fee: number; seller_payout: number }; Update: Partial<Order> }
      communities: { Row: Community; Insert: Partial<Community> & { name: string; slug: string; city: string }; Update: Partial<Community> }
      chat_messages: { Row: ChatMessage; Insert: { stream_id: string; user_id: string; message: string; type?: string }; Update: never }
      engagement_metrics: { Row: EngagementMetrics; Insert: Partial<EngagementMetrics> & { stream_id: string; timestamp: string }; Update: Partial<EngagementMetrics> }
      user_preferences: { Row: UserPreferences; Insert: Partial<UserPreferences> & { user_id: string }; Update: Partial<UserPreferences> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
