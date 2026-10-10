# Media and coordinate feature

Owner: media agent; branch codex/image-memories.

## Acceptance plan

- Unit checks: actual JPEG/PNG/WebP headers, declared-type mismatch, malformed headers, size/dimension limits, panorama JPEG and 2:1 validation, derivative dimensions.
- Unit checks: signed coordinate parsing, incomplete drafts, negative-decimal commits, sign-toggle intermediate states, bounds.
- Browser integration: decode real images, confirm reduced derivative and PNG transparency, source unchanged, cleanup on failed decode, upload error presentation.
- Android/iOS physical checks: negative typing and Apply, sign control, canvas import and memory pressure.
- Required tooling checks: typecheck, lint, unit tests, production build.

Results pending implementation. Physical checks require device access.

## Results

PASS: TypeScript noEmit, ESLint ., Next production build --webpack. PASS: 12 image validation/import tests, including mocked browser allocation/cleanup and source-byte preservation. Full suite before final mocked cases: 26 tests passed; final feature run: 15 tests passed. Vitest exits zero but reports Vite server shutdown timeout (10 seconds).

NOT RUN: actual browser decoder/alpha rendering, physical Android/iPhone imports, touch keyboard and memory-pressure behavior. Browser APIs in the cleanup tests are mocked; these do not establish physical-device behavior.

Limits: panoramas 32 MB/64 megapixels, JPEG about 2:1, max derivative edge 4096; memories 12 MB/25 megapixels and max derivative edge 768. PNG output preserves alpha when present. Original files are read only.
