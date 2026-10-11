import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { createImageHandler } from './image-handler';
import { verifyCutout } from './image';
import { AILimiter } from './security';
const config = () => ({ apiKey: 'not-a-real-key', accessCode: 'demo-test' });
const request = (body: unknown={prompt:'A gold bracelet'}) => new Request('https://demo.test/api/ai/image',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://demo.test','x-demo-code':'demo-test'},body:JSON.stringify(body)});
const capabilities = { id:'openai/gpt-image-2.5-flare',endpoints:[{provider_tag:'openai',supported_parameters:{aspect_ratio:{values:['1:1']},quality:{values:['low']},background:{values:['transparent']}}}]};
describe('protected image generation',()=>{
  it('uses verified Image API, generates once and normalizes alpha PNG to 768px',async()=>{
    const subject=await sharp({create:{width:500,height:500,channels:4,background:{r:180,g:150,b:30,alpha:1}}}).png().toBuffer();
    const png=await sharp({create:{width:1000,height:900,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:subject,gravity:'centre'}]).png().toBuffer();
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json(capabilities)).mockResolvedValueOnce(Response.json({data:[{b64_json:png.toString('base64'),media_type:'image/png'}]}));
    const result=await createImageHandler({config,fetcher})(request());expect(result.status).toBe(200);expect(result.headers.get('Content-Type')).toBe('image/png');
    const metadata=await sharp(Buffer.from(await result.arrayBuffer())).metadata();expect(metadata.width).toBe(768);expect(metadata.hasAlpha).toBe(true);
    expect(fetcher.mock.calls[1][0]).toBe('https://openrouter.ai/api/v1/images');const payload=JSON.parse(fetcher.mock.calls[1][1].body);expect(payload.model).toBe('openai/gpt-image-2.5-flare');expect(payload.n).toBe(1);expect(payload.output_format).toBe('png');expect(payload.background).toBe('transparent');expect(payload.provider.allow_fallbacks).toBe(false);
  });
  it('requires transparent support before making a paid request',async()=>{
    const fetcher=vi.fn().mockResolvedValue(Response.json({id:capabilities.id,endpoints:[{supported_parameters:{}}]}));
    const result=await createImageHandler({config,fetcher})(request());
    expect(result.status).toBe(503);expect((await result.json()).code).toBe('TRANSPARENCY_UNAVAILABLE');expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([0,0.5,1])('rejects blank, globally translucent and opaque PNGs (alpha %s)',async alpha=>{
    const bytes=await sharp({create:{width:32,height:32,channels:4,background:{r:200,g:100,b:0,alpha}}}).png().toBuffer();
    await expect(verifyCutout(bytes)).rejects.toMatchObject({code:'BACKGROUND_NOT_REMOVED'});
  });
  it('rejects opaque JPEG rather than disguising it as a transparent PNG',async()=>{
    const bytes=await sharp({create:{width:32,height:32,channels:3,background:'#eecc00'}}).jpeg().toBuffer();
    await expect(verifyCutout(bytes)).rejects.toMatchObject({code:'BACKGROUND_NOT_REMOVED'});
  });
  it('unavailable model never submits a paid generation',async()=>{const fetcher=vi.fn().mockResolvedValue(new Response('',{status:404}));const result=await createImageHandler({config,fetcher})(request());expect(result.status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(1);expect((await result.json()).code).toBe('MODEL_UNAVAILABLE');});
  it('empty endpoint list is unavailable, not a model fallback',async()=>{const fetcher=vi.fn().mockResolvedValue(Response.json({id:capabilities.id,endpoints:[]}));expect((await createImageHandler({config,fetcher})(request())).status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(1);});
  it.each([{media_type:'image/svg+xml',b64_json:Buffer.from('<svg></svg>').toString('base64')},{media_type:'image/png',b64_json:'???'},{media_type:'image/png',b64_json:Buffer.from('not an image').toString('base64')}])('rejects invalid/vector output',async image=>{const fetcher=vi.fn().mockResolvedValueOnce(Response.json(capabilities)).mockResolvedValueOnce(Response.json({data:[image]}));expect((await createImageHandler({config,fetcher})(request())).status).toBe(502);});
  it('does not retry a failed paid call',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(Response.json(capabilities)).mockResolvedValueOnce(new Response('sensitive error',{status:500}));const result=await createImageHandler({config,fetcher})(request());expect(result.status).toBe(502);expect(fetcher).toHaveBeenCalledTimes(2);expect(await result.text()).not.toContain('sensitive');});
  it('validates prompt before discovery',async()=>{const fetcher=vi.fn();expect((await createImageHandler({config,fetcher})(request({prompt:''}))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();});
  it('rejects repeated request without another provider call',async()=>{const fetcher=vi.fn().mockResolvedValue(new Response('',{status:404}));const handler=createImageHandler({config,fetcher,limiter:new AILimiter()});await handler(request());expect((await handler(request())).status).toBe(409);expect(fetcher).toHaveBeenCalledTimes(1);});
  it('returns timeout without retry',async()=>{const fetcher=vi.fn().mockRejectedValue(new DOMException('timeout','TimeoutError'));expect((await createImageHandler({config,fetcher})(request())).status).toBe(504);expect(fetcher).toHaveBeenCalledTimes(1);});
});

it('reuses successful discovery for five minutes but never retries or caches paid generations',async()=>{
 const clock=vi.spyOn(Date,'now').mockReturnValue(1000);
 const fetcher=vi.fn().mockImplementation(async(url:string)=>url.includes('/endpoints')?Response.json(capabilities):new Response('',{status:500}));
 try {
  const handler=createImageHandler({config,fetcher});
  for(let i=0;i<2;i++)expect((await handler(request({prompt:'Object '+i}))).status).toBe(502);
  expect(fetcher.mock.calls.filter(call=>String(call[0]).includes('/endpoints'))).toHaveLength(1);
  clock.mockReturnValue(301000);await handler(request({prompt:'Object 3'}));
  expect(fetcher.mock.calls.filter(call=>String(call[0]).includes('/endpoints'))).toHaveLength(2);
  expect(fetcher.mock.calls.filter(call=>String(call[0]).endsWith('/images'))).toHaveLength(3);
 } finally {clock.mockRestore();}
});
