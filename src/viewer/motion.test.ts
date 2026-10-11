import {afterEach,beforeEach,describe,expect,it,vi,type Mock} from 'vitest';
import type {Camera} from '@/domain/model';
import {createMotionController,isMotionDevice,orientationToCameraAngles,smoothAngles,type MotionController,type MotionState} from './motion';

describe('sensor optical direction and smoothing',()=>{
  it('maps upright phone heading to panorama right-positive yaw',()=>{
    const view=orientationToCameraAngles({alpha:90,beta:90,gamma:0})!;
    expect(view.yaw).toBeCloseTo(-90);expect(view.pitch).toBeCloseTo(0);
    expect(orientationToCameraAngles({alpha:0,beta:45,gamma:0})!.pitch).toBeCloseTo(-45);
  });
  it('keeps optical center stable when upright phone rolls or screen orientation changes',()=>{
    const portrait=orientationToCameraAngles({alpha:35,beta:90,gamma:0})!;
    const rolled=orientationToCameraAngles({alpha:-5,beta:90,gamma:40},90)!;
    expect(rolled.yaw).toBeCloseTo(portrait.yaw);
    expect(rolled.pitch).toBeCloseTo(portrait.pitch);
    const landscape=orientationToCameraAngles({alpha:-55,beta:0,gamma:90},90)!;
    expect(landscape.yaw).toBeCloseTo(portrait.yaw);
    expect(landscape.pitch).toBeCloseTo(portrait.pitch);
    expect(orientationToCameraAngles({alpha:35,beta:90,gamma:0},-90)!.yaw).toBeCloseTo(portrait.yaw);
  });
  it('rejects absent and nonfinite sensor values',()=>{
    expect(orientationToCameraAngles({alpha:null,beta:90,gamma:0})).toBeUndefined();
    expect(orientationToCameraAngles({alpha:0,beta:NaN,gamma:0})).toBeUndefined();
    expect(orientationToCameraAngles({alpha:0,beta:90,gamma:0},Infinity)).toBeUndefined();
  });
  it('smooths across the heading seam through the short arc',()=>{
    expect(smoothAngles({yaw:179,pitch:0},{yaw:-179,pitch:20},.5)).toEqual({yaw:-180,pitch:10});
    expect(smoothAngles({yaw:0,pitch:0},{yaw:90,pitch:20},2)).toEqual({yaw:90,pitch:20});
  });
});

