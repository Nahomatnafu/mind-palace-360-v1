# Fresh build task board

Integration owner: Codex. Integration branch: codex/integration.

| Branch | Owner | Scope | Status / dependency |
|---|---|---|---|
| codex/bootstrap | Codex | Fresh setup, shared contracts, checks | In progress |
| codex/viewer | Codex | Adapter and rendering feasibility | Awaiting bootstrap |
| codex/tour-navigation | Codex | Room CRUD and links | Awaiting viewer |
| codex/image-memories | Codex | Placement, note editing, import | Awaiting viewer |
| codex/local-persistence | To assign | IndexedDB, ZIP validation | Awaiting committed contracts |
| codex/ai-associations | To assign | Server-only suggestions | Awaiting committed contracts |
| codex/ai-image-generation | To assign | Verified model, image normalization | Awaiting API verification |
| codex/mobile-motion | Codex | Permission, recenter, signed coordinate fields | Physical tests required |
| codex/demo-delivery | Codex | Vercel, approved demo assets, QR | Network/hosting credentials required |
| codex/demo-regression | To assign | Independent regression | Awaiting running app |

## Dependencies

- Local repository initialized. GitHub remote/invitation pending CLI credential/network access. User reports signing in; tool isolation must be resolved before declaring authentication invalid.
- Package registry DNS is inaccessible in the isolated runtime. Attempting cached dependency installation; current version/security verification remains pending.
- Apartment images can be copied into private-media/apartment. Do not publish these.
