'use client';
import {useEffect,useState} from 'react';
import {repository} from '@/storage/repository';
// Decode one original at a time; retain only small, disposable thumbnail URLs.
let queue=Promise.resolve();
export default function RoomThumbnail({assetId,src,title}:{assetId?:string;src?:string;title:string}){
 const [thumbnail,setThumbnail]=useState('');
 useEffect(()=>{
  let cancelled=false;let thumbnailUrl='';
  queue=queue.then(async()=>{
   if(cancelled||!assetId)return;
   const asset=await repository.asset(assetId);if(!asset||cancelled)return;
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
   const context=canvas.getContext('2d');if(!context)return;
   if(typeof createImageBitmap==='function'){
    const bitmap=await createImageBitmap(asset.blob,{resizeWidth:256,resizeHeight:128,resizeQuality:'medium'});
    try{if(cancelled)return;context.drawImage(bitmap,0,0,256,128);}finally{bitmap.close();}
   }else{
    const url=URL.createObjectURL(asset.blob);const image=new Image();
    try{image.src=url;await image.decode();if(cancelled)return;context.drawImage(image,0,0,256,128);}finally{image.src='';URL.revokeObjectURL(url);}
   }
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.8));canvas.width=0;canvas.height=0;
   if(blob&&!cancelled){thumbnailUrl=URL.createObjectURL(blob);setThumbnail(thumbnailUrl);}
  }).catch(()=>{/* Room labels remain usable if thumbnail decoding fails. */});
  return()=>{cancelled=true;if(thumbnailUrl)URL.revokeObjectURL(thumbnailUrl);};
 },[assetId]);
 const image=assetId?thumbnail:src;
 // These are local, bounded previews; the original panorama is stored separately.
 // eslint-disable-next-line @next/next/no-img-element
 return image?<img className="room-thumbnail" src={image} alt={title} width={112} height={56}/>:<span className="room-thumbnail placeholder" aria-hidden="true">360°</span>;
}
