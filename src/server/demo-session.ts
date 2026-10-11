import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
const cookieName = 'palace_demo';
export class SharedError extends Error { constructor(public status: number, message: string) { super(message); } }
export function config() {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY, code=process.env.DEMO_ACCESS_CODE;
  if(!url || !key || !code) throw new SharedError(503,'The shared workspace is not configured yet.');
  return {url,key,code};
}
const equal=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export function sign(value:unknown):string {
  const data=Buffer.from(JSON.stringify(value)).toString('base64url');
  return data+'.'+createHmac('sha256',config().key).update(data).digest('base64url');
}
export function verify(token:string):Record<string,unknown> {
  const [data,signature,...rest]=token.split('.');
  if(!data || !signature || rest.length || token.length>8000 || !equal(signature,createHmac('sha256',config().key).update(data).digest('base64url'))) throw new SharedError(401,'Unlock the shared demo to continue.');
  const value=JSON.parse(Buffer.from(data,'base64url').toString());
  if(!value || typeof value.exp!=='number' || value.exp<Date.now()) throw new SharedError(401,'Your demo session expired. Unlock it again.');
  return value;
}
export function sameOrigin(request:Request) {
  const expected=new URL(process.env.APP_ORIGIN ?? request.url).origin;
  if(request.headers.get('origin')!==expected || request.headers.get('sec-fetch-site')==='cross-site') throw new SharedError(403,'Use the shared workspace from this website.');
}
export function requireSession(request:Request) {
  const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1) ?? '';
  const payload=verify(token);
  if(payload.kind!=='session' || payload.code!==createHash('sha256').update(config().code).digest('hex')) throw new SharedError(401,'Unlock the shared demo to continue.');
  if(!['GET','HEAD'].includes(request.method)) sameOrigin(request);
}
export function sessionCookie(code:string,secure:boolean):string {
  if(!equal(code,config().code)) throw new SharedError(401,'That demo code is not correct.');
  const token=sign({kind:'session',exp:Date.now()+7*86400000,code:createHash('sha256').update(config().code).digest('hex')});
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure?'; Secure':''}`;
}
