# Distinct-asset density fixture

## Acceptance plan

- Deterministic procedural generation: 118 unique memory IDs, unique PNG content hashes, 128x128 RGBA images, 28/32/36-pixel display sizes, six pitch rows spread across 360 degrees.
- Use the approved original public/demo/studio.jpg panorama only. No paid generation, private photos, or default application changes.
- Verify ZIP manifest/checksums and restore through the real importer and fake-indexeddb repository. Export the restored palace and restore again; verify 118 distinct assets and byte identity.
- Typecheck, lint, production build, feature tests.
- Actual browser density/layout/GPU checks are owned by integration; NOT RUN here.

## Results

PASS: fixture generator, full real ZIP import/repository/export/import test, TypeScript noEmit, lint (zero errors; two inherited UI warnings). PASS: 107 tests across 10 files using vitest run --maxWorkers=1 --no-file-parallelism --no-isolate. Test exit zero has a Vite 10-second shutdown warning.

BLOCKED: production build. First attempt compiled and typechecked, then failed EPERM creating .next/server/app/_global-error.segments/_global-error. Creating that directory through fs and retrying hit EPERM creating .next/static/chunks/next/dist/client/components. This is reported as a failed environmental build check, not a successful build. Integration owner must rerun in an unrestricted/working build environment.

NOT RUN: actual browser restore, selection, zoom, GPU/resource use, real-phone density behavior. The Node Sharp decoder verified all PNGs; fake IndexedDB verifies persistence semantics, not browser quota/performance.

## Reproduce

Run with Node 22+ and installed dependencies:

```text
node --experimental-strip-types scripts/generate-density.mjs
```

The script writes .preview-runtime/density-118.zip, which is ignored by Git. The script imports a Node-only fixture module; it is not imported by the application or loaded by default. No AI calls occur.

Archive: 224,283 bytes. SHA-256: 9e980ca6e8ac0844ef05a576b3137514bab3f652489c9ead3655c4f5175f8868. Studio panorama: 64,895 bytes, 2048x1024 JPEG. Memory images: 118 unique 128x128 RGBA PNGs, 82,146 bytes combined. Each has transparent corners and opaque centered numerals with varied colors/emblems. Six pitch rows (50 to -50 degrees), 20 yaw positions spread over 360 degrees; display size 28/32/36.

An ignored archive copy was provided to the integration .preview-runtime folder for browser testing. Nothing is evidence of memorization or learning outcomes; all labels identify technical fixtures.
