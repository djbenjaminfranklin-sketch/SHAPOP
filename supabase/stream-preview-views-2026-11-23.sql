-- 23/11/2026 : aperçu gratuit des directs pour les spectateurs sans carte enregistrée.
-- Une ligne par (spectateur, direct) : début du premier aperçu. Le serveur (clé service)
-- refuse le jeton LiveKit une fois FREE_PREVIEW_SECONDS (180 s par défaut) écoulées.
-- Aucune politique RLS : seul le serveur lit et écrit cette table (l'utilisateur ne doit
-- pas pouvoir effacer sa ligne pour relancer son aperçu).
CREATE TABLE IF NOT EXISTS public.stream_preview_views (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, stream_id)
);
CREATE INDEX IF NOT EXISTS idx_stream_preview_views_stream ON public.stream_preview_views(stream_id);
ALTER TABLE public.stream_preview_views ENABLE ROW LEVEL SECURITY;
