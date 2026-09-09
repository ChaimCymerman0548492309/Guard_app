import { Router } from 'express';
import { createSimulator } from '@guardian/simulator';
import { sendSuccess } from '../lib/response.js';

export const appsRouter: Router = Router();

appsRouter.get('/', (req, res) => {
  const sim = createSimulator();
  const { apps, assessments } = sim.run();

  const data = apps.map((app) => {
    const assessment = assessments.find((a) => a.appId === app.id);
    return {
      ...app,
      riskLevel: assessment?.level ?? 'SAFE',
      riskScore: assessment?.score ?? 0,
    };
  });

  sendSuccess(res, data, req.requestId);
});

appsRouter.get('/:id', (req, res) => {
  const sim = createSimulator();
  const { apps, assessments } = sim.run();
  const app = apps.find((a) => a.id === req.params.id);

  if (!app) {
    res
      .status(404)
      .json({ success: false, error: { code: 'NOT_FOUND', message: 'App not found' } });
    return;
  }

  const assessment = assessments.find((a) => a.appId === app.id);
  sendSuccess(
    res,
    {
      ...app,
      assessment,
    },
    req.requestId,
  );
});
