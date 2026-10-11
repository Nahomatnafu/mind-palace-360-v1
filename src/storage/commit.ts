import type { Asset, Palace, PalaceRepository } from '@/domain/model';
export async function persistPalace(repository:Pick<PalaceRepository,'save'|'savedMessage'>,palace:Palace,assets:Asset[],status:(value:string)=>void):Promise<void>{
 status('Saving…');
 try{await repository.save(palace,assets);status(repository.savedMessage ?? 'Saved on this device');}
 catch(error){status('Save failed');throw error;}
}
