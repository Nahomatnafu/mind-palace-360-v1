'use client';
import { useState } from 'react';
import Panorama from './Panorama';
import { createDemo } from '@/domain/demo';
import type { Palace, Memory } from '@/domain/model';
export default function ViewerPreview(){
  const [palace]=useState<Palace>(createDemo);
  const [roomId,setRoomId]=useState('studio');
  const [selected,setSelected]=useState<Memory|null>(null);
  const room=palace.rooms.find(r=>r.id===roomId)!;
  const markers=[...palace.memories.filter(m=>m.roomId===roomId).map(m=>({id:m.id,yaw:m.yaw,pitch:m.pitch,label:m.title,size:m.size,image:m.demoSrc,kind:'memory' as const})),...palace.links.filter(l=>l.roomId===roomId).map(l=>({id:l.id,yaw:l.yaw,pitch:l.pitch,label:l.label,size:34,kind:'link' as const}))];
  return <main className="workspace"><header className="topbar"><div className="brand"><span className="brand-symbol">◈</span><strong>Mind Palace</strong><span className="brand-sub">MAKE MEMORIES VISIBLE</span></div><span className="status-pill">Viewer preview</span></header><aside className="sidebar"><span className="eyebrow">YOUR PALACE</span><h2>{palace.title}</h2><p>Original illustrated demo. Import your own space in the next milestone.</p><div className="room-list">{palace.rooms.map(r=><button key={r.id} className={r.id===roomId?'room-card active':'room-card'} onClick={()=>{setRoomId(r.id);setSelected(null);}}><span className="room-thumb" style={{backgroundImage:`url(${r.demoSrc})`}}/><span>{r.title}</span></button>)}</div><div className="sidebar-footer">Every room can hold an idea.</div></aside><section className="stage"><Panorama src={room.demoSrc!} camera={room.initialView} markers={markers} onSelect={id=>{const link=palace.links.find(l=>l.id===id);if(link)setRoomId(link.targetRoomId);else setSelected(palace.memories.find(m=>m.id===id)??null);}} onPlace={()=>{}}/><div className="stage-label"><span className="eyebrow">ILLUSTRATED DEMO</span><h2>{room.title}</h2><p>Drag to explore · Scroll or pinch to zoom · Tap an image</p></div></section>{selected&&<div className="modal-shade" onClick={()=>setSelected(null)}><section className="memory-card" role="dialog" aria-modal="true" aria-label={selected.title} onClick={e=>e.stopPropagation()}><button className="close-button" onClick={()=>setSelected(null)} aria-label="Close memory">×</button><img src={selected.demoSrc} alt={selected.title}/><span className="eyebrow">A MEMORY IN YOUR SPACE</span><h2>{selected.title}</h2><p className="note-text">{selected.note}</p></section></div>}</main>;
}
