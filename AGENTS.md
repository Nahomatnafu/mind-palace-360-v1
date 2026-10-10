# Fresh Mind Palace 360 contributor guide

Read docs/PLAN.md and your assignment in docs/TASKS.md before edits. The finalized master prompt controls scope; the older prototype plan is reference only.

- Preserve original photos. Never commit or deploy private-media, property photos, backups, or secrets.
- Use codex/ feature branches and separate worktrees for concurrent code changes.
- Integration owner controls shared models, repository interfaces, dependencies, and lockfile.
- Application data uses degrees: yaw [-180,180), pitch [-90,90]; engine units belong only in the adapter.
- Await persistence. Failed saving must show an error, never a success state.
- User content is plain text; uploads accept decoded JPEG/PNG/WebP, never SVG/HTML.
- Run typecheck, lint, tests, and production build before integration. Report exact checks and physical-device limitations.
- Read applicable version-specific guides under node_modules/next/dist/docs/ before implementing Next.js APIs.
- Continue unaffected work and record blocked dependencies in docs/TASKS.md.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
