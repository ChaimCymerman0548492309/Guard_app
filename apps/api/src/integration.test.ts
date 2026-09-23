import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { authHeader, loginAsAdmin } from './test/test-auth.js';

describe('Critical flow integration', () => {
  const app = createApp();
  let token = '';

  beforeAll(async () => {
    token = await loginAsAdmin(app);
  });

  it('end-to-end: dashboard → app risk → events → alert action', async () => {
    const summary = await request(app).get('/api/v1/dashboard/summary').set(authHeader(token));
    expect(summary.status).toBe(200);
    expect(summary.body.data.counts.suspicious).toBeGreaterThanOrEqual(1);

    const apps = await request(app).get('/api/v1/apps').set(authHeader(token));
    expect(apps.status).toBe(200);
    const highRisk = apps.body.data.find(
      (a: { riskLevel: string }) => a.riskLevel === 'SUSPICIOUS',
    );
    expect(highRisk).toBeDefined();

    const risk = await request(app).get(`/api/v1/apps/${highRisk.id}/risk`).set(authHeader(token));
    expect(risk.status).toBe(200);

    const events = await request(app)
      .get(`/api/v1/apps/${highRisk.id}/events`)
      .set(authHeader(token));
    expect(events.status).toBe(200);

    const alerts = await request(app)
      .get('/api/v1/alerts?acknowledged=false')
      .set(authHeader(token));
    expect(alerts.status).toBe(200);
    const alert = alerts.body.data.find((a: { appId: string }) => a.appId === highRisk.id);
    expect(alert).toBeDefined();

    const block = await request(app)
      .post(`/api/v1/alerts/${alert.id}/block`)
      .set(authHeader(token));
    expect(block.status).toBe(200);
    expect(block.body.data.userAction).toBe('BLOCK');
  });

  it('mobile sync: batch ingest then list events by app package', async () => {
    const deviceId = '00000000-0000-4000-8000-000000000099';
    const batch = await request(app)
      .post('/api/v1/events/batch')
      .set(authHeader(token))
      .send({
        deviceId,
        networkEvents: [
          {
            clientEventId: 'sync-test-1',
            appPackageName: 'com.guardian.sync.test',
            domain: 'sync-test.example.com',
            bytesSent: 2048,
            bytesReceived: 1024,
            isNewDomain: true,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    expect(batch.status).toBe(200);
    expect(batch.body.data.accepted).toBe(1);

    const events = await request(app)
      .get('/api/v1/events?appId=pkg-com.guardian.sync.test&limit=5')
      .set(authHeader(token));
    expect(events.status).toBe(200);
    expect(events.body.data).toHaveLength(1);
  });
});
