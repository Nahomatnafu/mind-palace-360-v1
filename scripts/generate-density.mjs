import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createDensityFixture,densityArchive,densityHash} from '../src/testing/density-fixture.ts';

const panorama=await readFile(new URL('../public/demo/studio.jpg',import.meta.url));
const fixture=await createDensityFixture(panorama);
const archive=await densityArchive(fixture);
const directory=new URL('../.preview-runtime/',import.meta.url);
await mkdir(directory,{recursive:true});
const target=new URL('density-118.zip',directory);
await writeFile(target,archive);
console.log(JSON.stringify({
  path:fileURLToPath(target),archiveBytes:archive.byteLength,sha256:densityHash(archive),
  memoryCount:fixture.palace.memories.length,distinctMemoryHashes:new Set(fixture.memoryHashes).size,
  panoramaBytes:fixture.assets[0].blob.size,memoryBytes:fixture.assets.slice(1).reduce((sum,asset)=>sum+asset.blob.size,0),
  assetCount:fixture.assets.length,
},null,2));
