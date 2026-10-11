# Task board

Integration owner: Codex. Shared contracts, dependency changes and lockfile are committed. All app source is newly written; only third-party dependency caches were reused.

| Branch | Owner | Scope | Status |
|---|---|---|---|
| codex/bootstrap | Codex | Scaffold/model/contracts | Implemented; verified |
| codex/viewer | Codex | PSV adapter/fixtures | Implemented; rendered/build checks |
| codex/tour-navigation | Codex | Room import/CRUD/connections | Implemented; review corrections integrated |
| codex/local-persistence | storage agent | Dexie transactions/assets | Tests passed |
| codex/demo-backup | storage agent | ZIP validation/roundtrip | Tests passed; UI restore/export passed |
| codex/persistence-hardening | storage agent | Retry/dimensions/cleanup | Reviewed and integrated |
| codex/image-memories | media agent | Validated raster normalization | Implemented/tests passed |
| codex/mobile-motion | media agent | Signed coordinates | Automated + browser draft checks passed |
| codex/memory-authoring | Codex | Draft previews/image-note editor | Implemented; create/open/edit/reload checked |
| codex/ai-associations | AI agent | Protected3 suggestions | Mock tests and real hosted call passed |
| codex/ai-image-generation | AI agent | Exact Flare endpoint | Mock tests and one paid hosted call passed |
| codex/ai-authoring-ui | AI agent | Select/edit/generate/preview/use | Implemented; helper tests; full paid UI sequence pending |
| codex/motion-controls | media agent | Browser sensor controller |12 tests/build passed; physical devices NOT RUN |
| codex/motion-integration | Codex | Explicit controls/editor suspension | Integrated; desktop waiting/fallback checked |
| codex/density-fixtures | media agent |118 distinct technical images | Roundtrip and rendered count/selection passed |
| codex/demo-delivery | Codex | Vercel/secrets/QR | Final HTTPS deployment READY; public home/QR and protected AI checked |
| codex/demo-regression | Codex | Placement/lifecycle/save-status regression | Verified release integrated into main; all feature branches pushed |
| codex/draggable-hotspots | Codex | Explicit move mode for circles/images, save on drop, manual coordinates | 126 tests/typecheck/lint/build passed; deployed and desktop/390�844 browser checks passed |
| aneesha | Aneesha | Palace gallery home with long-press delete, template chooser (Real/3D/Cartoon), per-palace routes | Implemented; typecheck/lint/130 tests/build passed; desktop browser flow checked, phone NOT RUN |
| aneesha (3D) | Aneesha | three.js walkthrough viewer for glTF rooms (look, tap-to-walk, 3D-anchored memories), Family house template from public/models/house1.glb; adds Vec3 fields to Room/Memory/TourLink and @types/three devDependency (needs integration owner sign-off) | typecheck/lint/135 tests/build passed; render, picking and template flow checked in a hidden Chrome tab, glide animation and marker overlay NOT RUN in a visible tab, phone NOT RUN |

Apartment collection: nine supplied panoramas restored locally as a separate palace with 16 editable circular connections. Original ZIP and connection coordinates remain in ignored private-media; an owner-approved copy is shared in team-assets/apartment in this private repository. Photos 5 and 6 are identical and both are retained. No apartment assets are publicly deployed. Initial doorway placement is approximate; the owner can drag circles or edit their coordinates/destination.

## Collaboration

Repository renamed to mind-palace-360-v1 at user request. GitHub verifies Aneesha (aneeshaa1) has write access. Vercel project is separate, linked and owner-authenticated. GitHub write permission does not grant Vercel access. Hobby private-repo deployment requires owner-authored commits; Aneesha can push feature branches/PRs and the owner can integrate and deploy. See official https://vercel.com/docs/git . Do not rewrite her commit authorship or share the API key.

Teammate work is ready to partition: create a three-minute Creative-track pitch and90-second scripted demo, choose five strong associations, run iPhoneSafari permission/rotation/background/negative-input checks, capture observations in TEST_RESULTS. Owner should run the same checklist on AndroidChrome. No paid bulk generation.

## Dependencies and limits

Original apartment folder is available; one image was tested locally. No private media is deployed. Physical sensor tests and an actual117/118-item learning experiment remain user-owned. Initial isolated-runtime network/keyring failures resolved by authorized normal terminal calls; disk exhaustion resolved by removing only rebuild caches and disabling webpack disk cache. No further sign-ins are currently needed.

## October 10 editor and image-quality revision

Owner: Codex (shared contracts unchanged, no new dependencies).

