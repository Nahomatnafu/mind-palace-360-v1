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

Apartment collection: nine supplied panoramas restored locally as a separate palace with 16 editable circular connections. ZIP and connection coordinates remain in ignored private-media. Photos 5 and 6 are identical and both are retained. No apartment assets are published. Initial doorway placement is approximate; the owner can drag circles or edit their coordinates/destination.

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
