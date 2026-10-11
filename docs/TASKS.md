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
