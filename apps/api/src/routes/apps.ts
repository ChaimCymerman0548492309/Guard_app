import { Router } from 'express';
import { getAppById, listAppsWithRisk } from '../lib/data-source.js';
import { sendSuccess } from '../lib/response.js';

export const appsRouter: Router = Router();

appsRouter.get('/', async (req, res) => {
  const data = await listAppsWithRisk();
  sendSuccess(res, data, req.requestId);
});

appsRouter.get('/:id', async (req, res) => {
  const result = await getAppById(req.params.id);

  if (!result) {
    res
      .status(404)
      .json({ success: false, error: { code: 'NOT_FOUND', message: 'App not found' } });
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
