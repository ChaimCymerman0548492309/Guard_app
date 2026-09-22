import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Application, Request, Response, NextFunction } from 'express';
import express from 'express';
import { existsSync } from 'node:fs';

function dashboardDistDir(): string | null {
  if (process.env.WEB_DASHBOARD_DIR) {
    return process.env.WEB_DASHBOARD_DIR;
  }
  const fromApiDist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../web/dist',
  );
  if (existsSync(fromApiDist)) {
    return fromApiDist;
  }
  return null;
}

/** Serve built apps/web (same origin as API — one Render URL for dashboard + API). */
export function mountDashboard(app: Application): void {
  if (process.env.SERVE_WEB_DASHBOARD === 'false') {
    return;
  }

  const distDir = dashboardDistDir();
  if (!distDir) {
    return;
  }

  app.use(
    express.static(distDir, {
      index: 'index.html',
      maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    }),
  );

  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}
