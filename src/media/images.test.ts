import { afterEach, describe, expect, it, vi } from 'vitest';
import { derivativeSize, importImage, readImageHeader, validateImage } from './images';

function jpeg(width: number,height: number): Uint8Array {
  return new Uint8Array([255,216,255,224,0,4,0,0,255,192,0,11,8,height>>8,height&255,width>>8,width&255,1,1,17,0,255,217]);
}
function png(width: number,height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16,width);view.setUint32(20,height);
  return bytes;
}
function webp(chunk: string,body: number[]): Uint8Array {
  const bytes = new Uint8Array(20+body.length+(body.length%2));
  bytes.set([...('RIFF')].map(c=>c.charCodeAt(0)));
  bytes.set([...('WEBP'+chunk)].map(c=>c.charCodeAt(0)),8);
  const view = new DataView(bytes.buffer);view.setUint32(4,bytes.length-8,true);view.setUint32(16,body.length,true);
  bytes.set(body,20);
  return bytes;
}
describe('encoded image validation',()=>{
  it('recognizes JPEG dimensions after a metadata segment',()=>{
    expect(readImageHeader(jpeg(8192,4096))).toEqual({mimeType:'image/jpeg',width:8192,height:4096});
  });
  it('recognizes PNG and lossless, lossy, extended WebP headers',()=>{
    expect(readImageHeader(png(768,400))).toEqual({mimeType:'image/png',width:768,height:400});
    expect(readImageHeader(webp('VP8X',[0,0,0,0,255,1,0,255,0,0]))).toEqual({mimeType:'image/webp',width:512,height:256});
    const packed = 511 | (255<<14);
    expect(readImageHeader(webp('VP8L',[47,packed&255,(packed>>>8)&255,(packed>>>16)&255,(packed>>>24)&255]))).toEqual({mimeType:'image/webp',width:512,height:256});
    expect(readImageHeader(webp('VP8 ',[0,0,0,157,1,42,0,2,0,1]))).toEqual({mimeType:'image/webp',width:512,height:256});
  });
  it('rejects HTML/SVG disguised by filename or declared MIME and malformed/truncated headers',()=>{
    for (const source of ['<svg></svg>','<!DOCTYPE html><img src=x>','not a jpg']) {
      expect(()=>readImageHeader(new TextEncoder().encode(source))).toThrow();
    }
    expect(()=>readImageHeader(new Uint8Array([255,216,255,192,0,100]))).toThrow();
    expect(()=>readImageHeader(webp('VP8L',[47,0]))).toThrow();
    const broken = png(1,1);broken[15]=0;
    expect(()=>readImageHeader(broken)).toThrow();
  });
  it('rejects declared-type mismatches including SVG',()=>{
    const header=readImageHeader(jpeg(2000,1000));
    expect(()=>validateImage(header,'panorama',100,'image/png')).toThrow(/declared/);
    expect(()=>validateImage(header,'panorama',100,'image/svg+xml')).toThrow(/declared/);
    expect(()=>validateImage(header,'panorama',100,'')).not.toThrow();
  });
  it('accepts 11904 by 5952 camera originals without permitting unbounded textures',()=>{
    expect(()=>validateImage(readImageHeader(jpeg(11904,5952)),'panorama',15*1024*1024,'image/jpeg')).not.toThrow();
    expect(()=>validateImage(readImageHeader(jpeg(16384,8192)),'panorama',15*1024*1024,'image/jpeg')).toThrow(/dimensions/);
  });
  it('requires JPEG and approximately 2:1 panorama dimensions',()=>{
    expect(()=>validateImage(readImageHeader(png(2000,1000)),'panorama',100,'image/png')).toThrow(/JPEG/);
    expect(()=>validateImage(readImageHeader(jpeg(1920,1080)),'panorama',100,'image/jpeg')).toThrow(/2:1/);
    expect(()=>validateImage(readImageHeader(jpeg(2001,1000)),'panorama',100,'image/jpeg')).not.toThrow();
  });
  it('rejects compressed size, decoded pixel, edge, and zero dimension excess',()=>{
    const good=readImageHeader(jpeg(2000,1000));
    expect(()=>validateImage(good,'panorama',33*1024*1024,'image/jpeg')).toThrow(/large/);
    expect(()=>validateImage({...good,width:16384,height:8192},'panorama',100,'image/jpeg')).toThrow(/dimensions/);
    expect(()=>validateImage({...good,width:20000},'memory',100,'image/jpeg')).toThrow(/dimensions/);
    expect(()=>validateImage({...good,width:0},'memory',100,'image/jpeg')).toThrow(/dimensions/);
  });
});
describe('derivative sizing',()=>{
  it('caps panoramas at 4096 pixels and memories at 768 preserving aspect ratio',()=>{
    expect(derivativeSize(8192,4096,4096)).toEqual({width:4096,height:2048});
    expect(derivativeSize(2000,1000,768)).toEqual({width:768,height:384});
    expect(derivativeSize(1000,2000,768)).toEqual({width:384,height:768});
  });
  it('never enlarges small images or creates a zero dimension',()=>{
    expect(derivativeSize(40,20,768)).toEqual({width:40,height:20});
    expect(derivativeSize(16000,1,768)).toEqual({width:768,height:1});
  });
});

