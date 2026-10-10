# Local persistence and backup

Owner: storage agent. Branch: codex/local-persistence. Shared contract: 6e549b9.

## Test plan before implementation

- Save/load/list Blob-backed documents and reject missing/invalid assets.
- Inject an IndexedDB failure after an asset write; document and asset writes must roll back.
- Delete/rewrite a palace, keeping assets shared by another palace.
- ZIP round trip with fresh IDs and exact asset bytes.
- Reject traversal, duplicate paths, missing assets, invalid raster signatures, schema errors, oversized archives, and tampered checksums before saving anything.
- Typecheck, lint, test, and production build where dependencies/runtime permit.

Physical mobile storage/low-quota behavior: NOT RUN; requires real devices.

## Implemented contracts

- repository exports a transactional Dexie repository. Image IDs are immutable; replacing an image requires a new asset ID. Missing image references reject saving.
- Deletes and rewrites clean only previously referenced assets which no palace still references.
- ZIP limits: 100 MB compressed, 128 MB expanded, 32 MB per raster, 2 MB manifest, 1101 entries. PNG/JPEG/WebP signatures/dimensions are validated; browsers additionally decode via createImageBitmap where available.
- Archive central directory and streamed output limits are checked. Paths are restricted to manifest.json and assets/<safe-id>.<raster-extension>. Imports checksum all assets, remap every identifier, and save once after validation.
- Approved /demo/ assets are embedded during export. External demo URLs are rejected.

## Results

- PASS: Vitest repository suite, 8 tests (transaction rollback, missing image, unchanged old document after failed edit, shared/orphan cleanup, spoofed type/dimensions, immutable IDs).
- PASS: Vitest backup suite, 7 tests (fresh-ID round trip, traversal, schema/manifest, lying expansion size, oversized archive rejection before reading, external demo URL, tampered checksum).
- PASS: TypeScript tsc --noEmit for the worktree.
- BLOCKED: Standard ESLint src/storage produced no output and was terminated after 30 seconds by the runtime timeout.
- BLOCKED: next build --webpack reached optimized production compilation, then produced no further output and was terminated after 30 seconds. Integration owner must rerun these.
- Environmental limitation: combined parallel Vitest initially hit a Vite temporary SSR cache ENOENT. Isolated suite runs pass. Vitest reports successful exit code but a 10-second Vite server close warning.
- NOT RUN: Real Android/iPhone IndexedDB behavior, low-device-storage conditions, and large-device-memory pressure.
