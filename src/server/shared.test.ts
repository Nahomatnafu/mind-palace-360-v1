import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {deletePalace,loadPalace,prepareUpload,requireSession,savePalace,sessionCookie,sharedError} from './shared';
import {fixturePalace} from '@/storage/fixtures';
import {GET as listRoute} from '@/app/api/shared/palaces/route';
import {authorize} from './security';
beforeEach(()=>{vi.stubEnv('SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_SECRET_KEY','test-only-secret');vi.stubEnv('DEMO_ACCESS_CODE','test-demo-code');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('shared workspace security',()=>{
  it('rejects anonymous reads before accessing the database',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect((await listRoute(new Request('https://demo.test/api/shared/palaces'))).status).toBe(401);expect(fetcher).not.toHaveBeenCalled();});
  it('uses signed HTTP-only secure sessions and rejects wrong codes, tampering and cross-site writes',()=>{
    expect(()=>sessionCookie('wrong',true)).toThrow('not correct');const cookie=sessionCookie('test-demo-code',true);expect(cookie).toContain('HttpOnly');expect(cookie).toContain('Secure');expect(cookie).not.toContain('test-demo-code');
    expect(()=>requireSession(new Request('https://demo.test/api/shared/palaces',{headers:{cookie}}))).not.toThrow();
    expect(()=>requireSession(new Request('https://demo.test/api/shared/palaces',{headers:{cookie:cookie.replace('palace_demo=','palace_demo=X')}}))).toThrow();
    expect(()=>requireSession(new Request('https://demo.test/api/shared/palaces',{method:'POST',headers:{cookie,origin:'https://evil.test'}}))).toThrow('website');
    expect(()=>requireSession(new Request('https://demo.test/api/shared/palaces',{method:'POST',headers:{cookie,origin:'https://demo.test'}}))).not.toThrow();
    vi.stubEnv('DEMO_ACCESS_CODE','rotated');expect(()=>requireSession(new Request('https://demo.test',{headers:{cookie}}))).toThrow();
  });
  it('rejects expired sessions',()=>{vi.useFakeTimers();const cookie=sessionCookie('test-demo-code',true);vi.advanceTimersByTime(8*86400000);expect(()=>requireSession(new Request('https://demo.test',{headers:{cookie}}))).toThrow('expired');vi.useRealTimers();});
  it('uses an explicit server-configured origin and never trusts a forged Host',()=>{
    vi.stubEnv('APP_ORIGIN','https://demo.test');const cookie=sessionCookie('test-demo-code',true);
    expect(()=>requireSession(new Request('http://internal:3000',{method:'POST',headers:{cookie,origin:'https://demo.test'}}))).not.toThrow();
    expect(()=>requireSession(new Request('http://internal:3000',{method:'POST',headers:{cookie,origin:'https://evil.test',host:'evil.test'}}))).toThrow('website');
  });
  it('unlocks AI through the same session without sharing a provider key or entering a second code',()=>{
    const cookie=sessionCookie('test-demo-code',true);
    const request=new Request('https://demo.test/api/ai/image',{method:'POST',headers:{cookie,origin:'https://demo.test','Content-Type':'application/json'}});
    expect(()=>authorize(request,{apiKey:'server-only-provider-key',accessCode:'test-demo-code'})).not.toThrow();
    expect(()=>authorize(new Request('https://demo.test/api/ai/image',{method:'POST',headers:{origin:'https://demo.test','Content-Type':'application/json'}}),{apiKey:'server-only-provider-key',accessCode:'test-demo-code'})).toThrow('code');
  });
  it('does not leak server credentials or provider errors',async()=>{const r=sharedError(new Error('test-only-secret'));expect(await r.text()).not.toContain('test-only-secret');expect(r.status).toBe(503);});
  it('rejects path traversal and non-raster upload metadata',async()=>{await expect(loadPalace('../secret')).rejects.toThrow('ID');await expect(prepareUpload({id:'x',mimeType:'image/svg+xml',width:100,height:100,kind:'memory'})).rejects.toThrow('metadata');});
});
describe('atomic shared palace revisions',()=>{
  const palace=()=>({...fixturePalace(),memories:[],revision:3});
  it('rejects stale updates instead of overwriting a teammate',async()=>{const fetcher=vi.fn().mockImplementation(async()=>Response.json([]));vi.stubGlobal('fetch',fetcher);await expect(savePalace(palace())).rejects.toMatchObject({status:409});expect(fetcher.mock.calls[0][0]).toContain('revision=eq.3&deleted=eq.false');expect(fetcher.mock.calls[0][1].method).toBe('PATCH');});
  it('commits a new revision only when the expected revision matches',async()=>{const fetcher=vi.fn().mockResolvedValue(Response.json([{revision:4}]));vi.stubGlobal('fetch',fetcher);expect(await savePalace(palace())).toEqual({revision:4});const sent=JSON.parse(fetcher.mock.calls[0][1].body);expect(sent.revision).toBe(4);expect(sent.document.revision).toBeUndefined();});
  it('prevents deleted items from being resurrected by stale clients',async()=>{vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>Response.json([])));await expect(savePalace(palace())).rejects.toMatchObject({status:409});await expect(deletePalace('palace',3)).rejects.toMatchObject({status:409});});
  it('rejects a second create of the same ID',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:409})));await expect(savePalace({...palace(),revision:undefined})).rejects.toMatchObject({status:409});});
  it('does not save documents with missing or wrong-kind assets',async()=>{const fetcher=vi.fn().mockImplementation(async()=>Response.json([]));vi.stubGlobal('fetch',fetcher);await expect(savePalace(fixturePalace())).rejects.toThrow('uploading');expect(fetcher).toHaveBeenCalledTimes(1);fetcher.mockResolvedValue(Response.json([{id:'image',metadata:{kind:'panorama'}}]));await expect(savePalace(fixturePalace())).rejects.toThrow('type');});
});
