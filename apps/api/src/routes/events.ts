import { Router } from 'express';
import { sendSuccess } from '../lib/response.js';
import { ingestEventBatch } from '../lib/data-source.js';
import { accessContext } from '../lib/request-context.js';
import { deviceRateLimiter } from '../middleware/device-rate-limit.js';
import { eventBatchSchema } from '../lib/sync-batch-schema.js';
import { listEvents } from '../lib/data-source.js';

export const eventsRouter: Router = Router();

eventsRouter.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;
  const data = await listEvents(accessContext(req), { limit, appId });
  sendSuccess(res, data, req.requestId);
});

eventsRouter.post('/batch', deviceRateLimiter, async (req, res) => {
  const parsed = eventBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    });
    return;
  }

  const result = await ingestEventBatch(parsed.data, accessContext(req));
  sendSuccess(res, result, req.requestId);
});
