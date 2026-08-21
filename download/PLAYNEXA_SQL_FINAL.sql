-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  PLAY NEXA — Complete Database Schema (Fresh Install)           ║
-- ║  Just paste & run — auto-deletes old tables, creates new ones   ║
-- ║  25 Tables · 1 View · 9 RPCs · 40+ RLS · 30+ Indexes · Seeds  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ━━━ CLEAN SLATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP VIEW IF EXISTS channel_display_with_info CASCADE;
DROP FUNCTION IF EXISTS upsert_missing_request CASCADE;
DROP FUNCTION IF EXISTS fetch_user_game_data CASCADE;
DROP FUNCTION IF EXISTS fetch_game_score CASCADE;
DROP FUNCTION IF EXISTS upsert_game_score CASCADE;
DROP FUNCTION IF EXISTS fetch_user_coins CASCADE;
DROP FUNCTION IF EXISTS fetch_leaderboard CASCADE;
DROP FUNCTION IF EXISTS deduct_user_coins CASCADE;
DROP FUNCTION IF EXISTS register_push_token CASCADE;
DROP FUNCTION IF EXISTS unregister_push_token CASCADE;
DROP FUNCTION IF EXISTS notify_new_video CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON yt_channels CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON channel_display CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON app_features CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON app_settings CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON games CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON user_profiles CASCADE;
DROP TRIGGER IF EXISTS trigger_notify_new_video ON videos CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS on_new_video CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TABLE IF EXISTS game_downloads CASCADE;
DROP TABLE IF EXISTS game_data CASCADE;
DROP TABLE IF EXISTS game_scores CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS missing_requests CASCADE;
DROP TABLE IF EXISTS notification_log CASCADE;
DROP TABLE IF EXISTS notifications_log CASCADE;
DROP TABLE IF EXISTS admin_activity_log CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS music_saved CASCADE;
DROP TABLE IF EXISTS music_likes CASCADE;
DROP TABLE IF EXISTS user_history CASCADE;
DROP TABLE IF EXISTS user_watchlist CASCADE;
DROP TABLE IF EXISTS user_likes CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS ai_scan_jobs CASCADE;
DROP TABLE IF EXISTS channel_display CASCADE;
DROP TABLE IF EXISTS music_tracks CASCADE;
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS app_features CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS yt_channels CASCADE;

-- ━━━ CUSTOM TYPE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TYPE request_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- ━━━ SHARED TRIGGER FUNCTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLES (25)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. yt_channels
CREATE TABLE yt_channels (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_url          TEXT NOT NULL,
  channel_id           TEXT NOT NULL UNIQUE,
  channel_name         TEXT NOT NULL,
  channel_avatar       TEXT,
  channel_type         TEXT NOT NULL DEFAULT 'movies' CHECK (channel_type IN ('movies','music','mixed')),
  filter_keywords     TEXT[] NOT NULL DEFAULT '{}',
  exclude_keywords    TEXT[] NOT NULL DEFAULT '{}',
  auto_sync           BOOLEAN NOT NULL DEFAULT true,
  sync_interval       INTEGER NOT NULL DEFAULT 6,
  last_synced_at      TIMESTAMPTZ,
  total_imported      INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  scan_status         TEXT NOT NULL DEFAULT 'idle' CHECK (scan_status IN ('idle','scanning','paused','completed')),
  scan_batch          INTEGER NOT NULL DEFAULT 0,
  scanned_video_ids   JSONB NOT NULL DEFAULT '[]',
  videos_imported     INTEGER NOT NULL DEFAULT 0,
  total_videos_on_channel INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON yt_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. movies
CREATE TABLE movies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id           TEXT NOT NULL,
  title                TEXT NOT NULL,
  thumbnail            TEXT,
  channel_name         TEXT NOT NULL DEFAULT '',
  channel_id           TEXT NOT NULL DEFAULT '',
  published_at         TIMESTAMPTZ,
  view_count           BIGINT NOT NULL DEFAULT 0,
  description          TEXT NOT NULL DEFAULT '',
  duration             TEXT NOT NULL DEFAULT '',
  is_hidden            BOOLEAN NOT NULL DEFAULT false,
  source_channel_id    UUID REFERENCES yt_channels(id) ON DELETE SET NULL,
  language             TEXT NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (youtube_id)
);

