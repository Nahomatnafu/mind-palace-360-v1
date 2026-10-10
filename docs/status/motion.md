# Browser motion controller

## Acceptance plan

- Pure orientation math: upright phone yaw, pitch, roll, screen rotation, null/nonfinite sensors, angle wrap and smoothing.
- Mock lifecycle: insecure, missing API, denied/failed permission, waiting/active, no-data timeout, recenter, hidden/resume, orientation changes, disable/destroy, pending permission cancellation.
- Integration: explicit enable gesture, caller disables while editing, camera adapter mapping.
- Physical Android Chrome and iPhone Safari: permissions, roll/landscape, drift, recenter, resume; NOT RUN until actual devices tested.

Read MDN DeviceOrientationEvent.requestPermission guidance: HTTPS and transient user activation. No dependency changes or panorama-engine types.

## Results

PASS: final production build (Next 16.4 webpack), typecheck, ESLint, 12 motion unit tests. PASS: complete worktree suite 42 tests using vitest run --maxWorkers=1 --no-file-parallelism --no-isolate. Default isolated suite intermittently failed because sandbox temporary Vite transformed modules were missing (ENOENT); shared-worker rerun passes. Test process exits zero with a 10-second Vite server shutdown warning.

NOT RUN: physical Android/iPhone sensor behavior, permission dialogs, long-session drift, panorama adapter integration. Synthetic lifecycle events are not physical-device verification.

## Integration

Named export createMotionController({getCamera,onCamera,onState}) provides enable, disable, recenter, destroy. onState receives {status,message}; statuses include disabled, requesting, unsupported, insecure, denied, waiting, active, paused, error. Call enable directly from a user click, without an earlier awaited operation. Disable during edits/modal content and when changing rooms; enable or recenter after the next view loads. Destroy on unmount.

Yaw is degrees with positive heading to the right, normalized [-180,180); pitch [-90,90]. The relative baseline preserves the initial view. Camera roll is omitted; screen changes and background resume recalibrate without jumping the current heading. Request is relative orientation, without requiring a compass/magnetometer. The optical heading is unstable at an exact vertical pole; current heading is held near that pole once samples exist.

Smoothing uses a short-arc heading interpolation and stops frame work once stationary. No added dependencies, engine types, or device data storage. Permission reference: https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static
