-- ============================================================
-- Aussie 4WD Rescue — Supabase Schema
-- Run this in the Supabase SQL Editor (only once per project).
-- This version uses Supabase Auth for secure authentication
-- and a separate profiles table for app data.
-- ============================================================

-- 1. Drop old tables if re-initialising
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;   -- clean up legacy table if it exists

-- 2. Create profiles table (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT '',
  phone TEXT,
  cb_channel TEXT,
  vehicle_type TEXT,
  modifications TEXT,
  url TEXT,
  rescue_rig BOOLEAN DEFAULT false,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  state TEXT DEFAULT 'normal',           -- 'normal' | 'needs_help' | 'attending'
  attending_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  visible BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row-Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read visible profiles (or their own)
CREATE POLICY "Authenticated users can view visible profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (visible = true OR id = auth.uid());

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can only update their own row
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- 4. Turn on Realtime for the profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 5. Auto-create a profile stub when a new user signs up (optional helper)
-- This trigger ensures a profile row always exists after signup.
-- The app will fill in the remaining fields during registration.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. (Optional) PostGIS for advanced distance queries
-- CREATE EXTENSION IF NOT EXISTS postgis;
