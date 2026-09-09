import { Router } from 'express';
import { createSimulator } from '@guardian/simulator';
import { sendSuccess } from '../lib/response.js';

export const dashboardRouter: Router = Router();

dashboardRouter.get('/summary', (req, res) => {
  const sim = createSimulator();
  const { counts, apps, assessments } = sim.run();

  sendSuccess(
    res,
    {
      counts,
      totalApps: apps.length,
      recentAlerts: assessments
        .filter((a) => a.level !== 'SAFE')
        .map((a) => {
          const app = apps.find((ap) => ap.id === a.appId);
          return {
            appId: a.appId,
            appName: app?.displayName ?? 'Unknown',
            level: a.level,
            explanation: a.explanation,
            assessedAt: a.assessedAt,
          };
        }),
    },
    req.requestId,
  );
});
