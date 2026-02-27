# Aussie Rescue

Real-time 4WD rescue coordination app — see vehicle locations on a live map, call for help, and find rescue rigs nearby.

## Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Supabase (Auth, PostgreSQL, Realtime)
- **Map:** Leaflet + React-Leaflet with OpenStreetMap tiles
- **Icons:** Lucide React

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
3. Run `supabase_schema.sql` in your Supabase SQL Editor to create the database.
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Features

- **Supabase Auth** — secure email/password authentication (no plaintext passwords)
- **Real-time GPS tracking** — vehicle positions update live on the map
- **Call for Help** — marks your location red and alerts all users
- **Attend** — indicate you're heading to a stranded vehicle (with cancel support)
- **Rescue Rigs** — find the nearest recovery-capable vehicles sorted by distance
- **Editable Profile** — update your username, vehicle, mods, CB channel and more
- **Visibility Toggle** — hide or show your marker from other users
- **Row-Level Security** — users can only modify their own data
