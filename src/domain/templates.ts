import { createDemo } from './demo';
import type { Palace } from './model';
/** Starting spaces offered when a user creates a palace. */
export type TemplateCategory = 'real' | 'model' | 'cartoon';
export interface TemplateSection { category: TemplateCategory; title: string; blurb: string }
export interface SpaceTemplate { id: string; title: string; description: string; category: TemplateCategory; preview?: string; modelSrc?: string; available: boolean }
export const templateSections: TemplateSection[] = [
  { category: 'real', title: 'Real Spaces', blurb: 'Start from your own 360 photos of places you already know.' },
  { category: 'model', title: '3D models', blurb: 'Rendered rooms you can furnish with memories.' },
  { category: 'cartoon', title: 'Cartoon Spaces', blurb: 'Illustrated rooms that are ready to explore right away.' },
];
export const templates: SpaceTemplate[] = [
  { id: 'own-photos', title: 'Your own space', description: 'Create an empty palace, then import equirectangular 360 JPEGs as rooms.', category: 'real', available: true },
  { id: 'house1', title: 'Family house', description: 'Walk through a single-storey house: foyer, living room, kitchen, bedroom and garage.', category: 'model', preview: '/demo/house1.jpg', modelSrc: '/models/house1.glb', available: true },
  { id: 'studio', title: 'Studio', description: 'A bright illustrated studio with a sofa and two sample memories.', category: 'cartoon', preview: '/demo/studio.jpg', available: true },
  { id: 'gallery', title: 'Gallery', description: 'A calm illustrated gallery with one sample memory.', category: 'cartoon', preview: '/demo/gallery.jpg', available: true },
];
export function templatesFor(category: TemplateCategory): SpaceTemplate[] { return templates.filter(t => t.category === category); }
/** Gallery thumbnail for a room backed by a bundled 3D model. */
export function previewForModel(modelSrc: string | undefined): string | undefined { return modelSrc ? templates.find(t => t.modelSrc === modelSrc)?.preview : undefined; }
export interface PalaceDetails { title?: string; description?: string }
/** Builds a fresh palace with new IDs from a template; throws for unknown or unavailable templates. */
export function createFromTemplate(templateId: string, details: PalaceDetails = {}): Palace {
  const palace = buildFromTemplate(templateId);
  const title = details.title?.trim(), description = details.description?.trim();
  if (title) palace.title = title;
  if (description) palace.description = description;
  return palace;
}
function buildFromTemplate(templateId: string): Palace {
  const template = templates.find(t => t.id === templateId);
  if (!template || !template.available) throw new Error('That space is not available yet.');
  const now = new Date().toISOString();
  if (template.id === 'own-photos') return { schemaVersion: 1, id: crypto.randomUUID(), title: 'My memory palace', startRoomId: '', rooms: [], memories: [], links: [], updatedAt: now };
  if (template.id === 'house1') return { schemaVersion: 1, id: crypto.randomUUID(), title: template.title, startRoomId: 'house', updatedAt: now,
    rooms: [{ id: 'house', title: 'House', modelSrc: template.modelSrc, initialView: { yaw: 0, pitch: -2, zoom: 30 }, initialPosition: { x: -2.55, y: 1.46, z: 9.2 } }],
    memories: [{ id: crypto.randomUUID(), roomId: 'house', title: 'Gold', note: 'A golden apple on the living room mantel: a vivid image for gold. Walk in through the front door, tap the floor to get closer, then tap Edit memory to make it your own.', demoSrc: '/demo/golden-apple.png', yaw: 90, pitch: 0, size: 36, provenance: 'demo', position: { x: 3.55, y: 1.36, z: 2.5 } }], links: [] };
  const demo = createDemo();
  const room = demo.rooms.find(r => r.id === template.id);
  if (!room) throw new Error('That space is missing its room.');
  return { schemaVersion: 1, id: crypto.randomUUID(), title: template.title, startRoomId: room.id, rooms: [room], memories: demo.memories.filter(m => m.roomId === room.id), links: [], updatedAt: now };
}
