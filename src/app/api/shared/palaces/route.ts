import { body, json, listPalaces, requireSession, savePalace, sharedError } from '@/server/shared';
export async function GET(request:Request){try{requireSession(request);return json(await listPalaces());}catch(error){return sharedError(error);}}
export async function POST(request:Request){try{requireSession(request);return json(await savePalace(await body(request)));}catch(error){return sharedError(error);}}
