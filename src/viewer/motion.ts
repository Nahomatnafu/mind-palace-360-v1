import { normalizeYaw, toDegrees, toRadians, type Camera } from '@/domain/model';

export type MotionStatus = 'disabled' | 'requesting' | 'unsupported' | 'insecure' | 'denied' | 'waiting' | 'active' | 'paused' | 'error';
export interface MotionState { status: MotionStatus; message: string }
export interface MotionOptions {
  getCamera: () => Camera;
  onCamera: (camera: Camera) => void;
  onState: (state: MotionState) => void;
}
export interface MotionController {
  enable: () => Promise<void>;
  disable: () => void;
  recenter: () => void;
  destroy: () => void;
}
type Quaternion = [number,number,number,number];
type Angles = {yaw:number;pitch:number};
export interface SensorAngles { alpha:number|null; beta:number|null; gamma:number|null }

function multiply(a:Quaternion,b:Quaternion):Quaternion {
  const [x,y,z,w]=a, [u,v,s,t]=b;
  return [w*u+x*t+y*s-z*v,w*v-x*s+y*t+z*u,w*s+x*v-y*u+z*t,w*t-x*u-y*v-z*s];
}
function rotation(axis: 'x'|'y'|'z',degrees:number):Quaternion {
  const sine=Math.sin(toRadians(degrees)/2),cosine=Math.cos(toRadians(degrees)/2);
  return [axis==='x'?sine:0,axis==='y'?sine:0,axis==='z'?sine:0,cosine];
}

/**
 * Browser intrinsic orientation mapped to a camera looking through the back of
 * the handset. Apply the camera's -90° X correction and screen roll. Only the
 * optical direction is returned, so camera roll does not tilt panorama UI.
 */
export function orientationToCameraAngles(sensor:SensorAngles,screenAngle=0):Angles|undefined {
  const {alpha,beta,gamma}=sensor;
  if (alpha===null || beta===null || gamma===null ||
      ![alpha,beta,gamma,screenAngle].every(Number.isFinite)) return undefined;
  const device=multiply(multiply(rotation('y',alpha),rotation('x',beta)),rotation('z',-gamma));
  const q=multiply(multiply(device,rotation('x',-90)),rotation('z',-screenAngle));
  const [x,y,z,w]=q;
  // Rotate camera-forward (0,0,-1) by the unit quaternion.
  const forwardX=-2*(x*z+w*y);
  const forwardY=2*(w*x-y*z);
  const forwardZ=2*(x*x+y*y)-1;
  return {
    yaw:normalizeYaw(toDegrees(Math.atan2(forwardX,-forwardZ))),
    pitch:toDegrees(Math.asin(Math.max(-1,Math.min(1,forwardY)))),
  };
}

export function smoothAngles(current:Angles,target:Angles,amount:number):Angles {
  const t=Math.max(0,Math.min(1,amount));
  return {
    yaw:normalizeYaw(current.yaw+normalizeYaw(target.yaw-current.yaw)*t),
    pitch:current.pitch+(target.pitch-current.pitch)*t,
  };
}

