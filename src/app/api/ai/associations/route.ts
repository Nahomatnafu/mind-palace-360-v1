import { createAssociationHandler, sharedLimiter } from '@/server/handlers';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = createAssociationHandler({ limiter: sharedLimiter });
