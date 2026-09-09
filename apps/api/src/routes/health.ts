import { Router } from 'express';
import { sendSuccess } from '../lib/response.js';
import { isDatabaseAvailable } from '../lib/prisma.js';
export const healthRouter: Router = Router();
healthRouter.get('/', async (req, res) => {
  const dbConnected = await isDatabaseAvailable();
  sendSuccess(res, { status: dbConnected ? 'ok' : 'degraded', version: '0.1.0', database: { connected: dbConnected } }, req.requestId);
});
