import sharp from 'sharp';
import { AIError } from './security';
import { providerJSON, type FetchAI } from './openrouter';

function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AIError(502, 'The image provider returned unexpected data.', 'INVALID_PROVIDER_RESPONSE'); return value as Record<string, unknown>; }
function supports(parameters: Record<string, unknown>, key: string, value: string): boolean { const descriptor = parameters[key]; return !!descriptor && Array.isArray(record(descriptor).values) && (record(descriptor).values as unknown[]).includes(value); }
export async function generateImage(fetcher: FetchAI, apiKey: string, model: string, prompt: string, signal: AbortSignal): Promise<Buffer> {
  // Dedicated image discovery must be used: image-only models may be absent from /models.
  const capabilities = record(await providerJSON(fetcher, 'https://openrouter.ai/api/v1/images/models/' + model.split('/').map(encodeURIComponent).join('/') + '/endpoints', { headers: { Authorization: 'Bearer ' + apiKey } }, signal, 300_000));
  if (capabilities.id !== model || !Array.isArray(capabilities.endpoints) || !capabilities.endpoints.length) throw new AIError(503, 'The selected image model is unavailable. No replacement was used. Upload an image instead.', 'MODEL_UNAVAILABLE');
  const endpoint = record(capabilities.endpoints[0]);
  const parameters = endpoint.supported_parameters ? record(endpoint.supported_parameters) : {};
  const providerTag = typeof endpoint.provider_tag === 'string' ? endpoint.provider_tag : undefined;
  const payload = { model, prompt: prompt + '\nCreate one isolated, clearly recognizable visual memory association. No lettering or captions. Keep the subject large, with simple composition.', n: 1, provider: { allow_fallbacks: false, ...(providerTag ? { only: [providerTag] } : {}) }, ...(supports(parameters,'aspect_ratio','1:1') ? { aspect_ratio: '1:1' } : {}), ...(supports(parameters,'quality','low') ? { quality: 'low' } : {}), ...(supports(parameters,'background','transparent') ? { background: 'transparent' } : {}), ...(supports(parameters,'output_format','png') ? { output_format: 'png' } : {}) };
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
    const png = await pipeline.rotate().resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    if (png.byteLength > 3_000_000) throw new AIError(502, 'The generated image exceeds the delivery size limit.', 'IMAGE_TOO_LARGE');
    return png;
  } catch (error) { if (error instanceof AIError) throw error; throw new AIError(502, 'The generated image could not be decoded safely.', 'INVALID_IMAGE'); }
}