-- 3. music_tracks
CREATE TABLE music_tracks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id           TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  thumbnail            TEXT NOT NULL,
  channel_name         TEXT NOT NULL,
  channel_id           TEXT NOT NULL,
  duration             TEXT,
  published_at         TIMESTAMPTZ,
  view_count           INTEGER NOT NULL DEFAULT 0,
  is_hidden            BOOLEAN NOT NULL DEFAULT false,
  source_channel_id    UUID REFERENCES yt_channels(id) ON DELETE SET NULL,
  description          TEXT NOT NULL DEFAULT '',
  language             TEXT NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. channel_display
CREATE TABLE channel_display (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id           TEXT NOT NULL UNIQUE,
  display_name         TEXT NOT NULL,
  logo_url             TEXT,
  badge_color          TEXT NOT NULL DEFAULT '#7C3AED',
  border_color         TEXT NOT NULL DEFAULT '#2D2D2D',
  is_visible           BOOLEAN NOT NULL DEFAULT true,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channel_display FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. ai_scan_jobs
CREATE TABLE ai_scan_jobs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name         TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'scanning' CHECK (status IN ('scanning','completed','failed')),
  total_videos         INTEGER NOT NULL DEFAULT 0,
  processed            INTEGER NOT NULL DEFAULT 0,
  movies_found         INTEGER NOT NULL DEFAULT 0,
  music_found          INTEGER NOT NULL DEFAULT 0,
  skipped              INTEGER NOT NULL DEFAULT 0,
  error_message        TEXT,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at         TIMESTAMPTZ
);

-- 6. sync_logs
CREATE TABLE sync_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id           UUID NOT NULL REFERENCES yt_channels(id) ON DELETE CASCADE,
  channel_name         TEXT,
  videos_found         INTEGER NOT NULL DEFAULT 0,
  videos_added         INTEGER NOT NULL DEFAULT 0,
  videos_skipped       INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','partial')),
  error_message        TEXT,
  synced_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. user_profiles
CREATE TABLE user_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         TEXT NOT NULL DEFAULT '',
  email                TEXT,
  avatar_url           TEXT,
  auth_provider        TEXT NOT NULL DEFAULT 'email',
  coins                INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. user_likes
CREATE TABLE user_likes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id             UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  youtube_id           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, movie_id)
);

-- 9. user_watchlist
CREATE TABLE user_watchlist (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id             UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  youtube_id           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, movie_id)
);

-- 10. user_history
CREATE TABLE user_history (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id             UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  youtube_id           TEXT,
  watched_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  watch_count          INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, movie_id)
);

-- 11. music_likes
CREATE TABLE music_likes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id             UUID NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  youtube_id           TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);

-- 12. music_saved
CREATE TABLE music_saved (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id             UUID NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  youtube_id           TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);

-- 13. admin_users
CREATE TABLE admin_users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT NOT NULL,
  role                 TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin','admin')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. admin_activity_log
CREATE TABLE admin_activity_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id             UUID,
  action               TEXT NOT NULL,
  target               TEXT NOT NULL,
  details              JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. app_features
CREATE TABLE app_features (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key          TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  label                TEXT NOT NULL DEFAULT '',
  icon                 TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','hidden','coming_soon','locked','maintenance')),
  description          TEXT NOT NULL DEFAULT '',
  coming_soon_message  TEXT NOT NULL DEFAULT '',
  lock_reason          TEXT NOT NULL DEFAULT '',
  sort_order           INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. app_settings
CREATE TABLE app_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                  TEXT NOT NULL UNIQUE,
  value                TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. games
CREATE TABLE games (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  description          TEXT,
  category             TEXT NOT NULL,
  game_type            TEXT NOT NULL DEFAULT 'offline' CHECK (game_type IN ('offline','download','online','mini')),
  apk_url              TEXT,
  web_url              TEXT,
  cover_url            TEXT NOT NULL,
  size                 TEXT NOT NULL DEFAULT '0 MB',
  version              TEXT NOT NULL DEFAULT '1.0',
  min_android          TEXT NOT NULL DEFAULT '5.0',
  is_featured          BOOLEAN NOT NULL DEFAULT false,
  is_hidden            BOOLEAN NOT NULL DEFAULT false,
  is_free              BOOLEAN NOT NULL DEFAULT true,
  downloads            INTEGER NOT NULL DEFAULT 0,
  rating               REAL NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 18. game_data
CREATE TABLE game_data (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  game_slug            TEXT NOT NULL,
  high_score           INTEGER NOT NULL DEFAULT 0,
  coins                INTEGER NOT NULL DEFAULT 0,
  plays                INTEGER NOT NULL DEFAULT 0,
  last_played          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_slug)
);

-- 19. game_scores
CREATE TABLE game_scores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_slug            TEXT NOT NULL,
  high_score           INTEGER NOT NULL DEFAULT 0,
  coins                INTEGER NOT NULL DEFAULT 0,
  plays                INTEGER NOT NULL DEFAULT 0,
  last_played          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_slug)
);

