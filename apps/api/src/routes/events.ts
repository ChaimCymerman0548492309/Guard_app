import { Router } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../lib/response.js';
import { ingestEventBatch, listEvents } from '../lib/data-source.js';
import { accessContext } from '../lib/request-context.js';
import { deviceRateLimiter } from '../middleware/device-rate-limit.js';

export const eventsRouter: Router = Router();

eventsRouter.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;
  const data = await listEvents(accessContext(req), { limit, appId });
  sendSuccess(res, data, req.requestId);
});

const batchSchema = z.object({
  deviceId: z.string().uuid(),
  networkEvents: z.array(
    z.object({
      appPackageName: z.string().min(1),
      domain: z.string().min(1),
      bytesSent: z.number().int().nonnegative(),
      bytesReceived: z.number().int().nonnegative(),
      isNewDomain: z.boolean(),
      timestamp: z.string().datetime(),
    }),
  ),
});

eventsRouter.post('/batch', deviceRateLimiter, async (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
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
