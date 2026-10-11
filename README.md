# Mind Palace 360

Turn rooms into visual memory palaces. Place an image at a spot in a 360° panorama, attach a note, and tap the image to recall what it represents.

**[Open the judges’ demo](https://mind-palace-360-judges.vercel.app)** — no signup or access code required.

## Try it

1. Open **My Apartment** or **Family house** from the gallery.
2. Look around and tap a memory image to reveal its note. Circular connections move between photo rooms.
3. In **Edit**, choose **Add memory** and a location. Enter a title and note, then upload a picture or describe one to generate with AI.
4. Save the memory, switch to **Explore**, and tap it again. You can also resize and reposition images.

The judges’ deployment has its own editable copies of the prepared palaces and images. Changes there do not change the team’s original workspace. Visitors to the judges’ demo share those copies.

## Built with

Next.js, React, TypeScript, Photo Sphere Viewer, Three.js, Supabase Postgres and Storage, OpenRouter, Sharp, and Vercel. Gemini suggests familiar visual associations; GPT Image generates transparent cutouts. The models are configurable on the server.

## Run locally

Use Node.js 22 or later:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3005. Configure your own Supabase project using [supabase/shared-demo.sql](supabase/shared-demo.sql), then set the server-only variables listed in [.env.example](.env.example). Set APP_ORIGIN to your local URL. AI requires your own OpenRouter key. Never commit .env.local.

The default workspace requires a demo access code. Public judges mode requires both PUBLIC_DEMO=true and SHARED_WORKSPACE=judges, with independently seeded palace and image records. It fails closed if configured against the original workspace. See [docs/SHARED_DEMO.md](docs/SHARED_DEMO.md).

## Data and AI

Palace documents save in Supabase Postgres, with images in private Storage. Revision checks reject stale edits and failed writes remain visible. ZIP export/import provides portable backups. The earlier IndexedDB repository remains in source for local-storage tests.

AI requests contain text, not room photos. Provider credentials remain server-side. Image responses are checked for usable transparency and visible content, then fitted within 768 × 768 pixels without upscaling. Requests have origin, payload, concurrency and per-server rate checks. Rate checks are not a global billing cap.

The owner authorized public publication of the apartment photos and backup in team-assets/apartment. Original files are preserved; local credentials and unrelated recovery snapshots are excluded from Git and deployment.

## Checks and limits

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

The photo viewer navigates between captured viewpoints. The separate Family house template uses a Three.js model. The interface includes responsive controls and phone motion where supported; physical Android/iPhone verification remains outstanding. Browser tests do not establish memorization effectiveness.

See [docs/TASKS.md](docs/TASKS.md) for release verification and [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) for historical test evidence.
