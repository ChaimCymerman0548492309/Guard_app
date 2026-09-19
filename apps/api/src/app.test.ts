import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { authHeader, loginAsAdmin } from './test/test-auth.js';

describe('API', () => {
  const app = createApp();
  let adminToken = '';

  beforeAll(async () => {
    adminToken = await loginAsAdmin(app);
  });

  it('GET /health returns ok without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['ok', 'degraded']).toContain(res.body.data.status);
  });

  it('GET /api/v1/apps requires auth', async () => {
    const res = await request(app).get('/api/v1/apps');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/apps returns seed apps for admin', async () => {
    const res = await request(app).get('/api/v1/apps').set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(37);
  });

  it('GET /api/v1/dashboard/summary returns counts', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.totalApps).toBe(37);
    expect(res.body.data.totalDevices).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/v1/devices returns virtual lab devices for admin', async () => {
    const res = await request(app).get('/api/v1/devices').set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/v1/devices/:id/apps returns apps for device', async () => {
    const res = await request(app)
      .get('/api/v1/devices/00000000-0000-4000-8000-000000000001/apps')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(37);
  });

  it('POST /api/v1/devices/:id/demo runs demo scenario', async () => {
    const res = await request(app)
      .post('/api/v1/devices/00000000-0000-4000-8000-000000000001/demo')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });

  it('GET /api/v1/openapi returns full spec without auth', async () => {
    const res = await request(app).get('/api/v1/openapi');
    expect(res.status).toBe(200);
    expect(res.body.data.paths['/api/v1/auth/login']).toBeDefined();
  });

  it('GET /api/v1/apps/:id returns app details', async () => {
    const res = await request(app)
      .get('/api/v1/apps/app-photo-editor')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe('Photo Editor');
  });

  it('POST /api/v1/events/batch accepts valid payload with auth', async () => {
    const res = await request(app)
      .post('/api/v1/events/batch')
      .set(authHeader(adminToken))
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
    expect(res.body.data.accepted).toBe(1);
  });
});
