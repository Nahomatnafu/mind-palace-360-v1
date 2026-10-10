import sharp from 'sharp';
import { AIError } from './security';
import { providerJSON, type FetchAI } from './openrouter';

function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AIError(502, 'The image provider returned unexpected data.', 'INVALID_PROVIDER_RESPONSE'); return value as Record<string, unknown>; }
function supports(parameters: Record<string, unknown>, key: string, value: string): boolean { const descriptor = parameters[key]; return !!descriptor && Array.isArray(record(descriptor).values) && (record(descriptor).values as unknown[]).includes(value); }
export async function generateImage(fetcher: FetchAI, apiKey: string, model: string, prompt: string, signal: AbortSignal): Promise<Buffer> {
  // Dedicated image discovery must be used: image-only models may be absent from /models.
  const capabilities = record(await providerJSON(fetcher, 'https://openrouter.ai/api/v1/images/models/' + model.split('/').map(encodeURIComponent).join('/') + '/endpoints', { headers: { Authorization: 'Bearer ' + apiKey } }, signal, 300_000));
  if (capabilities.id !== model || !Array.isArray(capabilities.endpoints) || !capabilities.endpoints.length) throw new AIError(503, 'The selected image model is unavailable. No replacement was used. Upload an image instead.', 'MODEL_UNAVAILABLE');
  const endpoint = capabilities.endpoints.map(record).find(item => item.supported_parameters && supports(record(item.supported_parameters), 'background', 'transparent'));
  if (!endpoint) throw new AIError(503, 'This model cannot currently create transparent cutouts. Upload a transparent PNG instead.', 'TRANSPARENCY_UNAVAILABLE');
  const parameters = endpoint.supported_parameters ? record(endpoint.supported_parameters) : {};
  const providerTag = typeof endpoint.provider_tag === 'string' ? endpoint.provider_tag : undefined;
  const payload = { model, prompt: prompt + '\nCreate a clean cutout of only the requested object. Fully visible, centered, large with clear padding on every edge. Genuine transparent alpha background, not white and not a drawn checkerboard. No lettering or captions. Do not add scenery, display stands, extra props, hands, wrists or people to display an object unless explicitly requested. A bracelet must be the bracelet alone, not worn on a wrist.', n: 1, provider: { allow_fallbacks: false, ...(providerTag ? { only: [providerTag] } : {}) }, ...(supports(parameters,'aspect_ratio','1:1') ? { aspect_ratio: '1:1' } : {}), ...(supports(parameters,'quality','low') ? { quality: 'low' } : {}), background: 'transparent', output_format: 'png' };
  const result = record(await providerJSON(fetcher, 'https://openrouter.ai/api/v1/images', { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, signal, 12_000_000));
  if (!Array.isArray(result.data) || result.data.length !== 1) throw new AIError(502, 'The image provider returned no single image.', 'INVALID_IMAGE');
  const image = record(result.data[0]); const encoded = image.b64_json;
  if (typeof encoded !== 'string' || !encoded.length || encoded.length > 11_000_000 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || (image.media_type !== undefined && !['image/png','image/jpeg','image/webp'].includes(String(image.media_type)))) throw new AIError(502, 'The provider returned an unsupported image. Upload a PNG, JPEG, or WebP instead.', 'INVALID_IMAGE');
  const bytes = Buffer.from(encoded,'base64');
  if (bytes.length > 8_000_000) throw new AIError(502, 'The generated image exceeds the size limit.', 'IMAGE_TOO_LARGE');
  const pngSignature = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpegSignature = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webpSignature = bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
  if (!pngSignature && !jpegSignature && !webpSignature) throw new AIError(502, 'The provider returned unsupported image bytes.', 'INVALID_IMAGE');
  try {
    const pipeline = sharp(bytes, { limitInputPixels: 16_000_000, animated: false });
    const metadata = await pipeline.metadata();
    if (!['png','jpeg','webp'].includes(metadata.format ?? '') || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) throw new Error('Unsupported raster');
    await verifyCutout(bytes);
    const png = await pipeline.rotate().resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    if (png.byteLength > 3_000_000) throw new AIError(502, 'The generated image exceeds the delivery size limit.', 'IMAGE_TOO_LARGE');
    return png;
  } catch (error) { if (error instanceof AIError) throw error; throw new AIError(502, 'The generated image could not be decoded safely.', 'INVALID_IMAGE'); }
}

/** Alpha must describe a visible subject surrounded by clear space, not just an RGBA file. */
export async function verifyCutout(bytes: Buffer): Promise<void> {
  const {data,info}=await sharp(bytes,{limitInputPixels:16_000_000}).rotate().ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let clear=0,solid=0,edgeClear=0,edges=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const alpha=data[(y*info.width+x)*info.channels+info.channels-1];
    if(alpha<=16)clear++;if(alpha>=240)solid++;
    if(x===0||y===0||x===info.width-1||y===info.height-1){edges++;if(alpha<=16)edgeClear++;}
  }
  const pixels=info.width*info.height;
  if(clear/pixels<0.05||solid/pixels<0.01||edgeClear/edges<0.8)
    throw new AIError(502,'The provider did not return a clean transparent cutout. This image was not added. Try generating again or upload a transparent PNG.','BACKGROUND_NOT_REMOVED');
}
