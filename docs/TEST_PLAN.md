# Feature acceptance plan

Every result must be PASS, FAIL, BLOCKED, or NOT RUN, with command, environment, and limitation.

| Feature | Automated checks | Browser / physical acceptance |
|---|---|---|
| Bootstrap | Typecheck, lint, production build | Loads on new port; original app untouched |
| Viewer | Coordinate conversion, lifecycle | Drag, pinch, room changes, one viewer, cleanup |
| Import | File signature/dimensions/limits | JPEG 2:1 accepted; unsupported rejected; original unchanged |
| Memories | Model validation | Upload/place/open/edit/move/resize/replace/delete; text-safe notes |
| Marker zoom | Fixed size config | Compare actual bounding boxes across min/mid/max zoom |
| Persistence | fake-indexeddb transactions/failure | Refresh/reopen; errors visible; no false save success |
| ZIP | Round trip, malformed/oversized/traversal/ID collision | Restore on a second origin without data loss |
| Suggestions | Structured output, validation, auth/provider errors | Three distinct choices, edit/select, manual fallback |
| Generation | Payload/image validation, duplicate request control | Preview/save; no automatic paid retries; unavailable model |
| Coordinates | Intermediate '-', '-0.', negatives/decimals/bounds | Android/iPhone keyboard sign toggle, cancel/commit |
| Motion | Orientation mapping, permission/unsupported state | Real Android/iPhone HTTPS, recenter, rotation, pause/resume |
| Density | 118 distinct fixtures, lifecycle | Clutter, selection, zoom, repeated room switches, one canvas |
| Delivery | Secret/private-file exclusion | Stable HTTPS, QR, teammate deployment, saved demo backup |

Physical sensor tests remain NOT RUN until real devices report results. Browser emulation alone is insufficient. Keep paid live API tests minimal; use mocks for failures.
# Dragging hotspots

- Move hotspots mode: drag both a room circle and an image. Preview follows the pointer; save only on drop. A drag must not navigate, place a second marker, or pan the camera.
- A tap and tiny movement still select. View mode continues normal navigation and panorama panning.
- Signed projected positions: negative yaw and positive/negative pitch; manual '-' drafts and Apply continue to work.
- Pointer cancellation, other fingers, disabling editing, switching rooms, blur and disposal cancel safely. No write for a cancelled drag.
- Persistence error remains visible and restores the last committed marker. Reload confirms a successful drop.
- Import prepared apartment ZIP: nine rooms, 16 valid directed connections, original photos unchanged, private files excluded from Git/deployment. Test destination selection and all nine room renders.
- Physical Android/iPhone touch dragging remains a required device check.
