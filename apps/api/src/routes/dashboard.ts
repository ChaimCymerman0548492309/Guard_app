import { Router } from 'express';
import { getDashboardSummary } from '../lib/data-source.js';
import { accessContext } from '../lib/request-context.js';
import { sendSuccess } from '../lib/response.js';

export const dashboardRouter: Router = Router();

dashboardRouter.get('/summary', async (req, res) => {
  const summary = await getDashboardSummary(accessContext(req));
  sendSuccess(res, summary, req.requestId);
});
