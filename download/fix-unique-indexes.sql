-- ── Play Nexa — Unique Index Fix for Movies & Music ──────────
-- Run this in Supabase SQL Editor to add unique constraints
-- This prevents duplicate entries when re-scanning channels

-- Fix 1: Add unique index on movies.youtube_id
CREATE UNIQUE INDEX IF NOT EXISTS
  idx_movies_youtube_id_unique
  ON movies (youtube_id);

-- Fix 2: Add unique index on music_tracks.youtube_id
CREATE UNIQUE INDEX IF NOT EXISTS
  idx_music_tracks_youtube_id_unique
  ON music_tracks (youtube_id);
