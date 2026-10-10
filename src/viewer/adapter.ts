import { Viewer, events } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { normalizeYaw, toDegrees, toRadians, type Camera } from '@/domain/model';

export interface ViewerMarker { id: string; yaw: number; pitch: number; label: string; size: number; image?: string; kind: 'memory' | 'link' }
export interface ViewerAdapter {
  load(src: string, camera: Camera): Promise<void>;
  markers(markers: ViewerMarker[]): void;
  camera(): Camera;
  lookAt(camera: Camera): void;
  zoom(delta: number): void;
  destroy(): void;
}
export interface ViewerCallbacks { select(id: string): void; place(yaw: number, pitch: number): void; camera?(camera: Camera): void }
export function createViewer(container: HTMLElement, callbacks: ViewerCallbacks): ViewerAdapter {
  const viewer = new Viewer({ container, navbar: false, plugins: [MarkersPlugin], defaultYaw: 0, defaultPitch: 0, defaultZoomLvl: 35, minFov: 30, maxFov: 110, mousewheel: true, touchmoveTwoFingers: false, loadingTxt: 'Opening your room…' });
  const plugin = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);
  const camera = (): Camera => { const p=viewer.getPosition(); return {yaw:normalizeYaw(toDegrees(p.yaw)),pitch:toDegrees(p.pitch),zoom:viewer.getZoomLevel()}; };
  let pointer:{x:number;y:number}|null=null;let movedPointer=false;
  const pointerDown=(event:PointerEvent)=>{pointer={x:event.clientX,y:event.clientY};movedPointer=false;};
  const pointerMove=(event:PointerEvent)=>{if(pointer&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>6)movedPointer=true;};
  const pointerUp=()=>{pointer=null;};
  const click=(event:MouseEvent)=>{
    if(event.button!==0||movedPointer){movedPointer=false;return;}
    if(event.target instanceof Element&&event.target.closest('button,.psv-marker'))return;
    const bounds=container.getBoundingClientRect();
    try{const point=viewer.dataHelper.viewerCoordsToSphericalCoords({x:event.clientX-bounds.left,y:event.clientY-bounds.top});if(point)callbacks.place(normalizeYaw(toDegrees(point.yaw)),toDegrees(point.pitch));}catch{/* A click outside the rendered sphere is not a placement. */}
  };
  const moved = () => callbacks.camera?.(camera());
  container.addEventListener('click',click);
  container.addEventListener('pointerdown',pointerDown);
  window.addEventListener('pointermove',pointerMove);
  window.addEventListener('pointerup',pointerUp);
  viewer.addEventListener(events.PositionUpdatedEvent.type,moved);
  let disposed=false;
  let request=0;
  return {
    async load(src,position) {
      const version=++request;
      plugin.clearMarkers();
      const loaded=await viewer.setPanorama(src,{position:{yaw:toRadians(position.yaw),pitch:toRadians(position.pitch)},zoom:position.zoom,transition:false});
      if (!disposed && version===request && !loaded) throw new Error('Room loading was interrupted. Please try again.');
    },
    markers(items) {
      if(disposed) return;
      plugin.setMarkers(items.map(item=>{
        const button=document.createElement('button');
        button.type='button'; button.className=`palace-marker ${item.kind}`;
        button.setAttribute('aria-label',item.label); button.title=item.label;
        button.dataset.markerId=item.id;
        button.style.width=`${item.size}px`;button.style.height=`${item.size}px`;
        if(item.image){const image=document.createElement('img');image.src=item.image;image.alt='';image.draggable=false;button.append(image);} else {const ring=document.createElement('span');ring.className='portal-ring';button.append(ring);}
        button.addEventListener('click',event=>{event.stopPropagation();callbacks.select(item.id);});
        return {id:item.id,position:{yaw:toRadians(item.yaw),pitch:toRadians(item.pitch)},element:button,size:{width:item.size,height:item.size},hoverScale:false};
      }));
    },
    camera,
    lookAt(position){if(!disposed){viewer.rotate({yaw:toRadians(position.yaw),pitch:toRadians(position.pitch)});viewer.zoom(position.zoom);}},
    zoom(delta){viewer.zoom(Math.max(0,Math.min(100,viewer.getZoomLevel()+delta)));},
    destroy(){disposed=true;request++;container.removeEventListener('click',click);container.removeEventListener('pointerdown',pointerDown);window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',pointerUp);viewer.removeEventListener(events.PositionUpdatedEvent.type,moved);viewer.destroy();},
  };
}