- codex/image-quality: preserve validated panorama JPEG bytes instead of re-encoding/downscaling. Import regression passes.
- codex/relatable-associations: prefer familiar literal objects; direct Gold example is bracelet/necklace/bar. Protected-handler regression passes. Live Gold/Au request returned Gold bracelet, Gold necklace and Gold bar.
- codex/transparent-cutouts: require endpoint alpha support, explicit PNG output, visible subject and a transparent border. Reject opaque/blank/translucent-only outputs without automatic paid retry. Fifteen image tests pass. One live generation returned a plain bracelet alone: 768 x 768 PNG, 213015 bytes, alpha 0–255; transparent-border and visible-subject validation passed and output was visually inspected.
- codex/replace-room-photo: replace a panorama without changing room IDs, camera, memory/link positions; display dimensions. Typecheck, lint, 132 tests and production build pass for the combined changes; replacement control browser validation pending.
- codex/memory-editor-redesign: implemented from the supplied Kuula screenshots: context-specific right sidebar, real room thumbnail filmstrip, one shared memory title/note, direct picture generation or upload, optional familiar-object suggestions. Phone layout uses a bottom sheet. Desktop and 390px browser checks passed; published and verified at the stable production URL.

The nine supplied apartment Photo_*.jpg files are all 1280 x 640. SHA-256 comparison confirms the private tour ZIP contains all nine exact originals; that ZIP did not reduce them. Older D:/OpenView Homes_First AD_Batch files are 3840 x 1920, but are not assumed to correspond to these apartment views. Higher-resolution exports of the same apartment photos are needed to recover actual detail. Do not upscale and describe it as restored detail. No cloud account is required for byte-preserving local import. Browser GPU texture limits still apply.

- codex/high-resolution-panoramas: supports bounded 11904 x 5952 originals (80 million pixel limit; 32 MB encoded limit unchanged). Import/storage/backup subset: 39 tests pass. Full checks required again before integration.
- Kuula reference now open at https://kuula.co/edit/n1/collection/7Tshf ; photo sidebar inspected read-only. User supplied five screenshots confirming the sidebar and thumbnail reference. Keep panorama visible alongside a context-specific editor and separate room navigation. No Kuula content saved or modified.
- All feature branches are pushed and integrated into main. Production deployment dpl_ANE7wC9b26ywr3st7oqpYfzBcqyF is READY and aliased to https://mind-palace-360-v1.vercel.app . Existing local apartment data survived the release; all nine thumbnails and one panorama canvas rendered.

## Private teammate apartment bundle - October 10, 2026

- codex/team-apartment-assets: owner explicitly requested sharing the nine apartment photos in GitHub. Repository privacy and aneeshaa1 write access verified. Exact source copies plus the ready-to-restore nine-room, 16-connection ZIP are in team-assets/apartment. This is a narrow exception to the prior no-photo-commits policy.
- The entire team-assets directory is excluded from Vercel and is outside public/. No API key or demo code is included. The app still uses browser-local persistence; each teammate restores the ZIP in their own browser. No cloud synchronization is implied.
- Verification passed: SHA-256 matches all nine source copies and all nine archived originals; ZIP has nine rooms, 16 connections and zero personal notes. Staged files match the exact allowlist. Private-media and env files remain ignored; build traces contain neither private-media nor team-assets. Typecheck, lint, all 133 tests (12 files), and production build passed.

## Visual polish and generation flow

- codex/ai-generation-flow: replace three-per-ten-minute demo quota with six images / twenty suggestions per minute; preserve two in-flight slots, deduplication and explicit-only retries. Cache successful transparent-model discovery for five minutes and use faster lossless PNG compression. Provider 402 now has a distinct credit/key-limit message. Integration owner: Codex; no dependency changes. Automated and real generation checks passed.

- codex/marker-size-precision: image size up to 128px in UI, validation and ZIP persistence; 36px default unchanged. Display committed angles to one decimal without rounding stored drag coordinates; preserve signed intermediate drafts and explicit Apply. Shared schema shape unchanged, widened bound owned by Codex.

- codex/studio-visual-design: self-hosted Manrope / Space Grotesk with OFL licenses, doorway mark, charcoal/lilac studio palette, consistent SVG controls and right-aligned select/disclosure chevrons. Existing panorama-first sidebar and phone bottom sheet retained. Desktop, 390px layout and production verification passed.

Combined verification: typecheck, lint, 137 tests / 12 files and production build passed. Desktop and 390px browser checks confirmed 128px fixed markers after zoom/save/reload, one-decimal negative coordinates, correct local fonts, consistent selects and no horizontal overflow. One real transparent bracelet generated in 9.1 seconds; physical phones remain untested.

