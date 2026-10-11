import type { Asset } from '@/domain/model';

export type ImageKind = Asset['kind'];
export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';
export interface ImageHeader { mimeType: ImageMime; width: number; height: number }
export const IMAGE_LIMITS = {
  panorama: { bytes: 32 * 1024 * 1024, pixels: 80_000_000, edge: 16384, outputEdge: 16384 },
  memory: { bytes: 12 * 1024 * 1024, pixels: 25 * 1024 * 1024, edge: 16384, outputEdge: 768 },
} as const;

const invalid = () => new Error('This file is not a supported JPEG, PNG, or WebP image.');
const ascii = (bytes: Uint8Array, start: number, text: string) =>
  [...text].every((char, index) => bytes[start + index] === char.charCodeAt(0));

/** Read encoded dimensions before asking the browser to allocate decoded pixels. */
export function readImageHeader(bytes: Uint8Array): ImageHeader {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) {
    if (data.getUint32(8) !== 13 || !ascii(bytes,12,'IHDR')) throw invalid();
    return { mimeType: 'image/png', width: data.getUint32(16), height: data.getUint32(20) };
  }
  if (bytes.length >= 12 && ascii(bytes,0,'RIFF') && ascii(bytes,8,'WEBP')) {
    // Scan RIFF chunks so optional metadata does not conceal the dimension chunk.
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const size = data.getUint32(offset + 4,true);
      const start = offset + 8;
      if (size > bytes.length - start) throw invalid();
      if (ascii(bytes,offset,'VP8X') && size >= 10) {
        const little24 = (i: number) => bytes[i] | bytes[i+1]<<8 | bytes[i+2]<<16;
        return { mimeType:'image/webp', width: little24(start+4)+1, height:little24(start+7)+1 };
      }
      if (ascii(bytes,offset,'VP8 ') && size >= 10 && bytes[start+3]===157 && bytes[start+4]===1 && bytes[start+5]===42) {
        return { mimeType:'image/webp', width:data.getUint16(start+6,true)&0x3fff, height:data.getUint16(start+8,true)&0x3fff };
      }
      if (ascii(bytes,offset,'VP8L') && size >= 5 && bytes[start]===47) {
        const packed = data.getUint32(start+1,true);
        return { mimeType:'image/webp', width:(packed&0x3fff)+1, height:((packed>>>14)&0x3fff)+1 };
      }
      offset = start + size + (size % 2);
    }
    throw invalid();
  }
  if (bytes.length >= 4 && bytes[0]===255 && bytes[1]===216) {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 255) throw invalid();
      while (bytes[offset]===255) offset++;
      const marker = bytes[offset++];
      if (marker===217 || marker===218) break;
      if (marker===1 || (marker>=208 && marker<=215)) continue;
      if (offset+2>bytes.length) throw invalid();
      const size = data.getUint16(offset);
      if (size<2 || offset+size>bytes.length) throw invalid();
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (size<8) throw invalid();
        return { mimeType:'image/jpeg', width:data.getUint16(offset+5), height:data.getUint16(offset+3) };
      }
      offset += size;
    }
  }
  throw invalid();
}

export function validateImage(header: ImageHeader, kind: ImageKind, bytes: number, declaredType: string): void {
  const limits = IMAGE_LIMITS[kind];
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > limits.bytes) {
    throw new Error('Image is too large. Limit: ' + limits.bytes / 1024 / 1024 + ' MB.');
  }
  const declared = declaredType.toLowerCase().trim();
  if (declared && declared !== header.mimeType && !(declared==='image/jpg' && header.mimeType==='image/jpeg')) {
    throw new Error('The file content does not match its declared image type.');
  }
  const {width,height} = header;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width<1 || height<1 ||
      width>limits.edge || height>limits.edge || width*height>limits.pixels) {
    throw new Error('Image dimensions exceed the supported limit.');
  }
  if (kind==='panorama') {
    if (header.mimeType!=='image/jpeg') throw new Error('Import a JPEG equirectangular panorama.');
    if (Math.abs(width/height-2)>0.02) throw new Error('Panorama must be equirectangular, approximately twice as wide as tall (2:1).');
  }
}

export function derivativeSize(width: number,height: number,maxEdge: number): {width:number;height:number} {
  const ratio = Math.min(1,maxEdge/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}

async function decode(blob: Blob): Promise<{image:CanvasImageSource;width:number;height:number;close:()=>void}> {
  if (typeof createImageBitmap==='function') {
    const bitmap = await createImageBitmap(blob);
    return {image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    return {image,width:image.naturalWidth,height:image.naturalHeight,close:()=>{ image.src=''; URL.revokeObjectURL(url); }};
  } catch (error) {
    image.src='';
    URL.revokeObjectURL(url);
    throw error;
  }
}

export async function importImage(file: File, kind: ImageKind): Promise<Asset> {
  const limits = IMAGE_LIMITS[kind];
  if (file.size===0 || file.size>limits.bytes) throw new Error('Choose an image no larger than '+limits.bytes/1024/1024+' MB.');
  // Full encoded bytes are bounded above; this also permits JPEG metadata before SOF.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = readImageHeader(bytes);
  validateImage(header,kind,file.size,file.type);
  let decoded: Awaited<ReturnType<typeof decode>>;
  try { decoded = await decode(new Blob([bytes],{type:header.mimeType})); }
  catch { throw new Error('The browser could not decode this image. Try exporting it again as JPEG, PNG, or WebP.'); }
  let canvas: HTMLCanvasElement | undefined;
  try {
    validateImage({...header,width:decoded.width,height:decoded.height},kind,file.size,header.mimeType);
    if (decoded.width*decoded.height !== header.width*header.height) throw new Error('Decoded image dimensions do not match the image header.');
    // Preserve the validated panorama bytes: canvas JPEG encoding is lossy, even at the same size.
    // The viewer may limit its GPU texture to the device capability; the stored original remains intact.
    if (kind === 'panorama') {
      if (decoded.width !== header.width || decoded.height !== header.height) throw new Error('Export this panorama with its orientation applied before importing.');
      return {id:crypto.randomUUID(),blob:new Blob([bytes],{type:header.mimeType}),mimeType:header.mimeType,width:header.width,height:header.height,kind};
    }
    const size = derivativeSize(decoded.width,decoded.height,limits.outputEdge);
    canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    context.drawImage(decoded.image,0,0,size.width,size.height);
    // Lossless PNG retains transparent pixels in the compact memory image.
    const mimeType = 'image/png';
    const blob = await new Promise<Blob>((resolve,reject)=>{
      canvas!.toBlob(result=>result ? resolve(result) : reject(new Error('Could not create the image preview.')),mimeType,0.86);
    });
    if (blob.type!==mimeType || !blob.size) throw new Error('This browser could not create the requested image format.');
    return {id:crypto.randomUUID(),blob,mimeType,width:size.width,height:size.height,kind};
  } finally {
    decoded.close();
    if (canvas) {canvas.width=0;canvas.height=0;}
  }
}
