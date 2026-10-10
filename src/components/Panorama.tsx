'use client';
/* eslint-disable react-hooks/set-state-in-effect -- Reflect asynchronous external viewer loading in the interface. */
import { useEffect, useRef, useState } from 'react';
import type { Camera } from '@/domain/model';
import type { ViewerAdapter, ViewerMarker } from '@/viewer/adapter';
interface Props { src: string; camera: Camera; markers: ViewerMarker[]; onSelect(id:string):void; onPlace(yaw:number,pitch:number):void; onReady?(viewer:ViewerAdapter|null):void }
export default function Panorama(props:Props) {
  const container=useRef<HTMLDivElement>(null);
  const engine=useRef<ViewerAdapter|null>(null);
  const latest=useRef(props);
  const [revision,setRevision]=useState(0);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{latest.current=props;});
  useEffect(()=>{
    let disposed=false;
    import('@/viewer/adapter').then(({createViewer})=>{
      if(disposed || !container.current)return;
      engine.current=createViewer(container.current,{select:id=>latest.current.onSelect(id),place:(yaw,pitch)=>latest.current.onPlace(yaw,pitch)});
      latest.current.onReady?.(engine.current);
      setRevision(n=>n+1);
    }).catch(()=>setError('The 360 viewer could not start. Check WebGL support and reload.'));
    return()=>{disposed=true;latest.current.onReady?.(null);engine.current?.destroy();engine.current=null;};
  },[]);
  useEffect(()=>{
    const viewer=engine.current;if(!viewer)return;
    let cancelled=false;
    setLoaded(false);setError('');
    viewer.load(props.src,props.camera).then(()=>{if(!cancelled){setLoaded(true);viewer.markers(latest.current.markers);}}).catch(()=>{if(!cancelled)setError('Unable to open this room. Reimport the panorama or try another room.');});
    return()=>{cancelled=true;};
  // Camera is the saved arrival view, not a trigger for reloading the texture.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[props.src,revision]);
  useEffect(()=>{if(loaded)engine.current?.markers(props.markers);},[props.markers,loaded]);
  return <div className="panorama"><div ref={container} className="panorama-engine"/>{error?<div className="viewer-notice" role="alert">{error}<button onClick={()=>setRevision(n=>n+1)}>Retry room</button></div>:!loaded?<div className="viewer-notice" role="status">Opening your room…</div>:null}</div>;
}
