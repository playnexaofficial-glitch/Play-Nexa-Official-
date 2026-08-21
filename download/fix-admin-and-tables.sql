-- ══════════════════════════════════════════════════════════════════════════════
-- Play Nexa — Complete Fix & Update Script
-- ══════════════════════════════════════════════════════════════════════════════
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This fixes admin_users, adds missing columns, and ensures all tables are correct
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── FIX 1: Add email column to admin_users (if missing) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'email'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN email TEXT NOT NULL DEFAULT 'admin@playnexa.com';
  END IF;
END $$;

-- Update existing rows with correct email
UPDATE admin_users SET email = 'admin@playnexa.com' WHERE email IS NULL OR email = '';

-- Remove duplicate admin rows (keep the most recent one per user_id)
DELETE FROM admin_users a USING admin_users b
WHERE a.created_at < b.created_at AND a.user_id = b.user_id;

-- ── FIX 2: Ensure movies table has all columns ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movies' AND column_name = 'is_hidden') THEN
    ALTER TABLE movies ADD COLUMN is_hidden BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movies' AND column_name = 'source_channel_id') THEN
    ALTER TABLE movies ADD COLUMN source_channel_id UUID REFERENCES yt_channels(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movies' AND column_name = 'language') THEN
    ALTER TABLE movies ADD COLUMN language TEXT DEFAULT '';
  END IF;
END $$;

-- ── FIX 3: Ensure music_tracks table has all columns ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'music_tracks' AND column_name = 'source_channel_id') THEN
    ALTER TABLE music_tracks ADD COLUMN source_channel_id UUID REFERENCES yt_channels(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'music_tracks' AND column_name = 'description') THEN
    ALTER TABLE music_tracks ADD COLUMN description TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'music_tracks' AND column_name = 'language') THEN
    ALTER TABLE music_tracks ADD COLUMN language TEXT DEFAULT '';
  END IF;
END $$;

-- ── FIX 4: Update yt_music feature to live ──
UPDATE app_features SET status = 'live' WHERE feature_key = 'yt_music';

-- ── FIX 5: Ensure games table exists with all columns ──
CREATE TABLE IF NOT EXISTS games (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT DEFAULT '',
  thumbnail     TEXT DEFAULT '',
  game_type     TEXT NOT NULL DEFAULT 'mini',
  game_url      TEXT DEFAULT '',
  apk_url       TEXT DEFAULT '',
  package_name  TEXT DEFAULT '',
  version       TEXT DEFAULT '1.0',
  size_mb       NUMERIC DEFAULT 0,
  is_featured   BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  play_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── FIX 6: Ensure game_downloads table exists ──
CREATE TABLE IF NOT EXISTS game_downloads (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'pending',
  progress      NUMERIC DEFAULT 0,
  file_path     TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- ── FIX 7: Ensure music_likes table exists with RLS ──
CREATE TABLE IF NOT EXISTS music_likes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  youtube_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

ALTER TABLE music_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "music_likes_own" ON music_likes;
CREATE POLICY "music_likes_own" ON music_likes FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_music_likes_user ON music_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_music_likes_track ON music_likes(track_id);

-- ── FIX 8: Ensure music_saved table exists with RLS ──
CREATE TABLE IF NOT EXISTS music_saved (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  youtube_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

ALTER TABLE music_saved ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "music_saved_own" ON music_saved;
CREATE POLICY "music_saved_own" ON music_saved FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_music_saved_user ON music_saved(user_id);
CREATE INDEX IF NOT EXISTS idx_music_saved_track ON music_saved(track_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ DONE! All tables fixed and updated.
-- Admin Login: admin@playnexa.com / PlayNexa@2024
-- ══════════════════════════════════════════════════════════════════════════════
