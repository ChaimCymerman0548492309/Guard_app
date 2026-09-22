import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { healthRouter } from './routes/health.js';
import { appsRouter } from './routes/apps.js';
import { dashboardRouter } from './routes/dashboard.js';
import { eventsRouter } from './routes/events.js';
import { alertsRouter } from './routes/alerts.js';
import { openapiRouter } from './routes/openapi.js';
import { domainsRouter } from './routes/domains.js';
import { devicesRouter } from './routes/devices.js';
import { authRouter } from './routes/auth.js';
import { authenticate } from './middleware/auth.js';
import { mountDashboard } from './lib/serve-dashboard.js';

export function createApp(): express.Application {
  const app = express();

  const serveDashboard = process.env.SERVE_WEB_DASHBOARD !== 'false';

  app.use(serveDashboard ? helmet({ contentSecurityPolicy: false }) : helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_MAX) || 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps: (req: express.Request) => ({ requestId: req.requestId }),
    }),
  );

  app.use('/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/openapi', openapiRouter);
  mountDashboard(app);
  app.use(authenticate(true));
  app.use('/api/v1/apps', appsRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/events', eventsRouter);
  app.use('/api/v1/alerts', alertsRouter);
  app.use('/api/v1/devices', devicesRouter);
  app.use('/api/v1/domains', domainsRouter);

  return app;
}
