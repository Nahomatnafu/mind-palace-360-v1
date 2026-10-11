import { describe, expect, it } from 'vitest';
import type { Palace } from './model';
import { roomSelection } from './navigation';

const palace:Palace={id:'tour',schemaVersion:1,title:'Navigation fixture',updatedAt:'2026-10-11T00:00:00Z',startRoomId:'entrance',
  rooms:['entrance','hallway','living','laundry'].map(id=>({id,title:id,demoSrc:`/${id}.jpg`,initialView:{yaw:0,pitch:0,zoom:35}})),
  links:[{id:'hall-living',roomId:'hallway',targetRoomId:'living',yaw:83,pitch:-23,label:'Living room'},
    {id:'laundry-entrance',roomId:'laundry',targetRoomId:'entrance',yaw:82,pitch:-22,label:'Front entrance'}],
  memories:[{id:'note',roomId:'living',title:'Memory',note:'Example',demoSrc:'/memory.png',yaw:0,pitch:0,size:36,provenance:'demo'}]};

describe('room-scoped navigation',()=>{
  it('follows Hallway to Living even when another room has a Front Entrance hotspot at nearly identical coordinates',()=>{
    expect(roomSelection(palace,'hallway','hall-living')?.item).toMatchObject({targetRoomId:'living'});
    expect(roomSelection(palace,'hallway','laundry-entrance')).toBeNull();
    expect(roomSelection(palace,'living','hall-living')).toBeNull();
  });
  it('only opens memories in their own room and ignores removed destinations',()=>{
    expect(roomSelection(palace,'hallway','note')).toBeNull();
    expect(roomSelection(palace,'living','note')?.kind).toBe('memory');
    expect(roomSelection({...palace,rooms:palace.rooms.filter(r=>r.id!=='living')},'hallway','hall-living')).toBeNull();
  });
});
