# Mind Palace 360

A visual memory palace: place an image in a 360 room, then tap it to reveal the idea or story it represents.

Demo: https://mind-palace-360-v1.vercel.app
Private repository: https://github.com/Nahomatnafu/mind-palace-360-v1
QR: public/demo-qr.png

## Start locally

Node22+, then npm ci and npm run dev. Open http://localhost:3005. For production: npm run build then npm start. The new project directory currently retains the local folder name mind-palace-360-v2; its GitHub repository is v1.

Checks: npm run typecheck, npm run lint, npm test, npm run build. Build uses webpack with disk cache disabled after the initial disk-space failure. Vercel clean installation/build was verified.

## Create a memory

Choose Edit palace if you are viewing. Select + Add memory, then tap a spot in the room. Upload JPEG/PNG/WebP, enter a title and plain-text note, and Save memory. Tap the image to open its note; Edit memory supports replacement, resizing, repositioning and deletion. Advanced positioning preserves string drafts until Apply and has a sign toggle for mobile keyboards.

Create a palace through Palaces → New palace. Import equirectangular360 JPEGs. Room settings rename palaces/rooms and set the entrance view. Connect rooms places small circular markers; edit/remove connections through Room settings. View palace hides editing tools.

## AI

Copy .env.example to ignored .env.local. Set OPENROUTER_API_KEY and a separate DEMO_ACCESS_CODE. Optional OPENROUTER_TEXT_MODEL and OPENROUTER_IMAGE_MODEL configure models. No NEXT_PUBLIC key is used. Local credentials were configured using the existing authorized key. The local demo code is in ignored private-media/DEMO_ACCESS.txt.

In a memory editor, expand Create an image with AI. Enter a concept, optional context and demo code. Ask for three suggestions, select/edit one, explicitly Generate one image, then Use image and Save memory. Room photos are never sent to AI. Requests are not automatically retried. Cancelling a request cannot undo provider work already completed.

The verified image interface is OpenRouter POST /api/v1/images with openai/gpt-image-2.5-flare; generation normalizes to768px PNG. One deployed real smoke test returned768×768,895924bytes and true transparency. Prepared demo artwork uses a256px,23782byte derivative of that image. Text default google/gemini-2.5-flash-lite is available now but the provider catalog lists expiry October20,2026; update configurable model before that date.

Paid routes validate the access code, same-origin requests, JSON size and inputs. Limits are per server instance:12 suggestion requests /3 image requests per10min,2 concurrent. These are not a global billing cap.

## Photos, saving and transfer

Original sources: D:/OpenView Homes_First AD_Batch/. Never modify originals. Additional copies can go in ignored private-media/apartment/. Import through the interface; placing files in that folder does not auto-import them. One original apartment image was tested locally. Private images and ZIP backups are excluded from repository/deployment.

Palaces/images live in IndexedDB on this browser/device/origin. The hosted app also imports files locally into the browser; it does not upload panorama bytes to our server. Changing origins or devices does not synchronize data. Palaces → Export ZIP makes a backup; Restore ZIP creates a new palace with new IDs. Keep a backup before deleting or clearing browser storage.

## Phone motion

Open the HTTPS demo in Android Chrome or iPhone Safari. Tap Enable motion, accept the permission prompt if shown, move the phone gently, and use Recenter/Disable motion. Opening editors/notes or changing rooms disables motion. Touch drag remains available. Actual Android/iPhone sensors, permission prompts and keyboard behavior still require physical-device checks; emulated layout tests do not prove them.

## Density fixture and boundaries

node --experimental-strip-types scripts/generate-density.mjs creates ignored .preview-runtime/density-118.zip:118 distinct128px PNGs,224283bytes total. Restore it for a technical density test. Browser validation found118 markers,118 unique images and one canvas. This is not evidence that anyone memorized118 items.

Default memory artwork is28–40 CSSpixels and stays fixed in screen size across zoom. Surface-attached perspective layers are deferred. Navigation connects panoramas; there is no reconstructed3D walking environment. VR, native apps, cloud sync, accounts and spaced repetition are deferred. No offline guarantee or PWA is claimed.

Runtime npm audit --omit=dev reported0 vulnerabilities. Full audit reports5 transitive development-linter advisories from braces3.0.3; registry has no patched compatible version. Do not apply a forced downgrade of Next’s ESLint configuration. This is recorded for follow-up.

See docs/TEST_RESULTS.md for exact evidence and limits, docs/TASKS.md for ownership, and docs/DEMO.md for judging and phone checks.
