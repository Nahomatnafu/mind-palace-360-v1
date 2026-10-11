'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import CoordinateField from './CoordinateField';
import AssociationGenerator from './AssociationGenerator';
import { importImage } from '@/media/images';
import { MAX_MEMORY_SIZE, normalizeYaw, type Asset, type Memory } from '@/domain/model';
interface Props {memory:Memory;src?:string;busy:boolean;code:string;onCode:(code:string)=>void;onChange:(memory:Memory)=>void;onAsset:(asset:Asset,generated?:boolean)=>void;onSave:()=>void;onCancel:()=>void;onMove:()=>void;onDelete?:()=>void}
export default function MemoryEditor({memory,src,busy,code,onCode,onChange,onAsset,onSave,onCancel,onMove,onDelete}:Props){
 const lifecycle=useRef({mounted:true,epoch:0,onAsset});
 useEffect(()=>{lifecycle.current.onAsset=onAsset;},[onAsset]);
 useEffect(()=>{const state=lifecycle.current;state.mounted=true;return()=>{state.mounted=false;state.epoch++;};},[]);
 const input=useRef<HTMLInputElement>(null);const [preparing,setPreparing]=useState(false);const [aiBusy,setAiBusy]=useState(false);const [error,setError]=useState('');
 const [source,setSource]=useState<'ai'|'upload'>(src?'upload':'ai');const locked=busy||preparing||aiBusy;
 async function upload(file?:File){if(!file||locked)return;const operation=++lifecycle.current.epoch;setPreparing(true);setError('');try{const asset=await importImage(file,'memory');if(lifecycle.current.mounted&&operation===lifecycle.current.epoch)lifecycle.current.onAsset(asset);}catch(e){if(lifecycle.current.mounted&&operation===lifecycle.current.epoch)setError(e instanceof Error?e.message:'Image import failed.');}finally{if(lifecycle.current.mounted&&operation===lifecycle.current.epoch)setPreparing(false);if(input.current)input.current.value='';}}
 return <section className="memory-editor inspector-page" aria-label="Memory editor">
  <header className="inspector-heading"><div><span className="eyebrow">MEMORY</span><h2>{onDelete?'Edit memory':'New memory'}</h2></div><button className="icon-button" disabled={busy||preparing} onClick={onCancel} aria-label="Cancel memory">×</button></header>
  <div className="inspector-body">
   <label>What do you want to remember?<input value={memory.title} maxLength={200} onChange={e=>onChange({...memory,title:e.target.value})} placeholder="Gold" disabled={locked}/></label>
   <label>Note shown when you tap the image <span className="optional">(optional)</span><textarea value={memory.note} maxLength={10000} rows={3} onChange={e=>onChange({...memory,note:e.target.value})} placeholder="Au · Atomic number 79" disabled={locked}/></label>
   <div className="section-title"><h3>Memory image</h3><span>One object, easy to recognize</span></div>
   {src&&<div className="cutout-preview"><Image src={src} alt="Memory image preview" width={160} height={120} unoptimized/><span>{memory.provenance==='generated'?'Transparent cutout':'Your image'}</span></div>}
   <div className="segmented" aria-label="Image source"><button aria-pressed={source==='ai'} disabled={locked} onClick={()=>setSource('ai')}>Create with AI</button><button aria-pressed={source==='upload'} disabled={locked} onClick={()=>setSource('upload')}>Upload image</button></div>
   {source==='ai'?<AssociationGenerator concept={memory.title} context={memory.note} code={code} onCode={onCode} disabled={busy||preparing} onBusyChange={setAiBusy} onImage={asset=>onAsset(asset,true)}/>:<div className="upload-zone"><button disabled={locked} onClick={()=>input.current?.click()}>{preparing?'Preparing…':src?'Choose a different image':'Choose an image'}</button><p>PNG, JPEG or WebP. Use a transparent PNG for an object without a background.</p></div>}
   <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload association image" onChange={e=>void upload(e.target.files?.[0])}/>
   <details className="placement-settings"><summary>Size & placement</summary><label>Image size · {memory.size}px<input aria-label="Image size" type="range" min={16} max={MAX_MEMORY_SIZE} value={memory.size} disabled={locked} onChange={e=>onChange({...memory,size:Number(e.target.value)})}/></label><p>Stays the same size as you zoom. Drag the image in the room to reposition it.</p><button disabled={locked} onClick={onMove}>Place somewhere else</button>{memory.position?<p>Placed on a 3D surface. Drag the image or choose another spot to move it.</p>:<><CoordinateField label="Yaw" value={memory.yaw} min={-180} max={180} onCommit={value=>onChange({...memory,yaw:normalizeYaw(value)})}/><CoordinateField label="Pitch" value={memory.pitch} min={-90} max={90} onCommit={value=>onChange({...memory,pitch:value})}/></>}</details>
   {error&&<p role="alert">{error}</p>}{onDelete&&<button className="danger" disabled={locked} onClick={onDelete}>Delete memory</button>}
  </div>
  <footer className="inspector-footer"><button disabled={busy||preparing} onClick={onCancel}>Cancel</button><button className="primary" disabled={locked||!src||!memory.title.trim()} onClick={onSave}>{busy?'Saving…':'Save memory'}</button></footer>
 </section>;
}
