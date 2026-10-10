import { associations, DEFAULT_TEXT_MODEL, type FetchAI } from './openrouter';
import { AIError, AILimiter, authorize, errorResponse, inputString, readBody, serverConfig, type AIConfig } from './security';

interface Dependencies { fetcher?: FetchAI; config?: () => AIConfig; limiter?: AILimiter }
export function createAssociationHandler(deps: Dependencies = {}) {
  const limiter = deps.limiter ?? new AILimiter();
  return async function POST(request: Request): Promise<Response> {
    let release: (() => void) | undefined;
    try {
      const config = (deps.config ?? serverConfig)(); authorize(request, config);
      const body = await readBody(request); const concept = inputString(body.concept, 'Concept', 200); const context = inputString(body.context, 'Context', 1500, true);
      release = limiter.acquire('associations', request, JSON.stringify({ concept, context }));
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(35_000)]);
      const suggestions = await associations(deps.fetcher ?? fetch, config.apiKey!, config.textModel ?? DEFAULT_TEXT_MODEL, concept, context, signal);
      return Response.json({ suggestions }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return errorResponse(new AIError(504, 'AI request timed out or was cancelled. Retry manually if needed.', 'AI_TIMEOUT'));
      return errorResponse(error);
    } finally { release?.(); }
  };
}
export const sharedLimiter = new AILimiter();
