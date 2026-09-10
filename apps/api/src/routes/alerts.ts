import { Router } from 'express';
import { AlertAction } from '@guardian/shared';
import { getAlertById, listAlerts, updateAlertAction } from '../lib/data-source.js';
import { sendError, sendSuccess } from '../lib/response.js';

export const alertsRouter: Router = Router();

alertsRouter.get('/', async (req, res) => {
  const acknowledged = req.query.acknowledged;
  const filter =
    acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined;
  const data = await listAlerts({ acknowledged: filter });
  sendSuccess(res, data, req.requestId);
});

alertsRouter.get('/:id', async (req, res) => {
  const alert = await getAlertById(req.params.id);
  if (!alert) {
    sendError(res, 'NOT_FOUND', 'Alert not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, alert, req.requestId);
});

alertsRouter.post('/:id/block', async (req, res) => {
  const result = await updateAlertAction(req.params.id, AlertAction.BLOCK);
  if (!result) {
    sendError(res, 'NOT_FOUND', 'Alert not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, result, req.requestId);
});

alertsRouter.post('/:id/allow', async (req, res) => {
  const result = await updateAlertAction(req.params.id, AlertAction.ALLOW);
  if (!result) {
    sendError(res, 'NOT_FOUND', 'Alert not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, result, req.requestId);
});

alertsRouter.post('/:id/ignore', async (req, res) => {
  const result = await updateAlertAction(req.params.id, AlertAction.IGNORE);
  if (!result) {
    sendError(res, 'NOT_FOUND', 'Alert not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, result, req.requestId);
});