-- 20. game_downloads
CREATE TABLE game_downloads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id              UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  downloaded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  status               TEXT NOT NULL DEFAULT 'pending',
  progress             NUMERIC NOT NULL DEFAULT 0,
  file_path            TEXT NOT NULL DEFAULT '',
  UNIQUE (user_id, game_id)
);

-- 21. notifications_log
CREATE TABLE notifications_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                TEXT NOT NULL,
  body                 TEXT NOT NULL,
  message              TEXT NOT NULL DEFAULT '',
  sent_to              TEXT NOT NULL DEFAULT 'all',
  target               TEXT NOT NULL DEFAULT 'all',
  icon                 TEXT NOT NULL DEFAULT '',
  action_url           TEXT NOT NULL DEFAULT '',
  sent_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_count           INTEGER NOT NULL DEFAULT 0
);

-- 22. notification_log
CREATE TABLE notification_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                TEXT NOT NULL,
  body                 TEXT NOT NULL,
  category             TEXT NOT NULL DEFAULT 'new_content',
  sent_count           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. videos
CREATE TABLE videos (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  yt_video_id          TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  thumbnail_url        TEXT,
  category             TEXT NOT NULL DEFAULT 'movie' CHECK (category IN ('movie','music','short')),
  genre                TEXT[] NOT NULL DEFAULT '{}',
  duration_sec         INTEGER NOT NULL DEFAULT 0,
  channel              TEXT NOT NULL DEFAULT '',
  language             TEXT NOT NULL DEFAULT 'English',
  region               TEXT NOT NULL DEFAULT 'international' CHECK (region IN ('bangladesh','india','international')),
  dubbed_tags          TEXT[] NOT NULL DEFAULT '{}',
  views                BIGINT NOT NULL DEFAULT 0,
  source               TEXT NOT NULL DEFAULT 'manual',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 24. missing_requests
CREATE TABLE missing_requests (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  search_query         TEXT NOT NULL,
  category             TEXT NOT NULL DEFAULT 'movie',
  status               request_status NOT NULL DEFAULT 'pending',
  request_count        INTEGER NOT NULL DEFAULT 1,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (search_query, category)
);

-- 25. push_subscriptions
CREATE TABLE push_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_token         TEXT NOT NULL UNIQUE,
  platform             TEXT NOT NULL DEFAULT 'web',
  device_info          TEXT NOT NULL DEFAULT '',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INDEXES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_movies_youtube_id ON movies (youtube_id);
CREATE INDEX idx_movies_channel_name ON movies (channel_name);
CREATE INDEX idx_movies_is_hidden ON movies (is_hidden);
CREATE INDEX idx_movies_created_at ON movies (created_at DESC);
CREATE INDEX idx_movies_source_channel ON movies (source_channel_id);
CREATE INDEX idx_music_youtube_id ON music_tracks (youtube_id);
CREATE INDEX idx_music_channel ON music_tracks (channel_name);
CREATE INDEX idx_music_is_hidden ON music_tracks (is_hidden);
CREATE INDEX idx_music_source_channel ON music_tracks (source_channel_id);
CREATE INDEX idx_yt_channels_channel_id ON yt_channels (channel_id);
CREATE INDEX idx_yt_channels_is_active ON yt_channels (is_active);
CREATE INDEX idx_yt_channels_channel_type ON yt_channels (channel_type);
CREATE INDEX idx_user_likes_user ON user_likes (user_id);
CREATE INDEX idx_user_likes_movie ON user_likes (movie_id);
CREATE INDEX idx_user_watchlist_user ON user_watchlist (user_id);
CREATE INDEX idx_user_watchlist_movie ON user_watchlist (movie_id);
CREATE INDEX idx_user_history_user ON user_history (user_id);
CREATE INDEX idx_user_history_watched ON user_history (watched_at DESC);
CREATE INDEX idx_music_likes_user ON music_likes (user_id);
CREATE INDEX idx_music_saved_user ON music_saved (user_id);
CREATE INDEX idx_games_category ON games (category);
CREATE INDEX idx_games_game_type ON games (game_type);
CREATE INDEX idx_games_is_hidden ON games (is_hidden);
CREATE INDEX idx_sync_logs_channel ON sync_logs (channel_id);
CREATE INDEX idx_ai_scan_jobs_status ON ai_scan_jobs (status);
CREATE INDEX idx_app_features_key ON app_features (feature_key);
CREATE INDEX idx_app_settings_key ON app_settings (key);
CREATE INDEX idx_admin_users_user_id ON admin_users (user_id);
CREATE INDEX idx_admin_activity_created ON admin_activity_log (created_at DESC);
CREATE INDEX idx_videos_yt_video_id ON videos (yt_video_id);
CREATE INDEX idx_videos_category ON videos (category);
CREATE INDEX idx_videos_region ON videos (region);
CREATE INDEX idx_missing_requests_status ON missing_requests (status);
CREATE INDEX idx_missing_requests_query ON missing_requests (search_query);
CREATE INDEX idx_push_subs_user ON push_subscriptions (user_id);
CREATE INDEX idx_push_subs_active ON push_subscriptions (is_active);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ROW LEVEL SECURITY (RLS)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE yt_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_display ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_saved ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- movies
CREATE POLICY "movies_public_read" ON movies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "movies_auth_insert" ON movies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "movies_auth_update" ON movies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "movies_service_role_all" ON movies FOR ALL TO service_role USING (true) WITH CHECK (true);

-- music_tracks
CREATE POLICY "music_public_read" ON music_tracks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "music_auth_manage" ON music_tracks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "music_service_role_all" ON music_tracks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- yt_channels
CREATE POLICY "channels_public_read" ON yt_channels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "channels_auth_admin" ON yt_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "channels_service_role_all" ON yt_channels FOR ALL TO service_role USING (true) WITH CHECK (true);

-- channel_display
CREATE POLICY "channel_display_public_read" ON channel_display FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "channel_display_auth_admin" ON channel_display FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "channel_display_service_role_all" ON channel_display FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ai_scan_jobs
CREATE POLICY "scan_jobs_public_read" ON ai_scan_jobs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "scan_jobs_auth_admin" ON ai_scan_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "scan_jobs_service_role_all" ON ai_scan_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- sync_logs
CREATE POLICY "sync_logs_public_read" ON sync_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sync_logs_service_role_all" ON sync_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_profiles
CREATE POLICY "profiles_read_own" ON user_profiles FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "profiles_insert_own" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "profiles_service_role_all" ON user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_likes
CREATE POLICY "user_likes_own" ON user_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_likes_service_role_all" ON user_likes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_watchlist
CREATE POLICY "user_watchlist_own" ON user_watchlist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_watchlist_service_role_all" ON user_watchlist FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_history
CREATE POLICY "user_history_own" ON user_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_history_service_role_all" ON user_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- music_likes
CREATE POLICY "music_likes_own" ON music_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "music_likes_service_role_all" ON music_likes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- music_saved
CREATE POLICY "music_saved_own" ON music_saved FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "music_saved_service_role_all" ON music_saved FOR ALL TO service_role USING (true) WITH CHECK (true);

-- admin_users
CREATE POLICY "admin_users_service_role_read" ON admin_users FOR SELECT TO service_role USING (true);
CREATE POLICY "admin_users_own_check" ON admin_users FOR SELECT USING (auth.uid() = user_id);

-- admin_activity_log
CREATE POLICY "admin_activity_service_role_all" ON admin_activity_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin_activity_auth_read" ON admin_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_activity_auth_insert" ON admin_activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- app_features
CREATE POLICY "features_public_read" ON app_features FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "features_auth_manage" ON app_features FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "features_service_role_all" ON app_features FOR ALL TO service_role USING (true) WITH CHECK (true);

-- app_settings
CREATE POLICY "settings_public_read" ON app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_auth_manage" ON app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "settings_service_role_all" ON app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- games
CREATE POLICY "games_public_read" ON games FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "games_auth_admin" ON games FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "games_service_role_all" ON games FOR ALL TO service_role USING (true) WITH CHECK (true);

-- game_data
CREATE POLICY "game_data_own" ON game_data FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())) WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "game_data_service_role_all" ON game_data FOR ALL TO service_role USING (true) WITH CHECK (true);

