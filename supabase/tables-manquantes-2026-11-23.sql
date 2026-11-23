-- 23/11/2026 : tables absentes de la base (favoris de directs, limites de dépenses), appliquées en ligne.
CREATE TABLE IF NOT EXISTS public.stream_favorites (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, stream_id)
);
CREATE INDEX IF NOT EXISTS idx_stream_favorites_user ON public.stream_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_favorites_stream ON public.stream_favorites(stream_id);
ALTER TABLE public.stream_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY stream_favorites_select_own ON public.stream_favorites FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.spend_limits (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekly_limit numeric(10,2),
  monthly_limit numeric(10,2),
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.spend_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY spend_limits_select_own ON public.spend_limits FOR SELECT USING (auth.uid() = user_id);

-- Avis : liens vers les profils (sinon /api/sellers/:id/reviews renvoyait 500)
alter table public.reviews add constraint reviews_buyer_id_fkey foreign key (buyer_id) references public.profiles(id) on delete cascade;
alter table public.reviews add constraint reviews_seller_id_fkey foreign key (seller_id) references public.profiles(id) on delete cascade;
