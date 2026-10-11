import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { normalizeYaw, toRadians, type Camera, type Vec3 } from '@/domain/model';
import type { CameraControls, ViewerMarker } from './adapter';

/** Street View style walkthrough of a glTF model: look around in place, tap the floor to glide there. */
export interface ModelView { position?: Vec3; camera: Camera }
export interface ModelCallbacks {
  select(id: string): void;
  /** Return true when the tap was consumed by a placement; otherwise a walkable tap moves the viewer. */
  place(point: Vec3, camera: Camera): boolean;
  move?(id: string, point: Vec3): void;
  moved?(position: Vec3): void;
  camera?(camera: Camera): void;
}
export interface ModelViewerAdapter extends CameraControls {
  load(src: string, view: ModelView): Promise<void>;
  position(): Vec3;
  moveTo(position: Vec3): void;
  /** What a tap at these client coordinates would hit; useful for diagnostics and tests. */
  probe(clientX: number, clientY: number): { point: Vec3; normal: Vec3; walkable: boolean; floorLevels: number[]; object: string; origin: Vec3; direction: Vec3 } | null;
  editMarkers(enabled: boolean): void;
  snapshot(width?: number, height?: number): string;
  destroy(): void;
}
export const EYE_HEIGHT = 1.6;
const MAX_FOV = 110, MIN_FOV = 30, DRAG_THRESHOLD = 5, TOUCH_DRAG_THRESHOLD = 8, STEP = 1.2, PINCH_GAIN = 60;
export const fovForZoom = (zoom: number) => MAX_FOV - Math.max(0, Math.min(100, zoom)) * (MAX_FOV - MIN_FOV) / 100;
/** Fingers jitter more than a mouse, so a touch needs to travel further before a tap turns into a look-around drag. */
export const dragThresholdFor = (pointerType: string) => pointerType === 'touch' ? TOUCH_DRAG_THRESHOLD : DRAG_THRESHOLD;
/**
 * Pinch zoom from the ratio of finger distances rather than raw pixels, so the same physical gesture zooms the same
 * amount on every screen density. Spreading fingers to double their distance adds `gain` zoom; the result stays in 0..100.
 */
export function pinchZoom(zoom: number, previousDistance: number, distance: number, gain = PINCH_GAIN): number {
  if (!(previousDistance > 0) || !(distance > 0) || !Number.isFinite(zoom)) return Math.max(0, Math.min(100, zoom || 0));
  return Math.max(0, Math.min(100, zoom + (distance / previousDistance - 1) * gain));
}
/** Marker size is stored in centimetres for 3D rooms; this is its on-screen size at a given distance. */
export function projectedMarkerSize(sizeCm: number, distance: number, fovDegrees: number, viewportHeight: number): number {
  const focal = viewportHeight / (2 * Math.tan(toRadians(fovDegrees) / 2));
  const px = (sizeCm / 100) * focal / Math.max(distance, 0.05);
  return Math.max(8, Math.min(320, Number.isFinite(px) ? px : 8));
}
export function directionFor(yaw: number, pitch: number): Vec3 {
  const y = toRadians(yaw), p = toRadians(pitch);
  return { x: Math.sin(y) * Math.cos(p), y: Math.sin(p), z: -Math.cos(y) * Math.cos(p) };
}
/** A surface counts as walkable when it faces up and sits near one of the model's floor levels (rugs, steps and the yard included). */
export function isWalkable(normalY: number, pointY: number, floorLevels: number[]) { return normalY > 0.7 && floorLevels.some(level => pointY <= level + 0.3 && pointY >= level - 0.6); }
/** Floor levels come from thin, wide nodes named floor_*, which skips things like floor lamps. */
export function floorLevelsOf(root: THREE.Object3D, fallback: number): number[] {
  const levels: number[] = [];
  root.traverse(o => { if (!/^floor_/i.test(o.name)) return; const box = new THREE.Box3().setFromObject(o); const extent = box.getSize(new THREE.Vector3()); if (extent.y < 0.15 && extent.x > 0.5 && extent.z > 0.5) levels.push(Math.round(box.max.y * 100) / 100); });
  return levels.length ? [...new Set(levels)] : [fallback];
}
const vec = (v: THREE.Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z });
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** Merges meshes by material so the house renders in tens of draw calls instead of hundreds. */
function mergeByMaterial(root: THREE.Object3D): THREE.Mesh[] {
  root.updateMatrixWorld(true);
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    let geometry = (object.geometry as THREE.BufferGeometry).clone();
    if (!geometry.getAttribute('position')) return;
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    for (const name of Object.keys(geometry.attributes)) if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    geometry.morphAttributes = {};
    if (geometry.index) geometry = geometry.toNonIndexed();
    geometry.applyMatrix4(object.matrixWorld);
    const list = groups.get(object.material) ?? [];
    list.push(geometry); groups.set(object.material, list);
  });
  const meshes: THREE.Mesh[] = [];
  for (const [material, geometries] of groups) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());
    if (!merged) throw new Error('merge failed');
    merged.computeBoundingSphere(); merged.computeBoundingBox();
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = material.name || 'merged';
    meshes.push(mesh);
  }
  return meshes;
}

