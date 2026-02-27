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

-- 5. Messages table for vehicle-to-vehicle messaging
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they sent or received
CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can send messages as themselves
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Users can mark received messages as read
CREATE POLICY "Users can update received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 6. (Optional) PostGIS for advanced distance queries
-- CREATE EXTENSION IF NOT EXISTS postgis;