- codex/bold-connection-markers: recreate the supplied reference as a resolution-independent CSS circle with thick white outer ring, transparent gap and solid white center. Remove MEMORY STUDIO header subtitle. Existing marker sizes, coordinates, selection and dragging unchanged. No uploaded screenshot asset used. Typecheck, lint, all 137 tests (including viewer navigation/dragging regressions), and production build passed.

- codex/connection-sizing-focus: optional engine-independent TourLink.size (16-128px, legacy default 30); live circle-size preview and persisted ZIP roundtrip. Codex owns shared contract extension, no migration/dependency changes needed. Form focus is inset to avoid label overlap; keyboard focus retained.

- codex/automatic-mobile-motion: remove zoom and Phone motion toolbar buttons; automatically start sensors on touch-first devices after panorama load, pause for editing/gestures and recalibrate on room changes. Gesture-only permission prompt where required, with Use touch fallback. Desktop remains mouse-only. Controller retains granted permission within the page session. Physical Android/iPhone tests still required.

Verification for circle sizing and automatic motion: 144 tests across 12 files pass, including automatic/gesture-required permission, denied access, room re-anchoring, gesture pause and inertia/seam regressions. Typecheck, lint and production build pass. Local production browser verified 128px live preview, save/reload, cancel preserving the saved size, contained focus, room navigation and absent desktop zoom/motion toolbar, with no console errors. Browser viewport override did not apply to the background preview; responsive and physical Android/iPhone sensor checks remain a limitation.

## Aneesha PR #1 integration — October 10, 2026

Owner reviewed all 20 changed files and both commits. User chose the palace gallery homepage and both real-photo and 3D house choices. 3D navigation stays tap-to-walk without connection creation controls; photo tours retain circle links. Resolve conflicts in Workspace, styles and shared model by preserving current motion, 16–128px connection sizes and contained focus. Keep engine-independent Vec3/description fields; explicitly pin the Three runtime. Wait for the model to load before automatic motion, and hide ineffective spherical position fields for world-space memories. Her 147 tests/lint/build pass; integrated verification follows. Supabase project exists but connection details are not configured yet; sharing remains a separate task.

- codex/gallery-backup-access: add Restore ZIP on the homepage so fresh phones do not need to create a dummy palace first; await validation/persistence before navigation and display import errors. Preserve long-press deletion confirmation; clean up pending timers/object URLs.

Integrated verification: 156 tests across 14 files, typecheck, lint and production build pass. Local production browser verified gallery/template creation, house rendering and floor-click walking, world-surface memory reposition/save, return to gallery, and nine-photo ZIP restore through the homepage. Apartment connection slider remains 16–128px; no legacy zoom/Phone motion toolbar. Physical-phone testing of this combined commit remains unverified by Codex (user reports Aneesha tested her original 3D branch on her phone). Broader 3D collision/gesture refinements are deferred per user.

## Shared demo workspace — October 10, 2026

- codex/shared-demo-workspace (Codex, integration owner): user expanded scope to one shared Supabase workspace for both teammates; accounts and live co-editing are deferred. Private Storage keeps original raster bytes; server-only key and a signed HTTP-only demo session protect reads/writes. Postgres revision checks reject conflicting edits/deletes, including across Vercel instances. The UI offers explicit Load latest without silently discarding drafts. Local IndexedDB remains untouched; shared mode has no silent local fallback. Setup schema is supabase/shared-demo.sql. Physical-device verification and integrated checks pending.

Shared workspace verification: 175 tests across 16 files, typecheck and lint pass. Two independent authenticated sessions exercised real Supabase reads/writes, original image byte equality, upload retries, stale save/delete rejection and tombstone protection. Browser checked gallery, nine apartment rooms, generated transparent image + remote save, second-session note update, update banner/Load latest, and cleanup of the temporary memory. One real suggestion call and one real image-generation call succeeded through the shared cookie (no second code). The Family house renders at 390px; gallery has no horizontal overflow. Supabase tables/bucket are configured and seeded with My Apartment (nine rooms/16 connections) and Family house; private bucket and anonymous API denial verified. Vercel secret transfer requires the pending explicit user approval; production has not been changed.

## Shared access screen contrast — October 10, 2026

