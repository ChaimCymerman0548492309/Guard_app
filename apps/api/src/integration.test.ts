import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

/**
 * Integration test for the critical Guardian API flow:
 * list apps → inspect high-risk app → review events → handle alert.
 */
describe('Critical flow integration', () => {
  const app = createApp();

  it('end-to-end: dashboard → app risk → events → alert action', async () => {
    const summary = await request(app).get('/api/v1/dashboard/summary');
    expect(summary.status).toBe(200);
    expect(summary.body.data.counts.suspicious).toBeGreaterThanOrEqual(1);

    const apps = await request(app).get('/api/v1/apps');
    expect(apps.status).toBe(200);
    const highRisk = apps.body.data.find(
      (a: { riskLevel: string }) => a.riskLevel === 'SUSPICIOUS',
    );
    expect(highRisk).toBeDefined();

    const risk = await request(app).get(`/api/v1/apps/${highRisk.id}/risk`);
    expect(risk.status).toBe(200);
    expect(risk.body.data.triggeredRules.length).toBeGreaterThan(0);

    const events = await request(app).get(`/api/v1/apps/${highRisk.id}/events`);
    expect(events.status).toBe(200);
    expect(events.body.data.some((e: { isNewDomain: boolean }) => e.isNewDomain)).toBe(true);

    const alerts = await request(app).get('/api/v1/alerts?acknowledged=false');
    expect(alerts.status).toBe(200);
    const alert = alerts.body.data.find((a: { appId: string }) => a.appId === highRisk.id);
    expect(alert).toBeDefined();

    const block = await request(app).post(`/api/v1/alerts/${alert.id}/block`);
    expect(block.status).toBe(200);
    expect(block.body.data.userAction).toBe('BLOCK');
  });

  it('mobile sync: batch ingest then list events by app package', async () => {
    const batch = await request(app)
      .post('/api/v1/events/batch')
      .send({
        deviceId: '00000000-0000-4000-8000-000000000099',
        networkEvents: [
          {
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

    const events = await request(app).get(
      '/api/v1/events?appId=pkg-com.guardian.sync.test&limit=5',
    );
    expect(events.status).toBe(200);
    expect(events.body.data).toHaveLength(1);
    expect(events.body.data[0].domain).toBe('sync-test.example.com');
  });
});
