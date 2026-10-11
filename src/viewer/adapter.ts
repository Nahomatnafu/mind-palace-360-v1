import { Viewer, events } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { normalizeYaw, toDegrees, toRadians, type Camera, type Vec3 } from '@/domain/model';

/** Markers carry spherical coordinates for panoramas and, inside 3D model rooms, a world position. */
export interface ViewerMarker { id: string; yaw: number; pitch: number; label: string; size: number; image?: string; kind: 'memory' | 'link'; position?: Vec3 }
/** The controls shared by every viewer engine so the workspace can drive either one. */
export interface CameraControls {
  markers(markers: ViewerMarker[]): void;
  camera(): Camera;
  lookAt(camera: Camera): void;
  zoom(delta: number): void;
  /** Only 3D model viewers report and change the standing position. */
  position?(): Vec3;
  moveTo?(position: Vec3): void;
}
export interface ViewerAdapter extends CameraControls {
  load(src: string, camera: Camera): Promise<void>;
  editMarkers(enabled: boolean): void;
  destroy(): void;
}
export interface ViewerCallbacks { select(id: string): void; place(yaw: number, pitch: number): void; move?(id:string,yaw:number,pitch:number):void; camera?(camera: Camera): void }
export function createViewer(container: HTMLElement, callbacks: ViewerCallbacks): ViewerAdapter {
  const viewer = new Viewer({ container, navbar: false, plugins: [MarkersPlugin], defaultYaw: 0, defaultPitch: 0, defaultZoomLvl: 35, minFov: 30, maxFov: 110, mousewheel: true, touchmoveTwoFingers: false, loadingTxt: 'Opening your room…' });
  const plugin = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);
  const camera = (): Camera => { const p=viewer.getPosition(); return {yaw:normalizeYaw(toDegrees(p.yaw)),pitch:toDegrees(p.pitch),zoom:viewer.getZoomLevel()}; };
  let pointer:{x:number;y:number}|null=null;let movedPointer=false;
  let editing=false;
  let currentMarkers:ViewerMarker[]=[];
  let drag:{item:ViewerMarker;pointerId:number;x:number;y:number;point:{yaw:number;pitch:number};moved:boolean}|null=null;
  let suppressed:{id:string;until:number}|null=null;
  const updatePosition=(id:string,yaw:number,pitch:number)=>plugin.updateMarker({id,position:{yaw:toRadians(yaw),pitch:toRadians(pitch)}});
  const cancelDrag=()=>{if(drag){updatePosition(drag.item.id,drag.item.yaw,drag.item.pitch);drag=null;}pointer=null;};
  const pointerDown=(event:PointerEvent)=>{
    pointer={x:event.clientX,y:event.clientY};movedPointer=false;
    const marker=event.target instanceof Element?event.target.closest('[data-marker-id]') as HTMLElement|null:null;
    const item=currentMarkers.find(item=>item.id===marker?.dataset.markerId);
    if(!editing||!item||event.button!==0||drag)return;
    event.preventDefault();event.stopImmediatePropagation();
    drag={item,pointerId:event.pointerId,x:event.clientX,y:event.clientY,point:{yaw:item.yaw,pitch:item.pitch},moved:false};
  };
  const pointerMove=(event:PointerEvent)=>{
    if(pointer&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>6)movedPointer=true;
    if(!drag||event.pointerId!==drag.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<=6)return;
    const bounds=container.getBoundingClientRect();
    try{const point=viewer.dataHelper.viewerCoordsToSphericalCoords({x:event.clientX-bounds.left,y:event.clientY-bounds.top});if(!point)return;
      drag.point={yaw:normalizeYaw(toDegrees(point.yaw)),pitch:Math.max(-90,Math.min(90,toDegrees(point.pitch)))};
      drag.moved=true;updatePosition(drag.item.id,drag.point.yaw,drag.point.pitch);
    }catch{/* Keep the last valid position if the pointer leaves the sphere. */}
  };
  const pointerUp=(event:PointerEvent)=>{
    if(drag&&event.pointerId!==drag.pointerId)return;
    if(drag)pointerMove(event);
    pointer=null;if(!drag)return;
    event.stopImmediatePropagation();const completed=drag;drag=null;
    if(completed.moved){suppressed={id:completed.item.id,until:Date.now()+400};callbacks.move?.(completed.item.id,completed.point.yaw,completed.point.pitch);}
  };
  const pointerCancel=(event:PointerEvent)=>{if(drag&&event.pointerId===drag.pointerId)cancelDrag();};
  // The engine also listens for legacy mouse/touch events. Block those explicitly
  // so a marker gesture cannot start a simultaneous panorama pan.
  const legacyStart=(event:Event)=>{if(editing&&event.target instanceof Element&&event.target.closest('[data-marker-id]')){event.preventDefault();event.stopImmediatePropagation();}};
  const legacyMove=(event:Event)=>{if(drag){event.preventDefault();event.stopImmediatePropagation();}};
  const click=(event:MouseEvent)=>{
    if(event.button!==0||movedPointer){movedPointer=false;return;}
    if(event.target instanceof Element&&event.target.closest('button,.psv-marker'))return;
    const bounds=container.getBoundingClientRect();
    try{const point=viewer.dataHelper.viewerCoordsToSphericalCoords({x:event.clientX-bounds.left,y:event.clientY-bounds.top});if(point)callbacks.place(normalizeYaw(toDegrees(point.yaw)),toDegrees(point.pitch));}catch{/* A click outside the rendered sphere is not a placement. */}
  };
  const moved = () => callbacks.camera?.(camera());
  container.addEventListener('click',click);
  container.addEventListener('pointerdown',pointerDown,true);
  container.addEventListener('mousedown',legacyStart,true);
  container.addEventListener('touchstart',legacyStart,{capture:true,passive:false});
  window.addEventListener('pointermove',pointerMove,{capture:true,passive:false});
  window.addEventListener('mousemove',legacyMove,{capture:true,passive:false});
  window.addEventListener('touchmove',legacyMove,{capture:true,passive:false});
  window.addEventListener('pointerup',pointerUp,true);
  window.addEventListener('pointercancel',pointerCancel,true);
  window.addEventListener('blur',cancelDrag);
  viewer.addEventListener(events.PositionUpdatedEvent.type,moved);
  let disposed=false;
  let request=0;
  return {
    async load(src,position) {
      const version=++request;
      cancelDrag();
      plugin.clearMarkers();
      const loaded=await viewer.setPanorama(src,{position:{yaw:toRadians(position.yaw),pitch:toRadians(position.pitch)},zoom:position.zoom,transition:false});
      if (!disposed && version===request && !loaded) throw new Error('Room loading was interrupted. Please try again.');
    },
    markers(items) {
      if(disposed) return;
      cancelDrag();currentMarkers=items;
      plugin.setMarkers(items.map(item=>{
        const button=document.createElement('button');
        button.type='button'; button.className=`palace-marker ${item.kind}`;
        button.setAttribute('aria-label',item.label); button.title=item.label;
        button.dataset.markerId=item.id;
        button.style.width=`${item.size}px`;button.style.height=`${item.size}px`;
        if(item.image){const image=document.createElement('img');image.src=item.image;image.alt='';image.draggable=false;button.append(image);} else {const ring=document.createElement('span');ring.className='portal-ring';button.append(ring);}
        button.addEventListener('click',event=>{event.stopPropagation();if(suppressed?.id===item.id&&Date.now()<suppressed.until){suppressed=null;return;}callbacks.select(item.id);});
        return {id:item.id,position:{yaw:toRadians(item.yaw),pitch:toRadians(item.pitch)},element:button,size:{width:item.size,height:item.size},hoverScale:false};
      }));
    },
    camera,
    lookAt(position){if(!disposed){viewer.rotate({yaw:toRadians(position.yaw),pitch:toRadians(position.pitch)});viewer.zoom(position.zoom);}},
    zoom(delta){viewer.zoom(Math.max(0,Math.min(100,viewer.getZoomLevel()+delta)));},
    editMarkers(enabled){editing=enabled;container.classList.toggle('editing-markers',enabled);if(!enabled)cancelDrag();},
    destroy(){cancelDrag();disposed=true;request++;container.removeEventListener('click',click);container.removeEventListener('pointerdown',pointerDown,true);container.removeEventListener('mousedown',legacyStart,true);container.removeEventListener('touchstart',legacyStart,true);window.removeEventListener('pointermove',pointerMove,true);window.removeEventListener('mousemove',legacyMove,true);window.removeEventListener('touchmove',legacyMove,true);window.removeEventListener('pointerup',pointerUp,true);window.removeEventListener('pointercancel',pointerCancel,true);window.removeEventListener('blur',cancelDrag);viewer.removeEventListener(events.PositionUpdatedEvent.type,moved);viewer.destroy();},
  };
}
