-- Copy this entire block into the Supabase SQL Editor to set up your database
-- You only need to run this once in your Supabase project dashboard.

-- Drop existing tables if re-initializing
DROP TABLE IF EXISTS users CASCADE;

-- Create the robust users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- In production, use Supabase Auth instead of hashing manual passwords
  name TEXT,
  status TEXT DEFAULT '',
  phone TEXT,
  cbChannel TEXT,
  vehicleType TEXT,
  modifications TEXT,
  url TEXT,
  rescueRig BOOLEAN DEFAULT false,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  state TEXT DEFAULT 'normal', -- 'normal', 'needs_help', 'attending'
  attendingTo UUID REFERENCES users(id) ON DELETE SET NULL, 
  visible BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on Realtime for the users table
alter publication supabase_realtime add table users;

-- Optional: Add Geolocation extension for complex distance queries (PostGIS)
-- CREATE EXTENSION IF NOT EXISTS postgis; 
