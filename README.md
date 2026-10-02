# Digital Footprint
Leave your memories where they happened. Digital Footprint is a global interactive map where you can pin, explore, and revisit memories from anywhere in the world.

**Try it live: [digital-footprint-murex.vercel.app](https://digital-footprint-murex.vercel.app)**

## Features

- **Spinning 3D globe** – drag to turn the Earth, scroll to zoom, and click any country.
- **Memories with photos and videos** – give each memory a title, date, story, and as many photos or videos as you like.
- **Pins on the globe** – every memory gets a glowing 3D pin at the exact spot it happened. Pin it where you clicked, or search for a city, state or landmark.
- **Visited countries** – countries you have memories in are shaded, with a running count of how many you've visited.
- **Photo cards and viewer** – memories show as cards led by a cover photo; photos and videos open full-screen right on the page.
- **Drag-and-drop uploads** – drop files onto the form, preview them, and watch a progress bar while they upload.
- **Private by default** – each account can only ever see its own memories and files.

## Built with

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org), bundled with [Vite](https://vite.dev)
- [react-globe.gl](https://github.com/vasturiano/react-globe.gl) and [three.js](https://threejs.org) for the 3D globe
- [Supabase](https://supabase.com) for accounts, the database, and photo/video storage
- [OpenStreetMap Nominatim](https://nominatim.org) for place search
- Country shapes from [Natural Earth](https://www.naturalearthdata.com) and Earth imagery from NASA

## Running it yourself

1. **Install** [Node.js](https://nodejs.org), then run:
   ```
   npm install
   ```
2. **Create a Supabase project** at [supabase.com](https://supabase.com). In its SQL Editor, run
   [`supabase/schema.sql`](supabase/schema.sql) to create the tables and storage.
3. **Add your keys.** Copy `.env.example` to `.env.local` and fill in your project's URL and
   publishable key (Supabase dashboard → **Connect**).
4. **Start it:**
   ```
   npm run dev
   ```
   and open http://localhost:5173.

If you set up the database before memories had locations, also run
[`supabase/migrations/002_memory_locations.sql`](supabase/migrations/002_memory_locations.sql).
