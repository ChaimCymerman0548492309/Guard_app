import { Router } from 'express';
import { sendSuccess } from '../lib/response.js';
import { isDatabaseAvailable } from '../lib/prisma.js';
import { isSimulatorEnabled } from '../lib/runtime-mode.js';

export const healthRouter: Router = Router();

healthRouter.get('/', async (req, res) => {
  const dbConnected = await isDatabaseAvailable();
  const simulator = isSimulatorEnabled();
  const status = simulator ? 'simulator' : dbConnected ? 'ok' : 'degraded';

  sendSuccess(
    res,
    {
      status,
      version: '0.1.0',
      mode: simulator ? 'simulator' : 'real',
      database: { connected: dbConnected },
    },
    req.requestId,
  );
});
