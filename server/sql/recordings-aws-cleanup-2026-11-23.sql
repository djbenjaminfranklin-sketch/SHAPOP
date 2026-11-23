-- Old live recordings pointed to an AWS S3 bucket (shapop-recordings, eu-west-3)
-- that is closed: every link is dead. Recordings now go to Cloudflare R2
-- (RECORDING_PUBLIC_BASE_URL). Applied on 2026-11-23: 13 streams, 0 clips.

-- Clips only point to a recording (clips.recording_url is NOT NULL): remove dead ones.
delete from public.clips where recording_url ilike '%amazonaws.com%';

-- Streams: forget the dead recording link (the UI hides "replay" when null).
update public.streams set recording_url = null where recording_url ilike '%amazonaws.com%';