- codex/shared-entry-contrast (Codex): fix the pale shared-access page inheriting white text from the dark editor. Scope: access-page text, code field, focus, helper/error styling only. No data, session, dependency or persistence changes. Verified: `node node_modules/next/dist/bin/next build --webpack`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js .`, and `node node_modules/vitest/vitest.mjs run` (175 tests / 16 files) passed. Build and tests required normal host execution after sandbox EPERM/temp-module failures; typecheck passed after build generation. Local production browser: desktop and 390 x 844 page readable, no horizontal overflow at 390px, password field/focus and invalid-code alert visible. No production deployment performed. Existing My Apartment (nine rooms, 16 connections) and Family house must be preserved. Physical Android/iPhone testing remains outstanding.

## Floor connections and apartment deduplication

- codex/floor-hotspots (Codex, integration owner): add optional engine-independent Wall/Floor connection surface, live editor preview, camera-aware floor rendering and saved/ZIP roundtrip compatibility. Default legacy links to Wall. No dependency changes. Remove the confirmed duplicate apartment view through a revision-checked shared save, preserving memories and useful connections with a private recovery snapshot. Family house remains unchanged. Includes the verified shared-entry contrast fix. Checks pending; physical phones remain untested.

Verification: 182 tests / 17 files, standalone TypeScript check, ESLint and production build passed. Browser production build verified Wall/Floor live preview, perspective on pan, shared save/reload, cancel, unchanged doorway coordinates, connection navigation and 390 x 844 controls without horizontal overflow. A temporary Floor save was reverted to the doorway's Wall style. Photo 6 was byte-identical to photo 5 and removed by a revision-checked production save: eight rooms, 14 connections, all reachable, zero memories before/after. Family house matched its pre-change document exactly. Private recovery JSON remains ignored under private-media/recovery; original image assets were not deleted. Production feature deployment pending; physical Android/iPhone testing still not run.

Release status: local integration commit e9b9f20 includes this feature and fdd2eec contrast correction. Automatic approval review rejected both the GitHub main push and the Vercel production deployment because explicit authorization for publishing this combined release was absent. Neither action executed. Apartment deduplication is already confirmed in production; UI release is ready pending user approval.

## Deferred judging and public repository checklist

User decisions: discuss one question at a time. Continue polishing the app first. Do not create a separate judges' deployment/link or change repository visibility until the user says the app is ready and authorizes that step. No scheduled follow-up was requested.

- [ ] When the user approves the final app state, snapshot both My Apartment and Family house, including rooms, connections, memories and referenced assets. Current apartment: eight unique rooms / 14 connections after the requested duplicate removal; historical nine-room backups remain recovery sources.
- [ ] Create one separate judges' link for the Creative track (user expects approximately two judges). Open directly into the prepared palace gallery with no signup, demo code, image upload or ZIP restore required.
- [ ] Let judges explore, create/edit memories, and try AI image generation as shown in the demo video. Give the judges' demo its own editable copies of both palaces; saves, uploads and deletion must not affect the owner/teammate workspace. Confirm isolation in the API/storage layer as well as the UI.
- [ ] Keep provider/Supabase credentials server-only and retain appropriate generation limits in the judges' demo. Verify access from fresh browsers, both palace viewers, AI generation, saving/reload and isolation from the original workspace. Ensure the submitted link remains accessible throughout judging.
- [ ] Prepare the GitHub repository for public release later. Before changing visibility, inspect tracked files and history for secrets, private photos and backups, especially the owner-approved team-assets/apartment bundle. The prior approval covered a private repository only; agree on public-safe handling before publication. Preserve original source photos.
- [ ] Verify the public code/README and submission links when publication is authorized; record any required disclosure of work that existed before the event, based on the supplied submission requirements.
- [ ] Complete physical Android Chrome and iPhone Safari testing; browser viewport emulation does not verify hardware motion/permissions.

The judges' link and public repository are planned only. Neither has been created or published by this checklist update. The contrast/Wall-Floor production deployment and GitHub push remain separately pending approval.

## Hotspot navigation regression — October 11, 2026

- `codex/hotspot-navigation-guard` (Codex): owner reports desktop Hallway → Living room and breakfast bar sometimes arrives at Front entrance, including the room title. Read-only production inspection confirms the Hallway/Living destination is correct. No apartment/house data changed for this fix.
- Reproduced three input/lifecycle defects in failing adapter tests: a panorama drag can activate a hotspot, an old room button can deliver a late selection, and marker updates can install new room controls before panorama loading completes. Prevent these cases, ignore the second click of a double-click, resolve selections only in the current ready room, invalidate selection synchronously on navigation, and isolate panorama instances by room.
- Verification: 189 tests across 18 files, ESLint, production build, standalone TypeScript check and git diff --check passed. Production-build browser checks: the reported Hallway/Living hotspot route repeated six round trips plus initial/mobile transitions, panorama drag beginning on a circle does not navigate, double-click makes one transition, rapid thumbnail switches end in the selected room, deliberate memory click opens its note, and 390 x 844 navigation has no horizontal overflow. Browser console reported no errors. No production data was changed. No claim that the exact user gesture has been reproduced; these are demonstrated accidental-navigation paths. Physical-device testing remains unverified. This branch includes the pending contrast/floor-circle release; publication awaits release approval.

Navigation/contrast/floor release update: the owner subsequently approved publication. PR #3 merged as eced988; Vercel deployment dpl_44Q3RJGvKVR2ZeWCeuyYQPUmn9Jt is Ready at the stable production URL. Earlier pending-publication notes are historical.

## Apartment starter and simpler gallery — October 11, 2026

- `codex/apartment-starter-template` (Codex): remove the gallery Refresh shared space / Restore ZIP toolbar and its helper text. ZIP import/export remains inside the palace menu. Replace the empty Your own space card under Real Spaces with My Apartment, using its authenticated thumbnail and current room count.
- Create a fresh palace with remapped room/link IDs, preserved camera/circle settings and immutable photo references. Exclude the source revision and personal memories; await shared persistence before opening the copy. Missing/invalid starter and persistence failures remain visible. Original apartment and Family house stay unchanged. No schema, dependency or credential changes.
- Phone guidance explains existing full-360 equirectangular JPEG import; ordinary phone panoramas and in-app capture are explicitly Coming soon, not represented as implemented features.
- Verified: 192 tests / 18 files, lint, production build, standalone TypeScript check and diff checks passed. Production-build browser: gallery toolbar absent; authenticated apartment preview and eight-room count; named copy saved, rendered, navigated through a copied connection and persisted after reload; 390 x 844 chooser and naming dialog have no horizontal overflow; no console errors. Shared API checks confirmed all 19 current connections were copied with new IDs, original photo IDs retained, zero personal memories copied, and exact before/after hashes of both original palaces unchanged. Only the temporary verification palace was removed afterward. Physical-phone verification remains user-owned.
- Follow-up remains: reduce room-switch loading by decoupling panorama and memory downloads and reusing the viewer/cache without regressing the new selection guards. This template feature does not claim to fix that performance issue.

## Public submission and judges access — October 11, 2026

- Owner explicitly authorized making the existing GitHub repository and the apartment photos public, confirming the photos are theirs. This supersedes the private-only restriction for the existing team-assets/apartment bundle; credentials and unrelated private-media remain excluded.
- codex/judges-public-access: automatic signed sessions in a separate judges deployment, storage IDs and upload tickets scoped to judges, complete copies of the current palaces and assets, original workspace retained. AI secrets and rate/input/origin protections remain server-side. Verification and release pending.

Local verification: 199 tests across 19 files, ESLint, production build, standalone TypeScript check and git diff --check passed. Seven new regressions cover code-free session entry, refusing public mode on the original workspace, cross-workspace cookies/tickets, scoped reads/writes/deletes/assets, and gallery separation. Hosted verification pending.

Release verification: GitHub confirms PUBLIC and an unauthenticated GitHub API read returns 200/private=false. Audited 333 reachable Git blobs for configured secrets and credential patterns with zero findings before publication. Owner-authorized apartment assets remain in history.

Judges deployment https://mind-palace-360-judges.vercel.app is Ready (dpl_Ci15ZKFg9fEHXPt9cRpa9sMNmRTr). Anonymous entry returns 200 and automatically creates a session; the original team entry still returns 401. Two independent palace documents and 14 separately copied assets are seeded; downloaded image checksums all match the snapshot. One live suggestions request returned Gold bracelet/necklace/bar, and one live generation produced a 768 x 768 transparent PNG (351431 bytes). Temporary-palace image upload, save, reread, stale-save 409, cross-origin 403 and cleanup passed. A judge cookie is rejected by the team API (401). Both original palace rows match their full pre-release snapshots exactly. Local secret/recovery URLs return 404.

Browser: fresh judges gallery opened without code; apartment panorama and image rendered; circle navigation to Entry and stairs, Helium note reveal (Atomic Number 2), and AI editor without any code field verified. Family house rendered with Apple and Water Bottle; no browser console errors. Physical-phone checks remain unverified. Final visitor wording: 199 tests/19 files, ESLint, standalone TypeScript and Vercel production build/type check passed. Judges share their editable copies; originals remain protected.
