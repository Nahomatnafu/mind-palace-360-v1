import type { Asset, Palace, PalaceRepository, PalaceSummary } from '@/domain/model';
import { validateAsset, validateStoredPalace } from './validation';

export async function sharedRequest<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await fetch('/api/shared/'+path,{...init,cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json',...init.headers}});
  const result=await response.json();
  if(!response.ok){
    if(response.status===401 && typeof window!=='undefined')window.dispatchEvent(new Event('palace-session-expired'));
    throw new Error(result.error??'Shared saving failed. Please retry.');
  }
  return result as T;
}
/** Cloud is authoritative. Never fall back to browser-only writes on network failure. */
export class SharedPalaceRepository implements PalaceRepository {
  readonly savedMessage='Saved to shared space';
  private assets=new Map<string,Promise<Asset|undefined>>();
  private revisions=new Map<string,number>();
  async list():Promise<PalaceSummary[]>{
    const palaces=await sharedRequest<Palace[]>('palaces');
    return palaces.map(({id,title,updatedAt})=>({id,title,updatedAt}));
  }
  async load(id:string):Promise<Palace|undefined>{
    const palace=await sharedRequest<Palace|null>('palaces/'+encodeURIComponent(id));
    if(!palace)return undefined;validateStoredPalace(palace);this.revisions.set(id,palace.revision!);return palace;
  }
  async save(palace:Palace,assets:Asset[]=[]):Promise<void>{
    validateStoredPalace(palace);
    // Files go directly to private Storage, avoiding the hosting provider's request-body limit.
    for(const asset of assets){
      await validateAsset(asset);
      const {blob,...metadata}=asset;
      const upload=await sharedRequest<{url:string;ticket:string}>('assets',{method:'POST',body:JSON.stringify(metadata)});
      const response=await fetch(upload.url,{method:'PUT',headers:{'Content-Type':asset.mimeType},body:blob});
      if(!response.ok)throw new Error('Image upload failed. Your palace has not been saved. Please retry.');
      await sharedRequest('assets',{method:'POST',body:JSON.stringify({ticket:upload.ticket})});
      this.assets.set(asset.id,Promise.resolve(asset));
    }
    const result=await sharedRequest<{revision:number}>('palaces',{method:'POST',body:JSON.stringify(palace)});
    palace.revision=result.revision;this.revisions.set(palace.id,result.revision);
  }
  async remove(id:string):Promise<void>{
    const revision=this.revisions.get(id);
    if(!revision)throw new Error('Refresh the gallery before deleting this palace.');
    await sharedRequest('palaces/'+encodeURIComponent(id),{method:'DELETE',body:JSON.stringify({revision})});this.revisions.delete(id);
  }
  async asset(id:string):Promise<Asset|undefined>{
    if(this.assets.has(id))return this.assets.get(id)!;
    const pending=(async()=>{
      const {url,...metadata}=await sharedRequest<Omit<Asset,'blob'>&{url:string}>('assets?id='+encodeURIComponent(id));
      const response=await fetch(url);
      if(!response.ok)throw new Error('Unable to download a shared image. Check your connection and retry.');
      const asset={...metadata,blob:new Blob([await response.blob()],{type:metadata.mimeType})};
      await validateAsset(asset);return asset;
    })();
    this.assets.set(id,pending);
    try{return await pending;}catch(error){this.assets.delete(id);throw error;}
  }
}
