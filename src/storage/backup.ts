import { Unzip, UnzipInflate, strFromU8, strToU8, zipSync } from 'fflate';
import type { Asset, Palace, PalaceRepository } from '../domain/model';
import { repository } from './repository';
import { MAX_ASSET_BYTES, assetIds, rasterInfo, validateAsset, validateStoredPalace } from './validation';
export const MAX_ARCHIVE_BYTES=100*1024*1024;
export const MAX_EXPANDED_BYTES=128*1024*1024;
const MAX_MANIFEST_BYTES=2*1024*1024;
interface BackupAsset { id:string; path:string; mimeType:string; width:number; height:number; kind:Asset['kind']; sha256:string }
interface Manifest { format:'mind-palace-360'; version:1; palace:Palace; assets:BackupAsset[] }
const sha256=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(b=>b.toString(16).padStart(2,'0')).join('');
const newId=()=>crypto.randomUUID();
const pathAllowed=(path:string)=>path==='manifest.json'||/^assets\/[A-Za-z0-9_-]{1,128}\.(?:jpg|png|webp)$/.test(path);
const extension=(mime:string)=>mime==='image/jpeg'?'jpg':mime==='image/png'?'png':'webp';
export async function exportPalace(palace:Palace, store:PalaceRepository=repository):Promise<Blob> {
  validateStoredPalace(palace);
  const exported=structuredClone(palace), prepared=new Map<string,Asset>();
  delete exported.revision;
  for(const item of [...exported.rooms,...exported.memories]) {
    const isRoom='initialView' in item;
    let id=isRoom?item.panoramaAssetId:item.imageAssetId;
    if(id) { const asset=await store.asset(id); if(!asset) throw new Error('Cannot export: a referenced image is missing.'); prepared.set(id,asset); }
    else if(item.demoSrc) {
      const response=await fetch(item.demoSrc,{credentials:'same-origin',redirect:'error'});
      if(!response.ok) throw new Error('Cannot export the demo image.');
      if(Number(response.headers.get('content-length'))>MAX_ASSET_BYTES) throw new Error('Demo image is too large.');
      const blob=await response.blob();
      const info=rasterInfo(new Uint8Array(await blob.arrayBuffer()));
      id=newId();
      prepared.set(id,{id,blob:new Blob([blob],{type:info.mimeType}),...info,kind:isRoom?'panorama':'memory'});
      if(isRoom) item.panoramaAssetId=id; else item.imageAssetId=id;
    }
    delete item.demoSrc;
  }
  const entries:Record<string,Uint8Array>={}, assets:BackupAsset[]=[];
  let expanded=0;
  for(const asset of prepared.values()) {
    await validateAsset(asset);
    const bytes=new Uint8Array(await asset.blob.arrayBuffer()), path='assets/'+asset.id+'.'+extension(asset.mimeType);
    expanded+=bytes.byteLength;
    if(expanded>MAX_EXPANDED_BYTES) throw new Error('Palace is too large for a 128 MB expanded backup.');
    entries[path]=bytes;
    assets.push({id:asset.id,path,mimeType:asset.mimeType,width:asset.width,height:asset.height,kind:asset.kind,sha256:await sha256(bytes)});
  }
  const manifest:Manifest={format:'mind-palace-360',version:1,palace:exported,assets};
  entries['manifest.json']=strToU8(JSON.stringify(manifest));
  if(entries['manifest.json'].length>MAX_MANIFEST_BYTES || expanded+entries['manifest.json'].length>MAX_EXPANDED_BYTES) throw new Error('Backup exceeds supported limits.');
  // Raster images are already compressed; storing avoids recompression work.
  const archive=zipSync(entries,{level:0});
  if(archive.length>MAX_ARCHIVE_BYTES) throw new Error('Backup exceeds the 100 MB archive limit.');
  return new Blob([archive.slice().buffer],{type:'application/zip'});
}
function inspectArchive(bytes:Uint8Array):Map<string,number> {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--) if(view.getUint32(i,true)===0x06054b50 && i+22+view.getUint16(i+20,true)===bytes.length) {end=i;break;}
  if(end<0 || view.getUint16(end+4,true)!==0 || view.getUint16(end+6,true)!==0) throw new Error('Unsupported or invalid ZIP archive.');
  const count=view.getUint16(end+10,true), start=view.getUint32(end+16,true), size=view.getUint32(end+12,true);
  if(count<1 || count>1101 || count!==view.getUint16(end+8,true) || start+size!==end) throw new Error('Unsupported ZIP layout or file count.');
  const entries=new Map<string,number>(); let at=start,total=0;
  for(let i=0;i<count;i++) {
    if(at+46>end || view.getUint32(at,true)!==0x02014b50) throw new Error('Invalid ZIP directory.');
    const flags=view.getUint16(at+8,true), method=view.getUint16(at+10,true), expanded=view.getUint32(at+24,true), nameLength=view.getUint16(at+28,true), extra=view.getUint16(at+30,true), comment=view.getUint16(at+32,true), disk=view.getUint16(at+34,true);
    if(at+46+nameLength+extra+comment>end || flags&1 || disk!==0 || ![0,8].includes(method)) throw new Error('Unsupported ZIP entry.');
    const name=strFromU8(bytes.subarray(at+46,at+46+nameLength));
    if(!pathAllowed(name) || entries.has(name)) throw new Error('Unsafe or duplicate archive path.');
    if(expanded>(name==='manifest.json'?MAX_MANIFEST_BYTES:MAX_ASSET_BYTES)) throw new Error('Archive entry exceeds supported limits.');
    total+=expanded; if(total>MAX_EXPANDED_BYTES) throw new Error('Archive expands beyond 128 MB.');
    entries.set(name,expanded); at+=46+nameLength+extra+comment;
  }
  if(at!==end || !entries.has('manifest.json')) throw new Error('Backup manifest is missing.');
  return entries;
}
function extractBounded(bytes:Uint8Array,expected:Map<string,number>):Record<string,Uint8Array> {
  const result:Record<string,Uint8Array>={}; const seen=new Set<string>(); let total=0;
  const unzip=new Unzip(file=>{
    if(!expected.has(file.name)||seen.has(file.name)) throw new Error('Unexpected or duplicate archive entry.');
    seen.add(file.name); const chunks:Uint8Array[]=[]; let length=0;
    file.ondata=(error,data,final)=>{
      if(error) throw error;
      length+=data.length;total+=data.length;
      if(length>expected.get(file.name)! || total>MAX_EXPANDED_BYTES) {file.terminate();throw new Error('Archive expands beyond declared limits.');}
      chunks.push(data);
      if(final) {
        if(length!==expected.get(file.name)) throw new Error('Archive entry length mismatch.');
        const joined=new Uint8Array(length);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;} result[file.name]=joined;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for(let at=0;at<bytes.length;at+=16384) unzip.push(bytes.subarray(at,at+16384),at+16384>=bytes.length);
  if(Object.keys(result).length!==expected.size) throw new Error('Incomplete ZIP archive.');
  return result;
}
export async function importPalace(file:Blob,store:PalaceRepository=repository):Promise<Palace> {
  if(!file.size || file.size>MAX_ARCHIVE_BYTES) throw new Error('Choose a ZIP backup smaller than 100 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer()),entries=extractBounded(bytes,inspectArchive(bytes));
  let manifest:Manifest;
  try{manifest=JSON.parse(strFromU8(entries['manifest.json'])) as Manifest;}catch{throw new Error('Invalid backup manifest JSON.');}
  if(!manifest || manifest.format!=='mind-palace-360' || manifest.version!==1 || !Array.isArray(manifest.assets) || manifest.assets.length>1100) throw new Error('Unsupported backup format or version.');
  validateStoredPalace(manifest.palace);
  const referenced=assetIds(manifest.palace),oldAssets=new Set<string>(),mapped=new Map<string,string>(),assets:Asset[]=[];
  for(const meta of manifest.assets) {
    if(!meta || typeof meta.id!=='string' || oldAssets.has(meta.id) || !referenced.has(meta.id) || meta.path!=='assets/'+meta.id+'.'+extension(meta.mimeType) || !entries[meta.path] || !/^[a-f0-9]{64}$/.test(meta.sha256)) throw new Error('Invalid or duplicate backup asset.');
    oldAssets.add(meta.id);
    const content=entries[meta.path];
    if(await sha256(content)!==meta.sha256) throw new Error('Backup image checksum does not match.');
    const id=newId(),asset:Asset={id,blob:new Blob([content.slice().buffer],{type:meta.mimeType}),mimeType:meta.mimeType,width:meta.width,height:meta.height,kind:meta.kind};
    await validateAsset(asset); mapped.set(meta.id,id); assets.push(asset);
  }
  if(referenced.size!==oldAssets.size || Object.keys(entries).length!==assets.length+1) throw new Error('Backup has missing or unreferenced images.');
  if([...manifest.palace.rooms,...manifest.palace.memories].some(item=>item.demoSrc)) throw new Error('Backup images must be included in the archive.');
  const palace=structuredClone(manifest.palace),rooms=new Map(palace.rooms.map(room=>[room.id,newId()]));
  delete palace.revision;
  palace.id=newId();palace.updatedAt=new Date().toISOString();palace.startRoomId=palace.startRoomId?rooms.get(palace.startRoomId)!:'';
  for(const room of palace.rooms){room.id=rooms.get(room.id)!;if(room.panoramaAssetId) room.panoramaAssetId=mapped.get(room.panoramaAssetId)!;}
  for(const memory of palace.memories){memory.id=newId();memory.roomId=rooms.get(memory.roomId)!;if(memory.imageAssetId) memory.imageAssetId=mapped.get(memory.imageAssetId)!;}
  for(const link of palace.links){link.id=newId();link.roomId=rooms.get(link.roomId)!;link.targetRoomId=rooms.get(link.targetRoomId)!;}
  // All archive validation completes before the only persistent mutation.
  await store.save(palace,assets);
  return palace;
}
