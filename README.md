# Mind Palace 360

Fresh hackathon rebuild: place visual associations inside a panorama and tap them to reveal memories.

## Local startup

Node 22+; `npm install`, then `npm run dev -- --port 3001`. Open http://localhost:3001.

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

Copy `.env.example` to `.env.local` for optional server-only AI. Never paste credentials into chat or commit them. AI access uses a separate demo code.

Import apartment JPGs through the interface. Copies may be placed in `private-media/apartment/`; that folder is excluded from Git and deployment. Originals are never modified.

Saved palaces belong to this browser and origin. ZIP export/import transfers data between devices. Hosting alone does not synchronize memories.

See docs/PLAN.md, docs/TASKS.md, docs/TEST_PLAN.md, and docs/TEST_RESULTS.md for current status. No phone sensor behavior is claimed without a physical-device check.
