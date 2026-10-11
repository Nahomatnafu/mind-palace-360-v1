# Shared demo workspace

The hosted app uses one shared Supabase workspace. Both teammates open the same deployment and unlock it with the existing demo access code. The same session enables image generation and suggestions. No `.env.local` file, provider API key, Supabase key, or individual account is needed to use the hosted app.

## Data and collaboration

- Palace documents live in `demo_palaces`; original image bytes live in the private `demo-media` bucket with validated metadata in `demo_assets`.
- Shared mode never falls back to a local-only save. A failed upload or document save displays a failure and leaves the edit available for retry.
- Save operations compare database revisions atomically. A stale save or deletion is rejected. **Load latest** fetches the teammate's version and asks before discarding an open draft. This is shared saving, not simultaneous live co-editing.
- An open palace checks for updates every eight seconds while visible. The gallery refreshes when the window regains focus and has **Refresh shared space** for a manual update.
- Deletion hides a palace for everyone using a database tombstone. It prevents stale clients from recreating it. Images and tombstones are retained for this demo; cleanup and a restore interface are deferred.
- Browser-local IndexedDB data is left untouched, but is no longer the source for the shared gallery. ZIP restore creates a new shared palace. ZIP export strips the cloud revision so imports start independently.
- My Apartment was seeded from the approved nine-photo backup, with its 16 connections and original image bytes. Family house uses Aneesha's bundled model. Existing browser-local memories were not migrated. The owner subsequently requested removing the duplicate sixth photo: My Apartment now has eight rooms and 14 connections; the fifth photo is retained, all rooms remain reachable, and original cloud image assets are preserved.

## Server configuration

Apply `supabase/shared-demo.sql` in the project's SQL editor. Tables have row-level security enabled, no browser-role grants, and service-role access only. The Storage bucket is private. The Vercel server needs `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DEMO_ACCESS_CODE`, `APP_ORIGIN=https://mind-palace-360-v1.vercel.app`, and the existing OpenRouter variables. Set the exact local origin instead when developing (for example `http://localhost:3005`). Never prefix secrets with `NEXT_PUBLIC_` or commit them.

The shared code grants read/edit/delete access to this entire demo and access to AI spending through the server. Share it with trusted demo collaborators. Rotate `DEMO_ACCESS_CODE` and redeploy to invalidate existing sessions. Sessions are signed, HTTP-only, same-site cookies, valid for seven days. Image download links expire after five minutes. Direct signed uploads avoid Vercel's body-size limit; the server decodes and verifies the completed raster before accepting it as an asset.

For local development, use `.env.example` as the list of names. Prefer separate development credentials and a separate Supabase development project. An encrypted private channel is suitable for distributing a minimal development env file; the production Supabase secret grants broad database access and should not be handed out just to use AI. Private GitHub repositories still must not contain `.env.local`.

## Verification checklist

- Fresh browser: unlock, see the same two palaces, open apartment photos and the rendered house.
- Two sessions: save a memory on one, read it on the other; check the update notice and Load latest.
- Two stale editors: first save wins; second receives a conflict and retains its draft. Refresh and reapply intentionally.
- Upload a PNG/JPEG/WebP: compare downloaded bytes with the original; reject SVG, invalid bytes, incorrect dimensions and excessive sizes.
- Failed upload or offline save: do not display Saved; retry explicitly.
- Delete while another session has an old copy: stale save must not resurrect the deleted palace.
- Unauthorized and cross-origin API requests must fail; secret values must not appear in client bundles.
- Signed session enables AI without a second code; anonymous AI stays blocked. Existing provider limits and explicit-only paid retries remain.
- Export then import a shared palace: fresh IDs/revision and working assets, with the original unchanged.
- Android Chrome and iPhone Safari: actual hardware motion/permission behavior requires teammate testing; desktop browser emulation cannot certify it.
