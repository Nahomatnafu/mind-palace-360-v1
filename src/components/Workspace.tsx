'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Panorama from './Panorama';
import ModelStage from './ModelStage';
import MemoryEditor from './MemoryEditor';
import BottomSheet, { usePhoneLayout, type SheetDetent } from './BottomSheet';
import RoomThumbnail from './RoomThumbnail';
import CoordinateField from './CoordinateField';
import { PalaceMark, StudioIcon } from './StudioIcons';
import { createMotionController, isMotionDevice, type MotionController, type MotionState } from '@/viewer/motion';
import { DEFAULT_CONNECTION_SIZE, MAX_CONNECTION_SIZE, normalizeYaw, type Asset, type Camera, type Memory, type Palace, type PalaceSummary, type TourLink, type Vec3 } from '@/domain/model';
import { sharedRequest } from '@/storage/shared-repository';
import { repository } from '@/storage/repository';
import { persistPalace } from '@/storage/commit';
import { importImage } from '@/media/images';
import { exportPalace, importPalace } from '@/storage/backup';
import { previewForModel } from '@/domain/templates';
import type { CameraControls } from '@/viewer/adapter';

export default function Workspace({palaceId}:{palaceId:string}){
  const router=useRouter();
  const [palace,setPalace]=useState<Palace|null>(null);
  const [palaces,setPalaces]=useState<PalaceSummary[]>([]);
  const [roomId,setRoomId]=useState('');
  const [status,setStatus]=useState('Opening your palace…');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [remoteChanged,setRemoteChanged]=useState(false);
  const [syncError,setSyncError]=useState('');
  const [selected,setSelected]=useState<Memory|null>(null);
  const [editing,setEditing]=useState(true);
  const [aiCode,setAiCode]=useState('');
  const [movingHotspots,setMovingHotspots]=useState(false);
  const [motionState,setMotionState]=useState<MotionState>({status:'disabled',message:''});
  const motion=useRef<MotionController|null>(null);
  const [readyView,setReadyView]=useState<{viewer:CameraControls;roomKey:string;src:string}|null>(null);
  const [touchOnly,setTouchOnly]=useState(false);
  const activeTouches=useRef(new Set<number>());
  const [settings,setSettings]=useState(false);
  const [placement,setPlacement]=useState<'link'|'memory'|'move'|null>(null);
  const [linkDraft,setLinkDraft]=useState<TourLink|null>(null);
  const [draft,setDraft]=useState<Memory|null>(null);
  const [draftAsset,setDraftAssetState]=useState<Asset|null>(null);
  const [draftUrl,setDraftUrl]=useState('');
  const draftUrlRef=useRef({url:''});
  const [menu,setMenu]=useState(false);
  const mutation=useRef(false);
  const [roomTitle,setRoomTitle]=useState('');
  const [palaceTitle,setPalaceTitle]=useState('');
  const [palaceDescription,setPalaceDescription]=useState('');
  const [urls,setUrls]=useState<Record<string,string>>({});
  const urlCache=useRef(new Map<string,string>());
  const viewer=useRef<CameraControls|null>(null);
  const started=useRef(false);
  const panoramaInput=useRef<HTMLInputElement>(null);
  const replacementInput=useRef<HTMLInputElement>(null);
  const [roomImageInfo,setRoomImageInfo]=useState<{width:number;height:number}|null>(null);
  const backupInput=useRef<HTMLInputElement>(null);
  const room=palace?.rooms.find(r=>r.id===roomId);
  useEffect(()=>{
    let cancelled=false;
    const id=room?.panoramaAssetId;
    void (async()=>{try{const asset=id?await repository.asset(id):undefined;if(!cancelled)setRoomImageInfo(asset?{width:asset.width,height:asset.height}:null);}catch{/* The main loader reports asset failures. */}})();
    return()=>{cancelled=true;};
  },[room?.panoramaAssetId]);
  const assetsKey=JSON.stringify([room?.panoramaAssetId,...(palace?.memories.filter(m=>m.roomId===roomId).map(m=>m.imageAssetId)??[])].filter(Boolean));
  useEffect(()=>{
    if(started.current)return;started.current=true;
    (async()=>{try{const p=await repository.load(palaceId);if(!p)throw new Error('This palace is unavailable in the shared space. Choose one from Your Memory Palaces.');setPalace(p);setRoomId(p.startRoomId);setPalaces(await repository.list());setStatus('Saved to shared space');}catch(e){setStatus('Unable to load');setError(message(e));}})();
  },[palaceId]);
  useEffect(()=>{
    let cancelled=false;const ids=JSON.parse(assetsKey) as string[];
    (async()=>{try{const updates:Record<string,string>={};for(const [id,url] of urlCache.current){if(!ids.includes(id)){URL.revokeObjectURL(url);urlCache.current.delete(id);}}for(const id of ids){if(urlCache.current.has(id)){updates[id]=urlCache.current.get(id)!;continue;}const asset=await repository.asset(id);if(!asset)throw new Error('A saved image is missing. Restore a backup or replace the image.');if(cancelled)return;const url=URL.createObjectURL(asset.blob);urlCache.current.set(id,url);updates[id]=url;}if(!cancelled)setUrls(updates);}catch(e){if(!cancelled)setError(message(e));}})();
    return()=>{cancelled=true;};
  },[assetsKey]);
  useEffect(()=>{const cache=urlCache.current;return()=>{cache.forEach(URL.revokeObjectURL);cache.clear();};},[]);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!mutation.current){setSelected(null);setSettings(false);setPlacement(null);setLinkDraft(null);setDraft(null);setDraftAsset(null);setMenu(false);}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  useEffect(()=>{const controller=createMotionController({getCamera:()=>viewer.current?.camera()??{yaw:0,pitch:0,zoom:35},onCamera:camera=>viewer.current?.lookAt(camera),onState:setMotionState});motion.current=controller;return()=>{controller.destroy();motion.current=null;};},[]);
  useEffect(()=>{
    const touches=activeTouches.current;
    const finish=(event:PointerEvent)=>{if(!touches.delete(event.pointerId))return;if(!touches.size)motion.current?.setInteracting(false);};
    const blur=()=>{touches.clear();motion.current?.setInteracting(false);};
    window.addEventListener('pointerup',finish,true);window.addEventListener('pointercancel',finish,true);window.addEventListener('blur',blur);
    return()=>{window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',finish,true);window.removeEventListener('blur',blur);};
  },[]);
  useEffect(()=>{
    if(!palace)return;
    let cancelled=false,inflight=false;
    async function check(){if(inflight || mutation.current || document.hidden)return;inflight=true;try{
      const latest=await sharedRequest<Palace|null>('palaces/'+encodeURIComponent(palaceId));
      if(!cancelled){setRemoteChanged(!latest || latest.revision!==palace?.revision);setSyncError('');}
    }catch{if(!cancelled)setSyncError('Cannot check for shared updates. Check your connection.');}finally{inflight=false;}}
    const timer=setInterval(()=>void check(),8000);window.addEventListener('focus',check);
    return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('focus',check);};
  },[palaceId,palace]);
  async function refreshShared(){
    if(busy || mutation.current)return;
    if((draft || linkDraft || settings) && !window.confirm('Discard the open draft and load the latest shared changes?'))return;
    setBusy(true);try{const latest=await repository.load(palaceId);if(!latest){router.push('/');return;}resetPanels();setPalace(latest);if(!latest.rooms.some(r=>r.id===roomId))setRoomId(latest.startRoomId);setRemoteChanged(false);setSyncError('');setError('');setStatus('Saved to shared space');}catch(e){setError(message(e));}finally{setBusy(false);}
  }
  async function save(next:Palace,assets:Asset[]=[],locked=false){if(!locked&&mutation.current)return false;mutation.current=true;setBusy(true);setError('');setStatus('Saving…');try{next={...next,updatedAt:new Date().toISOString()};await persistPalace(repository,next,assets,setStatus);setPalace(next);setPalaces(previous=>[{id:next.id,title:next.title,updatedAt:next.updatedAt},...previous.filter(p=>p.id!==next.id)]);setStatus('Saved to shared space');return true;}catch(e){setStatus('Save failed');setError(message(e));return false;}finally{mutation.current=false;setBusy(false);}}
  function resetPanels(){setMovingHotspots(false);cancelDraft();setSelected(null);setSettings(false);setLinkDraft(null);setPlacement(null);setMenu(false);}
  function choosePalace(id:string){if(busy||mutation.current||id===palaceId)return;resetPanels();router.push(`/palace/${id}`);}
  function newPalace(){if(busy||mutation.current)return;resetPanels();router.push('/new');}
  async function uploadRooms(files:FileList|null){if(!files?.length||!palace||busy||mutation.current)return;mutation.current=true;setBusy(true);setError('');try{if(files.length>20)throw new Error('Import up to 20 rooms at a time.');const assets:Asset[]=[];const rooms=[...palace.rooms];for(let i=0;i<files.length;i++){setStatus(`Preparing room ${i+1} of ${files.length}…`);const asset=await importImage(files[i],'panorama');assets.push(asset);rooms.push({id:crypto.randomUUID(),title:files[i].name.replace(/\.[^.]+$/,''),panoramaAssetId:asset.id,initialView:{yaw:0,pitch:0,zoom:35}});}if(await save({...palace,rooms,startRoomId:palace.startRoomId||rooms[0].id},assets,true))setRoomId(rooms[rooms.length-files.length].id);}catch(e){setStatus('Import failed');setError(message(e));}finally{mutation.current=false;setBusy(false);if(panoramaInput.current)panoramaInput.current.value='';}}
  async function backup(){if(!palace||busy)return;setBusy(true);setError('');try{const blob=await exportPalace(palace);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mind-palace-backup.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Backup exported');}catch(e){setError(message(e));}finally{setBusy(false);}}
  async function restore(file?:File){if(!file||busy||mutation.current)return;mutation.current=true;setBusy(true);setError('');try{const p=await importPalace(file);setStatus('Backup restored as a new palace');resetPanels();router.push(`/palace/${p.id}`);}catch(e){setError(message(e));}finally{mutation.current=false;setBusy(false);if(backupInput.current)backupInput.current.value='';}}
  function changeRoom(id:string){setMovingHotspots(false);if(id!==roomId)motion.current?.disable();cancelDraft();setRoomId(id);setSelected(null);setPlacement(null);setLinkDraft(null);setSettings(false);}
  async function removeRoom(){if(!palace||!room||busy)return;if(!window.confirm(`Delete ${room.title} and its memories? Export a backup first if you want to keep them.`))return;const rooms=palace.rooms.filter(r=>r.id!==room.id);const next={...palace,rooms,startRoomId:palace.startRoomId===room.id?(rooms[0]?.id??''):palace.startRoomId,memories:palace.memories.filter(m=>m.roomId!==room.id),links:palace.links.filter(l=>l.roomId!==room.id&&l.targetRoomId!==room.id)};if(await save(next))changeRoom(next.startRoomId);}
  useEffect(()=>{const resource=draftUrlRef.current;return()=>{if(resource.url)URL.revokeObjectURL(resource.url);};},[]);
  function setDraftAsset(asset:Asset|null){if(draftUrlRef.current.url)URL.revokeObjectURL(draftUrlRef.current.url);const url=asset?URL.createObjectURL(asset.blob):'';draftUrlRef.current.url=url;setDraftAssetState(asset);setDraftUrl(url);}
  function cancelDraft(){setDraft(null);setDraftAsset(null);setPlacement(null);}
  async function replaceRoomPhoto(file?:File){
    if(!file||!palace||!room||mutation.current)return;
    mutation.current=true;setBusy(true);setError('');setStatus('Checking original photo…');
    try{
      const asset=await importImage(file,'panorama');
      await save({...palace,rooms:palace.rooms.map(item=>item.id===room.id?{...item,panoramaAssetId:asset.id,demoSrc:undefined}:item)},[asset],true);
    }catch(e){setError(message(e));setStatus('Photo replacement failed');}
    finally{mutation.current=false;setBusy(false);if(replacementInput.current)replacementInput.current.value='';}
  }
  async function saveMemory(){if(!palace||!draft)return;const memory={...draft,title:draft.title.trim()};if(await save({...palace,memories:[...palace.memories.filter(m=>m.id!==memory.id),memory]},draftAsset?[draftAsset]:[]))cancelDraft();}
  async function deleteMemory(){if(!palace||!draft||!window.confirm('Delete this memory? Export a backup first to keep it.'))return;if(await save({...palace,memories:palace.memories.filter(m=>m.id!==draft.id)}))cancelDraft();}
  async function deletePalace(){if(!palace||busy||mutation.current||!window.confirm('Delete this palace? Export a backup first to keep a copy.'))return;mutation.current=true;setBusy(true);try{await repository.remove(palace.id);setStatus('Palace deleted');router.push('/');}catch(e){setStatus('Unable to finish deletion');setError(message(e));}finally{mutation.current=false;setBusy(false);}}
  async function moveHotspot(id:string,yaw:number,pitch:number){
    if(!palace||mutation.current)return;
    if(draft?.id===id){setDraft({...draft,yaw:normalizeYaw(yaw),pitch});return;}
    if(linkDraft?.id===id){setLinkDraft({...linkDraft,yaw:normalizeYaw(yaw),pitch});return;}
    const next={...palace,memories:palace.memories.map(m=>m.id===id?{...m,yaw:normalizeYaw(yaw),pitch}:m),links:palace.links.map(l=>l.id===id?{...l,yaw:normalizeYaw(yaw),pitch}:l)};
    if(!await save(next))viewer.current?.markers(markers);
  }
  async function moveHotspot3D(id:string,point:Vec3){
    if(!palace||mutation.current)return;
    if(draft?.id===id){setDraft({...draft,position:point});return;}
    if(linkDraft?.id===id){setLinkDraft({...linkDraft,position:point});return;}
    const next={...palace,memories:palace.memories.map(m=>m.id===id?{...m,position:point}:m),links:palace.links.map(l=>l.id===id?{...l,position:point}:l)};
    if(!await save(next))viewer.current?.markers(markers);
  }
  function place3D(point:Vec3,camera:Camera):boolean{
    if(!palace||!placement)return false;
    const yaw=normalizeYaw(camera.yaw),pitch=camera.pitch;
    if(placement==='memory'){setDraftAsset(null);setDraft({id:crypto.randomUUID(),roomId,title:'',note:'',yaw,pitch,size:36,provenance:'upload',position:point});}
    else if(placement==='move'&&draft)setDraft({...draft,position:point});
    else if(placement==='link'){const target=palace.rooms.find(r=>r.id!==roomId);if(target)setLinkDraft({id:crypto.randomUUID(),roomId,targetRoomId:target.id,yaw,pitch,label:`Go to ${target.title}`,position:point});}
    setPlacement(null);return true;
  }
  const src=room?.panoramaAssetId?urls[room.panoramaAssetId]:room?.demoSrc;
  const motionBlocked=Boolean(selected||draft||settings||menu||linkDraft||placement||movingHotspots||busy);
  useEffect(()=>{
    const controller=motion.current;
    const handset=isMotionDevice({touchPoints:navigator.maxTouchPoints??0,coarsePointer:window.matchMedia('(pointer: coarse)').matches,orientationAvailable:typeof window.DeviceOrientationEvent!=='undefined'});
    if(!handset||touchOnly||motionBlocked||!readyView||readyView.roomKey!==roomId||readyView.src!==(room?.modelSrc??src)) {controller?.disable();return;}
    void controller?.enable({requestPermission:false});
    return()=>controller?.disable();
  },[readyView,roomId,src,room?.modelSrc,motionBlocked,touchOnly]);
  const selectedSrc=selected?.imageAssetId?urls[selected.imageAssetId]:selected?.demoSrc;
  const visibleMemories=palace?[...palace.memories.filter(m=>m.roomId===roomId&&m.id!==draft?.id),...(draft&&draft.roomId===roomId?[draft]:[])]:[];
  const markers=palace?[...visibleMemories.flatMap(m=>{const image=m.id===draft?.id&&draftUrl?draftUrl:m.imageAssetId?urls[m.imageAssetId]:m.demoSrc;return image?[{id:m.id,yaw:m.yaw,pitch:m.pitch,label:m.title||'Open memory',size:m.size,image,kind:'memory' as const,position:m.position}]:[];}),...[...palace.links.filter(l=>l.roomId===roomId&&l.id!==linkDraft?.id),...(linkDraft?[linkDraft]:[])].map(l=>({id:l.id,yaw:l.yaw,pitch:l.pitch,label:l.label,size:l.size??DEFAULT_CONNECTION_SIZE,kind:'link' as const,position:l.position}))]:[];
  // Phone bottom sheet: form pages open full, placement collapses so the stage is tappable, the tools page sits at half.
  const phone=usePhoneLayout();
  const page=draft&&!placement?'memory':linkDraft?'link':settings?'settings':placement?'placement':'tools';
  const [sheetPage,setSheetPage]=useState(page);
  const [sheet,setSheet]=useState<SheetDetent>('half');
  if(page!==sheetPage){setSheetPage(page);setSheet(page==='placement'?'collapsed':page==='tools'?'half':'full');}
  if(!palace)return <main className="bootstrap"><span className="eyebrow">MIND PALACE</span><h1>Make memories<br/>visible.</h1><p role="status">{status}</p>{error&&<p role="alert">{error}</p>}<div className="bootstrap-actions"><Link className="primary" href="/">Your palaces</Link><button onClick={()=>location.reload()}>Retry loading</button></div></main>;
  const beginMemory=()=>{cancelDraft();setSelected(null);setSettings(false);setLinkDraft(null);setEditing(true);setPlacement('memory');};
  const openMemory=(memory:Memory)=>{cancelDraft();setDraft({...memory});setSettings(false);setLinkDraft(null);setSelected(null);};
  const markerEditing=editing&&(movingHotspots||!!draft||!!linkDraft)&&!busy&&!selected&&!settings&&!placement;
  const markerSelect=(id:string)=>{if(placement||draft||linkDraft)return;const link=palace.links.find(l=>l.id===id);if(editing){setSettings(false);if(link)setLinkDraft({...link});else{const memory=palace.memories.find(m=>m.id===id);if(memory)openMemory(memory);}}else if(link)changeRoom(link.targetRoomId);else setSelected(palace.memories.find(m=>m.id===id)??null);};
  const filmstrip=<nav className="filmstrip" aria-label="Rooms"><div className="filmstrip-meta"><strong>{palace.rooms.length} rooms</strong><button disabled={busy} onClick={()=>panoramaInput.current?.click()}><StudioIcon name="upload"/> Import rooms</button></div><div className="room-list">{palace.rooms.map((r,index)=><button key={r.id} className={'room-card'+(r.id===roomId?' active':'')} aria-current={r.id===roomId?'true':undefined} disabled={busy} onClick={()=>changeRoom(r.id)}><RoomThumbnail assetId={r.panoramaAssetId} src={r.demoSrc??previewForModel(r.modelSrc)} title={r.title}/><span>{index+1}. {r.title}</span></button>)}</div></nav>;
  const inspectorPages=draft&&!placement?<MemoryEditor key={draft.id} memory={draft} src={draftUrl||(draft.imageAssetId?urls[draft.imageAssetId]:draft.demoSrc)} busy={busy} code={aiCode} onCode={setAiCode} onChange={setDraft} onAsset={(asset,generated)=>{setDraftAsset(asset);setDraft(current=>current?.id===draft.id?{...current,imageAssetId:asset.id,demoSrc:undefined,provenance:generated?'generated':'upload'}:current);}} onSave={()=>void saveMemory()} onCancel={cancelDraft} onMove={()=>setPlacement('move')} onDelete={palace.memories.some(m=>m.id===draft.id)?()=>void deleteMemory():undefined}/>:
    linkDraft?<section className="inspector-page" aria-label="Connection editor"><header className="inspector-heading"><div><span className="eyebrow">ROOM CONNECTION</span><h2>Edit circle</h2></div><button className="icon-button" aria-label="Cancel connection" onClick={()=>setLinkDraft(null)}>×</button></header><div className="inspector-body"><p>Drag the circle in the room, or enter its position below.</p><label>Go to room<span className="select-field"><select value={linkDraft.targetRoomId} onChange={e=>setLinkDraft({...linkDraft,targetRoomId:e.target.value,label:'Go to '+palace.rooms.find(r=>r.id===e.target.value)?.title})}>{palace.rooms.filter(r=>r.id!==roomId).map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select><StudioIcon name="chevron"/></span></label><label>Label<input value={linkDraft.label} maxLength={200} onChange={e=>setLinkDraft({...linkDraft,label:e.target.value})}/></label><label>Circle size · {linkDraft.size??DEFAULT_CONNECTION_SIZE}px<input aria-label="Circle size" type="range" min={16} max={MAX_CONNECTION_SIZE} value={linkDraft.size??DEFAULT_CONNECTION_SIZE} disabled={busy} onChange={e=>setLinkDraft({...linkDraft,size:Number(e.target.value)})}/></label>{!room?.modelSrc?<><CoordinateField label="Connection yaw" value={linkDraft.yaw} min={-180} max={180} onCommit={yaw=>setLinkDraft({...linkDraft,yaw:normalizeYaw(yaw)})}/><CoordinateField label="Connection pitch" value={linkDraft.pitch} min={-90} max={90} onCommit={pitch=>setLinkDraft({...linkDraft,pitch})}/></>:<p>Drag the circle onto a surface to reposition it in this 3D space.</p>}<button className="danger" disabled={busy} onClick={()=>void save({...palace,links:palace.links.filter(l=>l.id!==linkDraft.id)}).then(ok=>{if(ok)setLinkDraft(null);})}>Remove connection</button></div><footer className="inspector-footer"><button disabled={busy} onClick={()=>setLinkDraft(null)}>Cancel</button><button className="primary" disabled={busy} onClick={()=>void save({...palace,links:[...palace.links.filter(l=>l.id!==linkDraft.id),linkDraft]}).then(ok=>{if(ok)setLinkDraft(null);})}>{busy?'Saving…':'Save connection'}</button></footer></section>:
    settings&&room?<section className="inspector-page" aria-label="Room settings"><header className="inspector-heading"><div><span className="eyebrow">ROOM</span><h2>Room settings</h2></div><button className="icon-button" onClick={()=>setSettings(false)} aria-label="Close settings">×</button></header><div className="inspector-body"><label>Palace name<input value={palaceTitle} maxLength={200} onChange={e=>setPalaceTitle(e.target.value)}/></label><label>Description<textarea value={palaceDescription} maxLength={2000} rows={2} onChange={e=>setPalaceDescription(e.target.value)}/></label><label>Room name<input value={roomTitle} maxLength={200} onChange={e=>setRoomTitle(e.target.value)}/></label><button disabled={busy} onClick={()=>{const camera=viewer.current?.camera();const position=viewer.current?.position?.();if(camera)void save({...palace,startRoomId:roomId,rooms:palace.rooms.map(r=>r.id===roomId?{...r,initialView:camera,initialPosition:position??r.initialPosition}:r)});}}>Set current view as palace entrance</button>{!room.modelSrc&&<><h3>Photo quality</h3>{roomImageInfo&&<p>{roomImageInfo.width} × {roomImageInfo.height} pixels{roomImageInfo.width<3840?' · Low resolution for a 360° view':''}</p>}<p>Original JPEG quality is preserved on import. Replace with a higher-resolution export of the same view to keep all memory and connection positions.</p><button disabled={busy} onClick={()=>replacementInput.current?.click()}>Replace room photo</button></>}<details><summary>Delete</summary><button className="danger" disabled={busy} onClick={()=>void removeRoom()}>Delete room and its memories</button><button className="danger" disabled={busy} onClick={()=>void deletePalace()}>Delete palace</button></details></div><footer className="inspector-footer"><button onClick={()=>setSettings(false)}>Back</button><button className="primary" disabled={busy} onClick={()=>void save({...palace,title:palaceTitle.trim()||'My memory palace',description:palaceDescription.trim()||undefined,rooms:palace.rooms.map(r=>r.id===roomId?{...r,title:roomTitle.trim()||'Room'}:r)}).then(ok=>{if(ok)setSettings(false);})}>Save names</button></footer></section>:
    <section className="inspector-page"><header className="inspector-heading"><div><span className="eyebrow">YOUR MEMORY PALACE</span><h2>{placement?'Choose a spot':room?.title||'Start with a room'}</h2></div></header><div className="inspector-body">{placement?<p>Tap the panorama where the {placement==='link'?'circle':'image'} should appear.</p>:<><p>Place familiar images in your space. Tap them later to reveal what you want to remember.</p><button className="primary" disabled={busy||!room} onClick={beginMemory}><StudioIcon name="plus"/> Add memory</button><div className="tool-row">{!room?.modelSrc&&<button disabled={busy||palace.rooms.length<2} onClick={()=>{cancelDraft();setSelected(null);setPlacement('link');}}><StudioIcon name="link"/> Connect rooms</button>}<button disabled={busy||!room} aria-pressed={movingHotspots} onClick={()=>{motion.current?.disable();setMovingHotspots(!movingHotspots);}}><StudioIcon name="move"/>{movingHotspots?'Done moving':'Move hotspots'}</button></div>{room&&<button onClick={()=>{setRoomTitle(room.title);setPalaceTitle(palace.title);setPalaceDescription(palace.description??'');setSettings(true);}}><StudioIcon name="sliders"/> Room settings</button>}<div className="section-title"><h3>Memories in this room</h3><span>{palace.memories.filter(m=>m.roomId===roomId).length}</span></div><div className="memory-list">{palace.memories.filter(m=>m.roomId===roomId).map(m=><button key={m.id} onClick={()=>openMemory(m)}>{m.title}<StudioIcon name="arrow"/></button>)}{!palace.memories.some(m=>m.roomId===roomId)&&<p>No memories here yet. Add one to get started.</p>}</div>{palace.links.some(l=>l.roomId===roomId)&&<><h3>Room connections</h3>{palace.links.filter(l=>l.roomId===roomId).map(l=><button key={l.id} onClick={()=>setLinkDraft({...l})} className="connection-row"><span className="connection-ring"/>{l.label}<StudioIcon name="arrow"/></button>)}</>}</>}</div><footer className="inspector-note">Shared with your teammate · Saves sync across devices.</footer></section>;
  return <main className={'workspace'+(editing?' is-editing':'')} data-sheet={phone&&editing?sheet:undefined}>
   <header className="topbar"><Link href="/" className="back-chevron" aria-label="Back to your memory palaces"><StudioIcon name="chevron" style={{transform:'rotate(90deg)'}}/></Link><Link href="/" className="brand" aria-label="Back to your memory palaces"><PalaceMark/><div className="brand-type"><strong>Mind Palace</strong></div></Link><button className="palace-switch" aria-label={"Open palace menu: "+palace.title} onClick={()=>setMenu(true)}><span className="palace-switch-title">{palace.title}</span><StudioIcon name="chevron"/></button><div className="top-actions"><span className="status-pill" role="status">{status}</span><div className="mode-switch" aria-label="Workspace mode"><button aria-pressed={!editing} onClick={()=>{resetPanels();setEditing(false);}}>Explore</button><button aria-pressed={editing} onClick={()=>{resetPanels();setEditing(true);setSheet('half');}}>Edit</button></div></div></header>
   <input ref={replacementInput} hidden type="file" accept="image/jpeg" aria-label="Replace panorama file" onChange={e=>void replaceRoomPhoto(e.target.files?.[0])}/><input ref={panoramaInput} hidden type="file" accept="image/jpeg" multiple aria-label="Import panorama files" onChange={e=>void uploadRooms(e.target.files)}/><input ref={backupInput} hidden type="file" accept=".zip" aria-label="Restore palace backup" onChange={e=>void restore(e.target.files?.[0])}/>
   <section className="stage" aria-label="360 room viewer" onPointerDownCapture={e=>{activeTouches.current.add(e.pointerId);motion.current?.setInteracting(true);}}>
    {room?.modelSrc?<ModelStage roomKey={room.id} src={room.modelSrc} camera={room.initialView} position={room.initialPosition} markers={markers} moveMarkers={markerEditing} onMove={(id,point)=>void moveHotspot3D(id,point)} onReady={(v,key,loadedSrc)=>{viewer.current=v;setReadyView(v?{viewer:v,roomKey:key??'',src:loadedSrc??''}:null);}} onSelect={markerSelect} onPlace={place3D}/>:room&&src?<Panorama roomKey={room.id} src={src} camera={room.initialView} markers={markers} moveMarkers={markerEditing} onMove={(id,yaw,pitch)=>void moveHotspot(id,yaw,pitch)} onReady={(v,key,loadedSrc)=>{viewer.current=v;setReadyView(v?{viewer:v,roomKey:key??'',src:loadedSrc??''}:null);}} onSelect={markerSelect} onPlace={(yaw,pitch)=>{if(placement==='memory'){setDraftAsset(null);setDraft({id:crypto.randomUUID(),roomId,title:'',note:'',yaw:normalizeYaw(yaw),pitch,size:36,provenance:'upload'});setPlacement(null);}else if(placement==='move'&&draft){setDraft({...draft,yaw:normalizeYaw(yaw),pitch});setPlacement(null);}else if(placement==='link'){const target=palace.rooms.find(r=>r.id!==roomId);if(target)setLinkDraft({id:crypto.randomUUID(),roomId,targetRoomId:target.id,yaw:normalizeYaw(yaw),pitch,label:'Go to '+target.title});setPlacement(null);}}}/>:<div className="empty-stage"><span className="eyebrow">A PLACE TO BEGIN</span><h1>{room?'Opening room…':'Your space, your stories.'}</h1><p>{room?'Loading the saved panorama.':'Import a 360 JPG to create your first room.'}</p>{!room&&<button className="primary" onClick={()=>panoramaInput.current?.click()}>Import your first room</button>}</div>}
    {room&&<><div className="stage-label"><h2>{room.title}</h2><p>{room.modelSrc?(editing?'Tap the floor to walk · Select a memory to edit':'Drag to look · Tap the floor to walk · Tap an image'):editing?'Select a memory or circle to edit':'Drag to look around · Tap an image to remember'}</p></div>{room.modelSrc&&<button className="back-to-entrance" onClick={()=>{viewer.current?.lookAt(room.initialView);if(room.initialPosition)viewer.current?.moveTo?.(room.initialPosition);motion.current?.recenter();}}><StudioIcon name="rooms"/>Back to beginning</button>}{movingHotspots&&!draft&&!linkDraft&&<div className="hotspot-help" role="status">Drag a circle or image. Changes save on drop.</div>}{!motionBlocked&&!touchOnly&&['permission-required','requesting','denied','insecure','error'].includes(motionState.status)&&<div className="motion-permission"><p role="status">{motionState.message}</p>{motionState.status==='permission-required'&&<button onClick={()=>void motion.current?.enable()}>Allow motion</button>}<button onClick={()=>setTouchOnly(true)}>Use touch</button></div>}</>}
    {placement&&<div className="placement-banner" role="status">{placement==='link'?'Tap a spot for the room connection.':room?.modelSrc?'Tap a wall, table or floor for your memory image.':'Tap a spot for your memory image.'}<button onClick={()=>{setPlacement(null);if(placement==='memory')cancelDraft();}}>Cancel</button></div>}
   </section>
   {!(phone&&editing)&&filmstrip}
   {editing&&(phone?<BottomSheet className="inspector" aria-label="Editing sidebar" detent={sheet} onDetentChange={setSheet} header={filmstrip}>{inspectorPages}</BottomSheet>:<aside className="inspector" aria-label="Editing sidebar">{inspectorPages}</aside>)}
    {menu&&<div className="modal-shade" onClick={()=>setMenu(false)}><section className="editor-panel" role="dialog" aria-modal="true" aria-label="Palaces and backups" onClick={e=>e.stopPropagation()}><button className="close-button" onClick={()=>setMenu(false)} aria-label="Close palaces">×</button><h2>Your palaces</h2><Link href="/" className="back-link" onClick={()=>setMenu(false)}>Open the palace gallery</Link><label>Choose palace<span className="select-field"><select value={palace.id} disabled={busy} onChange={e=>{setMenu(false);choosePalace(e.target.value);}}>{palaces.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select><StudioIcon name="chevron"/></span></label><p>Shared with your teammate. Export a ZIP to keep an independent backup.</p><button disabled={busy} onClick={()=>{setMenu(false);newPalace();}}>New palace</button><button disabled={busy} onClick={()=>void backup()}>Export ZIP</button><button disabled={busy} onClick={()=>backupInput.current?.click()}>Restore ZIP</button><p role="status">{status}</p></section></div>}
    {(remoteChanged||syncError)&&<div className="shared-sync" role="status"><span>{remoteChanged?'New shared changes are available. Load them when you are ready.':syncError}</span><button disabled={busy} onClick={()=>void refreshShared()}>Load latest</button></div>}
    {error&&<div className="error-banner" role="alert"><span>{error}</span><button disabled={busy} onClick={()=>void refreshShared()}>Load latest</button><button aria-label="Dismiss error" onClick={()=>setError('')}>×</button></div>}
    {selected&&<div className="modal-shade" onClick={()=>setSelected(null)}><section className="memory-card" role="dialog" aria-modal="true" aria-label={selected.title} onClick={e=>e.stopPropagation()}><button className="close-button" onClick={()=>setSelected(null)} aria-label="Close memory">×</button>{selectedSrc&&<Image src={selectedSrc} alt={selected.title} width={120} height={120} unoptimized/>}<span className="eyebrow">A MEMORY IN YOUR SPACE</span><h2>{selected.title}</h2><p className="note-text">{selected.note}</p>{<button className="primary" onClick={()=>{setEditing(true);setDraft({...selected});setDraftAsset(null);setSelected(null);}}>Edit memory</button>}</section></div>}
  </main>;
}
function message(error:unknown){return error instanceof Error?error.message:'Something went wrong. Please try again.';}
