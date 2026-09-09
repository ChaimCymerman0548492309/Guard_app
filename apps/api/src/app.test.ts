import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('API', () => {
  const app = createApp();

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/v1/apps returns seed apps', async () => {
    const res = await request(app).get('/api/v1/apps');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
  });

  it('GET /api/v1/dashboard/summary returns counts', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toBeDefined();
    expect(res.body.data.totalApps).toBeGreaterThanOrEqual(5);
  });

  it('GET /api/v1/openapi returns full spec', async () => {
    const res = await request(app).get('/api/v1/openapi');
    expect(res.status).toBe(200);
    expect(res.body.data.openapi).toBe('3.0.3');
    expect(res.body.data.paths['/api/v1/alerts']).toBeDefined();
    expect(res.body.data.paths['/api/v1/events']).toBeDefined();
  });

  it('GET /api/v1/apps/:id returns app details', async () => {
    const res = await request(app).get('/api/v1/apps/app-photo-editor');
    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe('Photo Editor');
    expect(res.body.data.assessment.level).toBe('SUSPICIOUS');
  });

  it('GET /api/v1/apps/:id/risk returns assessment', async () => {
    const res = await request(app).get('/api/v1/apps/app-photo-editor/risk');
    expect(res.status).toBe(200);
    expect(res.body.data.level).toBe('SUSPICIOUS');
    expect(res.body.data.score).toBeGreaterThan(0);
  });

  it('GET /api/v1/apps/:id/events returns network events', async () => {
    const res = await request(app).get('/api/v1/apps/app-photo-editor/events');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].domain).toBeDefined();
  });

  it('GET /api/v1/events returns network events', async () => {
    const res = await request(app).get('/api/v1/events');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/alerts returns non-safe alerts', async () => {
    const res = await request(app).get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].level).not.toBe('SAFE');
  });

  it('POST /api/v1/alerts/:id/block updates alert', async () => {
    const alerts = await request(app).get('/api/v1/alerts');
    const suspicious = alerts.body.data.find((a: { level: string }) => a.level === 'SUSPICIOUS');
    expect(suspicious).toBeDefined();
    const res = await request(app).post(`/api/v1/alerts/${suspicious.id}/block`);
    expect(res.status).toBe(200);
    expect(res.body.data.userAction).toBe('BLOCK');
    expect(res.body.data.acknowledged).toBe(true);
  });

  it('POST /api/v1/alerts/:id/allow updates alert', async () => {
    const alerts = await request(app).get('/api/v1/alerts');
    const unusual = alerts.body.data.find((a: { level: string }) => a.level === 'UNUSUAL');
    expect(unusual).toBeDefined();
    const res = await request(app).post(`/api/v1/alerts/${unusual.id}/allow`);
    expect(res.status).toBe(200);
    expect(res.body.data.userAction).toBe('ALLOW');
  });

  it('POST /api/v1/events/batch accepts valid payload', async () => {
    const res = await request(app)
      .post('/api/v1/events/batch')
      .send({
        deviceId: '00000000-0000-4000-8000-000000000001',
        networkEvents: [
          {
            appPackageName: 'com.example.app',
            domain: 'example.com',
            bytesSent: 1024,
            bytesReceived: 512,
            isNewDomain: true,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accepted).toBe(1);
  });

  it('POST /api/v1/events/batch rejects invalid payload', async () => {
    const res = await request(app).post('/api/v1/events/batch').send({ deviceId: 'not-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
