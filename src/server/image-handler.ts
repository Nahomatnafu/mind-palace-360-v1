import { DEFAULT_IMAGE_MODEL, type FetchAI } from './openrouter';
import { generateImage } from './image';
import { AIError, AILimiter, authorize, errorResponse, inputString, readBody, serverConfig, type AIConfig } from './security';
interface Dependencies { fetcher?: FetchAI; config?: () => AIConfig; limiter?: AILimiter }
export function createImageHandler(deps: Dependencies = {}) {
  const limiter = deps.limiter ?? new AILimiter();
  return async function POST(request: Request): Promise<Response> {
    let release: (() => void) | undefined;
    try {
      const config = (deps.config ?? serverConfig)(); authorize(request, config);
      const body = await readBody(request); const prompt = inputString(body.prompt, 'Image prompt', 2500);
      release = limiter.acquire('image', request, JSON.stringify({ prompt }));
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(150_000)]);
      const bytes = await generateImage(deps.fetcher ?? fetch, config.apiKey!, config.imageModel ?? DEFAULT_IMAGE_MODEL, prompt, signal);
      if (signal.aborted) throw new AIError(504, 'Image request timed out or was cancelled. Retry manually if needed.', 'AI_TIMEOUT');
      return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch (error) {
      if (error instanceof Error && ['TimeoutError','AbortError'].includes(error.name)) return errorResponse(new AIError(504, 'Image request timed out or was cancelled. Retry manually if needed.', 'AI_TIMEOUT'));
      return errorResponse(error);
    } finally { release?.(); }
  };
}
