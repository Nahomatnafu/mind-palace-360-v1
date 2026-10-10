/** Node-only deterministic fixtures. Never import this module into the application. */
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { strToU8, zipSync } from 'fflate';
import type { Asset, Palace } from '../domain/model';

const digits:Record<string,string[]> = {
  '0':['111','101','101','101','111'], '1':['010','110','010','010','111'],
  '2':['111','001','111','100','111'], '3':['111','001','111','001','111'],
  '4':['101','101','111','001','001'], '5':['111','100','111','001','111'],
  '6':['111','100','111','101','111'], '7':['111','001','010','010','010'],
  '8':['111','101','111','101','111'], '9':['111','101','111','001','111'],
};
export const densityHash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export interface DensityFixture {palace:Palace;assets:Asset[];memoryHashes:string[]}

/** Draw pixels directly so no external fonts, SVG parser, or image API is needed. */
async function numberedPng(number:number):Promise<Uint8Array<ArrayBuffer>> {
  const width=128, pixels=Buffer.alloc(width*width*4);
  const hue=(number*137.508)%360;
  const channel=(offset:number)=>{
    const k=(offset+hue/30)%12;
    return Math.round((.50-.32*Math.max(-1,Math.min(k-3,9-k,1)))*255);
  };
  const color=[channel(0),channel(8),channel(4)];
  const put=(x:number,y:number,rgba:number[])=>{
    if(x<0||x>=width||y<0||y>=width)return;
    const offset=(y*width+x)*4;
    for(let c=0;c<4;c++)pixels[offset+c]=rgba[c];
  };
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const distance=Math.hypot(x-63.5,y-63.5);
    if(distance<59)put(x,y,[...color,255]);
    if(distance>=54&&distance<59)put(x,y,[255,255,255,255]);
  }
  // A deterministic tiny emblem adds visual variety independent of the label.
  const emblem=number%4;
  for(let y=18;y<30;y++)for(let x=58;x<70;x++){
    const dx=x-64,dy=y-24;
    if((emblem===0&&dx*dx+dy*dy<28) || (emblem===1&&Math.abs(dx)+Math.abs(dy)<7) ||
       (emblem===2&&y>=24+Math.abs(dx)-5) || (emblem===3&&(Math.abs(dx)<2||Math.abs(dy)<2))) {
      put(x,y,[255,255,255,255]);
    }
  }
  const text=String(number),scale=8,total=(text.length*4-1)*scale,start=Math.floor((128-total)/2);
  for(let digit=0;digit<text.length;digit++)for(let row=0;row<5;row++)for(let col=0;col<3;col++){
    if(digits[text[digit]][row][col]!=='1')continue;
    for(let y=0;y<scale;y++)for(let x=0;x<scale;x++){
      put(start+digit*4*scale+col*scale+x,44+row*scale+y,[255,255,255,255]);
    }
  }
  return new Uint8Array(await sharp(pixels,{raw:{width:128,height:128,channels:4}}).png({compressionLevel:9}).toBuffer());
}

export async function createDensityFixture(panorama:Uint8Array):Promise<DensityFixture> {
  const metadata=await sharp(panorama).metadata();
  if(metadata.format!=='jpeg' || !metadata.width || !metadata.height || metadata.width/metadata.height!==2) {
    throw new Error('Density fixture requires the approved 2:1 JPEG studio panorama.');
  }
  const palace:Palace={
    schemaVersion:1,id:'density-palace-118',title:'Technical density test · 118 distinct images',
    startRoomId:'density-room',updatedAt:'2026-10-10T00:00:00.000Z',
    rooms:[{id:'density-room',title:'Studio · density test',panoramaAssetId:'density-studio',initialView:{yaw:0,pitch:0,zoom:40}}],
    memories:[],links:[],
  };
  const assets:Asset[]=[{
    id:'density-studio',blob:new Blob([panorama.slice().buffer],{type:'image/jpeg'}),
    mimeType:'image/jpeg',width:metadata.width,height:metadata.height,kind:'panorama',
  }];
  const memoryHashes:string[]=[];
  for(let number=1;number<=118;number++){
    const suffix=String(number).padStart(3,'0'),bytes=await numberedPng(number),index=number-1;
    const assetId='density-image-'+suffix;
    assets.push({id:assetId,blob:new Blob([bytes],{type:'image/png'}),mimeType:'image/png',width:128,height:128,kind:'memory'});
    memoryHashes.push(densityHash(bytes));
    palace.memories.push({
      id:'density-memory-'+suffix,roomId:'density-room',title:'Fixture '+suffix,
      note:'Technical test image '+number+' of 118. This numbered procedural asset checks rendering, selection and persistence; it is not a learned association.',
      imageAssetId:assetId,yaw:-171+(index%20)*18,pitch:50-Math.floor(index/20)*20,
      size:28+(index%3)*4,provenance:'demo',
    });
  }
  return {palace,assets,memoryHashes};
}

/** Exact v1 backup contract; the real importer validates this in the tests. */
export async function densityArchive(fixture:DensityFixture):Promise<Uint8Array<ArrayBuffer>> {
  const entries:Record<string,Uint8Array>={};
  const manifest={format:'mind-palace-360',version:1,palace:fixture.palace,assets:[] as Array<{
    id:string;path:string;mimeType:string;width:number;height:number;kind:Asset['kind'];sha256:string;
  }>};
  for(const asset of fixture.assets){
    const bytes=new Uint8Array(await asset.blob.arrayBuffer()),path='assets/'+asset.id+(asset.kind==='panorama'?'.jpg':'.png');
    entries[path]=bytes;
    manifest.assets.push({id:asset.id,path,mimeType:asset.mimeType,width:asset.width,height:asset.height,kind:asset.kind,sha256:densityHash(bytes)});
  }
  entries['manifest.json']=strToU8(JSON.stringify(manifest));
  // Fixed DOS timestamp makes the archive bytes deterministic too.
  return new Uint8Array(zipSync(entries,{level:0,mtime:new Date('2020-01-01T00:00:00.000Z')}));
}
