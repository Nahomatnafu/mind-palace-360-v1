import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalPalaceRepository } from './repository';
const stores:LocalPalaceRepository[]=[];
import { fixtureAsset, fixturePalace } from './fixtures';
function store(){const result=new LocalPalaceRepository('test-'+crypto.randomUUID());stores.push(result);return result;}
afterEach(async()=>{for(const s of stores.splice(0)) await s.db.delete();});
describe('transactional palace repository',()=>{
  it('saves and loads Blob bytes and lists newest titles',async()=>{const s=store(),p=fixturePalace(),a=fixtureAsset();await s.save(p,[a]);expect(await s.load(p.id)).toEqual(p);expect(await s.list()).toEqual([{id:p.id,title:p.title,updatedAt:p.updatedAt}]);expect(await (await s.asset(a.id))!.blob.arrayBuffer()).toEqual(await a.blob.arrayBuffer());});
  it('rejects missing referenced assets without saving a document',async()=>{const s=store();await expect(s.save(fixturePalace())).rejects.toThrow('missing');expect(await s.list()).toEqual([]);});
  it('rolls back assets if document writing fails after an asset put',async()=>{const s=store();s.db.palaces.hook('creating',()=>{throw new Error('QuotaExceededError test');});await expect(s.save(fixturePalace(),[fixtureAsset()])).rejects.toThrow('QuotaExceededError');expect(await s.asset('image')).toBeUndefined();expect(await s.list()).toEqual([]);});
  it('preserves existing document on a rejected edit',async()=>{const s=store(),p=fixturePalace();await s.save(p,[fixtureAsset()]);await expect(s.save({...p,title:'Changed',memories:[{...p.memories[0],imageAssetId:'missing'}]})).rejects.toThrow('missing');expect((await s.load(p.id))!.title).toBe('Test palace');});
  it('keeps assets shared across palaces and removes them after the last reference',async()=>{const s=store(),p=fixturePalace();await s.save(p,[fixtureAsset()]);await s.save(fixturePalace('second'));await s.remove(p.id);expect(await s.asset('image')).toBeDefined();await s.remove('second');expect(await s.asset('image')).toBeUndefined();});
  it('cleans old assets on a rewrite but never unrelated assets',async()=>{const s=store(),p=fixturePalace();await s.save(p,[fixtureAsset()]);await s.db.assets.put(fixtureAsset('unrelated'));await s.save({...p,memories:[]});expect(await s.asset('image')).toBeUndefined();expect(await s.asset('unrelated')).toBeDefined();});
  it('rejects SVG disguised as PNG and mismatched dimensions',async()=>{const s=store(),a=fixtureAsset();await expect(s.save(fixturePalace(),[{...a,blob:new Blob(['<svg/>'],{type:'image/png'})}])).rejects.toThrow('supported');await expect(s.save(fixturePalace(),[{...a,width:2}])).rejects.toThrow('metadata');});
  it('does not silently replace immutable asset IDs',async()=>{const s=store();await s.save(fixturePalace(),[fixtureAsset()]);await expect(s.save(fixturePalace(),[fixtureAsset()])).rejects.toThrow('already exists');});
});
