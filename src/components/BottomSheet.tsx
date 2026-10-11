'use client';
import { useEffect, useRef, useSyncExternalStore, type FocusEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

// Phone-only bottom sheet (Apple Maps style) with three detents. Heights are CSS pixels measured from the bottom edge,
// excluding the safe-area inset, which the stylesheet adds. Detents follow window.visualViewport so the sheet shrinks
// above the on-screen keyboard. The sheet writes --sheet-h / --sheet-kb on its parent element so sibling overlays
// (room label, banners) can stay above it; React never manages those inline properties, so they are not clobbered.
export type SheetDetent='collapsed'|'half'|'full';
const ORDER:SheetDetent[]=['collapsed','half','full'];
const COLLAPSED=96;
const PHONE_QUERY='(max-width: 700px)';
const SLOP=4;
const FLICK=0.35; // px per ms

function subscribePhone(callback:()=>void){const media=window.matchMedia(PHONE_QUERY);media.addEventListener('change',callback);return()=>media.removeEventListener('change',callback);}
/** True on phone-width viewports (matches the editor-mobile.css breakpoint); false during server rendering. */
export function usePhoneLayout(){return useSyncExternalStore(subscribePhone,()=>window.matchMedia(PHONE_QUERY).matches,()=>false);}

function viewportHeight(){return window.visualViewport?.height??window.innerHeight;}
export function detentHeight(detent:SheetDetent){if(detent==='collapsed')return COLLAPSED;return Math.round(viewportHeight()*(detent==='half'?0.5:0.92));}
function nextDetent(detent:SheetDetent){return ORDER[(ORDER.indexOf(detent)+1)%ORDER.length];}
function findScroller(target:Element|null,root:HTMLElement){
  for(let node=target;node&&node!==root;node=node.parentElement){
    const style=getComputedStyle(node);
    if(/(auto|scroll)/.test(style.overflowY)&&node.scrollHeight>node.clientHeight+1)return node;
  }
  return null;
}

interface Props{detent:SheetDetent;onDetentChange:(detent:SheetDetent)=>void;header?:ReactNode;children:ReactNode;className?:string;'aria-label':string}
interface DragState{height:number;dragging:boolean;startY:number;startHeight:number;moved:boolean;samples:{y:number;t:number}[];mode:'idle'|'pending'|'sheet'|'scroll';touchX:number;touchY:number;grip:boolean;scroller:Element|null;detent:SheetDetent;onDetentChange:(detent:SheetDetent)=>void}

export default function BottomSheet({detent,onDetentChange,header,children,className,'aria-label':label}:Props){
  const sheet=useRef<HTMLElement>(null);
  const state=useRef<DragState>({height:COLLAPSED,dragging:false,startY:0,startHeight:0,moved:false,samples:[],mode:'idle',touchX:0,touchY:0,grip:false,scroller:null,detent,onDetentChange});
  useEffect(()=>{state.current.detent=detent;state.current.onDetentChange=onDetentChange;},[detent,onDetentChange]);

  function host(){const element=sheet.current;return element?.parentElement??element;}
  function setHeight(height:number){state.current.height=height;host()?.style.setProperty('--sheet-h',`${Math.round(height)}px`);}
  function begin(y:number){const s=state.current;s.dragging=true;s.startY=y;s.startHeight=s.height;s.moved=false;s.samples=[{y,t:performance.now()}];host()?.setAttribute('data-sheet-dragging','');}
  function move(y:number){
    const s=state.current;if(!s.dragging)return;
    const delta=s.startY-y;if(Math.abs(delta)>SLOP)s.moved=true;
    const max=detentHeight('full');let height=s.startHeight+delta;
    if(height>max)height=max+(height-max)*0.2;else if(height<COLLAPSED)height=COLLAPSED-(COLLAPSED-height)*0.2;
    setHeight(height);
    const now=performance.now();s.samples.push({y,t:now});while(s.samples.length>1&&now-s.samples[0].t>120)s.samples.shift();
  }
  function end(){
    const s=state.current;if(!s.dragging)return;
    s.dragging=false;host()?.removeAttribute('data-sheet-dragging');
    const first=s.samples[0],last=s.samples[s.samples.length-1];
    const velocity=first&&last?(first.y-last.y)/Math.max(1,last.t-first.t):0; // positive = sheet growing
    const heights=ORDER.map(d=>({d,h:detentHeight(d)}));
    let target:SheetDetent;
    if(Math.abs(velocity)>FLICK){
      const candidates=velocity>0?heights.filter(x=>x.h>s.height+1):heights.filter(x=>x.h<s.height-1);
      target=candidates.length?(velocity>0?candidates[0].d:candidates[candidates.length-1].d):(velocity>0?'full':'collapsed');
    }else target=heights.reduce((best,x)=>Math.abs(x.h-s.height)<Math.abs(best.h-s.height)?x:best).d;
    setHeight(detentHeight(target));
    if(target!==s.detent)s.onDetentChange(target);
  }

  // Snap to the current detent, and keep following viewport/keyboard changes.
  useEffect(()=>{if(!state.current.dragging)setHeight(detentHeight(detent));},[detent]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    const element=sheet.current;const parent=element?.parentElement;if(!element||!parent)return;
    const viewport=window.visualViewport;
    const update=()=>{
      const inset=viewport?Math.max(0,Math.round(window.innerHeight-viewport.height-viewport.offsetTop)):0;
      parent.style.setProperty('--sheet-kb',`${inset}px`);
      if(!state.current.dragging)setHeight(detentHeight(state.current.detent));
    };
    update();
    window.addEventListener('resize',update);viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);
    return()=>{window.removeEventListener('resize',update);viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);parent.style.removeProperty('--sheet-h');parent.style.removeProperty('--sheet-kb');parent.removeAttribute('data-sheet-dragging');};
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch: drag the sheet from anywhere unless the content should scroll instead (full detent, not at the top, or
  // moving the finger up). Horizontal gestures are left to the filmstrip and sliders. Listeners are non-passive so the
  // first vertical move can claim the gesture before the browser starts scrolling.
  useEffect(()=>{
    const element=sheet.current;if(!element)return;
    const s=state.current;
    const start=(event:TouchEvent)=>{
      if(event.touches.length!==1){s.mode='scroll';return;}
      const touch=event.touches[0];const target=event.target as Element|null;
      s.mode='pending';s.touchX=touch.clientX;s.touchY=touch.clientY;s.grip=!!target?.closest('.sheet-grip');s.scroller=findScroller(target,element);
    };
    const moveTouch=(event:TouchEvent)=>{
      const touch=event.touches[0];if(!touch)return;
      if(s.mode==='pending'){
        const dx=touch.clientX-s.touchX,dy=touch.clientY-s.touchY;
        if(Math.abs(dx)<3&&Math.abs(dy)<3)return;
        if(!s.grip&&Math.abs(dx)>Math.abs(dy)){s.mode='scroll';return;}
        const atTop=!s.scroller||s.scroller.scrollTop<=0;
        if(!(s.grip||s.detent!=='full'||(dy>0&&atTop))){s.mode='scroll';return;}
        s.mode='sheet';begin(touch.clientY);
      }
      if(s.mode==='sheet'){if(event.cancelable)event.preventDefault();move(touch.clientY);}
    };
    const finish=()=>{if(s.mode==='sheet')end();s.mode='idle';};
    element.addEventListener('touchstart',start,{passive:true});element.addEventListener('touchmove',moveTouch,{passive:false});
    element.addEventListener('touchend',finish);element.addEventListener('touchcancel',finish);
    return()=>{element.removeEventListener('touchstart',start);element.removeEventListener('touchmove',moveTouch);element.removeEventListener('touchend',finish);element.removeEventListener('touchcancel',finish);};
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mouse/pen drag on the grip (touch is handled above).
  const pointerDown=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(event.pointerType==='touch')return;event.currentTarget.setPointerCapture(event.pointerId);begin(event.clientY);};
  const pointerMove=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(event.pointerType==='touch')return;move(event.clientY);};
  const pointerEnd=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(event.pointerType==='touch')return;end();};
  const focusField=(event:FocusEvent<HTMLDivElement>)=>{const target=event.target as HTMLElement;if(target.matches('input:not([type=range]),textarea,select')&&state.current.detent!=='full')onDetentChange('full');};
  const cycle=()=>{if(state.current.moved)return;onDetentChange(nextDetent(state.current.detent));};
  // Empty header space (around the room thumbnails) also cycles the detents; real controls keep their own taps.
  const headerTap=(event:MouseEvent<HTMLDivElement>)=>{if(!(event.target as Element).closest('button,a,input,select,textarea,summary'))cycle();};

  return <aside ref={sheet} className={(className?className+' ':'')+'bottom-sheet'} role="region" aria-label={label} data-detent={detent}>
    <button type="button" className="sheet-grip" aria-label="Resize editing panel" aria-expanded={detent!=='collapsed'} onClick={cycle} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}><span className="sheet-handle" aria-hidden="true"/></button>
    {header&&<div className="sheet-header" onClick={headerTap}>{header}</div>}
    <div className="sheet-content" onFocus={focusField}>{children}</div>
  </aside>;
}
