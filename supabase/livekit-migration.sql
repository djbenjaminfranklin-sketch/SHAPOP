-- Migration: Add LiveKit room name column to streams table
-- Run this in Supabase SQL Editor before using LiveKit features

ALTER TABLE streams ADD COLUMN IF NOT EXISTS livekit_room_name TEXT;
