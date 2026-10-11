import type { Asset } from '@/domain/model';
import { body, finishUpload, json, prepareUpload, requireSession, sharedError, signedAsset } from '@/server/shared';
export const maxDuration=120;
export async function GET(request:Request){try{requireSession(request);return json(await signedAsset(new URL(request.url).searchParams.get('id')??''));}catch(error){return sharedError(error);}}
export async function POST(request:Request){try{requireSession(request);const input=await body(request);return json(input.ticket?await finishUpload(String(input.ticket)):await prepareUpload(input as unknown as Omit<Asset,'blob'>));}catch(error){return sharedError(error);}}
