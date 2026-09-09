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
});
