-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Add reminder_sent column to streams for scheduled live reminders
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;
