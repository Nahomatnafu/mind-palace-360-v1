export const DEFAULT_CONNECTION_SIZE = 30;
export const MAX_CONNECTION_SIZE = 128;
/** Engine-independent contract. All camera coordinates are degrees. */
export interface Camera { yaw: number; pitch: number; zoom: number }
/** World-space metres inside a 3D model room (y up). */
export interface Vec3 { x: number; y: number; z: number }
export interface Room { id: string; title: string; panoramaAssetId?: string; demoSrc?: string; modelSrc?: string; initialView: Camera; initialPosition?: Vec3 }
export interface Memory { id: string; roomId: string; title: string; note: string; imageAssetId?: string; demoSrc?: string; yaw: number; pitch: number; size: number; provenance: 'upload' | 'generated' | 'demo'; position?: Vec3 }
export interface TourLink { id: string; roomId: string; targetRoomId: string; yaw: number; pitch: number; label: string; size?: number; position?: Vec3 }
export interface Palace { schemaVersion: 1; id: string; title: string; description?: string; startRoomId: string; rooms: Room[]; memories: Memory[]; links: TourLink[]; updatedAt: string }
export interface Asset { id: string; blob: Blob; mimeType: string; width: number; height: number; kind: 'panorama' | 'memory' }
export interface PalaceSummary { id: string; title: string; updatedAt: string }
export interface PalaceRepository {
  list(): Promise<PalaceSummary[]>;
  load(id: string): Promise<Palace | undefined>;
  save(palace: Palace, assets?: Asset[]): Promise<void>;
  remove(id: string): Promise<void>;
  asset(id: string): Promise<Asset | undefined>;
}
export interface Association { id: string; title: string; explanation: string; prompt: string }
export const MAX_MEMORY_SIZE = 128;
export const toDegrees = (radians: number) => radians * 180 / Math.PI;
export const toRadians = (degrees: number) => degrees * Math.PI / 180;
export const normalizeYaw = (yaw: number) => ((yaw + 180) % 360 + 360) % 360 - 180;
export function coordinateDraft(value: string, min: number, max: number): number {
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) throw new Error('Enter a complete number.');
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`Use a value between ${min} and ${max}.`);
  return number;
}
export function validatePalace(value: unknown): asserts value is Palace {
  if (!value || typeof value !== 'object') throw new Error('Invalid palace.');
  const p = value as Palace;
  if (p.schemaVersion !== 1 || typeof p.id !== 'string' || !p.id || typeof p.title !== 'string' || p.title.length > 200 || typeof p.updatedAt !== 'string' || !Number.isFinite(Date.parse(p.updatedAt)) || !Array.isArray(p.rooms) || !Array.isArray(p.memories) || !Array.isArray(p.links)) throw new Error('Invalid palace schema.');
  if (p.description !== undefined && (typeof p.description !== 'string' || p.description.length > 2000)) throw new Error('Invalid palace description.');
  if (p.rooms.length > 100 || p.memories.length > 1000 || p.links.length > 1000) throw new Error('Palace exceeds supported limits.');
  const ids = new Set<string>();
  const claim = (id: string) => { if (typeof id !== 'string' || !id || ids.has(id)) throw new Error('Duplicate or invalid ID.'); ids.add(id); };
  const vec3 = (v: Vec3 | undefined) => { if (v === undefined) return; if (!v || typeof v !== 'object' || ![v.x, v.y, v.z].every(n => Number.isFinite(n) && Math.abs(n) <= 10000)) throw new Error('Invalid 3D position.'); };
  const coords = (yaw: number, pitch: number) => { if (!Number.isFinite(yaw) || yaw < -180 || yaw >= 180 || !Number.isFinite(pitch) || pitch < -90 || pitch > 90) throw new Error('Invalid coordinates.'); };
  for (const room of p.rooms) { claim(room.id); if (typeof room.title !== 'string' || room.title.length > 200 || !room.initialView || (!room.panoramaAssetId && !room.demoSrc && !room.modelSrc)) throw new Error('Invalid room.'); if (room.modelSrc !== undefined && (typeof room.modelSrc !== 'string' || !room.modelSrc || room.modelSrc.length > 500)) throw new Error('Invalid room model.'); vec3(room.initialPosition); coords(room.initialView.yaw,room.initialView.pitch); if (!Number.isFinite(room.initialView.zoom) || room.initialView.zoom < 0 || room.initialView.zoom > 100) throw new Error('Invalid zoom.'); }
  const roomIds = new Set(p.rooms.map(r=>r.id));
  if (p.rooms.length ? !roomIds.has(p.startRoomId) : p.startRoomId !== '') throw new Error('Invalid starting room.');
  for (const memory of p.memories) { claim(memory.id); coords(memory.yaw,memory.pitch); vec3(memory.position); if (!roomIds.has(memory.roomId) || typeof memory.title !== 'string' || memory.title.length > 200 || typeof memory.note !== 'string' || memory.note.length > 10000 || !['upload','generated','demo'].includes(memory.provenance) || !Number.isFinite(memory.size) || memory.size < 16 || memory.size > MAX_MEMORY_SIZE || (!memory.imageAssetId && !memory.demoSrc)) throw new Error('Invalid memory.'); }
  for (const link of p.links) { claim(link.id); coords(link.yaw,link.pitch); vec3(link.position); if (link.size !== undefined && (!Number.isFinite(link.size) || link.size < 16 || link.size > MAX_CONNECTION_SIZE)) throw new Error('Invalid connection size.'); if (!roomIds.has(link.roomId) || !roomIds.has(link.targetRoomId) || typeof link.label !== 'string' || link.label.length > 200) throw new Error('Broken room connection.'); }
}
