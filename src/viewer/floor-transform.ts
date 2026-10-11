/** Project a horizontal floor circle into the current camera, keeping its major diameter fixed. */
export function floorTransform(yaw:number,pitch:number,cameraYaw:number,cameraPitch:number):string {
  const point=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
  const right=[Math.cos(cameraYaw),0,-Math.sin(cameraYaw)];
  const up=[-Math.sin(cameraYaw)*Math.sin(cameraPitch),Math.cos(cameraPitch),-Math.cos(cameraYaw)*Math.sin(cameraPitch)];
  const forward=[Math.sin(cameraYaw)*Math.cos(cameraPitch),Math.sin(cameraPitch),Math.cos(cameraYaw)*Math.cos(cameraPitch)];
  const dot=(a:number[],b:number[])=>a.reduce((sum,value,i)=>sum+value*b[i],0);
  const depth=dot(point,forward);
  if(depth<=0.01)return 'scaleY(0.2)';
  const project=(axis:number[])=>[(dot(axis,right)*depth-dot(point,right)*dot(axis,forward))/(depth*depth),-(dot(axis,up)*depth-dot(point,up)*dot(axis,forward))/(depth*depth)];
  const [a,b]=project([Math.cos(yaw),0,-Math.sin(yaw)]);
  const [c,d]=project([Math.sin(yaw),0,Math.cos(yaw)]);
  // Largest singular value: a circle's major axis stays at the user's chosen pixel size.
  const trace=a*a+b*b+c*c+d*d,det=a*d-b*c;
  const scale=Math.sqrt((trace+Math.sqrt(Math.max(0,trace*trace-4*det*det)))/2);
  if(!Number.isFinite(scale)||scale<1e-8)return '';
  return 'matrix('+[a,b,c,d].map(n=>Number((n/scale).toFixed(6))).join(',')+',0,0)';
}
