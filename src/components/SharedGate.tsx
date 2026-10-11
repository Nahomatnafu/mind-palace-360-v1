'use client';
import { useEffect, useState } from 'react';
import { PalaceMark } from './StudioIcons';
export default function SharedGate({children}:{children:React.ReactNode}) {
  const [state,setState]=useState<'loading'|'locked'|'ready'>('loading');
  const [opened,setOpened]=useState(false);
  const [code,setCode]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    fetch('/api/shared/session',{cache:'no-store'}).then(async r=>{if(!active)return;if(r.ok){setOpened(true);setState('ready');}else{setState('locked');if(r.status!==401)setError((await r.json()).error);}}).catch(()=>{if(active){setState('locked');setError('Cannot reach the shared workspace. Check your connection.');}});
    const expired=()=>{setError('Your session expired. Enter the demo code to reconnect. Your open draft is retained.');setState('locked');};
    window.addEventListener('palace-session-expired',expired);return()=>{active=false;window.removeEventListener('palace-session-expired',expired);};
  },[]);
  async function unlock(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');try{
    const response=await fetch('/api/shared/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
    const result=await response.json();if(!response.ok)throw new Error(result.error);setCode('');setOpened(true);setState('ready');
  }catch(e){setError(e instanceof Error?e.message:'Unable to connect. Try again.');}finally{setBusy(false);}}
  // Keep the editor mounted during reauthentication so an unsaved draft survives.
  return <>{opened&&<div hidden={state!=='ready'}>{children}</div>}{state!=='ready'&&<main className="shared-entry"><form onSubmit={e=>void unlock(e)}><PalaceMark/><span className="eyebrow">MIND PALACE · SHARED DEMO</span><h1>Your shared<br/>memory space.</h1><p>You and Aneesha see the same rooms, images and memories here.</p>{state==='loading'?<p role="status">Connecting…</p>:<><label>Demo access code<input type="password" autoComplete="current-password" required value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label><button className="primary" disabled={busy}>{busy?'Opening…':'Open shared space'}</button><p className="muted">Use the existing demo code on each device. Anyone you give this code to can edit this demo.</p></>}{error&&<p role="alert">{error}</p>}</form></main>}</>;
}