export function createModelViewer(container: HTMLElement, callbacks: ModelCallbacks): ModelViewerAdapter {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', '3D room. Drag to look around, tap the floor to walk there.');
  // The stage container already has touch-action:none; repeat it on the canvas and block long-press callouts and
  // text selection so browser gestures (double-tap zoom, context menus) never interrupt look/walk gestures.
  canvas.style.touchAction = 'none'; canvas.style.userSelect = 'none'; canvas.style.setProperty('-webkit-user-select', 'none'); canvas.style.setProperty('-webkit-touch-callout', 'none');
  if (!container.style.touchAction && getComputedStyle(container).touchAction !== 'none') container.style.touchAction = 'none';
  container.append(canvas);
  const overlay = document.createElement('div'); overlay.className = 'model-markers'; container.append(overlay);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfe3ea');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x90a0a8, 1.4));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2); sun.position.set(12, 20, 8); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.8); fill.position.set(-10, 12, -14); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const camera = new THREE.PerspectiveCamera(fovForZoom(35), 1, 0.05, 300);
  const cursor = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }));
  cursor.rotation.x = -Math.PI / 2; cursor.renderOrder = 10; cursor.visible = false; scene.add(cursor);
  const raycaster = new THREE.Raycaster();
  let model: THREE.Group | null = null, solids: THREE.Mesh[] = [], floorLevels: number[] = [0];
  let bounds = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
  const state = { yaw: 0, pitch: 0, zoom: 35, position: new THREE.Vector3(0, EYE_HEIGHT, 0) };
  let dirty = true, disposed = false, request = 0, editing = false;
  let tween: { from: THREE.Vector3; to: THREE.Vector3; start: number; duration: number } | null = null;
  const markerItems = new Map<string, { item: ViewerMarker; element: HTMLButtonElement; world: THREE.Vector3 }>();
  let lastOcclusion = 0, occlusionPending = false;

  const size = () => ({ width: Math.max(1, container.clientWidth), height: Math.max(1, container.clientHeight) });
  function resize() { const { width, height } = size(); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true; }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();

  function applyCamera() {
    const d = directionFor(state.yaw, state.pitch);
    camera.position.copy(state.position);
    camera.lookAt(state.position.x + d.x, state.position.y + d.y, state.position.z + d.z);
    camera.fov = fovForZoom(state.zoom); camera.updateProjectionMatrix();
    // Keep picking and projection correct even before the next frame renders (e.g. in a background tab).
    camera.updateMatrixWorld(true);
    dirty = true;
  }
  const currentCamera = (): Camera => ({ yaw: normalizeYaw(state.yaw), pitch: state.pitch, zoom: state.zoom });
  function setView(yaw: number, pitch: number, zoom = state.zoom) { state.yaw = normalizeYaw(yaw); state.pitch = Math.max(-85, Math.min(85, pitch)); state.zoom = Math.max(0, Math.min(100, zoom)); applyCamera(); callbacks.camera?.(currentCamera()); }

  function cast(clientX: number, clientY: number): THREE.Intersection | null {
    if (!solids.length) return null;
    const rect = canvas.getBoundingClientRect();
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1), camera);
    return raycaster.intersectObjects(solids, false)[0] ?? null;
  }
  function worldNormal(hit: THREE.Intersection): THREE.Vector3 { return hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize() : new THREE.Vector3(0, 1, 0); }
  function walkTarget(hit: THREE.Intersection): THREE.Vector3 | null { const n = worldNormal(hit); return isWalkable(n.y, hit.point.y, floorLevels) ? new THREE.Vector3(hit.point.x, hit.point.y + EYE_HEIGHT, hit.point.z) : null; }
  function surfacePoint(hit: THREE.Intersection): Vec3 { const n = worldNormal(hit); return vec(hit.point.clone().addScaledVector(n, 0.03)); }
  function glideTo(target: THREE.Vector3) { tween = { from: state.position.clone(), to: target, start: performance.now(), duration: Math.min(900, 350 + state.position.distanceTo(target) * 90) }; dirty = true; }
  function step(direction: 1 | -1) {
    const d = directionFor(state.yaw, 0);
    const ahead = new THREE.Vector3(d.x, 0, d.z).multiplyScalar(direction);
    raycaster.set(state.position.clone(), ahead); raycaster.far = STEP + 0.35;
    const blocked = raycaster.intersectObjects(solids, false)[0]; raycaster.far = Infinity;
    if (blocked) return;
    const probe = state.position.clone().addScaledVector(ahead, STEP); probe.y += 0.5;
    raycaster.set(probe, new THREE.Vector3(0, -1, 0)); raycaster.far = EYE_HEIGHT + 1.5;
    const ground = raycaster.intersectObjects(solids, false)[0]; raycaster.far = Infinity;
    if (!ground) return;
    const target = walkTarget(ground); if (target) glideTo(target);
  }

  // Look-around drag, pinch zoom and tap handling on the canvas.
  const pointers = new Map<number, { x: number; y: number }>();
  // `multi` is set as soon as a second finger lands and never cleared for the gesture, so a pinch can't end in a walk tap.
  let gesture: { x: number; y: number; yaw: number; pitch: number; moved: boolean; multi: boolean; time: number; type: string } | null = null;
  let pinch = 0;
  const pointerDistance = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch { /* Synthetic or already-released pointers cannot be captured; the gesture still works. */ }
    if (pointers.size === 1) { gesture = { x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch, moved: false, multi: false, time: performance.now(), type: e.pointerType }; container.classList.add('dragging'); }
    else { pinch = pointers.size === 2 ? pointerDistance() : 0; if (gesture) { gesture.moved = true; gesture.multi = true; } }
    cursor.visible = false; dirty = true;
    e.preventDefault();
  };
  let hoverAt = 0;
  const onPointerMove = (e: PointerEvent) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) { if (pointers.size === 2) { const d = pointerDistance(); if (pinch) setView(state.yaw, state.pitch, pinchZoom(state.zoom, pinch, d)); pinch = d; } return; }
    if (gesture && pointers.has(e.pointerId)) {
      const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
      if (!gesture.moved && Math.hypot(dx, dy) > dragThresholdFor(gesture.type)) gesture.moved = true;
      if (gesture.moved) { const perPixel = camera.fov / size().height; setView(gesture.yaw - dx * perPixel, gesture.pitch + dy * perPixel); }
      return;
    }
    if (e.pointerType !== 'mouse' || performance.now() - hoverAt < 50) return;
    hoverAt = performance.now();
    const hit = cast(e.clientX, e.clientY); const target = hit ? walkTarget(hit) : null;
    cursor.visible = !!target; container.classList.toggle('walkable', !!target);
    if (target && hit) cursor.position.set(hit.point.x, hit.point.y + 0.01, hit.point.z);
    dirty = true;
  };
  const onPointerUp = (e: PointerEvent) => {
    const had = pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (!had || !gesture) return;
    const g = gesture; if (pointers.size === 0) { gesture = null; container.classList.remove('dragging'); }
    // When a pinch drops to one finger, re-anchor the drag on the remaining finger so the view doesn't jump.
    else if (pointers.size === 1) { const [rest] = [...pointers.values()]; gesture = { ...g, x: rest.x, y: rest.y, yaw: state.yaw, pitch: state.pitch, moved: true, multi: true }; }
    if (g.multi || g.moved || pointers.size > 0 || performance.now() - g.time > 700) return;
    const hit = cast(e.clientX, e.clientY);
    if (!hit) return;
    if (callbacks.place(surfacePoint(hit), currentCamera())) return;
    const target = walkTarget(hit); if (target) glideTo(target);
  };
  const onPointerCancel = (e: PointerEvent) => { pointers.delete(e.pointerId); if (!pointers.size) { gesture = null; container.classList.remove('dragging'); pinch = 0; } };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); setView(state.yaw, state.pitch, state.zoom - e.deltaY * 0.05); };
  const onLeave = () => { cursor.visible = false; container.classList.remove('walkable'); dirty = true; };
  const onKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target !== document.body && !container.contains(target)) return;
    if (document.querySelector('[role=dialog]')) return;
    if (e.key === 'ArrowUp' || e.key === 'w') step(1); else if (e.key === 'ArrowDown' || e.key === 's') step(-1);
    else if (e.key === 'ArrowLeft' || e.key === 'a') setView(state.yaw - 15, state.pitch); else if (e.key === 'ArrowRight' || e.key === 'd') setView(state.yaw + 15, state.pitch); else return;
    e.preventDefault();
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', onKey);

  // Marker dragging in edit mode: the marker follows whatever surface is under the pointer.
  let drag: { id: string; pointerId: number; x: number; y: number; moved: boolean; original: THREE.Vector3; point: Vec3 } | null = null;
  let suppressed: { id: string; until: number } | null = null;
  const markerDown = (e: PointerEvent) => {
    const button = (e.target as Element).closest('[data-marker-id]') as HTMLButtonElement | null;
    const entry = button && markerItems.get(button.dataset.markerId ?? '');
    if (!editing || !entry || e.button !== 0 || drag) return;
    e.preventDefault(); e.stopPropagation();
    try { button.setPointerCapture(e.pointerId); } catch { /* See above. */ }
    drag = { id: entry.item.id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false, original: entry.world.clone(), point: vec(entry.world) };
  };
  const markerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) <= dragThresholdFor(e.pointerType)) return;
    const hit = cast(e.clientX, e.clientY); if (!hit) return;
    drag.moved = true; drag.point = surfacePoint(hit);
    const entry = markerItems.get(drag.id); if (entry) { entry.world.set(drag.point.x, drag.point.y, drag.point.z); dirty = true; }
  };
  const markerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const done = drag; drag = null;
    if (done.moved) { suppressed = { id: done.id, until: Date.now() + 400 }; callbacks.move?.(done.id, done.point); }
  };
  const cancelDrag = () => { if (drag) { const entry = markerItems.get(drag.id); if (entry) entry.world.copy(drag.original); drag = null; dirty = true; } };
  overlay.addEventListener('pointerdown', markerDown, true);
  window.addEventListener('pointermove', markerMove, true);
  window.addEventListener('pointerup', markerUp, true);
  window.addEventListener('pointercancel', cancelDrag, true);
  window.addEventListener('blur', cancelDrag);

  function layoutMarkers(now: number) {
    if (!markerItems.size) return;
    const { width, height } = size();
    // Occlusion rays are throttled while moving; a pending pass always runs once the view settles.
    const occlude = now - lastOcclusion > 150 && solids.length > 0;
    if (occlude) lastOcclusion = now; else occlusionPending = solids.length > 0;
    const projected = new THREE.Vector3();
    for (const entry of markerItems.values()) {
      projected.copy(entry.world).project(camera);
      const visible = projected.z < 1 && Math.abs(projected.x) < 1.3 && Math.abs(projected.y) < 1.3;
      entry.element.classList.toggle('hidden', !visible);
      if (!visible) continue;
      entry.element.style.transform = `translate(${((projected.x + 1) / 2 * width).toFixed(1)}px, ${((1 - projected.y) / 2 * height).toFixed(1)}px) translate(-50%, -50%)`;
      const toMarker = entry.world.clone().sub(camera.position); const distance = toMarker.length();
      // Perspective sizing: a memory keeps its real-world size, so it shrinks with distance like the room around it.
      const px = projectedMarkerSize(entry.item.size, distance, camera.fov, height).toFixed(1) + 'px';
      entry.element.style.width = px; entry.element.style.height = px;
      if (occlude) {
        raycaster.set(camera.position, toMarker.normalize()); raycaster.far = distance;
        const hit = raycaster.intersectObjects(solids, false)[0]; raycaster.far = Infinity;
        entry.element.classList.toggle('occluded', !!hit && hit.distance < distance - 0.08);
      }
    }
  }
  function frame(now: number) {
    if (disposed) return;
    if (tween) {
      const t = Math.min(1, (now - tween.start) / tween.duration);
      state.position.lerpVectors(tween.from, tween.to, easeInOut(t)); applyCamera();
      if (t >= 1) { tween = null; callbacks.moved?.(vec(state.position)); }
    }
    if (!dirty && !tween && occlusionPending && now - lastOcclusion > 150) { occlusionPending = false; dirty = true; }
    if (dirty || tween) { dirty = false; renderer.render(scene, camera); layoutMarkers(now); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function disposeModel() {
    if (model) { scene.remove(model); model.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => m.dispose()); } }); }
    for (const mesh of solids) { scene.remove(mesh); mesh.geometry.dispose(); }
    model = null; solids = [];
  }
  function defaultStart(root: THREE.Object3D): THREE.Vector3 {
    const floor = new THREE.Box3(); let found = false;
    root.traverse(o => { if (!found && /^floor_/.test(o.name)) { floor.setFromObject(o); found = true; } });
    const center = (found ? floor : bounds).getCenter(new THREE.Vector3());
    return new THREE.Vector3(center.x, Math.min(...floorLevels) + EYE_HEIGHT, center.z);
  }

  return {
    async load(src, view) {
      const version = ++request;
      const gltf = await new GLTFLoader().loadAsync(src);
      if (disposed || version !== request) return;
      disposeModel();
      const root = gltf.scene; root.updateMatrixWorld(true);
      bounds = new THREE.Box3().setFromObject(root);
      floorLevels = floorLevelsOf(root, bounds.min.y);
      try { solids = mergeByMaterial(root); solids.forEach(m => scene.add(m)); }
      catch { model = root; scene.add(root); solids = []; root.traverse(o => { if (o instanceof THREE.Mesh) solids.push(o); }); }
      const far = bounds.getSize(new THREE.Vector3()).length() * 2; camera.far = Math.max(100, far);
      state.position.copy(view.position ? new THREE.Vector3(view.position.x, view.position.y, view.position.z) : defaultStart(root));
      state.yaw = normalizeYaw(view.camera.yaw); state.pitch = view.camera.pitch; state.zoom = view.camera.zoom;
      tween = null; applyCamera();
    },
    markers(items) {
      if (disposed) return;
      cancelDrag();
      const keep = new Set<string>();
      for (const item of items) {
        if (!item.position) continue;
        keep.add(item.id);
        let entry = markerItems.get(item.id);
        if (!entry) {
          const button = document.createElement('button');
          button.type = 'button'; button.dataset.markerId = item.id;
          button.addEventListener('click', event => { event.stopPropagation(); if (suppressed?.id === item.id && Date.now() < suppressed.until) { suppressed = null; return; } callbacks.select(item.id); });
          overlay.append(button);
          entry = { item, element: button, world: new THREE.Vector3() }; markerItems.set(item.id, entry);
        }
        entry.item = item; entry.world.set(item.position.x, item.position.y, item.position.z);
        const button = entry.element;
        button.className = `palace-marker ${item.kind}`; button.setAttribute('aria-label', item.label); button.title = item.label;
        button.replaceChildren();
        if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = ''; image.draggable = false; button.append(image); }
        else { const ring = document.createElement('span'); ring.className = 'portal-ring'; button.append(ring); }
      }
      for (const [id, entry] of markerItems) if (!keep.has(id)) { entry.element.remove(); markerItems.delete(id); }
      // Place new markers right away so they never flash at the overlay origin before the next frame.
      lastOcclusion = 0; layoutMarkers(performance.now()); dirty = true;
    },
    camera: currentCamera,
    lookAt(view) { setView(view.yaw, view.pitch, view.zoom); },
    zoom(delta) { setView(state.yaw, state.pitch, state.zoom + delta); },
    position: () => vec(state.position),
    moveTo(position) { glideTo(new THREE.Vector3(position.x, position.y, position.z)); },
    probe(clientX, clientY) { const hit = cast(clientX, clientY); if (!hit) return null; const n = worldNormal(hit); return { point: vec(hit.point), normal: vec(n), walkable: isWalkable(n.y, hit.point.y, floorLevels), floorLevels, object: hit.object.name, origin: vec(raycaster.ray.origin), direction: vec(raycaster.ray.direction) }; },
    editMarkers(enabled) { editing = enabled; container.classList.toggle('editing-markers', enabled); if (!enabled) cancelDrag(); },
    snapshot(width = 640, height = 480) {
      renderer.render(scene, camera);
      const out = document.createElement('canvas'); out.width = width; out.height = height;
      const context = out.getContext('2d'); if (!context) return '';
      const scale = Math.max(width / canvas.width, height / canvas.height), w = canvas.width * scale, h = canvas.height * scale;
      context.drawImage(canvas, (width - w) / 2, (height - h) / 2, w, h);
      return out.toDataURL('image/jpeg', 0.82);
    },
    destroy() {
      disposed = true; request++; cancelDrag(); observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown); canvas.removeEventListener('pointermove', onPointerMove); canvas.removeEventListener('pointerup', onPointerUp); canvas.removeEventListener('pointercancel', onPointerCancel); canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey); overlay.removeEventListener('pointerdown', markerDown, true); window.removeEventListener('pointermove', markerMove, true); window.removeEventListener('pointerup', markerUp, true); window.removeEventListener('pointercancel', cancelDrag, true); window.removeEventListener('blur', cancelDrag);
      disposeModel(); cursor.geometry.dispose(); (cursor.material as THREE.Material).dispose();
      renderer.dispose(); canvas.remove(); overlay.remove(); markerItems.clear();
    },
  };
}
