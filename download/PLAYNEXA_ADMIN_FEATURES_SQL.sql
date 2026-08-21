-- ── Play Nexa — New Admin Features Tables ──────────────────────────
-- Run this in Supabase SQL Editor after the main schema
-- Adds: gemini_keys, api_vault, user_feedback, admin_reports, admin_chat_history

-- STEP 0: Drop if exists (safe to re-run)
DROP TABLE IF EXISTS admin_chat_history CASCADE;
DROP TABLE IF EXISTS admin_reports CASCADE;
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS api_vault CASCADE;
DROP TABLE IF EXISTS gemini_keys CASCADE;

-- ── gemini_keys ──────────────────────────────────────────────────
CREATE TABLE gemini_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'standby' CHECK (status IN ('active','standby','exhausted','cooling')),
  usage_count INTEGER DEFAULT 0,
  quota_used INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── api_vault ────────────────────────────────────────────────────
CREATE TABLE api_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('supabase','gemini','firebase')),
  key_name TEXT NOT NULL,
  key_value TEXT DEFAULT '',
  description TEXT DEFAULT '',
  guide TEXT DEFAULT '',
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── user_feedback ────────────────────────────────────────────────
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  ai_verified BOOLEAN DEFAULT false,
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  ai_summary TEXT DEFAULT '',
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  same_issue_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── admin_reports ────────────────────────────────────────────────
CREATE TABLE admin_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,
  total_feedback INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  top_issues JSONB DEFAULT '[]',
  full_report JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── admin_chat_history ───────────────────────────────────────────
CREATE TABLE admin_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  session_id TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX idx_gemini_keys_sort ON gemini_keys(sort_order);
CREATE INDEX idx_gemini_keys_active ON gemini_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_api_vault_service ON api_vault(service);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_priority ON user_feedback(priority);
CREATE INDEX idx_user_feedback_category ON user_feedback(category);
CREATE INDEX idx_user_feedback_created ON user_feedback(created_at DESC);
CREATE INDEX idx_admin_reports_date ON admin_reports(report_date DESC);
CREATE INDEX idx_admin_chat_session ON admin_chat_history(session_id, created_at ASC);

-- ── Enable RLS ──────────────────────────────────────────────────
ALTER TABLE gemini_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chat_history ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies (service role bypasses all) ────────────────────
-- gemini_keys: admin-only
CREATE POLICY "Admin full access gemini_keys" ON gemini_keys
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anon read gemini_keys" ON gemini_keys
  FOR SELECT USING (true);

-- api_vault: admin-only
CREATE POLICY "Admin full access api_vault" ON api_vault
  FOR ALL USING (auth.role() = 'service_role');

-- user_feedback: users can insert, admin can do all
CREATE POLICY "Users can insert feedback" ON user_feedback
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access user_feedback" ON user_feedback
  FOR ALL USING (auth.role() = 'service_role');

-- admin_reports: admin-only
CREATE POLICY "Admin full access admin_reports" ON admin_reports
  FOR ALL USING (auth.role() = 'service_role');

-- admin_chat_history: admin-only
CREATE POLICY "Admin full access admin_chat_history" ON admin_chat_history
  FOR ALL USING (auth.role() = 'service_role');

-- ── Seed api_vault with default keys ────────────────────────────
INSERT INTO api_vault (service, key_name, description, guide, risk_level) VALUES
('supabase', 'SUPABASE_URL', 'Project URL for your Supabase instance', '1. Go to supabase.com → Your Project → Settings → API\n2. Copy the Project URL\n3. Paste it here', 'low'),
('supabase', 'SUPABASE_ANON_KEY', 'Public anonymous key (safe to expose in client code)', '1. Go to supabase.com → Your Project → Settings → API\n2. Copy the anon/public key\n3. Paste it here', 'low'),
('supabase', 'SUPABASE_SERVICE_ROLE_KEY', 'Secret admin key — bypasses all RLS policies. NEVER expose to client!', '1. Go to supabase.com → Your Project → Settings → API\n2. Copy the service_role secret key\n3. ⚠️ NEVER put this in client-side code!', 'high'),
('gemini', 'GEMINI_API_KEY', 'Primary Google Gemini API key for AI features', '1. Go to aistudio.google.com\n2. Click "Get API Key" → Create new project\n3. Copy the key starting with AIzaSy...\n4. Paste it here', 'high'),
('firebase', 'FIREBASE_API_KEY', 'Firebase Web API Key for authentication', '1. Go to console.firebase.google.com\n2. Select your project → Project Settings\n3. Copy the Web API Key\n4. Paste it here', 'medium'),
('firebase', 'FIREBASE_PROJECT_ID', 'Firebase Project ID', '1. Go to console.firebase.google.com\n2. Select your project → Project Settings\n3. Copy the Project ID\n4. Paste it here', 'low'),
('firebase', 'FIREBASE_APP_ID', 'Firebase App ID for mobile app', '1. Go to console.firebase.google.com\n2. Select your project → Project Settings → General\n3. Under "Your apps" copy the App ID\n4. Paste it here', 'low');
