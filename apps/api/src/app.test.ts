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
    expect(res.body.data).toHaveLength(5);
  });

  it('GET /api/v1/dashboard/summary returns counts', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toBeDefined();
    expect(res.body.data.totalApps).toBe(5);
  });

  it('GET /api/v1/openapi returns stub', async () => {
    const res = await request(app).get('/api/v1/openapi');
    expect(res.status).toBe(200);
    expect(res.body.data.openapi).toBe('3.0.3');
  });

  it('GET /api/v1/apps/:id returns app details', async () => {
    const res = await request(app).get('/api/v1/apps/app-photo-editor');
    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe('Photo Editor');
    expect(res.body.data.assessment.level).toBe('SUSPICIOUS');
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
