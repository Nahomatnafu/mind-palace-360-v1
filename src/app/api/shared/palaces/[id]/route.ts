import { body, deletePalace, json, loadPalace, requireSession, sharedError } from '@/server/shared';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){try{requireSession(request);return json(await loadPalace((await context.params).id));}catch(error){return sharedError(error);}}
export async function DELETE(request:Request,context:Context){try{requireSession(request);await deletePalace((await context.params).id,(await body(request)).revision);return json({deleted:true});}catch(error){return sharedError(error);}}
