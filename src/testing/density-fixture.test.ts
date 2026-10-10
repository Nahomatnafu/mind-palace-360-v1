import 'fake-indexeddb/auto';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {afterEach,describe,expect,it} from 'vitest';
import {LocalPalaceRepository} from '../storage/repository';
import {exportPalace,importPalace} from '../storage/backup';
import {createDensityFixture,densityArchive,densityHash} from './density-fixture';

const stores:LocalPalaceRepository[]=[];
afterEach(async()=>{for(const store of stores.splice(0))await store.db.delete();});
describe('118 distinct procedural image density fixture',()=>{
  it('generates deterministic distinct images and restores/export-restores their actual bytes',async()=>{
    const panorama=await readFile(new URL('../../public/demo/studio.jpg',import.meta.url));
    const fixture=await createDensityFixture(panorama),second=await createDensityFixture(panorama);
    expect(fixture.palace.memories).toHaveLength(118);expect(fixture.assets).toHaveLength(119);
    expect(new Set(fixture.memoryHashes).size).toBe(118);
    expect(fixture.memoryHashes).toEqual(second.memoryHashes);
    expect(new Set(fixture.palace.memories.map(memory=>memory.imageAssetId)).size).toBe(118);
    expect(new Set(fixture.palace.memories.map(memory=>memory.yaw)).size).toBe(20);
    expect(new Set(fixture.palace.memories.map(memory=>memory.pitch)).size).toBe(6);
    for(const asset of fixture.assets.slice(1)){
      const bytes=new Uint8Array(await asset.blob.arrayBuffer());
      const decoded=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
      expect(decoded.info).toMatchObject({width:128,height:128,channels:4});
      expect(decoded.data[3]).toBe(0); // Transparent corner.
      expect(decoded.data[(64*128+64)*4+3]).toBe(255);
    }
    const archive=await densityArchive(fixture);
    expect(densityHash(archive)).toBe(densityHash(await densityArchive(second)));
    const store=new LocalPalaceRepository('density-'+crypto.randomUUID());stores.push(store);
    const restored=await importPalace(new Blob([archive],{type:'application/zip'}),store);
    expect(restored.memories).toHaveLength(118);expect(await store.load(restored.id)).toEqual(restored);
    expect(new Set(restored.memories.map(memory=>memory.imageAssetId)).size).toBe(118);
    expect(restored.memories[0].imageAssetId).not.toBe(fixture.palace.memories[0].imageAssetId);
    const hashes=[];
    for(const memory of restored.memories){
      const asset=await store.asset(memory.imageAssetId!);expect(asset).toBeDefined();
      hashes.push(densityHash(new Uint8Array(await asset!.blob.arrayBuffer())));
    }
    expect(hashes).toEqual(fixture.memoryHashes);expect(new Set(hashes).size).toBe(118);
    const exported=await exportPalace(restored,store),again=await importPalace(exported,store);
    expect(again.memories).toHaveLength(118);expect(await store.list()).toHaveLength(2);
    expect(await store.db.assets.count()).toBe(238);
    for(let index=0;index<118;index++){
      const asset=await store.asset(again.memories[index].imageAssetId!);
      expect(densityHash(new Uint8Array(await asset!.blob.arrayBuffer()))).toBe(fixture.memoryHashes[index]);
    }
  },20000);
});
