# Protected AI feature plan and evidence

## Contracts and implementation plan

POST /api/ai/associations accepts {concept,context?}, returns exactly three suggestions with id/title/explanation/prompt. POST /api/ai/image accepts {prompt}, returns normalized PNG bytes. Both require same-origin JSON requests and x-demo-code. OPENROUTER_API_KEY and DEMO_ACCESS_CODE are server-only. Optional OPENROUTER_TEXT_MODEL, OPENROUTER_IMAGE_MODEL, APP_ORIGIN configure server behavior.

Before integration: test authentication/origin/input rejection without provider calls; malformed suggestions; provider rate limits/failures; bounded response; concurrent/duplicate requests; missing/unavailable image models; decoded raster normalization; production build/typecheck/lint.

## Provider verification (2026-10-10)

- https://openrouter.ai/api/v1/models lists google/gemini-2.5-flash-lite, scheduled expiration 2026-10-20. Configurable; migration required before that date.
- https://openrouter.ai/api/v1/images/models lists openai/gpt-image-2.5-flare with transparent-background, aspect ratio and quality capabilities. The dedicated image catalog differs from the chat models catalog.
- https://openrouter.ai/docs/guides/overview/multimodal/image-generation documents POST /api/v1/images, returning data[].b64_json and media_type. No model substitution.
- No paid provider calls run in this worktree. Local Node networking cannot resolve public hosts; official documentation was checked via web tools.

## Limits

Limits are per Node process, shared by the demo, not a global billing cap. Two active AI requests, 12 suggestions and 3 images per ten minutes. Same payload or x-request-id is rejected while running and for thirty seconds after finishing. Explicit retries can use a new random x-request-id. Failed attempts also consume limits. No automatic retries or provider fallback. Cold starts and multiple deployment instances do not share these counters.

## Results

Association feature: PASS 19 mocked unit tests; PASS tsc --noEmit; PASS targeted ESLint. Production build BLOCKED: remained at Creating an optimized production build with no further output for several minutes and was stopped. Tests exit 0 but Vitest reports a Vite-server close timeout. Physical devices and real paid API calls NOT RUN.


## Image feature and final checks

- PASS: 30 mocked AI tests (20 association, 10 image). Command: node <dependency-root>/vitest/vitest.mjs run src/server --maxWorkers=1 --no-file-parallelism --no-isolate.
- PASS: node <dependency-root>/typescript/bin/tsc --noEmit.
- PASS: node <dependency-root>/eslint/bin/eslint.js src/server src/app/api/ai.
- BLOCKED: node <dependency-root>/next/dist/bin/next build --webpack. Both attempts stalled at optimized compilation with no additional output for several minutes; stopped. Production integration must verify the build.
- Default-isolation test runs intermittently fail loading shared Vite SSR temp modules (ENOENT). A single reused test worker passes all 30. Exit status 0 includes a ten-second Vite shutdown warning; not hidden.
- NOT RUN: real paid API calls, hosted endpoint checks, phone behavior.

Generation verifies the exact configured model through the dedicated endpoint catalog before a paid request, pins its reported provider when present, disables fallback, and requests one image. Supports low quality, square aspect and transparent background only when advertised. Returned alpha is preserved; transparency is not fabricated. JPEG/PNG/WebP signatures and decoded formats are validated; vectors, animations, huge images and malformed output are rejected. Normalized PNG is at most 768 pixels on either side and 3 MB. Provider JSON is bounded at 12 MB, input raster at 8 MB and 16 million pixels. Timeout is 150 seconds with a 180-second route duration. Aborted requests do not return a generated image after cancellation, but cancellation is not a promise about provider billing.

UI caller should send x-request-id: crypto.randomUUID() for each explicit submission/retry and retain it during a pending request. Do not silently retry paid calls. Request credentials are never included in export data. Empty optional context is accepted.
