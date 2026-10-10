# AI authoring UI

Standalone AssociationGenerator client component. Both named and default exports. Props: onImage(asset,title,note), disabled optional. Intended to appear alongside the existing manual upload flow. The caller owns placement and persistence; the component only reports preparing/adding, not saved success.

Flow: concept + optional context + in-memory demo code -> exactly three suggestions -> explicit selection -> editable prompt/title/note -> explicit paid generation -> validated PNG derivative -> preview -> explicit Use image callback. Access code is never stored in localStorage, IndexedDB, URLs, or exports. Calls have fresh x-request-id values. Duplicate clicks are guarded synchronously. No automatic paid retries. Cancelling or unmounting aborts fetch and ignores stale results; cancellation does not promise zero billing. Preview object URLs are revoked when replaced or unmounted. User content renders as text.

## Acceptance plan

Check empty input and wrong-code errors; exactly-three suggestion validation; HTML proxy failure; manual selection and edited association fields; explicit generation and replacement; retained preview after callback failure; cancellation and stale response; no duplicate paid click; image import and alpha preview; browser layout/keyboard accessibility.

## Results

- PASS: TypeScript tsc --noEmit.
- PASS: targeted ESLint on component/helper/test.
- BLOCKED: 9 helper tests added, runner fails before executing with ENOSPC during Vite config compilation. Do not report these as passed.
- BLOCKED: production build stopped after disk exhaustion detected; integration owner will verify after cache cleanup.
- NOT RUN: real paid AI requests, rendered component interaction tests, physical phone tests.

Only this isolated worktree's verified .next generated cache was removed to recover space.
