import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { deviceRateLimiter } from './device-rate-limit.js';
describe('deviceRateLimiter', () => {
  it('allows device requests', async () => {
    const app = express();
    app.post('/b', deviceRateLimiter, (_q, r) => r.json({ ok: 1 }));
    expect(
      (
        await request(app)
          .post('/b')
          .set('X-Device-Id', '00000000-0000-4000-8000-000000000001')
          .send({})
      ).status,
    ).toBe(200);
  });
});
