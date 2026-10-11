'use client';
import { useEffect, useRef, useState } from 'react';
import type { Asset, Association } from '@/domain/model';
import { importImage } from '@/media/images';
import { parseAssociations, requireAIResponse } from './association-client';
import styles from './AssociationGenerator.module.css';
interface Props { concept:string; context:string; code:string; onCode:(code:string)=>void; onImage:(asset:Asset)=>void; onBusyChange:(busy:boolean)=>void; disabled?:boolean }
export default function AssociationGenerator({concept,context,code,onCode,onImage,onBusyChange,disabled=false}:Props){
 const [prompt,setPrompt]=useState('');
 const [suggestions,setSuggestions]=useState<Association[]>([]);
 const [selected,setSelected]=useState('');
 const [phase,setPhase]=useState<'idle'|'suggesting'|'generating'>('idle');
 const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const [accessOpen,setAccessOpen]=useState(false);
 const lifecycle=useRef({mounted:true,epoch:0,active:false,controller:undefined as AbortController|undefined});
 const latest=useRef(onImage);useEffect(()=>{latest.current=onImage;},[onImage]);
 const busy=phase!=='idle';
 useEffect(()=>{onBusyChange(busy);},[busy,onBusyChange]);
 useEffect(()=>{const state=lifecycle.current;state.mounted=true;return()=>{state.mounted=false;state.epoch++;state.controller?.abort();};},[]);
 function cancel(){const state=lifecycle.current;state.epoch++;state.controller?.abort();state.active=false;setPhase('idle');setNotice('Cancelled. A generation already started may still use credits.');}
 async function run(kind:'suggesting'|'generating'){
  const state=lifecycle.current;if(state.active||disabled)return;
  if(!(kind==='suggesting'?concept:prompt).trim())return;
  state.active=true;const operation=++state.epoch;const controller=new AbortController();state.controller=controller;
  const current=()=>state.mounted&&state.epoch===operation&&!controller.signal.aborted;
  setPhase(kind);setError('');setNotice('');
  try{
   const response=await requireAIResponse(await fetch('/api/ai/'+(kind==='suggesting'?'associations':'image'),{method:'POST',headers:{'Content-Type':'application/json','x-demo-code':code.trim(),'x-request-id':crypto.randomUUID()},body:JSON.stringify(kind==='suggesting'?{concept:concept.trim(),context:context.trim().slice(0,1500)}:{prompt:prompt.trim()}),signal:controller.signal}));
   if(!current())return;
   if(kind==='suggesting'){
    const items=parseAssociations(await response.json());if(!current())return;
    setSuggestions(items);setSelected('');setNotice('Choose a familiar object, or describe your own below.');
   }else{
    if(!response.headers.get('Content-Type')?.startsWith('image/png'))throw Error('The AI returned an unsupported image. Upload a PNG instead.');
    const blob=await response.blob();if(!blob.size||blob.size>3_000_000)throw Error('The image is empty or too large.');
    const asset=await importImage(new File([blob],'cutout.png',{type:'image/png'}),'memory');if(!current())return;
    latest.current(asset);setNotice('Transparent image ready. Save memory to keep it.');
   }
   setAccessOpen(false);
  }catch(e){if(current()){setError(e instanceof Error?e.message:'AI could not finish. Please retry.');if(e instanceof Error&&/access code/i.test(e.message))setAccessOpen(true);}}
  finally{if(current()){state.active=false;setPhase('idle');}}
 }
 return <div className={styles.panel} aria-label="Create a memory image">
  <details open={accessOpen} onToggle={e=>setAccessOpen(e.currentTarget.open)} className={styles.access}><summary>AI access · shared demo unlocked</summary><label>Demo access code<input type="password" value={code} onChange={e=>onCode(e.target.value)} maxLength={256} autoComplete="off" disabled={busy||disabled}/></label><p>Your shared demo session already enables AI. Only enter a code here if asked. Your room photos are never sent to AI.</p></details>
  <div className={styles.suggestRow}><span>Need a picture idea?</span><button disabled={busy||disabled||!concept.trim()} onClick={()=>void run('suggesting')}>{phase==='suggesting'?'Finding ideas…':'Suggest 3 objects'}</button></div>
  {suggestions.length>0&&<div className={styles.choices} aria-label="Picture suggestions">{suggestions.map(item=><button key={item.id} disabled={busy||disabled} aria-pressed={selected===item.id} onClick={()=>{setSelected(item.id);setPrompt(item.prompt);setNotice('');}}><strong>{item.title}</strong><span>{item.explanation}</span></button>)}</div>}
  <label>What should the picture show?<textarea value={prompt} onChange={e=>{setPrompt(e.target.value);setSelected('');}} rows={2} maxLength={2500} placeholder="A plain gold bracelet" disabled={busy||disabled}/></label>
  <p className={styles.hint}>Describe the object itself. We create a cutout with a transparent background.</p>
  <button className={styles.generate} disabled={busy||disabled||!prompt.trim()} onClick={()=>void run('generating')}>{phase==='generating'?'Creating cutout…':'Generate image'}</button>
  <p className={styles.hint}>Uses AI credits. No automatic generations or retries.</p>
  {busy&&<><GenerationStatus key={phase} generating={phase==='generating'}/><button onClick={cancel}>Cancel request</button></>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
 </div>;
}

function GenerationStatus({generating}:{generating:boolean}) {
 const [started]=useState(()=>Date.now());
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(timer);},[started]);
 return <div className={styles.progress}><span className={styles.spinner} aria-hidden="true"/><div><p role="status">{generating?'Creating your cutout':'Finding familiar objects'}</p><p><span aria-label="Elapsed time">{elapsed}s elapsed</span> · {generating?'You can cancel anytime.':'One moment…'}</p></div></div>;
}