-- game_scores
CREATE POLICY "game_scores_own" ON game_scores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "game_scores_service_role_all" ON game_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- game_downloads
CREATE POLICY "game_downloads_user_own" ON game_downloads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "game_downloads_service_role_all" ON game_downloads FOR ALL TO service_role USING (true) WITH CHECK (true);

-- notifications_log
CREATE POLICY "notifications_log_auth_manage" ON notifications_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notifications_log_service_role_all" ON notifications_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- notification_log
CREATE POLICY "notification_log_read_all" ON notification_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "notification_log_service_write" ON notification_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- videos
CREATE POLICY "videos_public_read" ON videos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "videos_auth_insert" ON videos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "videos_auth_update" ON videos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "videos_service_role_all" ON videos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- missing_requests
CREATE POLICY "missing_requests_public_read" ON missing_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "missing_requests_auth_manage" ON missing_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "missing_requests_service_role_all" ON missing_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

-- push_subscriptions
CREATE POLICY "push_subs_own" ON push_subscriptions FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())) WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "push_subs_service_role_read" ON push_subscriptions FOR SELECT TO service_role USING (true);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VIEW
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE VIEW channel_display_with_info AS
SELECT
  cd.id, cd.channel_id, cd.display_name, cd.logo_url,
  cd.badge_color, cd.border_color, cd.is_visible, cd.sort_order,
  yc.channel_name, yc.channel_avatar, yc.channel_type,
  yc.total_imported, yc.is_active AS channel_active, yc.last_synced_at,
  cd.created_at, cd.updated_at
