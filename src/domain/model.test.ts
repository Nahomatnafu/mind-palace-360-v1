import { createDemo } from './demo';
import { describe, expect, it } from 'vitest';
import { coordinateDraft, normalizeYaw, toDegrees, toRadians, validatePalace, type Palace } from './model';
export const fixture = (): Palace => ({ schemaVersion: 1, id: 'palace', title: 'Fixture', startRoomId: 'room', updatedAt: new Date().toISOString(), rooms: [{id:'room',title:'Room',demoSrc:'/demo/room.jpg',initialView:{yaw:0,pitch:0,zoom:35}}], memories: [], links: [] });
describe('engine independent coordinates',()=>{
  it('round-trips negative angles',()=>expect(toDegrees(toRadians(-72.5))).toBeCloseTo(-72.5));
  it('wraps at the seam',()=>{expect(normalizeYaw(180)).toBe(-180);expect(normalizeYaw(-540)).toBe(-180);});
  it('accepts signed decimal commits',()=>expect(coordinateDraft('-12.5',-90,90)).toBe(-12.5));
  it.each(['','-','-0.','--2','NaN','1e2'])('rejects incomplete or unsupported commit %s',v=>{ if(v==='-0.') expect(coordinateDraft(v,-90,90)).toBe(-0); else expect(()=>coordinateDraft(v,-90,90)).toThrow(); });
  it('rejects out-of-range input',()=>expect(()=>coordinateDraft('-91',-90,90)).toThrow());
});
describe('palace integrity',()=>{
  it('accepts a valid document',()=>expect(()=>validatePalace(fixture())).not.toThrow());
  it('rejects missing start rooms',()=>expect(()=>validatePalace({...fixture(),startRoomId:'missing'})).toThrow());
  it('rejects invalid coordinates',()=>{const p=fixture();p.rooms[0].initialView.pitch=91;expect(()=>validatePalace(p)).toThrow();});
  it('rejects duplicate IDs',()=>{const p=fixture();p.rooms.push({...p.rooms[0]});expect(()=>validatePalace(p)).toThrow();});
  it('rejects broken room links',()=>{const p=fixture();p.links.push({id:'link',roomId:'room',targetRoomId:'missing',yaw:0,pitch:0,label:'Next'});expect(()=>validatePalace(p)).toThrow();});
});

it('accepts memory sizes through 128px and rejects oversized markers',()=>{const p=createDemo();p.memories[0].size=128;expect(()=>validatePalace(p)).not.toThrow();p.memories[0].size=129;expect(()=>validatePalace(p)).toThrow('Invalid memory');});

it('keeps legacy connections valid and bounds optional saved circle sizes',()=>{const p=createDemo();const link=p.links[0];delete link.size;expect(()=>validatePalace(p)).not.toThrow();link.size=128;expect(()=>validatePalace(p)).not.toThrow();for(const size of [0,15,129,NaN,Infinity]){link.size=size;expect(()=>validatePalace(p)).toThrow('connection size');}});

it('accepts legacy, wall and floor connections but rejects unknown surfaces',()=>{const p=createDemo();for(const surface of [undefined,'wall','floor']){Object.assign(p.links[0],{surface});expect(()=>validatePalace(p)).not.toThrow();}for(const surface of ['ceiling',null,1]){Object.assign(p.links[0],{surface});expect(()=>validatePalace(p)).toThrow('connection surface');}});