describe('browser import failure and resource handling (mocked browser APIs)',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  const file = (bytes: Uint8Array, type: string) => ({
    size:bytes.length,type,arrayBuffer:async()=>bytes.buffer,
  }) as File;
  it('rejects disguised content before asking a browser decoder to allocate pixels',async()=>{
    const decode=vi.fn();vi.stubGlobal('createImageBitmap',decode);
    await expect(importImage(file(new TextEncoder().encode('<svg/>'),'image/jpeg'),'memory')).rejects.toThrow();
    expect(decode).not.toHaveBeenCalled();
  });
  it('preserves a panorama byte for byte without canvas recompression or resizing',async()=>{
    const source=jpeg(8192,4096), close=vi.fn(), createElement=vi.fn();
    vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:8192,height:4096,close}));
    vi.stubGlobal('document',{createElement});
    const result=await importImage(file(source,'image/jpeg'),'panorama');
    expect(result).toMatchObject({width:8192,height:4096,mimeType:'image/jpeg'});
    expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(source);
    expect(createElement).not.toHaveBeenCalled();expect(close).toHaveBeenCalledOnce();
  });
  it('closes a decoded bitmap when its dimensions violate the header',async()=>{
    const close=vi.fn();
    vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:100,height:100,close}));
    await expect(importImage(file(jpeg(64,32),'image/jpeg'),'memory')).rejects.toThrow(/header/);
    expect(close).toHaveBeenCalledOnce();
  });
  it('creates a PNG derivative and releases bitmap/canvas resources without changing source bytes',async()=>{
    const source=jpeg(2000,1000);const before=source.slice();const close=vi.fn();const draw=vi.fn();
    vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:2000,height:1000,close}));
    const canvas={width:0,height:0,getContext:()=>({drawImage:draw}),toBlob:(callback:(blob:Blob)=>void,mime:string)=>callback(new Blob(['output'],{type:mime}))};
    vi.stubGlobal('document',{createElement:()=>canvas});
    const result=await importImage(file(source,'image/jpeg'),'memory');
    expect(result).toMatchObject({mimeType:'image/png',width:768,height:384,kind:'memory'});
    expect(source).toEqual(before);
    expect(draw).toHaveBeenCalledOnce();expect(close).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);expect(canvas.height).toBe(0);
  });
  it('cleans up when canvas encoding fails',async()=>{
    const close=vi.fn();
    vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:64,height:32,close}));
    const canvas={width:0,height:0,getContext:()=>({drawImage:vi.fn()}),toBlob:(callback:(blob:null)=>void)=>callback(null)};
    vi.stubGlobal('document',{createElement:()=>canvas});
    await expect(importImage(file(jpeg(64,32),'image/jpeg'),'memory')).rejects.toThrow(/preview/);
    expect(close).toHaveBeenCalledOnce();expect(canvas.width).toBe(0);
  });
});
