import { describe, it, expect } from 'vitest';
import { createFromTemplate, templateSections, templates, templatesFor } from './templates';
import { validatePalace } from './model';
describe('space templates', () => {
  it('offers every section with at least one entry and keeps the demo rooms under Cartoon Spaces', () => {
    for (const section of templateSections) expect(templatesFor(section.category).length).toBeGreaterThan(0);
    expect(templatesFor('cartoon').map(t => t.id).sort()).toEqual(['gallery', 'studio']);
  });
  it('creates valid palaces with fresh IDs from every available template', () => {
    for (const template of templates.filter(t => t.available)) {
      const first = createFromTemplate(template.id), second = createFromTemplate(template.id);
      expect(() => validatePalace(first)).not.toThrow();
      expect(first.id).not.toBe(second.id);
    }
  });
  it('seeds each cartoon space with only its own room and memories', () => {
    const studio = createFromTemplate('studio'), gallery = createFromTemplate('gallery');
    expect(studio.rooms.map(r => r.id)).toEqual(['studio']);
    expect(studio.memories.map(m => m.title).sort()).toEqual(['A promise', 'Gold']);
    expect(gallery.rooms.map(r => r.id)).toEqual(['gallery']);
    expect(gallery.memories.map(m => m.title)).toEqual(['A circle of ideas']);
    expect(studio.links).toEqual([]);
  });
  it('seeds the house model with a start position and a 3D-anchored memory', () => {
    const house = createFromTemplate('house1');
    expect(() => validatePalace(house)).not.toThrow();
    expect(house.rooms[0].modelSrc).toBe('/models/house1.glb');
    // The tour begins outside on the front path, facing the open front door.
    expect(house.rooms[0].initialPosition).toEqual({ x: -2.55, y: 1.46, z: 9.2 });
    expect(house.rooms[0].initialView.yaw).toBe(0);
    expect(house.memories[0].position).toBeDefined();
    expect(templatesFor('model').map(t => t.id)).toEqual(['house1']);
  });
  it('applies a chosen name and optional description, ignoring blanks', () => {
    const named = createFromTemplate('studio', { title: '  Exam prep  ', description: ' Formulas for the final ' });
    expect(named.title).toBe('Exam prep');
    expect(named.description).toBe('Formulas for the final');
    expect(() => validatePalace(named)).not.toThrow();
    const blank = createFromTemplate('studio', { title: '   ', description: '' });
    expect(blank.title).toBe('Studio');
    expect(blank.description).toBeUndefined();
  });
  it('creates an empty palace for real spaces and rejects unavailable templates', () => {
    const own = createFromTemplate('own-photos');
    expect(own.rooms).toEqual([]);
    expect(own.startRoomId).toBe('');
    expect(() => createFromTemplate('does-not-exist')).toThrow();
    expect(() => createFromTemplate('nope')).toThrow();
  });
});
