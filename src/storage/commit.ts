import type { Asset, Palace, PalaceRepository } from '@/domain/model';
export async function persistPalace(repository:Pick<PalaceRepository,'save'>,palace:Palace,assets:Asset[],status:(value:string)=>void):Promise<void>{
 status('Saving…');
 try{await repository.save(palace,assets);status('Saved on this device');}
 catch(error){status('Save failed');throw error;}
}
