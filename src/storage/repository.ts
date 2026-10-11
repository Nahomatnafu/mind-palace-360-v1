import { SharedPalaceRepository } from './shared-repository';
import Dexie, { type Table } from 'dexie';
import type { Asset, Palace, PalaceRepository, PalaceSummary } from '../domain/model';
import { assetIds, validateAsset, validateStoredPalace } from './validation';
interface StoredAsset extends Asset { contentHash?: string }
async function contentHash(blob:Blob):Promise<string> { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join(''); }
const sameMetadata=(a:Asset,b:Asset)=>a.mimeType===b.mimeType && a.width===b.width && a.height===b.height && a.kind===b.kind && a.blob.size===b.blob.size && a.blob.type===b.blob.type;
export class PalaceDatabase extends Dexie {
  palaces!: Table<Palace, string>;
  assets!: Table<StoredAsset, string>;
  constructor(name='mind-palace-360-v2') { super(name); this.version(1).stores({palaces:'id, updatedAt',assets:'id'}); }
}
export class LocalPalaceRepository implements PalaceRepository {
  readonly db: PalaceDatabase;
  constructor(name?: string) { this.db=new PalaceDatabase(name); }
  async list(): Promise<PalaceSummary[]> { return (await this.db.palaces.toArray()).map(({id,title,updatedAt})=>({id,title,updatedAt})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); }
  async load(id: string): Promise<Palace | undefined> { const p=await this.db.palaces.get(id); if(p) validateStoredPalace(p); return p; }
  async asset(id: string): Promise<Asset | undefined> { const stored=await this.db.assets.get(id); if(!stored)return undefined; const {contentHash: _hash,...asset}=stored; void _hash; return asset; }
  async save(palace: Palace, assets: Asset[]=[]): Promise<void> {
    validateStoredPalace(palace);
    const snapshot=structuredClone(palace), requested=assetIds(snapshot), supplied=new Set<string>(), prepared:StoredAsset[]=[];
    for (const asset of assets) { if (supplied.has(asset.id) || !requested.has(asset.id)) throw new Error('Duplicate or unreferenced asset.'); supplied.add(asset.id); const stable=structuredClone(asset); await validateAsset(stable); prepared.push({...stable,contentHash:await contentHash(stable.blob)}); }
    await this.db.transaction('rw',this.db.palaces,this.db.assets,async()=>{
      const old=await this.db.palaces.get(snapshot.id);
      for (const asset of prepared) {
        const existing=await this.db.assets.get(asset.id);
        // Asset IDs are immutable: replacing bytes uses a new ID.
        if(existing) {
          // Identical retries are safe; a reused ID with different bytes is rejected.
          if(!sameMetadata(existing,asset)) throw new Error('Image ID already exists; choose a new ID.');
          const existingHash=existing.contentHash ?? await Dexie.waitFor(contentHash(existing.blob));
          if(existingHash!==asset.contentHash) throw new Error('Image ID already exists; choose a new ID.');
          continue;
        }
        await this.db.assets.put(asset);
      }
      for (const room of snapshot.rooms) if(room.panoramaAssetId) { const asset=await this.db.assets.get(room.panoramaAssetId); if(!asset || asset.kind!=='panorama') throw new Error('A panorama image is missing.'); }
      for (const memory of snapshot.memories) if(memory.imageAssetId) { const asset=await this.db.assets.get(memory.imageAssetId); if(!asset || asset.kind!=='memory') throw new Error('A memory image is missing.'); }
      await this.db.palaces.put(snapshot);
      if(old) await this.removeUnreferenced(assetIds(old));
    });
  }
  private async removeUnreferenced(candidates: Set<string>): Promise<void> {
    const live=new Set((await this.db.palaces.toArray()).flatMap(p=>[...assetIds(p)]));
    for(const id of candidates) if(!live.has(id)) await this.db.assets.delete(id);
  }
  async remove(id: string): Promise<void> { await this.db.transaction('rw',this.db.palaces,this.db.assets,async()=>{ const old=await this.db.palaces.get(id); await this.db.palaces.delete(id); if(old) await this.removeUnreferenced(assetIds(old)); }); }
}
export const repository = new SharedPalaceRepository();
