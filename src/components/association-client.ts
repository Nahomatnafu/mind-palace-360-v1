import type { Association } from '@/domain/model';
export function parseAssociations(value: unknown): Association[] {
  if (!value || typeof value !== 'object' || !('suggestions' in value) || !Array.isArray(value.suggestions) || value.suggestions.length !== 3) throw new Error('AI returned an incomplete set of suggestions. Retry manually.');
  const ids = new Set<string>();
  return value.suggestions.map(item => {
    if (!item || typeof item !== 'object' || ['id','title','explanation','prompt'].some(key => typeof item[key] !== 'string' || !item[key].trim())) throw new Error('AI returned an incomplete suggestion. Retry manually.');
    if (ids.has(item.id)) throw new Error('AI returned repeated suggestions. Retry manually.');
    ids.add(item.id); return { id: item.id, title: item.title, explanation: item.explanation, prompt: item.prompt };
  });
}
export async function requireAIResponse(response: Response): Promise<Response> {
  if (response.ok) return response;
  let message = 'AI could not complete this request. Retry manually or upload an image.';
  try { const body: unknown = await response.json(); if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' && body.error.length <= 600) message = body.error; } catch { /* Non-JSON proxy errors retain the useful default. */ }
  throw new Error(message);
}
