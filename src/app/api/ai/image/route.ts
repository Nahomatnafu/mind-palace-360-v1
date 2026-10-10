import { createImageHandler } from '@/server/image-handler';
import { sharedLimiter } from '@/server/handlers';
export const runtime = 'nodejs';
export const maxDuration = 180;
export const POST = createImageHandler({ limiter: sharedLimiter });
