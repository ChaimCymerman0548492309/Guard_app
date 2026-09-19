import { Router } from 'express';
import { z } from 'zod';
import {
  getDeviceById,
  getDeviceSummary,
  listAppsWithRisk,
  listAlerts,
  listDevices,
  registerDevice,
  runDeviceDemoScenario,
} from '../lib/data-source.js';
import { accessContext } from '../lib/request-context.js';
import { sendError, sendSuccess } from '../lib/response.js';

export const devicesRouter: Router = Router();

devicesRouter.get('/', async (req, res) => {
  const data = await listDevices(accessContext(req));
  sendSuccess(res, data, req.requestId);
});

const registerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  platform: z.enum(['android', 'ios', 'simulator']).optional(),
});

devicesRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'VALIDATION_ERROR', parsed.error.message, req.requestId, 400);
    return;
  }

  const device = await registerDevice(parsed.data, accessContext(req));
  sendSuccess(res, device, req.requestId, 201);
});

devicesRouter.get('/:id/summary', async (req, res) => {
  const summary = await getDeviceSummary(req.params.id, accessContext(req));
  if (!summary) {
    sendError(res, 'NOT_FOUND', 'Device not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, summary, req.requestId);
});

devicesRouter.get('/:id/apps', async (req, res) => {
  const device = await getDeviceById(req.params.id, accessContext(req));
  if (!device) {
    sendError(res, 'NOT_FOUND', 'Device not found', req.requestId, 404);
    return;
  }
  const apps = await listAppsWithRisk(accessContext(req), req.params.id);
  sendSuccess(res, apps, req.requestId);
});

devicesRouter.get('/:id/alerts', async (req, res) => {
  const device = await getDeviceById(req.params.id, accessContext(req));
  if (!device) {
    sendError(res, 'NOT_FOUND', 'Device not found', req.requestId, 404);
    return;
  }

  const acknowledged =
    req.query.acknowledged === 'true'
      ? true
      : req.query.acknowledged === 'false'
        ? false
        : undefined;

  const alerts = await listAlerts(accessContext(req), {
    acknowledged,
    deviceId: req.params.id,
  });
  sendSuccess(res, alerts, req.requestId);
});

devicesRouter.post('/:id/demo', async (req, res) => {
  const result = await runDeviceDemoScenario(req.params.id, accessContext(req));
  if (!result) {
    sendError(res, 'NOT_FOUND', 'Device not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, result, req.requestId);
});

devicesRouter.get('/:id', async (req, res) => {
  const device = await getDeviceById(req.params.id, accessContext(req));
  if (!device) {
    sendError(res, 'NOT_FOUND', 'Device not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, device, req.requestId);
});