describe('motion controller with mocked browser sensors',()=>{
  let camera:Camera,states:MotionState[],controller:MotionController,onCamera:Mock<(camera:Camera)=>void>;
  let win:ReturnType<typeof setupWindow>,doc:EventTarget & {hidden:boolean};
  let frames:Map<number,FrameRequestCallback>,nextId:number;
  function setupWindow(){
    return Object.assign(new EventTarget(),{
      DeviceOrientationEvent:{} as {requestPermission?:()=>Promise<string>},
      isSecureContext:true,location:{hostname:'demo.example'},
      screen:{orientation:Object.assign(new EventTarget(),{angle:0})},
      setTimeout:(callback:()=>void,delay:number)=>globalThis.setTimeout(callback,delay),
      clearTimeout:(id:ReturnType<typeof setTimeout>)=>globalThis.clearTimeout(id),
      requestAnimationFrame:(callback:FrameRequestCallback)=>{frames.set(++nextId,callback);return nextId;},
      cancelAnimationFrame:(id:number)=>{frames.delete(id);},
    });
  }
  const emit=(alpha:number|null,beta=90,gamma=0)=>{
    win.dispatchEvent(Object.assign(new Event('deviceorientation'),{alpha,beta,gamma}));
  };
  const frame=(time=16)=>{
    const callbacks=[...frames.entries()];frames.clear();
    for(const [,callback] of callbacks)callback(time);
  };
  beforeEach(()=>{
    vi.useFakeTimers();camera={yaw:42,pitch:10,zoom:25};states=[];frames=new Map();nextId=0;
    win=setupWindow();doc=Object.assign(new EventTarget(),{hidden:false});
    vi.stubGlobal('window',win);vi.stubGlobal('document',doc);
    onCamera=vi.fn((value:Camera)=>{camera=value;});
    controller=createMotionController({getCamera:()=>camera,onCamera,onState:value=>states.push(value)});
  });
  afterEach(()=>{controller.destroy();vi.unstubAllGlobals();vi.useRealTimers();});
  it('waits for actual data and preserves the current view on first sample',async()=>{
    await controller.enable();expect(states.at(-1)?.status).toBe('waiting');
    emit(null);expect(states.at(-1)?.status).toBe('waiting');expect(onCamera).not.toHaveBeenCalled();
    emit(170);frame();expect(states.at(-1)?.status).toBe('active');
    expect(camera).toEqual({yaw:42,pitch:10,zoom:25});
    emit(180);frame(91);expect(camera.yaw).toBeLessThan(42);expect(camera.zoom).toBe(25);
  });
  it('starts automatically without a permission API',async()=>{
    await controller.enable({requestPermission:false});expect(states.at(-1)?.status).toBe('waiting');
    emit(80);frame();expect(camera).toEqual({yaw:42,pitch:10,zoom:25});
    emit(100);frame(91);expect(camera.yaw).toBeLessThan(42);
  });
  it('waits for a gesture and reuses granted access after room changes',async()=>{
    const permission=vi.fn().mockResolvedValue('granted');win.DeviceOrientationEvent.requestPermission=permission;
    await controller.enable({requestPermission:false});expect(permission).not.toHaveBeenCalled();
    expect(states.at(-1)?.status).toBe('permission-required');
    await controller.enable();expect(permission).toHaveBeenCalledOnce();emit(0);frame();
    controller.disable();camera={yaw:-120,pitch:-20,zoom:55};
    await controller.enable({requestPermission:false});expect(permission).toHaveBeenCalledOnce();
    emit(100);frame();expect(camera).toEqual({yaw:-120,pitch:-20,zoom:55});
  });
  it('does not repeat a denied prompt automatically',async()=>{
    const permission=vi.fn().mockResolvedValue('denied');win.DeviceOrientationEvent.requestPermission=permission;
    await controller.enable();controller.disable();await controller.enable({requestPermission:false});
    expect(permission).toHaveBeenCalledOnce();emit(0);frame();expect(onCamera).not.toHaveBeenCalled();
  });
  it('pauses during dragging and resumes from the manually chosen view',async()=>{
    await controller.enable({requestPermission:false});emit(0);frame();
    controller.setInteracting(true);camera={yaw:100,pitch:-20,zoom:60};
    emit(50);frame(91);expect(camera).toEqual({yaw:100,pitch:-20,zoom:60});
    controller.setInteracting(false);emit(50);frame(110);
    expect(camera).toEqual({yaw:100,pitch:-20,zoom:60});
    emit(70);frame(185);expect(camera.yaw).toBeLessThan(100);expect(camera.zoom).toBe(60);
  });
  it('preserves drag inertia before and after the first resumed sensor frame',async()=>{
    await controller.enable();emit(0);frame();controller.setInteracting(true);
    camera={yaw:170,pitch:15,zoom:40};emit(50);controller.setInteracting(false);
    camera={yaw:-175,pitch:18,zoom:40};emit(50);frame(91);
    expect(camera.yaw).toBeCloseTo(-175);expect(camera.pitch).toBeCloseTo(18);
    camera={yaw:-170,pitch:20,zoom:40};emit(50);frame(166);
    expect(camera.yaw).toBeCloseTo(-170);expect(camera.pitch).toBeCloseTo(20);
    for(let i=0;i<8;i++){emit(50);frame(240+i*75);}
    expect(camera.yaw).toBeCloseTo(-170);expect(camera.pitch).toBeCloseTo(20);expect(camera.zoom).toBe(40);
  });
  it('requests permission synchronously from enable and reports denial',async()=>{
    const permission=vi.fn().mockResolvedValue('denied');
    win.DeviceOrientationEvent.requestPermission=permission;
    const pending=controller.enable();
    expect(permission).toHaveBeenCalledOnce();
    await pending;expect(states.at(-1)?.status).toBe('denied');
    emit(0);frame();expect(onCamera).not.toHaveBeenCalled();
  });
  it('rejects insecure and unsupported surfaces without requesting access',async()=>{
    win.isSecureContext=false;await controller.enable();expect(states.at(-1)?.status).toBe('insecure');
    Object.defineProperty(win,'DeviceOrientationEvent',{value:undefined});
    // Availability is captured when a controller is created.
    controller.destroy();
    controller=createMotionController({getCamera:()=>camera,onCamera,onState:value=>states.push(value)});
    await controller.enable();expect(states.at(-1)?.status).toBe('unsupported');
  });
  it('handles permission failure and discards permission granted after disable',async()=>{
    win.DeviceOrientationEvent.requestPermission=vi.fn().mockRejectedValue(new Error('gesture missing'));
    await controller.enable();expect(states.at(-1)?.status).toBe('error');
    let grant:(value:string)=>void=()=>{};
    win.DeviceOrientationEvent.requestPermission=()=>new Promise(resolve=>{grant=resolve;});
    const pending=controller.enable();controller.disable();grant('granted');await pending;
    expect(states.at(-1)?.status).toBe('disabled');emit(0);frame();expect(onCamera).not.toHaveBeenCalled();
  });
  it('reports no-data timeout and removes active handlers',async()=>{
    await controller.enable();vi.advanceTimersByTime(6001);
    expect(states.at(-1)?.status).toBe('error');emit(0);frame();expect(onCamera).not.toHaveBeenCalled();
  });
  it('recenters without jumping and cancels a scheduled frame on disable',async()=>{
    await controller.enable();emit(0);frame();emit(30);frame(91);
    const before={...camera};controller.recenter();emit(30);frame(110);
    expect(camera.yaw).toBeCloseTo(before.yaw);expect(camera.pitch).toBeCloseTo(before.pitch);
    emit(45);controller.disable();expect(frames.size).toBe(0);frame();expect(camera).toEqual(before);
  });
  it('pauses in background and calibrates to the current view on resume',async()=>{
    await controller.enable();emit(0);frame();doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));
    expect(states.at(-1)?.status).toBe('paused');expect(frames.size).toBe(0);
    emit(120);frame();const before={...camera};
    doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));
    expect(states.at(-1)?.status).toBe('waiting');emit(120);frame();
    expect(camera).toEqual(before);
  });
  it('recalibrates after landscape rotation and removes all handlers on destroy',async()=>{
    await controller.enable();emit(0);frame();const before={...camera};
    win.screen.orientation.angle=90;win.screen.orientation.dispatchEvent(new Event('change'));
    expect(states.at(-1)?.status).toBe('waiting');emit(90);frame();expect(camera).toEqual(before);
    controller.destroy();expect(frames.size).toBe(0);onCamera.mockClear();
    emit(130);frame();vi.advanceTimersByTime(7000);expect(onCamera).not.toHaveBeenCalled();
  });
});

describe('automatic motion device policy',()=>{
  it('requires a touch-first device with sensors, independent of window width',()=>{
    expect(isMotionDevice({touchPoints:5,coarsePointer:true,orientationAvailable:true})).toBe(true);
    expect(isMotionDevice({touchPoints:5,coarsePointer:false,orientationAvailable:true})).toBe(false);
    expect(isMotionDevice({touchPoints:0,coarsePointer:true,orientationAvailable:true})).toBe(false);
    expect(isMotionDevice({touchPoints:5,coarsePointer:true,orientationAvailable:false})).toBe(false);
  });
});
