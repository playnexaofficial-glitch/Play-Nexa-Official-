-- ══════════════════════════════════════════════════════════════════════
-- Play Nexa — Fix app_settings table
-- Changes value column from JSONB to TEXT and inserts flat key-value pairs
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- Step 1: Drop existing data and policies
DELETE FROM app_settings;

-- Step 2: Change value column type from JSONB to TEXT
ALTER TABLE app_settings ALTER COLUMN value TYPE TEXT USING value::TEXT;

-- Step 3: Drop old policies (they might already exist with same names)
DROP POLICY IF EXISTS "Public read settings" ON app_settings;
DROP POLICY IF EXISTS "Authenticated can manage settings" ON app_settings;

-- Step 4: Re-create policies
CREATE POLICY "Public read settings" ON app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can manage settings" ON app_settings FOR ALL TO authenticated USING (true);

-- Step 5: Insert flat key-value pairs matching what the admin settings page expects
INSERT INTO app_settings (key, value) VALUES
  ('app_name',            'Play Nexa'),
  ('hero_title',          'Your Entertainment Hub'),
  ('hero_subtitle',       'Movies, Music, Games & More'),
  ('primary_color',       '#7C3AED'),
  ('accent_color',        '#06B6D4'),
  ('maintenance_enabled', 'false'),
  ('maintenance_message', '');

-- ══════════════════════════════════════════════════════════════════════
-- Also fix admin_users: allow authenticated users to read
-- (needed for admin session validation)
-- ══════════════════════════════════════════════════════════════════════

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Users can check own admin status" ON admin_users;

-- Recreate with proper access
CREATE POLICY "Service role can read admin_users" ON admin_users FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Users can check own admin status" ON admin_users FOR SELECT USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════
-- Fix admin_activity_log: allow authenticated admins to insert
-- ══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Service role can manage activity log" ON admin_activity_log;
DROP POLICY IF EXISTS "Authenticated can read activity log" ON admin_activity_log;

CREATE POLICY "Service role can manage activity log" ON admin_activity_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Authenticated can read activity log" ON admin_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activity log" ON admin_activity_log FOR INSERT TO authenticated WITH CHECK (true);
