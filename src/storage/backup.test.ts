import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { rasterInfo, validateAsset } from './validation';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { LocalPalaceRepository } from './repository';
import { exportPalace, importPalace, MAX_ARCHIVE_BYTES } from './backup';
import { fixtureAsset, fixturePalace } from './fixtures';
async function demoBytes(path:string) {
  const locations=[new URL('../../public'+path,import.meta.url),new URL('../../../../mind-palace-360-v2/public'+path,import.meta.url)];
  for(const location of locations) { try{return await readFile(location);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;} }
  throw new Error('Approved procedural demo fixture is missing.');
}
const stores:LocalPalaceRepository[]=[];
function store(){const result=new LocalPalaceRepository('backup-'+crypto.randomUUID());stores.push(result);return result;}
afterEach(async()=>{vi.unstubAllGlobals();for(const s of stores.splice(0)) await s.db.delete();});
async function backup(){const s=store(),p=fixturePalace();p.rooms=[];p.startRoomId='';p.memories=[];await s.save(p);return {s,p,blob:await exportPalace(p,s)};}
function archive(entries:Record<string,Uint8Array>){return new Blob([zipSync(entries,{level:0}).slice().buffer],{type:'application/zip'});}
describe('validated palace ZIP backups',()=>{
  it('round trips linked rooms and image bytes with fresh IDs',async()=>{
    const s=store(),p=fixturePalace(),a=fixtureAsset();p.memories[0].size=128;
    // Genuine 2:1 PNG fixture, independent of the browser decoder.
    const panoramaBytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4z8DwH4QBEfcD/RSF9bkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    const pan={...a,id:'panorama',kind:'panorama' as const,width:2,blob:new Blob([panoramaBytes],{type:'image/png'})};
    delete p.rooms[0].demoSrc;p.rooms[0].panoramaAssetId=pan.id;
    p.rooms.push({...p.rooms[0],id:'second-room'});p.links=[{id:'link',roomId:'room',targetRoomId:'second-room',yaw:20,pitch:0,label:'Next'}];
    await s.save(p,[a,pan]);const blob=await exportPalace(p,s),imported=await importPalace(blob,s);
    expect(imported.memories[0].size).toBe(128);expect(imported.id).not.toBe(p.id);expect(imported.rooms[0].id).not.toBe('room');expect(imported.memories[0].id).not.toBe('memory');expect(imported.links[0].id).not.toBe('link');
    expect(imported.links[0].targetRoomId).toBe(imported.rooms[1].id);expect(imported.startRoomId).toBe(imported.rooms[0].id);expect(imported.memories[0].note).toBe('<b>plain text</b>');
    expect(imported.memories[0].imageAssetId).not.toBe(a.id);expect(await (await s.asset(imported.memories[0].imageAssetId!))!.blob.arrayBuffer()).toEqual(await a.blob.arrayBuffer());expect(await s.list()).toHaveLength(2);
  });
  it('exports the actual integrated JPEG/PNG demo and preserves its restored assets independently',async()=>{
    const s=store(),p=fixturePalace();delete p.memories[0].imageAssetId;p.memories[0].demoSrc='/demo/bracelet.png';p.rooms[0].demoSrc='/demo/studio.jpg';p.rooms.push({...p.rooms[0],id:'gallery',demoSrc:'/demo/gallery.jpg'});p.memories.push({...p.memories[0],id:'circle',roomId:'gallery',demoSrc:'/demo/blue-ring.png'});p.links=[{id:'next',roomId:'room',targetRoomId:'gallery',yaw:0,pitch:0,label:'Next'}];
    vi.stubGlobal('fetch',vi.fn(async(src:string)=>{const bytes=await demoBytes(src);return new Response(bytes,{status:200});}));
    await s.save(p);const blob=await exportPalace(p,s),first=await importPalace(blob,s),second=await importPalace(blob,s);
    expect(first.rooms[0].demoSrc).toBeUndefined();expect(first.memories[0].demoSrc).toBeUndefined();expect(first.links[0].targetRoomId).toBe(first.rooms[1].id);
    const image=await s.asset(first.rooms[0].panoramaAssetId!);expect(image!.mimeType).toBe('image/jpeg');expect(rasterInfo(new Uint8Array(await image!.blob.arrayBuffer()))).toEqual({mimeType:'image/jpeg',width:2048,height:1024});
    await s.remove(first.id);expect(await s.asset(first.rooms[0].panoramaAssetId!)).toBeUndefined();expect(await s.asset(second.rooms[0].panoramaAssetId!)).toBeDefined();expect(await s.load(p.id)).toEqual(p);
  });
  it('accepts the import layer tolerance for nearly 2:1 panoramas',async()=>{const bytes=await demoBytes('/demo/studio.jpg');const info=rasterInfo(bytes);for(let at=2;at<bytes.length;){if(bytes[at++]!==255)break;const marker=bytes[at++],length=bytes.readUInt16BE(at);if(marker===192||marker===194){bytes.writeUInt16BE(info.height+1,at+3);break;}at+=length;}await expect(validateAsset({id:'near-ratio',blob:new Blob([bytes],{type:'image/jpeg'}),mimeType:'image/jpeg',width:info.width,height:info.height+1,kind:'panorama'})).resolves.toBeUndefined();});
  it('accepts a DEFLATE-compressed valid archive',async()=>{const {s,blob}=await backup(),entries=unzipSync(new Uint8Array(await blob.arrayBuffer()));const zipped=zipSync(entries,{level:6});const imported=await importPalace(new Blob([zipped.slice().buffer]),s);expect(imported.title).toBe('Test palace');expect(await s.list()).toHaveLength(2);});
  it('rejects missing image bytes without persisting the import',async()=>{const {s,blob}=await backup(),entries=unzipSync(new Uint8Array(await blob.arrayBuffer()));const manifest=JSON.parse(strFromU8(entries['manifest.json']));manifest.palace=fixturePalace();delete manifest.palace.rooms[0].demoSrc;manifest.palace.rooms[0].panoramaAssetId='missing';entries['manifest.json']=strToU8(JSON.stringify(manifest));await expect(importPalace(archive(entries),s)).rejects.toThrow('missing');expect(await s.list()).toHaveLength(1);});
  it('rejects traversal and extra paths before writes',async()=>{const {s,blob}=await backup(),entries=unzipSync(new Uint8Array(await blob.arrayBuffer()));entries['../secret']=strToU8('bad');await expect(importPalace(archive(entries),s)).rejects.toThrow('path');expect(await s.list()).toHaveLength(1);});
  it('rejects duplicate central-directory filenames',async()=>{const s=store(),bytes=zipSync({'manifest.json':strToU8('{}'),'assets/a.png':strToU8('a'),'assets/b.png':strToU8('b')},{level:0}),from=strToU8('assets/b.png'),to=strToU8('assets/a.png');for(let at=0;at<=bytes.length-from.length;at++){if(from.every((b,i)=>bytes[at+i]===b)){bytes.set(to,at);at+=from.length-1;}}await expect(importPalace(new Blob([bytes.slice().buffer]),s)).rejects.toThrow('duplicate');expect(await s.list()).toEqual([]);});
  it('rejects invalid schema and missing manifest',async()=>{const {s,blob}=await backup(),entries=unzipSync(new Uint8Array(await blob.arrayBuffer()));const manifest=JSON.parse(strFromU8(entries['manifest.json']));manifest.palace.schemaVersion=999;entries['manifest.json']=strToU8(JSON.stringify(manifest));await expect(importPalace(archive(entries),s)).rejects.toThrow('schema');await expect(importPalace(archive({'assets/x.png':strToU8('x')}),s)).rejects.toThrow('manifest');expect(await s.list()).toHaveLength(1);});
  it('rejects archives that lie about expanded size',async()=>{const {s,blob}=await backup(),bytes=new Uint8Array(await blob.arrayBuffer()),v=new DataView(bytes.buffer);for(let at=0;at+46<bytes.length;at++)if(v.getUint32(at,true)===0x02014b50){v.setUint32(at+24,1,true);break;}await expect(importPalace(new Blob([bytes]),s)).rejects.toThrow('declared');expect(await s.list()).toHaveLength(1);});
  it('rejects oversized files before reading bytes',async()=>{const s=store();const fake={size:MAX_ARCHIVE_BYTES+1,arrayBuffer:vi.fn()} as unknown as Blob;await expect(importPalace(fake,s)).rejects.toThrow('100 MB');expect(fake.arrayBuffer).not.toHaveBeenCalled();});
  it('rejects external demo references',async()=>{const s=store(),p=fixturePalace();p.rooms[0].demoSrc='https://evil.example/a.jpg';await expect(exportPalace(p,s)).rejects.toThrow('approved');});
  it('rejects tampered image checksums without partial writes',async()=>{
    const s=store(),p=fixturePalace();p.rooms=[];p.startRoomId='';p.memories=[];
    const a=fixtureAsset(),entries:Record<string,Uint8Array>={'assets/image.png':new Uint8Array(await a.blob.arrayBuffer())};
    const withRoom=fixturePalace();delete withRoom.rooms[0].demoSrc;withRoom.rooms[0].panoramaAssetId='image';
    entries['manifest.json']=strToU8(JSON.stringify({format:'mind-palace-360',version:1,palace:withRoom,assets:[{id:'image',path:'assets/image.png',mimeType:'image/png',width:1,height:1,kind:'memory',sha256:'0'.repeat(64)}]}));
    await expect(importPalace(archive(entries),s)).rejects.toThrow('checksum');expect(await s.list()).toEqual([]);expect(await s.asset('image')).toBeUndefined();
  });
});
