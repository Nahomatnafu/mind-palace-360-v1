import { createDemo } from './demo';
import { validatePalace, type Palace } from './model';
/** Starting spaces offered when a user creates a palace. */
export type TemplateCategory = 'real' | 'model' | 'cartoon';
export interface TemplateSection { category: TemplateCategory; title: string; blurb: string }
export interface SpaceTemplate { id: string; title: string; description: string; category: TemplateCategory; preview?: string; modelSrc?: string; sourcePalaceId?: string; available: boolean }
export const APARTMENT_STARTER_ID = '6841e1ef-ac34-4425-84a9-728a4dd2fcb2';
export const templateSections: TemplateSection[] = [
  { category: 'real', title: 'Real Spaces', blurb: 'Start with a real apartment, already connected and ready for your memories.' },
  { category: 'model', title: '3D models', blurb: 'Rendered rooms you can furnish with memories.' },
  { category: 'cartoon', title: 'Cartoon Spaces', blurb: 'Illustrated rooms that are ready to explore right away.' },
];
export const templates: SpaceTemplate[] = [
  { id: 'apartment', title: 'My Apartment', description: 'A connected 360° apartment tour. Create a fresh copy and add your own memories.', category: 'real', sourcePalaceId: APARTMENT_STARTER_ID, available: true },
  { id: 'house1', title: 'Family house', description: 'Walk through a single-storey house: foyer, living room, kitchen, bedroom and garage.', category: 'model', preview: '/demo/house1.jpg', modelSrc: '/models/house1.glb', available: true },
  { id: 'studio', title: 'Studio', description: 'A bright illustrated studio with a sofa and two sample memories.', category: 'cartoon', preview: '/demo/studio.jpg', available: true },
  { id: 'gallery', title: 'Gallery', description: 'A calm illustrated gallery with one sample memory.', category: 'cartoon', preview: '/demo/gallery.jpg', available: true },
];
export function templatesFor(category: TemplateCategory): SpaceTemplate[] { return templates.filter(t => t.category === category); }
/** Gallery thumbnail for a room backed by a bundled 3D model. */
export function previewForModel(modelSrc: string | undefined): string | undefined { return modelSrc ? templates.find(t => t.modelSrc === modelSrc)?.preview : undefined; }
export interface PalaceDetails { title?: string; description?: string }
/** Builds a fresh palace with new IDs from a template; throws for unknown or unavailable templates. */
export function createFromTemplate(templateId: string, details: PalaceDetails = {}, source?: Palace): Palace {
  const palace = buildFromTemplate(templateId, source);
  const title = details.title?.trim(), description = details.description?.trim();
  if (title) palace.title = title;
  if (description) palace.description = description;
  return palace;
}
function buildFromTemplate(templateId: string, source?: Palace): Palace {
  const template = templates.find(t => t.id === templateId);
  if (!template || !template.available) throw new Error('That space is not available yet.');
  const now = new Date().toISOString();
  if (template.sourcePalaceId) {
    if (!source || source.id !== template.sourcePalaceId || !source.rooms.length) throw new Error('The apartment starter is unavailable. Please retry in a moment.');
    validatePalace(source);
    const roomIds = new Map(source.rooms.map(room => [room.id, crypto.randomUUID()]));
    // Immutable photo assets can be reused. Editable rooms/connections get fresh
    // IDs; personal memories and the source revision never enter the starter.
    return { schemaVersion: 1, id: crypto.randomUUID(), title: template.title, updatedAt: now,
      startRoomId: roomIds.get(source.startRoomId)!,
      rooms: source.rooms.map(room => ({...structuredClone(room), id: roomIds.get(room.id)!})),
      links: source.links.map(link => ({...structuredClone(link), id: crypto.randomUUID(), roomId: roomIds.get(link.roomId)!, targetRoomId: roomIds.get(link.targetRoomId)!})),
      memories: [] };
  }
  if (template.id === 'house1') return { schemaVersion: 1, id: crypto.randomUUID(), title: template.title, startRoomId: 'house', updatedAt: now,
    rooms: [{ id: 'house', title: 'House', modelSrc: template.modelSrc, initialView: { yaw: 0, pitch: -2, zoom: 30 }, initialPosition: { x: -2.55, y: 1.46, z: 9.2 } }],
    memories: [{ id: crypto.randomUUID(), roomId: 'house', title: 'Gold', note: 'A golden apple on the living room mantel: a vivid image for gold. Walk in through the front door, tap the floor to get closer, then tap Edit memory to make it your own.', demoSrc: '/demo/golden-apple.png', yaw: 90, pitch: 0, size: 36, provenance: 'demo', position: { x: 3.55, y: 1.36, z: 2.5 } }], links: [] };
  const demo = createDemo();
  const room = demo.rooms.find(r => r.id === template.id);
  if (!room) throw new Error('That space is missing its room.');
  return { schemaVersion: 1, id: crypto.randomUUID(), title: template.title, startRoomId: room.id, rooms: [room], memories: demo.memories.filter(m => m.roomId === room.id), links: [], updatedAt: now };
}
