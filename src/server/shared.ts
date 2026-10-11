import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { Asset, Palace } from '@/domain/model';
import { assetIds, MAX_ASSET_BYTES, validateAsset, validateStoredPalace } from '@/storage/validation';
import { readLimited } from './security';

const bucket = 'demo-media';
export { SharedError, requireSession, sameOrigin, sessionCookie } from './demo-session';
import { SharedError, config, sign, verify } from './demo-session';
export function sharedError(error:unknown):Response {
  return Response.json({error:error instanceof SharedError?error.message:'Shared saving is unavailable. Your change was not confirmed; please try again.'},{status:error instanceof SharedError?error.status:503,headers:{'Cache-Control':'no-store'}});
}
export function json(value:unknown):Response { return Response.json(value,{headers:{'Cache-Control':'no-store'}}); }
export async function body(request:Request):Promise<Record<string,unknown>> {
  try { const value=JSON.parse(await readLimited(request,2*1024*1024));if(!value || typeof value!=='object' || Array.isArray(value))throw new Error();return value; }
  catch { throw new SharedError(400,'The request is invalid or too large.'); }
}
export function validId(value:unknown):asserts value is string { if(typeof value!=='string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value))throw new SharedError(400,'Invalid ID.'); }
export async function supabase(path:string,init:RequestInit={}):Promise<Response> {
  const {url,key}=config();
  return fetch(url+path,{...init,cache:'no-store',headers:{apikey:key,Authorization:'Bearer '+key,...init.headers},signal:AbortSignal.timeout(60000)});
}
async function database(path:string,init:RequestInit={}):Promise<Response> {
  const response=await supabase('/rest/v1/'+path,{...init,headers:{'Content-Type':'application/json',Prefer:'return=representation',...init.headers}});
  if(response.status===409)throw new SharedError(409,'This item changed in another browser. Reload the latest version before saving again.');
  if(!response.ok)throw new SharedError(503,'The shared database is unavailable. Please retry after setup is complete.');
  return response;
}
interface PalaceRow {id:string;revision:number;document:Palace;deleted:boolean}
interface AssetRow {id:string;path:string;metadata:Omit<Asset,'blob'>;sha256:string}
export async function listPalaces() {
  const rows:PalaceRow[]=await (await database('demo_palaces?deleted=eq.false&select=id,revision,document,deleted&limit=100')).json();
  return rows.map(row=>({...row.document,revision:row.revision})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
export async function loadPalace(id:string) {
  validId(id);const rows:PalaceRow[]=await(await database('demo_palaces?id=eq.'+id+'&deleted=eq.false')).json();
  return rows[0]?{...rows[0].document,revision:rows[0].revision}:null;
}
export async function savePalace(value:unknown,deleted=false) {
  try { validateStoredPalace(value); } catch { throw new SharedError(400,'The palace contains invalid rooms, memories or links.'); }
  const {revision=0,...document}=value as Palace;
  if(!Number.isSafeInteger(revision) || revision<0)throw new SharedError(400,'Invalid palace revision.');
  const ids=[...assetIds(document)];
  for(let start=0;start<ids.length;start+=50){
    const rows:AssetRow[]=await(await database('demo_assets?select=id,metadata&id=in.('+ids.slice(start,start+50).join(',')+')')).json();
    const assets=new Map(rows.map(row=>[row.id,row.metadata]));
    for(const id of ids.slice(start,start+50)){
      if(!assets.has(id))throw new SharedError(400,'An image has not finished uploading. Save again after it uploads.');
      if(document.rooms.some(r=>r.panoramaAssetId===id)&&assets.get(id)?.kind!=='panorama' || document.memories.some(m=>m.imageAssetId===id)&&assets.get(id)?.kind!=='memory')throw new SharedError(400,'The image type does not match its use.');
    }
  }
  const record={id:document.id,revision:revision+1,document,deleted};
  const response=await database('demo_palaces'+(revision?'?id=eq.'+document.id+'&revision=eq.'+revision+'&deleted=eq.false':''),{method:revision?'PATCH':'POST',body:JSON.stringify(record)});
  const rows:PalaceRow[]=await response.json();
  if(!rows.length)throw new SharedError(409,'Aneesha or another browser changed this palace. Your draft is still here. Reload the latest version before saving again.');
  return {revision:rows[0].revision};
}
export async function deletePalace(id:string,revision:unknown){
  validId(id);if(!Number.isSafeInteger(revision)||Number(revision)<1)throw new SharedError(400,'Reload the palace before deleting it.');
  const rows=await(await database(`demo_palaces?id=eq.${id}&revision=eq.${revision}&deleted=eq.false`,{method:'PATCH',body:JSON.stringify({deleted:true,revision:Number(revision)+1})})).json();
  if(!rows.length)throw new SharedError(409,'This palace changed in another browser. Refresh before deleting it.');
}
export async function getAsset(id:string):Promise<AssetRow|undefined>{validId(id);return (await(await database('demo_assets?id=eq.'+id)).json())[0];}
export async function signedAsset(id:string){
  const row=await getAsset(id);if(!row)throw new SharedError(404,'This image is missing.');
  const response=await supabase(`/storage/v1/object/sign/${bucket}/${row.path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})});
  if(!response.ok)throw new SharedError(503,'Unable to open the shared image.');
  const data=await response.json();return {...row.metadata,url:config().url+'/storage/v1'+data.signedURL};
}
export async function prepareUpload(metadata:Omit<Asset,'blob'>){
  validId(metadata?.id);
  if(!['panorama','memory'].includes(metadata.kind)||!['image/jpeg','image/png','image/webp'].includes(metadata.mimeType)||![metadata.width,metadata.height].every(n=>Number.isInteger(n)&&n>0&&n<=16384)||metadata.width*metadata.height>80_000_000)throw new SharedError(400,'Invalid image metadata.');
  const path=metadata.id+'/'+randomUUID();
  const response=await supabase(`/storage/v1/object/upload/sign/${bucket}/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)throw new SharedError(503,'Unable to prepare the image upload.');
  const data=await response.json();
  return {url:config().url+'/storage/v1'+data.url,ticket:sign({kind:'upload',metadata,path,exp:Date.now()+15*60*1000})};
}
export async function finishUpload(ticket:string){
  const claim=verify(ticket);if(claim.kind!=='upload')throw new SharedError(400,'Invalid upload ticket.');
  const metadata=claim.metadata as Omit<Asset,'blob'>,path=claim.path as string;
  const response=await supabase(`/storage/v1/object/${bucket}/${path}`);
  if(!response.ok || !response.body)throw new SharedError(400,'Image upload did not finish. Try again.');
  const chunks:Uint8Array[]=[];let length=0;const reader=response.body.getReader();
  try { while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_ASSET_BYTES){await reader.cancel();throw new SharedError(413,'Image exceeds 32 MB.');}chunks.push(value);} } finally {reader.releaseLock();}
  const bytes=Buffer.concat(chunks);
  try {await validateAsset({...metadata,blob:new Blob([bytes],{type:metadata.mimeType})});await sharp(bytes,{limitInputPixels:80_000_000}).stats();}catch{throw new SharedError(400,'The uploaded file is not a valid supported image.');}
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const existing=await getAsset(metadata.id);
  if(existing){if(existing.sha256!==sha256 || (['id','kind','mimeType','width','height'] as const).some(key=>existing.metadata[key]!==metadata[key]))throw new SharedError(409,'That image ID already exists. Import the image again.');return {saved:true};}
  await database('demo_assets',{method:'POST',body:JSON.stringify({id:metadata.id,path,metadata,sha256})});
  return {saved:true};
}
