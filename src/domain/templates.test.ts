import { describe, it, expect } from 'vitest';
import { APARTMENT_STARTER_ID, createFromTemplate, templateSections, templates, templatesFor } from './templates';
import { validatePalace } from './model';
import { createDemo } from './demo';
function apartmentSource() { return {...createDemo(), id:APARTMENT_STARTER_ID, revision:42}; }
describe('space templates', () => {
  it('offers every section with at least one entry and keeps the demo rooms under Cartoon Spaces', () => {
    for (const section of templateSections) expect(templatesFor(section.category).length).toBeGreaterThan(0);
    expect(templatesFor('cartoon').map(t => t.id).sort()).toEqual(['gallery', 'studio']);
  });
  it('creates valid palaces with fresh IDs from every available template', () => {
    for (const template of templates.filter(t => t.available)) {
      const first = createFromTemplate(template.id, {}, apartmentSource()), second = createFromTemplate(template.id, {}, apartmentSource());
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
  it('offers the apartment instead of an empty real space and rejects unavailable templates', () => {
    expect(templatesFor('real').map(template=>template.id)).toEqual(['apartment']);
    expect(()=>createFromTemplate('own-photos')).toThrow();
    expect(() => createFromTemplate('does-not-exist')).toThrow();
    expect(() => createFromTemplate('nope')).toThrow();
  });
  it('copies every room/connection with fresh IDs and keeps links and the entrance connected',()=>{
    const source=apartmentSource();source.rooms[0].panoramaAssetId='original-photo';
    source.links[0]={...source.links[0],surface:'floor',size:80,position:{x:1,y:2,z:3}};
    const copy=createFromTemplate('apartment',{title:'My study space'},source);
    expect(()=>validatePalace(copy)).not.toThrow();expect(copy.id).not.toBe(source.id);
    expect(copy.title).toBe('My study space');expect(copy.rooms).toHaveLength(source.rooms.length);expect(copy.links).toHaveLength(source.links.length);
    expect(copy.startRoomId).toBe(copy.rooms[0].id);
    expect(copy.rooms[0].panoramaAssetId).toBe('original-photo');
    expect(copy.links[0]).toMatchObject({roomId:copy.rooms[0].id,targetRoomId:copy.rooms[1].id,surface:'floor',size:80,position:{x:1,y:2,z:3}});
    const oldIds=new Set([...source.rooms,...source.links].map(item=>item.id));
    expect([...copy.rooms,...copy.links].every(item=>!oldIds.has(item.id))).toBe(true);
    expect(copy.memories).toEqual([]);expect(copy.revision).toBeUndefined();
  });
  it('isolates edits in two starter copies from the original and from each other',()=>{
    const source=apartmentSource(),snapshot=structuredClone(source);
    const a=createFromTemplate('apartment',{},source),b=createFromTemplate('apartment',{},source);
    a.rooms[0].initialView.yaw=105;a.links[0].targetRoomId=a.rooms[0].id;a.rooms.pop();
    expect(source).toEqual(snapshot);expect(b.rooms).toHaveLength(snapshot.rooms.length);
    expect(b.rooms[0].initialView.yaw).toBe(snapshot.rooms[0].initialView.yaw);
    expect(b.links[0].targetRoomId).toBe(b.rooms[1].id);
    expect(a.id).not.toBe(b.id);expect(a.rooms[0].id).not.toBe(b.rooms[0].id);
  });
  it('never silently creates an empty palace when the starter is missing, mismatched, or invalid',()=>{
    expect(()=>createFromTemplate('apartment')).toThrow('unavailable');
    expect(()=>createFromTemplate('apartment',{},createDemo())).toThrow('unavailable');
    expect(()=>createFromTemplate('apartment',{}, {...apartmentSource(),rooms:[]})).toThrow('unavailable');
    expect(()=>createFromTemplate('apartment',{}, {...apartmentSource(),startRoomId:'missing'})).toThrow();
  });
});
