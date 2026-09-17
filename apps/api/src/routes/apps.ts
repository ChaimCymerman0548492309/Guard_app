import { Router } from 'express';
import { getAppById, getAppEvents, getAppRisk, listAppsWithRisk } from '../lib/data-source.js';
import { sendError, sendSuccess } from '../lib/response.js';

export const appsRouter: Router = Router();

appsRouter.get('/', async (req, res) => {
  const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
  const data = await listAppsWithRisk(deviceId);
  sendSuccess(res, data, req.requestId);
});

appsRouter.get('/:id/events', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const events = await getAppEvents(req.params.id, limit);
  if (events === null) {
    sendError(res, 'NOT_FOUND', 'App not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, events, req.requestId);
});

appsRouter.get('/:id/risk', async (req, res) => {
  const risk = await getAppRisk(req.params.id);
  if (!risk) {
    sendError(res, 'NOT_FOUND', 'App or risk assessment not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, risk, req.requestId);
});

appsRouter.get('/:id', async (req, res) => {
  const result = await getAppById(req.params.id);

  if (!result) {
    sendError(res, 'NOT_FOUND', 'App not found', req.requestId, 404);
    return;
  }

  sendSuccess(
    res,
    {
      ...result.app,
      assessment: result.assessment,
    },
    req.requestId,
  );
});
