import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {GET as sessionRoute} from '@/app/api/shared/session/route';
import {deletePalace,getAsset,listPalaces,loadPalace,prepareUpload,savePalace,finishUpload} from './shared';
import {requireSession,sessionCookie,publicSessionCookie,sign,verify} from './demo-session';
import {authorize} from './security';
import {fixturePalace} from '@/storage/fixtures';
beforeEach(()=>{vi.stubEnv('SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_SECRET_KEY','test-secret');vi.stubEnv('DEMO_ACCESS_CODE','test-code');vi.stubEnv('APP_ORIGIN','https://judges.test');vi.stubEnv('PUBLIC_DEMO','true');vi.stubEnv('SHARED_WORKSPACE','judges');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('judges entry',()=>{
  it('opens a fresh browser without a code and authorizes AI with its signed session',async()=>{
    const r=await sessionRoute(new Request('https://judges.test/api/shared/session'));
    expect(r.status).toBe(200);expect(await r.json()).toEqual({authenticated:true,publicAccess:true});
    const cookie=r.headers.get('set-cookie')!;expect(cookie).toContain('HttpOnly');expect(cookie).toContain('Secure');expect(cookie).not.toContain('test-code');
    expect(()=>authorize(new Request('https://judges.test/api/ai/image',{method:'POST',headers:{cookie,origin:'https://judges.test','content-type':'application/json'}}),{apiKey:'test-provider-key',accessCode:'test-code',appOrigin:'https://judges.test'})).not.toThrow();
  });
  it('fails closed if public mode targets the original workspace',async()=>{vi.stubEnv('SHARED_WORKSPACE','');expect((await sessionRoute(new Request('https://judges.test/api/shared/session'))).status).toBe(503);expect(()=>publicSessionCookie(true)).toThrow();});
  it('keeps private entry locked and rejects cross-site session creation',async()=>{expect((await sessionRoute(new Request('https://judges.test/api/shared/session',{headers:{'sec-fetch-site':'cross-site'}}))).status).toBe(403);vi.stubEnv('PUBLIC_DEMO','false');vi.stubEnv('SHARED_WORKSPACE','');expect((await sessionRoute(new Request('https://judges.test/api/shared/session'))).status).toBe(401);});
  it('cannot reuse judge cookies or upload tickets in the original workspace or vice versa',async()=>{
    const cookie=publicSessionCookie(true),ticket=sign({kind:'upload',exp:Date.now()+10000});
    vi.stubEnv('PUBLIC_DEMO','false');vi.stubEnv('SHARED_WORKSPACE','');
    expect(()=>requireSession(new Request('https://judges.test',{headers:{cookie}}))).toThrow('different workspace');expect(()=>verify(ticket)).toThrow('different workspace');
    const teamCookie=sessionCookie('test-code',true),teamTicket=sign({kind:'upload',exp:Date.now()+10000});
    vi.stubEnv('PUBLIC_DEMO','true');vi.stubEnv('SHARED_WORKSPACE','judges');
    expect(()=>requireSession(new Request('https://judges.test',{headers:{cookie:teamCookie}}))).toThrow('different workspace');
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(finishUpload(teamTicket)).rejects.toThrow('different workspace');expect(fetcher).not.toHaveBeenCalled();
  });
});
describe('judges data isolation',()=>{
  it('scopes listing, individual reads, writes and deletes even when given original IDs',async()=>{
    const fetcher=vi.fn().mockImplementation(async()=>Response.json([]));vi.stubGlobal('fetch',fetcher);
    await listPalaces();expect(fetcher.mock.calls[0][0]).toContain('id=like.judges-*');
    await loadPalace('original');expect(fetcher.mock.calls[1][0]).toContain('id=eq.judges-original');
    await getAsset('original-image');expect(fetcher.mock.calls[2][0]).toContain('id=eq.judges-original-image');
    fetcher.mockImplementation(async()=>Response.json([{revision:4}]));
    await savePalace({...fixturePalace(),memories:[],revision:3});
    expect(fetcher.mock.calls[3][0]).toContain('id=eq.judges-palace');expect(JSON.parse(fetcher.mock.calls[3][1].body).id).toBe('judges-palace');
    await deletePalace('original',1);expect(fetcher.mock.calls[4][0]).toContain('id=eq.judges-original');
  });
  it('checks only judge assets and creates only judge upload paths',async()=>{
    const fetcher=vi.fn().mockImplementation(async()=>Response.json([]));vi.stubGlobal('fetch',fetcher);
    await expect(savePalace(fixturePalace())).rejects.toThrow('uploading');expect(fetcher.mock.calls[0][0]).toContain('id=in.(judges-image)');
    fetcher.mockResolvedValue(Response.json({url:'/upload'}));
    await prepareUpload({id:'new-image',kind:'memory',mimeType:'image/png',width:10,height:10});expect(fetcher.mock.calls[1][0]).toContain('/demo-media/judges-new-image/');
  });
  it('keeps judges copies out of the team gallery',async()=>{vi.stubEnv('PUBLIC_DEMO','false');vi.stubEnv('SHARED_WORKSPACE','');const fetcher=vi.fn().mockResolvedValue(Response.json([]));vi.stubGlobal('fetch',fetcher);await listPalaces();expect(fetcher.mock.calls[0][0]).toContain('id=not.like.judges-*');});
});
