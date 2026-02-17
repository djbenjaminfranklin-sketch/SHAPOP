-- Stream favorites table
CREATE TABLE IF NOT EXISTS public.stream_favorites (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, stream_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_favorites_user ON public.stream_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_favorites_stream ON public.stream_favorites(stream_id);
