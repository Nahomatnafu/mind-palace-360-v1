import { validatePalace, type Asset, type Palace } from '../domain/model';
export const MAX_ASSET_BYTES = 32 * 1024 * 1024;
const idPattern = /^[A-Za-z0-9_-]{1,128}$/;
export function assetIds(palace: Palace): Set<string> { return new Set([...palace.rooms.map(r=>r.panoramaAssetId), ...palace.memories.map(m=>m.imageAssetId)].filter((id): id is string => !!id)); }
export function validateStoredPalace(value: unknown): asserts value is Palace {
  validatePalace(value);
  const p = value as Palace;
  for (const item of [p, ...p.rooms, ...p.memories, ...p.links]) if (!idPattern.test(item.id)) throw new Error('Invalid ID.');
  for (const item of [...p.rooms, ...p.memories]) {
    const id = 'panoramaAssetId' in item ? item.panoramaAssetId : 'imageAssetId' in item ? item.imageAssetId : undefined;
    if (id !== undefined && (typeof id !== 'string' || !idPattern.test(id))) throw new Error('Invalid image reference.');
    if (item.demoSrc !== undefined && (typeof item.demoSrc !== 'string' || !/^\/demo\/[A-Za-z0-9_/-]+\.(?:jpg|jpeg|png|webp)$/.test(item.demoSrc) || item.demoSrc.includes('..'))) throw new Error('Only approved demo image paths are supported.');
  }
  for (const room of p.rooms) if (room.modelSrc !== undefined && (typeof room.modelSrc !== 'string' || !/^\/models\/[A-Za-z0-9_-]+\.glb$/.test(room.modelSrc))) throw new Error('Only bundled 3D model paths are supported.');
}
export function rasterInfo(bytes: Uint8Array): { mimeType: string; width: number; height: number } {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 33 && bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71 && bytes[4]===13 && bytes[5]===10 && bytes[6]===26 && bytes[7]===10 && v.getUint32(8)===13 && v.getUint32(12)===0x49484452) return {mimeType:'image/png',width:v.getUint32(16),height:v.getUint32(20)};
  if (bytes.length>=12 && v.getUint32(0)===0x52494646 && v.getUint32(8)===0x57454250) {
    for (let at=12; at+8<=bytes.length;) {
      const tag=v.getUint32(at), length=v.getUint32(at+4,true), d=at+8;
      if (d+length>bytes.length) break;
      if (tag===0x56503858 && length>=10) return {mimeType:'image/webp',width:1+bytes[d+4]+(bytes[d+5]<<8)+(bytes[d+6]<<16),height:1+bytes[d+7]+(bytes[d+8]<<8)+(bytes[d+9]<<16)};
      if (tag===0x56503820 && length>=10 && bytes[d+3]===157 && bytes[d+4]===1 && bytes[d+5]===42) return {mimeType:'image/webp',width:v.getUint16(d+6,true)&0x3fff,height:v.getUint16(d+8,true)&0x3fff};
      if (tag===0x5650384c && length>=5 && bytes[d]===47) { const bits=v.getUint32(d+1,true); return {mimeType:'image/webp',width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1}; }
      at=d+length+(length%2);
    }
  }
  if (bytes.length>=4 && bytes[0]===255 && bytes[1]===216) {
    for (let at=2; at+3<bytes.length;) {
      if (bytes[at++]!==255) break;
      while (bytes[at]===255) at++;
      const marker=bytes[at++];
      if (marker===217 || marker===218) break;
      if (marker===1 || (marker>=208 && marker<=215)) continue;
      if (at+2>bytes.length) break;
      const length=v.getUint16(at);
      if (length<2 || at+length>bytes.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length>=8) return {mimeType:'image/jpeg',width:v.getUint16(at+5),height:v.getUint16(at+3)};
      at+=length;
    }
  }
  throw new Error('Asset is not a supported JPEG, PNG, or WebP image.');
}
export async function validateAsset(asset: Asset): Promise<void> {
  if (!asset || typeof asset.id!=='string' || !idPattern.test(asset.id) || !(asset.blob instanceof Blob) || !['panorama','memory'].includes(asset.kind)) throw new Error('Invalid image asset.');
  if (!asset.blob.size || asset.blob.size>MAX_ASSET_BYTES) throw new Error('Image exceeds the 32 MB asset limit.');
  const info=rasterInfo(new Uint8Array(await asset.blob.arrayBuffer()));
  if (info.mimeType!==asset.mimeType || asset.blob.type!==asset.mimeType || info.width!==asset.width || info.height!==asset.height || info.width<1 || info.height<1 || info.width>16384 || info.height>16384 || info.width*info.height>80_000_000) throw new Error('Image metadata does not match a supported image.');
  if (asset.kind==='panorama' && Math.abs(info.width/info.height-2)>0.02) throw new Error('Panorama images must have a 2:1 aspect ratio.');
  if (typeof createImageBitmap==='function') {
    const decoded=await createImageBitmap(asset.blob);
    try { if (decoded.width!==asset.width || decoded.height!==asset.height) throw new Error('Decoded image dimensions do not match.'); } finally { decoded.close(); }
  } else if (typeof Image==='function') {
    const url=URL.createObjectURL(asset.blob), image=new Image();
    try { image.src=url; await image.decode(); if(image.naturalWidth!==asset.width || image.naturalHeight!==asset.height) throw new Error('Decoded image dimensions do not match.'); }
    finally { image.src=''; URL.revokeObjectURL(url); }
  }
}