export function createMotionController({getCamera,onCamera,onState}:MotionOptions):MotionController {
  let enabled=false,requesting=false,destroyed=false,epoch=0;
  let frame:number|undefined,timer:number|undefined,lastTime:number|undefined;
  let sensor:Angles|undefined,anchor:Angles|undefined,anchorCamera:Camera|undefined;
  let smoothed:Angles|undefined,target:Angles|undefined;
  const supported=typeof window!=='undefined' && typeof document!=='undefined';
  const api=supported ? (window as unknown as {DeviceOrientationEvent?:{requestPermission?:()=>Promise<string>}}).DeviceOrientationEvent : undefined;
  const state=(status:MotionStatus,message:string)=>onState({status,message});
  const screenAngle=()=>window.screen?.orientation?.angle ?? (window as unknown as {orientation?:number}).orientation ?? 0;
  const cancelFrame=()=>{
    if(frame!==undefined)window.cancelAnimationFrame(frame);
    frame=undefined;lastTime=undefined;
  };
  const clearTimer=()=>{if(timer!==undefined)window.clearTimeout(timer);timer=undefined;};
  const resetAnchor=()=>{anchor=undefined;anchorCamera=undefined;sensor=undefined;target=undefined;smoothed=undefined;lastTime=undefined;};
  const armTimeout=()=>{
    clearTimer();
    timer=window.setTimeout(()=>{
      if(enabled && !sensor && !document.hidden) {
        stop();
        state('error','No motion data arrived. Check sensor permissions or use touch controls.');
      }
    },6000);
  };
  const tick=(time:number)=>{
    frame=undefined;
    if(!enabled || document.hidden || !target) return;
    const elapsed=lastTime===undefined ? 16 : Math.min(100,Math.max(0,time-lastTime));
    lastTime=time;
    smoothed=smoothAngles(smoothed??target,target,1-Math.exp(-elapsed/75));
    try {
      const current=getCamera();
      if(Math.abs(normalizeYaw(current.yaw-smoothed.yaw))>0.001 || Math.abs(current.pitch-smoothed.pitch)>0.001) {
        onCamera({...current,...smoothed});
      }
    }
    catch {
      stop();
      state('error','Could not update the view. Use touch controls and try enabling motion again.');
      return;
    }
    if(Math.abs(normalizeYaw(smoothed.yaw-target.yaw))>0.01 || Math.abs(smoothed.pitch-target.pitch)>0.01) {
      frame=window.requestAnimationFrame(tick);
    }
  };
  const orientation=(event:Event)=>{
    if(!enabled || document.hidden) return;
    const next=orientationToCameraAngles(event as DeviceOrientationEvent,screenAngle());
    if(!next) return;
    // Avoid an arbitrary heading at the optical pole.
    if(Math.abs(next.pitch)>89.5 && sensor) next.yaw=sensor.yaw;
    sensor=next;
    clearTimer();
    if(!anchor || !anchorCamera) {
      anchor=next;
      anchorCamera={...getCamera()};
      smoothed={yaw:anchorCamera.yaw,pitch:anchorCamera.pitch};
      state('active','Motion enabled. Move your phone to look around.');
    }
    target={
      yaw:normalizeYaw(anchorCamera.yaw+normalizeYaw(next.yaw-anchor.yaw)),
      pitch:Math.max(-90,Math.min(90,anchorCamera.pitch+next.pitch-anchor.pitch)),
    };
    if(frame===undefined)frame=window.requestAnimationFrame(tick);
  };
  const screenChanged=()=>{
    if(!enabled || document.hidden)return;
    cancelFrame();resetAnchor();armTimeout();
    state('waiting','Aligning motion after screen rotation. Move your phone gently.');
  };
  const visibility=()=>{
    if(!enabled)return;
    cancelFrame();clearTimer();resetAnchor();
    if(document.hidden)state('paused','Motion paused while the app is in the background.');
    else {armTimeout();state('waiting','Resuming motion. Move your phone gently.');}
  };
  function stop() {
    epoch++;requesting=false;enabled=false;
    if(supported) {
      window.removeEventListener('deviceorientation',orientation);
      window.removeEventListener('orientationchange',screenChanged);
      window.screen?.orientation?.removeEventListener('change',screenChanged);
      document.removeEventListener('visibilitychange',visibility);
      cancelFrame();clearTimer();
    }
    resetAnchor();
  }
  return {
    async enable() {
      if(destroyed || enabled || requesting)return;
      if(!supported || !api) {state('unsupported','Motion is unavailable on this device. Use touch controls.');return;}
      const local=['localhost','127.0.0.1','[::1]','::1'].includes(window.location.hostname);
      if(!window.isSecureContext && !local) {state('insecure','Motion needs HTTPS. Open the secure demo link; touch controls still work.');return;}
      const attempt=++epoch;
      requesting=true;
      try {
        if(api.requestPermission) {
          state('requesting','Allow motion access in your browser.');
          // No awaited work precedes this call: invoke enable directly from a click.
          const permission=await api.requestPermission();
          if(destroyed || attempt!==epoch)return;
          if(permission!=='granted') {requesting=false;state('denied','Motion permission was denied. Use touch controls or change browser permissions.');return;}
        }
        if(destroyed || attempt!==epoch)return;
        requesting=false;enabled=true;resetAnchor();
        window.addEventListener('deviceorientation',orientation);
        window.addEventListener('orientationchange',screenChanged);
        window.screen?.orientation?.addEventListener('change',screenChanged);
        document.addEventListener('visibilitychange',visibility);
        if(document.hidden)state('paused','Motion paused while the app is in the background.');
        else {armTimeout();state('waiting','Waiting for motion data. Hold the phone comfortably and move it gently.');}
      } catch {
        if(attempt!==epoch || destroyed)return;
        stop();
        state('error','Motion access failed. Enable it from the motion button or use touch controls.');
      }
    },
    disable() {stop();if(!destroyed)state('disabled','Motion disabled. Drag to look around.');},
    recenter() {
      if(!enabled)return;
      cancelFrame();
      anchorCamera={...getCamera()};anchor=sensor;
      target=undefined;smoothed=undefined;
      if(!sensor) {resetAnchor();armTimeout();state('waiting','Waiting for motion data to recenter.');}
      else state('active','Recentered. This phone position now matches the current view.');
    },
    destroy() {destroyed=true;stop();},
  };
}
