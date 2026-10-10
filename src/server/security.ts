import { createHash, timingSafeEqual } from 'node:crypto';

export class AIError extends Error {
  constructor(public status: number, message: string, public code: string, public retryAfter?: number) { super(message); }
}
export interface AIConfig { apiKey?: string; accessCode?: string; textModel?: string; imageModel?: string; appOrigin?: string }
export function serverConfig(): AIConfig {
  return { apiKey: process.env.OPENROUTER_API_KEY, accessCode: process.env.DEMO_ACCESS_CODE, textModel: process.env.OPENROUTER_TEXT_MODEL, imageModel: process.env.OPENROUTER_IMAGE_MODEL, appOrigin: process.env.APP_ORIGIN };
}
export function authorize(request: Request, config: AIConfig) {
  if (!config.accessCode || !config.apiKey) throw new AIError(503, 'AI is not configured yet. You can still upload your own images.', 'AI_NOT_CONFIGURED');
  const supplied = request.headers.get('x-demo-code') ?? '';
  if (supplied.length > 256 || !timingSafeEqual(createHash('sha256').update(supplied).digest(), createHash('sha256').update(config.accessCode).digest())) throw new AIError(401, 'Enter the correct demo access code.', 'ACCESS_DENIED');
  const expected = new URL(config.appOrigin ?? request.url).origin;
  if (request.headers.get('origin') !== expected || request.headers.get('sec-fetch-site') === 'cross-site') throw new AIError(403, 'AI requests must come from this app.', 'ORIGIN_DENIED');
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) throw new AIError(415, 'Send a JSON request.', 'INVALID_CONTENT_TYPE');
}
export async function readLimited(response: Request | Response, limit: number): Promise<string> {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > limit) throw new AIError(response instanceof Request ? 413 : 502, 'Response or request exceeds the supported size.', 'SIZE_LIMIT');
  if (!response.body) return '';
  const reader = response.body.getReader(); let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > limit) { await reader.cancel(); throw new AIError(response instanceof Request ? 413 : 502, 'Response or request exceeds the supported size.', 'SIZE_LIMIT'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try { const value: unknown = JSON.parse(await readLimited(request, 12_000)); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value as Record<string, unknown>; }
  catch (error) { if (error instanceof AIError) throw error; throw new AIError(400, 'Enter valid input.', 'INVALID_INPUT'); }
}
export function inputString(value: unknown, label: string, max: number, optional = false): string {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new AIError(400, label + ' must contain 1–' + max + ' characters.', 'INVALID_INPUT');
  return value.trim();
}
/** All limits are per process, shared by this demo; never a global billing cap. */
export class AILimiter {
  private active = 0;
  private windows = new Map<string, { start: number; count: number }>();
  private seen = new Map<string, number>();
  constructor(private now: () => number = Date.now) {}
  acquire(kind: 'associations' | 'image', request: Request, payload: string): () => void {
    const now = this.now();
    for (const [key, expires] of this.seen) if (expires <= now) this.seen.delete(key);
    const requestId = request.headers.get('x-request-id');
    if (requestId && !/^[a-zA-Z0-9_-]{8,80}$/.test(requestId)) throw new AIError(400, 'Invalid request ID.', 'INVALID_INPUT');
    const key = kind + ':' + createHash('sha256').update(requestId ?? payload).digest('hex');
    if (this.seen.has(key)) throw new AIError(409, 'This request was already submitted. Wait before retrying, or use a new request ID for an explicit retry.', 'DUPLICATE_REQUEST', 30);
    if (this.active >= 2) throw new AIError(429, 'AI is busy. Please try again shortly.', 'AI_BUSY', 15);
    const bucket = this.windows.get(kind); const window = !bucket || now - bucket.start >= 600_000 ? { start: now, count: 0 } : bucket;
    if (window.count >= (kind === 'image' ? 3 : 12)) throw new AIError(429, 'This demo has reached its temporary AI limit. Please use an uploaded image or try later.', 'RATE_LIMITED', Math.ceil((window.start + 600_000 - now) / 1000));
    window.count++; this.windows.set(kind, window); this.active++; this.seen.set(key, Infinity);
    // Extend protection throughout long image generation and briefly afterward.
    let released = false; return () => { if (released) return; released = true; this.active--; this.seen.set(key, this.now() + 30_000); };
  }
}
export function errorResponse(error: unknown): Response {
  const known = error instanceof AIError ? error : new AIError(502, 'AI could not complete this request. You can upload an image instead.', 'AI_FAILED');
  return Response.json({ error: known.message, code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store', ...(known.retryAfter ? { 'Retry-After': String(known.retryAfter) } : {}) } });
}
