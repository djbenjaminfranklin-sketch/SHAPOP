-- Clips table
CREATE TABLE IF NOT EXISTS clips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id uuid NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL DEFAULT 'Clip',
  recording_url text NOT NULL,
  start_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 60,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clips_stream ON clips(stream_id);
CREATE INDEX IF NOT EXISTS idx_clips_seller ON clips(seller_id);

ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clips_read_all" ON clips FOR SELECT USING (true);
CREATE POLICY "clips_insert_owner" ON clips FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "clips_delete_owner" ON clips FOR DELETE USING (auth.uid() = seller_id);

-- Seller Team Members table
CREATE TABLE IF NOT EXISTS seller_team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('manager', 'moderator', 'shipper')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  invited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(seller_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_seller ON seller_team_members(seller_id);
CREATE INDEX IF NOT EXISTS idx_team_user ON seller_team_members(user_id);

ALTER TABLE seller_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_read_own" ON seller_team_members FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = user_id);
CREATE POLICY "team_insert_seller" ON seller_team_members FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "team_update_own" ON seller_team_members FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = user_id);
