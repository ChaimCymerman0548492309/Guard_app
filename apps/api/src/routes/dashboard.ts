import { Router } from 'express';
import { getDashboardSummary } from '../lib/data-source.js';
import { sendSuccess } from '../lib/response.js';

export const dashboardRouter: Router = Router();

dashboardRouter.get('/summary', async (req, res) => {
  const summary = await getDashboardSummary();
  sendSuccess(res, summary, req.requestId);
});
