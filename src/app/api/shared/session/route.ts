import { body, json, requireSession, sameOrigin, sessionCookie, sharedError } from '@/server/shared';
const attempts=new Map<string,{count:number;at:number}>();
export async function GET(request:Request){try{requireSession(request);return json({authenticated:true});}catch(error){return sharedError(error);}}
export async function POST(request:Request){try{
  sameOrigin(request);
  const key=request.headers.get('x-forwarded-for')?.split(',')[0]??'demo';const now=Date.now();
  for(const [id,value] of attempts)if(now-value.at>60000)attempts.delete(id);
  const current=attempts.get(key)??{count:0,at:now};current.count++;attempts.set(key,current);
  if(current.count>20)return Response.json({error:'Too many attempts. Please wait one minute.'},{status:429});
  const input=await body(request);const code=typeof input.code==='string'?input.code:'';
  const cookie=sessionCookie(code,new URL(process.env.APP_ORIGIN ?? request.url).protocol==='https:');
  return Response.json({authenticated:true},{headers:{'Set-Cookie':cookie,'Cache-Control':'no-store'}});
}catch(error){return sharedError(error);}}
