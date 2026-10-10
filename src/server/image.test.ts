import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { createImageHandler } from './image-handler';
import { AILimiter } from './security';
const config = () => ({ apiKey: 'not-a-real-key', accessCode: 'demo-test' });
const request = (body: unknown={prompt:'A gold bracelet'}) => new Request('https://demo.test/api/ai/image',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://demo.test','x-demo-code':'demo-test'},body:JSON.stringify(body)});
const capabilities = { id:'openai/gpt-image-2.5-flare',endpoints:[{provider_tag:'openai',supported_parameters:{aspect_ratio:{values:['1:1']},quality:{values:['low']},background:{values:['transparent']}}}]};
describe('protected image generation',()=>{
  it('uses verified Image API, generates once and normalizes alpha PNG to 768px',async()=>{
    const png=await sharp({create:{width:1000,height:900,channels:4,background:{r:100,g:20,b:10,alpha:0.5}}}).png().toBuffer();
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json(capabilities)).mockResolvedValueOnce(Response.json({data:[{b64_json:png.toString('base64'),media_type:'image/png'}]}));
    const result=await createImageHandler({config,fetcher})(request());expect(result.status).toBe(200);expect(result.headers.get('Content-Type')).toBe('image/png');
    const metadata=await sharp(Buffer.from(await result.arrayBuffer())).metadata();expect(metadata.width).toBe(768);expect(metadata.hasAlpha).toBe(true);
    expect(fetcher.mock.calls[1][0]).toBe('https://openrouter.ai/api/v1/images');const payload=JSON.parse(fetcher.mock.calls[1][1].body);expect(payload.model).toBe('openai/gpt-image-2.5-flare');expect(payload.n).toBe(1);expect(payload.background).toBe('transparent');expect(payload.provider.allow_fallbacks).toBe(false);
  });
  it('unavailable model never submits a paid generation',async()=>{const fetcher=vi.fn().mockResolvedValue(new Response('',{status:404}));const result=await createImageHandler({config,fetcher})(request());expect(result.status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(1);expect((await result.json()).code).toBe('MODEL_UNAVAILABLE');});
  it('empty endpoint list is unavailable, not a model fallback',async()=>{const fetcher=vi.fn().mockResolvedValue(Response.json({id:capabilities.id,endpoints:[]}));expect((await createImageHandler({config,fetcher})(request())).status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(1);});
  it.each([{media_type:'image/svg+xml',b64_json:Buffer.from('<svg></svg>').toString('base64')},{media_type:'image/png',b64_json:'???'},{media_type:'image/png',b64_json:Buffer.from('not an image').toString('base64')}])('rejects invalid/vector output',async image=>{const fetcher=vi.fn().mockResolvedValueOnce(Response.json(capabilities)).mockResolvedValueOnce(Response.json({data:[image]}));expect((await createImageHandler({config,fetcher})(request())).status).toBe(502);});
  it('does not retry a failed paid call',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(Response.json(capabilities)).mockResolvedValueOnce(new Response('sensitive error',{status:500}));const result=await createImageHandler({config,fetcher})(request());expect(result.status).toBe(502);expect(fetcher).toHaveBeenCalledTimes(2);expect(await result.text()).not.toContain('sensitive');});
  it('validates prompt before discovery',async()=>{const fetcher=vi.fn();expect((await createImageHandler({config,fetcher})(request({prompt:''}))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();});
  it('rejects repeated request without another provider call',async()=>{const fetcher=vi.fn().mockResolvedValue(new Response('',{status:404}));const handler=createImageHandler({config,fetcher,limiter:new AILimiter()});await handler(request());expect((await handler(request())).status).toBe(409);expect(fetcher).toHaveBeenCalledTimes(1);});
  it('returns timeout without retry',async()=>{const fetcher=vi.fn().mockRejectedValue(new DOMException('timeout','TimeoutError'));expect((await createImageHandler({config,fetcher})(request())).status).toBe(504);expect(fetcher).toHaveBeenCalledTimes(1);});
});
