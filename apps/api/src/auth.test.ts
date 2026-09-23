import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { authHeader, loginAsAdmin, loginAsCustomer } from './test/test-auth.js';

describe('Auth and tenant scoping', () => {
  const app = createApp();

  it('admin sees all virtual devices, customer sees subset', async () => {
    const adminToken = await loginAsAdmin(app);
    const customerToken = await loginAsCustomer(app);

    const adminDevices = await request(app).get('/api/v1/devices').set(authHeader(adminToken));
    const customerDevices = await request(app)
      .get('/api/v1/devices')
      .set(authHeader(customerToken));

    expect(adminDevices.body.data.length).toBeGreaterThanOrEqual(3);
    expect(customerDevices.body.data.length).toBe(2);
    expect(
      customerDevices.body.data.every(
        (d: { id: string }) => d.id !== '00000000-0000-4000-8000-000000000003',
      ),
    ).toBe(true);
  });

  it('customer cannot access admin-only device summary', async () => {
    const customerToken = await loginAsCustomer(app);
    const res = await request(app)
      .get('/api/v1/devices/00000000-0000-4000-8000-000000000003/summary')
      .set(authHeader(customerToken));
    expect(res.status).toBe(404);
  });

  it('admin can create customer users', async () => {
    const adminToken = await loginAsAdmin(app);
    const email = `user-${Date.now()}@example.com`;
    const res = await request(app).post('/api/v1/auth/users').set(authHeader(adminToken)).send({
      email,
      password: 'password123',
      name: 'New Customer',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('CUSTOMER');
  });

  it('customer cannot list users', async () => {
    const customerToken = await loginAsCustomer(app);
    const res = await request(app).get('/api/v1/auth/users').set(authHeader(customerToken));
    expect(res.status).toBe(403);
  });
});