FROM channel_display cd
JOIN yt_channels yc ON yc.channel_id = cd.channel_id
WHERE cd.is_visible = true
ORDER BY cd.sort_order;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RPC FUNCTIONS (9)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION upsert_missing_request(p_search_query TEXT, p_category TEXT DEFAULT 'movie')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO missing_requests (search_query, category, request_count, updated_at)
  VALUES (p_search_query, p_category, 1, now())
  ON CONFLICT (search_query, category)
  DO UPDATE SET request_count = missing_requests.request_count + 1, status = 'pending', updated_at = now();
END; $$;

CREATE OR REPLACE FUNCTION fetch_user_game_data(p_auth_uid UUID)
RETURNS TABLE (game_slug TEXT, high_score INTEGER, coins INTEGER, plays INTEGER, last_played TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT gd.game_slug, gd.high_score, gd.coins, gd.plays, gd.last_played
  FROM game_data gd JOIN user_profiles up ON up.id = gd.user_id
  WHERE up.auth_user_id = p_auth_uid ORDER BY gd.last_played DESC;
END; $$;

CREATE OR REPLACE FUNCTION fetch_game_score(p_auth_uid UUID, p_game_slug TEXT)
RETURNS TABLE (high_score INTEGER, coins INTEGER, plays INTEGER, last_played TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT gd.high_score, gd.coins, gd.plays, gd.last_played
  FROM game_data gd JOIN user_profiles up ON up.id = gd.user_id
  WHERE up.auth_user_id = p_auth_uid AND gd.game_slug = p_game_slug;
END; $$;

CREATE OR REPLACE FUNCTION upsert_game_score(p_auth_uid UUID, p_game_slug TEXT, p_high_score INTEGER DEFAULT 0, p_coins INTEGER DEFAULT 0, p_plays INTEGER DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id FROM user_profiles WHERE auth_user_id = p_auth_uid;
  IF v_profile_id IS NULL THEN RETURN; END IF;
  INSERT INTO game_data (user_id, game_slug, high_score, coins, plays, last_played)
  VALUES (v_profile_id, p_game_slug, p_high_score, p_coins, p_plays, now())
  ON CONFLICT (user_id, game_slug)
  DO UPDATE SET high_score = GREATEST(game_data.high_score, EXCLUDED.high_score), coins = game_data.coins + EXCLUDED.coins, plays = game_data.plays + EXCLUDED.plays, last_played = now();
END; $$;

CREATE OR REPLACE FUNCTION fetch_user_coins(p_auth_uid UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total_coins INTEGER;
BEGIN
  SELECT COALESCE(SUM(gd.coins), 0) INTO total_coins FROM game_data gd JOIN user_profiles up ON up.id = gd.user_id WHERE up.auth_user_id = p_auth_uid;
  RETURN total_coins;
END; $$;

CREATE OR REPLACE FUNCTION fetch_leaderboard(p_game_slug TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (display_name TEXT, avatar_url TEXT, high_score INTEGER, coins INTEGER, plays INTEGER, last_played TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT up.display_name, up.avatar_url, gd.high_score, gd.coins, gd.plays, gd.last_played
  FROM game_data gd JOIN user_profiles up ON up.id = gd.user_id
  WHERE (p_game_slug IS NULL OR gd.game_slug = p_game_slug)
  ORDER BY gd.high_score DESC LIMIT p_limit;
END; $$;

CREATE OR REPLACE FUNCTION deduct_user_coins(p_auth_uid UUID, p_amount INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_profile_id UUID; v_current_coins INTEGER;
BEGIN
  SELECT id INTO v_profile_id FROM user_profiles WHERE auth_user_id = p_auth_uid;
  IF v_profile_id IS NULL THEN RETURN false; END IF;
  SELECT coins INTO v_current_coins FROM user_profiles WHERE id = v_profile_id;
  IF v_current_coins < p_amount THEN RETURN false; END IF;
  UPDATE user_profiles SET coins = coins - p_amount WHERE id = v_profile_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION register_push_token(p_auth_uid UUID, p_device_token TEXT, p_platform TEXT DEFAULT 'web', p_device_info TEXT DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id FROM user_profiles WHERE auth_user_id = p_auth_uid;
  IF v_profile_id IS NULL THEN RETURN; END IF;
  INSERT INTO push_subscriptions (user_id, device_token, platform, device_info, is_active, last_used)
  VALUES (v_profile_id, p_device_token, p_platform, p_device_info, true, now())
  ON CONFLICT (device_token) DO UPDATE SET is_active = true, last_used = now(), platform = EXCLUDED.platform, device_info = EXCLUDED.device_info;
END; $$;

CREATE OR REPLACE FUNCTION unregister_push_token(p_device_token TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE push_subscriptions SET is_active = false WHERE device_token = p_device_token;
END; $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EDGE FUNCTION TRIGGER
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION on_new_video()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN NEW; END; $$;

CREATE TRIGGER trigger_notify_new_video
  AFTER INSERT ON videos FOR EACH ROW EXECUTE FUNCTION on_new_video();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SEED DATA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO app_features (feature_key, name, label, icon, status, description, sort_order) VALUES
  ('movie_hub',    'Movie Hub',    'Movie Hub',    '🎬', 'live',        'Browse and watch movies',    1),
  ('game_hub',     'Game Hub',     'Game Hub',     '🎮', 'live',        'Play mini and offline games', 2),
  ('ytmusic',      'YT Music',     'YT Music',     '🎵', 'live',        'Listen to music tracks',      3),
  ('downloader',   'Downloader',   'Downloader',   '📥', 'coming_soon', 'Download videos & music',     4),
  ('offline',      'Offline Mode', 'Offline Mode', '📶', 'coming_soon', 'Watch content offline',       5),
  ('shorts',       'Shorts',       'Shorts',       '⚡', 'coming_soon', 'Short-form video content',    6),
  ('local_player', 'Local Player', 'Local Player', '📂', 'live',        'Play local video files',      7)
ON CONFLICT (feature_key) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO app_settings (key, value) VALUES
  ('app_name',            'Play Nexa'),
  ('hero_title',          'Your Entertainment Hub'),
  ('hero_subtitle',       'Movies, Music, Games & More'),
  ('primary_color',       '#7C3AED'),
  ('accent_color',        '#06B6D4'),
  ('maintenance_enabled', 'false'),
  ('maintenance_message', '')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DONE! After running this, create admin user:
--   1. Supabase > Authentication > Users > Add User
--   2. Then run: INSERT INTO admin_users (user_id, email, role)
--      VALUES ('YOUR_UUID', 'admin@playnexa.com', 'superadmin');
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
