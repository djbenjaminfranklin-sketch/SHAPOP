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
  phone_number: string | null
  phone_verified: boolean
  stripe_customer_id: string | null
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
  return_policy: 'no_return' | 'exchange_only' | 'return_7' | 'return_14' | 'return_30'
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
  livekit_room_name?: string | null
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
  min_price: number | null
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
  shipping_proof_url: string | null
  tracking_number: string | null
  stripe_payment_intent_id: string | null
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  claim_deadline: string | null
  payout_scheduled_at: string | null
  holdback_percent: number
  payout_status: string
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
  is_flagged: boolean
  flag_reason: string | null
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

export interface Dispute {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  reason: 'not_received' | 'wrong_item' | 'damaged' | 'not_as_described' | 'counterfeit'
  description: string
  evidence_urls: string[]
  status: 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'escalated'
  resolution_note: string | null
  auto_refund: boolean
  amount: number
  opened_at: string
  resolved_at: string | null
  created_at: string
}

export interface BuyerScore {
  user_id: string
  score: number
  total_orders: number
  total_disputes: number
  disputes_won: number
  disputes_lost: number
  total_refunds: number
  refund_amount: number
  last_dispute_at: string | null
  risk_level: 'low' | 'medium' | 'high' | 'blocked'
  updated_at: string
}

export interface SellerTrust {
  seller_id: string
  trust_level: 'new' | 'standard' | 'trusted' | 'premium'
  total_completed_orders: number
  total_disputes_against: number
  disputes_lost: number
  avg_ship_time_hours: number
  positive_delivery_rate: number
  holdback_percent: number
  payout_delay_days: number
  proof_level: 'basic' | 'standard' | 'enhanced'
  manually_set: boolean
  updated_at: string
}

export interface ShippingProof {
  id: string
  order_id: string
  seller_id: string
  type: 'photo_package' | 'photo_content' | 'video_packing'
  url: string
  uploaded_at: string
}

export interface Conversation {
  id: string
  type: 'order' | 'support' | 'dispute'
  order_id: string | null
  participant_1: string
  participant_2: string
  status: 'active' | 'closed' | 'archived'
  created_at: string
  other_participant?: Profile
  last_message?: ConversationMessage
  order?: Order
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  is_system: boolean
  is_flagged: boolean
  flag_reason: string | null
  attachment_urls: string[]
  created_at: string
  sender?: Profile
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; username: string; display_name: string }; Update: Partial<Profile>; Relationships: [] }
      addresses: { Row: Address; Insert: Partial<Address> & { user_id: string; name: string; street: string; city: string; zip: string }; Update: Partial<Address>; Relationships: [] }
      sellers: { Row: Seller; Insert: Partial<Seller> & { id: string; store_name: string }; Update: Partial<Seller>; Relationships: [] }
      streams: { Row: Stream; Insert: Partial<Stream> & { seller_id: string; title: string; category: string }; Update: Partial<Stream>; Relationships: [] }
      items: { Row: Item; Insert: Partial<Item> & { seller_id: string; title: string; category: string; starting_price: number; current_price: number }; Update: Partial<Item>; Relationships: [] }
      bids: { Row: Bid; Insert: { item_id: string; bidder_id: string; amount: number }; Update: never; Relationships: [] }
      orders: { Row: Order; Insert: Partial<Order> & { buyer_id: string; seller_id: string; item_id: string; amount: number; platform_fee: number; processing_fee: number; seller_payout: number }; Update: Partial<Order>; Relationships: [] }
      communities: { Row: Community; Insert: Partial<Community> & { name: string; slug: string; city: string }; Update: Partial<Community>; Relationships: [] }
      chat_messages: { Row: ChatMessage; Insert: { stream_id: string; user_id: string; message: string; type?: string }; Update: never; Relationships: [] }
      engagement_metrics: { Row: EngagementMetrics; Insert: Partial<EngagementMetrics> & { stream_id: string; timestamp: string }; Update: Partial<EngagementMetrics>; Relationships: [] }
      user_preferences: { Row: UserPreferences; Insert: Partial<UserPreferences> & { user_id: string }; Update: Partial<UserPreferences>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
